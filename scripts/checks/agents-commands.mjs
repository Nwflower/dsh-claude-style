#!/usr/bin/env node
/**
 * agents-commands.mjs — write AGENTS.md's command table from package.json
 * and each script's own `file — purpose` header (D48).
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const AGENTS = path.join(ROOT, 'AGENTS.md')
const START = '<!-- commands:start — written by npm run agents, not by hand -->'
const END = '<!-- commands:end -->'

/** Supply purposes for commands that share another script or have no script header. */
const OVERRIDES = {
  test: 'the logic and mechanism specs on their own, as the cloud job runs them: Vitest in browser mode on the local Chrome or Edge',
  'changelog:check': 'fail when a `docs/changes/` fragment does not validate or `docs/CHANGELOG.md` holds an `[Unreleased]` section; the cloud job runs this',
  'docs:check': 'fail when the committed ADR index differs from the ADR files; the cloud job runs this',
  agents: 'write this table into AGENTS.md from `package.json` and each script\'s own header',
  'agents:check': 'fail when AGENTS.md\'s command table differs from `package.json`; the cloud job runs this',
}

/** A script whose file is the script itself, so the header line can be read. */
const SCRIPT_FILE = /^node\s+(\S+\.(?:mjs))(?:\s|$)/

/** Parse the first sentence after the header's em dash; drop trailing decision citations. */
function statedPurpose(file) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8')
  const block = text.match(/\/\*\*([\s\S]*?)\*\//)
  if (block === null) return null
  const paragraph = block[1].split('\n')
    .map((line) => line.replace(/^\s*\*?\s?/, '').trim())
    .join(' ')
    .trim()
  const after = paragraph.split('—').slice(1).join('—').trim()
  if (after === '') return null
  const sentence = after.match(/^.*?[.。](?=\s|$)/)
  const purpose = (sentence === null ? after : sentence[0])
    .replace(/\s*\(D\d+\)\.?$/, '')
    .replace(/\s*\(`[^`]+`\)\.?$/, '')
    .replace(/\.$/, '')
  return purpose === '' ? null : purpose
}

/** The table, one row per script in declaration order. */
function table() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const rows = ['| Command | What it does |', '|---|---|']
  rows.push('| `npm install` | the dev dependencies: TypeScript, esbuild, Ajv, Vitest, Playwright and the React types |')
  for (const [name, command] of Object.entries(pkg.scripts)) {
    if (name === 'prepublishOnly') continue
    const override = OVERRIDES[name]
    const file = command.match(SCRIPT_FILE)?.[1]
    const purpose = override ?? (file === undefined ? null : statedPurpose(file))
    if (purpose === null) throw new Error(`agents: npm run ${name} runs "${command}", which states no purpose — add it to OVERRIDES in scripts/checks/agents-commands.mjs`)
    rows.push(`| \`${name === 'test' ? 'npm test' : `npm run ${name}`}\` | ${purpose} |`)
  }
  return rows.join('\n')
}

/** The committed table between the markers, or a failure naming what to add. */
function committed() {
  const text = fs.readFileSync(AGENTS, 'utf8')
  const start = text.indexOf(START)
  const end = text.indexOf(END)
  if (start === -1 || end === -1) {
    throw new Error(`agents: AGENTS.md has no command table markers; add these two lines where the table belongs:\n  ${START}\n  ${END}`)
  }
  return text.slice(start, end + END.length)
}

/** The whole region, markers included. */
function section() {
  return [START, '', table(), '', END].join('\n')
}

if (process.argv.includes('--print')) {
  console.log(section())
} else if (process.argv.includes('--check')) {
  if (committed() !== section()) {
    console.error('agents: AGENTS.md\'s command table is not what package.json says; run `npm run agents`')
    process.exitCode = 1
  } else {
    console.log('agents: the command table is up to date')
  }
} else {
  const text = fs.readFileSync(AGENTS, 'utf8')
  const start = text.indexOf(START)
  const end = text.indexOf(END)
  if (start === -1 || end === -1) throw new Error(`agents: AGENTS.md has no command table markers; add these two lines:\n  ${START}\n  ${END}`)
  const next = text.slice(0, start) + section() + text.slice(end + END.length)
  if (next !== text) {
    fs.writeFileSync(AGENTS, next)
    console.log('agents: wrote AGENTS.md\'s command table')
  } else {
    console.log('agents: AGENTS.md\'s command table is already what package.json says')
  }
}
