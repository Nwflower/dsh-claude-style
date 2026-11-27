/**
 * @capability composer-crowding
 * @features composer, model
 * @risk A foreign right-hand control touches or paints over the model seat: the
 * controls box keeps no column gap, and a plugin that nudges itself toward the
 * seat assuming the host's gap leans into the plate (issues #438 and #509).
 */
import { beforeAll, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { pageCleanups } from '../../fixtures/page'
import { surfaceAttribute } from '../../fixtures/surface'
import { crowdingMount, frames, type CrowdedComposer } from './fixture'

const HOLDS = surfaceAttribute('skin.holds')

beforeAll(async () => { await page.viewport(1280, 1000) })

const mount = crowdingMount(pageCleanups())

/** dsh-prompt-rewriter's actual seat shape: a fixed flex root leaning toward the
 * model label by translateX(var(--dsh-pe-seat-nudge, 7px)), a nudge tuned for the
 * host's toolbar gap. */
function mountNudgedControl(view: CrowdedComposer) {
  const root = document.createElement('div')
  root.style.cssText = 'display:flex;flex:0 0 auto;align-items:center;min-width:0;max-width:100%;margin-right:0;position:relative;transform:translateX(var(--dsh-pe-seat-nudge,7px))'
  const button = document.createElement('button')
  button.type = 'button'
  button.style.cssText = 'box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;background:transparent;line-height:0'
  button.textContent = '✦'
  root.append(button)
  view.right.append(root)
  view.responsive.measure()
  return root
}

/** dsh-voice-prompt-enhancer's fixed-width enhance button, whose literal negative
 * margin closes up to a following voice button under the host's toolbar gap. */
function mountVoiceEnhancerControl(view: CrowdedComposer) {
  const control = document.createElement('button')
  control.type = 'button'
  control.className = 'dsh-enh-btn'
  control.textContent = '✨ 优化'
  control.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:63px;height:28px;flex:0 0 auto;padding:0 8px 0 4px;border:0;white-space:nowrap'
  const pluginSheet = document.createElement('style')
  pluginSheet.textContent = '.dsh-enh-btn{margin-right:-12px}'
  view.right.append(pluginSheet, control)
  view.responsive.measure()
  return control
}

/** The horizontal air between a control's painted right edge and the seat's left
 * edge: positive while the two stand apart, negative while one covers the other. */
function gapToSeat(control: HTMLElement, view: CrowdedComposer) {
  return view.seat.getBoundingClientRect().left - control.getBoundingClientRect().right
}

test('the seat keeps a leading inset from a plain foreign right-hand control', async () => {
  const view = mount({ width: 1000 }); await frames()
  expect(view.card.getAttribute(HOLDS) ?? '').toContain('composer-right-filled')
  for (const width of [1000, 600, 480]) {
    view.resize(width); await frames()
    const gap = gapToSeat(view.vision, view)
    expect(gap).toBeGreaterThanOrEqual(3)
    expect(gap).toBeLessThanOrEqual(5)
    expect(view.vision.getBoundingClientRect().right).toBeLessThanOrEqual(view.seat.getBoundingClientRect().left)
  }
})

test('a nudged foreign control keeps its inset: the skin neutralizes the seat nudge', async () => {
  const view = mount({ width: 1000 }); await frames()
  const root = mountNudgedControl(view); await frames()
  // The override reaches the plugin root and resolves its nudge to zero, so the
  // root paints no translate toward the seat (Chromium spells the identity
  // matrix, Firefox 'none').
  expect(getComputedStyle(root).getPropertyValue('--dsh-pe-seat-nudge').trim()).toBe('0')
  expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(getComputedStyle(root).transform)
  for (const width of [1000, 600, 480]) {
    view.resize(width); await frames()
    const gap = gapToSeat(root, view)
    expect(gap).toBeGreaterThanOrEqual(3)
    expect(gap).toBeLessThanOrEqual(5)
    expect(root.getBoundingClientRect().right).toBeLessThanOrEqual(view.seat.getBoundingClientRect().left)
    expect(view.card.scrollWidth).toBeLessThanOrEqual(view.card.clientWidth + 1)
  }
})

test('an enhancer ending the right slot keeps its seat inset and only tightens beside a following voice control', async () => {
  const view = mount({ width: 1000 }); await frames()
  const control = mountVoiceEnhancerControl(view); await frames()
  for (const width of [1000, 600, 480]) {
    view.resize(width); await frames()
    expect(getComputedStyle(control).marginRight).toBe('0px')
    const gap = gapToSeat(control, view)
    expect(gap).toBeGreaterThanOrEqual(3)
    expect(gap).toBeLessThanOrEqual(5)
    expect(control.getBoundingClientRect().right).toBeLessThanOrEqual(view.seat.getBoundingClientRect().left)
    expect(view.card.scrollWidth).toBeLessThanOrEqual(view.card.clientWidth + 1)
  }

  const voice = document.createElement('button')
  voice.type = 'button'
  voice.textContent = '🎤'
  voice.style.cssText = 'width:36px;height:28px;flex:0 0 auto;padding:0;border:0'
  view.right.append(voice)
  view.responsive.measure(); await frames()
  expect(getComputedStyle(control).marginRight).toBe('-12px')
})
