/**
 * The conversation composer keeps one control row when the host has mounted a
 * session: a long model name is shortened inside it, and the row does not wrap
 * into a second line above the layout where it is drawn to. An independent
 * right-hand control keeps its content width and shares that row until the
 * model's recognition floor. The width bands below are card widths, the same
 * ones the composer's breakpoints read.
 *
 * @capability composer
 * @features composer, model
 * @risk A long model name wraps the conversation's toolbar into a second row at a window width the card still calls compact or wide, moving the send button onto its own line.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'

const CARD = host('composer.card')
const PHASE = host('shell.phase')
const LAYOUT = surface.attribute('composer.responsive-layout')
const PART = surface.attribute('skin.part')
const LABEL = surface('model.seat-name')
const TOOLBAR = '[' + surface.attribute('composer.responsive-toolbar') + ']'
const RIGHT_SLOT = host('composer.right-slot')
const LONG = 'qwen4-max-preview · Bailian Token Plan Enterprise'
const FOREIGN = '5小时 42% · 周 68%'

/** Mount the host's session phase mark on the card's root, as the conversation page does. */
async function mountPhase(t) {
  await t.page.evaluate(([card, part, phase]) => {
    const element = document.querySelector(card)
    if (element === null) throw new Error('the composer card is not on the page')
    let root = element.parentElement
    while (root !== null && root !== document.body) {
      const partNames = (root.getAttribute(part) ?? '').split(/\s+/)
      if (partNames.includes('composer-stack')) {
        root.setAttribute(phase, 'active')
        return
      }
      root = root.parentElement
    }
    throw new Error('the composer stack is not on the page')
  }, [CARD, PART, PHASE])
  await t.settle()
}

/** Give the card the width under test and a name longer than it can hold. */
async function resize(t, width) {
  await t.page.evaluate(([card, label, long, width]) => {
    const element = document.querySelector(card)
    element.style.setProperty('width', width + 'px')
    element.style.setProperty('max-width', width + 'px')
    const node = document.querySelector(label)
    if (node === null) throw new Error('the model label is not on the page')
    node.textContent = long
  }, [CARD, LABEL, LONG, width])
  await t.settle()
}

/** Mount the independent control that shares the conversation row's right-hand slot. */
async function mountForeignControl(t) {
  await t.page.evaluate(([slot, text]) => {
    const anchor = document.querySelector(slot)
    if (anchor === null) throw new Error('the composer right-hand slot is not on the page')
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = text
    button.style.whiteSpace = 'nowrap'
    anchor.append(button)
  }, [RIGHT_SLOT, FOREIGN])
  await t.settle()
}

/** Mount dsh-pause's actual shape: an inline-flex root with its own button. */
async function mountNestedForeignControl(t) {
  await t.page.evaluate((slot) => {
    const anchor = document.querySelector(slot)
    if (anchor === null) throw new Error('the composer right-hand slot is not on the page')
    const root = document.createElement('div')
    root.dataset.dshPause = 'true'
    root.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:0 4px;font-size:12px;line-height:20px;white-space:nowrap'
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = '暂停'
    button.style.cssText = 'border:1px solid gray;border-radius:6px;padding:1px 8px;font-size:12px;line-height:18px;white-space:nowrap'
    root.append(button)
    anchor.append(root)
  }, RIGHT_SLOT)
  await t.settle()
}

/** What the row does: its layout, its height, the two clusters' alignment and the label's shortening. */
async function read(t) {
  return t.page.evaluate(([card, layoutMark, part, label, toolbar, rightSlot]) => {
    const element = document.querySelector(card)
    const bar = document.querySelector(toolbar)
    const tools = bar.querySelector('[' + part + '~="tools"]')
    const trailing = bar.querySelector('[' + part + '~="trailing"]')
    const centre = (node) => node.getBoundingClientRect().top + node.getBoundingClientRect().height / 2
    const node = document.querySelector(label)
    const foreign = bar.querySelector(rightSlot + ' > *')
    const box = (item) => {
      if (item === null) return null
      const rect = item.getBoundingClientRect()
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
    }
    return {
      layout: element.getAttribute(layoutMark),
      toolbarHeight: Math.round(bar.getBoundingClientRect().height),
      sameLine: Math.abs(centre(tools) - centre(trailing)) <= 1,
      overflow: element.scrollWidth - element.clientWidth,
      shortened: node.scrollWidth > node.clientWidth,
      model: { ...box(node), minWidth: parseFloat(getComputedStyle(node).minWidth) },
      foreign: box(foreign),
    }
  }, [CARD, LAYOUT, PART, LABEL, TOOLBAR, RIGHT_SLOT])
}

export default spec({ page: 'model-meter' }, ({ test }) => {
  test('a long name keeps the conversation row on one line at wide and compact card widths', async (t) => {
    await mountPhase(t)
    for (const width of [497, 440, 400, 367]) {
      await resize(t, width)
      const state = await read(t)
      const at = ' at ' + width + 'px: ' + JSON.stringify(state)
      t.expectThat.equal(state.layout === 'wide' || state.layout === 'compact', true, 'the card takes a one-line layout' + at)
      t.expectThat.equal(state.toolbarHeight <= 30, true, 'the toolbar stands one line tall' + at)
      t.expectThat.equal(state.sameLine, true, 'the permission segments and the model cluster share the row' + at)
      t.expectThat.equal(state.overflow <= 1, true, 'the card has no horizontal overflow' + at)
      t.expectThat.equal(state.shortened, true, 'the over-long name is shortened inside the row' + at)
    }
  })

  test('a nested independent control leaves the model name its room and refits when its text changes', async (t) => {
    await mountPhase(t)
    await mountNestedForeignControl(t)
    for (const width of [900, 480, 367]) {
      await resize(t, width)
      const state = await read(t)
      const at = ' at ' + width + 'px: ' + JSON.stringify(state)
      t.expectThat.equal(state.sameLine, true, 'the nested control shares the conversation row' + at)
      t.expectThat.equal(state.overflow <= 1, true, 'the card has no horizontal overflow' + at)
      t.expectThat.boxesApart(state.foreign, state.model, 'the nested control and model name do not overlap' + at)
      t.expectThat.equal(state.model.width + 1 >= state.model.minWidth, true, 'the model name keeps its recognition floor' + at)
      if (width === 900) t.expectThat.equal(state.model.width > state.model.minWidth * 2, true, 'a roomy row gives the model name more than its recognition floor' + at)
      else t.expectThat.equal(state.shortened, true, 'a tighter row spends its shortage on the model name' + at)
    }
    await t.page.evaluate((slot) => {
      const button = document.querySelector(slot + ' > * button')
      if (button === null) throw new Error('the nested control is not on the page')
      button.textContent = '已暂停·回车或点此继续'
    }, RIGHT_SLOT)
    await t.settle()
    const changed = await read(t)
    const after = ' after the control text changed: ' + JSON.stringify(changed)
    t.expectThat.equal(changed.overflow <= 1, true, 'the wider control still causes no horizontal overflow' + after)
    t.expectThat.boxesApart(changed.foreign, changed.model, 'the wider control still does not cover the model name' + after)
    t.expectThat.equal(changed.model.width + 1 >= changed.model.minWidth, true, 'the wider control leaves the recognition floor' + after)
  })

  test('a foreign right-hand control keeps its width and shares the row until the model recognition floor', async (t) => {
    await mountPhase(t)
    await mountForeignControl(t)
    for (const width of [600, 367]) {
      await resize(t, width)
      const state = await read(t)
      const at = ' at ' + width + 'px: ' + JSON.stringify(state)
      t.expectThat.visible(state.foreign, 'the independent control is drawn' + at)
      t.expectThat.visible(state.model, 'the model name keeps a drawn box' + at)
      t.expectThat.equal(state.model.width + 1 >= state.model.minWidth, true, 'the model name keeps its recognition floor' + at)
      t.expectThat.boxesApart(state.foreign, state.model, 'the independent control and the model name do not overlap' + at)
      t.expectThat.equal(state.overflow <= 1, true, 'the card has no horizontal overflow' + at)
      t.expectThat.equal(state.shortened, true, 'the over-long name is shortened inside the row' + at)
      if (width === 600) {
        t.expectThat.equal(state.sameLine, true, 'the row stays single while its controls fit' + at)
        t.expectThat.equal(state.toolbarHeight <= 30, true, 'the roomy row stands one line tall' + at)
      } else {
        t.expectThat.equal(state.sameLine, false, 'the cramped row wraps before its controls overlap' + at)
      }
    }
  })
})
