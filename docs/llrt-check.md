# LLRT Compatibility Checker

The `llrt-check` utility helps you verify if your JavaScript code will run properly in AWS Lambda Low Latency Runtime (LLRT) before deployment.

## Installation

```bash
npm install
```

This will make the `llrt-check` command available in your project.

## Usage

### Basic Usage

```bash
# Check a specific file
llrt-check ./src/hello.js

# Or use npm script
npm run check:hello
```

### Available Commands

```bash
# Check individual functions
npm run check:hello      # Check src/hello.js
npm run check:goodbye    # Check src/goodbye.js

# Run all tests
npm test
```

## How It Works

The checker performs two types of analysis:

### 1. Static Analysis
- Analyzes your code for module imports and requires
- Checks against the LLRT compatibility matrix
- Identifies potential compatibility issues
- Provides warnings for partially supported features

### 2. Runtime Testing
- Downloads the appropriate LLRT binary for your platform
- Executes your code in both Node.js and LLRT environments
- Compares outputs and performance
- Reports any runtime differences or errors

## Output Explanation

### Compatibility Indicators
- ✅ **Compatible**: Your code should work in LLRT
- ❌ **Issues Found**: Your code uses unsupported features
- ⚠️ **Warnings**: Your code uses partially supported features

### Performance Comparison
- 🚀 **LLRT Faster**: Shows performance improvement with LLRT
- 🐌 **Node.js Faster**: Shows performance regression with LLRT
- ⚖️ **Similar Performance**: No significant difference

## Common Issues

### Unsupported Modules
- `fs` (synchronous) - Use `fs/promises` instead
- `http`/`https` - Use `fetch` instead
- `tls` - Not supported

### Partially Supported Features
- `child_process` - Limited functionality
- `streams` - Not native implementation
- Various Node.js built-ins may have different behavior

### Best Practices
1. Use ES modules (`import`/`export`) when possible
2. Prefer `fs/promises` over synchronous `fs` operations
3. Use `fetch` instead of `http`/`https` modules
4. Avoid Node.js-specific globals like `__dirname` when possible
5. Handle errors gracefully as LLRT may behave differently

## Examples

### Compatible Code
```javascript
// ✅ This works well in LLRT
import crypto from 'crypto'

export async function handler(event) {
  const id = crypto.randomUUID()
  return {
    statusCode: 200,
    body: JSON.stringify({ id, timestamp: new Date().toISOString() })
  }
}
```

### Potentially Problematic Code
```javascript
// ⚠️ This may have issues in LLRT
const fs = require('fs') // Synchronous fs not fully supported
const http = require('http') // Use fetch instead

function handler(event) {
  const data = fs.readFileSync('config.json') // Problematic
  // ... rest of function
}
```

## Troubleshooting

### Binary Download Issues
If the LLRT binary fails to download:
1. Check your internet connection
2. Verify you're on a supported platform (Linux, macOS, Windows)
3. Try running the setup script: `npm run setup`

### Permission Issues
If you get permission errors:
```bash
chmod +x .llrt/llrt  # On Unix systems
```

### Platform Support
The checker supports:
- Linux (x64, ARM64)
- macOS (x64, ARM64) 
- Windows (x64, ARM64)

## Contributing

To add new compatibility checks or improve the tool:
1. Update the compatibility matrix in `llrt-compatibility.json`
2. Add new analysis rules in `bin/llrt-check.js`
3. Test with sample functions in the `src/` directory