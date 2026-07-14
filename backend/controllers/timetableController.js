const timetableService = require('../services/timetableService');

/**
 * @desc    Create a new timetable
 * @route   POST /api/admin/timetable
 * @access  Private/Admin
 */
exports.createTimetable = async (req, res, next) => {
  try {
    const timetable = await timetableService.createTimetable(req.body);
    res.status(201).json({
      success: true,
      data: timetable,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing timetable
 * @route   PUT /api/admin/timetable/:id
 * @access  Private/Admin
 */
exports.updateTimetable = async (req, res, next) => {
  try {
    const timetable = await timetableService.updateTimetable(req.params.id, req.body);
    res.status(200).json({
      success: true,
      data: timetable,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get timetable by class ID
 * @route   GET /api/timetable/class/:classId
 * @access  Private
 */
exports.getTimetableByClass = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { _id: userId, role } = req.user;

    // Check if Teacher has access to this class
    if (role === 'teacher') {
      const isAssigned = await timetableService.isTeacherAssignedToClass(userId, classId);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not assigned to this class.',
        });
      }
    }

    const timetable = await timetableService.getTimetableByClass(classId);
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found for this class',
      });
    }

    // Role-based filtering: teachers only see their own slots and Breaks
    let responseData = timetable;
    if (role === 'teacher') {
      const Teacher = require('../models/Teacher');
      const teacher = await Teacher.findOne({ user: userId });
      if (teacher) {
        const timetableObj = timetable.toObject();
        timetableObj.weeklySchedule = timetableObj.weeklySchedule.map(dayData => {
          dayData.slots = dayData.slots.filter(slot => {
            if (slot.type === 'Break') return true;
            return slot.teacher && slot.teacher._id.toString() === teacher._id.toString();
          });
          return dayData;
        });
        responseData = timetableObj;
      }
    }

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download timetable as PDF
 * @route   GET /api/timetable/download/:classId
 * @access  Private
 */
exports.downloadTimetable = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { _id: userId, role } = req.user;

    // Authorization check
    if (role === 'teacher') {
      const isAssigned = await timetableService.isTeacherAssignedToClass(userId, classId);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not assigned to this class.',
        });
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=timetable_${classId}.pdf`);

    await timetableService.generateTimetablePDF(classId, res, role === 'teacher' ? userId : null);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all classes assigned to the logged-in teacher
 * @route   GET /api/timetable/teacher/assigned-classes
 * @access  Private/Teacher
 */
exports.getTeacherAssignedClasses = async (req, res, next) => {
  try {
    const classes = await timetableService.getTeacherAssignedClasses(req.user._id);
    res.status(200).json({
      success: true,
      data: classes,
    });
  } catch (error) {
    next(error);
  }
};

exports.previewCopyTimetable = async (req, res, next) => {
  try {
    const { timetableId, sourceDay, destinationDays } = req.body;
    const preview = await timetableService.previewCopyTimetable(timetableId, sourceDay, destinationDays);
    res.status(200).json({ success: true, data: preview });
  } catch (error) {
    next(error);
  }
};

exports.copyTimetable = async (req, res, next) => {
  try {
    const { timetableId, sourceDay, destinationDays, overwriteMode } = req.body;
    const result = await timetableService.copyTimetable(
      timetableId, 
      sourceDay, 
      destinationDays, 
      overwriteMode || 'merge', 
      req.user._id
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.undoCopy = async (req, res, next) => {
  try {
    const { auditLogId } = req.params;
    const timetable = await timetableService.undoCopy(auditLogId, req.user._id);
    res.status(200).json({ success: true, data: timetable });
  } catch (error) {
    next(error);
  }
};


