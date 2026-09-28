require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const ExamMarks = require('../models/ExamMarks');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const User = require('../models/User');
const marksheetService = require('../services/marksheetService');
const examService = require('../services/examService');

const prefix='__MARKS_ENTRY_APPLICABILITY_TEST__';
const assert=(c,m)=>{ if(!c) throw new Error('ASSERTION FAILED: '+m); console.log('PASS:',m); };

(async()=>{
  let examId=null;
  try{
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const admin=await User.findOne({role:'admin'}).lean();
    if(!admin) throw new Error('Admin user not found');

    const first=await Student.findOne({status:'Active'}).lean();
    if(!first) throw new Error('Active student not found');
    const students=await Student.find({class:first.class,status:'Active'}).limit(2).lean();
    if(students.length<2) throw new Error('Need 2 active students in same class');
    const [markedStudent, pendingStudent]=students;
    const cls=await Class.findById(first.class).lean();
    const subject=await Subject.findOne().lean();
    if(!subject) throw new Error('Subject not found');

    const exam=await examService.createExam({
      name:prefix,
      examType:'MONTHLY',
      session:'TEST-'+Date.now(),
      classId:cls._id,
      section:markedStudent.section || cls.section || 'A'
    },admin._id);
    examId=exam._id;

    await examService.configureExamSubjects(examId,[{
      subjectId:subject._id,maxMarks:100,passMarks:33,
      applicability:'COMPULSORY',applicableStudents:[]
    }],admin._id);

    await marksheetService.bulkEnterMarks({
      examId,classId:cls._id,subjectId:subject._id,
      marks:[{studentId:markedStudent._id,marksObtained:75,isAbsent:false,remarks:''}]
    },admin._id);

    const markBefore=await ExamMarks.findOne({exam:examId,student:markedStudent._id,subject:subject._id}).lean();
    assert(markBefore && markBefore.marksObtained===75,'Existing numeric mark prepared');

    let warningBlocked=false;
    try{
      await marksheetService.updateStudentSubjectApplicability({
        examId,classId:cls._id,subjectId:subject._id,studentId:markedStudent._id,
        section:markedStudent.section,isApplicable:false
      },admin._id);
    }catch(e){
      warningBlocked=e.statusCode===409 && e.message.includes('75/100');
    }
    assert(warningBlocked,'Applicable -> N/A with saved marks requires explicit confirmation');

    await marksheetService.updateStudentSubjectApplicability({
      examId,classId:cls._id,subjectId:subject._id,studentId:markedStudent._id,
      section:markedStudent.section,isApplicable:false,confirmExistingMarkImpact:true
    },admin._id);

    const markAfterNA=await ExamMarks.findById(markBefore._id).lean();
    assert(markAfterNA && markAfterNA.marksObtained===75 && markAfterNA.isAbsent===false,'Existing mark remains intact after N/A correction');

    const examAfterNA=await Exam.findById(examId).lean();
    const sc=examAfterNA.subjectsConfig[0];
    assert(sc.applicability==='OPTIONAL','Compulsory subject converts into same OPTIONAL architecture when one student becomes N/A');
    assert(!(sc.applicableStudents||[]).map(String).includes(String(markedStudent._id)),'Exam configuration source of truth excludes corrected N/A student');
    assert((sc.applicableStudents||[]).map(String).includes(String(pendingStudent._id)),'Other student remains applicable after conversion');

    const rosterNA=await marksheetService.getClassSubjectRoster({
      examId,classId:cls._id,subjectId:subject._id,section:markedStudent.section
    });
    const rowNA=rosterNA.students.find(x=>String(x.studentId)===String(markedStudent._id));
    assert(rowNA && rowNA.isApplicable===false && rowNA.status==='N/A' && rowNA.isAbsent===false,'Marks Entry roster renders corrected student as N/A, not Absent/Fail');
    assert(rowNA.marksObtained==='','N/A roster does not expose saved mark as zero/entered value');

    const resultNA=await marksheetService.getStudentResult(markedStudent._id,examId);
    const resultSubject=resultNA.subjects.find(x=>String(x.subjectId)===String(subject._id));
    assert(resultSubject && resultSubject.isApplicable===false && resultSubject.status==='N/A','Individual result/marksheet payload uses same N/A source of truth');
    assert(resultNA.aggregate.totalMaxMarks===0,'N/A subject is excluded from student aggregate maximum');

    const monthlyNA=await marksheetService.getMonthlyClassResult(cls._id,examId);
    const monthlyRow=monthlyNA.studentRows.find(x=>String(x.studentId)===String(markedStudent._id));
    const monthlySubject=monthlyRow?.subjectMarks?.find(x=>String(x.subjectId)===String(subject._id));
    assert(monthlySubject?.isApplicable===false && monthlySubject?.status==='N/A','Monthly result uses the same N/A configuration');
    assert(monthlyRow?.summary?.totalMaxMarks===0,'Monthly result excludes N/A subject maximum');

    const bulkData=await marksheetService.getBulkClassMarksheetData(cls._id,examId);
    const bulkRow=bulkData.find(x=>String(x.student?.id || x.student?._id || x.studentId)===String(markedStudent._id));
    const bulkSubject=bulkRow?.subjects?.find(x=>String(x.subjectId)===String(subject._id));
    assert(bulkSubject?.isApplicable===false && bulkSubject?.status==='N/A','Bulk marksheet data uses the same N/A configuration');
    assert(bulkRow?.aggregate?.totalMaxMarks===0,'Bulk marksheet aggregate excludes N/A subject maximum');

    const analytics=await examService.getExamAnalytics({examId,classId:cls._id});
    const subjectAnalytics=analytics.subjectPerformance.find(x=>String(x.subjectId)===String(subject._id));
    const activeClassCount=await Student.countDocuments({class:cls._id,status:'Active'});
    assert(subjectAnalytics && subjectAnalytics.applicableStudents===activeClassCount-1,'Analytics denominator excludes the N/A student');

    const pendingMarkBefore=await ExamMarks.countDocuments({exam:examId,student:pendingStudent._id,subject:subject._id});
    assert(pendingMarkBefore===0,'Second student begins without a marks record');

    await marksheetService.updateStudentSubjectApplicability({
      examId,classId:cls._id,subjectId:subject._id,studentId:pendingStudent._id,
      section:pendingStudent.section,isApplicable:false
    },admin._id);
    assert(await ExamMarks.countDocuments({exam:examId,student:pendingStudent._id,subject:subject._id})===0,'N/A change creates no zero/ABS mark record');

    await marksheetService.updateStudentSubjectApplicability({
      examId,classId:cls._id,subjectId:subject._id,studentId:pendingStudent._id,
      section:pendingStudent.section,isApplicable:true
    },admin._id);
    assert(await ExamMarks.countDocuments({exam:examId,student:pendingStudent._id,subject:subject._id})===0,'N/A -> Applicable creates no automatic zero/ABS');

    const rosterApplicable=await marksheetService.getClassSubjectRoster({
      examId,classId:cls._id,subjectId:subject._id,section:pendingStudent.section
    });
    const pendingRow=rosterApplicable.students.find(x=>String(x.studentId)===String(pendingStudent._id));
    assert(pendingRow && pendingRow.isApplicable===true && pendingRow.isSaved===false && pendingRow.marksObtained==='' && !pendingRow.isAbsent,'N/A -> Applicable returns empty editable Pending state');

    let naBulkBlocked=false;
    try{
      await marksheetService.bulkEnterMarks({
        examId,classId:cls._id,subjectId:subject._id,
        marks:[{studentId:markedStudent._id,marksObtained:0,isAbsent:false,remarks:''}]
      },admin._id);
    }catch(e){
      naBulkBlocked=Array.isArray(e.validationErrors) && e.validationErrors.some(x=>x.includes('N/A'));
    }
    assert(naBulkBlocked,'Bulk marks cannot write marks for N/A student');

    const examDoc=await Exam.findById(examId);
    examDoc.status='Published';
    await examDoc.save();

    let publishedBlocked=false;
    try{
      await marksheetService.updateStudentSubjectApplicability({
        examId,classId:cls._id,subjectId:subject._id,studentId:pendingStudent._id,
        section:pendingStudent.section,isApplicable:false
      },admin._id);
    }catch(e){ publishedBlocked=e.statusCode===403; }
    assert(publishedBlocked,'Published result blocks direct applicability modification');

    const crossClass=await Student.findOne({_id:{$nin:students.map(s=>s._id)},class:{$ne:cls._id},status:'Active'}).lean();
    if(crossClass){
      examDoc.status='Ongoing'; await examDoc.save();
      let crossBlocked=false;
      try{
        await marksheetService.updateStudentSubjectApplicability({
          examId,classId:cls._id,subjectId:subject._id,studentId:crossClass._id,
          isApplicable:false
        },admin._id);
      }catch(e){ crossBlocked=e.statusCode===403; }
      assert(crossBlocked,'Crafted cross-class student ID is rejected');
    }

    console.log('MARKS ENTRY APPLICABILITY SUITE: PASS');
  } finally {
    if(mongoose.connection.readyState===1){
      if(examId){
        await ExamMarks.deleteMany({exam:examId});
        await Exam.deleteOne({_id:examId});
      }
      await mongoose.disconnect();
    }
  }
})().catch(e=>{ console.error(e.stack||e); process.exitCode=1; });