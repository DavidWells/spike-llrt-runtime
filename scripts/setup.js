const fs = require('fs')
const https = require('https')
const { execSync } = require('child_process')
const path = require('path')

async function cloneLLRT() {
  const llrtDir = path.join(__dirname, '..', 'llrt-upstream')
  
  if (fs.existsSync(llrtDir)) {
    console.log('LLRT repository already exists at llrt-upstream/')
    return
  }

  console.log('Cloning LLRT repository...')
  try {
    execSync('git clone https://github.com/awslabs/llrt.git llrt-upstream', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    })
    console.log('✅ LLRT repository cloned successfully!')
  } catch (err) {
    console.error('Failed to clone LLRT repository:', err.message)
    process.exit(1)
  }
}

async function setup() {
  // Clone LLRT repository first
  await cloneLLRT()

  // Get latest release URL
  const releaseUrl = 'https://github.com/awslabs/llrt/releases/latest/download/llrt-lambda-arm64.zip'
  console.log('Getting latest LLRT release from...', releaseUrl)
  // Download and extract bootstrap
  console.log('Downloading LLRT bootstrap...')
  await new Promise((resolve, reject) => {
    function downloadFile(url) {
      https.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 302 || response.statusCode === 301) {
          console.log(`Following redirect to: ${response.headers.location}`)
          downloadFile(response.headers.location)
          return
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`))
          return
        }
        
        const file = fs.createWriteStream("llrt.zip")
        response.pipe(file)
        
        file.on("finish", () => {
          file.close()
          console.log("Download complete, extracting bootstrap...")
          
          try {
            // Extract the bootstrap file to ../bootstrap
            execSync("unzip -o llrt.zip bootstrap && chmod +x bootstrap")
            execSync("rm llrt.zip")
            console.log("Extracted bootstrap file!")
            resolve()
          } catch (err) {
            reject(err)
          }
        })
      }).on("error", reject)
    }
    
    downloadFile(releaseUrl)
  })

  console.log('✅ LLRT runtime extracted to ./bootstrap!')
  
  console.log('Now you can deploy with Serverless Framework')
  console.log('> serverless deploy')
  process.exit(0)
}

setup().catch(console.error)
