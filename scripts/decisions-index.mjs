#!/usr/bin/env node
/**
 * decisions-index.mjs — write docs/decisions/README.md from the decision files
 * themselves (D48).
 *
 * Every decision carries its own title, status and group, and the replacing
 * decision names what it retired in its associations line; the index is the
 * table of those facts, so it cannot drift from the decisions it lists. Run it
 * to write the file, or with `--check` to fail when the committed index differs
 * — which is what CI runs.
 */
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.resolve(import.meta.dirname, '..', 'docs', 'decisions')
const FILE = path.join(DIR, 'README.md')

/** The groups and their order, as the index prints them. */
const GROUPS = ['构建与源码', '宿主边界', '运行时', '功能', '分发与流程']

/** The prose above the tables; it belongs to the index rather than to any one decision. */
const PREAMBLE = `# 架构决策

本文件由 \`npm run docs:index\` 从各决策文件生成，勿手改。

决策每条一个文件，模板与维护规则见 [D48](D48-documentation.md)。编号是稳定标识，代码注释按编号引用；被推翻的编号作废、不复用。

状态为「待实施」的决策写着现状：迁移完成之前，以现状为准修改代码。`

/** One decision file's index facts. */
function readDecision(file) {
  const text = fs.readFileSync(path.join(DIR, file), 'utf8')
  const title = text.match(/^# (D(\d+)\. .+)$/m)
  const status = text.match(/^- \*\*状态\*\*：(.+)$/m)
  const group = text.match(/^- \*\*分组\*\*：(.+)$/m)
  const related = text.match(/^- \*\*关联\*\*：(.+)$/m)
  if (title === null) throw new Error(`decisions-index: ${file} has no "# D<n>. <title>" heading`)
  if (status === null) throw new Error(`decisions-index: ${file} has no status line`)
  if (group === null) throw new Error(`decisions-index: ${file} has no group line`)
  const retired = []
  // "取代 D1；…", "取代 D18 与 D8；…": every number between 取代 and the next clause.
  const replaced = related === null ? null : related[1].match(/取代\s*([^；;]+)/)
  if (replaced !== null) for (const number of replaced[1].matchAll(/D(\d+)/g)) retired.push({ number: Number(number[1]), by: Number(title[2]) })
  return { file, number: Number(title[2]), title: title[1].replace(/^D\d+\.\s*/, ''), status: status[1], group: group[1], retired }
}

const decisions = fs.readdirSync(DIR)
  .filter((name) => /^D\d+-.*\.md$/.test(name))
  .map(readDecision)
const numbers = new Set()
for (const decision of decisions) {
  if (numbers.has(decision.number)) throw new Error(`decisions-index: D${decision.number} has two files`)
  numbers.add(decision.number)
}
const unknown = decisions.filter((decision) => !GROUPS.includes(decision.group))
if (unknown.length > 0) throw new Error(`decisions-index: unknown group on ${unknown.map((d) => `D${d.number} (${d.group})`).join(', ')}`)

const retired = decisions.flatMap((decision) => decision.retired).sort((a, b) => a.number - b.number)
const lines = [PREAMBLE]
for (const group of GROUPS) {
  const rows = decisions.filter((decision) => decision.group === group).sort((a, b) => a.number - b.number)
  if (rows.length === 0) continue
  lines.push('', `## ${group}`, '', '| 编号 | 决策 | 状态 |', '| --- | --- | --- |')
  for (const row of rows) lines.push(`| [D${row.number}](${row.file}) | ${row.title} | ${row.status} |`)
}
lines.push('', '## 作废的编号', '')
lines.push(retired.length === 0
  ? '无。'
  : `${retired.map((entry) => `D${entry.number}（由 D${entry.by} 取代）`).join('、')}。`)
const index = `${lines.join('\n')}\n`

if (process.argv.includes('--check')) {
  const committed = fs.readFileSync(FILE, 'utf8')
  if (committed !== index) {
    throw new Error('decisions-index: docs/decisions/README.md is not what the decision files say; run `npm run docs:index`')
  }
  console.log(`decisions index: ${decisions.length} decisions, ${retired.length} retired numbers, up to date`)
} else {
  fs.writeFileSync(FILE, index)
  console.log(`decisions index: wrote ${decisions.length} decisions and ${retired.length} retired numbers to docs/decisions/README.md`)
}
