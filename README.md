# LLRT Lambda API Example

This project demonstrates how to build a serverless API using AWS Lambda with [LLRT (Low Latency Runtime)](https://github.com/awslabs/llrt) - a lightweight JavaScript runtime optimized for AWS Lambda.

The function are behind simple HTTP API Gateway endpoints.

## Features

- Fast cold starts with LLRT runtime
- Multiple API endpoints (/hello and /goodbye)
- ARM64 architecture for better performance/cost ratio
- Custom Serverless Framework plugin for deployment validation
- Automated LLRT bootstrap setup

## Prerequisites

- Node.js 18 or later
- AWS CLI configured with appropriate credentials
- Serverless Framework CLI (`npm install -g serverless`)

## Quick Start

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up LLRT bootstrap:
   ```bash
   npm run setup
   ```
4. Deploy to AWS:
   ```bash
   npm run deploy
   ```

## API Endpoints

### Hello Endpoint

- **URL**: GET /hello
- **Query Parameters**: 
  - `name` (optional) - Name to greet
- **Example Response**:
  ```json
  {
    "message": "Hello World from LLRT!",
    "timestamp": "2024-03-14T12:00:00.000Z",
    "path": "/hello",
    "method": "GET"
  }
  ```

### Goodbye Endpoint

- **URL**: GET /goodbye
- **Query Parameters**: 
  - `name` (optional) - Name to bid farewell
- **Example Response**:
  ```json
  {
    "message": "Goodbye World, thanks for using LLRT!",
    "timestamp": "2024-03-14T12:00:00.000Z",
    "path": "/goodbye",
    "method": "GET"
  }
  ```

## Project Structure

```bash
.
├── bootstrap # LLRT runtime
├── node_modules # Node.js dependencies
├── package.json
├── serverless.yml
├── src # Source code
│   ├── hello.js
│   └── goodbye.js
├── scripts # Deployment scripts
│   ├── setup.js
│   └── deploy.js
```

## Deployment

To deploy the service, run:

```bash
npm run deploy
```

## Cleanup

To delete the service, run:

```bash
npm run remove
```

## Notes

- You can deploy LLRT in many ways, see https://github.com/awslabs/llrt?tab=readme-ov-file#configure-lambda-functions-to-use-llrt
- See [Serverless Framework docs](https://www.serverless.com/framework/docs) for more information on how to deploy and manage your service.

## Performance results

You can perf test with `node perf-test.js`

Average response time: 54.05ms. Not too shabby.

```bash
───────────────────────────────
Starting performance tests...
Configuration:
- Concurrent requests: 10
- Total requests per endpoint: 100
- Warmup requests: 5

Running performance test for hello endpoint...
Warming up...
Running 100 requests with 10 concurrent requests...
..........

Results for hello:
Total requests: 100
Min response time: 34.72ms
Max response time: 290.14ms
Average response time: 73.94ms
95th percentile: 210.99ms
99th percentile: 290.14ms

Running performance test for goodbye endpoint...
Warming up...
Running 100 requests with 10 concurrent requests...
..........

Results for goodbye:
Total requests: 100
Min response time: 29.46ms
Max response time: 156.11ms
Average response time: 54.05ms
95th percentile: 116.24ms
99th percentile: 156.11ms
```

Second run. Average response time: 54.05ms

```bash
───────────────────────────────
Starting performance tests...
Configuration:
- Concurrent requests: 10
- Total requests per endpoint: 100
- Warmup requests: 5

Running performance test for hello endpoint...
Warming up...
Running 100 requests with 10 concurrent requests...
..........

Results for hello:
Total requests: 100
Min response time: 32.55ms
Max response time: 278.29ms
Average response time: 70.03ms
95th percentile: 151.55ms
99th percentile: 278.29ms

Running performance test for goodbye endpoint...
Warming up...
Running 100 requests with 10 concurrent requests...
..........

Results for goodbye:
Total requests: 100
Min response time: 31.30ms
Max response time: 278.21ms
Average response time: 44.51ms
95th percentile: 67.78ms
99th percentile: 278.21ms
```
