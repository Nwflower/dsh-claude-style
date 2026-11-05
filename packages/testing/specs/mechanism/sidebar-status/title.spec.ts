/**
 * @capability sidebar-status
 * @features sidebar-status
 * @risk Running titles animate inaccessible or edited content, hide native labels, or lose the status fallback under motion and contrast preferences.
 */
import { expect, test } from 'vitest'
import { SIDEBAR_STATUS_SHEET } from '@dsh-claude-style/client/pure'
import { DARK_THEME_ATTRIBUTE, SESSION_PHASE_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { surfaceAttribute } from '../../fixtures/surface'
import { bodyAttribute, ENABLED, mount, nativeDot, painted, PART, removeAfterTest, STATUS } from './fixture'

const RUNNING_TITLE = surfaceAttribute('sidebar-status.running-title')

test.each(['light', 'dark'])('%s unread and awaiting colors stay semantic when the brand accent changes', scheme => {
  bodyAttribute(DARK_THEME_ATTRIBUTE, scheme === 'dark' ? '' : null)
  for (const accent of ['rgb(190, 90, 60)', 'rgb(30, 180, 100)']) {
    const view = mount('done')
    view.row.style.setProperty('--dsw-alias-brand-primary', accent)
    view.sync()
    expect(getComputedStyle(view.dot as Element).color).toBe('rgb(42, 120, 214)')
    view.dot?.setAttribute(SESSION_PHASE_ATTRIBUTE, 'warning')
    view.sync()
    expect(getComputedStyle(view.dot as Element).color).toBe('rgb(250, 178, 25)')
  }
})

test('an inapplicable running title falls back to the neutral breath and reduced motion keeps a static dot', () => {
  bodyAttribute(surfaceAttribute('skin.ongoing-indicator'), 'shimmer')
  bodyAttribute(surfaceAttribute('skin.motion'), 'full')
  const view = mount('ongoing')
  view.title.textContent = ''
  view.sync()
  expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(false)
  const dot = view.dot as Element
  const style = getComputedStyle(dot)
  expect(style.backgroundColor).toBe('rgb(137, 135, 129)')
  expect(style.animationDuration).toBe('1.2s')
  expect(style.animationTimingFunction).toBe('ease-in-out')
  expect(dot.getBoundingClientRect().width).toBe(6)
  const animation = dot.getAnimations()[0]
  expect(animation).toBeDefined()
  const frames = (animation.effect as KeyframeEffect).getKeyframes()
  expect(frames.map(frame => frame.opacity)).toEqual(['0.3', '1', '0.3'])
  expect(frames.every(frame => frame.transform === undefined)).toBe(true)
  bodyAttribute(surfaceAttribute('skin.motion'), 'reduced')
  expect(getComputedStyle(dot).animationName).toBe('none')
  expect(getComputedStyle(dot).opacity).toBe('1')
})

test('the explicit ring takes precedence over an applicable title and becomes static under reduced motion', () => {
  bodyAttribute(surfaceAttribute('skin.ongoing-indicator'), 'ring')
  bodyAttribute(surfaceAttribute('skin.motion'), 'full')
  const view = mount('ongoing')
  const dot = view.dot as Element
  view.sync()
  expect(view.row.getAttribute(RUNNING_TITLE)).toBe('')
  expect(getComputedStyle(view.title).animationName).toBe('none')
  expect(painted(dot)).toBe(true)
  expect(dot.getAnimations().length).toBeGreaterThan(0)
  expect(dot.getBoundingClientRect().width).toBe(10)
  expect(getComputedStyle(dot).backgroundColor).toBe('rgba(0, 0, 0, 0)')
  bodyAttribute(surfaceAttribute('skin.motion'), 'reduced')
  expect(getComputedStyle(view.title).animationName).toBe('none')
  expect(getComputedStyle(dot).animationName).toBe('none')
  expect(painted(dot)).toBe(true)
  expect(dot.getBoundingClientRect().width).toBe(10)
})

test.each([null, 'breathe'])('preference %s keeps the original breathing marker for selected and unselected rows', preference => {
  bodyAttribute(surfaceAttribute('skin.ongoing-indicator'), preference)
  bodyAttribute(surfaceAttribute('skin.motion'), 'full')
  const view = mount('ongoing')
  for (const selected of ['false', 'true']) {
    view.row.setAttribute('aria-selected', selected)
    view.sync()
    expect(getComputedStyle(view.title).animationName).toBe('none')
    expect(painted(view.dot as Element)).toBe(true)
    expect(getComputedStyle(view.dot as Element).backgroundColor).toBe('rgb(137, 135, 129)')
    expect(getComputedStyle(view.dot as Element).animationDuration).toBe('1.2s')
  }
})

test('shimmer animates the running title while native nodes, listeners and accessible labels survive', () => {
  bodyAttribute(surfaceAttribute('skin.ongoing-indicator'), 'shimmer')
  bodyAttribute(surfaceAttribute('skin.motion'), 'full')
  const view = mount('ongoing')
  const dot = view.dot as Element
  const label = document.createElement('span')
  label.textContent = 'Native running screen-reader label'
  label.style.cssText = 'position:absolute;clip-path:inset(50%)'
  view.seat.append(label)
  view.title.setAttribute('aria-label', 'Original session name')
  const nodes = [...view.row.childNodes]
  const titleNodes = [...view.title.childNodes]
  const slotNodes = [...view.seat.childNodes]
  const titleAttributes = [...view.title.attributes].map(attribute => [attribute.name, attribute.value])
  let titleClicks = 0
  let menuClicks = 0
  view.title.addEventListener('click', () => { titleClicks += 1 })
  view.menu.addEventListener('click', () => { menuClicks += 1 })
  view.sync()
  expect(view.row.getAttribute(RUNNING_TITLE)).toBe('')
  expect(view.title.getAnimations().length).toBeGreaterThan(0)
  expect(getComputedStyle(view.title).backgroundImage).not.toBe('none')
  expect(getComputedStyle(view.title).animationDuration).toBe('3s')
  expect(getComputedStyle(view.title).animationTimingFunction).toBe('cubic-bezier(0.45, 0, 0.55, 1)')
  expect(painted(dot)).toBe(false)
  expect([...view.row.childNodes]).toEqual(nodes)
  expect([...view.title.childNodes]).toEqual(titleNodes)
  expect([...view.seat.childNodes]).toEqual(slotNodes)
  expect([...view.title.attributes].map(attribute => [attribute.name, attribute.value])).toEqual(titleAttributes)
  expect(view.title.textContent).toBe('Native session title')
  expect(dot.getAttribute('role')).toBe('status')
  expect(dot.getAttribute('aria-label')).toBe('Native ongoing')
  expect(dot.textContent).toBe('Native ongoing explanation')
  expect(label.textContent).toBe('Native running screen-reader label')
  expect(view.seat.hasAttribute('aria-hidden')).toBe(false)
  expect(getComputedStyle(view.seat).display).not.toBe('none')
  expect(getComputedStyle(view.seat).visibility).toBe('visible')
  expect(getComputedStyle(label).visibility).toBe('visible')
  view.title.click()
  view.menu.click()
  expect([titleClicks, menuClicks]).toEqual([1, 1])
})

test.each(['light', 'dark'])('%s selected running rows keep a static title without a marker and reduced motion restores the dot', scheme => {
  bodyAttribute(DARK_THEME_ATTRIBUTE, scheme === 'dark' ? '' : null)
  bodyAttribute(surfaceAttribute('skin.ongoing-indicator'), 'shimmer')
  bodyAttribute(surfaceAttribute('skin.motion'), 'full')
  const view = mount('ongoing')
  for (const part of ['session-row', 'session-row row-selected', 'session-row row-active']) {
    view.row.setAttribute(PART, part)
    view.row.setAttribute('aria-selected', String(part !== 'session-row'))
    view.sync()
    expect(view.row.getAttribute(RUNNING_TITLE)).toBe('')
    if (part === 'session-row') expect(view.title.getAnimations().length).toBeGreaterThan(0)
    else expect(getComputedStyle(view.title).animationName).toBe('none')
    expect(painted(view.dot as Element)).toBe(false)
  }
  bodyAttribute(surfaceAttribute('skin.motion'), 'reduced')
  expect(view.row.getAttribute(RUNNING_TITLE)).toBe('')
  expect(getComputedStyle(view.title).animationName).toBe('none')
  expect(getComputedStyle(view.dot as Element).animationName).toBe('none')
  expect(getComputedStyle(view.dot as Element).opacity).toBe('1')
  expect(painted(view.dot as Element)).toBe(true)
  expect(painted(view.title)).toBe(true)
  bodyAttribute(surfaceAttribute('skin.motion'), 'full')
  expect(getComputedStyle(view.title).animationName).toBe('none')
  expect(painted(view.dot as Element)).toBe(false)
  view.row.setAttribute('aria-selected', 'false')
  expect(view.title.getAnimations().length).toBeGreaterThan(0)
})

const inapplicableTitles: [string, (view: ReturnType<typeof mount>) => void][] = [
  ['missing', view => view.title.remove()],
  ['empty', view => { view.title.textContent = '' }],
  ['whitespace', view => { view.title.textContent = ' \n\t ' }],
  ['rich content', view => view.title.append(document.createElement('strong'))],
  ['contenteditable', view => { view.title.contentEditable = 'true' }],
  ['inherited editor', view => { view.row.contentEditable = 'true' }],
  ['hidden', view => { view.title.hidden = true }],
  ['aria-hidden', view => view.title.setAttribute('aria-hidden', 'true')],
  ['hidden row', view => { view.row.hidden = true }],
  ['aria-hidden row', view => view.row.setAttribute('aria-hidden', 'true')],
  ['display none', view => { view.title.style.display = 'none' }],
  ['visibility hidden', view => { view.title.style.visibility = 'hidden' }],
  ['transparent', view => { view.title.style.opacity = '0' }],
  ['zero width', view => { view.title.style.cssText = 'flex:none;width:0;height:20px;overflow:hidden' }],
  ['zero height', view => { view.title.style.cssText = 'flex:none;width:100px;height:0;overflow:hidden' }],
  ['nested title', view => { const wrapper = document.createElement('div'); view.title.replaceWith(wrapper); wrapper.append(view.title) }],
]

test.each(inapplicableTitles)('%s title removes the running marker without replacing host nodes', (_reason, change) => {
  const view = mount('ongoing')
  view.sync()
  expect(view.row.getAttribute(RUNNING_TITLE)).toBe('')
  change(view)
  const nodes = [...view.row.childNodes]
  view.sync()
  expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(false)
  expect([...view.row.childNodes]).toEqual(nodes)
  expect(view.dot?.parentElement).toBe(view.seat)
})

test.each(['input', 'textarea', 'select', 'button', 'svg'])('%s title keeps the native running fallback', tag => {
  bodyAttribute(surfaceAttribute('skin.ongoing-indicator'), 'shimmer')
  bodyAttribute(surfaceAttribute('skin.motion'), 'full')
  const view = mount('ongoing')
  view.sync()
  const editor = tag === 'svg' ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag)
  editor.setAttribute(PART, 'row-title')
  editor.textContent = 'Host title control'
  view.title.replaceWith(editor)
  view.sync()
  expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(false)
  expect(editor.parentElement).toBe(view.row)
  expect(getComputedStyle(editor).animationName).toBe('none')
  expect(painted(view.dot as Element)).toBe(true)
})

test('host title replacement and text-node changes are reread without copying or rewriting content', () => {
  const view = mount('ongoing')
  view.sync()
  const replacement = view.title.cloneNode(false) as HTMLElement
  const text = document.createTextNode('Replacement title')
  replacement.append(text)
  view.title.replaceWith(replacement)
  view.sync()
  expect(view.row.getAttribute(RUNNING_TITLE)).toBe('')
  expect(replacement.firstChild).toBe(text)
  text.data = '   '
  view.sync()
  expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(false)
  text.data = 'Renamed session'
  view.sync()
  expect(view.row.getAttribute(RUNNING_TITLE)).toBe('')
  expect(replacement.firstChild).toBe(text)
  expect(replacement.textContent).toBe('Renamed session')
  expect(view.title.isConnected).toBe(false)
})

test.each(['warning', 'done', 'error', 'idle'])('ongoing to %s clears title animation and returning to ongoing restores it', state => {
  bodyAttribute(surfaceAttribute('skin.ongoing-indicator'), 'shimmer')
  bodyAttribute(surfaceAttribute('skin.motion'), 'full')
  const view = mount('ongoing')
  view.sync()
  expect(view.row.getAttribute(RUNNING_TITLE)).toBe('')
  view.dot?.setAttribute(SESSION_PHASE_ATTRIBUTE, state)
  view.sync()
  expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(false)
  expect(getComputedStyle(view.title).animationName).toBe('none')
  view.dot?.setAttribute(SESSION_PHASE_ATTRIBUTE, 'ongoing')
  view.sync()
  expect(view.row.getAttribute(RUNNING_TITLE)).toBe('')
  expect(view.title.getAnimations().length).toBeGreaterThan(0)
})

test('only the direct primary ongoing status can claim the title and foreign ownership clears it', () => {
  const view = mount('ongoing')
  const dot = view.dot as Element
  view.sync()
  expect(view.row.getAttribute(RUNNING_TITLE)).toBe('')
  const foreign = document.createElement('button')
  foreign.textContent = 'Extension action'
  view.outlet.append(foreign)
  view.sync()
  expect(view.row.getAttribute(STATUS)).toBe('foreign')
  expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(false)
  foreign.remove()
  view.sync()
  expect(view.row.getAttribute(RUNNING_TITLE)).toBe('')
  const warning = nativeDot('warning')
  view.seat.prepend(warning)
  view.sync()
  expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(false)
  warning.remove()
  view.outlet.append(dot)
  view.sync()
  expect(view.row.getAttribute(STATUS)).toBe('foreign')
  expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(false)
  dot.remove()
  view.sync()
  expect(view.row.getAttribute(STATUS)).toBe('idle')
  expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(false)
})

test('title size observation follows the current node, restores eligibility and disconnects on dispose', async () => {
  let changes = 0
  const view = mount('ongoing', 'ltr', () => { changes += 1; view.sync() })
  view.sync()
  await expect.poll(() => changes).toBeGreaterThan(0)
  view.title.style.cssText = 'flex:none;width:0;height:20px;overflow:hidden'
  await expect.poll(() => view.row.hasAttribute(RUNNING_TITLE)).toBe(false)
  view.title.style.width = '100px'
  await expect.poll(() => view.row.hasAttribute(RUNNING_TITLE)).toBe(true)
  const replacement = view.title.cloneNode(true) as HTMLElement
  view.title.replaceWith(replacement)
  view.title.style.display = 'inline-block'
  document.body.append(view.title)
  removeAfterTest(view.title)
  view.sync()
  await nextFrame()
  const beforeOldResize = changes
  view.title.style.width = '140px'
  await nextFrame()
  expect(changes).toBe(beforeOldResize)
  replacement.style.width = '0'
  await expect.poll(() => view.row.hasAttribute(RUNNING_TITLE)).toBe(false)
  replacement.style.width = '120px'
  await expect.poll(() => view.row.hasAttribute(RUNNING_TITLE)).toBe(true)
  view.dot?.setAttribute(SESSION_PHASE_ATTRIBUTE, 'warning')
  view.sync()
  const beforeInactiveResize = changes
  replacement.style.width = '140px'
  await nextFrame()
  expect(changes).toBe(beforeInactiveResize)
  expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(false)
  view.dot?.setAttribute(SESSION_PHASE_ATTRIBUTE, 'ongoing')
  view.sync()
  await expect.poll(() => changes).toBeGreaterThan(beforeInactiveResize)
  expect(view.row.getAttribute(RUNNING_TITLE)).toBe('')
  view.right.dispose()
  const beforeDispose = changes
  replacement.style.width = '160px'
  await nextFrame()
  expect(changes).toBe(beforeDispose)
  expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(false)
})

const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

test('title animation and semantic status colors are confined to the owned direct sidebar parts', () => {
  bodyAttribute(surfaceAttribute('skin.ongoing-indicator'), 'shimmer')
  bodyAttribute(surfaceAttribute('skin.motion'), 'full')
  const outside = nativeDot('done')
  const nested = nativeDot('done')
  const tools = document.createElement('div')
  tools.style.color = 'rgb(20, 150, 80)'
  const outsideTitle = document.createElement('span')
  outsideTitle.setAttribute(PART, 'row-title')
  outsideTitle.textContent = 'Unrelated title'
  tools.append(outside, outsideTitle)
  document.body.append(tools)
  removeAfterTest(tools)
  const view = mount('ongoing')
  view.actions.style.color = 'rgb(20, 150, 80)'
  view.actions.append(nested)
  const nestedTitle = outsideTitle.cloneNode(true) as HTMLElement
  view.actions.append(nestedTitle)
  view.sync()
  expect(view.title.getAnimations().length).toBeGreaterThan(0)
  for (const title of [outsideTitle, nestedTitle]) expect(title.getAnimations()).toEqual([])
  for (const dot of [outside, nested]) expect(getComputedStyle(dot).color).toBe('rgb(20, 150, 80)')
  bodyAttribute(ENABLED, null)
  expect(view.title.getAnimations()).toEqual([])
  expect(painted(view.dot as Element)).toBe(true)
  for (const dot of [outside, nested]) expect(getComputedStyle(dot).color).toBe('rgb(20, 150, 80)')
})

test('the shipped CSS gates title motion and SVG hiding out of forced colors and supplies a static contrast fallback', () => {
  bodyAttribute(surfaceAttribute('skin.ongoing-indicator'), 'shimmer')
  bodyAttribute(surfaceAttribute('skin.motion'), 'full')
  const view = mount('ongoing')
  view.sync()
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(SIDEBAR_STATUS_SHEET)
  const rules: { rule: CSSStyleRule, media: string[] }[] = []
  const visit = (entries: CSSRuleList, media: string[] = []) => {
    for (const rule of entries) {
      if (rule instanceof CSSStyleRule) rules.push({ rule, media })
      else if (rule instanceof CSSMediaRule) visit(rule.cssRules, [...media, rule.conditionText])
      else if (rule instanceof CSSSupportsRule) visit(rule.cssRules, media)
    }
  }
  visit(sheet.cssRules)
  const titleMotion = rules.filter(({ rule }) => {
    const animation = rule.style.animation || rule.style.animationName
    return view.title.matches(rule.selectorText) && animation !== '' && animation !== 'none'
  })
  const hiddenDot = rules.filter(({ rule }) => (view.dot as Element).matches(rule.selectorText) && (rule.style.visibility === 'hidden' || rule.style.display === 'none'))
  expect(titleMotion.length).toBeGreaterThan(0)
  expect(hiddenDot.length).toBeGreaterThan(0)
  for (const { media } of [...titleMotion, ...hiddenDot]) {
    expect(media.some(condition => condition.includes('(forced-colors: none)'))).toBe(true)
    expect(media.some(condition => condition.includes('(prefers-reduced-motion: no-preference)'))).toBe(true)
  }
  const contrast = rules.filter(({ rule, media }) => (view.dot as Element).matches(rule.selectorText) && media.some(condition => condition.includes('(forced-colors: active)')))
  expect(contrast.some(({ rule }) => rule.style.animationName === 'none')).toBe(true)
  expect(contrast.some(({ rule }) => rule.style.backgroundColor.toLowerCase() === 'canvastext')).toBe(true)
})

test('repeated sync observes title eligibility and native state without additional DOM mutations', () => {
  for (const state of ['ongoing', 'warning', 'done', 'error', 'idle', null]) {
    const view = mount(state)
    if (state === null) view.outlet.append(document.createElement('button'))
    for (const text of ['Native session title', '']) {
      view.title.textContent = text
      view.sync()
      expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(state === 'ongoing' && text.length > 0)
      const watch = new MutationObserver(() => {})
      watch.observe(view.row, { attributes: true, childList: true, characterData: true, subtree: true })
      view.sync()
      view.sync()
      expect(watch.takeRecords()).toEqual([])
      watch.disconnect()
    }
  }
})

test('dispose clears title eligibility and animation while preserving the native title', () => {
  bodyAttribute(surfaceAttribute('skin.ongoing-indicator'), 'shimmer')
  bodyAttribute(surfaceAttribute('skin.motion'), 'full')
  const view = mount('ongoing')
  const attributes = [...view.row.attributes].map(attribute => [attribute.name, attribute.value])
  const nodes = [...view.row.childNodes]
  view.sync()
  expect(view.title.getAnimations().length).toBeGreaterThan(0)
  view.right.dispose()
  view.right.dispose()
  expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(false)
  expect(getComputedStyle(view.title).animationName).toBe('none')
  expect([...view.row.attributes].map(attribute => [attribute.name, attribute.value])).toEqual(attributes)
  expect([...view.row.childNodes]).toEqual(nodes)
  expect(view.title.textContent).toBe('Native session title')
})
