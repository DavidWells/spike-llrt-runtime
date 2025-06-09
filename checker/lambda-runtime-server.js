const http = require('http')
const url = require('url')

class LambdaRuntimeServer {
  constructor(port = 9001) {
    this.port = port
    this.server = null
    this.invocationData = null
    this.invocationId = null
  }

  start() {
    this.server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true)
      const path = parsedUrl.pathname

      // Handle next invocation request
      if (path === '/2018-06-01/runtime/invocation/next') {
        if (!this.invocationData) {
          res.writeHead(204) // No content if no invocation data
          res.end()
          return
        }

        // Set Lambda runtime headers
        res.writeHead(200, {
          'Lambda-Runtime-Aws-Request-Id': this.invocationId,
          'Lambda-Runtime-Deadline-Ms': Date.now() + 30000, // 30 second timeout
          'Lambda-Runtime-Invoked-Function-Arn': 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
          'Lambda-Runtime-Trace-Id': 'Root=1-5e6722a7-cc56xmpl46db7ae02d2fd7a8;Parent=91ed514f1e5c03a2;Sampled=1'
        })

        // Send the invocation data
        res.end(JSON.stringify(this.invocationData))
        return
      }

      // Handle invocation response
      if (path.startsWith('/2018-06-01/runtime/invocation/') && path.endsWith('/response')) {
        let body = ''
        req.on('data', chunk => {
          body += chunk.toString()
        })

        req.on('end', () => {
          console.log('Lambda response:', body)
          res.writeHead(200)
          res.end()
        })
        return
      }

      // Handle invocation error
      if (path.startsWith('/2018-06-01/runtime/invocation/') && path.endsWith('/error')) {
        let body = ''
        req.on('data', chunk => {
          body += chunk.toString()
        })

        req.on('end', () => {
          console.error('Lambda error:', body)
          res.writeHead(200)
          res.end()
        })
        return
      }

      // Handle initialization error
      if (path === '/2018-06-01/runtime/init/error') {
        let body = ''
        req.on('data', chunk => {
          body += chunk.toString()
        })

        req.on('end', () => {
          console.error('Lambda init error:', body)
          res.writeHead(200)
          res.end()
        })
        return
      }

      // Unknown endpoint
      res.writeHead(404)
      res.end()
    })

    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`Lambda Runtime API server listening on port ${this.port}`)
        resolve()
      })
    })
  }

  setInvocationData(data) {
    this.invocationId = `test-${Date.now()}`
    this.invocationData = data
  }

  stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('Lambda Runtime API server stopped')
          resolve()
        })
      })
    }
    return Promise.resolve()
  }
}

module.exports = { LambdaRuntimeServer } 