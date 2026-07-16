const mongoose = require('mongoose');
const axios = require('axios');
const Student = require('../models/Student');

const run = async () => {
  try {
    const classId = '6a2312314a07ad2f4507e84b'; // Class 6
    const rollNumber = '2'; // Pooja Kumar
    
    // 1. Login
    const loginUrl = 'http://localhost:5000/api/auth/login';
    console.log(`Logging in at ${loginUrl}...`);
    const loginRes = await axios.post(loginUrl, {
      email: 'admin@lfes.com',
      password: 'password123'
    });

    const token = loginRes.data.data.token;
    console.log("Logged in successfully. Token obtained.");

    // 2. Fetch student details before change
    const detailsUrl = `http://localhost:5000/api/fees/${classId}/${rollNumber}`;
    console.log(`Fetching student details from ${detailsUrl}...`);
    const detailsRes = await axios.get(detailsUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const student = detailsRes.data.data.student;
    const ledgerBefore = detailsRes.data.data.ledger;
    
    console.log("Student details before date edit:", {
      fullName: student.fullName,
      rollNumber: student.rollNumber
    });

    const aprilBefore = ledgerBefore.monthlyBreakdown.find(m => m.month === 'April');
    const juneBefore = ledgerBefore.monthlyBreakdown.find(m => m.month === 'June');

    console.log("April status before edit (expected EXEMPTED):", aprilBefore);
    console.log("June status before edit (expected EXEMPTED):", juneBefore);

    if (aprilBefore.status !== 'EXEMPTED' || juneBefore.status !== 'EXEMPTED') {
      console.error("Test requires student months to be exempted initially.");
      process.exit(1);
    }

    // 3. Directly update Pooja Kumar's admission date to 2026-01-01 in DB
    console.log("\nSimulating profile edit: Setting Pooja Kumar's admissionDate to 2026-01-01 in DB...");
    await Student.findByIdAndUpdate(student.id, { admissionDate: new Date('2026-01-01') });

    // 4. Fetch details again to verify synchronization
    console.log("Re-fetching student details to trigger ledger sync...");
    const detailsRes2 = await axios.get(detailsUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const ledgerAfter = detailsRes2.data.data.ledger;
    const aprilAfter = ledgerAfter.monthlyBreakdown.find(m => m.month === 'April');
    const juneAfter = ledgerAfter.monthlyBreakdown.find(m => m.month === 'June');

    console.log("April status after edit (expected UNPAID / amount 1000):", aprilAfter);
    console.log("June status after edit (expected UNPAID / amount 1000):", juneAfter);

    // Restore Pooja Kumar's admission date back to 2026-07-15
    console.log("Restoring Pooja Kumar's admissionDate back to 2026-07-15 in DB...");
    await Student.findByIdAndUpdate(student.id, { admissionDate: new Date('2026-07-15') });

    // Verify conditions:
    // April and June must now be UNPAID with 1000 base fee.
    const cond1 = aprilAfter.status === 'UNPAID' && aprilAfter.amount === 1000;
    const cond2 = juneAfter.status === 'UNPAID' && juneAfter.amount === 1000;

    if (cond1 && cond2) {
      console.log("\nSUCCESS: Ledger self-healing synchronization verified successfully!");
      process.exit(0);
    } else {
      console.error("\nFAILURE: Ledger failed to synchronize with updated admission date.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Ledger sync test failed:", error.response ? error.response.data : error.message);
    process.exit(1);
  }
};

// We connect to DB first since we modify model directly in test
const dotenv = require('dotenv');
dotenv.config();
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/little_flower_school_erp')
  .then(() => run())
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
