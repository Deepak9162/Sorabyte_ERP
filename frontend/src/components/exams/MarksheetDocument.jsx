import React, { forwardRef } from 'react';
import schoolLogo from '../../assets/schoollogo.png';
import './MarksheetDocument.css';

const NAVY = '#08295B';

const CertificateBorder = () => (
  <img
    className="certificate-border"
    src="/assets/marksheet_Border.png"
    alt=""
    aria-hidden="true"
    crossOrigin="anonymous"
  />
);

const ExamTitleFrame = ({ children }) => (
  <div className="exam-title-frame">
    <span className="exam-title-text">{children}</span>
  </div>
);

const FooterOrnament = () => (
  <svg className="footer-ornament" viewBox="0 0 120 34" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 17h29c8 0 12-4 17-12 5 8 9 12 17 12h49" />
      <path d="M4 17h29c8 0 12 4 17 12 5-8 9-12 17-12h49" />
      <path d="M50 5c3 8 6 12 10 12-4 0-7 4-10 12-3-8-6-12-10-12 4 0 7-4 10-12Z" />
      <path d="M70 9c3 5 7 8 12 8-5 0-9 3-12 8-3-5-7-8-12-8 5 0 9-3 12-8Z" />
    </g>
  </svg>
);

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
};

const normalizeSession = (value) => {
  if (!value) return '';
  const s = String(value).trim();
  const compact = s.match(/^(\d{4})\s*[-/]\s*(\d{2})$/);
  if (compact) return `${compact[1]} - 20${compact[2]}`;
  const full = s.match(/^(\d{4})\s*[-/]\s*(\d{4})$/);
  if (full) return `${full[1]} - ${full[2]}`;
  return s.replace(/-/g, ' - ');
};

const displayMark = (subject) => {
  if (subject?.isAbsent) return 'ABS';
  const value = subject?.marksObtained;
  return value === null || value === undefined || value === '' ? '—' : value;
};

const numericMark = (subject) => {
  if (subject?.isAbsent) return 0;
  const n = Number(subject?.marksObtained);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Single authoritative A4 marksheet DOM for preview, individual PDF,
 * bulk PDF and print. Visual-only component: no result business logic is changed.
 */
const MarksheetDocument = forwardRef(({ data, className = '', id = 'marksheet-document-root' }, ref) => {
  if (!data) return null;

  const {
    student = {},
    exam = {},
    subjects = [],
    aggregate = {},
    attendance = {},
    signatures = {},
    institute = {},
    school = {},
    teacherRemarks = '',
  } = data;

  const schoolData = { ...institute, ...school };
  const examType = String(exam.examType || '').toUpperCase();
  const examTitle = examType === 'ANNUAL' ? 'ANNUAL EXAMINATION' : 'HALF YEARLY EXAMINATION';

  const totalMax = aggregate.totalMaxMarks ?? aggregate.totalMaximumMarks ??
    subjects.reduce((sum, s) => sum + (Number(s.maxMarks) || 0), 0);
  const totalPass = subjects.reduce((sum, s) => sum + (Number(s.passMarks) || 0), 0);
  const totalObtained = aggregate.totalMarksObtained ?? aggregate.totalObtainedMarks ??
    subjects.reduce((sum, s) => sum + numericMark(s), 0);

  const registrationNo = schoolData.registrationNo || schoolData.regdNo || '21812312026441431503';
  const udiseCode = schoolData.udiseCode || schoolData.udise || '10164102145';
  const schoolName = schoolData.schoolName || 'Little Flower English School';
  const schoolLocation = schoolData.location || schoolData.cityLine || 'Tarwara Road, Dindayalpur - 841506';
  const classTeacherName = signatures.classTeacher || '';
  const directorName = signatures.director || schoolData.directorName || 'Chandra Mohan Tiwari';
  const principalName = signatures.principal || schoolData.principalName || 'Chandra Mohan Tiwari';
  const website = schoolData.website || 'www.lfessiwan.in';
  const slogan = schoolData.slogan || 'A STEP TOWARDS A BRIGHTER FUTURE';
  const session = normalizeSession(exam.session || schoolData.academicSession);
  const attendanceText = attendance.attendancePercentage ?? '';
  const subjectCount = subjects.length;
  const densityMode = subjectCount >= 8
    ? 'dense'
    : subjectCount >= 6
      ? 'compact'
      : 'normal';

  return (
    <div
      ref={ref}
      id={id}
      className={`marksheet-print-area marksheet-document marksheet-density--${densityMode} ${className}`}
      data-subject-count={subjectCount}
      style={{ color: NAVY }}
    >
      <CertificateBorder />

      <div className="marksheet-document__content">
        <div className="marksheet-meta">
          <span>Regd No - {registrationNo}</span>
          <span>Udise Code - {udiseCode}</span>
        </div>

        <div className="marksheet-logo-row">
          <img
            className="marksheet-logo"
            src={schoolLogo}
            alt="Little Flower English School logo"
            crossOrigin="anonymous"
          />
        </div>

        <div className="marksheet-school-name-wrap" aria-label={schoolName}>
          <img
            className="marksheet-school-name-image"
            src="/school_name.png"
            alt={schoolName}
            crossOrigin="anonymous"
          />
        </div>
        <div className="marksheet-location">{schoolLocation}</div>

        <div className="marksheet-motto-row">
          <span className="marksheet-motto-line" />
          <div className="marksheet-motto-box">"ज्ञानं परमं बलम्"</div>
          <span className="marksheet-motto-line" />
        </div>

        <div className="exam-heading-wrap">
          <ExamTitleFrame>{examTitle}</ExamTitleFrame>
        </div>
        <div className="marksheet-session">ACADEMIC SESSION : {session}</div>

        <section className="student-info-box" aria-label="Student information">
          <div className="student-info-left">
            <div className="student-info-row">
              <span className="student-info-label">Student’s Name</span>
              <span className="student-info-colon">:</span>
              <span className="student-info-value">{student.fullName || ''}</span>
            </div>
            <div className="student-info-row">
              <span className="student-info-label">Father’s Name</span>
              <span className="student-info-colon">:</span>
              <span className="student-info-value">{student.fatherName || ''}</span>
            </div>
            <div className="student-info-row">
              <span className="student-info-label">Date of Birth</span>
              <span className="student-info-colon">:</span>
              <span className="student-info-value">{formatDate(student.dob || student.dateOfBirth)}</span>
            </div>
            <div className="student-info-row">
              <span className="student-info-label">Address</span>
              <span className="student-info-colon">:</span>
              <span className="student-info-value student-info-value--address">{student.address || ''}</span>
            </div>
          </div>

          <div className="student-info-right">
            <div className="student-info-row">
              <span className="student-info-label">Class</span>
              <span className="student-info-colon">:</span>
              <span className="student-info-value">{student.class || ''}</span>
            </div>
            <div className="student-info-row">
              <span className="student-info-label">Section</span>
              <span className="student-info-colon">:</span>
              <span className="student-info-value">{student.section || ''}</span>
            </div>
            <div className="student-info-row">
              <span className="student-info-label">Roll No</span>
              <span className="student-info-colon">:</span>
              <span className="student-info-value">{student.rollNumber ?? ''}</span>
            </div>
            <div className="student-info-row">
              <span className="student-info-label">Session</span>
              <span className="student-info-colon">:</span>
              <span className="student-info-value">{session}</span>
            </div>
          </div>
        </section>

        <div className="marksheet-table-wrap">
          <table className="marksheet-table" aria-label="Subject marks">
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '17%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>S. NO.</th>
                <th>SUBJECT</th>
                <th>FULL<br />MARKS</th>
                <th>PASS<br />MARKS</th>
                <th>MARKS<br />OBTAINED</th>
                <th>REMARKS</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length > 0 ? subjects.map((sub, idx) => (
                <tr key={sub.subjectId || sub.subjectName || idx}>
                  <td>{idx + 1}</td>
                  <td className="subject-cell">{sub.subjectName || ''}</td>
                  <td>{sub.maxMarks ?? ''}</td>
                  <td>{sub.passMarks ?? ''}</td>
                  <td>{displayMark(sub)}</td>
                  <td>{sub.remarks ? sub.remarks : '—'}</td>
                </tr>
              )) : (
                <tr>
                  <td>1</td>
                  <td className="subject-cell">—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan="2">TOTAL</td>
                <td>{totalMax}</td>
                <td>{totalPass}</td>
                <td>{totalObtained}</td>
                <td>—</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <section className="result-summary" aria-label="Result summary">
          <div className="result-summary-item">
            <span className="result-summary-label">TOTAL PERCENTAGE</span>
            <span className="result-summary-value">{aggregate.percentage ?? ''}{aggregate.percentage !== undefined ? '%' : ''}</span>
          </div>
          <div className="result-summary-item">
            <span className="result-summary-label">GRADE</span>
            <span className="result-summary-value">{aggregate.grade || aggregate.overallGrade || ''}</span>
          </div>
          <div className="result-summary-item">
            <span className="result-summary-label">DIVISION</span>
            <span className="result-summary-value">{aggregate.division || ''}</span>
          </div>
          <div className="result-summary-item">
            <span className="result-summary-label">ANNUAL ATTENDANCE</span>
            <span className="result-summary-value">{attendanceText}</span>
          </div>
        </section>

        <div className="marksheet-remarks">
          <span>REMARKS :</span>
          <span className="marksheet-remarks-line">{teacherRemarks || ''}</span>
        </div>

        <section className="signature-area" aria-label="Authorized signatures">
          <div className="signature-block">
            <div className="signature-space" />
            <div className="signature-line">
              {classTeacherName && (
                <span className="signature-person-name">{classTeacherName}</span>
              )}
              <span className="signature-role">Class Teacher</span>
            </div>
          </div>

          <div className="signature-block">
            <div className="signature-space" />
            <div className="signature-line">
              <span className="signature-director-name">{directorName}</span>
              <span className="signature-role">Director</span>
            </div>
          </div>

          <div className="signature-block">
            <div className="signature-space" />
            <div className="signature-line">
              <span className="signature-person-name">{principalName}</span>
              <span className="signature-role">Principal</span>
            </div>
          </div>
        </section>

        <footer className="marksheet-footer">
          <FooterOrnament />
          <div className="marksheet-website">{website}</div>
          <div className="marksheet-slogan">{slogan}</div>
        </footer>
      </div>
    </div>
  );
});

MarksheetDocument.displayName = 'MarksheetDocument';

export default MarksheetDocument;
