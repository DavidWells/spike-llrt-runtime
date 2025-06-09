const https = require('https')
const fs = require('fs')
const path = require('path')

const LLRT_README_URL = 'https://raw.githubusercontent.com/awslabs/llrt/main/README.md'

function fetchReadme() {
  return new Promise((resolve, reject) => {
    https.get(LLRT_README_URL, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch README: ${res.statusCode}`))
        return
      }

      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => resolve(data))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function parseLegend(markdown) {
  const legendStart = markdown.indexOf('## Legend')
  let legendContent = ''
  if (!legendStart) {
    legendContent = `
⚠️ = partially supported in LLRT
⏱ = planned partial support
* = Not native
** = Use fetch instead`
  } else {
    const legendEnd = markdown.indexOf('##', legendStart + 1)
    legendContent = markdown.slice(legendStart, legendEnd)
  }

  const legend = {}
  const lines = legendContent.split('\n')
  
  for (const line of lines) {
    if (line.includes('✅')) {
      legend['✅'] = line.split('✅')[1].trim()
    } else if (line.includes('❌')) {
      legend['❌'] = line.split('❌')[1].trim()
    } else if (line.includes('⚠️')) {
      legend['⚠️'] = line.split('⚠️')[1].trim()
    } else if (line.includes('🔶')) {
      legend['🔶'] = line.split('🔶')[1].trim()
    } else if (line.includes('🔷')) {
      legend['🔷'] = line.split('🔷')[1].trim()
    }
  }

  if (Object.keys(legend).length === 0) {
    legend['⚠️'] = 'partially supported in LLRT'
    legend['⏱'] = 'planned partial support'
    legend['*'] = 'Not native'
    legend['**'] = 'Use fetch instead'
  }

  return legend
}

function extractCompatibilityMatrix(markdown, legend) {
  // Find the compatibility matrix section
  const matrixStart = markdown.indexOf('## Compatibility matrix')
  if (matrixStart === -1) {
    throw new Error('Could not find compatibility matrix section')
  }

  // Extract the table content
  const tableStart = markdown.indexOf('|', matrixStart)
  const tableEnd = markdown.indexOf('\n\n', tableStart)
  const tableContent = markdown.slice(tableStart, tableEnd)

  // Parse the table
  const lines = tableContent.split('\n').filter(line => line.trim())
  
  // Get headers (first line) and rename "Modules" to "Feature"
  const headers = lines[0]
    .split('|')
    .map(h => h.trim())
    .filter(h => h)
    .map(h => h === 'Modules' ? 'Feature' : h)
  
  // Parse rows and transform into feature status object
  const featureStatus = {}
  
  lines.slice(2).forEach(line => {
    const cells = line
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell)
    
    const featureName = cells[0]
    const llrtStatus = cells[2] // LLRT status column
    
    const supported = !llrtStatus.includes('✘')
    
    // Initialize feature status
    featureStatus[featureName] = {
      supported,
      partiallySupported: supported || llrtStatus.includes('⚠️'),
      plannedSupport: llrtStatus.includes('⏱'),
      notNative: llrtStatus.includes('*'),
      useFetchInstead: llrtStatus.includes('**')
    }
  })

  return {
    features: featureStatus,
    legend
  }
}

async function main() {
  try {
    console.log('Fetching LLRT README...')
    const readme = await fetchReadme()
    
    console.log('Parsing legend...')
    const legend = parseLegend(readme)
    
    console.log('Extracting compatibility matrix...')
    const matrix = extractCompatibilityMatrix(readme, legend)
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '..')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir)
    }
    
    // Write the matrix to a JSON file
    const outputPath = path.join(outputDir, 'checker', 'llrt-compatibility.json')
    fs.writeFileSync(
      outputPath,
      JSON.stringify(matrix, null, 2)
    )
    
    console.log(`Compatibility matrix saved to ${outputPath}`)
    console.log('\nMatrix preview:')
    console.log(JSON.stringify(matrix, null, 2))
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main() 