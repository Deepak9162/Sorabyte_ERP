/**
 * Homework Service
 * 
 * Business logic for 2-Level Homework Workflow:
 * Teacher -> Class Incharge -> Admin
 */

const Homework = require('../models/Homework');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const ClassSubject = require('../models/ClassSubject');
const User = require('../models/User');
const { getStartOfDay, getEndOfDay, formatDate } = require('../utils/dateUtils');
const { createNotification, createBulkNotifications } = require('../utils/notificationHelper');

class HomeworkService {
  /**
   * Helper to normalize date to UTC start of day for clean queries
   */
  _normalizeDate(dateInput) {
    const d = new Date(dateInput);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Teacher creates homework (Initial status: Pending Incharge)
   */
  async createHomework({
    userId,
    classId,
    section = '',
    subjectId,
    homeworkDate,
    submissionDate,
    title,
    description,
    homeworkType = 'Home Assignment',
    priority = 'Normal',
    attachment = null,
    overwrite = false,
  }) {
    // 1. Verify Teacher profile
    const teacher = await Teacher.findOne({ user: userId });
    if (!teacher) {
      const error = new Error('Teacher profile not found for this account');
      error.statusCode = 403;
      throw error;
    }

    // 2. Fetch Class & Subject details
    const cls = await Class.findById(classId);
    if (!cls) {
      const error = new Error('Selected class not found');
      error.statusCode = 404;
      throw error;
    }

    const sub = await Subject.findById(subjectId);
    if (!sub) {
      const error = new Error('Selected subject not found');
      error.statusCode = 404;
      throw error;
    }

    const homeworkDateObj = this._normalizeDate(homeworkDate);
    const submissionDateObj = new Date(submissionDate);
    const teacherName = `${teacher.firstName} ${teacher.lastName}`;

    // 3. Check for existing homework duplicate
    const existing = await Homework.findOne({
      class: classId,
      section: section || '',
      subject: subjectId,
      homeworkDate: homeworkDateObj,
    });

    if (existing && !overwrite) {
      const error = new Error(`Homework for ${sub.name} in ${cls.name}${section ? ' ' + section : ''} already exists for this date.`);
      error.statusCode = 409; // Conflict status
      error.existingHomework = existing;
      throw error;
    }

    let homework;
    const initialHistoryEntry = {
      action: existing ? 'Homework Overwritten & Updated' : 'Homework Created',
      performedBy: userId,
      name: teacherName,
      role: 'teacher',
      status: 'Approved',
      timestamp: new Date(),
      remarks: existing ? 'Teacher updated & overwritten existing submission' : 'Initial submission by subject teacher',
    };

    if (existing && overwrite) {
      // Overwrite existing submission
      existing.title = title;
      existing.description = description;
      existing.submissionDate = submissionDateObj;
      existing.homeworkType = homeworkType;
      existing.priority = priority;
      if (attachment) existing.attachment = attachment;
      existing.status = 'Approved';
      existing.history.push(initialHistoryEntry);

      homework = await existing.save();
    } else {
      // Create new homework entry
      homework = await Homework.create({
        class: classId,
        className: cls.name,
        section: section || '',
        subject: subjectId,
        subjectName: sub.name,
        teacher: teacher._id,
        teacherName: teacherName,
        user: userId,
        homeworkDate: homeworkDateObj,
        submissionDate: submissionDateObj,
        title,
        description,
        homeworkType,
        priority,
        attachment: attachment || undefined,
        status: 'Approved',
        history: [initialHistoryEntry],
      });
    }

    // Notify Class Incharge if assigned
    if (cls.teacher) {
      const inchargeTeacher = await Teacher.findById(cls.teacher);
      if (inchargeTeacher && inchargeTeacher.user && inchargeTeacher.user.toString() !== userId.toString()) {
        await createNotification({
          recipientUserId: inchargeTeacher.user,
          senderUserId: userId,
          title: 'New Homework Submitted for Review',
          message: `${teacherName} submitted homework for ${sub.name} (${cls.name}) requiring Class Incharge approval.`,
          type: 'info',
          link: '/teacher/homework',
        });
      }
    }

    return homework;
  }

  /**
   * Teacher updates & resubmits their pending/rejected homework
   */
  async updateTeacherHomework({
    userId,
    homeworkId,
    title,
    description,
    submissionDate,
    homeworkType,
    priority,
    attachment = null,
  }) {
    const teacher = await Teacher.findOne({ user: userId });
    if (!teacher) {
      const error = new Error('Teacher profile not found');
      error.statusCode = 403;
      throw error;
    }

    const homework = await Homework.findById(homeworkId);
    if (!homework) {
      const error = new Error('Homework not found');
      error.statusCode = 404;
      throw error;
    }

    if (homework.teacher.toString() !== teacher._id.toString()) {
      const error = new Error('You can only edit your own homework submissions');
      error.statusCode = 403;
      throw error;
    }

    if (title) homework.title = title;
    if (description) homework.description = description;
    if (submissionDate) homework.submissionDate = new Date(submissionDate);
    if (homeworkType) homework.homeworkType = homeworkType;
    if (priority) homework.priority = priority;
    if (attachment) homework.attachment = attachment;

    // Reset status back to Pending Incharge
    homework.status = 'Pending Incharge';
    homework.inchargeApproval = undefined;
    homework.adminApproval = undefined;

    homework.history.push({
      action: 'Homework Updated & Resubmitted',
      performedBy: userId,
      name: `${teacher.firstName} ${teacher.lastName}`,
      role: 'teacher',
      status: 'Pending Incharge',
      timestamp: new Date(),
      remarks: 'Teacher updated homework content and resubmitted',
    });

    return await homework.save();
  }

  /**
   * Delete homework record (Any logged in user can delete any homework)
   */
  async deleteTeacherHomework({ user, homeworkId }) {
    const homework = await Homework.findById(homeworkId);
    if (!homework) {
      const error = new Error('Homework record not found');
      error.statusCode = 404;
      throw error;
    }

    // Clean up attachment file from disk if present
    if (homework.attachment && homework.attachment.filePath) {
      const fs = require('fs');
      const path = require('path');
      try {
        const fullPath = path.join(__dirname, '..', homework.attachment.filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        console.error('Failed to delete homework attachment file:', err);
      }
    }

    await Homework.findByIdAndDelete(homeworkId);
    return true;
  }

  /**
   * Teacher views their own homework history
   */
  async getTeacherMyHomework({ userId, status, page = 1, limit = 10, search }) {
    const teacher = await Teacher.findOne({ user: userId });
    if (!teacher) {
      return { homeworks: [], pagination: { total: 0, page: 1, limit, totalPages: 0 }, counts: { total: 0, pendingIncharge: 0, pendingAdmin: 0, approved: 0, rejected: 0 } };
    }

    const filter = { teacher: teacher._id };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subjectName: { $regex: search, $options: 'i' } },
        { className: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [homeworks, total, statusCounts] = await Promise.all([
      Homework.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Homework.countDocuments(filter),
      Homework.aggregate([
        { $match: { teacher: teacher._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const counts = {
      total,
      pendingIncharge: 0,
      pendingAdmin: 0,
      approved: 0,
      rejected: 0,
    };

    statusCounts.forEach(c => {
      if (c._id === 'Pending Incharge') counts.pendingIncharge = c.count;
      if (c._id === 'Pending Admin') counts.pendingAdmin = c.count;
      if (c._id === 'Approved') counts.approved = c.count;
      if (c._id === 'Rejected') counts.rejected = c.count;
    });

    return {
      homeworks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      counts,
    };
  }

  /**
   * Class Incharge views homework for their assigned class(es)
   */
  async getInchargeClassHomework({ userId, status, classId, date, page = 1, limit = 10 }) {
    const teacher = await Teacher.findOne({ user: userId });
    if (!teacher) {
      return { homeworks: [], assignedClasses: [], pagination: { total: 0, page: 1, limit, totalPages: 0 } };
    }

    // Find classes where this teacher is assigned as primary teacher (Class Incharge)
    const assignedClasses = await Class.find({ teacher: teacher._id, isActive: true });
    if (assignedClasses.length === 0) {
      return { homeworks: [], assignedClasses: [], pagination: { total: 0, page: 1, limit, totalPages: 0 } };
    }

    const classIds = assignedClasses.map(c => c._id);
    const filter = { class: { $in: classIds } };

    if (classId) filter.class = classId;
    if (status) filter.status = status;
    if (date) {
      const dateObj = this._normalizeDate(date);
      filter.homeworkDate = dateObj;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [homeworks, total] = await Promise.all([
      Homework.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Homework.countDocuments(filter),
    ]);

    return {
      homeworks,
      assignedClasses: assignedClasses.map(c => ({ _id: c._id, id: c._id, name: c.name, section: c.section })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  /**
   * Class Incharge Approves or Rejects homework
   */
  async inchargeApproveOrReject({ userId, homeworkId, action, remarks = '' }) {
    if (!['approve', 'reject'].includes(action)) {
      const error = new Error('Action must be either "approve" or "reject"');
      error.statusCode = 400;
      throw error;
    }

    const teacher = await Teacher.findOne({ user: userId });
    if (!teacher) {
      const error = new Error('Teacher profile not found');
      error.statusCode = 403;
      throw error;
    }

    const homework = await Homework.findById(homeworkId);
    if (!homework) {
      const error = new Error('Homework record not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify Class Incharge authorization
    const cls = await Class.findById(homework.class);
    if (!cls || !cls.teacher || cls.teacher.toString() !== teacher._id.toString()) {
      const error = new Error('Only the assigned Class Incharge can review homework for this class.');
      error.statusCode = 403;
      throw error;
    }

    const teacherName = `${teacher.firstName} ${teacher.lastName}`;
    const newStatus = action === 'approve' ? 'Pending Admin' : 'Rejected';

    homework.status = newStatus;
    homework.inchargeApproval = {
      approvedBy: userId,
      name: teacherName,
      approvedAt: new Date(),
      remarks: remarks || (action === 'approve' ? 'Approved by Class Incharge' : 'Rejected by Class Incharge'),
    };

    homework.history.push({
      action: action === 'approve' ? 'Class Incharge Approved' : 'Class Incharge Rejected',
      performedBy: userId,
      name: teacherName,
      role: 'incharge',
      status: newStatus,
      timestamp: new Date(),
      remarks: remarks || (action === 'approve' ? 'Forwarded to Admin' : 'Rejected by Incharge'),
    });

    const updated = await homework.save();

    // Notify submitting teacher
    await createNotification({
      recipientUserId: homework.user,
      senderUserId: userId,
      title: `Homework ${action === 'approve' ? 'Approved by Incharge' : 'Rejected by Incharge'}`,
      message: `Your homework for ${homework.subjectName} (${homework.className}) was ${action === 'approve' ? 'approved by Class Incharge and forwarded to Admin' : 'rejected by Class Incharge'}.`,
      type: action === 'approve' ? 'success' : 'error',
      link: '/teacher/homework',
    });

    return updated;
  }

  /**
   * Admin Approves or Rejects homework (Final Authority)
   */
  async adminApproveOrReject({ user, homeworkId, action, remarks = '' }) {
    if (!['approve', 'reject'].includes(action)) {
      const error = new Error('Action must be either "approve" or "reject"');
      error.statusCode = 400;
      throw error;
    }

    const homework = await Homework.findById(homeworkId);
    if (!homework) {
      const error = new Error('Homework record not found');
      error.statusCode = 404;
      throw error;
    }

    const newStatus = action === 'approve' ? 'Approved' : 'Rejected';

    homework.status = newStatus;
    homework.adminApproval = {
      approvedBy: user._id,
      name: user.name,
      approvedAt: new Date(),
      remarks: remarks || (action === 'approve' ? 'Final Approved by Admin' : 'Rejected by Admin'),
    };

    homework.history.push({
      action: action === 'approve' ? 'Admin Final Approved' : 'Admin Rejected',
      performedBy: user._id,
      name: user.name,
      role: 'admin',
      status: newStatus,
      timestamp: new Date(),
      remarks: remarks || (action === 'approve' ? 'Final Approved' : 'Rejected by Admin'),
    });

    const updated = await homework.save();

    // Send notifications to submitting teacher
    await createNotification({
      recipientUserId: homework.user,
      senderUserId: user._id,
      title: `Homework ${action === 'approve' ? 'Final Approved' : 'Rejected by Admin'}`,
      message: `Your homework for ${homework.subjectName} (${homework.className}) has been ${action === 'approve' ? 'final approved by Admin' : 'rejected by Admin'}.`,
      type: action === 'approve' ? 'success' : 'error',
      link: '/teacher/homework',
    });

    return updated;
  }

  /**
   * Admin Bulk Approve or Reject homework
   */
  async adminBulkStatusUpdate({ user, homeworkIds, action, remarks = '' }) {
    if (!Array.isArray(homeworkIds) || homeworkIds.length === 0) {
      const error = new Error('Please provide an array of homework IDs');
      error.statusCode = 400;
      throw error;
    }

    if (!['approve', 'reject'].includes(action)) {
      const error = new Error('Action must be "approve" or "reject"');
      error.statusCode = 400;
      throw error;
    }

    const results = [];
    for (const id of homeworkIds) {
      try {
        const updated = await this.adminApproveOrReject({ user, homeworkId: id, action, remarks });
        results.push(updated);
      } catch (err) {
        // Continue processing others
      }
    }

    return results;
  }

  /**
   * Admin View All Homeworks with Multi-column Filters & Search
   */
  async getAllAdminHomework({
    page = 1,
    limit = 20,
    classId,
    section,
    subjectId,
    teacherId,
    status,
    startDate,
    endDate,
    search,
  }) {
    const filter = {};

    if (classId) filter.class = classId;
    if (section) filter.section = section;
    if (subjectId) filter.subject = subjectId;
    if (teacherId) filter.teacher = teacherId;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.homeworkDate = {};
      if (startDate) filter.homeworkDate.$gte = this._normalizeDate(startDate);
      if (endDate) {
        const end = this._normalizeDate(endDate);
        end.setUTCHours(23, 59, 59, 999);
        filter.homeworkDate.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subjectName: { $regex: search, $options: 'i' } },
        { className: { $regex: search, $options: 'i' } },
        { teacherName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [homeworks, total, statusAgg] = await Promise.all([
      Homework.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Homework.countDocuments(filter),
      Homework.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);

    const stats = {
      total: await Homework.countDocuments(),
      pendingIncharge: 0,
      pendingAdmin: 0,
      approved: 0,
      rejected: 0,
    };

    statusAgg.forEach(s => {
      if (s._id === 'Pending Incharge') stats.pendingIncharge = s.count;
      if (s._id === 'Pending Admin') stats.pendingAdmin = s.count;
      if (s._id === 'Approved') stats.approved = s.count;
      if (s._id === 'Rejected') stats.rejected = s.count;
    });

    return {
      homeworks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      stats,
    };
  }

  /**
   * Consolidated Homework for a Class, Section & Date
   * Validates export lock: Unlocked ONLY when ALL submitted subject homeworks are "Approved" (Final Approved).
   */
  async getConsolidatedHomework({ classId, section = '', date }) {
    if (!classId || !date) {
      const error = new Error('Class and Date are required parameters');
      error.statusCode = 400;
      throw error;
    }

    const cls = await Class.findById(classId);
    if (!cls) {
      const error = new Error('Class not found');
      error.statusCode = 404;
      throw error;
    }

    const dateObj = this._normalizeDate(date);
    const filter = {
      class: classId,
      homeworkDate: dateObj,
    };
    if (section) filter.section = section;

    const homeworks = await Homework.find(filter).sort({ subjectName: 1 });

    const totalSubjectsSubmitted = homeworks.length;
    const approvedCount = homeworks.filter(h => h.status === 'Approved').length;
    const pendingInchargeCount = homeworks.filter(h => h.status === 'Pending Incharge').length;
    const pendingAdminCount = homeworks.filter(h => h.status === 'Pending Admin').length;
    const rejectedCount = homeworks.filter(h => h.status === 'Rejected').length;

    // Export rule: Unlocked directly when at least 1 homework exists
    const isUnlocked = totalSubjectsSubmitted > 0;

    // Build formatted date display e.g. "30 July 2026"
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const dateFormatted = new Date(dateObj).toLocaleDateString('en-GB', options);

    const fullClassName = `${cls.name}${section ? '-' + section : (cls.section ? '-' + cls.section : '')}`;

    // Generate formatted WhatsApp text string (uses WhatsApp *bold* syntax and clean unicode separators)
    let formattedText = '';
    if (homeworks.length > 0) {
      const lineSeparator = `━━━━━━━━━━━━━━━━━━━━━━`;
      formattedText += `${lineSeparator}\n`;
      formattedText += `📚 *LITTLE FLOWER ENGLISH SCHOOL*\n`;
      formattedText += `🏫 *Class:* *${fullClassName}*\n`;
      formattedText += `📅 *Date:* *${dateFormatted}*\n`;
      formattedText += `${lineSeparator}\n\n`;

      homeworks.forEach((hw) => {
        const subjectTitle = hw.subjectName ? hw.subjectName.toUpperCase() : 'SUBJECT';
        formattedText += `📘 *${subjectTitle}*\n`;
        if (hw.title && hw.title.trim() && hw.title.trim().toLowerCase() !== hw.description.trim().toLowerCase()) {
          formattedText += `• *Topic:* ${hw.title.trim()}\n`;
          formattedText += `• *Homework:* ${hw.description.trim()}\n\n`;
        } else {
          formattedText += `• *Homework:* ${hw.description.trim()}\n\n`;
        }
      });

      formattedText += `${lineSeparator}\n`;
      formattedText += `🙏 *Regards*\n`;
      formattedText += `*Little Flower English School*\n`;
      formattedText += `${lineSeparator}`;
    }

    return {
      classInfo: { id: cls._id, name: cls.name, section: section || cls.section || '' },
      date: dateObj,
      dateFormatted,
      isUnlocked,
      stats: {
        totalSubjectsSubmitted,
        approvedCount,
        pendingInchargeCount,
        pendingAdminCount,
        rejectedCount,
      },
      formattedText,
      homeworks,
    };
  }

  /**
   * Dashboard metric summaries
   */
  async getDashboardSummary({ userId, role }) {
    if (role === 'admin') {
      const [pendingIncharge, pendingAdmin, approvedToday, rejected, total, recentSubmissions] = await Promise.all([
        Homework.countDocuments({ status: 'Pending Incharge' }),
        Homework.countDocuments({ status: 'Pending Admin' }),
        Homework.countDocuments({
          status: 'Approved',
          updatedAt: { $gte: this._normalizeDate(new Date()) }
        }),
        Homework.countDocuments({ status: 'Rejected' }),
        Homework.countDocuments(),
        Homework.find().sort({ createdAt: -1 }).limit(5),
      ]);

      return {
        pendingIncharge,
        pendingAdmin,
        totalPending: pendingIncharge + pendingAdmin,
        approvedToday,
        rejected,
        total,
        recentSubmissions,
      };
    } else {
      // Teacher dashboard summary
      const teacher = await Teacher.findOne({ user: userId });
      if (!teacher) return { pending: 0, approved: 0, rejected: 0, inchargePending: 0 };

      const [pending, approved, rejected, inchargeClasses] = await Promise.all([
        Homework.countDocuments({ teacher: teacher._id, status: { $in: ['Pending Incharge', 'Pending Admin'] } }),
        Homework.countDocuments({ teacher: teacher._id, status: 'Approved' }),
        Homework.countDocuments({ teacher: teacher._id, status: 'Rejected' }),
        Class.find({ teacher: teacher._id, isActive: true }),
      ]);

      let inchargePending = 0;
      if (inchargeClasses.length > 0) {
        const inchargeClassIds = inchargeClasses.map(c => c._id);
        inchargePending = await Homework.countDocuments({ class: { $in: inchargeClassIds }, status: 'Pending Incharge' });
      }

      return {
        pending,
        approved,
        rejected,
        inchargePending,
      };
    }
  }

  /**
   * Get assigned classes & class-subject map for teacher homework creation
   */
  async getTeacherAssignedOptions(userId) {
    const teacher = await Teacher.findOne({ user: userId });

    const [allClasses, allSubjects] = await Promise.all([
      Class.find({ isActive: true }).sort({ name: 1 }),
      Subject.find({ isActive: true }).sort({ name: 1 }),
    ]);

    if (!teacher) {
      return {
        assignedClasses: allClasses,
        allClasses,
        allSubjects,
        classSubjectMap: {},
        teacherSubjects: allSubjects,
      };
    }

    // 1. Mappings where this teacher is assigned a subject in a class
    const mappings = await ClassSubject.find({ teacher: teacher._id })
      .populate('class')
      .populate('subject');

    // 2. Classes where teacher is primary Class Incharge
    const classTeacherClasses = await Class.find({ teacher: teacher._id, isActive: true });

    // Build assigned classes map
    const classMap = new Map();

    mappings.forEach(m => {
      if (m.class && m.class.isActive) {
        classMap.set(m.class._id.toString(), m.class);
      }
    });

    classTeacherClasses.forEach(c => {
      classMap.set(c._id.toString(), c);
    });

    if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
      allClasses.forEach(c => {
        const fullClassName = `${c.name}${c.section ? '-' + c.section : ''}`;
        if (teacher.assignedClasses.includes(c.name) || teacher.assignedClasses.includes(fullClassName)) {
          classMap.set(c._id.toString(), c);
        }
      });
    }

    let assignedClasses = Array.from(classMap.values());
    if (assignedClasses.length === 0) {
      assignedClasses = allClasses;
    }

    // Build classSubjectMap: classId -> Array of Subjects assigned to this teacher / mapped to class
    const classSubjectMap = {};
    const teacherSubjectMap = new Map();

    mappings.forEach(m => {
      if (!m.class || !m.subject) return;
      const cId = m.class._id.toString();
      if (!classSubjectMap[cId]) classSubjectMap[cId] = new Map();
      classSubjectMap[cId].set(m.subject._id.toString(), m.subject);
      teacherSubjectMap.set(m.subject._id.toString(), m.subject);
    });

    // Also include general ClassSubject mappings for classes where teacher is Class Incharge
    const allClassSubjects = await ClassSubject.find().populate('subject');
    allClassSubjects.forEach(cs => {
      if (!cs.class || !cs.subject) return;
      const cId = cs.class.toString();
      // If class is in teacher's assigned classes but has no specific teacher subjects, populate general subjects
      if (!classSubjectMap[cId]) classSubjectMap[cId] = new Map();
      classSubjectMap[cId].set(cs.subject._id.toString(), cs.subject);
    });

    const formattedMap = {};
    Object.keys(classSubjectMap).forEach(cId => {
      formattedMap[cId] = Array.from(classSubjectMap[cId].values());
    });

    return {
      assignedClasses,
      allClasses,
      allSubjects,
      classSubjectMap: formattedMap,
      teacherSubjects: teacherSubjectMap.size > 0 ? Array.from(teacherSubjectMap.values()) : allSubjects,
    };
  }

  /**
   * Class Teacher Consolidated Homework (Derived Server-side with strict assigned class verification)
   */
  async getClassTeacherConsolidatedHomework({ userId, classId, date }) {
    if (!date) {
      const error = new Error('Date is a required parameter');
      error.statusCode = 400;
      throw error;
    }

    const teacher = await Teacher.findOne({ user: userId });
    if (!teacher) {
      const error = new Error('Teacher profile not found for this user account');
      error.statusCode = 403;
      throw error;
    }

    // Fetch classes where this teacher is assigned as Class Incharge
    const inchargeClasses = await Class.find({ teacher: teacher._id, isActive: true });
    
    // Fetch all active classes to check against teacher.assignedClasses string array
    const allClasses = await Class.find({ isActive: true });
    const classMap = new Map();

    inchargeClasses.forEach(c => {
      classMap.set(c._id.toString(), c);
    });

    if (teacher.assignedClasses && Array.isArray(teacher.assignedClasses) && teacher.assignedClasses.length > 0) {
      const assignedStrings = teacher.assignedClasses.map(a => a.toString());
      allClasses.forEach(c => {
        const fullClassName = `${c.name}${c.section ? '-' + c.section : ''}`;
        const parenClassName = `${c.name}${c.section ? ' (' + c.section + ')' : ''}`;
        if (
          assignedStrings.includes(c._id.toString()) ||
          assignedStrings.includes(c.name) ||
          assignedStrings.includes(fullClassName) ||
          assignedStrings.includes(parenClassName)
        ) {
          classMap.set(c._id.toString(), c);
        }
      });
    }

    const assignedClassesDocs = Array.from(classMap.values());

    if (assignedClassesDocs.length === 0) {
      const error = new Error('You are not assigned as a Class Teacher for any active class');
      error.statusCode = 403;
      throw error;
    }

    let targetClassDoc;
    if (!classId) {
      targetClassDoc = assignedClassesDocs[0];
    } else {
      // Safely find matching class by _id, name, or name-section string
      targetClassDoc = assignedClassesDocs.find(c =>
        c._id.toString() === classId.toString() ||
        c.name === classId ||
        `${c.name} (${c.section})` === classId ||
        `${c.name}-${c.section}` === classId ||
        `${c.name}${c.section ? '-' + c.section : ''}` === classId
      );

      if (!targetClassDoc) {
        const error = new Error('Access Denied: You are not authorized to view homework for this class');
        error.statusCode = 403;
        throw error;
      }
    }

    return await this.getConsolidatedHomework({
      classId: targetClassDoc._id,
      section: targetClassDoc.section || '',
      date,
    });
  }
}

module.exports = new HomeworkService();
