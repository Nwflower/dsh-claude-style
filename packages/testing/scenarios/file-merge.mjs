#!/usr/bin/env node
/**
 * Exercise one merged row per file after a `run_code` program's four-file script
 * (D87). One row keeps the latest operation and counts its calls; unchanged and
 * single-call files stay distinct. Unit tests cover the shared row element.
 */
import fs from 'node:fs'
import path from 'node:path'

/** What the four scripted edits replace: the file the scenario writes before the turn. */
const APP = 'const first = 1\nconst second = 1\nconst third = 1\nconst fourth = 1\n'
/** What the two scripted reads of the unchanged file open onto. */
const PLAIN = '# Plain\n\n- read twice\n'
/** How many changes the script makes to that file, and how many lines each one adds and removes. */
const CHANGES = 4
/** How many calls the script makes on that file: the four changes and a read on either side of them. */
const CALLS = CHANGES + 2
/** The text each change leaves behind, so the merged card can be read for all of them. */
const NEW_LINES = ['const first = 2', 'const second = 2', 'const third = 2', 'const fourth = 2']

/**
 * One row's two figures as the page reads them: a figure rolls one character
 * at a time, so its number is the digits in flow of its own characters read in
 * order. page.evaluate serializes the callback's own source and its extra
 * arguments take JSON values only, so the readers below carry this helper into
 * the page as its source, the way motion.mjs carries watchReveal.
 */
function figuresOf(root) {
  return ['.dsh-claude-file-add', '.dsh-claude-file-del'].map((selector) => {
    const figure = root.querySelector(selector)
    if (figure === null) return null
    return [...figure.querySelectorAll('.dsh-claude-file-roll-in')].map((span) => span.textContent).join('')
  })
}

/**
 * Every file-change row on the page: which one stands for its file, its path,
 * its tail, whether it is visible, and the box the host drew for that call.
 */
const readRows = (page) => page.evaluate((figuresSource) => {
  const figuresOf = (0, eval)(`(${figuresSource})`)
  const centreOf = (element) => {
    if (element === null) return null
    const box = element.getBoundingClientRect()
    return Math.round((box.y + box.height / 2) * 10) / 10
  }
  return [...document.querySelectorAll('.dsh-claude-file-root')].map((root) => {
    const box = root.closest('[data-chat-call-id]')
    const figures = figuresOf(root)
    // Where the operation's label sits against the row's own path, and whether
    // the host's now-empty title slot takes any room.
    const label = root.querySelector('.dsh-claude-file-title')
    const summary = root.querySelector('.dsh-claude-file-link, .dsh-claude-file-summary')
    const slot = root.querySelector('.dsh-claude-file-title-slot')
    return {
      merge: root.getAttribute('data-dsh-claude-file-merge'),
      op: root.getAttribute('data-dsh-claude-file-op'),
      label: root.querySelector('.dsh-claude-file-title .dsh-claude-file-op-in')?.textContent ?? null,
      path: summary?.textContent ?? null,
      labelCentre: centreOf(label),
      labelSize: label === null ? null : getComputedStyle(label).fontSize,
      pathCentre: centreOf(summary),
      pathSize: summary === null ? null : getComputedStyle(summary).fontSize,
      labelX: label === null ? null : Math.round(label.getBoundingClientRect().x),
      pathX: summary === null ? null : Math.round(summary.getBoundingClientRect().x),
      titleSlotHidden: slot === null ? null : getComputedStyle(slot).display === 'none',
      add: figures[0] ?? null,
      del: figures[1] ?? null,
      visible: root.checkVisibility(),
      carrierDisplay: box === null ? null : getComputedStyle(box).display,
      carrierHeight: box === null ? null : Math.round(box.getBoundingClientRect().height),
    }
  })
}, figuresOf.toString())

/**
 * The row that stands for the changed file, as one sample: its figures, the
 * operation it wears, whether a character is leaving and a character rising,
 * whether a label swap is in flight, and how many rows of that file the reader
 * can see. The recorder below carries this same reader into the page, the way
 * `figuresOf` is carried, so both sides read a sample the same way.
 */
const HEAD_FACTS = ([suffix, figuresSource]) => {
  const figuresOf = (0, eval)(`(${figuresSource})`)
  const roots = [...document.querySelectorAll('.dsh-claude-file-root')]
  const ofFile = (root) => (root.querySelector('.dsh-claude-file-link, .dsh-claude-file-summary')?.textContent ?? '').endsWith(suffix)
  const mark = (root) => root.getAttribute('data-dsh-claude-file-merge')
  // The row that stands, or the file's one row before a second change joins it.
  const head = roots.find((root) => mark(root) === 'head') ?? roots.find((root) => ofFile(root) && mark(root) === null)
  if (head === undefined) return null
  const figures = figuresOf(head)
  // A figure is rolling while the digit leaving it and the digit rising into it
  // both have an animation in flight. A digit animates once when the row
  // appears, so only the two together tell a roll on a change from that first
  // arrival; each is counted on its own for the check's own detail.
  const running = (selector) => [...head.querySelectorAll(selector)]
    .some((span) => span.getAnimations().some((animation) => animation.playState === 'running'))
  const leaving = running('.dsh-claude-file-roll-out')
  const rising = running('.dsh-claude-file-roll-in')
  return {
    add: figures[0] ?? null,
    del: figures[1] ?? null,
    op: head.getAttribute('data-dsh-claude-file-op'),
    label: head.querySelector('.dsh-claude-file-title .dsh-claude-file-op-in')?.textContent ?? null,
    leaving,
    rising,
    rolling: leaving && rising,
    // The operation swapping: the label taking its place is animating in, and
    // both states stand in the block's own cell.
    swapping: running('.dsh-claude-file-title .dsh-claude-file-op-in'),
    swapNames: [...new Set([...head.querySelectorAll('.dsh-claude-file-title .dsh-claude-file-op-in')]
      .flatMap((span) => span.getAnimations().filter((animation) => animation.playState === 'running').map((animation) => animation.animationName ?? '?')))],
    labelBoxes: [...head.querySelectorAll('.dsh-claude-file-title .dsh-claude-file-op-out, .dsh-claude-file-title .dsh-claude-file-op-in')]
      .map((span) => ({ x: Math.round(span.getBoundingClientRect().x), of: (span.parentElement?.className ?? '?').split(' ')[0] })),
    // The host renders the collapsed head a second time inside its own highlight
    // container, an inert copy with no text of its own; the reader sees the one
    // label the row draws.
    labels: head.querySelectorAll('.dsh-claude-file-title').length,
    labelsTexted: [...head.querySelectorAll('.dsh-claude-file-title')].filter((label) => (label.textContent ?? '') !== '').length,
    iconBoxes: [...head.querySelectorAll('.dsh-claude-file-leading .dsh-claude-file-op-out, .dsh-claude-file-leading .dsh-claude-file-op-in')]
      .map((span) => Math.round(span.getBoundingClientRect().x)),
    visible: roots.filter((root) => ofFile(root) && root.checkVisibility()).length,
  }
}

/**
 * Record every sample the page itself writes (D87): a runner loaded by the
 * other scenarios is starved for as long as they hold the machine, and a change
 * that lands inside that stall is a change no reading from here ever saw — the
 * tail's number, the roll it turns with and the label swapping in are each
 * caught only if the page is read at the moment it writes them. Only the file
 * rows' own writing is a sample: the answer streaming beside them mutates the
 * page constantly and says nothing about a row.
 */
const startRecording = (page, file) => page.evaluate(([suffix, factsSource, figuresSource]) => {
  const facts = (0, eval)(`(${factsSource})`)
  const figuresOf = (0, eval)(`(${figuresSource})`)
  const ofRow = (node) => node instanceof Element &&
    (node.closest('.dsh-claude-file-root') !== null || node.querySelector('.dsh-claude-file-root') !== null)
  window.__fileMergeSamples = []
  new MutationObserver((records) => {
    if (!records.some((record) => ofRow(record.target) || [...record.addedNodes].some(ofRow))) return
    const sample = facts([suffix, figuresSource])
    if (sample !== null) window.__fileMergeSamples.push(sample)
  }).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true })
}, [file, HEAD_FACTS.toString(), figuresOf.toString()])

const count = (figure) => Number(String(figure ?? '').replace(/[^\d]/g, ''))

function fileMergeScenario({ check }) {
  return {
    script: 'fileEdits',
    prompt: 'change the file a few times',
    delayMs: 250,
    // The program-dispatched calls the rows are read together in: the `ptc`
    // preset is the one whose model-facing tool is `run_code`.
    patch: [
      '- id: agent-preset-registry',
      '  config:',
      '    default: ptc',
    ],
    /** The workspace the scratch host opens its session in, with the files the scripted calls chain onto. */
    async beforeSend(context) {
      const workspace = path.join(context.home, 'workspace')
      fs.mkdirSync(workspace, { recursive: true })
      fs.writeFileSync(path.join(workspace, 'app.js'), APP)
      // The file the script only reads, and the leftovers of an earlier run.
      fs.writeFileSync(path.join(workspace, 'plain.md'), PLAIN)
      for (const name of ['notes.md', 'only.md']) fs.rmSync(path.join(workspace, name), { force: true })
      await startRecording(context.page, 'app.js')
    },
    /** Hold the turn, then take the page's own record of the row that stands in it. */
    async duringTurn(context) {
      const { page } = context
      const deadline = Date.now() + 60000
      while (Date.now() < deadline) {
        if (await page.evaluate(() => document.querySelector('[data-chat-running]') === null)) break
        await page.waitForTimeout(100)
      }
      context.notes.samples = await page.evaluate(() => window.__fileMergeSamples ?? [])
    },
    async afterTurn(context) {
      const { page } = context
      // A finished turn folds its process under the host's own control, and that
      // control's own shell keeps the group header out of sight until it opens:
      // the turn's control first, then the group's header, puts the rows up.
      const turn = page.locator('button[data-turn-process]')
      if (await turn.isEnabled()) await turn.click()
      await page.waitForTimeout(400)
      const header = page.locator('button[data-process-activity]').first()
      if (await header.count() > 0) await header.click()
      await page.waitForTimeout(500)
      context.notes.rows = await readRows(page)
      // Opening the row that stands has to read every change of the file: the
      // card caps its lines, so its own fold control is pressed first. The press
      // goes to the row's leading icon — the row opens from anywhere on its line
      // except the path button, which opens the file instead (chat-files.ts).
      const head = page.locator('.dsh-claude-file-root[data-dsh-claude-file-merge="head"]').first()
      await head.locator('.dsh-claude-file-leading').click()
      await page.waitForTimeout(300)
      const fold = head.locator('[data-diff] button[aria-expanded="false"]')
      if (await fold.count() > 0) await fold.first().click()
      await page.waitForTimeout(300)
      context.notes.card = await head.evaluate((root) => root.querySelector('.dsh-claude-file-diff')?.textContent ?? null)
      // The file that was only read: the row that stands for it opens onto the
      // window its calls read, and carries no change card at all. A press landing
      // while the row is still settling is pressed again, the way a reader who
      // saw nothing happen would; one that did open it is left open.
      const readOnly = page.locator('.dsh-claude-file-root[data-dsh-claude-file-merge="head"]').filter({ hasText: 'plain.md' }).first()
      const closedLine = readOnly.locator('[data-disclosure-row][aria-expanded="false"]')
      for (let press = 0; press < 4 && await closedLine.count() > 0; press += 1) {
        await readOnly.locator('.dsh-claude-file-leading').click()
        await page.waitForTimeout(400)
      }
      context.notes.readCard = await readOnly.evaluate((root) => root.querySelector('.dsh-claude-file-read')?.textContent ?? null)
    },
    async assert({ session, notes }) {
      const rows = notes.rows ?? []
      const samples = notes.samples ?? []
      const app = rows.filter((row) => (row.path ?? '').endsWith('app.js'))
      const notesRows = rows.filter((row) => (row.path ?? '').endsWith('notes.md'))
      const only = rows.filter((row) => (row.path ?? '').endsWith('only.md'))
      const plain = rows.filter((row) => (row.path ?? '').endsWith('plain.md'))
      const head = app.find((row) => row.merge === 'head') ?? {}
      const members = app.filter((row) => row.merge === 'member')
      const adds = samples.map((sample) => count(sample.add))
      const shown = samples.map((sample) => sample.visible)
      const changes = adds.filter((add, at) => at > 0 && add !== adds[at - 1]).length
      const leaving = samples.filter((sample) => sample.leaving).length
      const rising = samples.filter((sample) => sample.rising).length
      const rolling = samples.filter((sample) => sample.rolling).length
      const swapping = samples.filter((sample) => sample.swapping).length
      const ops = samples.map((sample) => sample.op)
      const swaps = samples.filter((sample) => sample.swapping)
      // The two operations' own words, whatever language the host is answering in.
      const labelOf = (op) => samples.find((sample) => sample.op === op)?.label ?? null
      const card = notes.card ?? ''
      const readCard = notes.readCard ?? ''
      return [
        check('同一个文件的六次调用在页面上只留一行可见',
          app.length === CALLS && app.filter((row) => row.visible).length === 1,
          JSON.stringify(app)),
        check('可见的那一行是这一组里最早的一行，带着代表行的标记',
          head.merge === 'head' && head.visible === true, JSON.stringify(head)),
        check('其余五行整行离开页面，不占高度',
          members.length === CALLS - 1 && members.every((row) => row.carrierDisplay === 'none' && row.carrierHeight === 0),
          JSON.stringify(members)),
        check('代表行的行尾是这些改动的累计值',
          count(head.add) === CHANGES && count(head.del) === CHANGES,
          `head=${head.add} ${head.del}; rows=${JSON.stringify(app.map((row) => `${row.add}${row.del}`))}`),
        check('轮次进行中数字随每次改动长大，这个文件始终不多于一行可见',
          changes >= CHANGES - 1 && adds.length > 0 && adds[adds.length - 1] === CHANGES && shown.every((count) => count <= 1),
          `${changes} changes over ${adds.length} samples: adds=${JSON.stringify(adds)} shown=${JSON.stringify(shown)}`),
        check('数字变化时旧数字向下转出、新数字自上方转入',
          rolling >= 1,
          `frames leaving=${leaving}, rising=${rising}, together=${rolling} of ${samples.length}`),
        check('行首的操作跟着最后一次调用走：改动时是编辑，最后一次读取后回到读取',
          ops.length > 0 && ops.includes('read') && ops.includes('edit') && ops[ops.length - 1] === 'read' &&
          labelOf('read') !== null && labelOf('edit') !== null && labelOf('read') !== labelOf('edit'),
          `operations over ${ops.length} samples: ${JSON.stringify([...new Set(ops)])}; read=${labelOf('read')} edit=${labelOf('edit')}`),
        check('操作换新时旧标题离开、新标题进入',
          swapping >= 1,
          `frames with a label swapping=${swapping} of ${samples.length}; running=${JSON.stringify([...new Set(samples.flatMap((sample) => sample.swapNames ?? []))])}`),
        check('换新时旧标题与新标题叠在同一格，旁边的路径不动',
          swaps.length > 0 && swaps.every((sample) => (sample.labelBoxes ?? []).length >= 2 &&
            new Set(sample.labelBoxes.map((box) => box.x)).size === 1),
          `swap frames=${JSON.stringify(swaps.map((sample) => sample.labelBoxes))}`),
        check('一行只画一个写着字的操作标题',
          samples.length > 0 && samples.every((sample) => sample.labelsTexted === 1),
          `labels with text per sample=${JSON.stringify([...new Set(samples.map((sample) => sample.labelsTexted))])}; all labels=${JSON.stringify([...new Set(samples.map((sample) => sample.labels))])}`),
        check('换新时两个图标也叠在同一格',
          swaps.length > 0 && swaps.every((sample) => (sample.iconBoxes ?? []).length === 2 && sample.iconBoxes[0] === sample.iconBoxes[1]),
          `swap frames=${JSON.stringify(swaps.map((sample) => sample.iconBoxes))}`),
        check('行首的操作标题与同一行的路径同字号、同一条基线，空的标题槽不占位',
          head.labelCentre !== null && head.pathCentre !== null &&
          head.labelSize === head.pathSize &&
          Math.abs(head.labelCentre - head.pathCentre) <= 1.5 &&
          head.labelX !== null && head.pathX !== null && head.labelX < head.pathX &&
          head.titleSlotHidden === true,
          JSON.stringify({ size: [head.labelSize, head.pathSize], centre: [head.labelCentre, head.pathCentre], x: [head.labelX, head.pathX], slotHidden: head.titleSlotHidden })),
        check('写入后再读一次的文件也只剩一行，行尾仍是它的改动',
          notesRows.length === 2 && notesRows.filter((row) => row.visible).length === 1 &&
          notesRows.find((row) => row.visible)?.op === 'read' && count(notesRows.find((row) => row.visible)?.add) >= 1,
          JSON.stringify(notesRows)),
        check('只被写一次的文件单独成行，没有被卷进合并',
          only.length === 1 && only[0].merge === null && only[0].op === 'write', JSON.stringify(only)),
        check('只被读取的文件两行合一，行尾没有数字',
          plain.length === 2 && plain.filter((row) => row.visible).length === 1 &&
          plain.every((row) => row.add === null && row.del === null) && plain.find((row) => row.visible)?.op === 'read',
          JSON.stringify(plain)),
        check('展开代表行读到的是全部改动',
          NEW_LINES.every((text) => card.includes(text)), JSON.stringify(card.slice(0, 240))),
        check('展开只被读取的那一行读到这一次读取的窗口',
          typeof readCard === 'string' && readCard.includes('# Plain') && readCard.includes('- read twice'), JSON.stringify(readCard)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { fileMergeScenario }
