const { LLRTChecker } = require('../bin/llrt-check.js')
const path = require('path')

async function runTests() {
  console.log('🧪 Testing LLRT Checker Implementation\n')
  
  const checker = new LLRTChecker()
  const testFiles = [
    'src/hello.js',
    'src/goodbye.js',
    'src/test-function.js'
  ]
  
  for (const file of testFiles) {
    const filePath = path.join(__dirname, '..', file)
    console.log(`\n${'='.repeat(50)}`)
    console.log(`Testing: ${file}`)
    console.log('='.repeat(50))
    
    try {
      const result = await checker.runCompatibilityTest(filePath)
      console.log('\nTest completed successfully!')
      
      if (result.analysis) {
        console.log(`Issues: ${result.analysis.issues.length}`)
        console.log(`Warnings: ${result.analysis.warnings.length}`)
      }
      
    } catch (error) {
      console.error(`❌ Test failed for ${file}:`, error.message)
    }
  }
  
  console.log('\n✅ All tests completed!')
}

runTests().catch(console.error)