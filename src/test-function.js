// Test function to demonstrate LLRT compatibility checking
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export async function handler(event) {
  try {
    // Test compatible operations
    const timestamp = new Date().toISOString()
    const randomId = crypto.randomUUID()
    
    // Test path operations (should work)
    const currentPath = path.join('/', 'tmp', 'test.txt')
    
    // Test crypto operations (should work)
    const hash = crypto.createHash('sha256')
    hash.update('test data')
    const hashDigest = hash.digest('hex')
    
    // Test file operations (fs/promises is supported)
    try {
      await fs.writeFile('/tmp/test.txt', 'Hello LLRT!')
      const content = await fs.readFile('/tmp/test.txt', 'utf8')
      console.log('File content:', content)
    } catch (fsError) {
      console.log('File operation failed:', fsError.message)
    }
    
    // Test JSON operations
    const testData = {
      id: randomId,
      timestamp,
      path: currentPath,
      hash: hashDigest,
      event: event || {},
      nodeVersion: process.version,
      platform: process.platform
    }
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(testData, null, 2)
    }
    
  } catch (error) {
    console.error('Handler error:', error)
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    }
  }
}