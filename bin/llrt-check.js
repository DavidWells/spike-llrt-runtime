#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync, spawn } = require('child_process')
const os = require('os')

class LLRTChecker {
  constructor() {
    this.llrtBinary = null
    this.compatibilityData = null
    this.loadCompatibilityData()
  }

  loadCompatibilityData() {
    try {
      const compatPath = path.join(__dirname, '..', 'llrt-compatibility.json')
      this.compatibilityData = JSON.parse(fs.readFileSync(compatPath, 'utf8'))
    } catch (error) {
      console.warn('⚠️  Could not load compatibility data:', error.message)
    }
  }

  async ensureLLRTBinary() {
    if (this.llrtBinary && fs.existsSync(this.llrtBinary)) {
      return this.llrtBinary
    }

    const platform = os.platform()
    const arch = os.arch()
    
    let binaryName = 'llrt'
    let downloadUrl = 'https://github.com/awslabs/llrt/releases/latest/download/'
    
    if (platform === 'darwin') {
      downloadUrl += arch === 'arm64' ? 'llrt-container-arm64' : 'llrt-container-x64'
    } else if (platform === 'linux') {
      downloadUrl += arch === 'arm64' ? 'llrt-container-arm64' : 'llrt-container-x64'
    } else if (platform === 'win32') {
      binaryName = 'llrt.exe'
      downloadUrl += arch === 'arm64' ? 'llrt-container-arm64.exe' : 'llrt-container-x64.exe'
    } else {
      throw new Error(`Unsupported platform: ${platform}`)
    }

    const binDir = path.join(__dirname, '..', '.llrt')
    const binaryPath = path.join(binDir, binaryName)

    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true })
    }

    if (!fs.existsSync(binaryPath)) {
      console.log('📥 Downloading LLRT binary...')
      try {
        execSync(`curl -L "${downloadUrl}" -o "${binaryPath}"`, { stdio: 'inherit' })
        execSync(`chmod +x "${binaryPath}"`)
        console.log('✅ LLRT binary downloaded successfully')
      } catch (error) {
        throw new Error(`Failed to download LLRT binary: ${error.message}`)
      }
    }

    this.llrtBinary = binaryPath
    return binaryPath
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
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      let stdout = ''
      let stderr = ''

      const runtimePath = runtime === 'llrt' ? this.llrtBinary : 'node'
      const child = spawn(runtimePath, [filePath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      })

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        const executionTime = Date.now() - startTime
        resolve({
          runtime,
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          executionTime,
          success: code === 0
        })
      })

      child.on('error', (error) => {
        reject({
          runtime,
          error: error.message,
          executionTime: Date.now() - startTime,
          success: false
        })
      })

      // Set timeout for execution
      setTimeout(() => {
        child.kill()
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
      
      // Execute with LLRT
      console.log('Testing with LLRT...')
      const llrtResult = await this.executeWithRuntime(filePath, 'llrt')
      
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
    } else {
      console.log('❌ Your code may have compatibility issues with LLRT')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { LLRTChecker }