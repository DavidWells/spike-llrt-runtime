const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const { LambdaRuntimeServer } = require('./lambda-runtime-server')

class LLRTChecker {
  constructor() {
    this.llrtBinary = null
    this.compatibilityData = null
    this.runtimeServer = new LambdaRuntimeServer()
    this.loadCompatibilityData()
  }

  loadCompatibilityData() {
    try {
      const compatPath = path.join(__dirname, 'llrt-compatibility.json')
      this.compatibilityData = JSON.parse(fs.readFileSync(compatPath, 'utf8'))
    } catch (error) {
      console.warn('⚠️  Could not load compatibility data:', error.message)
    }
  }

  async ensureLLRTBinary() {
    if (this.llrtBinary && fs.existsSync(this.llrtBinary)) {
      return this.llrtBinary
    }

    // Use local LLRT build
    const llrtPath = path.join(__dirname, '..', 'llrt-upstream', 'target', 'release', 'llrt')
    if (fs.existsSync(llrtPath)) {
      this.llrtBinary = llrtPath
      return llrtPath
    }

    throw new Error('Local LLRT build not found. Please build LLRT first with `cargo build --release`')
  }

  analyzeCodeCompatibility(filePath) {
    const issues = []
    const warnings = []
    
    try {
      const code = fs.readFileSync(filePath, 'utf8')
      
      // Check for require statements that might not be supported
      const requireMatches = code.match(/require\(['"`]([^'"`]+)['"`]\)/g) || []
      const importMatches = code.match(/from\s+['"`]([^'"`]+)['"`]/g) || []
      
      const modules = [
        ...requireMatches.map(m => m.match(/require\(['"`]([^'"`]+)['"`]\)/)[1]),
        ...importMatches.map(m => m.match(/from\s+['"`]([^'"`]+)['"`]/)[1])
      ]

      if (this.compatibilityData) {
        for (const module of modules) {
          const moduleData = this.compatibilityData.features[module]
          if (moduleData) {
            if (!moduleData.supported) {
              issues.push(`❌ Module '${module}' is not supported in LLRT`)
            } else if (moduleData.partiallySupported && !moduleData.supported) {
              warnings.push(`⚠️  Module '${module}' is only partially supported in LLRT`)
            }
            
            if (moduleData.useFetchInstead) {
              warnings.push(`💡 Consider using fetch instead of '${module}' for better LLRT compatibility`)
            }
          }
        }
      }

      // Check for Node.js specific patterns that might not work in LLRT
      if (code.includes('__dirname') || code.includes('__filename')) {
        warnings.push('⚠️  __dirname and __filename may behave differently in LLRT')
      }

      if (code.includes('process.exit')) {
        warnings.push('⚠️  process.exit() should be avoided in Lambda environments')
      }

    } catch (error) {
      issues.push(`❌ Failed to analyze code: ${error.message}`)
    }

    return { issues, warnings }
  }

  async executeWithRuntime(filePath, runtime = 'node') {
    return new Promise(async (resolve, reject) => {
      const startTime = Date.now()
      let stdout = ''
      let stderr = ''

      // Create a test event that matches API Gateway format
      const testEvent = {
        version: '2.0',
        routeKey: 'GET /hello',
        rawPath: '/hello',
        rawQueryString: 'name=Test',
        queryStringParameters: {
          name: 'Test'
        },
        requestContext: {
          accountId: '123456789012',
          apiId: 'api-id',
          domainName: 'id.execute-api.us-east-1.amazonaws.com',
          domainPrefix: 'id',
          http: {
            method: 'GET',
            path: '/hello',
            protocol: 'HTTP/1.1',
            sourceIp: 'IP',
            userAgent: 'agent'
          },
          requestId: 'id',
          routeKey: 'GET /hello',
          stage: '$default',
          time: '12/Mar/2020:19:03:58 +0000',
          timeEpoch: 1583348638390
        },
        isBase64Encoded: false
      }

      let child
      const wrapperPath = path.join(__dirname, 'lambda-wrapper.js')
      console.log('Wrapper path:', wrapperPath)
      const handlerArg = path.relative(process.cwd(), filePath)
      if (runtime === 'llrt') {
        // Start the Lambda Runtime API server
        await this.runtimeServer.start()
        this.runtimeServer.setInvocationData(testEvent)

        // Use local LLRT binary to run the wrapper
        const llrtBinary = await this.ensureLLRTBinary()
        console.log('Runtime path:', llrtBinary, wrapperPath, handlerArg)
        child = spawn(llrtBinary, [wrapperPath, handlerArg], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { 
            ...process.env,
            NODE_ENV: 'test',
            AWS_LAMBDA_FUNCTION_NAME: 'test-function',
            AWS_LAMBDA_FUNCTION_MEMORY_SIZE: '128',
            AWS_LAMBDA_FUNCTION_VERSION: '$LATEST',
            AWS_LAMBDA_LOG_GROUP_NAME: '/aws/lambda/test-function',
            AWS_LAMBDA_LOG_STREAM_NAME: 'test-stream',
            AWS_LAMBDA_RUNTIME_API: '127.0.0.1:9001'
          }
        })
      } else {
        // Run with Node.js using the wrapper
        console.log('Runtime path: node', wrapperPath, handlerArg)
        child = spawn('node', [wrapperPath, handlerArg], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, NODE_ENV: 'test' }
        })

        // Write the test event to stdin
        child.stdin.write(JSON.stringify(testEvent))
        child.stdin.end()
      }

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', async (code) => {
        const executionTime = Date.now() - startTime
        
        // Stop the Lambda Runtime API server if it was started
        if (runtime === 'llrt') {
          await this.runtimeServer.stop()
        }

        resolve({
          runtime,
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          executionTime,
          success: code === 0
        })
      })

      child.on('error', async (error) => {
        // Stop the Lambda Runtime API server if it was started
        if (runtime === 'llrt') {
          await this.runtimeServer.stop()
        }

        reject({
          runtime,
          error: error.message,
          executionTime: Date.now() - startTime,
          success: false
        })
      })

      // Set timeout for execution
      setTimeout(async () => {
        child.kill()
        // Stop the Lambda Runtime API server if it was started
        if (runtime === 'llrt') {
          await this.runtimeServer.stop()
        }
        reject({
          runtime,
          error: 'Execution timeout',
          executionTime: Date.now() - startTime,
          success: false
        })
      }, 30000) // 30 second timeout
    })
  }

  async runCompatibilityTest(filePath) {
    console.log(`🔍 Running compatibility test for: ${filePath}`)
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }

    // Static analysis
    console.log('\n📋 Static Analysis:')
    const analysis = this.analyzeCodeCompatibility(filePath)
    
    if (analysis.issues.length > 0) {
      console.log('Issues found:')
      analysis.issues.forEach(issue => console.log(`  ${issue}`))
    }
    
    if (analysis.warnings.length > 0) {
      console.log('Warnings:')
      analysis.warnings.forEach(warning => console.log(`  ${warning}`))
    }

    if (analysis.issues.length === 0 && analysis.warnings.length === 0) {
      console.log('  ✅ No obvious compatibility issues detected')
    }

    // Runtime testing
    console.log('\n🏃 Runtime Testing:')
    
    try {
      await this.ensureLLRTBinary()
      
      // Execute with Node.js
      console.log('Testing with Node.js...')
      const nodeResult = await this.executeWithRuntime(filePath, 'node')
      console.log('Node.js result:', nodeResult)
      
      // Execute with LLRT
      console.log('Testing with LLRT...')
      const llrtResult = await this.executeWithRuntime(filePath, 'llrt')
      console.log('LLRT result:', llrtResult)
      
      // Compare results
      console.log('\n📊 Comparison Results:')
      this.displayComparison(nodeResult, llrtResult)
      
      return {
        compatible: llrtResult.success && analysis.issues.length === 0,
        nodeResult,
        llrtResult,
        analysis
      }
      
    } catch (error) {
      console.error('❌ Runtime testing failed:', error.message || error)
      return {
        compatible: false,
        error: error.message || error,
        analysis
      }
    } finally {
      // Ensure Lambda Runtime API server is stopped
      await this.runtimeServer.stop()
    }
  }

  displayComparison(nodeResult, llrtResult) {
    console.log(`Node.js: ${nodeResult.success ? '✅' : '❌'} (${nodeResult.executionTime}ms)`)
    console.log(`LLRT:    ${llrtResult.success ? '✅' : '❌'} (${llrtResult.executionTime}ms)`)
    
    if (llrtResult.success && nodeResult.success) {
      const speedup = nodeResult.executionTime / llrtResult.executionTime
      if (speedup > 1.1) {
        console.log(`🚀 LLRT is ${speedup.toFixed(2)}x faster!`)
      } else if (speedup < 0.9) {
        console.log(`🐌 Node.js is ${(1/speedup).toFixed(2)}x faster`)
      } else {
        console.log(`⚖️  Similar performance`)
      }
    }

    // Output comparison
    if (nodeResult.stdout !== llrtResult.stdout) {
      console.log('\n📤 Output Differences:')
      console.log('Node.js output:', nodeResult.stdout || '(empty)')
      console.log('LLRT output:', llrtResult.stdout || '(empty)')
    }

    if (llrtResult.stderr) {
      console.log('\n⚠️  LLRT stderr:', llrtResult.stderr)
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🔧 LLRT Compatibility Checker

Usage: llrt-check <file.js>

Options:
  -h, --help     Show this help message
  -v, --verbose  Verbose output

Examples:
  llrt-check ./src/hello.js
  llrt-check ./my-lambda-function.js

This tool checks if your JavaScript code is compatible with AWS Lambda LLRT runtime
by analyzing the code statically and running it in both Node.js and LLRT environments.
`)
    process.exit(0)
  }

  const filePath = path.resolve(args[0])
  const checker = new LLRTChecker()
  
  try {
    const result = await checker.runCompatibilityTest(filePath)
    
    console.log('\n🎯 Final Result:')
    if (result.compatible) {
      console.log('✅ Your code appears to be compatible with LLRT!')
      process.exit(0)
    } else {
      console.log('❌ Your code may have compatibility issues with LLRT')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

module.exports = { LLRTChecker }