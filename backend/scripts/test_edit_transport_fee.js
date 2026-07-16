const axios = require('axios');

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
    
    console.log("Student details before change:", {
      fullName: student.fullName,
      transportMode: student.transportMode,
      transportFee: student.transportFee
    });

    // We know April and May were paid at ₹500 rate in previous test.
    // June, July, August, etc. are unpaid at ₹500 rate.
    console.log("April transport status before edit:", ledgerBefore.monthlyBreakdown.find(m => m.month === 'April'));
    console.log("June transport status before edit:", ledgerBefore.monthlyBreakdown.find(m => m.month === 'June'));

    // 3. Edit transport fee to 800
    console.log("\nUpdating transport fee to 800...");
    const editUrl = `http://localhost:5000/api/fees/student/${student.id}/transport-fee`;
    const editRes = await axios.put(editUrl, {
      transportFee: 800,
      academicYear: "2025-2026"
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Update response status:", editRes.status);
    console.log("Update response message:", editRes.data.message);

    // 4. Fetch details again to verify
    console.log("\nRe-fetching student details to verify updates...");
    const detailsRes2 = await axios.get(detailsUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const studentAfter = detailsRes2.data.data.student;
    const ledgerAfter = detailsRes2.data.data.ledger;

    console.log("Student details after edit:", {
      fullName: studentAfter.fullName,
      transportMode: studentAfter.transportMode,
      transportFee: studentAfter.transportFee
    });

    const aprilAfter = ledgerAfter.monthlyBreakdown.find(m => m.month === 'April');
    const juneAfter = ledgerAfter.monthlyBreakdown.find(m => m.month === 'June');

    console.log("April transport status after edit:", aprilAfter);
    console.log("June transport status after edit:", juneAfter);

    const aprilBefore = ledgerBefore.monthlyBreakdown.find(m => m.month === 'April');
    const cond1 = studentAfter.transportFee === 800;
    const cond2 = aprilAfter.transportAmount === aprilBefore.transportAmount;
    const cond3 = juneAfter.transportAmount === 800;

    if (cond1 && cond2 && cond3) {
      console.log("\nSUCCESS: Transport fee update verified. Profiles and ledgers updated, while historical billing rates are perfectly preserved!");
      process.exit(0);
    } else {
      console.error("\nFAILURE: Validation checks failed.");
      console.log({ cond1, cond2, cond3 });
      process.exit(1);
    }
  } catch (error) {
    console.error("Transport fee edit test failed:", error.response ? error.response.data : error.message);
    process.exit(1);
  }
};

run();
