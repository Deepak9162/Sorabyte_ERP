const axios = require('axios');
const path = require('path');

const run = async () => {
  try {
    const classId = '6a27168aa39697269d629940'; // Class 10 (Ankit Kumari)
    const rollNumber = '1';
    const academicYear = '2026-2027';
    
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
    const detailsUrl = `http://localhost:5000/api/fees/${classId}/${rollNumber}?academicYear=${academicYear}`;
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
      transportMode: student.transportMode,
      transportFee: student.transportFee
    });

    // Find outstanding/unpaid months
    const unpaidMonths = ledgerBefore.monthlyBreakdown
      .filter(m => m.status !== "PAID" && m.status !== "EXEMPTED")
      .map(m => m.month);

    console.log("Unpaid months before test:", unpaidMonths);
    if (unpaidMonths.length < 1) {
      console.log("No unpaid months found.");
      process.exit(1);
    }

    // Select the first unpaid month (September)
    const targetMonths = [unpaidMonths[0]];
    const monthInfo = ledgerBefore.monthlyBreakdown.find(m => m.month === targetMonths[0]);

    const tuitionPending = monthInfo.pending;
    const transportPending = monthInfo.transportPending;
    // We do NOT include transport, so amount paid is only tuitionPending (700)
    const totalPayment = tuitionPending;

    console.log(`Selected month: ${targetMonths[0]}`);
    console.log(`Tuition Pending: ${tuitionPending}, Transport Pending: ${transportPending}. Total Payment (excl. transport): ${totalPayment}`);

    // 3. Record payment EXCLUDING Transport Fee
    const payUrl = 'http://localhost:5000/api/fees/pay';
    console.log(`Recording payment at ${payUrl} with includeTransport: false...`);
    const payRes = await axios.post(payUrl, {
      studentId: student.id,
      amount: totalPayment,
      type: "Tuition",
      paymentMode: "CASH",
      month: targetMonths,
      includeTransport: false, // NO TRANSPORT
      academicYear: academicYear,
      transactionId: "TXN-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
      remarks: `Test payment for ${targetMonths.join(', ')} (Excluding Transport)`
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
    const mAfter = ledgerAfter.monthlyBreakdown.find(m => m.month === targetMonths[0]);
    
    console.log(`Ledger status of ${targetMonths[0]} after payment:`, {
      month: mAfter.month,
      status: mAfter.status,
      paidAmount: mAfter.paidAmount,
      transportStatus: mAfter.transportStatus,
      transportPaidAmount: mAfter.transportPaidAmount
    });

    const pass = 
      mAfter.status === "PAID" && 
      (mAfter.transportStatus === "UNPAID" || mAfter.transportStatus === "UPCOMING") &&
      (!transaction.transportAmount || transaction.transportAmount === 0);

    if (pass) {
      console.log("SUCCESS: Selected month has been successfully marked as PAID for Tuition, but transportStatus remains UNPAID/UPCOMING, and transaction records are perfect!");
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
