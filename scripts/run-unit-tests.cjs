const fs = require('node:fs')
const path = require('node:path')
function collectTestFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.test.js')) {
      files.push(fullPath)
    }
  }

  return files
}

const testsDirectory = path.join(process.cwd(), 'dist-tests', 'tests')
const testFiles = fs.existsSync(testsDirectory) ? collectTestFiles(testsDirectory) : []

if (testFiles.length === 0) {
  console.error('No compiled unit test files were found in dist-tests/tests.')
  process.exit(1)
}

for (const testFile of testFiles) {
  require(testFile)
}

console.log(`Executed ${testFiles.length} compiled unit test files.`)
