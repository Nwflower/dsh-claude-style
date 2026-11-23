/**
 * The landed stand-in is as wide as the words it holds, bounded by the bubble's
 * own cap and measured in page pixels.
 *
 * The flight takes off while the row is still growing, so the row it flies to is
 * narrower than the message it will hold. The shell's width at the end of the
 * flight must be the width the words were laid out at, or the shell clips them and
 * its own corner reads tighter than the bubble's on a box narrower than the message.
 *
 * The clamp that keeps the drawn shape inside the column is a distance from the
 * take-off edge, so it has to be read the same way at every displacement: a flight
 * that travels right, left, or not at all must land on the same whole shape.
 *
 * @capability send-flight
 * @features chat-send
 * @risk The landed stand-in is narrower than the words inside it, expands a multi-line message past its max-width, or drifts under pageZoom.
 */
import { afterEach, expect, test } from 'vitest'
import { CHAT_SHAPE_SAMPLES, PAGE_ZOOM_ATTR, QUIET_ATTR, chatSendSamples, maxContentWidthOf } from '@dsh-claude-style/client/pure'

const INSETS = { left: 16, top: 10, right: 16, lineHeight: 22 }
const cleanups: (() => void)[] = []

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

function mountBubble(text: string, bubbleCss: string, parentCss = 'width:748px') {
  const host = document.createElement('div')
  host.style.cssText = `position:absolute;left:0;top:0;box-sizing:border-box;${parentCss}`
  const element = document.createElement('div')
  element.style.cssText = `font:16px/24px sans-serif;white-space:pre-wrap;padding:10px 16px;border:1px solid transparent;box-sizing:border-box;${bubbleCss}`
  element.textContent = text
  host.appendChild(element)
  document.body.appendChild(host)
  cleanups.push(() => host.remove())
  return element
}

test('the last sample is as wide as the words it holds', () => {
  // The width the row settles at, wider than the row the flight took off from.
  const settled = 284.48
  const samples = chatSendSamples(INSETS, INSETS, 712, 73, settled, 44.09, 18, 20, 0)
  expect(samples).toHaveLength(CHAT_SHAPE_SAMPLES + 1)
  const last = samples.at(-1)!
  expect(last.m).toBe(1)
  expect(last.width).toBeCloseTo(settled, 6)
  expect(last.visible).toBeCloseTo(settled, 6)
})

test('the shape lands whole wherever the flight starts', () => {
  // The displacement is a horizontal distance, so the same message must land on
  // the same shape whether the composer sat left of, right of, or on the row.
  const settled = 284.48
  const endLeft = 150
  const broken: string[] = []
  for (const startLeft of [0, 50, 150, 400, 900]) {
    const dx = endLeft - startLeft
    const samples = chatSendSamples(INSETS, INSETS, 712, 73, settled, 44.09, 18, 20, dx)
    const last = samples.at(-1)!
    if (Math.abs(last.visible - settled) > 0.01) {
      broken.push(`start ${startLeft}: landed visible ${last.visible}, settled ${settled}`)
    }
  }
  expect(broken).toEqual([])
})

test('the drawn shape never collapses on the way in', () => {
  // A shape that narrows to nothing part way through reads as the flight vanishing.
  // The clamp is what stops that, and it only has room to act when the flight is
  // short enough to stay on one screen — a displacement past the column is the
  // clamp doing its job, and the flight is skipped before it starts
  // (send-flight.ts's sameScreen).
  const settled = 284.48
  const endLeft = 150
  const broken: string[] = []
  for (const startLeft of [0, 50, 150, 400]) {
    const dx = endLeft - startLeft
    const samples = chatSendSamples(INSETS, INSETS, 712, 73, settled, 44.09, 18, 20, dx)
    for (const sample of samples) {
      if (sample.visible > sample.width + 1e-9) broken.push(`start ${startLeft}: visible past width`)
      if (sample.visible < 0) broken.push(`start ${startLeft}: negative visible`)
      if (sample.m > 0.5 && sample.visible < 712 * 0.05) {
        broken.push(`start ${startLeft} at m=${sample.m.toFixed(2)}: visible ${sample.visible}`)
      }
    }
  }
  expect(broken).toEqual([])
})

test('maxContentWidthOf caps multi-line bubbles at max-width and parent width', () => {
  const longText = '这是一段足够长到一定会换行的多行用户消息，用来确认测量落定宽度时不会把整段文字展开成一行并撑出对话列。'.repeat(3)
  const pixelCapped = mountBubble(longText, 'width:fit-content;max-width:420px', 'width:748px')
  expect(maxContentWidthOf(pixelCapped)).toBeCloseTo(420, 1)

  const percentCapped = mountBubble(longText, 'width:fit-content;max-width:80%', 'width:700px')
  expect(maxContentWidthOf(percentCapped)).toBeCloseTo(560, 1)

  const parentCapped = mountBubble(longText, 'width:fit-content;max-width:none', 'width:500px')
  expect(maxContentWidthOf(parentCapped)).toBeCloseTo(500, 1)
})

test('maxContentWidthOf stays in page pixels across pageZoom factors', () => {
  const bubble = mountBubble('这是一条用来检查缩放换算的中文消息', 'width:fit-content;max-width:600px', 'width:748px')
  const baseWidth = maxContentWidthOf(bubble)
  expect(baseWidth).toBeGreaterThan(0)

  const previousZoom = document.body.style.zoom
  const previousAttr = document.body.getAttribute(PAGE_ZOOM_ATTR)
  cleanups.push(() => {
    document.body.style.zoom = previousZoom
    if (previousAttr === null) document.body.removeAttribute(PAGE_ZOOM_ATTR)
    else document.body.setAttribute(PAGE_ZOOM_ATTR, previousAttr)
  })

  for (const factor of [1.1, 0.8]) {
    document.body.style.zoom = String(factor)
    document.body.setAttribute(PAGE_ZOOM_ATTR, String(factor))
    // Glyph hinting at non-integer zoomed font sizes shifts advance sums by a fraction of a pixel;
    // unscaled viewport pixels would drift by 10%–20% (~30–60px).
    expect(Math.abs(maxContentWidthOf(bubble) - baseWidth)).toBeLessThan(2)
  }
})

test('maxContentWidthOf marks its probe quiet and leaves nothing behind', () => {
  const bubble = mountBubble('静默探针检查', 'width:fit-content;max-width:600px')
  const added: Element[] = []
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) added.push(node)
      }
    }
  })
  observer.observe(document.body, { childList: true })
  cleanups.push(() => observer.disconnect())

  const lastBefore = document.body.lastElementChild
  maxContentWidthOf(bubble)
  observer.takeRecords().forEach((record) => {
    record.addedNodes.forEach((node) => {
      if (node instanceof Element) added.push(node)
    })
  })
  expect(added.length).toBeGreaterThan(0)
  expect(added.every(node => node.hasAttribute(QUIET_ATTR))).toBe(true)
  expect(document.body.lastElementChild).toBe(lastBefore)
})
