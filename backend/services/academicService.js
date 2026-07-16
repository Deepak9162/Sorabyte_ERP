const Subject = require('../models/Subject');
const ClassSubject = require('../models/ClassSubject');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');

class AcademicService {
  // --- Subject Management --- //

  async createSubject(subjectData) {
    const exists = await Subject.findOne({ name: { $regex: new RegExp(`^${subjectData.name.trim()}$`, 'i') } });
    if (exists) {
      throw new Error(`Subject with name "${subjectData.name}" already exists`);
    }
    const subject = await Subject.create(subjectData);
    return subject;
  }

  async getAllSubjects() {
    return await Subject.find().sort({ name: 1 });
  }

  async getSubjectById(id) {
    const subject = await Subject.findById(id);
    if (!subject) throw new Error('Subject not found');
    return subject;
  }

  async updateSubject(id, updates) {
    const subject = await Subject.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!subject) throw new Error('Subject not found');
    return subject;
  }

  async deleteSubject(id) {
    // Check if subject is mapped to any class
    const mappings = await ClassSubject.find({ subject: id });
    if (mappings.length > 0) {
      throw new Error('Cannot delete subject as it is assigned to classes');
    }
    const subject = await Subject.findByIdAndDelete(id);
    if (!subject) throw new Error('Subject not found');
    return subject;
  }

  // --- Class-Subject Mapping Management --- //

  async assignSubjectToClass(classId, mappingData) {
    const { subjectId, teacherId, sessionsPerWeek } = mappingData;

    // Verify existence
    const cls = await Class.findById(classId);
    if (!cls) throw new Error('Class not found');
    
    const subject = await Subject.findById(subjectId);
    if (!subject) throw new Error('Subject not found');

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) throw new Error('Teacher not found');

    // Check if mapping already exists
    const existing = await ClassSubject.findOne({ class: classId, subject: subjectId });
    if (existing) {
      throw new Error('This subject is already assigned to this class');
    }

    const mapping = await ClassSubject.create({
      class: classId,
      subject: subjectId,
      teacher: teacherId,
      sessionsPerWeek
    });

    return await mapping.populate(['subject', 'teacher']);
  }

  async getClassSubjects(classId) {
    return await ClassSubject.find({ class: classId })
      .populate('subject', 'name type')
      .populate('teacher', 'firstName lastName email');
  }

  async removeClassSubjectMapping(mappingId) {
    const mapping = await ClassSubject.findByIdAndDelete(mappingId);
    if (!mapping) throw new Error('Mapping not found');
    return mapping;
  }
}

module.exports = new AcademicService();
