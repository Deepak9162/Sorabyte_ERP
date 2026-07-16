const axios = require('axios');

const run = async () => {
  try {
    const classId = '6a2312314a07ad2f4507e84b';
    const rollNumber = '1';
    
    // 1. Login
    const loginUrl = 'http://localhost:5000/api/auth/login';
    console.log(`Logging in at ${loginUrl}...`);
    const loginRes = await axios.post(loginUrl, {
      email: 'admin@lfes.com',
      password: 'password123'
    });

    const token = loginRes.data.data.token;
    console.log("Logged in successfully. Token obtained.");

    // 2. Fetch student details
    const detailsUrl = `http://localhost:5000/api/fees/${classId}/${rollNumber}`;
    console.log(`Fetching student details from ${detailsUrl}...`);
    const detailsRes = await axios.get(detailsUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const student = detailsRes.data.data.student;
    const ledgerBefore = detailsRes.data.data.ledger;
    console.log("Student name:", student.fullName);
    
    // Find outstanding/unpaid months
    const unpaidMonths = ledgerBefore.monthlyBreakdown
      .filter(m => m.status !== "PAID" && m.status !== "EXEMPTED")
      .map(m => m.month);

    console.log("Unpaid months before test:", unpaidMonths);
    if (unpaidMonths.length < 2) {
      console.log("Not enough unpaid months to perform multi-month test. Please reset database or use another student.");
      process.exit(1);
    }

    // Select the first two unpaid months
    const targetMonths = [unpaidMonths[0], unpaidMonths[1]];
    const month1Info = ledgerBefore.monthlyBreakdown.find(m => m.month === targetMonths[0]);
    const month2Info = ledgerBefore.monthlyBreakdown.find(m => m.month === targetMonths[1]);
    const totalPending = month1Info.pending + month2Info.pending;

    console.log(`Selected months for payment: ${targetMonths.join(', ')}`);
    console.log(`Outstanding amounts: ${targetMonths[0]}=${month1Info.pending}, ${targetMonths[1]}=${month2Info.pending}. Total=${totalPending}`);

    // 3. Record multi-month payment
    const payUrl = 'http://localhost:5000/api/fees/pay';
    console.log(`Recording payment at ${payUrl} for ${targetMonths.join(', ')}...`);
    const payRes = await axios.post(payUrl, {
      studentId: student.id,
      amount: totalPending,
      type: "Tuition",
      paymentMode: "CASH",
      month: targetMonths, // Sending array of months
      academicYear: "2026-2027",
      transactionId: "TXN-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
      remarks: `Test multi-month payment for ${targetMonths.join(', ')}`
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Payment response status:", payRes.status);
    console.log("Payment response transaction month field stored:", payRes.data.data.transaction.month);

    // 4. Fetch details again to verify update
    console.log("Re-fetching student details to verify updates...");
    const detailsRes2 = await axios.get(detailsUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const feeSummary = detailsRes2.data.data.feeSummary;
    const ledgerAfter = detailsRes2.data.data.ledger;
    
    console.log("Student fee status after payment:", feeSummary);
    const m1After = ledgerAfter.monthlyBreakdown.find(m => m.month === targetMonths[0]);
    const m2After = ledgerAfter.monthlyBreakdown.find(m => m.month === targetMonths[1]);
    
    console.log(`Status of ${targetMonths[0]} after payment:`, m1After);
    console.log(`Status of ${targetMonths[1]} after payment:`, m2After);

    if (m1After.status === "PAID" && m2After.status === "PAID") {
      console.log("SUCCESS: Both selected months have been successfully marked as PAID!");
      process.exit(0);
    } else {
      console.error("FAILURE: One or more months were not updated to PAID correctly.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Multi-Month Payment Test failed:", error.response ? error.response.data : error.message);
    process.exit(1);
  }
};

run();
