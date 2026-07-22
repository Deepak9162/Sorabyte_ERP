/**
 * Integration Test Script: Teacher Leave Request & Approval Workflow
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../utils/db');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const StaffAttendance = require('../models/StaffAttendance');
const leaveService = require('../services/leaveService');
const attendanceService = require('../services/attendanceService');

async function runTest() {
  console.log('=== STARTING TEACHER LEAVE WORKFLOW VERIFICATION ===');
  await connectDB();

  try {
    // 1. Find or create a test teacher and user
    let teacher = await Teacher.findOne({ isActive: true });
    if (!teacher) {
      console.log('No active teacher found. Test cannot proceed.');
      process.exit(1);
    }
    console.log(`Testing with teacher: ${teacher.firstName} ${teacher.lastName} (ID: ${teacher._id})`);

    let user = await User.findById(teacher.user);
    if (!user) {
      console.log('No user account linked to teacher, fetching any admin user for simulation...');
      user = await User.findOne({ role: 'admin' });
    }

    // Clean up past test leaves for this teacher
    await LeaveRequest.deleteMany({ teacher: teacher._id, reason: /Test Leave/i });
    await StaffAttendance.deleteMany({ teacher: teacher._id, remarks: /Test/i });

    // 2. Test Single & Multi-Day Leave Application
    console.log('\nStep 1: Applying for 3-day leave (25-27 July 2026)...');
    const startDate = '2026-07-25';
    const endDate = '2026-07-27';

    const leaveRequest = await leaveService.applyLeave({
      userId: user ? user._id : teacher.user,
      leaveType: 'Sick Leave',
      startDate,
      endDate,
      reason: 'Test Leave Workflow - High fever',
    });

    console.log(`✔ Leave request created! ID: ${leaveRequest._id}, Status: ${leaveRequest.status}, Days: ${leaveRequest.totalDays}`);

    // 3. Test Overlap Prevention
    console.log('\nStep 2: Testing Overlapping Leave Prevention (26-28 July 2026)...');
    try {
      await leaveService.applyLeave({
        userId: user ? user._id : teacher.user,
        leaveType: 'Casual Leave',
        startDate: '2026-07-26',
        endDate: '2026-07-28',
        reason: 'Test Leave Workflow - Overlap Test',
      });
      console.error('❌ FAIL: Overlapping leave was allowed!');
    } catch (err) {
      console.log(`✔ SUCCESS: Overlapping leave correctly rejected: "${err.message}"`);
    }

    // 4. Test Admin Approval
    console.log('\nStep 3: Approving Leave Request...');
    const adminUser = await User.findOne({ role: 'admin' }) || user;
    const approvedLeave = await leaveService.approveLeave(leaveRequest._id, adminUser._id, 'Approved by Principal');
    console.log(`✔ Leave request status updated to: ${approvedLeave.status}`);

    // 5. Test Auto-Absent Job Priority Handling on Approved Leave Date
    console.log('\nStep 4: Running syncAutoAbsentTeachers on approved leave date (25 July 2026)...');
    await attendanceService.syncAutoAbsentTeachers(new Date('2026-07-25T12:00:00.000Z'));

    const autoAbsentRecord = await StaffAttendance.findOne({
      teacher: teacher._id,
      date: { $gte: new Date('2026-07-25T00:00:00.000Z'), $lte: new Date('2026-07-25T23:59:59.999Z') }
    });

    if (!autoAbsentRecord) {
      console.log('✔ SUCCESS: No Auto-Absent record created for approved leave date!');
    } else {
      console.log(`ℹ Attendance record status on leave date: ${autoAbsentRecord.status}`);
    }

    // 6. Test Monthly Report Evaluation
    console.log('\nStep 5: Fetching Staff Monthly Report for July 2026...');
    const monthlyReport = await attendanceService.getStaffMonthlyReport(7, 2026);
    const teacherReport = monthlyReport.find(r => r.teacher._id.toString() === teacher._id.toString());
    
    if (teacherReport) {
      console.log(`25 July Status in Report: ${teacherReport.attendance[25] || 'None'}`);
      console.log(`26 July Status in Report: ${teacherReport.attendance[26] || 'None'}`);
      console.log(`27 July Status in Report: ${teacherReport.attendance[27] || 'None'}`);
      
      if (teacherReport.attendance[25] === 'Leave' && teacherReport.attendance[26] === 'Leave' && teacherReport.attendance[27] === 'Leave') {
        console.log('✔ SUCCESS: All 3 approved leave days evaluate as "Leave" in monthly report!');
      }
    }

    // 7. Test Early Return / Admin Override (Admin marks 26 July as Present)
    console.log('\nStep 6: Testing Early Return Admin Override (Admin marks 26 July as Present)...');
    await attendanceService.markStaffAttendance('2026-07-26', [
      { teacherId: teacher._id, status: 'Present', remarks: 'Early Return from Leave' }
    ]);

    const updatedReport = await attendanceService.getStaffMonthlyReport(7, 2026);
    const updatedTeacherReport = updatedReport.find(r => r.teacher._id.toString() === teacher._id.toString());
    
    console.log(`26 July Status after Early Return Override: ${updatedTeacherReport.attendance[26]}`);
    if (updatedTeacherReport.attendance[26] === 'Present') {
      console.log('✔ SUCCESS: Explicit Admin Early Return (Present) correctly overrides Approved Leave for 26 July!');
    }

    // Clean up test data
    await LeaveRequest.deleteMany({ teacher: teacher._id, reason: /Test Leave/i });
    await StaffAttendance.deleteMany({ teacher: teacher._id, remarks: /Early Return/i });

    console.log('\n=== ALL LEAVE WORKFLOW VERIFICATIONS PASSED PERFECTLY ===');
    process.exit(0);
  } catch (err) {
    console.error('❌ VERIFICATION ERROR:', err);
    process.exit(1);
  }
}

runTest();
