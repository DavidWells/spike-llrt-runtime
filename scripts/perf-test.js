const https = require('https');
const { performance } = require('perf_hooks');

const YOUR_ID = 'xyz' // Your api gateway id here
const REGION = 'us-west-1'

const ENDPOINTS = {
  hello: `https://${YOUR_ID}.execute-api.${REGION}.amazonaws.com/hello`,
  helloLLRT: `https://${YOUR_ID}.execute-api.${REGION}.amazonaws.com/hello-llrt`,
  goodbye: `https://${YOUR_ID}.execute-api.${REGION}.amazonaws.com/goodbye`,
  goodbyeLLRT: `https://${YOUR_ID}.execute-api.${REGION}.amazonaws.com/goodbye-llrt`,
  test: `https://${YOUR_ID}.execute-api.${REGION}.amazonaws.com/test`,
  testLLRT: `https://${YOUR_ID}.execute-api.${REGION}.amazonaws.com/test-llrt`
};

const CONCURRENT_REQUESTS = 10;
const TOTAL_REQUESTS = 20;
const WARMUP_REQUESTS = 5;

// Store all results for final comparison
const allResults = {};

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

  // Store results for comparison
  allResults[name] = stats;
}

function printComparisonSummary() {
  console.log('\n=== PERFORMANCE COMPARISON SUMMARY ===');
  console.log('Comparing Node.js vs LLRT implementations:\n');

  const comparisons = [
    { node: 'hello', llrt: 'helloLLRT', name: 'Hello' },
    { node: 'goodbye', llrt: 'goodbyeLLRT', name: 'Goodbye' },
    { node: 'test', llrt: 'testLLRT', name: 'Test' }
  ];

  comparisons.forEach(({ node, llrt, name }) => {
    const nodeStats = allResults[node];
    const llrtStats = allResults[llrt];
    const avgImprovement = ((nodeStats.avg - llrtStats.avg) / nodeStats.avg * 100).toFixed(1);
    const minImprovement = ((nodeStats.min - llrtStats.min) / nodeStats.min * 100).toFixed(1);
    const maxImprovement = ((nodeStats.max - llrtStats.max) / nodeStats.max * 100).toFixed(1);

    console.log(`${name} Function:`);
    console.log(`  Average: ${nodeStats.avg.toFixed(2)}ms (Node) vs ${llrtStats.avg.toFixed(2)}ms (LLRT) - ${avgImprovement}% faster`);
    console.log(`  Min: ${nodeStats.min.toFixed(2)}ms (Node) vs ${llrtStats.min.toFixed(2)}ms (LLRT) - ${minImprovement}% faster`);
    console.log(`  Max: ${nodeStats.max.toFixed(2)}ms (Node) vs ${llrtStats.max.toFixed(2)}ms (LLRT) - ${maxImprovement}% faster`);
    console.log();
  });

  // Calculate overall averages
  const nodeEndpoints = comparisons.map(c => c.node);
  const llrtEndpoints = comparisons.map(c => c.llrt);
  
  const nodeAvg = nodeEndpoints.reduce((sum, endpoint) => sum + allResults[endpoint].avg, 0) / nodeEndpoints.length;
  const llrtAvg = llrtEndpoints.reduce((sum, endpoint) => sum + allResults[endpoint].avg, 0) / llrtEndpoints.length;
  const overallImprovement = ((nodeAvg - llrtAvg) / nodeAvg * 100).toFixed(1);

  console.log('=== OVERALL SUMMARY ===');
  console.log(`LLRT is on average ${overallImprovement}% faster than Node.js`);
  console.log(`Average response times: ${nodeAvg.toFixed(2)}ms (Node) vs ${llrtAvg.toFixed(2)}ms (LLRT)`);
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

  printComparisonSummary();
}

main().catch(console.error); 