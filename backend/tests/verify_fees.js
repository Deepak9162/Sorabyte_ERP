/**
 * Verification Script for Fee Management System
 */

const fs = require('fs');
const path = require('path');
const LOG_FILE = path.join(__dirname, 'fee_test_results.log');

const log = (...args) => {
    const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
};

const BASE_URL = 'http://localhost:5000/api';

if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);

const testFees = async () => {
    log('--- Starting Fee Management Verification ---');

    try {
        // 1. Login Admin
        log('\n[1] Logging in Admin...');
        const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@lfes.com', password: 'password123' })
        });
        const adminLoginData = await adminLogin.json();
        const token = adminLoginData.data?.token;

        if (!token) {
            log('Admin login failed.');
            return;
        }
        log('Admin logged in.');

        // 2. Setup: Get a class and set its tuitionFee
        log('\n[2] Setting Class Tuition Fee...');
        const classesRes = await fetch(`${BASE_URL}/admin/classes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const classesData = await classesRes.json();
        const targetClass = classesData.data?.[0];

        if (!targetClass) {
            log('No class found to setup.');
            return;
        }

        // Ideally, we'd have a PUT /api/admin/classes/:id to update the fee
        // Since I've only implemented create APIs for admin, I'll assume 
        // the class "10-A" already has a fee or I'll just use what's there.
        // Let's create a NEW class with a fee for clean testing.
        const newClassRes = await fetch(`${BASE_URL}/admin/classes`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'FEE-TEST-CLASS',
                teacher: '65e1234567890abcdef12345',
                tuitionFee: 50000
            })
        });
        const newClassData = await newClassRes.json();
        const classId = newClassData.data?._id;
        log(`Created Test Class: ${classId} with Fee: 50000`);

        // 3. Create a student in this class
        log('\n[3] Creating Test Student...');
        const studentRes = await fetch(`${BASE_URL}/admin/students`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                firstName: 'Fee',
                lastName: 'Student',
                email: 'fee.student@example.com',
                grade: 'Test',
                rollNumber: 'F101',
                parentName: 'Parent F',
                parentPhone: '1122334455',
                class: classId
            })
        });
        const studentData = await studentRes.json();
        const studentId = studentData.data?._id;
        log(`Created Student: ${studentId}`);

        // 4. Fetch Initial Fee Details
        log('\n[4] Initial Fee Check...');
        const initialDetailsRes = await fetch(`${BASE_URL}/fees/${classId}/F101`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const initialDetails = await initialDetailsRes.json();
        log('Initial Summary:', initialDetails.data?.feeSummary);

        // 5. Record Partial Payment
        log('\n[5] Recording Partial Payment (15,000)...');
        const payRes = await fetch(`${BASE_URL}/fees/pay`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                studentId,
                amount: 15000,
                type: 'Tuition',
                transactionId: 'TXN-001',
                remarks: 'Partial Payment 1'
            })
        });
        log('Payment 1 Status:', payRes.status);

        // 6. Record Second Partial Payment
        log('\n[6] Recording Second Partial Payment (10,000)...');
        await fetch(`${BASE_URL}/fees/pay`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                studentId,
                amount: 10000,
                type: 'Tuition',
                transactionId: 'TXN-002',
                remarks: 'Partial Payment 2'
            })
        });

        // 7. Verify Final Summary
        log('\n[7] Verifying Final Fee Summary...');
        const finalDetailsRes = await fetch(`${BASE_URL}/fees/${classId}/F101`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const finalDetails = await finalDetailsRes.json();
        log('Final Summary:', finalDetails.data?.feeSummary);
        log('Total Transactions:', finalDetails.data?.transactions?.length);

    } catch (error) {
        log('Test failed:', error.message);
    }
};

testFees();
