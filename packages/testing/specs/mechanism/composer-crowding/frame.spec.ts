/**
 * @capability composer-crowding
 * @features composer
 * @risk An overflowing native width handle makes the outer phase root a second
 * scroll container; ownership must not clip embedded views or the inner scroller.
 */
import { beforeAll, beforeEach, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { composerResponsiveCss, createComposerResponsive } from '@dsh-claude-style/client/pure'
import { installParts } from '@dsh-claude-style/engine/parts'
import {
  COMPOSER_CARD_SELECTOR, COMPOSER_VARIANT_ATTRIBUTE, CONVERSATION_CONTENT_SELECTOR,
  CONVERSATION_MAIN_SLOT_SELECTOR, CONVERSATION_SCROLL_SELECTOR, PHASE_ATTRIBUTE,
} from '@dsh-claude-style/contracts/dom'
import { attach } from '../../fixtures/host-markup'
import { pageCleanups } from '../../fixtures/page'
import { partRegion } from '../../fixtures/part-region'
import { surfaceAttribute } from '../../fixtures/surface'
import { TEST_PARTS } from '../../fixtures/vocabulary'

beforeAll(async () => { await page.viewport(1280, 1000) })
const cleanups = pageCleanups()
const FRAME = surfaceAttribute('composer.frame')
const PART = surfaceAttribute('skin.part')
const vocabulary = { ...TEST_PARTS, part: PART, holds: surfaceAttribute('skin.holds') }
const region = partRegion(CONVERSATION_SCROLL_SELECTOR, vocabulary)
beforeEach(() => { cleanups.push(installParts(vocabulary)) })
const settle = async () => {
  for (let index = 0; index < 4; index += 1) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}
const remember = (nodes: HTMLElement[]) => new Map(nodes.map(node => [node, node.parentElement]))
const unchanged = (parents: ReturnType<typeof remember>) => {
  for (const [node, parent] of parents) expect(node.parentElement).toBe(parent)
}

/** Only native box/overflow inputs; the 560px phantom is not account or message data. */
function mount(phase = 'active', structure: 'direct' | 'embedded' | 'no-main' = 'direct') {
  document.body.setAttribute(surfaceAttribute('skin.root'), '')
  const native = document.createElement('style')
  native.textContent = `
    ${CONVERSATION_MAIN_SLOT_SELECTOR} { display:contents; }
    [${PHASE_ATTRIBUTE}] { position:relative;display:flex;flex-direction:column;width:240px;height:120px; }
    [${PHASE_ATTRIBUTE}='active'] { overflow:hidden; }
    ${CONVERSATION_CONTENT_SELECTOR} { display:flex;flex-direction:column;flex:1;min-height:0;width:100%; }
    ${CONVERSATION_SCROLL_SELECTOR} { height:80px;overflow-y:auto; }
    [${PART}~='row'] { display:flex;min-height:28px; }
  `
  const sheet = document.createElement('style'); sheet.textContent = composerResponsiveCss
  document.head.append(native, sheet)
  const outlet = structure === 'no-main' ? document.createElement('div') : attach(document.body, CONVERSATION_MAIN_SLOT_SELECTOR)
  document.body.append(outlet)
  const frame = document.createElement('div'); frame.setAttribute(PHASE_ATTRIBUTE, phase); outlet.append(frame)
  const container = structure === 'embedded' ? frame.appendChild(document.createElement('div')) : frame
  const content = attach(container, CONVERSATION_CONTENT_SELECTOR)
  const inner = attach(content, CONVERSATION_SCROLL_SELECTOR)
  const fill = document.createElement('div'); fill.style.height = '360px'; inner.append(fill)
  const card = attach(inner, COMPOSER_CARD_SELECTOR); card.className = region.box('card').className
  card.setAttribute(COMPOSER_VARIANT_ATTRIBUTE, 'inline'); card.style.width = '200px'
  const phantom = document.createElement('div'); phantom.style.cssText = 'position:absolute;top:0;left:0;width:560px;height:1px'; frame.append(phantom)
  const responsive = createComposerResponsive()
  cleanups.push(() => { responsive.dispose(); outlet.remove(); native.remove(); sheet.remove(); document.body.removeAttribute(surfaceAttribute('skin.root')) })
  const parents = remember([outlet, frame, content, inner, fill, card, phantom])
  return { outlet, frame, content, inner, card, phantom, responsive, parents }
}

function addRow(card: HTMLElement) {
  const row = region.box('row', region.box('tools')); card.append(row); return row
}

test('only a direct main slot phase root content chain is claimed', async () => {
  for (const phase of ['hero', 'settling', 'active']) {
    const view = mount(phase); view.responsive.sync([view.card], true); await settle()
    expect(getComputedStyle(view.outlet).display).toBe('contents')
    expect(view.frame.hasAttribute(FRAME)).toBe(true); unchanged(view.parents)
  }
  for (const [phase, structure] of [['active', 'embedded'], ['active', 'no-main'], ['unknown', 'direct']] as const) {
    const view = mount(phase, structure); view.responsive.sync([view.card], true); await settle()
    expect(view.frame.hasAttribute(FRAME)).toBe(false); unchanged(view.parents)
  }
})

test('one root aggregates multiple cards and does not wait for a late toolbar', async () => {
  const view = mount(); const second = attach(view.inner, COMPOSER_CARD_SELECTOR)
  second.className = region.box('card').className; second.setAttribute(COMPOSER_VARIANT_ATTRIBUTE, 'inline'); second.style.width = '200px'
  const secondParent = second.parentElement
  view.responsive.sync([view.card, second], true); await settle()
  expect(view.frame.hasAttribute(FRAME)).toBe(true)
  expect(second.hasAttribute(surfaceAttribute('composer.responsive-layout'))).toBe(false)
  view.responsive.sync([second], true); await settle()
  expect(view.frame.hasAttribute(FRAME)).toBe(true)
  const row = addRow(second); await settle(); view.responsive.sync([second], true); await settle()
  expect(row.hasAttribute(surfaceAttribute('composer.responsive-toolbar'))).toBe(true)
  expect(second.getAttribute(surfaceAttribute('composer.responsive-layout'))).toBe('stacked')
  expect(view.frame.hasAttribute(FRAME)).toBe(true); expect(second.parentElement).toBe(secondParent); unchanged(view.parents)
})

test('scope off, removed cards, disconnected roots, disposal and known stale marks release ownership', async () => {
  const view = mount(); view.responsive.sync([view.card], true); await settle()
  view.responsive.sync([view.card], false); expect(view.frame.hasAttribute(FRAME)).toBe(false)
  view.responsive.sync([view.card], true); view.responsive.sync([], true)
  expect(view.frame.hasAttribute(FRAME)).toBe(false)
  view.responsive.sync([view.card], true); view.card.remove()
  view.responsive.sync([view.card], true); expect(view.frame.hasAttribute(FRAME)).toBe(false)
  expect(view.card.parentElement).toBeNull(); view.inner.append(view.card)
  view.responsive.sync([view.card], true); view.frame.remove()
  const detached = remember([view.frame, view.content, view.inner, view.card, view.phantom])
  view.responsive.sync([view.card], true); expect(view.frame.hasAttribute(FRAME)).toBe(false); unchanged(detached)
  view.outlet.append(view.frame); view.responsive.sync([view.card], true)
  expect(view.frame.hasAttribute(FRAME)).toBe(true); view.responsive.dispose()
  expect(view.frame.hasAttribute(FRAME)).toBe(false); unchanged(view.parents)
  const stale = mount('unknown'); stale.frame.setAttribute(FRAME, '')
  stale.responsive.sync([stale.card], false); expect(stale.frame.hasAttribute(FRAME)).toBe(false); unchanged(stale.parents)
})

test('an unchanged card set schedules no empty measurement, while a real resize still refits', async () => {
  const view = mount()
  view.responsive.sync([view.card], true)
  await settle()
  addRow(view.card)
  await settle()
  view.responsive.sync([view.card], true)
  await settle()
  expect(view.card.getAttribute(surfaceAttribute('composer.responsive-layout'))).toBe('stacked')
  const original = window.requestAnimationFrame
  let calls = 0
  // cost: D40 — count only requests the product makes during the repeated sync;
  // the test's own settling frames stay outside the measurement.
  window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    calls += 1
    return original(callback)
  }) as typeof requestAnimationFrame
  try {
    view.responsive.sync([view.card], true)
  } finally {
    window.requestAnimationFrame = original
  }
  expect(calls).toBe(0)
  view.card.style.width = '480px'
  await settle()
  expect(view.card.getAttribute(surfaceAttribute('composer.responsive-layout'))).toBe('wide')
})

test('the same claimed root responds to native phase changes without another sync', async () => {
  const view = mount('hero'); view.responsive.sync([view.card], true); await settle()
  expect(view.frame.hasAttribute(FRAME)).toBe(true)
  for (const phase of ['hero', 'active', 'settling', 'hero', 'active']) {
    view.frame.setAttribute(PHASE_ATTRIBUTE, phase); await settle()
    const style = getComputedStyle(view.frame); const expected = phase === 'active' ? 'clip' : 'visible'
    expect([style.overflowX, style.overflowY]).toEqual([expected, expected])
    expect(view.frame.hasAttribute(FRAME)).toBe(true); unchanged(view.parents)
  }
})

test('active outer clipping rejects phantom scrolling while the native inner y scroller still moves', async () => {
  const view = mount(); await settle()
  expect(getComputedStyle(view.frame).overflowX).toBe('hidden')
  view.frame.scrollLeft = 80; expect(view.frame.scrollLeft).toBeGreaterThan(0)
  view.responsive.sync([view.card], true); await settle()
  expect([getComputedStyle(view.frame).overflowX, getComputedStyle(view.frame).overflowY]).toEqual(['clip', 'clip'])
  expect(view.phantom.getBoundingClientRect().width).toBe(560)
  expect(view.frame.scrollWidth).toBeGreaterThan(view.frame.clientWidth)
  view.frame.scrollLeft = 80; expect(view.frame.scrollLeft).toBe(0)
  expect(getComputedStyle(view.inner).overflowY).toBe('auto')
  expect(view.inner.scrollHeight).toBeGreaterThan(view.inner.clientHeight)
  view.inner.scrollTop = 80; expect(view.inner.scrollTop).toBe(80)
  unchanged(view.parents)
})
