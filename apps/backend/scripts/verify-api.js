const http = require('http');

async function testEndpoint(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runAudit() {
  console.log('=== STARTING EMPIRICAL API VERIFICATION AUDIT ===\n');

  // 1. Dynamics Health API
  console.log('--- 1. Testing GET /api/intelligence/dynamics/health ---');
  try {
    const res1 = await testEndpoint('GET', '/api/intelligence/dynamics/health?organizationId=00000000-0000-0000-0000-000000000001');
    console.log('STATUS:', res1.status);
    console.log('SUCCESS:', res1.data?.success);
    console.log('OVERALL HEALTH SCORE:', res1.data?.data?.healthReport?.overallHealthScore);
    console.log('VIOLATED LAWS:', res1.data?.data?.violatedLaws?.map(l => l.identifier));
  } catch (err) {
    console.error('FAILED:', err.message);
  }

  // 2. Decision Simulation API
  console.log('\n--- 2. Testing POST /api/intelligence/simulation/run ---');
  try {
    const res2 = await testEndpoint('POST', '/api/intelligence/simulation/run', {
      organizationId: '00000000-0000-0000-0000-000000000001',
      decisionType: 'HIRING',
      value: 2,
      description: 'Hire 2 Senior Engineers',
    });
    console.log('STATUS:', res2.status);
    console.log('FULL RESPONSE:', JSON.stringify(res2.data || res2.raw, null, 2));
  } catch (err) {
    console.error('FAILED:', err.message);
  }

  // 3. Insights API
  console.log('\n--- 3. Testing GET /api/intelligence/insights ---');
  try {
    const res3 = await testEndpoint('GET', '/api/intelligence/insights?organizationId=00000000-0000-0000-0000-000000000001');
    console.log('STATUS:', res3.status);
    console.log('FULL RESPONSE:', JSON.stringify(res3.data || res3.raw, null, 2));
  } catch (err) {
    console.error('FAILED:', err.message);
  }

  console.log('\n=== AUDIT COMPLETE ===');
}

runAudit();
