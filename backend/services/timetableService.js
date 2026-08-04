const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const ClassSubject = require('../models/ClassSubject');
const Teacher = require('../models/Teacher');
const TimetableAuditLog = require('../models/TimetableAuditLog');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');

/**
 * Checks if a teacher (User ID) is assigned to a class
 * (Either as primary teacher or subject teacher)
 */
/**
 * Checks if a teacher (User ID) is assigned to a class
 * (Either as primary teacher or subject teacher)
 */
exports.isTeacherAssignedToClass = async (userId, classId) => {
  const assigned = await this.getTeacherAssignedClasses(userId);
  return assigned.some(c => c._id.toString() === classId.toString());
};

/**
 * Gets all classes assigned to a teacher
 */

exports.getTeacherAssignedClasses = async (userId) => {
  // Find teacher first
  const teacher = await Teacher.findOne({ user: userId });
  if (!teacher) return [];

  // 1. Get classes where teacher is primary (supports both User Account ID and Teacher Profile ID)
  const primaryClasses = await Class.find({
    $or: [
      { teacher: teacher._id },
      { teacher: teacher.user }
    ]
  }).select('name');

  // 2. Get classes from ClassSubject mappings
  const mappings = await ClassSubject.find({ teacher: teacher._id })
    .populate('class', 'name')
    .select('class');
  
  const mappingClasses = mappings.map(m => m.class).filter(c => !!c);

  // 3. Get classes by names from teacher.assignedClasses array
  let assignedClassesByName = [];
  if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
    assignedClassesByName = await Class.find({ name: { $in: teacher.assignedClasses } }).select('name');
  }

  // Merge and remove duplicates by ID
  const allClassIds = new Set();
  const uniqueClasses = [];

  [...primaryClasses, ...mappingClasses, ...assignedClassesByName].forEach(cls => {
    const idStr = cls._id.toString();
    if (!allClassIds.has(idStr)) {
      uniqueClasses.push({ _id: cls._id, name: cls.name });
      allClassIds.add(idStr);
    }
  });

  uniqueClasses.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  return uniqueClasses;
};


/**
 * Converts "HH:MM AM/PM" to minutes from midnight
... (rest of the timeToMinutes function)
 */
const timeToMinutes = (timeStr) => {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

/**
 * Checks if two time ranges overlap
... (rest of the functions)
 */
const isOverlap = (start1, end1, start2, end2) => {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  return s1 < e2 && s2 < e1;
};

const checkTeacherClash = async (teacherId, day, startTime, endTime, classId) => {
  const otherTimetables = await Timetable.find({
    class: { $ne: classId },
    'weeklySchedule.day': day,
    isActive: true
  }).populate('class', 'name');

  for (const tt of otherTimetables) {
    const daySchedule = tt.weeklySchedule.find(ds => ds.day === day);
    for (const slot of daySchedule.slots) {
      if (slot.teacher && slot.teacher.toString() === teacherId.toString()) {
        if (isOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
          return tt.class.name;
        }
      }
    }
  }
  return null;
};

const validateSchedule = async (weeklySchedule, classId) => {
  for (const daySchedule of weeklySchedule) {
    const slots = daySchedule.slots;
    
    // Check for internal overlaps and mandatory fields
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      
      // 1. Mandatory Field Checks
      if (slot.type === 'Break') {
        if (!slot.label) throw new Error(`Break label is required on ${daySchedule.day} at ${slot.startTime}`);
      } else {
        if (!slot.subject) throw new Error(`Subject is required for ${slot.type} slot on ${daySchedule.day} at ${slot.startTime}`);
        if (!slot.teacher) throw new Error(`Teacher is required for ${slot.type} slot on ${daySchedule.day} at ${slot.startTime}`);
      }

      // 2. Internal Overlap Check
      for (let j = i + 1; j < slots.length; j++) {
        if (isOverlap(slot.startTime, slot.endTime, slots[j].startTime, slots[j].endTime)) {
          throw new Error(`Overlap detected on ${daySchedule.day} between slot ${i + 1} and slot ${j + 1}`);
        }
      }

      // 3. Global Teacher Clash Check
      if (slot.teacher) {
        const clashClass = await checkTeacherClash(slot.teacher, daySchedule.day, slot.startTime, slot.endTime, classId);
        if (clashClass) {
          throw new Error(`Teacher clash on ${daySchedule.day}: Faculty is already assigned to Class ${clashClass} during ${slot.startTime} - ${slot.endTime}`);
        }
      }

      // 4. Consecutive Subject Check (Warning logic could be here, but using Error for strict validation)
      if (i > 0 && slot.type !== 'Break' && slots[i-1].type !== 'Break') {
        if (slot.subject.toString() === slots[i-1].subject.toString()) {
          // Allowing consecutive if intended, but could add a rule here if needed.
          // For now, just handling the "Subject repetition" as "ensure it's valid".
        }
      }
    }
  }
};


exports.createTimetable = async (timetableData) => {
  await validateSchedule(timetableData.weeklySchedule, timetableData.class);

  
  const existing = await Timetable.findOne({
    class: timetableData.class,
    academicYear: timetableData.academicYear,
    semester: timetableData.semester
  });
  
  if (existing) {
    throw new Error('A timetable already exists for this class and semester.');
  }

  const timetable = await Timetable.create(timetableData);
  return timetable;
};

exports.updateTimetable = async (id, updateData) => {
  if (updateData.weeklySchedule) {
    await validateSchedule(updateData.weeklySchedule, updateData.class || (await Timetable.findById(id))?.class);
  }


  const timetable = await Timetable.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!timetable) {
    throw new Error('Timetable not found');
  }

  return timetable;
};

exports.getTimetableByClass = async (classId) => {
  const timetable = await Timetable.findOne({ class: classId, isActive: true })
    .populate('class', 'name')
    .populate('weeklySchedule.slots.subject', 'name')
    .populate('weeklySchedule.slots.teacher', 'firstName lastName'); 
  
  return timetable;
};

/**
 * Generates a professional PDF for the timetable
 */
/**
 * Generates a professional PDF for the timetable
 */
exports.generateTimetablePDF = async (classId, outStream, filterTeacherUserId = null) => {
  const timetable = await this.getTimetableByClass(classId);
  if (!timetable) throw new Error('Timetable not found');

  let weeklySchedule = timetable.weeklySchedule;

  if (filterTeacherUserId) {
    const Teacher = require('../models/Teacher');
    const teacher = await Teacher.findOne({ user: filterTeacherUserId });
    if (teacher) {
      weeklySchedule = weeklySchedule.map(dayData => {
        const plainDay = dayData.toObject ? dayData.toObject() : dayData;
        plainDay.slots = plainDay.slots.filter(slot => {
          if (slot.type === 'Break') return true;
          return slot.teacher && slot.teacher._id.toString() === teacher._id.toString();
        });
        return plainDay;
      });
    }
  }

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(outStream);

  // Helper to draw Header Banner
  const drawHeader = () => {
    // Top primary color accent strip
    doc.rect(40, 25, 515, 4).fill('#ea580c'); // Primary Orange

    // School Name
    doc.fillColor('#0f172a')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('LITTLE FLOWER ENGLISH SCHOOL', 40, 36, { align: 'center' });

    // Subtitle & Contact Info
    doc.fillColor('#64748b')
       .fontSize(9)
       .font('Helvetica-Oblique')
       .text('Quality Education for a Brighter Future', 40, 60, { align: 'center' });

    doc.fillColor('#1e293b')
       .fontSize(8.5)
       .font('Helvetica-Bold')
       .text('Contact: +91 82946 80282 (Dir: Chandramohan Tiwari)  |  Email: lfes@gmail.com', 40, 73, { align: 'center' });

    // Divider Line
    doc.moveTo(40, 88).lineTo(555, 88).strokeColor('#e2e8f0').lineWidth(1).stroke();
  };

  drawHeader();

  // Official Timetable Title Card
  doc.roundedRect(40, 96, 515, 26, 6).fill('#1e293b');
  const classNameStr = timetable.class ? (timetable.class.name || timetable.class) : '';
  doc.fillColor('#ffffff')
     .fontSize(11)
     .font('Helvetica-Bold')
     .text(`OFFICIAL ACADEMIC TIMETABLE — CLASS ${classNameStr.toUpperCase()}`, 40, 104, { align: 'center' });

  // Metadata Card
  doc.roundedRect(40, 128, 515, 22, 6).fill('#f8fafc');
  doc.rect(40, 128, 515, 22).strokeColor('#cbd5e1').lineWidth(0.7).stroke();

  doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold');
  doc.text(`Academic Term: ${timetable.semester || 'Annual Term'}`, 52, 135);
  doc.text(`Academic Year: ${timetable.academicYear || new Date().getFullYear()}`, 240, 135);
  const genDateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Generated: ${genDateStr}`, 430, 135);

  let currentY = 160;

  const checkPageOverflow = (neededHeight) => {
    if (currentY + neededHeight > 770) {
      doc.addPage();
      drawHeader();
      currentY = 100;
    }
  };

  // Render Day-wise Timetable Tables
  weeklySchedule.forEach((dayData) => {
    const slots = dayData.slots || [];
    if (slots.length === 0) return; // Skip empty days

    const dayHeaderHeight = 22;
    const rowHeight = 20;
    const tableHeaderHeight = 18;
    const totalBlockHeight = dayHeaderHeight + tableHeaderHeight + (slots.length * rowHeight) + 12;

    // Check if whole day block fits or needs a new page
    checkPageOverflow(totalBlockHeight > 180 ? dayHeaderHeight + tableHeaderHeight + (2 * rowHeight) : totalBlockHeight);

    // Day Header Banner
    doc.roundedRect(40, currentY, 515, dayHeaderHeight, 4).fill('#ea580c');
    doc.fillColor('#ffffff')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text(dayData.day.toUpperCase(), 50, currentY + 6);
    currentY += dayHeaderHeight + 2;

    // Table Column Headers
    doc.rect(40, currentY, 515, tableHeaderHeight).fill('#f1f5f9');
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold');
    doc.text('TIME SLOT', 50, currentY + 5, { width: 110 });
    doc.text('TYPE', 165, currentY + 5, { width: 60 });
    doc.text('SUBJECT', 235, currentY + 5, { width: 155 });
    doc.text('FACULTY / INSTRUCTOR', 395, currentY + 5, { width: 150 });
    
    currentY += tableHeaderHeight;

    // Slots Rows
    slots.forEach((slot, idx) => {
      checkPageOverflow(rowHeight + 5);

      // Alternate row background
      if (idx % 2 === 0) {
        doc.rect(40, currentY, 515, rowHeight).fill('#ffffff');
      } else {
        doc.rect(40, currentY, 515, rowHeight).fill('#f8fafc');
      }
      doc.rect(40, currentY, 515, rowHeight).strokeColor('#f1f5f9').lineWidth(0.5).stroke();

      // Time Range
      doc.fillColor('#1e293b').fontSize(8).font('Helvetica-Bold');
      doc.text(`${slot.startTime || ''} - ${slot.endTime || ''}`, 50, currentY + 5, { width: 110 });

      // Type Badge
      const typeStr = (slot.type || 'Theory').toUpperCase();
      let badgeBg = '#e0f2fe'; // Light Blue
      let badgeText = '#0369a1';
      if (typeStr === 'THEORY') {
        badgeBg = '#fff7ed';
        badgeText = '#c2410c';
      } else if (typeStr === 'LAB') {
        badgeBg = '#f3e8ff';
        badgeText = '#7e22ce';
      } else if (typeStr === 'BREAK') {
        badgeBg = '#fef3c7';
        badgeText = '#b45309';
      }
      doc.roundedRect(165, currentY + 3, 56, 14, 3).fill(badgeBg);
      doc.fillColor(badgeText).fontSize(7).font('Helvetica-Bold').text(typeStr, 165, currentY + 6, { width: 56, align: 'center' });

      // Subject
      const subjectName = slot.subject ? (slot.subject.name || slot.subject) : (slot.label || slot.type || 'N/A');
      const subjectCode = slot.subject && slot.subject.code ? ` (${slot.subject.code})` : '';
      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold');
      doc.text(`${subjectName}${subjectCode}`, 235, currentY + 5, { width: 155, ellipsis: true });

      // Faculty / Teacher
      let teacherName = 'N/A';
      if (slot.teacher) {
        teacherName = slot.teacher.firstName ? `${slot.teacher.firstName} ${slot.teacher.lastName || ''}`.trim() : (slot.teacher.name || 'N/A');
      } else if (slot.type === 'Break') {
        teacherName = '-';
      }
      doc.fillColor('#475569').fontSize(8).font('Helvetica');
      doc.text(teacherName, 395, currentY + 5, { width: 150, ellipsis: true });

      currentY += rowHeight;
    });

    currentY += 10; // Gap between days
  });

  // Footer at bottom of document
  doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica-Oblique').text(
    'This is an official computer-generated academic document. | Little Flower English School',
    40, 800, { align: 'center', width: 515 }
  );

  doc.end();
  return doc;
};

// ──────────────────────────────────────────────
// Timetable Copy & Replication System
// ──────────────────────────────────────────────

// Using existing timeToMinutes and isOverlap from earlier in the file

exports.previewCopyTimetable = async (timetableId, sourceDay, destinationDays) => {
  const timetable = await Timetable.findById(timetableId).populate('class');
  if (!timetable) throw new Error('Timetable not found');

  const sourceSchedule = timetable.weeklySchedule.find(d => d.day === sourceDay);
  if (!sourceSchedule || !sourceSchedule.slots || sourceSchedule.slots.length === 0) {
    throw new Error(`Source day ${sourceDay} has no periods to copy.`);
  }

  // Fetch all other active timetables for conflict detection
  const otherTimetables = await Timetable.find({
    _id: { $ne: timetableId },
    academicYear: timetable.academicYear,
    semester: timetable.semester,
    isActive: true
  });

  const conflicts = [];
  let existingDestinations = 0;

  for (const destDay of destinationDays) {
    const existingDest = timetable.weeklySchedule.find(d => d.day === destDay);
    if (existingDest && existingDest.slots && existingDest.slots.length > 0) {
      existingDestinations++;
    }

    for (const sourceSlot of sourceSchedule.slots) {
      // Check against other timetables on the destination day
      for (const other of otherTimetables) {
        const otherDestSchedule = other.weeklySchedule.find(d => d.day === destDay);
        if (!otherDestSchedule || !otherDestSchedule.slots) continue;

        for (const otherSlot of otherDestSchedule.slots) {
          if (isOverlap(sourceSlot.startTime, sourceSlot.endTime, otherSlot.startTime, otherSlot.endTime)) {
            // Teacher Conflict
            if (sourceSlot.teacher && otherSlot.teacher && sourceSlot.teacher.toString() === otherSlot.teacher.toString()) {
              conflicts.push(`Teacher conflict on ${destDay} at ${sourceSlot.startTime} - ${sourceSlot.endTime} (Already teaching in another class)`);
            }
            // Room Conflict
            if (sourceSlot.room && otherSlot.room && sourceSlot.room === otherSlot.room) {
              conflicts.push(`Room conflict on ${destDay} at ${sourceSlot.startTime} - ${sourceSlot.endTime} (Room ${sourceSlot.room} occupied)`);
            }
          }
        }
      }
    }
  }

  // Calculate distinct items
  const uniqueTeachers = new Set(sourceSchedule.slots.map(s => s.teacher?.toString()).filter(Boolean));
  const uniqueSubjects = new Set(sourceSchedule.slots.map(s => s.subject?.toString()).filter(Boolean));

  return {
    sourceDay,
    destinationDays,
    periodsCount: sourceSchedule.slots.length,
    teachersCount: uniqueTeachers.size,
    subjectsCount: uniqueSubjects.size,
    conflicts: [...new Set(conflicts)], // Unique conflicts
    hasExistingDestinations: existingDestinations > 0
  };
};

exports.copyTimetable = async (timetableId, sourceDay, destinationDays, overwriteMode, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const timetable = await Timetable.findById(timetableId).session(session);
    if (!timetable) throw new Error('Timetable not found');

    const sourceSchedule = timetable.weeklySchedule.find(d => d.day === sourceDay);
    if (!sourceSchedule || !sourceSchedule.slots || sourceSchedule.slots.length === 0) {
      throw new Error(`Source day ${sourceDay} has no periods to copy.`);
    }

    // Save previous version for Undo
    const previousVersion = JSON.parse(JSON.stringify(timetable.weeklySchedule));

    const sourceSlots = JSON.parse(JSON.stringify(sourceSchedule.slots));

    for (const destDay of destinationDays) {
      let destIndex = timetable.weeklySchedule.findIndex(d => d.day === destDay);
      if (destIndex === -1) {
        timetable.weeklySchedule.push({ day: destDay, slots: [] });
        destIndex = timetable.weeklySchedule.length - 1;
      }

      const destSchedule = timetable.weeklySchedule[destIndex];

      if (overwriteMode === 'replace' || destSchedule.slots.length === 0) {
        destSchedule.slots = sourceSlots.map(s => {
          const { _id, ...rest } = s; // Remove old object IDs
          return rest;
        });
      } else if (overwriteMode === 'merge') {
        // Keep existing slots, append non-overlapping source slots
        const slotsToAdd = [];
        for (const sSlot of sourceSlots) {
          const overlap = destSchedule.slots.some(dSlot => 
            isOverlap(sSlot.startTime, sSlot.endTime, dSlot.startTime, dSlot.endTime)
          );
          if (!overlap) {
            const { _id, ...rest } = sSlot;
            slotsToAdd.push(rest);
          }
        }
        destSchedule.slots = [...destSchedule.slots, ...slotsToAdd];
        // Sort by start time
        destSchedule.slots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      }
    }

    await timetable.save({ session });

    // Create Audit Log
    const auditLog = new TimetableAuditLog({
      action: 'COPY_TIMETABLE',
      timetable: timetable._id,
      performedBy: userId,
      sourceDay,
      destinationDays,
      previousVersion,
      newVersion: timetable.weeklySchedule,
      details: `Copied ${sourceDay} to ${destinationDays.join(', ')} with mode ${overwriteMode}`
    });
    await auditLog.save({ session });

    await session.commitTransaction();
    session.endSession();

    return { timetable, auditLogId: auditLog._id };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

exports.undoCopy = async (auditLogId, userId) => {
  const auditLog = await TimetableAuditLog.findById(auditLogId);
  if (!auditLog) throw new Error('Audit log not found');
  if (auditLog.action !== 'COPY_TIMETABLE') throw new Error('Invalid audit log action for undo');
  
  // Optional: Check if 30 seconds have passed
  const ageInSeconds = (new Date() - auditLog.createdAt) / 1000;
  if (ageInSeconds > 60) { // Giving 60s buffer on backend, UI will enforce 30s
    throw new Error('Undo window has expired');
  }

  const timetable = await Timetable.findById(auditLog.timetable);
  if (!timetable) throw new Error('Timetable not found');

  timetable.weeklySchedule = auditLog.previousVersion;
  await timetable.save();

  auditLog.action = 'UNDO_COPY';
  auditLog.details += ' (UNDONE)';
  await auditLog.save();

  return timetable;
};

