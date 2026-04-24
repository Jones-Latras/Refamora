const fs = require('node:fs')
const path = require('node:path')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function readFile(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

function main() {
  const buildPlanPath = path.join(process.cwd(), 'Doc', 'Refamora_Production_Build_Plan.md')
  assert(fs.existsSync(buildPlanPath), 'Missing production build plan document.')

  const buildPlan = readFile('Doc/Refamora_Production_Build_Plan.md')

  for (const marker of [
    '## Build Profiles',
    '## Release Inputs',
    '## Preflight Checklist',
    '## Build Commands',
    '## Staging Validation Gates',
    '## Production Promotion Gates',
    '## Release Record',
    '## Remaining Gaps',
    'eas build --platform android --profile staging',
    'eas build --platform android --profile production',
  ]) {
    assert(buildPlan.includes(marker), `Production build plan is missing section or command: ${marker}`)
  }

  console.log('Production build plan checks passed.')
}

main()
