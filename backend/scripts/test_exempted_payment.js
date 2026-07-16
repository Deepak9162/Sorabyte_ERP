const axios = require('axios');

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

    // 2. Fetch student details before payment
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
      rollNumber: student.rollNumber
    });

    const aprilBefore = ledgerBefore.monthlyBreakdown.find(m => m.month === 'April');
    const mayBefore = ledgerBefore.monthlyBreakdown.find(m => m.month === 'May');

    console.log("April status before payment:", aprilBefore);
    console.log("May status before payment:", mayBefore);

    if (aprilBefore.status !== 'EXEMPTED' || mayBefore.status !== 'EXEMPTED') {
      console.error("Test requires a student with exempted months.");
      process.exit(1);
    }

    // 3. Record payment for April and May (which are exempted)
    const payUrl = 'http://localhost:5000/api/fees/pay';
    console.log(`Recording payment of 1000 for April and May...`);
    const payRes = await axios.post(payUrl, {
      studentId: student.id,
      amount: 1000,
      type: "Tuition",
      paymentMode: "CASH",
      month: ['April', 'May'],
      includeTransport: true,
      academicYear: "2024-2025",
      transactionId: "TXN-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
      remarks: `Test payment for exempted months`
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Payment response status:", payRes.status);

    // 4. Fetch details again to verify no allocations were made
    console.log("\nRe-fetching student details to verify updates...");
    const detailsRes2 = await axios.get(detailsUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const ledgerAfter = detailsRes2.data.data.ledger;
    const aprilAfter = ledgerAfter.monthlyBreakdown.find(m => m.month === 'April');
    const mayAfter = ledgerAfter.monthlyBreakdown.find(m => m.month === 'May');

    console.log("April status after payment:", aprilAfter);
    console.log("May status after payment:", mayAfter);

    // Verify conditions:
    // 1. April and May must STILL be EXEMPTED with 0 paidAmount.
    const cond1 = aprilAfter.status === 'EXEMPTED' && aprilAfter.paidAmount === 0;
    const cond2 = mayAfter.status === 'EXEMPTED' && mayAfter.paidAmount === 0;

    if (cond1 && cond2) {
      console.log("\nSUCCESS: Payments to exempted months are safely ignored and preserved as EXEMPTED!");
      process.exit(0);
    } else {
      console.error("\nFAILURE: Exempted months were modified during payment.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Exempted payment test failed:", error.response ? error.response.data : error.message);
    process.exit(1);
  }
};

run();
