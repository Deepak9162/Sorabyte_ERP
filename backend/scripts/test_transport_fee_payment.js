const axios = require('axios');
const path = require('path');
const fs = require('fs');

const run = async () => {
  try {
    const classId = '6a2312314a07ad2f4507e84b'; // Class 6
    const rollNumber = '1'; // Vivek Kumari
    
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
    
    console.log("Student details before payment:", {
      fullName: student.fullName,
      transportMode: student.transportMode
    });

    if (student.transportMode !== 'School Bus') {
      console.error("Test requires a student with transportMode 'School Bus'.");
      process.exit(1);
    }

    // Find outstanding/unpaid months
    const unpaidMonths = ledgerBefore.monthlyBreakdown
      .filter(m => m.status !== "PAID" && m.status !== "EXEMPTED")
      .map(m => m.month);

    console.log("Unpaid months before test:", unpaidMonths);
    if (unpaidMonths.length < 2) {
      console.log("Not enough unpaid months to perform multi-month test. Please reset database or use another student.");
      process.exit(1);
    }

    // Select the first two unpaid months (June and July if April and May were paid)
    const targetMonths = [unpaidMonths[0], unpaidMonths[1]];
    const month1Info = ledgerBefore.monthlyBreakdown.find(m => m.month === targetMonths[0]);
    const month2Info = ledgerBefore.monthlyBreakdown.find(m => m.month === targetMonths[1]);

    // Tuition pending is month1Info.pending + month2Info.pending = 2000
    // Transport pending is month1Info.transportPending + month2Info.transportPending = 1000
    const tuitionPending = month1Info.pending + month2Info.pending;
    const transportPending = month1Info.transportPending + month2Info.transportPending;
    const totalPending = tuitionPending + transportPending;

    console.log(`Selected months: ${targetMonths.join(', ')}`);
    console.log(`Tuition Pending: ${tuitionPending}, Transport Pending: ${transportPending}. Total Payment: ${totalPending}`);

    // 3. Record multi-month payment including Transport Fee
    const payUrl = 'http://localhost:5000/api/fees/pay';
    console.log(`Recording payment at ${payUrl} with includeTransport: true...`);
    const payRes = await axios.post(payUrl, {
      studentId: student.id,
      amount: totalPending,
      type: "Tuition",
      paymentMode: "CASH",
      month: targetMonths,
      includeTransport: true, // INCLUDE TRANSPORT
      academicYear: "2025-2026",
      transactionId: "TXN-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
      remarks: `Test multi-month payment for ${targetMonths.join(', ')} (Includes Transport)`
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Payment response status:", payRes.status);
    const transaction = payRes.data.data.transaction;
    console.log("Stored Transaction details:", {
      id: transaction._id,
      month: transaction.month,
      amount: transaction.amount,
      transportAmount: transaction.transportAmount
    });

    // 4. Fetch details again to verify updates
    console.log("Re-fetching student details to verify updates...");
    const detailsRes2 = await axios.get(detailsUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const ledgerAfter = detailsRes2.data.data.ledger;
    const m1After = ledgerAfter.monthlyBreakdown.find(m => m.month === targetMonths[0]);
    const m2After = ledgerAfter.monthlyBreakdown.find(m => m.month === targetMonths[1]);
    
    console.log(`Ledger status of ${targetMonths[0]} after payment:`, {
      month: m1After.month,
      status: m1After.status,
      paidAmount: m1After.paidAmount,
      transportStatus: m1After.transportStatus,
      transportPaidAmount: m1After.transportPaidAmount
    });

    console.log(`Ledger status of ${targetMonths[1]} after payment:`, {
      month: m2After.month,
      status: m2After.status,
      paidAmount: m2After.paidAmount,
      transportStatus: m2After.transportStatus,
      transportPaidAmount: m2After.transportPaidAmount
    });

    // 5. Download / Verify Receipt PDF
    console.log("Verifying PDF receipt download endpoint...");
    const receiptRes = await axios.get(`http://localhost:5000/api/fees/receipt/${transaction._id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      responseType: 'arraybuffer'
    });

    console.log("Receipt PDF response status:", receiptRes.status);
    console.log("Receipt PDF size:", receiptRes.data.length, "bytes");

    const pass = 
      m1After.status === "PAID" && 
      m1After.transportStatus === "PAID" &&
      m2After.status === "PAID" && 
      m2After.transportStatus === "PAID" &&
      transaction.transportAmount === transportPending;

    if (pass) {
      console.log("SUCCESS: Both selected months have been successfully marked as PAID for BOTH Tuition and Transport, and transaction records are perfect!");
      process.exit(0);
    } else {
      console.error("FAILURE: Ledger or transaction update validation failed.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Transport Payment Test failed:", error.response ? error.response.data : error.message);
    process.exit(1);
  }
};

run();
