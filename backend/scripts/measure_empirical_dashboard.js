const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const StaffAttendance = require('../models/StaffAttendance');
const FeeTransaction = require('../models/FeeTransaction');
const FeeLedger = require('../models/FeeLedger');
const Holiday = require('../models/Holiday');
const LeaveRequest = require('../models/LeaveRequest');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/little_flower_school_erp';

async function httpRequest(urlPath, method = 'GET', postData = null, token = null) {
  return new Promise((resolve, reject) => {
    const fullPath = urlPath.startsWith('/api') ? urlPath : `/api${urlPath}`;
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: fullPath,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const startTime = performance.now();
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const endTime = performance.now();
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) {}
        resolve({
          status: res.statusCode,
          durationMs: +(endTime - startTime).toFixed(2),
          payloadSizeBytes: Buffer.byteLength(data),
          data: parsed
        });
      });
    });

    req.on('error', (e) => reject(e));
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

function parseExplain(explainResult) {
  const stats = explainResult.executionStats || {};
  const winningPlan = explainResult.queryPlanner?.winningPlan || {};
  
  let stages = [];
  function extractStages(plan) {
    if (!plan) return;
    if (plan.stage) stages.push(plan.stage);
    if (plan.inputStage) extractStages(plan.inputStage);
    if (plan.inputStages) plan.inputStages.forEach(extractStages);
  }
  extractStages(winningPlan);

  const isCollScan = stages.includes('COLLSCAN');
  const indexUsed = winningPlan.inputStage?.indexName || winningPlan.indexName || (isCollScan ? 'NONE (COLLSCAN)' : stages.join(' -> '));

  return {
    executionTimeMillis: stats.executionTimeMillis,
    nReturned: stats.nReturned,
    totalKeysExamined: stats.totalKeysExamined,
    totalDocsExamined: stats.totalDocsExamined,
    isCollectionScan: isCollScan,
    indexUsed: indexUsed,
    winningStage: winningPlan.stage || 'UNKNOWN'
  };
}

async function runEmpiricalBenchmark() {
  console.log('=== STARTING EMPIRICAL DASHBOARD PERFORMANCE MEASUREMENTS ===\n');
  await mongoose.connect(MONGO_URI);
  console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);

  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) adminUser = await User.findOne({});
  
  const jwt = require('jsonwebtoken');
  const adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET || 'little_flower_school_erp_super_secret_key_change_in_production_2026', { expiresIn: '1d' });
  console.log(`🔑 Generated benchmark JWT token for admin: ${adminUser.email}`);

  const teacherUser = await User.findOne({ role: 'teacher' });
  const teacherToken = teacherUser 
    ? jwt.sign({ id: teacherUser._id }, process.env.JWT_SECRET || 'little_flower_school_erp_super_secret_key_change_in_production_2026', { expiresIn: '1d' })
    : adminToken;

  console.log('\n--- 📊 1. MONGO QUERY EXPLAIN STATS (DIRECT DB BENCHMARK) ---');

  // Query 1: Student.find({ status: 'Active' })
  const t0 = performance.now();
  const q1Docs = await Student.find({ status: 'Active' }).populate('class');
  const t1 = performance.now();
  const q1Explain = await Student.find({ status: 'Active' }).explain('executionStats');
  const q1Stats = parseExplain(q1Explain);

  console.log('\n[Query 1] Student.find({ status: "Active" }).populate("class"):');
  console.log(`   - JS Execution Time: ${(t1 - t0).toFixed(2)} ms`);
  console.log(`   - Mongo Query Execution Time: ${q1Stats.executionTimeMillis} ms`);
  console.log(`   - Documents Returned: ${q1Stats.nReturned}`);
  console.log(`   - Docs Examined: ${q1Stats.totalDocsExamined}`);
  console.log(`   - Keys Examined: ${q1Stats.totalKeysExamined}`);
  console.log(`   - Collection Scan: ${q1Stats.isCollectionScan ? 'YES 🚨' : 'NO'}`);
  console.log(`   - Index Used: ${q1Stats.indexUsed}`);

  // Query 2: FeeLedger.find({ academicYear: '2026-2027' })
  const t2 = performance.now();
  const q2Docs = await FeeLedger.find({ academicYear: '2026-2027' });
  const t3 = performance.now();
  const q2Explain = await FeeLedger.find({ academicYear: '2026-2027' }).explain('executionStats');
  const q2Stats = parseExplain(q2Explain);

  console.log('\n[Query 2] FeeLedger.find({ academicYear: "2026-2027" }):');
  console.log(`   - JS Execution Time: ${(t3 - t2).toFixed(2)} ms`);
  console.log(`   - Mongo Query Execution Time: ${q2Stats.executionTimeMillis} ms`);
  console.log(`   - Documents Returned: ${q2Stats.nReturned}`);
  console.log(`   - Docs Examined: ${q2Stats.totalDocsExamined}`);
  console.log(`   - Keys Examined: ${q2Stats.totalKeysExamined}`);
  console.log(`   - Collection Scan: ${q2Stats.isCollectionScan ? 'YES 🚨' : 'NO'}`);
  console.log(`   - Index Used: ${q2Stats.indexUsed}`);

  // Query 3: FeeTransaction Aggregate
  const t4 = performance.now();
  const q3Docs = await FeeTransaction.aggregate([
    { $match: { status: 'Paid' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const t5 = performance.now();
  const q3Explain = await FeeTransaction.aggregate([
    { $match: { status: 'Paid' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]).explain('executionStats');
  const q3Stats = parseExplain(q3Explain);

  console.log('\n[Query 3] FeeTransaction Total Collection Aggregate:');
  console.log(`   - JS Execution Time: ${(t5 - t4).toFixed(2)} ms`);
  console.log(`   - Mongo Query Execution Time: ${q3Stats.executionTimeMillis} ms`);
  console.log(`   - Documents Returned: ${q3Stats.nReturned}`);
  console.log(`   - Docs Examined: ${q3Stats.totalDocsExamined}`);
  console.log(`   - Keys Examined: ${q3Stats.totalKeysExamined}`);
  console.log(`   - Collection Scan: ${q3Stats.isCollectionScan ? 'YES 🚨' : 'NO'}`);
  console.log(`   - Index Used: ${q3Stats.indexUsed}`);

  // Query 4: User.findById(id) in protect middleware
  const t6 = performance.now();
  const userDoc = await User.findById(adminUser._id);
  const t7 = performance.now();
  const q4Explain = await User.find({ _id: adminUser._id }).explain('executionStats');
  const q4Stats = parseExplain(q4Explain);

  console.log('\n[Query 4] User.findById(id) (Auth Middleware):');
  console.log(`   - JS Execution Time: ${(t7 - t6).toFixed(2)} ms`);
  console.log(`   - Mongo Query Execution Time: ${q4Stats.executionTimeMillis} ms`);
  console.log(`   - Documents Returned: ${q4Stats.nReturned}`);
  console.log(`   - Docs Examined: ${q4Stats.totalDocsExamined}`);
  console.log(`   - Keys Examined: ${q4Stats.totalKeysExamined}`);
  console.log(`   - Collection Scan: ${q4Stats.isCollectionScan ? 'YES 🚨' : 'NO'}`);
  console.log(`   - Index Used: ${q4Stats.indexUsed}`);

  // Query 5: Attendance Aggregate today
  const today = new Date();
  today.setHours(0,0,0,0);
  const endDay = new Date();
  endDay.setHours(23,59,59,999);

  const t8 = performance.now();
  const q5Explain = await Attendance.aggregate([
    { $match: { date: { $gte: today, $lte: endDay } } },
    { $sort: { updatedAt: -1 } },
    { $group: { _id: '$student', status: { $first: '$status' }, student: { $first: '$student' } } }
  ]).explain('executionStats');
  const t9 = performance.now();
  const q5Stats = parseExplain(q5Explain);

  console.log('\n[Query 5] Attendance Aggregate Today:');
  console.log(`   - JS Execution Time: ${(t9 - t8).toFixed(2)} ms`);
  console.log(`   - Mongo Query Execution Time: ${q5Stats.executionTimeMillis} ms`);
  console.log(`   - Documents Returned: ${q5Stats.nReturned}`);
  console.log(`   - Docs Examined: ${q5Stats.totalDocsExamined}`);
  console.log(`   - Keys Examined: ${q5Stats.totalKeysExamined}`);
  console.log(`   - Collection Scan: ${q5Stats.isCollectionScan ? 'YES 🚨' : 'NO'}`);
  console.log(`   - Index Used: ${q5Stats.indexUsed}`);

  console.log('\n--- 🚀 2. LIVE HTTP API RESPONSE MEASUREMENTS ---');

  const apisToTest = [
    { name: 'GET /api/admin/stats', path: '/admin/stats?t=' + Date.now(), token: adminToken },
    { name: 'GET /api/admin/attendance-analytics', path: '/admin/attendance-analytics', token: adminToken },
    { name: 'GET /api/holidays/upcoming', path: '/holidays/upcoming', token: adminToken },
    { name: 'GET /api/fees/pending-students', path: '/fees/pending-students', token: adminToken },
    { name: 'GET /api/fees/monthly-summary', path: '/fees/monthly-summary', token: adminToken },
    { name: 'GET /api/teachers/dashboard/stats', path: '/teachers/dashboard/stats', token: teacherToken },
  ];

  for (const apiItem of apisToTest) {
    try {
      const res = await httpRequest(apiItem.path, 'GET', null, apiItem.token);
      console.log(`\n📌 ${apiItem.name}:`);
      console.log(`   - Status Code: ${res.status}`);
      console.log(`   - Measured Response Time: ${res.durationMs} ms`);
      console.log(`   - Response Payload Size: ${(res.payloadSizeBytes / 1024).toFixed(2)} KB (${res.payloadSizeBytes} bytes)`);
      console.log(`   - Success Status: ${res.data?.success ? 'TRUE' : 'FALSE'}`);
    } catch (err) {
      console.log(`❌ Error testing ${apiItem.name}: ${err.message}`);
    }
  }

  // Measure 5 Parallel Requests (Simulating Frontend Dashboard Mount)
  console.log('\n--- ⚡ 3. SIMULATED PARALLEL DASHBOARD MOUNT (5 APIS CONCURRENTLY) ---');
  const parallelStart = performance.now();
  const results = await Promise.all([
    httpRequest('/admin/stats?t=' + Date.now(), 'GET', null, adminToken),
    httpRequest('/admin/attendance-analytics', 'GET', null, adminToken),
    httpRequest('/holidays/upcoming', 'GET', null, adminToken),
    httpRequest('/fees/pending-students', 'GET', null, adminToken),
    httpRequest('/fees/monthly-summary', 'GET', null, adminToken),
  ]);
  const parallelEnd = performance.now();
  const totalParallelTime = +(parallelEnd - parallelStart).toFixed(2);
  const totalPayloadBytes = results.reduce((acc, r) => acc + r.payloadSizeBytes, 0);

  console.log(`\n🏁 Total Concurrent Load Time (5 APIs): ${totalParallelTime} ms`);
  console.log(`📦 Combined Network Payload: ${(totalPayloadBytes / 1024).toFixed(2)} KB (${totalPayloadBytes} bytes)`);
  console.log(`🔒 Total DB User Lookups in protect middleware across 5 requests: 5 lookups`);

  console.log('\n=== EMPIRICAL BENCHMARK COMPLETED ===');
  await mongoose.disconnect();
}

runEmpiricalBenchmark().catch(err => {
  console.error('Benchmark Error:', err);
  process.exit(1);
});
