const assert = require('assert');
const {
  createSubjectApplicabilityResolver,
  countExpectedMarkRecords,
} = require('../utils/subjectApplicability');
const { calculateOverallResult } = require('../utils/resultCalculator');

const subjects = ['eng', 'hin', 'math', 'sci', 'comp', 'san'];
const compulsoryExam = {
  subjectsConfig: subjects.map((subject) => ({
    subject,
    maxMarks: 100,
    passMarks: 33,
  })),
};

const optionalExam = {
  subjectsConfig: subjects.map((subject) => ({
    subject,
    maxMarks: 100,
    passMarks: 33,
    applicability: subject === 'san' ? 'OPTIONAL' : 'COMPULSORY',
    applicableStudents: subject === 'san' ? ['studentA'] : [],
  })),
};

const makeMark = (marksObtained, status = 'Pass', extra = {}) => ({
  maxMarks: 100,
  passMarks: 33,
  marksObtained,
  status,
  isAbsent: false,
  isApplicable: true,
  ...extra,
});

// Case 1: all six compulsory => /600
{
  const result = calculateOverallResult(
    [70, 65, 60, 62, 60, 60].map((m) => makeMark(m))
  );
  assert.strictEqual(result.totalMarksObtained, 377);
  assert.strictEqual(result.totalMaxMarks, 600);
  assert.strictEqual(result.percentage, 62.83);
}

// Case 2: optional Sanskrit assigned => applicable.
{
  const resolver = createSubjectApplicabilityResolver(optionalExam, []);
  assert.strictEqual(resolver.isApplicable('studentA', 'san'), true);
}

// Case 3: optional Sanskrit not assigned => N/A excluded => 377/500.
{
  const resolver = createSubjectApplicabilityResolver(optionalExam, []);
  assert.strictEqual(resolver.isApplicable('studentB', 'san'), false);

  const result = calculateOverallResult([
    makeMark(80),
    makeMark(70),
    makeMark(75),
    makeMark(72),
    makeMark(80),
    { maxMarks: 100, passMarks: 33, marksObtained: null, status: 'N/A', isApplicable: false },
  ]);
  assert.strictEqual(result.totalMarksObtained, 377);
  assert.strictEqual(result.totalMaxMarks, 500);
  assert.strictEqual(result.percentage, 75.4);
  assert.strictEqual(result.overallStatus, 'Pass');
}

// Requested aggregate examples: 423/500 with Sanskrit N/A, and 477/600 when applicable.
{
  const naResult = calculateOverallResult([
    makeMark(68), makeMark(80), makeMark(86), makeMark(94), makeMark(95),
    { maxMarks: 100, passMarks: 33, marksObtained: null, status: 'N/A', isApplicable: false },
  ]);
  assert.strictEqual(naResult.totalMarksObtained, 423);
  assert.strictEqual(naResult.totalMaxMarks, 500);
  assert.strictEqual(naResult.percentage, 84.6);

  const applicableResult = calculateOverallResult([
    makeMark(68), makeMark(80), makeMark(86), makeMark(94), makeMark(95), makeMark(54),
  ]);
  assert.strictEqual(applicableResult.totalMarksObtained, 477);
  assert.strictEqual(applicableResult.totalMaxMarks, 600);
  assert.strictEqual(applicableResult.percentage, 79.5);
}

// Case 4: applicable but absent remains ABS/fail behavior, never N/A.
{
  const result = calculateOverallResult([
    makeMark(60),
    makeMark(0, 'Fail', { isAbsent: true }),
  ]);
  assert.strictEqual(result.totalMaxMarks, 200);
  assert.strictEqual(result.failedSubjects, 1);
  assert.strictEqual(result.overallStatus, 'Fail');
}

// Case 5: zero is a real applicable mark.
{
  const result = calculateOverallResult([makeMark(0, 'Fail')]);
  assert.strictEqual(result.totalMaxMarks, 100);
  assert.strictEqual(result.totalMarksObtained, 0);
  assert.strictEqual(result.failedSubjects, 1);
}

// Case 6: pending is distinct and denominator remains applicable max.
{
  const result = calculateOverallResult([
    makeMark(50),
    { maxMarks: 100, passMarks: 33, marksObtained: null, status: 'Pending', isPending: true, isApplicable: true },
  ]);
  assert.strictEqual(result.totalMaxMarks, 200);
  assert.strictEqual(result.pendingSubjects, 1);
  assert.strictEqual(result.overallStatus, 'Incomplete');
}

// Legacy: missing applicability defaults compulsory.
{
  const resolver = createSubjectApplicabilityResolver(compulsoryExam, []);
  assert.strictEqual(resolver.isApplicable('legacyStudent', 'san'), true);
}

// Explicit OPTIONAL configuration remains authoritative even if a historical
// ExamMarks row exists. The mark is preserved in DB but excluded while N/A.
{
  const resolver = createSubjectApplicabilityResolver(optionalExam, [
    { student: 'studentB', subject: 'san' },
  ]);
  assert.strictEqual(resolver.isApplicable('studentB', 'san'), false);
}

// Expected-record denominator is per student and independent of hidden marks.
{
  const students = [{ _id: 'studentA' }, { _id: 'studentB' }];
  assert.strictEqual(countExpectedMarkRecords(optionalExam, students, []), 11);
  assert.strictEqual(
    countExpectedMarkRecords(optionalExam, students, [{ student: 'studentB', subject: 'san' }]),
    11
  );
}

console.log('Subject applicability/result calculation tests: PASS');
