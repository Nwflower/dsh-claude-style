#!/usr/bin/env node
/**
 * session-panel.mjs — the conversation's details rail on the real host (D94,
 * D92). Registered in the lane's scenario table
 * (packages/testing/scenarios.mjs).
 *
 * The rail opens itself: no header control, no guide card, no host tab. The
 * scenario sends one turn that writes four files and runs three commands, reads
 * the sections the rail shows (environment, context, session stats, outputs,
 * background work), folds the two lists, then widens and narrows the window:
 * the rail retreats under the narrow frame and returns when the frame is wide
 * again. Closing it puts it away for the session and stops its asks.
 */
import copy from '../../client/src/features/session-panel/session-panel.copy.json' with { type: 'json' }
import { CONVERSATION_TABS_SELECTOR, HEADER_TITLE_ROW_SELECTOR, HEADER_TITLE_SELECTOR, HEADER_UTILITIES_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { SESSION_PANEL_PATH } from '@dsh-claude-style/contracts/routes'
import { MARKS } from '../lane.mjs'
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
  background: words('background'),
  stats: words('sessionStats'),
}

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
    background: sectionOf(headings.background)?.textContent ?? '',
    groups: [...(sectionOf(headings.background)?.querySelectorAll('.dsh-claude-panel-group') ?? [])].map((group) => ({
      title: group.querySelector('.dsh-claude-panel-group-title')?.textContent ?? '',
      rows: group.querySelectorAll('.dsh-claude-panel-row').length,
      more: group.querySelector('.dsh-claude-panel-more')?.textContent ?? null,
    })),
    chips: [...root.querySelectorAll('.dsh-claude-panel-chip')].map((node) => node.textContent),
    preset: sectionOf(headings.environment)?.querySelector('.dsh-claude-details-preset')?.textContent ?? null,
  }
}, { headings: HEADINGS })

/** The header's preset label, the words the rail repeats. */
const readPreset = (page) => page.evaluate(() => (document.querySelector('[data-slot="conversation.session.header.actions"]')?.textContent ?? '').trim())

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

/**
 * The host's own right column: the width it holds, the words on its control, and
 * what the skin's rail does while it stands.
 */
const readRightPanel = (page) => page.evaluate(() => {
  const column = document.querySelector('[data-rightbar-col]')
  const toggle = [...document.querySelectorAll('button')]
    .find((node) => /右侧边栏|right panel/i.test(node.getAttribute('aria-label') ?? node.getAttribute('title') ?? ''))
  return {
    width: column === null ? 0 : Math.round(column.getBoundingClientRect().width),
    toggle: toggle?.getAttribute('aria-label') ?? toggle?.getAttribute('title') ?? null,
    rail: document.querySelector('.dsh-claude-details') !== null,
    squeezed: [...document.querySelectorAll('div')].some((node) => getComputedStyle(node).paddingRight === '320px'),
  }
})

/** Press the host's own control for its right column. */
async function pressRightPanel(page) {
  await page.evaluate(() => {
    const toggle = [...document.querySelectorAll('button')]
      .find((node) => /右侧边栏|right panel/i.test(node.getAttribute('aria-label') ?? node.getAttribute('title') ?? ''))
    toggle?.click()
  })
  await page.waitForTimeout(700)
}

/** Native section states and the readings a reader sees with the rows put away. */
const readDisclosures = page => page.evaluate(() => [...document.querySelectorAll('.dsh-claude-details details')].map(section => ({
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
        { thinking: ['The files are written.'], text: ['Wrote four files.\n'] },
        // The second prompt runs three commands: the rail keeps all three in
        // its job history, and the third folds behind the first two.
        { thinking: ['First command.'], tool: { name: commandTool, input: { command: 'echo panel-command-one', description: 'print the first rail line' } } },
        { thinking: ['Second command.'], tool: { name: commandTool, input: { command: 'echo panel-command-two', description: 'print the second rail line' } } },
        { thinking: ['Third command.'], tool: { name: commandTool, input: { command: 'echo panel-command-three', description: 'print the third rail line' } } },
        { thinking: ['The commands ran.'], text: ['Ran three commands.\n'] },
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
      notes.heroRail = await page.evaluate(() => ({
        rail: document.querySelector('.dsh-claude-details') !== null,
        squeezed: [...document.querySelectorAll('div')].some((node) => getComputedStyle(node).paddingRight === '320px'),
      }))
    },

    async afterTurn(context) {
      const { page } = context
      const notes = context.notes
      // One more turn leaves three commands behind.
      await sendPrompt(page, 'Run the three commands.')
      await waitForTurn(page)
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
      notes.rail = await readRail(page)
      // Section controls are independent, retain their choice through a poll,
      // and keep the browser's Enter and Space activation (D94).
      const sectionToggles = page.locator('.dsh-claude-details summary')
      notes.disclosures = { initial: await readDisclosures(page) }
      const refreshed = page.waitForResponse(response => response.url().includes(SESSION_PANEL_PATH) && response.ok())
      for (const toggle of await sectionToggles.all()) await toggle.click()
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
      // Each background category folds past two rows on its own control.
      const groupFold = page.locator('.dsh-claude-details .dsh-claude-panel-group .dsh-claude-panel-more').first()
      if (await groupFold.count() > 0) {
        const groupRows = () => page.evaluate(() => [...document.querySelectorAll('.dsh-claude-details .dsh-claude-panel-group')].map((group) => group.querySelectorAll('.dsh-claude-panel-row').length))
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
          shiftX: strip?.getAttribute('style') ?? '',
        }
      }, {
        strip: MARKS.viewTabsStrip,
        titleRow: HEADER_TITLE_ROW_SELECTOR,
        title: HEADER_TITLE_SELECTOR,
        utilities: HEADER_UTILITIES_SELECTOR,
        tablist: CONVERSATION_TABS_SELECTOR,
      })
      notes.headerActions = await readHeaderActions(page)
      // A job row opens its retained output in place and closes again.
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
      notes.closed = await page.evaluate(() => ({
        rail: document.querySelector('.dsh-claude-details') !== null,
        squeezed: [...document.querySelectorAll('div')].some((node) => getComputedStyle(node).paddingRight === '320px'),
      }))
      notes.utilitiesClosed = await readUtilities(page)
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
        const toggles = page.locator('.dsh-claude-details summary')
        for (const toggle of await toggles.all()) await toggle.click()
        if (context.out !== undefined) await capturePanel(page, `${context.out}/session-panel-collapsed-${theme}.png`)
        for (const toggle of await toggles.all()) await toggle.click()
      }
      // The host's own right column stands on this side as well: the rail keeps
      // away while that column holds width, and the header's control hands the
      // side over by closing it first (D94).
      notes.rightPanel = await readRightPanel(page)
      await pressRightPanel(page)
      notes.rightPanelOpen = await readRightPanel(page)
      await pressDetails(page)
      await page.waitForTimeout(500)
      notes.rightPanelHanded = await readRightPanel(page)
      const pagesBefore = page.context().pages().length
      const outputs = page.locator('.dsh-claude-details .dsh-claude-panel-section').filter({ hasText: /产出|Outputs/ }).first()
      await outputs.locator('button.dsh-claude-panel-row').filter({ hasText: 'panel four.md' }).click()
      await page.waitForFunction(() => {
        const preview = document.querySelector('[data-sidebar-right-open]')
        return preview !== null && /panel four\.md/.test(preview.textContent ?? '') && /Four/.test(preview.textContent ?? '')
      }, undefined, { timeout: 15000 })
      notes.filePreview = await page.evaluate(() => document.querySelector('[data-sidebar-right-open]')?.textContent ?? '')
      notes.extraPages = page.context().pages().length - pagesBefore
    },

    async assert({ notes }) {
      const rail = notes.rail ?? {}
      const environmentWords = words('environment')
      const contextWords = words('context')
      const outputsWords = words('outputs')
      const changesWords = words('changes')
      const backgroundWords = words('background')
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
        check('the environment section carries the preset text from the header',
          (rail.preset ?? '') !== '' && (rail.preset ?? '') === (notes.preset ?? ''),
          JSON.stringify({ rail: rail.preset ?? null, header: notes.preset ?? null })),
        check('every section folds to its own reading and stays folded through a poll',
          notes.disclosures?.initial?.length === rail.headings?.length && notes.disclosures.initial.every(section => section.open && section.content) &&
            notes.disclosures.closed?.every(section => !section.open && !section.content && section.reading !== ''),
          JSON.stringify(notes.disclosures ?? null)),
        check('keyboard activation opens one section independently and all sections open again',
          notes.disclosures?.single?.[0]?.open === true && notes.disclosures.single.slice(1).every(section => !section.open) &&
            notes.disclosures.reopened?.every(section => section.open && section.content),
          JSON.stringify(notes.disclosures ?? null)),
        check('the session stats carry the figures and the token buckets',
          anyOf(statsWords, (rail.headings ?? []).join('|')) && (rail.stats ?? []).length >= 8 &&
            anyOf(words('statsModelTime'), (rail.stats ?? []).join('|')) && anyOf(words('statsCost'), (rail.stats ?? []).join('|')),
          JSON.stringify((rail.stats ?? []).slice(0, 12))),
        check('Outputs lists the files the turn wrote and folds past its second row',
          (notes.fold?.rows ?? 0) === 2 && /panel four\.md/.test(rail.outputs ?? '') && notes.fold?.more !== null,
          JSON.stringify(notes.fold ?? null)),
        check('the fold control shows the rest and puts them away again', notes.fold?.expanded === 4 && notes.fold?.collapsed === 2, JSON.stringify({ expanded: notes.fold?.expanded, collapsed: notes.fold?.collapsed })),
        check('Changes stays off the page without a change request', !anyOf(changesWords, (rail.headings ?? []).join('|')), JSON.stringify(rail.headings ?? null)),
        check('Background tasks lists the commands and files them under their kind',
          anyOf(backgroundWords, (rail.headings ?? []).join('|')) && /panel-command-three/.test(rail.background ?? '') &&
            rail.groups?.length === 1 && anyOf(words('jobs'), rail.groups[0].title) && rail.groups[0].rows === 2,
          JSON.stringify(rail.groups ?? null)),
        check('a background category folds past two rows and opens on its own control',
          notes.groupFold?.rows?.join() === '2' && notes.groupFold?.expanded?.join() === '3' && notes.groupFold?.collapsed?.join() === '2',
          JSON.stringify(notes.groupFold ?? null)),
        check('the commands carry their status chip', anyOf(words('completed'), (rail.chips ?? []).join('|')), JSON.stringify((rail.chips ?? []).slice(0, 4))),
        check('a job row opens its retained output in place', notes.jobOpened === true && (notes.jobOutput ?? '').trim() !== '', JSON.stringify({ opened: notes.jobOpened, output: (notes.jobOutput ?? '').slice(0, 80) })),
        check('the job row closes its output again', notes.jobClosed === true, String(notes.jobClosed)),
        check('the view switch stands on the title\'s own line, clear of the title and the utilities',
          notes.layout?.titleRow !== null && notes.layout?.tablist !== null &&
            notes.layout.tablist.top >= notes.layout.titleRow.top - 2 &&
            notes.layout.tablist.bottom <= notes.layout.titleRow.bottom + 2 &&
            notes.layout.tablist.left >= notes.layout.title.right + 4 &&
            (notes.layout.utilities === null || notes.layout.tablist.right <= notes.layout.utilities.left - 4),
          JSON.stringify(notes.layout ?? null)),
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
        check('the host right panel takes the side and the rail keeps away',
          notes.rightPanel?.width === 0 && (notes.rightPanelOpen?.width ?? 0) > 0 &&
            notes.rightPanelOpen?.rail === false && notes.rightPanelOpen?.squeezed === false,
          JSON.stringify({ before: notes.rightPanel ?? null, opened: notes.rightPanelOpen ?? null })),
        check('the details control closes the host right panel before the rail stands',
          notes.rightPanelHanded?.width === 0 && notes.rightPanelHanded?.rail === true,
          JSON.stringify(notes.rightPanelHanded ?? null)),
        check('an output opens its file in the host preview without another browser tab',
          /panel four\.md/.test(notes.filePreview ?? '') && /Four/.test(notes.filePreview ?? '') && notes.extraPages === 0,
          JSON.stringify({ preview: notes.filePreview, extraPages: notes.extraPages })),
      ]
    },
  }
}
