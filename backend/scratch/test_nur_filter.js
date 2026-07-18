const axios = require('axios');

async function test() {
  try {
    const url = 'http://localhost:5000/api/students?page=1&limit=10&className=NUR&isActive=true';
    console.log('Fetching:', url);
    const res = await axios.get(url);
    console.log('Response Status:', res.status);
    console.log('Response data:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error fetching:', err.message);
  }
}

test();
