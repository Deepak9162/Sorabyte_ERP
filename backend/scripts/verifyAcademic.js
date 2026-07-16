const http = require('http');

const login = () => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: 'admin@lfes.com', password: 'password123' });
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      },
      res => {
        let body = '';
        res.on('data', d => { body += d; });
        res.on('end', () => resolve(JSON.parse(body)));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

const makeRequest = (token, method, path, data = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: { 
        'Authorization': `Bearer ${token}` 
      }
    };

    if (data) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = http.request(options, res => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => resolve(JSON.parse(body)));
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
};

const run = async () => {
  try {
    const loginData = await login();
    const token = loginData.data.token;
    console.log('Login successful');

    // 1. Create a Subject
    console.log('\n--- Creating Subject ---');
    const newSubjectReq = await makeRequest(token, 'POST', '/api/admin/academic/subjects', {
      name: 'Advanced Physics',
      description: 'Quantum and Relativity',
      type: 'Theoretical'
    });
    console.log(newSubjectReq);
    let subjectId;
    if (!newSubjectReq.success) {
      if (newSubjectReq.message.includes('already exists')) {
        console.log('Subject already exists, fetching it instead...');
        const subjects = await makeRequest(token, 'GET', '/api/admin/academic/subjects');
        const existing = subjects.data.find(s => s.name === 'Advanced Physics');
        subjectId = existing._id;
      } else {
        return console.error('Failed to create subject:', newSubjectReq);
      }
    } else {
      subjectId = newSubjectReq.data._id;
    }

    // 2. Get All Subjects
    console.log('\n--- Fetching Subjects ---');
    const subjects = await makeRequest(token, 'GET', '/api/admin/academic/subjects');
    console.log(`Found ${subjects.data.length} subjects`);

    // 3. Assign Subject to Class
    // First need a class and teacher ID. Assuming we fetch all classes first.
    const classes = await makeRequest(token, 'GET', '/api/admin/classes');
    console.log('Classes Response:', classes.success);
    if (!classes.data || !Array.isArray(classes.data) || classes.data.length === 0) {
      console.log('No classes found or malformed data:', classes);
      return;
    }
    
    // Fetch teachers (we need one)
    const teachersRes = await makeRequest(token, 'GET', '/api/teachers');
    console.log('Teachers Response:', teachersRes.success);
    const teacherList = teachersRes.data.teachers || teachersRes.data;
    if (!teacherList || !Array.isArray(teacherList) || teacherList.length === 0) {
       console.log('No teachers found or malformed data:', teachersRes);
       return;
    }

    const classId = classes.data[0]._id;
    const teacherId = teacherList[0]._id;

    console.log('\n--- Creating Subject Mapping ---');
    const mappingReq = await makeRequest(token, 'POST', `/api/admin/academic/classes/${classId}/subjects`, {
      subjectId,
      teacherId,
      sessionsPerWeek: 5
    });
    console.log(mappingReq);
    
    // 4. Get mappings for the class
    console.log('\n--- Fetching Class Mappings ---');
    const mappings = await makeRequest(token, 'GET', `/api/admin/academic/classes/${classId}/subjects`);
    console.log(mappings);

  } catch(e) {
    if (e.response && e.response.data) {
        console.error("API Error details:", e.response.data);
    } else {
        console.error("Error Message:", e.message);
        console.error("Stack trace:", e.stack);
    }
  }
};
run();
