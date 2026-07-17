/**
 * Verification Script for Class Summary API
 */

const BASE_URL = 'http://localhost:5000/api';

const verifyClassSummary = async () => {
    console.log('--- Starting Class Summary Verification ---');

    try {
        // 1. Login Admin
        console.log('\n[1] Logging in Admin...');
        const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@lfes.com', password: 'password123' })
        });
        const adminLoginData = await adminLogin.json();
        const token = adminLoginData.data?.token;

        if (!token) {
            console.error('Admin login failed.');
            return;
        }
        console.log('Admin logged in.');

        // 2. Get all classes
        console.log('\n[2] Fetching Classes...');
        const classesRes = await fetch(`${BASE_URL}/admin/classes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const classesData = await classesRes.json();
        const classes = classesData.data;

        if (!classes || classes.length === 0) {
            console.error('No classes found to verify.');
            return;
        }

        console.log(`Found ${classes.length} classes.`);

        // 3. Verify summary for each class
        for (const cls of classes) {
            console.log(`\n[3] Verifying Summary for Class: ${cls.name} (${cls._id})...`);
            const summaryRes = await fetch(`${BASE_URL}/admin/classes/${cls._id}/summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const summaryData = await summaryRes.json();
            
            if (summaryData.success) {
                const summary = summaryData.data;
                console.log('Summary Received:');
                console.log(` - Class Name: ${summary.className}`);
                console.log(` - Students: ${summary.studentCount}`);
                console.log(` - Expected: ${summary.totalExpected}`);
                console.log(` - Collected: ${summary.totalCollected}`);
                console.log(` - Pending: ${summary.totalPending}`);
                
                if (summary.studentCount !== cls.students.length) {
                    console.warn(`Warning: Student count mismatch! Summary: ${summary.studentCount}, Class Model: ${cls.students.length}`);
                }
            } else {
                console.error(`Failed to fetch summary for class ${cls.name}:`, summaryData.message);
            }
        }

        console.log('\n--- Verification Completed ---');

    } catch (error) {
        console.error('Verification failed:', error.message);
    }
};

verifyClassSummary();
