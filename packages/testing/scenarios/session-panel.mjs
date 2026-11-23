#!/usr/bin/env node
/**
 * session-panel.mjs — the skin's sections in the host's session panel on the
 * real host (D112, D92). Registered in the lane's scenario table
 * (packages/testing/scenarios.mjs). The page readings it judges with live in
 * session-panel-read.mjs beside it.
 *
 * The scenario sends one turn that writes seven files, reads where the skin's
 * sections stand among the host's, the Environment rows it adds, the section
 * folds and their summaries, the figures, folds the outputs list with the host's own
 * control, then closes the panel through the host's toggle and opens it again.
 * A second turn replaces the outputs. Around the panel it walks the header the
 * panel shares the conversation with: the view tabs, the toolbar's visibility
 * and the work chips.
 */
import { SESSION_PANEL_PATH } from '@dsh-claude-style/contracts/routes'
import { COMPOSER_SELECTOR, CONVERSATION_CONTENT_SELECTOR, CONVERSATION_HEADER_SELECTOR, CONVERSATION_TABS_SELECTOR, HEADER_MORE_TRIGGER_SELECTOR, HEADER_TITLE_SELECTOR, HEADER_UTILITIES_SELECTOR, SESSION_PANEL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { MARKS } from '../lane.mjs'
import { sendPrompt, waitForTurn } from '../prompt.mjs'
import { sanitizePage } from '../../../scripts/shared/privacy.mjs'
import {
  PART, ROW, SKIN_SECTIONS, FOLDED, FOLD_HEAD, section, capturePanel, words, anyOf, panelShown, showPanel, pressToggle, readPanel,
  readContextBar, readPreset, presetLabelDrawn, readHeaderActions, readOutputFold, readDetailsCard,
} from './session-panel-read.mjs'

/** The files the first turn writes: seven, so the outputs list folds past the host's five rows. */
const FIRST_FILES = ['panel-note.md', 'panel-two.md', 'panel-three.md', 'panel four.md', 'panel-five.md', 'panel-six.md', 'panel-seven.md']

/**
 * The scenario.
 * @param options.check - the lane's check factory.
 * @returns the scenario body the runner drives.
 */
export function sessionPanelScenario({ check }) {
  return {
    script: {
      conversation: [
        ...FIRST_FILES.map((name, index) => ({
          thinking: [index === 0 ? 'Leave the panel seven files of the turn.' : `File ${index + 1}.`],
          tool: { name: 'write', input: { file_path: `{{workspace}}/${name}`, content: `# ${name}\n` } },
        })),
        { thinking: ['The files are written.'], text: ['Wrote seven files.\n'] },
        // A new human prompt replaces the outputs.
        { thinking: ['Latest output.'], tool: { name: 'write', input: { file_path: '{{workspace}}/panel-latest.md', content: '# Latest round\n' } } },
        { thinking: ['Latest round is ready.'], text: ['The latest file is ready.\n'] },
      ],
      auxiliary: { text: ['Scripted panel turn'] },
    },
    prompt: 'Write the panel notes.',
    delayMs: 60,
    patch: [
      '- id: ui-skin-claude-style',
      '  config:',
      '    statsFooterTokenFormat: units',
    ],
    // Wide enough for the host panel to dock beside the transcript.
    viewport: { width: 1440, height: 900 },

    async beforeSend(context) {
      const { page } = context
      const notes = context.notes
      // Every ask the sections make, so a closed panel can be shown quiet.
      notes.panelAsks = []
      page.on('request', (request) => {
        if (request.url().includes(SESSION_PANEL_PATH)) notes.panelAsks.push(Date.now())
      })
    },

    /**
     * The scripted answer streams while the panel shows. The two figures tables
     * print the same live reading the composer's line prints — the host's settled
     * projections with the streaming text added — counted to each new reading the
     * way the line counts, so a count moves between the sections' own asks and
     * moves a little at a time rather than landing in one step (D112).
     */
    async duringTurn(context) {
      const { page } = context
      const notes = context.notes
      await showPanel(page)
      await page.waitForSelector(section('claude-style-tokens'), { timeout: 20000 })
      // The rows carry the skin's own words, so the labels come from its copy.
      const labels = { out: words('statsOutput'), cost: words('statsCost') }
      const read = () => page.evaluate(({ labels, tokens }) => {
        const table = document.querySelector(tokens)
        if (table === null) return null
        const rows = [...table.querySelectorAll('.dsh-claude-panel-stat')]
        const pick = (names, figure) => {
          const textOf = (node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()
          const row = rows.find(node => names.some(name => {
            const text = textOf(node)
            return text.startsWith(name) && figure.test(text.slice(name.length))
          }))
          return row ? textOf(row) : null
        }
        return { out: pick(labels.out, /^[\d,]/), cost: pick(labels.cost, /^\s*\D*[\d¥$€]/) }
      }, { labels, tokens: section('claude-style-tokens') })
      const samples = []
      // A frame-paced count moves many times inside the poll period, so the
      // readings are taken close enough together to tell the two apart.
      for (let i = 0; i < 90; i++) {
        const reading = await read()
        if (reading === null) break
        samples.push({ ...reading, at: Date.now(), asks: notes.panelAsks.length })
        await page.waitForTimeout(50)
      }
      // A change no ask stands behind is the live reading moving the table; one
      // that follows an ask is the route answering.
      const movedAlone = samples.some((sample, index) => index > 0 &&
        sample.asks === samples[index - 1].asks &&
        (sample.out !== samples[index - 1].out || sample.cost !== samples[index - 1].cost))
      // The count travels: two changes inside a few frames. A table that writes
      // each reading as it lands has one change per settlement instead.
      let closest = Number.POSITIVE_INFINITY
      let lastChange = null
      for (const sample of samples) {
        const moved = sample.out !== lastChange?.out || sample.cost !== lastChange?.cost
        if (lastChange !== null && moved) closest = Math.min(closest, sample.at - lastChange.at)
        if (moved) lastChange = sample
      }
      notes.liveFigures = { movedAlone, closest, samples: samples.slice(0, 12) }
    },

    async afterTurn(context) {
      const { page } = context
      const notes = context.notes
      await showPanel(page)
      await page.waitForFunction((outputs) => /panel four\.md/.test(document.querySelector(outputs)?.textContent ?? ''), section('claude-style-outputs'), { timeout: 30000 })
      notes.preset = await readPreset(page)
      notes.presetLabel = { shown: await presetLabelDrawn(page) }
      notes.panel = await readPanel(page)
      // The skin folds a section through its title row: a press folds the
      // context section and its summary stands beside the title, a second
      // press gives the body back (D113). The press leaves the pointer on the
      // title row, where the host hides the trailing seat for its drag handle;
      // the resting reading is taken with the pointer away. The section stands
      // expanded again for the reads that follow.
      const contextHead = page.locator(`${section('claude-style-context')} [${FOLD_HEAD}] h2`)
      await contextHead.click()
      await page.waitForSelector(`${section('claude-style-context')}[${FOLDED}]`, { timeout: 5000 })
      await page.mouse.move(0, 0)
      notes.sectionFold = { folded: await readPanel(page) }
      await contextHead.click()
      await page.waitForSelector(`${section('claude-style-context')}:not([${FOLDED}])`, { timeout: 5000 })
      await page.mouse.move(0, 0)
      notes.sectionFold.restored = await readPanel(page)
      notes.contextBar = await readContextBar(page)
      notes.headerActions = await readHeaderActions(page)
      // The outputs fold behind the host's own control: five rows, then the control.
      notes.fold = await readOutputFold(page)
      const foldRow = page.locator(`${section('claude-style-outputs')} [data-session-panel-row="fold"] button`)
      if (await foldRow.count() > 0) {
        await foldRow.click()
        notes.fold.expanded = (await readOutputFold(page))?.rows ?? null
        await foldRow.click()
        notes.fold.collapsed = (await readOutputFold(page))?.rows ?? null
      }
      // An output row's whole path stands in the host's hover card.
      const firstOutput = page.locator(`${section('claude-style-outputs')} ${ROW}`).first()
      const name = (await firstOutput.locator('.dsh-claude-panel-title').innerText()).trim()
      await firstOutput.hover()
      await page.waitForTimeout(800)
      notes.card = { name, text: await readDetailsCard(page) }
      await page.mouse.move(0, 0)
      await page.waitForTimeout(200)
      // The view switch shares the title row with the panel standing beside the transcript.
      notes.layout = await page.evaluate((marks) => {
        const box = (el) => { if (el === null) return null; const rect = el.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height } }
        return {
          strip: box(document.querySelector(marks.strip)),
          title: box(document.querySelector(marks.title)),
          utilities: box(document.querySelector(marks.utilities)),
          tablist: box(document.querySelector(marks.tablist)),
        }
      }, { strip: MARKS.viewTabsStrip, title: HEADER_TITLE_SELECTOR, utilities: HEADER_UTILITIES_SELECTOR, tablist: CONVERSATION_TABS_SELECTOR })
      const tabs = page.locator(CONVERSATION_TABS_SELECTOR)
      const chat = tabs.getByRole('tab', { name: /^(对话|Chat)$/ })
      const trajectory = tabs.getByRole('tab', { name: /^(轨迹|Trajectory)$/ })
      const composer = page.locator(COMPOSER_SELECTOR).first()
      const header = page.locator(CONVERSATION_HEADER_SELECTOR).first()
      const content = page.locator(CONVERSATION_CONTENT_SELECTOR).first()
      const moreViewsSelector = `${MARKS.viewTabsStrip} button[aria-haspopup="menu"]`
      const headerPaint = () => header.evaluate(async (element, selectors) => {
        const opacityTransitions = element.getAnimations({ subtree: true }).filter(animation =>
          animation instanceof CSSTransition && animation.transitionProperty === 'opacity')
        await Promise.all(opacityTransitions.map(animation => animation.finished))
        const sessionMenu = element.querySelector(selectors.sessionMenu)
        const title = element.querySelector(selectors.title)
        const titleBox = title?.getBoundingClientRect()
        const menuBox = sessionMenu?.getBoundingClientRect()
        const tools = [...element.querySelectorAll(`${selectors.utilities} button`)]
          .filter(button => button !== sessionMenu && button.checkVisibility())
        const visible = node => node?.checkVisibility({ opacityProperty: true }) ?? null
        return {
          title: visible(title),
          menu: visible(sessionMenu),
          besideTitle: titleBox !== undefined && menuBox !== undefined && titleBox.right === menuBox.left &&
            titleBox.top + titleBox.height / 2 === menuBox.top + menuBox.height / 2,
          controls: [...selectors.tabs.map(selector => element.querySelector(selector)), ...tools].map(visible),
        }
      }, { title: HEADER_TITLE_SELECTOR, sessionMenu: HEADER_MORE_TRIGGER_SELECTOR, utilities: HEADER_UTILITIES_SELECTOR,
        tabs: [CONVERSATION_TABS_SELECTOR, moreViewsSelector] })
      const contentBefore = await content.boundingBox()
      await page.locator(SESSION_PANEL_SELECTOR).first().hover()
      const overPanel = await headerPaint()
      await content.hover({ position: { x: 40, y: 200 } })
      const overConversation = await headerPaint()
      await header.hover()
      notes.headerVisibility = { overPanel, overConversation, overHeader: await headerPaint(), contentBefore, contentAfter: await content.boundingBox() }
      await trajectory.click()
      await trajectory.and(tabs.getByRole('tab', { selected: true })).waitFor()
      await composer.waitFor({ state: 'hidden' })
      const inTrajectory = await page.locator(MARKS.viewTabsStrip).boundingBox()
      await chat.click()
      await chat.and(tabs.getByRole('tab', { selected: true })).waitFor()
      await composer.waitFor()
      const inChat = await page.locator(MARKS.viewTabsStrip).boundingBox()
      notes.viewSwitch = { inTrajectory, inChat }
      const moreViews = page.locator(moreViewsSelector)
      await moreViews.click()
      await moreViews.and(page.locator('[aria-expanded="true"]')).waitFor()
      await page.keyboard.press('Escape')
      await moreViews.and(page.locator('[aria-expanded="false"]')).waitFor()
      notes.moreViews = await moreViews.evaluate(element => element === document.activeElement)
      await showPanel(page)
      // The host's toggle closes the panel: the sections unmount, the preset
      // label returns to the header and nothing asks the host any more.
      await pressToggle(page)
      notes.closed = { shown: await panelShown(page), preset: await presetLabelDrawn(page) }
      const quiet = notes.panelAsks.length
      await page.waitForTimeout(3000)
      notes.closedAsks = notes.panelAsks.length - quiet
      await pressToggle(page)
      notes.reopened = await panelShown(page)
      notes.themes = []
      for (const theme of ['light', 'dark']) {
        await page.evaluate(value => document.body.toggleAttribute('data-ds-dark-theme', value === 'dark'), theme)
        await page.waitForTimeout(150)
        notes.themes.push(await page.evaluate(({ panel, value }) => {
          const box = document.querySelector(panel).getBoundingClientRect()
          const stat = document.querySelector('.dsh-claude-panel-stat dd')
          return { theme: value, inside: box.left >= 0 && box.right <= innerWidth, figure: stat === null ? null : getComputedStyle(stat).color }
        }, { panel: SESSION_PANEL_SELECTOR, value: theme }))
        if (context.out !== undefined) await capturePanel(page, `${context.out}/session-panel-${theme}.png`)
        notes.themes.at(-1).tabs = await tabs.evaluate(list => {
          const active = list.querySelector('[aria-selected="true"]')
          const underline = getComputedStyle(list, '::after')
          return {
            activeInk: active === null ? null : getComputedStyle(active).color,
            ink: underline.backgroundColor,
            drawn: underline.content !== 'none' && parseFloat(underline.width) > 0,
            nativeHidden: active !== null && getComputedStyle(active, '::after').visibility === 'hidden',
          }
        })
        const readLabel = (element) => {
          const style = getComputedStyle(element)
          return { ink: style.color, background: style.backgroundColor }
        }
        // The previous theme's pass left the pointer on this tab: its resting ink is read with the pointer away.
        await page.mouse.move(0, 0)
        await page.waitForFunction((selector) => document.querySelector(selector)?.querySelector('[role="tab"]:hover') == null, CONVERSATION_TABS_SELECTOR)
        const resting = await trajectory.evaluate(readLabel)
        await trajectory.hover()
        await page.waitForFunction(({ selector, ink }) => {
          const hovered = document.querySelector(selector)?.querySelector('[role="tab"]:hover')
          return hovered != null && getComputedStyle(hovered).color !== ink
        }, { selector: CONVERSATION_TABS_SELECTOR, ink: resting.ink })
        const hovered = await trajectory.evaluate(readLabel)
        notes.themes.at(-1).hover = { resting, hovered }
        if (context.out !== undefined) {
          await sanitizePage(expression => page.evaluate(expression))
          await page.locator(`[${PART}~="conversation-header"]`).screenshot({ path: `${context.out}/view-tabs-header-${theme}.png` })
        }
      }
      // The figures read in the host's own words.
      notes.wording = await page.evaluate(() => ({
        rows: [...document.querySelectorAll('.dsh-claude-panel-stat')].map((row) => row.textContent.replace(/\s+/g, ' ').trim()),
      }))
      // An output opens through the host's preview controller without a browser tab.
      const pagesBefore = page.context().pages().length
      const outputs = page.locator(section('claude-style-outputs'))
      const unfold = outputs.locator('[data-session-panel-row="fold"] button')
      if (await unfold.count() > 0) await unfold.click()
      await outputs.locator(`${ROW} button[data-row-part="body"]`).filter({ hasText: 'panel four.md' }).click()
      await page.waitForFunction(() => {
        const preview = document.querySelector('[data-sidebar-right-open]')
        return preview !== null && /panel four\.md/.test(preview.textContent ?? '')
      }, undefined, { timeout: 15000 })
      notes.filePreview = await page.evaluate(() => document.querySelector('[data-sidebar-right-open]')?.textContent ?? '')
      notes.extraPages = page.context().pages().length - pagesBefore
      await sendPrompt(page, 'Write the latest file.')
      await waitForTurn(page)
      await showPanel(page)
      await page.waitForFunction((selector) => /panel-latest\.md/.test(document.querySelector(selector)?.textContent ?? ''), section('claude-style-outputs'), { timeout: 30000 })
      notes.latestRound = await readPanel(page)
      // The first frame stands context and both figures sections, with what the
      // page knows written and the rest under placeholders, while the route's
      // fold is still on its way. Holding the ask makes that frame readable (D112).
      const held = '**/dsh-claude-style/session-panel**'
      await page.route(held, async (route) => {
        await new Promise(resolve => setTimeout(resolve, 3000))
        await route.continue()
      })
      await page.reload()
      await showPanel(page)
      await page.waitForSelector(section('claude-style-context'), { timeout: 20000 })
      notes.firstFrame = await page.evaluate(({ panel, sectionAttribute }) => {
        const root = document.querySelector(panel)
        const shown = [...(root?.querySelectorAll(`[${sectionAttribute}]`) ?? [])].filter((node) => node.checkVisibility())
        return {
          order: shown.map((node) => node.getAttribute(sectionAttribute)),
          placeholders: root?.querySelectorAll('.dsh-claude-panel-skeleton').length ?? 0,
        }
      }, { panel: SESSION_PANEL_SELECTOR, sectionAttribute: 'data-session-panel-section' })
      if (context.out !== undefined) await capturePanel(page, `${context.out}/session-panel-first-frame.png`)
      await page.unroute(held)
    },

    async assert({ notes }) {
      const panel = notes.panel ?? {}
      const skinOrder = (order) => (order ?? []).filter((id) => SKIN_SECTIONS.includes(id))
      return [
        check('the skin\'s sections stand in the host panel after Environment, in their registered order',
          panel.shown === true && panel.order?.[0] === 'environment' &&
            JSON.stringify(skinOrder(panel.order)) === JSON.stringify(SKIN_SECTIONS),
          JSON.stringify(panel.order ?? null)),
        check('Environment leads with this computer before the host\'s working folder and closes with the preset',
          panel.projectIndex === 1 && anyOf(words('thisComputer'), panel.environment?.[0] ?? '') &&
            (notes.preset ?? '') !== '' && (panel.environment ?? []).at(-1) === notes.preset,
          JSON.stringify({ rows: panel.environment ?? null, project: panel.projectIndex, preset: notes.preset ?? null })),
        check('the header\'s preset label steps aside while the panel shows and returns when it closes',
          notes.presetLabel?.shown === false && notes.closed?.preset === true,
          JSON.stringify({ shown: notes.presetLabel ?? null, closed: notes.closed ?? null })),
        check('the skin folds the sections: a folded one carries its summary beside the title, an expanded one carries nothing',
          SKIN_SECTIONS.every((id) => ((panel.besideTitles?.[id] ?? '') !== '') === (panel.folded?.[id] === true)) &&
            SKIN_SECTIONS.some((id) => panel.folded?.[id] === true) &&
            SKIN_SECTIONS.some((id) => panel.folded?.[id] !== true),
          JSON.stringify({ besideTitles: panel.besideTitles ?? null, folded: panel.folded ?? null })),
        check('a press on the title folds the context section and a second press gives the body back',
          notes.sectionFold?.folded?.folded?.['claude-style-context'] === true &&
            (notes.sectionFold?.folded?.besideTitles?.['claude-style-context'] ?? '') !== '' &&
            notes.sectionFold?.restored?.folded?.['claude-style-context'] === false &&
            (notes.sectionFold?.restored?.besideTitles?.['claude-style-context'] ?? '') === '',
          JSON.stringify({ folded: notes.sectionFold?.folded?.besideTitles ?? null, restored: notes.sectionFold?.restored?.besideTitles ?? null })),
        check('the panel scrolls without a bar', panel.scrollbar === 0, JSON.stringify({ scrollbar: panel.scrollbar })),
        check('the context section arrives with the turn', (panel.context ?? []).length >= 2 && (panel.legend ?? []).length > 0, JSON.stringify(panel.context ?? null)),
        check('the Reduced choice leaves the context bar\'s parts uncovered: the cover collapses and the parts keep the widths of the other choice',
          notes.contextBar?.reduced?.coverAnimation === 'none' &&
            (notes.contextBar?.reduced?.parts ?? []).length > 0 &&
            JSON.stringify(notes.contextBar?.reduced?.parts) === JSON.stringify(notes.contextBar?.standing?.parts),
          JSON.stringify(notes.contextBar ?? null)),
        check('the session stats and the token usage carry their figures in the configured token units',
          (panel.stats ?? []).length >= 8 && anyOf(words('statsModelTime'), (panel.stats ?? []).join('|')) &&
            (panel.stats ?? []).some((row) => /\d(?:\.\d+)?[KMBT]/.test(row)),
          JSON.stringify((panel.stats ?? []).slice(0, 12))),
        check('the figures move with the answer while it streams, not only when the route answers',
          notes.liveFigures?.movedAlone === true,
          JSON.stringify(notes.liveFigures ?? null)),
        check('the figures count to each reading instead of landing on it',
          (notes.liveFigures?.closest ?? Number.POSITIVE_INFINITY) <= 150,
          JSON.stringify({ closest: notes.liveFigures?.closest ?? null })),
        check('Outputs lists the turn\'s files and folds past five rows with the host\'s own control',
          notes.fold?.rows === 5 && notes.fold?.fold !== null && notes.fold?.expanded === FIRST_FILES.length && notes.fold?.collapsed === 5,
          JSON.stringify(notes.fold ?? null)),
        check('an output row gives its full path in the host\'s hover card',
          typeof notes.card?.text === 'string' && notes.card.text.includes(notes.card.name) && /[\\/]/.test(notes.card.text),
          JSON.stringify(notes.card ?? null)),
        check('a new user round replaces the outputs',
          (notes.latestRound?.outputs ?? []).some((row) => /panel-latest\.md/.test(row)) &&
            !(notes.latestRound?.outputs ?? []).some((row) => /panel four\.md/.test(row)),
          JSON.stringify(notes.latestRound?.outputs ?? null)),
        check('the first frame stands context and both figures sections under placeholders',
          ['claude-style-context', 'claude-style-stats', 'claude-style-tokens'].every((id) => (notes.firstFrame?.order ?? []).includes(id)) &&
            (notes.firstFrame?.placeholders ?? 0) > 0,
          JSON.stringify(notes.firstFrame ?? null)),
        check('the host\'s toggle closes the panel and the sections stop asking the host',
          notes.closed?.shown === false && notes.closedAsks === 0 && notes.reopened === true,
          JSON.stringify({ closed: notes.closed ?? null, asks: notes.closedAsks, reopened: notes.reopened })),
        check('the host header chips step aside while the panel shows',
          notes.headerActions?.exists === false || (notes.headerActions.expanded === 0 && notes.headerActions.tree === 0 && notes.headerActions.catalog === 0),
          JSON.stringify(notes.headerActions ?? null)),
        check('the panel stays inside the viewport and its figures change ink with the theme',
          notes.themes?.length === 2 && notes.themes.every(theme => theme.inside) && notes.themes[0].figure !== notes.themes[1].figure,
          JSON.stringify(notes.themes?.map(({ theme, inside, figure }) => ({ theme, inside, figure })))),
        check('the view switch stands in the title row between the title and the right-hand tools',
          notes.layout?.strip != null && notes.layout.title !== null && notes.layout.utilities !== null && notes.layout.tablist !== null &&
            Math.abs((notes.layout.strip.top + notes.layout.strip.bottom) - (notes.layout.utilities.top + notes.layout.utilities.bottom)) <= 2 &&
            notes.layout.title.right <= notes.layout.tablist.left &&
            notes.layout.strip.right < notes.layout.utilities.left,
          JSON.stringify(notes.layout ?? null)),
        check('the title and session menu stay visible while the tabs and other tools follow the pointer',
          [notes.headerVisibility?.overPanel, notes.headerVisibility?.overConversation, notes.headerVisibility?.overHeader].every((paint) =>
            paint?.title === true && paint.menu === true && paint.besideTitle === true && paint.controls.every(value => value === true)) &&
            JSON.stringify(notes.headerVisibility.contentBefore) === JSON.stringify(notes.headerVisibility.contentAfter),
          JSON.stringify(notes.headerVisibility ?? null)),
        check('the title bar switch stays available in both views and Escape returns focus to More views',
          notes.viewSwitch?.inTrajectory != null && notes.viewSwitch.inChat !== null &&
            notes.viewSwitch.inTrajectory.y === notes.viewSwitch.inChat.y && notes.moreViews === true,
          JSON.stringify({ views: notes.viewSwitch, focus: notes.moreViews })),
        check('the selected tab carries its underline in both themes',
          notes.themes?.every(({ tabs }) => tabs.drawn && tabs.nativeHidden && tabs.activeInk === tabs.ink),
          JSON.stringify(notes.themes?.map(theme => ({ theme: theme.theme, tabs: theme.tabs })))),
        check('hover brightens the tab label without filling its background in either theme',
          notes.themes?.every(({ hover: { resting, hovered } }) => hovered.ink !== resting.ink && hovered.background === resting.background),
          JSON.stringify(notes.themes?.map(({ theme, hover }) => ({ theme, hover })))),
        check('the figures read in the host\'s own words',
          (notes.wording?.rows ?? []).some(row => anyOf(words('statsUncachedInput'), row)) &&
            (notes.wording?.rows ?? []).some(row => anyOf(words('statsModelTime'), row)),
          JSON.stringify((notes.wording?.rows ?? []).slice(0, 12))),
        check('an output opens its file in the host preview without another browser tab',
          /panel four\.md/.test(notes.filePreview ?? '') && notes.extraPages === 0,
          JSON.stringify({ preview: notes.filePreview, extraPages: notes.extraPages })),
      ]
    },
  }
}
