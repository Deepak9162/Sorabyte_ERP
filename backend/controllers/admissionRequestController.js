const Student = require('../models/Student');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const AdmissionRequest = require('../models/AdmissionRequest');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Helper to generate next unique admission number
const getNextAdmissionNumber = async () => {
  let nextAdmissionNumber = "1001";
  const lastStudent = await Student.findOne().sort({ createdAt: -1 });
  
  if (lastStudent && lastStudent.admissionNumber) {
    let currentNumber = lastStudent.admissionNumber;
    let isUnique = false;
    
    while (!isUnique) {
      const numMatch = currentNumber.match(/\d+$/);
      if (numMatch) {
        const numPart = numMatch[0];
        const nextNum = parseInt(numPart, 10) + 1;
        const nextNumStr = nextNum.toString().padStart(numPart.length, '0');
        nextAdmissionNumber = currentNumber.replace(new RegExp(numPart + '$'), nextNumStr);
      } else {
        nextAdmissionNumber = currentNumber + "-1";
      }
      
      const existing = await Student.findOne({ admissionNumber: nextAdmissionNumber });
      if (!existing) {
        isUnique = true;
      } else {
        currentNumber = nextAdmissionNumber;
      }
    }
  } else {
    // If no last student, just ensure 1001 is unique
    while (await Student.findOne({ admissionNumber: nextAdmissionNumber })) {
      nextAdmissionNumber = (parseInt(nextAdmissionNumber, 10) + 1).toString();
    }
  }
  
  return nextAdmissionNumber;
};

// Helper to generate next sequential roll number within class/section
const getNextRollNumber = async (classId, section, className, session) => {
  const studentsInClass = await Student.find({ class: classId, section: section });
  let maxRoll = 0;
  studentsInClass.forEach(s => {
    const roll = parseInt(s.rollNumber, 10);
    if (!isNaN(roll) && roll > maxRoll) {
      maxRoll = roll;
    }
  });
  
  let nextRoll = maxRoll + 1;
  // Ensure we do not hit a unique constraint collision on { className, session, rollNumber }
  while (await Student.findOne({ className, session, rollNumber: nextRoll.toString() })) {
    nextRoll++;
  }
  
  return nextRoll.toString();
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

/**
 * Core helper to enroll a student from an admission request.
 * 
 * This is the SINGLE SOURCE OF TRUTH for student creation — used by both:
 *   1. reviewRequest (Admin approves a teacher-submitted request)
 *   2. directAdmission (Admin directly admits without teacher workflow)
 * 
 * Data flow: AdmissionRequest document → Student document → Class mapping → Fee ledger
 */
const enrollStudent = async (request, reviewerId) => {
  const targetClass = await getOrCreateClass(
    request.studentInfo.admissionClass, 
    request.studentInfo.section
  );

  if (!targetClass) {
    throw new Error('Failed to resolve or create class group for student enrolment');
  }

  // Use academicSession from the request document if set, otherwise fall back to
  // a value parsed from additionalNotes.remarks, then default to current academic year.
  let session = request.academicSession || '';
  if (!session && request.additionalNotes && request.additionalNotes.remarks) {
    const sessionMatch = request.additionalNotes.remarks.match(/Academic Session:\s*([^\s|]+)/);
    if (sessionMatch) session = sessionMatch[1].trim();
  }
  if (!session) session = '2026-2027';

  const rollNumber = await getNextRollNumber(
    targetClass._id, 
    request.studentInfo.section || 'A',
    request.studentInfo.admissionClass,
    session
  );
  const admissionNumber = await getNextAdmissionNumber();

  // Address concatenation
  const addressStr = request.address.currentAddress || request.address.permanentAddress || '';

  // Resolve discount percentage: top-level field → additionalNotes.remarks fallback → 0
  let discountPercentage = 0;
  if (typeof request.discountPercentage === 'number') {
    discountPercentage = request.discountPercentage;
  } else if (request.additionalNotes && request.additionalNotes.remarks) {
    const discountMatch = request.additionalNotes.remarks.match(/Discount:\s*(\d+(?:\.\d+)?)%/);
    if (discountMatch) discountPercentage = parseFloat(discountMatch[1]);
  }

  // Resolve admission date: top-level field → additionalNotes.remarks fallback → now
  let admissionDate = request.admissionDate || null;
  if (!admissionDate && request.additionalNotes && request.additionalNotes.remarks) {
    const dateMatch = request.additionalNotes.remarks.match(/Admission Date:\s*(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) admissionDate = new Date(dateMatch[1]);
  }
  if (!admissionDate) admissionDate = new Date();

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
    admissionDate,
    discountPercentage,
    fatherName: request.parentInfo.fatherName,
    motherName: request.parentInfo.motherName,
    emergencyContact: request.emergencyContact.phone,
    transportMode: request.transport.busRequired ? 'School Bus' : 'Private',
    transportFee: request.transport.transportFee || 0,
    hostelRequired: request.hostel ? request.hostel.hostelRequired : false,
    studentPhoto: request.studentInfo.studentPhoto || '',
    phone: request.parentInfo.phone || '',
    email: request.parentInfo.email || '',
    address: addressStr,
    status: 'Active',
    customFields: {
      admissionRequestId: request._id.toString(),
      // Student extended fields
      religion: request.studentInfo.religion || '',
      nationality: request.studentInfo.nationality || '',
      penNumber: request.studentInfo.penNumber || '',
      house: request.studentInfo.house || '',
      birthCertificateNumber: request.studentInfo.birthCertificateNumber || '',
      transferCertificateNumber: request.studentInfo.transferCertificateNumber || '',
      previousLastClass: request.studentInfo.previousLastClass || '',
      previousSchoolAddress: request.studentInfo.previousSchoolAddress || '',
      // Parent extended fields
      fatherMobile: request.parentInfo.fatherMobile || '',
      fatherOccupation: request.parentInfo.fatherOccupation || '',
      fatherAadhar: request.parentInfo.fatherAadhar || '',
      motherMobile: request.parentInfo.motherMobile || '',
      motherOccupation: request.parentInfo.motherOccupation || '',
      motherAadhar: request.parentInfo.motherAadhar || '',
      guardianName: request.parentInfo.guardianName || '',
      guardianRelation: request.parentInfo.guardianRelation || '',
      guardianMobile: request.parentInfo.guardianMobile || '',
      guardianAddress: request.parentInfo.guardianAddress || '',
      // Address extended fields
      currentAddress: request.address.currentAddress || '',
      permanentAddress: request.address.permanentAddress || '',
      city: request.address.city || '',
      district: request.address.district || '',
      state: request.address.state || '',
      pinCode: request.address.pinCode || '',
      // Transport details
      transportRoute: request.transport.route || '',
      pickupPoint: request.transport.pickupPoint || '',
      dropPoint: request.transport.dropPoint || '',
      // Medical details
      medicalConditions: request.medicalInfo ? request.medicalInfo.medicalConditions : '',
      allergies: request.medicalInfo ? request.medicalInfo.allergies : '',
      doctorName: request.medicalInfo ? request.medicalInfo.doctorName : '',
    }
  };

  const Student = require('../models/Student');
  const createdStudent = await Student.create(studentData);

  await Class.findByIdAndUpdate(targetClass._id, {
    $push: { students: createdStudent._id }
  });

  // Trigger fee ledger initialization if feeService is available
  try {
    const feeService = require('../services/feeService');
    if (feeService && typeof feeService.ensureFeeLedger === 'function') {
      await feeService.ensureFeeLedger(
        createdStudent._id,
        session,
        targetClass.tuitionFee || 0
      );
    }
  } catch (feeError) {
    console.error("Warning: Failed to auto-initialize fee ledger for student:", feeError.message);
  }

  return { createdStudent, rollNumber, admissionNumber };
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
      const { createdStudent, rollNumber, admissionNumber } = await enrollStudent(request, req.user._id);
      
      request.activityLogs.push({
        action: 'StudentCreated',
        performedBy: req.user._id,
        details: `Student profile ${createdStudent.studentId} (${createdStudent.fullName}) created with Admission Number ${admissionNumber} and Roll Number ${rollNumber}`
      });
    }

    await request.save();

    const Notification = require('../models/Notification');
    // Only notify creator if they are an admin
    const creatorUser = await User.findById(request.createdBy);
    if (creatorUser && creatorUser.role === 'admin') {
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
    }

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
      // Only notify creator if they are an admin
      const creatorUser = await User.findById(request.createdBy);
      if (creatorUser && creatorUser.role === 'admin') {
        await Notification.create({
          recipient: request.createdBy,
          sender: req.user._id,
          title: 'New Comment from Admin',
          message: `${req.user.name} (Admin) added a comment to your request for ${request.studentInfo.fullName}.`,
          link: `/admissions/requests/details/${request._id}`,
          type: 'info'
        });
      }
    }

    return successResponse(res, request, 'Comment added successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Direct Admission — Admin bypasses teacher workflow.
 *
 * Creates an AdmissionRequest with status 'Approved' and immediately calls
 * enrollStudent() — the same function used when a teacher-submitted request
 * is approved. No duplicate student-creation logic exists anywhere.
 *
 * Security: isAdmin middleware on the route ensures only admin roles reach here.
 * Logging: admission event is logged with admin identity, student ID, class, session.
 */
exports.directAdmission = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return errorResponse(res, 'Only Administrators can perform direct admissions', 403);
    }

    // Find first teacher to satisfy schema required: true for teacher
    const defaultTeacher = await Teacher.findOne({});
    if (!defaultTeacher) {
      return errorResponse(res, 'At least one teacher profile must exist in the system to create an admission request', 400);
    }

    // Resolve top-level fields sent by the direct admission form
    const academicSession = req.body.academicSession || (req.body.studentInfo && req.body.studentInfo.session) || '2026-2027';
    const discountPercentage = parseFloat(req.body.discountPercentage) || 0;
    const admissionDate = req.body.admissionDate ? new Date(req.body.admissionDate) : new Date();

    const requestData = {
      ...req.body,
      teacher: defaultTeacher._id,
      status: 'Approved',
      createdBy: req.user._id,
      approvedBy: req.user._id,
      reviewedAt: new Date(),
      academicSession,
      discountPercentage,
      admissionDate,
      timeline: [
        {
          action: 'Created',
          performedBy: req.user._id,
          performedByName: req.user.name,
          notes: 'Direct admission created by Admin'
        },
        {
          action: 'Approved',
          performedBy: req.user._id,
          performedByName: req.user.name,
          notes: 'Direct admission approved automatically'
        }
      ],
      activityLogs: [
        {
          action: 'Created',
          performedBy: req.user._id,
          details: 'Direct admission request created'
        },
        {
          action: 'Approved',
          performedBy: req.user._id,
          details: 'Direct admission request approved'
        }
      ]
    };

    const request = await AdmissionRequest.create(requestData);

    // Reuse the same enrollment pipeline as teacher-approval flow
    const { createdStudent, rollNumber, admissionNumber } = await enrollStudent(request, req.user._id);

    request.activityLogs.push({
      action: 'StudentCreated',
      performedBy: req.user._id,
      details: `Student profile ${createdStudent.studentId} (${createdStudent.fullName}) created with Admission Number ${admissionNumber} and Roll Number ${rollNumber}`
    });

    await request.save();

    // Structured audit log
    console.log(JSON.stringify({
      event: 'DirectAdmissionCreated',
      createdBy: req.user.name,
      createdById: req.user._id,
      studentId: createdStudent.studentId,
      admissionNumber,
      className: createdStudent.className,
      section: createdStudent.section,
      session: createdStudent.session,
      admissionDate: createdStudent.admissionDate,
      timestamp: new Date().toISOString()
    }));

    return successResponse(res, { request, student: createdStudent }, 'Student direct admission completed successfully', 201);
  } catch (error) {
    next(error);
  }
};
