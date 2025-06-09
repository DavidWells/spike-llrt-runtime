#!/usr/bin/env node

// Usage: node lambda-wrapper.js <handlerFile> <handlerExport>
// Reads event from stdin (Node.js) or Lambda Runtime API (LLRT), calls handler, prints result as JSON

const [,, handlerFile, handlerExport = 'handler'] = process.argv

if (!handlerFile) {
  console.error('Usage: node lambda-wrapper.js <handlerFile> <handlerExport>')
  process.exit(1)
}

const path = require('path')

async function main() {
  let event = {}
  const isLLRT = process.env.AWS_LAMBDA_RUNTIME_API !== undefined

  if (isLLRT) {
    // Read event from Lambda Runtime API
    const runtimeApi = process.env.AWS_LAMBDA_RUNTIME_API
    const response = await fetch(`http://${runtimeApi}/2018-06-01/runtime/invocation/next`)
    if (!response.ok) {
      console.error('Failed to fetch event from Lambda Runtime API:', response.statusText)
      process.exit(1)
    }
    event = await response.json()
  } else {
    // Read event from stdin (Node.js)
    try {
      const input = await new Promise((resolve, reject) => {
        let data = ''
        process.stdin.on('data', chunk => data += chunk)
        process.stdin.on('end', () => resolve(data))
        process.stdin.on('error', reject)
      })
      if (input) event = JSON.parse(input)
    } catch (e) {
      // Ignore if no input
    }
  }

  let handler
  try {
    // Resolve path relative to project root
    const projectRoot = process.cwd()
    const handlerPath = path.resolve(projectRoot, handlerFile)
    const mod = await import(handlerPath)
    handler = mod[handlerExport]
    if (!handler) throw new Error(`Export '${handlerExport}' not found in ${handlerFile}`)
  } catch (e) {
    console.error('Failed to import handler:', e)
    process.exit(1)
  }

  try {
    const result = await handler(event)
    console.log(JSON.stringify(result, null, 2))
  } catch (e) {
    console.error('Handler threw error:', e)
    process.exit(1)
  }
}

main() 