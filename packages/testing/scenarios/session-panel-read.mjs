/**
 * session-panel-read.mjs — what the session panel's scenario reads from the page
 * (D92, D112): the host panel's sections and the skin's place among them, the
 * Environment rows, the bare section titles, the context bar, the
 * header's preset and work chips, and the captures taken of the panel. The
 * scenario beside this file sends the turns and judges what these readings
 * bring back.
 */
import copy from '../../client/src/features/session-panel/session-panel.copy.json' with { type: 'json' }
import { SESSION_PANEL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import surfaceTable from '../data/surface.json' with { type: 'json' }
import { sanitizePage } from '../../../scripts/shared/privacy.mjs'

/** The part mark the skin writes on a host element, read from the surface table rather than spelled here (D92). */
const PART = surfaceTable.surface.find((entry) => entry.id === 'skin.part')?.attribute
if (PART === undefined) throw new Error('session-panel: skin.part names no attribute')
/** The resolved motion answer's mark, read from the same table (D40, D92). */
const MOTION = surfaceTable.surface.find((entry) => entry.id === 'skin.motion')?.attribute
if (MOTION === undefined) throw new Error('session-panel: skin.motion names no attribute')
/** The value the mark carries while the animation choice holds still (D40). */
const MOTION_REDUCED = 'reduced'

/** The host panel's own marks: a section by its id, its rows, its toggle and the hover card's details. */
const SECTION = 'data-session-panel-section'
const ROW = '[data-session-panel-row]'
const TOGGLE = '[data-session-panel-toggle]'
const DETAILS = '[data-session-panel-details]'

/** The skin's section ids, in the order it registers them (session-panel.ts). */
const SKIN_SECTIONS = ['claude-style-context', 'claude-style-stats', 'claude-style-tokens', 'claude-style-outputs']
/** One skin section's selector. */
const section = (id) => `${SESSION_PANEL_SELECTOR} [${SECTION}="${id}"]`

/** Every retained capture passes the same privacy sweep as the release shots (D92). */
async function capturePanel(page, file) {
  const mask = await page.addStyleTag({ content: `body * { visibility: hidden !important; } ${SESSION_PANEL_SELECTOR}, ${SESSION_PANEL_SELECTOR} * { visibility: visible !important; }` })
  try {
    await sanitizePage(expression => page.evaluate(expression))
    await page.locator(SESSION_PANEL_SELECTOR).first().screenshot({ path: file })
  } finally {
    await mask.evaluate(node => node.remove())
  }
}

/** One copy key's words in the languages the package ships: the page is in one of them. */
const words = (key) => Object.values(copy[key] ?? {})
const anyOf = (values, text) => values.some((value) => text.includes(value))

/** Whether the host panel shows right now. */
const panelShown = (page) => page.evaluate((selector) => document.querySelector(selector) !== null, SESSION_PANEL_SELECTOR)

/** Open the host panel when it does not show, through the host's own toggle. */
async function showPanel(page) {
  if (await panelShown(page)) return
  await page.locator(TOGGLE).first().click()
  await page.waitForSelector(SESSION_PANEL_SELECTOR, { timeout: 10000 })
}

/** Press the host's own panel toggle and let its motion settle. */
async function pressToggle(page) {
  await page.locator(TOGGLE).first().click()
  await page.waitForTimeout(400)
}

/** The panel's sections in display order, what each skin section holds and what stands beside its title. */
const readPanel = (page) => page.evaluate(({ panel, sectionAttribute, row, skin }) => {
  const root = document.querySelector(panel)
  if (root === null) return { shown: false }
  const shown = [...root.querySelectorAll(`[${sectionAttribute}]`)].filter((node) => node.checkVisibility())
  const byId = (id) => root.querySelector(`[${sectionAttribute}="${id}"]`)
  const rowTitles = (node) => [...(node?.querySelectorAll(row) ?? [])].map((item) => (item.textContent ?? '').replace(/\s+/g, ' ').trim())
  // The title row holds the heading alone: anything after it stands beside the title.
  const besideTitle = (node) => {
    const head = node?.firstElementChild ?? null
    const title = head?.querySelector('h2')?.textContent ?? ''
    return (head?.textContent ?? '').replace(title, '').replace(/\s+/g, ' ').trim()
  }
  return {
    shown: true,
    order: shown.map((node) => node.getAttribute(sectionAttribute)),
    environment: rowTitles(byId('environment')),
    projectIndex: [...(byId('environment')?.querySelectorAll(row) ?? [])].findIndex((item) => item.hasAttribute('data-session-panel-project')),
    context: [...(byId(skin[0])?.querySelectorAll('.dsh-claude-panel-context-head span') ?? [])].map((node) => node.textContent),
    legend: [...(byId(skin[0])?.querySelectorAll('.dsh-claude-panel-legend-row') ?? [])].map((node) => node.textContent),
    stats: [...root.querySelectorAll('.dsh-claude-panel-stat')].map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()),
    outputs: rowTitles(byId(skin[3])),
    besideTitles: Object.fromEntries(skin.map((id) => [id, besideTitle(byId(id))])),
    // A drawn bar takes width from the box; a panel that scrolls without one takes none.
    scrollbar: root.offsetWidth - root.clientWidth,
  }
}, { panel: SESSION_PANEL_SELECTOR, sectionAttribute: SECTION, row: ROW, skin: SKIN_SECTIONS })

/**
 * The context bar's cover and parts, read under the choice standing and again
 * under the Reduced one: the cover is the reveal's own ink, and the choice that
 * leaves the reveal out must leave the cover out too, so the parts keep the
 * widths they draw at the other choice (session-panel-context.css).
 */
const readContextBar = (page) => page.evaluate(({ attribute, reduced }) => {
  const bar = document.querySelector('.dsh-claude-panel-bar')
  if (bar === null) return null
  const read = () => ({
    cover: getComputedStyle(bar, '::after').transform,
    coverAnimation: getComputedStyle(bar, '::after').animationName,
    parts: [...bar.querySelectorAll('.dsh-claude-panel-segment')].map((part) => ({
      width: Math.round(part.getBoundingClientRect().width * 100) / 100,
      color: getComputedStyle(part).backgroundColor,
    })),
  })
  const body = document.body
  const standing = body.getAttribute(attribute)
  const standingChoice = read()
  body.setAttribute(attribute, reduced)
  const reducedChoice = read()
  if (standing === null) body.removeAttribute(attribute)
  else body.setAttribute(attribute, standing)
  return { standing: standingChoice, reduced: reducedChoice }
}, { attribute: MOTION, reduced: MOTION_REDUCED })

/** The header's preset label, the words the Environment section repeats. */
const readPreset = (page) => page.evaluate((attribute) => (document.querySelector(`[${attribute}~="header-label"]`)?.textContent ?? '').trim(), PART)

/** Whether the header's preset label is drawn: it steps aside while the panel carries its words (D112). */
const presetLabelDrawn = (page) => page.evaluate((attribute) => {
  const label = document.querySelector(`[${attribute}~="header-label"]`)
  return label === null ? null : getComputedStyle(label).visibility !== 'hidden'
}, PART)

/** The title-adjacent actions: whether the host's own subagent and job chips are drawn. */
const readHeaderActions = (page) => page.evaluate(() => {
  const actions = document.querySelector('[data-slot="conversation.session.header.actions"]')
  const visible = (selector) => [...document.querySelectorAll(selector)].filter((node) => node.checkVisibility()).length
  return {
    exists: actions !== null,
    expanded: visible('[data-slot="conversation.session.header.actions"] button[aria-expanded]'),
    tree: visible('[data-slot="conversation.session.header.actions"] button[aria-haspopup="tree"]'),
    catalog: visible('[data-slot="conversation.session.header.actions"] [data-subagent-action] button[aria-haspopup="dialog"]'),
  }
})

/** How many output rows show, and the fold control's words when the list holds rows back. */
const readOutputFold = (page) => page.evaluate(({ outputs, row }) => {
  const node = document.querySelector(outputs)
  if (node === null) return null
  const rows = [...node.querySelectorAll(row)].filter((item) => item.checkVisibility())
  const fold = rows.find((item) => item.getAttribute('data-session-panel-row') === 'fold')
  return { rows: rows.filter((item) => item !== fold).length, fold: fold === undefined ? null : (fold.textContent ?? '').trim() }
}, { outputs: section(SKIN_SECTIONS[3]), row: ROW })

/** The hover card's details while the pointer rests on a row. */
const readDetailsCard = (page) => page.evaluate((selector) => document.querySelector(selector)?.textContent ?? null, DETAILS)

export {
  PART, ROW, SKIN_SECTIONS, section, capturePanel, words, anyOf, panelShown, showPanel, pressToggle, readPanel,
  readContextBar, readPreset, presetLabelDrawn, readHeaderActions, readOutputFold, readDetailsCard,
}
