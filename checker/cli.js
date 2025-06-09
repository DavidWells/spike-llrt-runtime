#!/usr/bin/env node

const path = require('path')
const { LLRTChecker } = require('../checker/index')

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

main()