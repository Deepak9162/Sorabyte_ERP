const toId = (value) => {
  if (!value) return '';
  if (value._id) return String(value._id);
  return String(value);
};

const getSubjectConfigSubjectId = (subjectConfig) =>
  toId(subjectConfig?.subject);

const getSubjectApplicabilityMode = (subjectConfig) =>
  subjectConfig?.applicability === 'OPTIONAL' ? 'OPTIONAL' : 'COMPULSORY';

const getConfiguredApplicableStudentIds = (subjectConfig) =>
  new Set(
    Array.isArray(subjectConfig?.applicableStudents)
      ? subjectConfig.applicableStudents.map(toId).filter(Boolean)
      : []
  );

const buildExistingMarkStudentsBySubject = (marksRecords = []) => {
  const map = new Map();

  for (const mark of marksRecords || []) {
    const subjectId = toId(mark?.subject);
    const studentId = toId(mark?.student);
    if (!subjectId || !studentId) continue;

    if (!map.has(subjectId)) {
      map.set(subjectId, new Set());
    }
    map.get(subjectId).add(studentId);
  }

  return map;
};

/**
 * Creates the single authoritative applicability resolver for an exam.
 *
 * Source of truth:
 * - Missing applicability config => COMPULSORY (backward compatible).
 * - COMPULSORY => every student is applicable.
 * - OPTIONAL => applicableStudents is authoritative.
 *
 * Existing ExamMarks are intentionally NOT used as an applicability override.
 * This allows an explicit academic correction to mark a student N/A while
 * preserving the historical mark record in the database.
 */
const createSubjectApplicabilityResolver = (exam, marksRecords = []) => {
  const configs = Array.isArray(exam?.subjectsConfig) ? exam.subjectsConfig : [];
  const configBySubject = new Map(
    configs.map((sc) => [getSubjectConfigSubjectId(sc), sc])
  );
  const existingMarkStudentsBySubject =
    buildExistingMarkStudentsBySubject(marksRecords);

  const isApplicable = (studentIdValue, subjectIdValue) => {
    const studentId = toId(studentIdValue);
    const subjectId = toId(subjectIdValue);
    const config = configBySubject.get(subjectId);

    if (!config) return false;

    if (getSubjectApplicabilityMode(config) !== 'OPTIONAL') {
      return true;
    }

    return getConfiguredApplicableStudentIds(config).has(studentId);
  };

  return {
    isApplicable,
    getMode: (subjectIdValue) => {
      const config = configBySubject.get(toId(subjectIdValue));
      return config ? getSubjectApplicabilityMode(config) : 'COMPULSORY';
    },
    getConfig: (subjectIdValue) =>
      configBySubject.get(toId(subjectIdValue)) || null,
    existingMarkStudentsBySubject,
  };
};

const countExpectedMarkRecords = (exam, students = [], marksRecords = []) => {
  const resolver = createSubjectApplicabilityResolver(exam, marksRecords);
  let total = 0;

  for (const student of students || []) {
    for (const sc of exam?.subjectsConfig || []) {
      if (resolver.isApplicable(student?._id || student, sc?.subject)) {
        total += 1;
      }
    }
  }

  return total;
};

module.exports = {
  toId,
  getSubjectConfigSubjectId,
  getSubjectApplicabilityMode,
  getConfiguredApplicableStudentIds,
  createSubjectApplicabilityResolver,
  countExpectedMarkRecords,
};
