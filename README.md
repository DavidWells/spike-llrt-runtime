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