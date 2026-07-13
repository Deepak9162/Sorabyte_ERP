const Student = require('../models/Student');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const AdmissionRequest = require('../models/AdmissionRequest');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Helper to generate next unique admission number
const getNextAdmissionNumber = async () => {
  const lastStudent = await Student.findOne().sort({ createdAt: -1 });
  let nextAdmissionNumber = "1001";
  
  if (lastStudent && lastStudent.admissionNumber) {
    const lastAdmissionNumber = lastStudent.admissionNumber;
    const numMatch = lastAdmissionNumber.match(/\d+$/);
    if (numMatch) {
      const numPart = numMatch[0];
      const nextNum = parseInt(numPart, 10) + 1;
      const nextNumStr = nextNum.toString().padStart(numPart.length, '0');
      nextAdmissionNumber = lastAdmissionNumber.replace(new RegExp(numPart + '$'), nextNumStr);
    } else {
      nextAdmissionNumber = lastAdmissionNumber + "-1";
    }
  }
  return nextAdmissionNumber;
};

// Helper to generate next sequential roll number within class/section
const getNextRollNumber = async (classId, section) => {
  const studentsInClass = await Student.find({ class: classId, section: section });
  let maxRoll = 0;
  studentsInClass.forEach(s => {
    const roll = parseInt(s.rollNumber, 10);
    if (!isNaN(roll) && roll > maxRoll) {
      maxRoll = roll;
    }
  });
  return (maxRoll + 1).toString();
};

// Resolve or create class dynamically
const getOrCreateClass = async (className, section) => {
  if (!className) return null;
  const classFullName = section ? `${className}-${section}` : className;
  
  let targetClass = await Class.findOne({ name: classFullName });
  if (!targetClass) {
    targetClass = await Class.findOne({ name: className });
  }
  
  if (!targetClass) {
    let teacher = await Teacher.findOne({});
    if (!teacher) {
      teacher = await Teacher.create({
        firstName: "Primary Class",
        lastName: "Teacher",
        email: `teacher-${className.replace(/\s+/g, '-').toLowerCase()}@lfes.com`,
        phone: "9876543210",
        gender: "Other",
        qualification: "B.Ed",
        subject: "General",
        joiningDate: new Date(),
        status: "Active"
      });
    }
    
    targetClass = await Class.create({
      name: className,
      teacher: teacher._id,
      tuitionFee: 1500,
      isActive: true
    });
  }
  
  return targetClass;
};

exports.createRequest = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher && req.user.role === 'teacher') {
      return errorResponse(res, 'Teacher profile not found for this account', 404);
    }

    const requestData = {
      ...req.body,
      teacher: teacher ? teacher._id : null,
      status: req.body.status || 'Draft',
      createdBy: req.user._id,
      timeline: [{
        action: 'Created',
        performedBy: req.user._id,
        performedByName: req.user.name,
        notes: req.body.status === 'Submitted' ? 'Submitted directly' : 'Created draft'
      }],
      activityLogs: [{
        action: 'Created',
        performedBy: req.user._id,
        details: `Admission request created as ${req.body.status || 'Draft'}`
      }]
    };

    if (requestData.status === 'Submitted') {
      requestData.submittedAt = new Date();
    }

    const request = await AdmissionRequest.create(requestData);

    if (request.status === 'Submitted') {
      const admins = await User.find({ role: 'admin' });
      const Notification = require('../models/Notification');
      const promises = admins.map(admin => {
        return Notification.create({
          recipient: admin._id,
          sender: req.user._id,
          title: 'New Admission Request',
          message: `New Admission Request for ${request.studentInfo.fullName} (Class ${request.studentInfo.admissionClass}) submitted by ${req.user.name}.`,
          link: `/admissions/requests/details/${request._id}`,
          type: 'info'
        });
      });
      await Promise.all(promises);
    }

    return successResponse(res, request, 'Admission Request created successfully', 201);
  } catch (error) {
    next(error);
  }
};

exports.updateRequest = async (req, res, next) => {
  try {
    const request = await AdmissionRequest.findById(req.params.id);
    if (!request) {
      return errorResponse(res, 'Admission Request not found', 404);
    }

    if (req.user.role === 'teacher' && request.createdBy.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'You are not authorized to edit this request', 403);
    }

    if (request.status === 'Approved') {
      return errorResponse(res, 'Approved requests cannot be modified', 400);
    }

    const prevStatus = request.status;
    const newStatus = req.body.status || request.status;

    Object.keys(req.body).forEach(key => {
      if (key === 'studentInfo' || key === 'parentInfo' || key === 'address' || key === 'emergencyContact' || key === 'medicalInfo' || key === 'transport' || key === 'hostel' || key === 'documents' || key === 'additionalNotes') {
        request[key] = { ...request[key], ...req.body[key] };
      } else if (key !== 'timeline' && key !== 'activityLogs' && key !== 'teacher' && key !== 'createdBy') {
        request[key] = req.body[key];
      }
    });

    request.updatedBy = req.user._id;

    let actionName = 'Edited';
    let actionNotes = 'Request details updated';
    if (prevStatus === 'Draft' && newStatus === 'Submitted') {
      request.status = 'Submitted';
      request.submittedAt = new Date();
      actionName = 'Submitted';
      actionNotes = 'Draft request submitted for review';
    }

    request.timeline.push({
      action: actionName,
      performedBy: req.user._id,
      performedByName: req.user.name,
      notes: actionNotes
    });

    request.activityLogs.push({
      action: actionName,
      performedBy: req.user._id,
      details: `${actionName}: ${actionNotes}`
    });

    await request.save();

    if (prevStatus === 'Draft' && newStatus === 'Submitted') {
      const admins = await User.find({ role: 'admin' });
      const Notification = require('../models/Notification');
      const promises = admins.map(admin => {
        return Notification.create({
          recipient: admin._id,
          sender: req.user._id,
          title: 'New Admission Request',
          message: `New Admission Request for ${request.studentInfo.fullName} (Class ${request.studentInfo.admissionClass}) submitted by ${req.user.name}.`,
          link: `/admissions/requests/details/${request._id}`,
          type: 'info'
        });
      });
      await Promise.all(promises);
    }

    return successResponse(res, request, 'Admission Request updated successfully');
  } catch (error) {
    next(error);
  }
};

exports.getRequests = async (req, res, next) => {
  try {
    const { status, admissionClass, search, sort, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    
    if (req.user.role === 'teacher') {
      filter.createdBy = req.user._id;
    }

    if (status) {
      filter.status = status;
    }
    if (admissionClass) {
      filter['studentInfo.admissionClass'] = admissionClass;
    }
    if (search) {
      filter.$or = [
        { 'studentInfo.fullName': { $regex: search, $options: 'i' } },
        { 'parentInfo.fatherName': { $regex: search, $options: 'i' } },
        { 'parentInfo.phone': { $regex: search, $options: 'i' } }
      ];
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'oldest') {
      sortObj = { createdAt: 1 };
    } else if (sort === 'alphabetical') {
      sortObj = { 'studentInfo.fullName': 1 };
    } else if (sort === 'status') {
      sortObj = { status: 1 };
    }

    const count = await AdmissionRequest.countDocuments(filter);
    const requests = await AdmissionRequest.find(filter)
      .populate('teacher', 'firstName lastName')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    return successResponse(res, {
      requests,
      pagination: {
        total: count,
        page: pageNum,
        pages: Math.ceil(count / limitNum),
        limit: limitNum
      }
    }, 'Admission requests fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.getRequestDetails = async (req, res, next) => {
  try {
    const request = await AdmissionRequest.findById(req.params.id)
      .populate('teacher', 'firstName lastName phone email subject')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name')
      .populate('rejectedBy', 'name')
      .populate('timeline.performedBy', 'name role')
      .populate('activityLogs.performedBy', 'name role');

    if (!request) {
      return errorResponse(res, 'Admission Request not found', 404);
    }

    if (req.user.role === 'teacher' && request.createdBy._id.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'You are not authorized to view this request', 403);
    }

    request.activityLogs.push({
      action: 'Viewed',
      performedBy: req.user._id,
      details: `Viewed details of request ${request._id}`
    });
    await request.save();

    return successResponse(res, request, 'Admission Request details fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.deleteRequest = async (req, res, next) => {
  try {
    const request = await AdmissionRequest.findById(req.params.id);
    if (!request) {
      return errorResponse(res, 'Admission Request not found', 404);
    }

    if (request.createdBy.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'You are not authorized to delete this request', 403);
    }

    if (request.status !== 'Draft' && request.status !== 'Cancelled') {
      return errorResponse(res, `Cannot delete a request that is currently in status: ${request.status}`, 400);
    }

    await request.deleteOne();
    return successResponse(res, null, 'Admission Request deleted successfully');
  } catch (error) {
    next(error);
  }
};

exports.submitDraft = async (req, res, next) => {
  try {
    const request = await AdmissionRequest.findById(req.params.id);
    if (!request) {
      return errorResponse(res, 'Admission Request not found', 404);
    }

    if (request.createdBy.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'You are not authorized to submit this request', 403);
    }

    if (request.status !== 'Draft') {
      return errorResponse(res, 'Only Draft requests can be submitted', 400);
    }

    request.status = 'Submitted';
    request.submittedAt = new Date();
    request.timeline.push({
      action: 'Submitted',
      performedBy: req.user._id,
      performedByName: req.user.name,
      notes: 'Submitted for Admin review'
    });
    request.activityLogs.push({
      action: 'Submitted',
      performedBy: req.user._id,
      details: 'Draft request submitted for review'
    });

    await request.save();

    const admins = await User.find({ role: 'admin' });
    const Notification = require('../models/Notification');
    const promises = admins.map(admin => {
      return Notification.create({
        recipient: admin._id,
        sender: req.user._id,
        title: 'New Admission Request',
        message: `New Admission Request for ${request.studentInfo.fullName} (Class ${request.studentInfo.admissionClass}) submitted by ${req.user.name}.`,
        link: `/admissions/requests/details/${request._id}`,
        type: 'info'
      });
    });
    await Promise.all(promises);

    return successResponse(res, request, 'Admission Request submitted successfully');
  } catch (error) {
    next(error);
  }
};

exports.reviewRequest = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return errorResponse(res, 'Only Administrators can review admission requests', 403);
    }

    const { status, reviewNotes } = req.body;
    if (!status || !['Approved', 'Rejected', 'Under Review'].includes(status)) {
      return errorResponse(res, 'Invalid status review action', 400);
    }

    const request = await AdmissionRequest.findById(req.params.id);
    if (!request) {
      return errorResponse(res, 'Admission Request not found', 404);
    }

    if (request.status === 'Approved') {
      return errorResponse(res, 'This request has already been approved', 400);
    }

    request.status = status;
    request.reviewedAt = new Date();
    request.reviewNotes = reviewNotes || '';

    if (status === 'Approved') {
      request.approvedBy = req.user._id;
    } else if (status === 'Rejected') {
      request.rejectedBy = req.user._id;
    }

    request.timeline.push({
      action: status,
      performedBy: req.user._id,
      performedByName: req.user.name,
      notes: reviewNotes || `Request status set to ${status}`
    });

    request.activityLogs.push({
      action: status,
      performedBy: req.user._id,
      details: `Request reviewed and marked as ${status}. Review notes: ${reviewNotes || 'None'}`
    });

    if (status === 'Approved') {
      const targetClass = await getOrCreateClass(
        request.studentInfo.admissionClass, 
        request.studentInfo.section
      );

      if (!targetClass) {
        throw new Error('Failed to resolve or create class group for student enrolment');
      }

      const rollNumber = await getNextRollNumber(targetClass._id, request.studentInfo.section || 'A');
      const admissionNumber = await getNextAdmissionNumber();
      const session = "2026-2027";

      const studentData = {
        fullName: request.studentInfo.fullName,
        gender: request.studentInfo.gender,
        dob: request.studentInfo.dob,
        bloodGroup: request.studentInfo.bloodGroup || 'Unknown',
        cast: request.studentInfo.category || '',
        aadhar: request.studentInfo.aadhar || '',
        previousSchool: request.studentInfo.previousSchool || '',
        className: request.studentInfo.admissionClass,
        section: request.studentInfo.section || 'A',
        class: targetClass._id,
        rollNumber,
        admissionNumber,
        session,
        fatherName: request.parentInfo.fatherName,
        motherName: request.parentInfo.motherName,
        emergencyContact: request.emergencyContact.phone,
        transportMode: request.transport.busRequired ? 'School Bus' : 'Private',
        hostelRequired: request.hostel.hostelRequired,
        studentPhoto: request.studentInfo.studentPhoto || '',
        phone: request.parentInfo.phone || '',
        email: request.parentInfo.email || '',
        status: 'Active',
        customFields: {
          admissionRequestId: request._id.toString()
        }
      };

      const Student = require('../models/Student');
      const createdStudent = await Student.create(studentData);

      await Class.findByIdAndUpdate(targetClass._id, {
        $push: { students: createdStudent._id }
      });
      
      request.activityLogs.push({
        action: 'StudentCreated',
        performedBy: req.user._id,
        details: `Student profile ${createdStudent.studentId} (${createdStudent.fullName}) created with Admission Number ${admissionNumber} and Roll Number ${rollNumber}`
      });
    }

    await request.save();

    const Notification = require('../models/Notification');
    await Notification.create({
      recipient: request.createdBy,
      sender: req.user._id,
      title: status === 'Approved' ? 'Admission Approved' : 'Admission Rejected',
      message: status === 'Approved' 
        ? `Admission request for ${request.studentInfo.fullName} was Approved! Student profile created.`
        : `Admission request for ${request.studentInfo.fullName} was Rejected. Reason: ${reviewNotes || 'N/A'}.`,
      link: `/admissions/requests/details/${request._id}`,
      type: status === 'Approved' ? 'success' : 'error'
    });

    return successResponse(res, request, `Request reviewed and marked as ${status} successfully`);
  } catch (error) {
    next(error);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return errorResponse(res, 'Comment text is required', 400);
    }

    const request = await AdmissionRequest.findById(req.params.id);
    if (!request) {
      return errorResponse(res, 'Admission Request not found', 404);
    }

    if (req.user.role === 'teacher' && request.createdBy.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'You are not authorized to comment on this request', 403);
    }

    request.timeline.push({
      action: 'CommentAdded',
      performedBy: req.user._id,
      performedByName: req.user.name,
      notes: comment
    });

    request.activityLogs.push({
      action: 'CommentAdded',
      performedBy: req.user._id,
      details: `Comment added by ${req.user.name}: "${comment}"`
    });

    await request.save();

    const Notification = require('../models/Notification');
    if (req.user.role === 'teacher') {
      const admins = await User.find({ role: 'admin' });
      const promises = admins.map(admin => {
        return Notification.create({
          recipient: admin._id,
          sender: req.user._id,
          title: 'New Comment on Request',
          message: `${req.user.name} added a comment to ${request.studentInfo.fullName}'s request.`,
          link: `/admissions/requests/details/${request._id}`,
          type: 'info'
        });
      });
      await Promise.all(promises);
    } else {
      await Notification.create({
        recipient: request.createdBy,
        sender: req.user._id,
        title: 'New Comment from Admin',
        message: `${req.user.name} (Admin) added a comment to your request for ${request.studentInfo.fullName}.`,
        link: `/admissions/requests/details/${request._id}`,
        type: 'info'
      });
    }

    return successResponse(res, request, 'Comment added successfully');
  } catch (error) {
    next(error);
  }
};
