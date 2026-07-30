const http = require('http');

const routes = [
  '/dashboard',
  '/ai-cfo',
  '/decision-lab',
  '/daily-brief',
  '/action-center',
  '/integrations',
];

async function checkRoute(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      resolve({ path, status: res.statusCode });
    }).on('error', (err) => {
      resolve({ path, status: 'ERROR', error: err.message });
    });
  });
}

async function runFrontendAudit() {
  console.log('=== STARTING EMPIRICAL FRONTEND ROUTE VERIFICATION ===\n');
  for (const r of routes) {
    const res = await checkRoute(r);
    console.log(`ROUTE: ${res.path.padEnd(20)} | STATUS: ${res.status}`);
  }
  console.log('\n=== FRONTEND VERIFICATION COMPLETE ===');
}

runFrontendAudit();
