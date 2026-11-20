/**
 * session-panel-read.mjs — what the session panel's scenario reads from the page
 * (D92, D106): the rail's headings and what each section holds, the context bar,
 * the header's preset and controls, the host's right column, and the captures
 * taken of the rail. The scenario beside this file sends the turn and judges what
 * these readings bring back.
 */
import copy from '../../client/src/features/session-panel/session-panel.copy.json' with { type: 'json' }
import { RIGHTBAR_TOGGLE_SELECTOR } from '@dsh-claude-style/contracts/dom'
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
/** The two figures sections, which start folded with one figure beside the heading (D106). */
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
      clock: row.querySelector('.dsh-claude-panel-work-duration') !== null,
      duration: row.querySelector('.dsh-claude-panel-work-duration')?.textContent ?? '',
      execution: row.querySelector('.dsh-claude-panel-execution')?.textContent ?? '',
    })),
    preset: sectionOf(headings.environment)?.querySelector('.dsh-claude-details-preset .dsh-claude-panel-title')?.textContent ?? null,
  }
}, { headings: HEADINGS })

/**
 * The context bar's cover and parts, read under the choice standing and again
 * under the Reduced one: the cover is the reveal's own ink, and the choice that
 * leaves the reveal out must leave the cover out too, so the parts keep the
 * widths they draw at the other choice (session-panel.css).
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

/** The header's preset label, the words the rail repeats: the label's own part, not the whole actions slot, which also carries the host's job and subagent chips. */
const readPreset = (page) => page.evaluate((attribute) => (document.querySelector(`[${attribute}~="header-label"]`)?.textContent ?? '').trim(), PART)

/** Whether the header's preset label is drawn: it steps aside while the rail carries its words (D106). */
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
    catalog: visible('[data-slot="conversation.session.header.actions"] [data-subagent-action] button[aria-haspopup="dialog"]'),
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

/** Whether the rail holds the chat's width: the conversation's body gives it up from its own margin, under a header that keeps the column whole (D106). */
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

export { PART, MOTION, MOTION_REDUCED, capturePanel, words, anyOf, HEADINGS, FOLDED_HEADINGS, readRail, readContextBar, readPreset, presetLabelDrawn, readHeaderActions, readUtilities, pressDetails, railMounted, railSqueezes, readRightPanel, pressRightPanel, readDisclosures }
