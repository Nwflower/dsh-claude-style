/**
 * The conversation width handle's bar waits for the pointer (issue #270). The
 * host draws the bar on the handle's own `::after` and reveals it while the
 * pointer is over the hit strip, so a pointer crossing the transcript's edge on
 * its way anywhere else flashes a rule down the page; the skin reveals it once
 * the pointer has rested on the handle, and at once when the handle is pressed,
 * which is a reader who means to drag.
 *
 * @capability width-handle
 * @features width-handle
 * @risk A pointer passing over the transcript's edge flashes a 2px rule down the
 *   page, or a reader who rests on the handle — or presses it — gets no bar at all.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'

const HANDLE = host('shell.width-handle')
/** The handle's own attribute: the contract states the handle as a selector. */
const HANDLE_ATTR = HANDLE.replace(/^\[|\]$/g, '')
const REST = surface.attribute('width-handle.rest')

/**
 * The host's own handle and its bar (ui-conversation's ConversationRoot.module.css,
 * which the stand-in page does not carry), placed on a stage of its own so the
 * pointer can enter and leave it.
 */
const mount = (t) => t.page.evaluate((handleAttr) => {
  const style = document.createElement('style')
  style.textContent = `
    .probe-handle { position: absolute; top: 0; bottom: 0; width: 10px; cursor: col-resize; }
    .probe-handle::after { content: ''; position: absolute; top: 0; bottom: 0; width: 2px; border-radius: 2px;
      background: currentColor; opacity: 0; pointer-events: none; }
    @media (hover: hover) { .probe-handle:hover::after { opacity: 1 } }
  `
  document.head.append(style)
  const stage = document.createElement('div')
  stage.id = 'handle-stage'
  stage.style.cssText = 'position:fixed;left:400px;top:40px;width:300px;height:400px'
  const handle = document.createElement('div')
  handle.className = 'probe-handle'
  handle.setAttribute(handleAttr, '')
  handle.style.left = '150px'
  stage.append(handle)
  document.body.append(stage)
}, HANDLE_ATTR)

/** The bar as the reader sees it, and the mark the skin puts on a handle whose bar is up. */
const read = (t) => t.page.evaluate(([handleAttr, restAttr]) => {
  const handle = document.querySelector(`#handle-stage [${handleAttr}]`)
  const box = handle.getBoundingClientRect()
  return {
    opacity: Number.parseFloat(getComputedStyle(handle, '::after').opacity),
    rest: handle.hasAttribute(restAttr),
    centre: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
  }
}, [HANDLE_ATTR, REST])

/** Wait until the bar stands at `wanted`, past the fade the sheet states. */
const waitForBar = (t, wanted) => t.page.waitForFunction(([handleAttr, value]) => {
  const handle = document.querySelector(`#handle-stage [${handleAttr}]`)
  return Number.parseFloat(getComputedStyle(handle, '::after').opacity) === value
}, [HANDLE_ATTR, wanted], { timeout: 3000 })

export default spec({ page: 'desktop', bands: ['wide'] }, ({ test }) => {
  test('a pointer that passes over the handle leaves no bar, a rest or a press reveals it', async (t) => {
    await mount(t)
    await t.settle()
    await t.page.mouse.move(10, 10)
    const idle = await read(t)
    t.expectThat.equal({ opacity: idle.opacity, rest: idle.rest }, { opacity: 0, rest: false }, 'a pointer away from the handle leaves the bar down')

    await t.page.mouse.move(idle.centre.x, idle.centre.y)
    const entered = await read(t)
    t.expectThat.equal({ opacity: entered.opacity, rest: entered.rest }, { opacity: 0, rest: false }, 'the frame the pointer enters the strip shows no bar')

    // Past the rest the skin asks for, and past the fade it states.
    await waitForBar(t, 1)
    const rested = await read(t)
    t.expectThat.equal(rested.rest, true, 'a pointer that rests on the handle reveals the bar')
    t.expectThat.equal(rested.opacity, 1, 'the bar is up at full strength once the pointer has rested')

    await t.page.mouse.move(10, 10)
    await waitForBar(t, 0)
    const left = await read(t)
    t.expectThat.equal({ opacity: left.opacity, rest: left.rest }, { opacity: 0, rest: false }, 'a pointer that leaves puts the bar down and takes the mark off')

    // A press is the reader's answer, not a hover: the bar is up without waiting for the rest.
    await t.page.mouse.move(idle.centre.x, idle.centre.y)
    await t.page.mouse.down()
    const pressed = await read(t)
    t.expectThat.equal(pressed.rest, true, 'a press puts the mark on at once')
    await waitForBar(t, 1)
    t.expectThat.equal((await read(t)).opacity, 1, 'the bar is up under a press, without waiting for the rest')
    await t.page.mouse.up()
  })
})
