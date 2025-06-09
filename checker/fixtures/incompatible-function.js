// This function demonstrates features not supported by LLRT
import { createServer } from 'net'
import { Worker } from 'worker_threads'
import { exec } from 'child_process'
import { EventEmitter } from 'events'
import path from 'path'
import { fileURLToPath } from 'url'

export async function handler(event) {
  try {
    // Use Node.js specific features that aren't supported in LLRT
    
    // 1. Use process.nextTick (not supported in LLRT)
    process.nextTick(() => {
      console.log('This will not work in LLRT')
    })

    // 2. Use Buffer directly (not supported in LLRT)
    const buffer = Buffer.from('test')
    console.log('Buffer:', buffer.toString())

    // 3. Use Node.js specific modules
    const server = createServer()
    server.listen(0, () => {
      console.log('Server listening on port:', server.address().port)
      server.close()
    })

    // 4. Use worker threads (not supported in LLRT)
    const __filename = fileURLToPath(import.meta.url)
    const workerPath = path.join(path.dirname(__filename), 'worker.js')
    const worker = new Worker(workerPath)
    worker.on('message', (msg) => console.log('Worker message:', msg))

    // 5. Use child_process (not supported in LLRT)
    exec('echo "This will not work in LLRT"', (error, stdout) => {
      console.log('Exec output:', stdout)
    })

    // 6. Use EventEmitter (not supported in LLRT)
    const emitter = new EventEmitter()
    emitter.on('test', () => console.log('Event emitted'))
    emitter.emit('test')

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "This function uses Node.js specific features not supported by LLRT",
        features: [
          "process.nextTick",
          "Buffer",
          "net module",
          "worker_threads",
          "child_process",
          "EventEmitter"
        ]
      })
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