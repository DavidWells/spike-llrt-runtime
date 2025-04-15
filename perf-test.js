const https = require('https');
const { performance } = require('perf_hooks');

const YOUR_ID = 'xyz' // Your api gateway id here

const ENDPOINTS = {
  hello: `https://${YOUR_ID}.execute-api.us-west-1.amazonaws.com/hello`,
  goodbye: `https://${YOUR_ID}.execute-api.us-west-1.amazonaws.com/goodbye`
};

const CONCURRENT_REQUESTS = 10;
const TOTAL_REQUESTS = 100;
const WARMUP_REQUESTS = 5;

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const end = performance.now();
        resolve({
          statusCode: res.statusCode,
          duration: end - start,
          data
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function calculateStats(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  const p95 = sorted[Math.floor(times.length * 0.95)];
  const p99 = sorted[Math.floor(times.length * 0.99)];
  
  return {
    min: Math.min(...times),
    max: Math.max(...times),
    avg,
    p95,
    p99,
    total: times.length
  };
}

async function runTest(endpoint, name) {
  console.log(`\nRunning performance test for ${name} endpoint...`);
  
  // Warmup
  console.log('Warming up...');
  for (let i = 0; i < WARMUP_REQUESTS; i++) {
    await makeRequest(endpoint);
  }
  
  // Actual test
  console.log(`Running ${TOTAL_REQUESTS} requests with ${CONCURRENT_REQUESTS} concurrent requests...`);
  const times = [];
  const errors = [];
  
  for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENT_REQUESTS) {
    const batch = Math.min(CONCURRENT_REQUESTS, TOTAL_REQUESTS - i);
    const promises = Array(batch).fill().map(() => 
      makeRequest(endpoint)
        .then(result => times.push(result.duration))
        .catch(err => errors.push(err))
    );
    
    await Promise.all(promises);
    process.stdout.write('.');
  }
  console.log('\n');
  
  const stats = calculateStats(times);
  console.log(`Results for ${name}:`);
  console.log(`Total requests: ${stats.total}`);
  console.log(`Min response time: ${stats.min.toFixed(2)}ms`);
  console.log(`Max response time: ${stats.max.toFixed(2)}ms`);
  console.log(`Average response time: ${stats.avg.toFixed(2)}ms`);
  console.log(`95th percentile: ${stats.p95.toFixed(2)}ms`);
  console.log(`99th percentile: ${stats.p99.toFixed(2)}ms`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`);
  }
}

async function main() {
  console.log('Starting performance tests...');
  console.log('Configuration:');
  console.log(`- Concurrent requests: ${CONCURRENT_REQUESTS}`);
  console.log(`- Total requests per endpoint: ${TOTAL_REQUESTS}`);
  console.log(`- Warmup requests: ${WARMUP_REQUESTS}`);
  
  for (const [name, endpoint] of Object.entries(ENDPOINTS)) {
    await runTest(endpoint, name);
  }
}

main().catch(console.error); 