/**
 * @capability composer
 * @features composer, model, effort
 * @risk The classic home card shrinks a third-party quota wrapper while its
 * nested label keeps painting across the model selector, or wraps the toolbar
 * onto two rows at the desktop card width when left and right controls share
 * the line.
 */
import { CONVERSATION_PARTS } from '@dsh-claude-style/engine/parts-table'
import { host, spec, surface } from '../../fixtures/behaviour.mjs'
import { heroCard } from '../../fixtures/hero-card.mjs'
import { partClass } from '../../fixtures/parts.mjs'

const RIGHT_SLOT = host('composer.right-slot')
const ACTIVITY_SLOT = host('composer.activity-slot')
const CARD = host('composer.card')
const MODEL = surface('model.trigger')
const MODEL_ROW = surface('model.row')
const MODEL_TAG = surface('model.release-tag')
const MODEL_NAME = surface('model.seat-name')
const EFFORT_SEAT = surface('model.seat-effort')
const EFFORT_BTN = surface('effort.trigger')
const PART = surface.attribute('skin.part')
const CONTROL = surface.attribute('composer.control')

/** Mount the realistic desktop hero controls (AI control on left; quota, tag, effort, mic, send on right). */
async function mountFullHero(t, width) {
  await t.prefs({ homeLayout: 'classic' })
  await t.page.click(MODEL)
  await t.page.locator(MODEL_ROW, { hasText: 'V4.1 Flash' }).click()
  await t.settle()
  await heroCard(t, { width, hero: true })
  await t.page.evaluate(([slotSelector, attributes, modelSelector, activitySelector, part, phase, controlsClass, effortSeatSelector, effortBtnSelector, controlAttr, modelNameSelector, cardSelector]) => {
    const stack = document.querySelector('[' + part + '~="composer-stack"]')
    stack.setAttribute(phase, 'hero')
    const card = stack.querySelector(cardSelector)
    card.style.boxSizing = 'border-box'
    card.style.padding = '12px 16px'
    const label = card.querySelector(modelNameSelector)
    if (label !== null) label.textContent = 'DeepSeek-V4.1-Flash-Preview'

    let hostSheet = document.getElementById('hero-quota-host-sheet')
    if (hostSheet === null) {
      hostSheet = document.createElement('style')
      hostSheet.id = 'hero-quota-host-sheet'
      hostSheet.textContent = `
        [${part}~="row"] { display:flex;align-items:center;justify-content:space-between;gap:12px;height:28px; }
        [${part}~="tools"] { display:flex;align-items:center;gap:8px;flex:none; }
        [${part}~="trailing"] { display:flex;align-items:center;gap:12px;flex:none; }
        [${part}~="composer-controls"] { display:flex;align-items:center;gap:12px;min-width:0; }
        [${part}~="composer-primary"] { display:grid;place-items:center;width:34px;height:34px;border:none;flex:none; }
        [${part}~="composer-activity"] { display:flex;align-items:center;flex:none; }
        [${controlAttr}="commands"] { width:28px;height:28px;flex:none;padding:0; }
      `
      document.head.append(hostSheet)
    }

    const modelSlot = document.querySelector(modelSelector)
    if (modelSlot === null) throw new Error('the model slot is not on the page')
    let controls = modelSlot.closest('[' + part + '~="composer-controls"]')
    if (controls === null) {
      controls = document.createElement('div')
      controls.className = controlsClass
      modelSlot.before(controls)
      controls.append(modelSlot)
    }

    let slot = document.querySelector(slotSelector)
    if (slot === null) {
      slot = document.createElement('span')
      for (const [name, value] of attributes) slot.setAttribute(name, value)
      slot.style.display = 'contents'
      modelSlot.before(slot)
    }
    if (document.getElementById('hero-quota-root') === null) {
      const root = document.createElement('div')
      root.id = 'hero-quota-root'
      root.style.cssText = 'display:inline-flex;align-items:center'
      const button = document.createElement('button')
      button.textContent = '5小时 2% · 周 5%'
      button.style.cssText = 'display:inline-flex;white-space:nowrap;padding:4px 8px'
      root.append(button); slot.append(root)
    }

    const effortSeat = document.querySelector(effortSeatSelector)
    if (effortSeat !== null && effortSeat.querySelector(effortBtnSelector) === null) {
      const effort = document.createElement('button')
      effort.type = 'button'
      effort.className = effortBtnSelector.slice(1)
      effort.textContent = 'High'
      effortSeat.append(effort)
    }

    const activitySlot = document.querySelector(activitySelector)
    if (activitySlot !== null && document.getElementById('hero-quota-mic') === null) {
      const mic = document.createElement('button')
      mic.type = 'button'
      mic.id = 'hero-quota-mic'
      mic.style.cssText = 'width:28px;height:28px;flex:none;padding:0'
      mic.textContent = 'Mic'
      activitySlot.append(mic)
    }

    const tools = document.querySelector('[' + part + '~="tools"]')
    if (document.getElementById('hero-quota-ai') === null) {
      const control = document.createElement('button')
      control.id = 'hero-quota-ai'
      control.textContent = 'AI 控制电脑'
      control.style.cssText = 'width:108px;flex:none;white-space:nowrap'
      tools.append(control)
    }
  }, [RIGHT_SLOT, host.attributes('composer.right-slot'), host('composer.model-slot'), ACTIVITY_SLOT, PART, host('shell.phase'), partClass(CONVERSATION_PARTS, 'composer-controls'), EFFORT_SEAT, EFFORT_BTN, CONTROL, MODEL_NAME, CARD])
  await t.settle()
}

/** Read geometry of every toolbar control on the hero card. */
async function readBoxes(t) {
  return t.page.evaluate(([card, model, tagSelector, effortSelector, part]) => {
    const box = node => {
      const rect = node.getBoundingClientRect()
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width }
    }
    const quota = document.getElementById('hero-quota-root')
    const button = quota.querySelector('button')
    const element = document.querySelector(card)
    const tools = element.querySelector('[' + part + '~="tools"]')
    const trailing = element.querySelector('[' + part + '~="trailing"]')
    const modelNode = document.querySelector(model)
    const tag = modelNode.querySelector(tagSelector)
    const effort = element.querySelector(effortSelector)
    const mic = document.getElementById('hero-quota-mic')
    return {
      quota: box(quota),
      button: box(button),
      buttonClip: button.scrollWidth - button.clientWidth,
      model: box(modelNode),
      tag: tag === null ? null : box(tag),
      effort: effort === null ? null : box(effort),
      mic: mic === null ? null : box(mic),
      tools: box(tools),
      trailing: box(trailing),
      overflow: element.scrollWidth - element.clientWidth,
    }
  }, [CARD, MODEL, MODEL_TAG, EFFORT_BTN, PART])
}

/** Assert quota integrity, non-overlap, model + release tag + effort + mic availability, and zero horizontal card overflow. */
function assertCommon(t, boxes) {
  const overlap = Math.min(boxes.button.right, boxes.model.right) - Math.max(boxes.button.left, boxes.model.left) > 0.5
    && Math.min(boxes.button.bottom, boxes.model.bottom) - Math.max(boxes.button.top, boxes.model.top) > 0.5
  t.expectThat.equal(boxes.quota.width >= boxes.button.width - 0.5, true, 'the quota wrapper contains its full button')
  t.expectThat.equal(boxes.buttonClip <= 1, true, 'the quota text is not clipped')
  t.expectThat.equal(overlap, false, 'quota text stays clear of the model selector')
  t.expectThat.equal(boxes.model.width > 0, true, 'the model remains available')
  t.expectThat.equal(boxes.tag !== null && boxes.tag.width > 0 && boxes.tag.right <= boxes.model.right + 0.5, true, 'the release tag stays visible inside the model button')
  t.expectThat.equal(boxes.effort !== null && boxes.effort.width > 0, true, 'the effort button remains available')
  t.expectThat.equal(boxes.mic !== null && boxes.mic.width > 0, true, 'the microphone button remains available')
  t.expectThat.equal(boxes.overflow <= 1, true, 'the card keeps every control inside its width')
}

export default spec({ page: 'model-meter' }, ({ test }) => {
  test('the home quota keeps its text inside its wrapper and clear of the model', async (t) => {
    await mountFullHero(t, 672)
    const boxes = await readBoxes(t)
    assertCommon(t, boxes)
    const centre = box => (box.top + box.bottom) / 2
    t.expectThat.equal(Math.abs(centre(boxes.tools) - centre(boxes.trailing)) < 1, true, 'the home controls share one row at the desktop card width: ' + JSON.stringify({ tools: boxes.tools, trailing: boxes.trailing, model: boxes.model }))
  })

  test('the home quota wraps safely without overflow on a narrow window', async (t) => {
    await t.page.setViewportSize({ width: 360, height: 800 })
    await mountFullHero(t, 340)
    const boxes = await readBoxes(t)
    assertCommon(t, boxes)
    t.expectThat.equal(boxes.trailing.top >= boxes.tools.bottom - 1, true, 'narrow home wraps controls onto a second row cleanly')
  })
})
