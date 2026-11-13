#!/usr/bin/env node
/**
 * session-panel.mjs — the conversation's details rail on the real host (D94,
 * D92). Registered in the lane's scenario table
 * (packages/testing/scenarios.mjs).
 *
 * The rail opens itself: no header control, no guide card, no host tab. The
 * scenario sends one turn that writes four files and runs three commands, reads
 * the sections the rail shows (environment, context, session stats, token
 * usage, outputs, background work), folds the two lists, then widens and
 * narrows the window:
 * the rail retreats under the narrow frame and returns when the frame is wide
 * again. Closing it puts it away for the session and stops its asks.
 */
import copy from '../../client/src/features/session-panel/session-panel.copy.json' with { type: 'json' }
import { CONVERSATION_TABS_SELECTOR, HEADER_TITLE_ROW_SELECTOR, HEADER_TITLE_SELECTOR, HEADER_UTILITIES_SELECTOR, RIGHTBAR_TOGGLE_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { SESSION_PANEL_PATH } from '@dsh-claude-style/contracts/routes'
import { MARKS } from '../lane.mjs'
import surfaceTable from '../data/surface.json' with { type: 'json' }

/** The part mark the skin writes on a host element, read from the surface table rather than spelled here (D92). */
const PART = surfaceTable.surface.find((entry) => entry.id === 'skin.part')?.attribute
if (PART === undefined) throw new Error('session-panel: skin.part names no attribute')
import { sendPrompt, waitForTurn } from '../prompt.mjs'
import { sanitizePage } from '../../../scripts/shared/privacy.mjs'

/** Every retained capture passes the same privacy sweep as the release shots (D92). */
async function capturePanel(page, file) {
  const mask = await page.addStyleTag({ content: 'body * { visibility: hidden !important; } body .dsh-claude-details, body .dsh-claude-details * { visibility: visible !important; }' })
  try {
    await sanitizePage(expression => page.evaluate(expression))
    await page.locator('.dsh-claude-details').screenshot({ path: file })
  } finally {
    await mask.evaluate(node => node.remove())
  }
}

/** One copy key's words in the languages the package ships: the page is in one of them. */
const words = (key) => Object.values(copy[key] ?? {})
const anyOf = (values, text) => values.some((value) => text.includes(value))
/** The rail's heading names, in every language the package ships. */
const HEADINGS = {
  environment: words('environment'),
  context: words('context'),
  outputs: words('outputs'),
  changes: words('changes'),
  processes: words('jobs'),
  stats: words('sessionStats'),
  tokens: words('tokenUsage'),
}
/** The two figures sections, which start folded with one figure beside the heading (D94). */
const FOLDED_HEADINGS = [...HEADINGS.stats, ...HEADINGS.tokens]

/** The rail's headings, the sections they title, and what each holds. */
const readRail = (page) => page.evaluate(({ headings }) => {
  const rail = document.querySelector('.dsh-claude-details')
  const root = rail?.querySelector('.dsh-claude-panel') ?? null
  if (rail === null || root === null) return { mounted: false }
  const sections = [...root.querySelectorAll('.dsh-claude-panel-section')]
  const titleOf = section => section.querySelector('.dsh-claude-panel-section-title')?.textContent ?? ''
  const sectionOf = (names) => sections.find((section) => names.includes(titleOf(section)))
  return {
    mounted: true,
    headings: sections.map(titleOf),
    environment: sectionOf(headings.environment)?.textContent ?? '',
    context: [...root.querySelectorAll('.dsh-claude-panel-context-head span')].map((node) => node.textContent),
    legend: [...root.querySelectorAll('.dsh-claude-panel-legend-row')].map((row) => row.textContent),
    stats: [...root.querySelectorAll('.dsh-claude-panel-stat')].map((row) => row.textContent),
    outputs: sectionOf(headings.outputs)?.textContent ?? '',
    changes: sectionOf(headings.changes)?.textContent ?? '',
    processes: sectionOf(headings.processes)?.textContent ?? '',
    finished: sectionOf(headings.processes)?.querySelector('.dsh-claude-panel-finished-toggle')?.textContent ?? '',
    jobs: [...(sectionOf(headings.processes)?.querySelectorAll('.dsh-claude-panel-row') ?? [])].map((row) => ({
      title: row.querySelector('.dsh-claude-panel-title')?.textContent ?? '',
      detail: row.querySelector('.dsh-claude-panel-detail')?.textContent ?? '',
      side: row.querySelector('.dsh-claude-panel-side')?.textContent ?? '',
      duration: row.querySelector('.dsh-claude-panel-work-duration')?.textContent ?? '',
      execution: row.querySelector('.dsh-claude-panel-execution')?.textContent ?? '',
    })),
    preset: sectionOf(headings.environment)?.querySelector('.dsh-claude-details-preset .dsh-claude-panel-title')?.textContent ?? null,
  }
}, { headings: HEADINGS })

/** The header's preset label, the words the rail repeats: the label's own part, not the whole actions slot, which also carries the host's job and subagent chips. */
const readPreset = (page) => page.evaluate((attribute) => (document.querySelector(`[${attribute}~="header-label"]`)?.textContent ?? '').trim(), PART)

/** Whether the header's preset label is drawn: it steps aside while the rail carries its words (D94). */
const presetLabelDrawn = (page) => page.evaluate((attribute) => {
  const label = document.querySelector(`[${attribute}~="header-label"]`)
  return label === null ? null : getComputedStyle(label).visibility !== 'hidden'
}, PART)

/** The title-adjacent actions: whether the host's own subagent and job chips are on the page. */
const readHeaderActions = (page) => page.evaluate(() => {
  const actions = document.querySelector('[data-slot="conversation.session.header.actions"]')
  const visible = (selector) => [...document.querySelectorAll(selector)].filter((node) => node.checkVisibility()).length
  return {
    exists: actions !== null,
    expanded: visible('[data-slot="conversation.session.header.actions"] button[aria-expanded]'),
    tree: visible('[data-slot="conversation.session.header.actions"] button[aria-haspopup="tree"]'),
  }
})

/** The header's controls: their names and the pressed state the details control carries. */
const readUtilities = (page) => page.evaluate(() => [...document.querySelectorAll('[data-slot="conversation.session.header.utilities"] button')]
  .map((node) => ({ label: node.getAttribute('aria-label'), pressed: node.getAttribute('aria-pressed') })))

/** Press the header's details control. */
async function pressDetails(page) {
  await page.evaluate(() => {
    const target = [...document.querySelectorAll('[data-slot="conversation.session.header.utilities"] button')]
      .find((node) => /details|详情/i.test(node.getAttribute('aria-label') ?? ''))
    target?.click()
  })
  await page.waitForTimeout(600)
}

/** Whether the rail stands on the page right now. */
const railMounted = (page) => page.evaluate(() => document.querySelector('.dsh-claude-details') !== null)

/** Whether the rail holds the chat's width: the conversation's body gives it up from its own margin, under a header that keeps the column whole (D94). */
const railSqueezes = (page) => page.evaluate((attribute) => {
  const body = document.querySelector(`[${attribute}~="conversation-body"]`)
  return body !== null && Math.round(Number.parseFloat(getComputedStyle(body).marginRight)) === 320
}, PART)

/**
 * The host's own right column: the width it holds, the words on its control, and
 * what the skin's rail does while it stands.
 */
const readRightPanel = (page) => page.evaluate((attribute) => {
  const column = document.querySelector('[data-rightbar-col]')
  const body = document.querySelector(`[${attribute}~="conversation-body"]`)
  const toggle = [...document.querySelectorAll('button')]
    .find((node) => /右侧边栏|right panel/i.test(node.getAttribute('aria-label') ?? node.getAttribute('title') ?? ''))
  return {
    width: column === null ? 0 : Math.round(column.getBoundingClientRect().width),
    toggle: toggle?.getAttribute('aria-label') ?? toggle?.getAttribute('title') ?? null,
    rail: document.querySelector('.dsh-claude-details') !== null,
    squeezed: body !== null && Math.round(Number.parseFloat(getComputedStyle(body).marginRight)) === 320,
  }
}, PART)

/**
 * Press the host's own control for its right column: the control the contract
 * names, which is the header one, rather than the first button that mentions a
 * right panel (the column carries controls of its own).
 */
async function pressRightPanel(page) {
  await page.evaluate((selector) => {
    const toggle = document.querySelector(selector) ??
      [...document.querySelectorAll('button')].find((node) => /右侧边栏|right panel/i.test(node.getAttribute('aria-label') ?? node.getAttribute('title') ?? ''))
    toggle?.click()
  }, RIGHTBAR_TOGGLE_SELECTOR)
  await page.waitForTimeout(700)
}

/** Native section states and the readings a reader sees with the rows put away. */
const readDisclosures = page => page.evaluate(() => [...document.querySelectorAll('.dsh-claude-details .dsh-claude-panel-section')].map(section => ({
  title: section.querySelector('.dsh-claude-panel-section-title')?.textContent ?? '',
  open: section.open,
  content: section.querySelector('.dsh-claude-panel-section-content')?.checkVisibility() ?? false,
  reading: section.querySelector('.dsh-claude-panel-section-reading')?.innerText ?? '',
})))

/**
 * The scenario.
 * @param options.check - the lane's check factory.
 * @returns the scenario body the runner drives.
 */
export function sessionPanelScenario({ check }) {
  const commandTool = process.platform === 'win32' ? 'pwsh' : 'bash'
  return {
    script: {
      conversation: [
        // Four files, so Outputs has to fold its fourth behind its own control.
        { thinking: ['Leave the rail four files of the turn.'], tool: { name: 'write', input: { file_path: '{{workspace}}/panel-note.md', content: '# Panel note\n\nA file the session rail lists.\n' } } },
        { thinking: ['Second file.'], tool: { name: 'write', input: { file_path: '{{workspace}}/panel-two.md', content: '# Two\n' } } },
        { thinking: ['Third file.'], tool: { name: 'write', input: { file_path: '{{workspace}}/panel-three.md', content: '# Three\n' } } },
        { thinking: ['Fourth file.'], tool: { name: 'write', input: { file_path: '{{workspace}}/panel four.md', content: '# Four\n' } } },
        // Commands and outputs belong to the same user round; each list folds on its own.
        { thinking: ['First command.'], tool: { name: commandTool, input: { command: 'echo panel-command-one', description: 'panel-command-one' } } },
        { thinking: ['Second command.'], tool: { name: commandTool, input: { command: 'echo panel-command-two', description: 'panel-command-two' } } },
        { thinking: ['Third command.'], tool: { name: commandTool, input: { command: 'echo panel-command-three', description: 'panel-command-three' } } },
        { thinking: ['The commands ran.'], text: ['Wrote four files and ran three commands.\n'] },
        // A new human prompt replaces outputs and adds a live command to the session history.
        { thinking: ['Latest output.'], tool: { name: 'write', input: { file_path: '{{workspace}}/panel-latest.md', content: '# Latest round\n' } } },
        { thinking: ['Latest command.'], tool: { name: commandTool, input: { command: 'echo panel-command-latest', description: 'panel-command-latest' } } },
        { thinking: ['A job the reader can cancel.'], tool: { name: commandTool, input: {
          command: process.platform === 'win32' ? 'Write-Output panel-stop-latest; Start-Sleep -Seconds 120' : 'echo panel-stop-latest; sleep 120',
          description: 'panel-stop-latest', run_in_background: true,
        } } },
        { thinking: ['Latest round is ready.'], text: ['Latest file and jobs are ready.\n'] },
      ],
      auxiliary: { text: ['Scripted rail turn'] },
    },
    prompt: 'Write the rail note and start the background job.',
    delayMs: 60,
    // Wide enough for the rail's own threshold (the conversation column keeps 1160px).
    viewport: { width: 1440, height: 900 },

    async beforeSend(context) {
      const { page } = context
      const notes = context.notes
      // Every ask the rail makes, so a closed rail can be shown quiet.
      notes.panelAsks = []
      page.on('request', (request) => {
        if (request.url().includes(SESSION_PANEL_PATH)) notes.panelAsks.push(Date.now())
      })
      // A new conversation has no turn yet: the rail stays away until one lands.
      notes.heroRail = {
        rail: await railMounted(page),
        squeezed: await railSqueezes(page),
      }
    },

    /**
     * The scripted answer streams while the rail stands. The two figures tables
     * print the same live reading the composer's line prints — the host's settled
     * projections with the streaming text added — so a count moves between the
     * panel's own asks; a table fed from the route alone can only move after one
     * (D94).
     */
    async duringTurn(context) {
      const { page } = context
      const notes = context.notes
      await page.waitForSelector('.dsh-claude-details', { timeout: 20000 })
      const read = () => page.evaluate(() => {
        const rail = document.querySelector('.dsh-claude-details')
        if (rail === null) return null
        const rows = [...rail.querySelectorAll('.dsh-claude-panel-row, .dsh-claude-panel-stat')]
        const pick = (pattern) => {
          const row = rows.find(node => pattern.test(node.textContent ?? ''))
          return row ? (row.textContent ?? '').replace(/\s+/g, ' ').trim() : null
        }
        return { out: pick(/^输出[\d,]/), cost: pick(/^费用/) }
      })
      const samples = []
      for (let i = 0; i < 24; i++) {
        const reading = await read()
        if (reading === null) break
        samples.push({ ...reading, asks: notes.panelAsks.length })
        await page.waitForTimeout(150)
      }
      // A change no ask stands behind is the live reading moving the table; one
      // that follows an ask is the route answering.
      const movedAlone = samples.some((sample, index) => index > 0 &&
        sample.asks === samples[index - 1].asks &&
        (sample.out !== samples[index - 1].out || sample.cost !== samples[index - 1].cost))
      notes.liveFigures = { movedAlone, samples: samples.slice(0, 12) }
    },

    async afterTurn(context) {
      const { page } = context
      const notes = context.notes
      await page.waitForSelector('.dsh-claude-details', { timeout: 20000 })
      await page.waitForFunction(() => /panel four\.md/.test(document.querySelector('.dsh-claude-details')?.textContent ?? ''), undefined, { timeout: 30000 })
      // Background tasks catches up on its own poll; the third command starts
      // folded, so the second one is what says it arrived.
      await page.waitForFunction(() => /panel-command-three/.test(document.querySelector('.dsh-claude-details')?.textContent ?? ''), undefined, { timeout: 30000 })
      // The header's own control leads to the rail; the guide card does not
      // (the rail is not a right-column tab any more).
      notes.entry = await page.evaluate(() => ({
        header: [...document.querySelectorAll('[data-slot="conversation.session.header.utilities"] button')]
          .some((node) => /details|详情/i.test(node.getAttribute('aria-label') ?? '')),
        guide: document.querySelector('[data-sidebar-right-guide-entry="claude-session-overview"]') === null,
      }))
      notes.preset = await readPreset(page)
      notes.presetLabel = { standing: await presetLabelDrawn(page) }
      notes.rail = await readRail(page)
      // Section controls are independent, retain their choice through a poll,
      // and keep the browser's Enter and Space activation (D94). The two
      // figures sections start folded, so only the open ones are pressed shut.
      const sectionToggles = page.locator('.dsh-claude-details .dsh-claude-panel-section > summary')
      notes.disclosures = { initial: await readDisclosures(page) }
      const refreshed = page.waitForResponse(response => response.url().includes(SESSION_PANEL_PATH) && response.ok())
      // The section that closes leaves the open set, so the last one is pressed
      // first: closing it keeps every earlier index pointing at the same
      // summary, while closing from the front would shift them all.
      const openSections = await page.locator('.dsh-claude-details .dsh-claude-panel-section[open] > summary').all()
      for (const toggle of openSections.reverse()) await toggle.click()
      await refreshed
      notes.disclosures.closed = await readDisclosures(page)
      await sectionToggles.first().focus()
      await page.keyboard.press('Enter')
      notes.disclosures.single = await readDisclosures(page)
      await page.keyboard.press('Space')
      for (const toggle of await sectionToggles.all()) await toggle.click()
      notes.disclosures.reopened = await readDisclosures(page)
      // Outputs folds its fourth row behind its own control.
      notes.fold = await page.evaluate(() => {
        const section = [...document.querySelectorAll('.dsh-claude-details .dsh-claude-panel-section')].find((candidate) => /产出|Outputs/.test(candidate.querySelector('.dsh-claude-panel-heading')?.textContent ?? ''))
        if (section === undefined) return null
        const count = () => [...section.querySelectorAll('.dsh-claude-panel-row.is-button')].filter((row) => row.checkVisibility()).length
        return { rows: count(), more: section.querySelector('.dsh-claude-panel-more')?.textContent ?? null }
      })
      if (notes.fold !== null && notes.fold.more !== null) {
        const section = page.locator('.dsh-claude-details .dsh-claude-panel-section').filter({ hasText: /产出|Outputs/ }).first()
        await section.locator('.dsh-claude-panel-more').click()
        await page.waitForTimeout(300)
        notes.fold.expanded = await page.evaluate(() => {
          const section = [...document.querySelectorAll('.dsh-claude-details .dsh-claude-panel-section')].find((candidate) => /产出|Outputs/.test(candidate.querySelector('.dsh-claude-panel-heading')?.textContent ?? ''))
          return section === undefined ? null : [...section.querySelectorAll('.dsh-claude-panel-row.is-button')].filter((row) => row.checkVisibility()).length
        })
        await section.locator('.dsh-claude-panel-more').click()
        await page.waitForTimeout(300)
        notes.fold.collapsed = await page.evaluate(() => {
          const section = [...document.querySelectorAll('.dsh-claude-details .dsh-claude-panel-section')].find((candidate) => /产出|Outputs/.test(candidate.querySelector('.dsh-claude-panel-heading')?.textContent ?? ''))
          return section === undefined ? null : [...section.querySelectorAll('.dsh-claude-panel-row.is-button')].filter((row) => row.checkVisibility()).length
        })
      }
      // Settled commands share one disclosure; active commands stay above it.
      const groupFold = page.locator('.dsh-claude-details .dsh-claude-panel-finished-toggle').first()
      if (await groupFold.count() > 0) {
        const groupRows = () => page.locator('.dsh-claude-details .dsh-claude-panel-work-row:visible').count()
        notes.groupFold = { rows: await groupRows() }
        await groupFold.click()
        await page.waitForTimeout(300)
        notes.groupFold.expanded = await groupRows()
        await groupFold.click()
        await page.waitForTimeout(300)
        notes.groupFold.collapsed = await groupRows()
      }
      // The view switch stands on the title's own line while the rail squeezes
      // the column.
      notes.layout = await page.evaluate((marks) => {
        const box = (el) => { if (el === null) return null; const rect = el.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height } }
        const strip = document.querySelector(marks.strip)
        return {
          titleRow: box(document.querySelector(marks.titleRow)),
          title: box(document.querySelector(marks.title)),
          utilities: box(document.querySelector(marks.utilities)),
          tablist: box(document.querySelector(marks.tablist)),
          column: box(document.querySelector(marks.column)),
          header: box(document.querySelector(marks.header)),
          rail: box(document.querySelector('.dsh-claude-details')),
          shiftX: strip?.getAttribute('style') ?? '',
        }
      }, {
        strip: MARKS.viewTabsStrip,
        titleRow: HEADER_TITLE_ROW_SELECTOR,
        title: HEADER_TITLE_SELECTOR,
        utilities: HEADER_UTILITIES_SELECTOR,
        tablist: CONVERSATION_TABS_SELECTOR,
        column: `[${PART}~="center-column"]`,
        header: `[${PART}~="conversation-header"]`,
      })
      notes.headerActions = await readHeaderActions(page)
      // A job row opens its retained output in place and closes again.
      await groupFold.click()
      notes.jobOpened = await page.evaluate(() => {
        const target = [...document.querySelectorAll('.dsh-claude-details .dsh-claude-panel-row.is-button')].find((row) => /panel-command-three/.test(row.textContent ?? ''))
        target?.click()
        return target !== undefined
      })
      await page.waitForSelector('.dsh-claude-panel-job-output', { timeout: 15000 }).catch(() => {})
      notes.jobOutput = await page.evaluate(() => document.querySelector('.dsh-claude-panel-job-output')?.textContent ?? null)
      if (notes.jobOpened) {
        await page.evaluate(() => {
          const target = [...document.querySelectorAll('.dsh-claude-details .dsh-claude-panel-row.is-button')].find((row) => /panel-command-three/.test(row.textContent ?? ''))
          target?.click()
        })
        await page.waitForTimeout(300)
      }
      notes.jobClosed = await page.evaluate(() => document.querySelector('.dsh-claude-panel-job-output') === null)
      notes.utilitiesOpen = await readUtilities(page)
      // The figures are the host's own words: exact grouped counts, no compact
      // k/M suffix; and the environment answers the working folder, never the
      // repositories lying beside it (D94).
      notes.wording = await page.evaluate(async (path) => {
        const id = document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? ''
        const response = await fetch(`${path}?id=${encodeURIComponent(id)}`, { credentials: 'same-origin', headers: { accept: 'application/json' } })
        const answer = await response.json()
        const environment = answer?.value?.environment ?? null
        return {
          keys: environment === null ? null : Object.keys(environment).sort(),
          rows: [...document.querySelectorAll('.dsh-claude-details .dsh-claude-panel-stat')].map((row) => row.textContent.replace(/\s+/g, ' ').trim()),
        }
      }, SESSION_PANEL_PATH)
      // The column narrows under its own width: the rail steps back, and comes
      // back when the frame widens again.
      await page.setViewportSize({ width: 1160, height: 900 })
      await page.waitForTimeout(700)
      notes.narrow = await railMounted(page)
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.waitForTimeout(900)
      notes.wide = await railMounted(page)
      // The header's control closes the rail and opens it again, even in a
      // frame narrow enough for the auto rule to keep it away.
      await pressDetails(page)
      notes.closed = {
        rail: await railMounted(page),
        squeezed: await railSqueezes(page),
      }
      notes.utilitiesClosed = await readUtilities(page)
      notes.presetLabel.closed = await presetLabelDrawn(page)
      await pressDetails(page)
      notes.reopened = await railMounted(page)
      notes.utilitiesReopened = await readUtilities(page)
      const quiet = notes.panelAsks.length
      await pressDetails(page)
      await page.waitForTimeout(2500)
      notes.closedAsks = notes.panelAsks.length - quiet
      // The output opens through the host's preview controller without a browser tab.
      await pressDetails(page)
      notes.themes = []
      for (const theme of ['light', 'dark']) {
        await page.evaluate(value => document.body.toggleAttribute('data-ds-dark-theme', value === 'dark'), theme)
        await page.waitForTimeout(150)
        notes.themes.push(await page.evaluate(value => {
          const rail = document.querySelector('.dsh-claude-details')
          const box = rail.getBoundingClientRect()
          return { theme: value, width: box.width, inside: box.left >= 0 && box.right <= innerWidth, background: getComputedStyle(rail).backgroundColor }
        }, theme))
        if (context.out !== undefined) await capturePanel(page, `${context.out}/session-panel-${theme}.png`)
        const toggles = page.locator('.dsh-claude-details .dsh-claude-panel-section > summary')
        for (const toggle of await toggles.all()) await toggle.click()
        if (context.out !== undefined) await capturePanel(page, `${context.out}/session-panel-collapsed-${theme}.png`)
        for (const toggle of await toggles.all()) await toggle.click()
      }
      // The host's own right column stands on this side as well: the rail keeps
      // away while that column holds width, and the header's control hands the
      // side over by closing it first (D94).
      // The host keeps its own right column's place across the sessions in this
      // home: a panel an earlier scenario left open frames the handover below.
      // The walk starts from the column put away, and its control names the
      // state it is in (「收起…」 while it stands).
      const panelBefore = await readRightPanel(page)
      if (/收起|collapse|close/i.test(panelBefore.toggle ?? '')) await pressRightPanel(page)
      notes.rightPanel = await readRightPanel(page)
      await pressRightPanel(page)
      notes.rightPanelOpen = await readRightPanel(page)
      // Whether the host's own column has a seat to show at all: the skin's rail
      // took the guide seat, so a panel opened after that can come up empty.
      notes.hostPanelTakes = (notes.rightPanelOpen?.width ?? 0) > 0
      await pressDetails(page)
      await page.waitForTimeout(500)
      notes.rightPanelHanded = await readRightPanel(page)
      // The rail the handover just called in. A press that did not bring it back
      // is what the handover's own check reports; this walk keeps going by
      // pressing again, the way a reader would, so the rest of the rail is still
      // read and the failing check is the one that names the handover.
      await page.waitForTimeout(300)
      notes.railAfterHandover = { mounted: await railMounted(page), utilities: await readUtilities(page) }
      if (!await railMounted(page)) {
        notes.handoverRepaired = true
        await pressDetails(page)
        await page.waitForTimeout(600)
        notes.railAfterRepair = await railMounted(page)
      }
      const pagesBefore = page.context().pages().length
      const outputs = page.locator('.dsh-claude-details .dsh-claude-panel-section').filter({ hasText: /产出|Outputs/ }).first()
      // The section may still stand folded from the theme walk: open it, then
      // open the rows it folds past its second, as the reader does. Which row
      // files the fourth file depends on the order the host reports the writes.
      if (!await outputs.evaluate((section) => /** @type {HTMLDetailsElement} */ (section).open)) await outputs.locator('summary').first().click()
      const moreOutputs = outputs.locator('.dsh-claude-panel-more')
      if (await moreOutputs.count() > 0 && await moreOutputs.isVisible()) await moreOutputs.click()
      await outputs.locator('button.dsh-claude-panel-row').filter({ hasText: 'panel four.md' }).click()
      await page.waitForFunction(() => {
        const preview = document.querySelector('[data-sidebar-right-open]')
        return preview !== null && /panel four\.md/.test(preview.textContent ?? '') && /Four/.test(preview.textContent ?? '')
      }, undefined, { timeout: 15000 })
      notes.filePreview = await page.evaluate(() => document.querySelector('[data-sidebar-right-open]')?.textContent ?? '')
      notes.extraPages = page.context().pages().length - pagesBefore
      await pressRightPanel(page)
      await sendPrompt(page, 'Write the latest file and start the cancellable job.')
      await waitForTurn(page)
      await page.waitForFunction(() => /panel-latest\.md/.test(document.querySelector('.dsh-claude-details')?.textContent ?? ''), undefined, { timeout: 30000 })
      // The process section catches up on its own poll, so the new job's line
      // is what says it arrived (the first round waits the same way).
      await page.waitForFunction(() => /panel-command-latest/.test(document.querySelector('.dsh-claude-details')?.textContent ?? ''), undefined, { timeout: 30000 })
      notes.latestRound = await readRail(page)
      const jobLine = page.locator('.dsh-claude-panel-job-line').filter({ hasText: 'panel-stop-latest' }).first()
      const stop = jobLine.locator('.dsh-claude-panel-job-stop')
      await stop.waitFor({ state: 'visible' })
      if (context.out !== undefined) {
        for (const theme of ['light', 'dark']) {
          await page.evaluate(value => document.body.toggleAttribute('data-ds-dark-theme', value === 'dark'), theme)
          await sanitizePage(expression => page.evaluate(expression))
          await page.locator('.dsh-claude-panel-work-section').first().screenshot({ path: `${context.out}/session-process-running-${theme}.png` })
        }
      }
      await stop.click()
      notes.stopConfirm = await stop.textContent()
      notes.stopDidNotExpand = await jobLine.locator('.dsh-claude-panel-row').getAttribute('aria-expanded') === 'false'
      await jobLine.locator('.dsh-claude-panel-row').focus()
      notes.stopBlurCleared = await stop.getAttribute('aria-label') !== notes.stopConfirm
      await stop.click()
      await stop.click()
      await stop.waitFor({ state: 'detached', timeout: 30000 })
      notes.stopFinished = await page.evaluate(async (path) => {
        const id = document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? ''
        const response = await fetch(`${path}?id=${encodeURIComponent(id)}&live=1`, { credentials: 'same-origin' })
        const answer = await response.json()
        return answer.value?.background?.jobs?.find(job => job.label.includes('panel-stop-latest'))?.status ?? null
      }, SESSION_PANEL_PATH)
      // The rail's first frame states the occupancy it already holds, while the
      // route's fold — the breakdown under it — is still on its way. Holding the
      // ask makes that frame something the walk can read (D94).
      const held = '**/dsh-claude-style/session-panel**'
      await page.route(held, async (route) => {
        await new Promise(resolve => setTimeout(resolve, 3000))
        await route.continue()
      })
      await page.reload()
      await page.waitForFunction(() => {
        const rail = document.querySelector('.dsh-claude-details')
        return rail !== null && /%/.test(rail.textContent ?? '')
      }, undefined, { timeout: 20000 })
      notes.firstFrame = await page.evaluate(() => {
        const rail = document.querySelector('.dsh-claude-details')
        const text = (rail?.textContent ?? '').replace(/\s+/g, ' ')
        return {
          occupancy: /\d+(\.\d+)?%/.test(text),
          pending: /正在读取上下文分项|Loading the context breakdown/.test(text),
          sections: rail?.querySelectorAll('.dsh-claude-panel-section').length ?? 0,
          text: text.slice(0, 200),
        }
      })
      await page.unroute(held)
    },

    async assert({ notes }) {
      const rail = notes.rail ?? {}
      /** One check of the hand-over: an observation while the host's column has no seat to show. */
      const hostPanelCheck = (name, ok, detail) => ({ ...check(name, ok, detail), observation: notes.hostPanelTakes !== true })
      const environmentWords = words('environment')
      const contextWords = words('context')
      const outputsWords = words('outputs')
      const changesWords = words('changes')
      const processWords = words('jobs')
      const statsWords = words('sessionStats')
      return [
        check('the header control leads to the rail and no guide card does',
          notes.entry?.header === true && notes.entry?.guide === true,
          JSON.stringify(notes.entry ?? null)),
        check('a new conversation opens no rail and squeezes nothing',
          notes.heroRail?.rail === false && notes.heroRail?.squeezed === false,
          JSON.stringify(notes.heroRail ?? null)),
        check('the details rail opens itself beside the conversation', rail.mounted === true, JSON.stringify({ mounted: rail.mounted })),
        check('the rail shows the environment first', anyOf(environmentWords, (rail.headings ?? []).join('|')), JSON.stringify(rail.headings ?? null)),
        check('the rail names the working directory', /workspace/.test(rail.environment ?? ''), (rail.environment ?? '').slice(0, 160)),
        check('the context section arrives with the turn', anyOf(contextWords, (rail.headings ?? []).join('|')) && (rail.context ?? []).length >= 2, JSON.stringify(rail.context ?? null)),
        check('the first frame states the occupancy and leaves only the breakdown to arrive',
          notes.firstFrame?.occupancy === true && notes.firstFrame?.pending === true && notes.firstFrame?.sections === 1,
          JSON.stringify(notes.firstFrame ?? null)),
        check('the environment section carries the preset text from the header',
          (rail.preset ?? '') !== '' && (rail.preset ?? '') === (notes.preset ?? ''),
          JSON.stringify({ rail: rail.preset ?? null, header: notes.preset ?? null })),
        check('the header\'s preset label steps aside while the rail stands and returns when it closes',
          notes.presetLabel?.standing === false && notes.presetLabel?.closed === true,
          JSON.stringify(notes.presetLabel ?? null)),
        check('the figures sections start folded with a reading and every other section starts open',
          notes.disclosures?.initial?.length === rail.headings?.length &&
            notes.disclosures.initial.filter(section => FOLDED_HEADINGS.includes(section.title)).length === 2 &&
            notes.disclosures.initial.every(section => (FOLDED_HEADINGS.includes(section.title)
              ? !section.open && !section.content && section.reading !== ''
              : section.open && section.content)),
          JSON.stringify(notes.disclosures?.initial ?? null)),
        check('every section folds to its own reading and stays folded through a poll',
          notes.disclosures?.closed?.length === rail.headings?.length &&
            notes.disclosures.closed.every(section => !section.open && !section.content && section.reading !== ''),
          JSON.stringify(notes.disclosures ?? null)),
        check('keyboard activation opens one section independently and all sections open again',
          notes.disclosures?.single?.[0]?.open === true && notes.disclosures.single.slice(1).every(section => !section.open) &&
            notes.disclosures.reopened?.every(section => section.open && section.content),
          JSON.stringify(notes.disclosures ?? null)),
        check('the session stats and the token usage carry their figures',
          anyOf(statsWords, (rail.headings ?? []).join('|')) && anyOf(HEADINGS.tokens, (rail.headings ?? []).join('|')) && (rail.stats ?? []).length >= 8 &&
            anyOf(words('statsModelTime'), (rail.stats ?? []).join('|')) && anyOf(words('statsCost'), (rail.stats ?? []).join('|')),
          JSON.stringify((rail.stats ?? []).slice(0, 12))),
        check('the figures move with the answer while it streams, not only when the route answers',
          notes.liveFigures?.movedAlone === true,
          JSON.stringify(notes.liveFigures ?? null)),
        check('Outputs lists the files the turn wrote and folds past its second row',
          (notes.fold?.rows ?? 0) === 2 && /panel four\.md/.test(rail.outputs ?? '') && notes.fold?.more !== null,
          JSON.stringify(notes.fold ?? null)),
        check('the fold control shows the rest and puts them away again', notes.fold?.expanded === 4 && notes.fold?.collapsed === 2, JSON.stringify({ expanded: notes.fold?.expanded, collapsed: notes.fold?.collapsed })),
        check('Changes stays off the page without a change request', !anyOf(changesWords, (rail.headings ?? []).join('|')), JSON.stringify(rail.headings ?? null)),
        check('Processes is its own section and settled commands share a finished count',
          anyOf(processWords, (rail.headings ?? []).join('|')) && /panel-command-three/.test(rail.processes ?? '') && /3/.test(rail.finished ?? ''),
          JSON.stringify({ headings: rail.headings, finished: rail.finished })),
        check('the finished disclosure reveals command history and folds it independently',
          notes.groupFold?.rows === 0 && notes.groupFold?.expanded === 3 && notes.groupFold?.collapsed === 0,
          JSON.stringify(notes.groupFold ?? null)),
        check('a finished command keeps a separate clock and its foreground provenance',
          (rail.jobs ?? []).length >= 2 && rail.jobs.every(job => job.duration !== '' && words('processForeground').includes(job.execution)),
          JSON.stringify((rail.jobs ?? []).slice(0, 3))),
        check('a new user round replaces outputs while command history spans the session',
          /panel-latest\.md/.test(notes.latestRound?.outputs ?? '') && !/panel four\.md/.test(notes.latestRound?.outputs ?? '') &&
            /panel-command-latest/.test(notes.latestRound?.processes ?? '') && /panel-command-three/.test(notes.latestRound?.processes ?? ''),
          JSON.stringify({ outputs: notes.latestRound?.outputs, processes: notes.latestRound?.processes })),
        check('stopping confirms independently of output disclosure and cancels the job',
          words('confirmStop').includes(notes.stopConfirm) && notes.stopDidNotExpand === true && notes.stopBlurCleared === true && notes.stopFinished === 'killed',
          JSON.stringify({ confirm: notes.stopConfirm, independent: notes.stopDidNotExpand, blur: notes.stopBlurCleared, status: notes.stopFinished })),
        check('a job row opens its retained output in place', notes.jobOpened === true && (notes.jobOutput ?? '').trim() !== '', JSON.stringify({ opened: notes.jobOpened, output: (notes.jobOutput ?? '').slice(0, 80) })),
        check('the job row closes its output again', notes.jobClosed === true, String(notes.jobClosed)),
        check('the view switch stands on the title\'s own line, clear of the title and the utilities',
          notes.layout?.titleRow !== null && notes.layout?.tablist !== null &&
            notes.layout.tablist.top >= notes.layout.titleRow.top - 2 &&
            notes.layout.tablist.bottom <= notes.layout.titleRow.bottom + 2 &&
            notes.layout.tablist.left >= notes.layout.title.right + 4 &&
            (notes.layout.utilities === null || notes.layout.tablist.right <= notes.layout.utilities.left - 4),
          JSON.stringify(notes.layout ?? null)),
        check('the header keeps the column whole and the rail starts under it',
          notes.layout?.column !== null && notes.layout?.header !== null && notes.layout?.rail !== null &&
            notes.layout.header.right >= notes.layout.column.right - 1 &&
            notes.layout.rail.right >= notes.layout.column.right - 1 &&
            notes.layout.rail.top >= notes.layout.header.bottom - 1,
          JSON.stringify({ column: notes.layout?.column ?? null, header: notes.layout?.header ?? null, rail: notes.layout?.rail ?? null })),
        check('the host header chips step aside while the rail stands',
          notes.headerActions?.exists === false || (notes.headerActions.expanded === 0 && notes.headerActions.tree === 0),
          JSON.stringify(notes.headerActions ?? null)),
        check('a narrow frame puts the rail away and a wide one brings it back', notes.narrow === false && notes.wide === true, JSON.stringify({ narrow: notes.narrow, wide: notes.wide })),
        check('the header control shows the rail as pressed while it stands',
          notes.utilitiesOpen?.find((entry) => entry.pressed === 'true' && /details|详情/i.test(entry.label ?? '')) !== undefined,
          JSON.stringify(notes.utilitiesOpen ?? null)),
        check('the header control closes the rail, drops its pressed mark and gives the width back',
          notes.closed?.rail === false && notes.closed?.squeezed === false && (notes.utilitiesClosed ?? []).find((entry) => /details|详情/i.test(entry.label ?? ''))?.pressed === 'false',
          JSON.stringify({ closed: notes.closed ?? null, utilities: notes.utilitiesClosed ?? null })),
        check('the header control opens the rail again, narrow frame or not',
          notes.reopened === true && (notes.utilitiesReopened ?? []).find((entry) => /details|详情/i.test(entry.label ?? ''))?.pressed === 'true',
          JSON.stringify({ reopened: notes.reopened, utilities: notes.utilitiesReopened ?? null })),
        check('a closed rail stops asking the host', notes.closedAsks === 0, JSON.stringify({ asks: notes.closedAsks })),
        check('the details rail stays inside the viewport in both themes',
          notes.themes?.length === 2 && notes.themes.every(theme => theme.width === 320 && theme.inside) && notes.themes[0].background !== notes.themes[1].background,
          JSON.stringify(notes.themes)),
        // The host's own right column only frames a hand-over while it has a
        // seat of its own to show; the skin's rail has taken the guide seat, and
        // on a host whose panel then opens empty the column takes no width and
        // no side. That case is reported as an observation rather than a
        // failure: nothing about the rail's side was exercised.
        hostPanelCheck('the host right panel takes the side and the rail keeps away',
          notes.rightPanel?.width === 0 && notes.hostPanelTakes === true &&
            notes.rightPanelOpen?.rail === false && notes.rightPanelOpen?.squeezed === false,
          JSON.stringify({ before: notes.rightPanel ?? null, opened: notes.rightPanelOpen ?? null })),
        hostPanelCheck('the details control closes the host right panel before the rail stands',
          notes.rightPanelHanded?.width === 0 && notes.rightPanelHanded?.rail === true,
          JSON.stringify(notes.rightPanelHanded ?? null)),
        check('the figures read in the host\'s own words, with grouped counts and no compact suffix',
          (notes.wording?.rows ?? []).some(row => /\d{1,3}(,\d{3})+ tok$/.test(row)) &&
            !(notes.wording?.rows ?? []).some(row => /\d[.,\d]*\s*(k|M|B) tok$/.test(row)),
          JSON.stringify((notes.wording?.rows ?? []).slice(0, 12))),
        check('the environment answers the working folder, not the repositories around it',
          Array.isArray(notes.wording?.keys) && notes.wording.keys.includes('checkout') && !notes.wording.keys.includes('repositories'),
          JSON.stringify(notes.wording?.keys ?? null)),
        check('an output opens its file in the host preview without another browser tab',
          /panel four\.md/.test(notes.filePreview ?? '') && /Four/.test(notes.filePreview ?? '') && notes.extraPages === 0,
          JSON.stringify({ preview: notes.filePreview, extraPages: notes.extraPages })),
      ]
    },
  }
}
