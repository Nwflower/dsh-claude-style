#!/usr/bin/env node
/** decisions-index.mjs — generate and check the ADR index from decision and retirement files. */
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.resolve(import.meta.dirname, '..', 'docs', 'adr')
const FILE = path.join(DIR, 'README.md')
const RETIRED = path.join(DIR, 'retired.txt')

/** The prose above the table; it belongs to the index rather than to any one decision. */
const PREAMBLE = `# 架构决策

本文件由 \`npm run docs:index\` 从各决策文件生成，勿手改。

每条决策记一个方向，正文只有背景、决定、后果与重审条件：放弃的方案写在后果一节，没有重审条件时写「无。」。编号是稳定标识，代码注释按编号引用；被取代或删除的编号作废、不复用。`

/** One ADR file's index facts. */
function readDecision(file) {
  const text = fs.readFileSync(path.join(DIR, file), 'utf8')
  const title = text.match(/^# (D(\d+)\. .+)$/m)
  if (title === null) throw new Error(`decisions-index: ${file} has no "# D<n>. <title>" heading`)
  const replaced = text.match(/^- \*\*取代\*\*：(.+)$/m)
  const retired = []
  if (replaced !== null) for (const number of replaced[1].matchAll(/D(\d+)/g)) retired.push({ number: Number(number[1]), by: Number(title[2]) })
  return { file, number: Number(title[2]), title: title[1].replace(/^D\d+\.\s*/, ''), replaced: replaced === null ? '' : replaced[1].trim(), retired }
}

/** Numbers retired without a successor, one `D<n>` per line; `#` lines are comments. */
function retiredWithoutSuccessor() {
  if (!fs.existsSync(RETIRED)) return []
  const entries = []
  for (const line of fs.readFileSync(RETIRED, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const entry = trimmed.match(/^D(\d+)$/)
    if (entry === null) throw new Error(`decisions-index: retired.txt has a line that is not a bare number: ${trimmed}`)
    entries.push({ number: Number(entry[1]), by: null })
  }
  return entries
}

const decisions = fs.readdirSync(DIR)
  .filter((name) => /^D\d+-.*\.md$/.test(name))
  .map(readDecision)
const numbers = new Set()
for (const decision of decisions) {
  if (numbers.has(decision.number)) throw new Error(`decisions-index: D${decision.number} has two files`)
  numbers.add(decision.number)
}

const retired = [...decisions.flatMap((decision) => decision.retired), ...retiredWithoutSuccessor()].sort((a, b) => a.number - b.number)
const retiredSeen = new Set()
for (const entry of retired) {
  if (numbers.has(entry.number)) throw new Error(`decisions-index: D${entry.number} is both live and retired`)
  if (retiredSeen.has(entry.number)) throw new Error(`decisions-index: D${entry.number} is retired twice`)
  retiredSeen.add(entry.number)
}

const lines = [PREAMBLE, '', '| 编号 | 决策 | 取代 |', '| --- | --- | --- |']
for (const row of [...decisions].sort((a, b) => a.number - b.number)) {
  lines.push(`| [D${row.number}](${row.file}) | ${row.title} | ${row.replaced} |`)
}
lines.push('', '## 作废的编号', '')
lines.push(retired.length === 0
  ? '无。'
  : `${retired.map((entry) => entry.by === null ? `D${entry.number}（作废，无取代）` : `D${entry.number}（由 D${entry.by} 取代）`).join('、')}。`)
const index = `${lines.join('\n')}\n`

if (process.argv.includes('--check')) {
  const committed = fs.readFileSync(FILE, 'utf8')
  if (committed !== index) {
    throw new Error('decisions-index: docs/adr/README.md is not what the ADR files say; run `npm run docs:index`')
  }
  console.log(`decisions index: ${decisions.length} decisions, ${retired.length} retired numbers, up to date`)
} else {
  fs.writeFileSync(FILE, index)
  console.log(`decisions index: wrote ${decisions.length} decisions and ${retired.length} retired numbers to docs/adr/README.md`)
}
