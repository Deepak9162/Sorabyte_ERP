/**
 * Result Calculator Utility
 * 
 * Reusable server-side calculation engine for marks, percentages, grades,
 * divisions, and overall examination results.
 */

/**
 * Calculates subject pass/fail status
 * @param {number} marksObtained
 * @param {number} passMarks
 * @param {boolean} isAbsent
 * @returns {string} 'Pass' | 'Fail'
 */
const calculateSubjectResult = (marksObtained, passMarks, isAbsent = false) => {
  if (isAbsent) return 'Fail';
  return marksObtained >= passMarks ? 'Pass' : 'Fail';
};

/**
 * Calculates grade based on percentage
 * @param {number} percentage
 * @returns {string} Grade (A+, A, B+, B, C, D, F)
 */
const calculateGrade = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 33) return 'D';
  return 'F';
};

/**
 * Calculates division based on percentage and overall result status
 * @param {number} percentage
 * @param {boolean} isOverallPass
 * @returns {string} Division (1st Division, 2nd Division, 3rd Division, Fail)
 */
const calculateDivision = (percentage, isOverallPass) => {
  if (!isOverallPass) return 'Fail';
  if (percentage >= 60) return '1st Division';
  if (percentage >= 45) return '2nd Division';
  if (percentage >= 33) return '3rd Division';
  return 'Fail';
};

/**
 * Calculates overall exam result summary from a list of subject marks records
 * @param {Array} marksList - Array of marks records { maxMarks, passMarks, marksObtained, isAbsent, status }
 * @returns {Object} { totalMaxMarks, totalMarksObtained, percentage, grade, division, overallStatus, passedSubjects, failedSubjects }
 */
const calculateOverallResult = (marksList = []) => {
  if (!marksList || marksList.length === 0) {
    return {
      totalMaxMarks: 0,
      totalMarksObtained: 0,
      percentage: 0,
      grade: 'F',
      division: 'Fail',
      overallStatus: 'Fail',
      passedSubjects: 0,
      failedSubjects: 0,
    };
  }

  let totalMaxMarks = 0;
  let totalMarksObtained = 0;
  let passedSubjects = 0;
  let failedSubjects = 0;
  let hasFailedSubject = false;

  marksList.forEach((mark) => {
    totalMaxMarks += Number(mark.maxMarks) || 0;
    const obtained = mark.isAbsent ? 0 : (Number(mark.marksObtained) || 0);
    totalMarksObtained += obtained;

    const passStatus = mark.status || calculateSubjectResult(obtained, mark.passMarks, mark.isAbsent);
    if (passStatus === 'Pass') {
      passedSubjects += 1;
    } else {
      failedSubjects += 1;
      hasFailedSubject = true;
    }
  });

  const rawPercentage = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;
  const percentage = Math.round(rawPercentage * 100) / 100; // Round to 2 decimals

  const overallStatus = !hasFailedSubject && percentage >= 33 ? 'Pass' : 'Fail';
  const grade = calculateGrade(percentage);
  const division = calculateDivision(percentage, overallStatus === 'Pass');

  return {
    totalMaxMarks,
    totalMaximumMarks: totalMaxMarks,
    totalMarksObtained,
    totalObtainedMarks: totalMarksObtained,
    percentage,
    grade,
    overallGrade: grade,
    division,
    overallStatus,
    resultStatus: overallStatus,
    passedSubjects,
    failedSubjects,
  };
};

module.exports = {
  calculateSubjectResult,
  calculateGrade,
  calculateDivision,
  calculateOverallResult,
};
