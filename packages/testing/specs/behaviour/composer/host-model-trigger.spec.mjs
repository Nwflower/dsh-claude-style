/**
 * Any inline composer card whose model slot stays with the host's own
 * `ModelSelect` — whether the reader turned the picker preference off on the
 * main card or an embedded conversation mounted a card outside the main
 * scroller — draws that trigger in the same inline face as the skin's own
 * model button: 13px/500 interface typography, 28px control height, 6px
 * radius, hidden chevron, shared hover plate and ellipsis truncation.
 *
 * @capability composer
 * @features composer, model
 * @risk The host's model trigger in a fallback or embedded composer keeps the shipped 12px mono / 400-weight / chevron appearance or overflows a narrow row instead of truncating with an ellipsis.
 */
import { CONVERSATION_PARTS, PAGE_PARTS } from '@dsh-claude-style/engine/parts-table'
import { host, spec, surface } from '../../fixtures/behaviour.mjs'
import { mountDockedComposer } from '../../fixtures/docked-composer.mjs'
import { partClass } from '../../fixtures/parts.mjs'

const SIDEBAR_CHAT = host('sidebar.chat')
const SESSION_ATTRIBUTE = host('conversation.session-attribute')
const MODEL_SLOT = host('composer.model-slot')
const DARK_ATTR = host('shell.dark-theme')
const CARD = host('composer.card')
const SKIN_BTN = surface('model.trigger')
const LONG_NAME = 'DeepSeek-V4.1-Flash-Preview · Enterprise Long Model Name'

const HOST_ROOT_CLASS = partClass(PAGE_PARTS, 'host-root')
const TRIGGER_CLASS = partClass(CONVERSATION_PARTS, 'trigger')
const TRIGGER_LABEL_CLASS = partClass(PAGE_PARTS, 'trigger-label')
const CHEVRON_CLASS = partClass(CONVERSATION_PARTS, 'trigger-chevron')
const ROW_CLASS = partClass(CONVERSATION_PARTS, 'row')
const TOOLS_CLASS = partClass(CONVERSATION_PARTS, 'tools')
const TRAILING_CLASS = partClass(CONVERSATION_PARTS, 'trailing')
const CONTROLS_CLASS = partClass(CONVERSATION_PARTS, 'composer-controls')

async function setScheme(t, scheme) {
  await t.page.evaluate(({ dark, enabled }) => document.body.toggleAttribute(dark, enabled), {
    dark: DARK_ATTR,
    enabled: scheme === 'dark',
  })
  await t.settle()
}

/** Read computed typography, geometry, chevron visibility, truncation and hover paint. */
async function inspectTrigger(t, containerSelector) {
  const triggerSelector = `${containerSelector} ${MODEL_SLOT} > .${HOST_ROOT_CLASS} > .${TRIGGER_CLASS}`
  const locator = t.page.locator(triggerSelector).first()
  await locator.waitFor({ state: 'visible' })
  await t.page.mouse.move(0, 0)
  await t.settle()

  const readState = () => t.page.evaluate(([containerSel, cardSel, slotSel, rootCls, triggerCls, labelCls, chevronCls, skinBtnSel]) => {
    const container = document.querySelector(containerSel)
    const trigger = container.querySelector(`${slotSel} > .${rootCls} > .${triggerCls}`)
    const label = trigger.querySelector(`.${labelCls}`)
    const chevron = trigger.querySelector(`.${chevronCls}`)
    const skinBtn = document.querySelector(skinBtnSel)
    const triggerStyle = getComputedStyle(trigger)
    const labelStyle = label === null ? null : getComputedStyle(label)
    const skinStyle = skinBtn === null ? null : getComputedStyle(skinBtn)
    const rect = trigger.getBoundingClientRect()
    const card = trigger.closest(cardSel)
    return {
      height: Math.round(rect.height),
      radius: triggerStyle.borderRadius,
      fontSize: triggerStyle.fontSize,
      fontWeight: triggerStyle.fontWeight,
      lineHeight: triggerStyle.lineHeight,
      fontFamily: triggerStyle.fontFamily,
      color: triggerStyle.color,
      background: triggerStyle.backgroundColor,
      opacity: parseFloat(triggerStyle.opacity),
      title: trigger.getAttribute('title'),
      labelFontFamily: labelStyle?.fontFamily ?? null,
      labelFontSize: labelStyle?.fontSize ?? null,
      labelFontWeight: labelStyle?.fontWeight ?? null,
      labelOverflow: labelStyle?.textOverflow ?? null,
      labelShortened: label !== null && label.scrollWidth > label.clientWidth,
      chevronDisplay: chevron === null ? null : getComputedStyle(chevron).display,
      cardOverflow: card === null ? 0 : card.scrollWidth - card.clientWidth,
      skin: skinStyle === null ? null : {
        fontFamily: skinStyle.fontFamily,
        fontSize: skinStyle.fontSize,
        fontWeight: skinStyle.fontWeight,
        lineHeight: skinStyle.lineHeight,
        color: skinStyle.color,
      },
    }
  }, [containerSelector, CARD, MODEL_SLOT, HOST_ROOT_CLASS, TRIGGER_CLASS, TRIGGER_LABEL_CLASS, CHEVRON_CLASS, SKIN_BTN])

  const rest = await readState()
  await locator.hover()
  await t.page.waitForTimeout(180)
  const hovered = await readState()
  await t.page.mouse.move(0, 0)
  return { rest, hovered }
}

/** Mount an embedded composer card outside the main scroller, carrying the host's ModelSelect structure. */
async function mountEmbeddedComposer(t) {
  await mountDockedComposer(t, {
    style: { position: 'fixed', left: '24px', top: '320px', width: '320px', zIndex: '40' },
    sidebar: host.attributes('sidebar.chat'),
    session: [[SESSION_ATTRIBUTE, 'embedded-model-spec']],
    card: host.attributes('composer.card'),
    parts: [{
      tag: 'div',
      attributes: [['class', ROW_CLASS]],
      html: `
        <div class="${TOOLS_CLASS}">
          <button type="button" style="width:52px;height:24px;flex:none">Edit</button>
          <button type="button" style="width:24px;height:24px;flex:none">+</button>
        </div>
        <div class="${TRAILING_CLASS}">
          <div class="${CONTROLS_CLASS}" style="display:flex;align-items:center;min-width:0">
            <div data-slot="conversation.input.model" style="display:contents">
              <div class="${HOST_ROOT_CLASS}">
                <button type="button" class="${TRIGGER_CLASS}" title="${LONG_NAME} · High">
                  <span class="${TRIGGER_LABEL_CLASS}" style="display:block">${LONG_NAME}</span>
                  <svg class="${CHEVRON_CLASS}" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"></svg>
                </button>
              </div>
            </div>
          </div>
          <button type="button" aria-label="Send" style="width:28px;height:28px;padding:0;box-sizing:border-box;flex:none"></button>
        </div>`,
    }],
  })
  await t.settle()
}

export default spec({ page: 'model-meter' }, ({ test }) => {
  for (const scheme of ['light', 'dark']) {
    test(`an embedded card outside the main scroller styles and truncates the host model trigger in ${scheme}`, async (t) => {
      await setScheme(t, scheme)
      await mountEmbeddedComposer(t)
      const { rest, hovered } = await inspectTrigger(t, SIDEBAR_CHAT)

      t.expectThat.equal(rest.height, 28, 'the trigger matches the 28px composer control height')
      t.expectThat.equal(rest.radius, '6px', 'the trigger carries the 6px radius')
      t.expectThat.equal(rest.fontSize, rest.skin.fontSize, 'the trigger matches the skin model button font size')
      t.expectThat.equal(rest.fontWeight, rest.skin.fontWeight, 'the trigger matches the skin model button font weight')
      t.expectThat.equal(rest.lineHeight, rest.skin.lineHeight, 'the trigger matches the skin model button line height')
      t.expectThat.equal(rest.fontFamily, rest.skin.fontFamily, 'the trigger matches the skin model button font family')
      t.expectThat.equal(rest.color, rest.skin.color, 'the trigger matches the skin model button ink colour')
      t.expectThat.equal(rest.labelFontFamily, rest.skin.fontFamily, 'the label inherits the interface font instead of 12px mono')
      t.expectThat.equal(rest.labelFontSize, rest.skin.fontSize, 'the label keeps the 13px interface font size')
      t.expectThat.equal(rest.labelFontWeight, rest.skin.fontWeight, 'the label keeps the 500 font weight')
      t.expectThat.equal(rest.chevronDisplay, 'none', 'the host chevron is hidden')
      t.expectThat.equal(rest.labelOverflow, 'ellipsis', 'the label truncates with an ellipsis')
      t.expectThat.equal(rest.labelShortened, true, 'a long model name truncates inside the narrow embedded card')
      t.expectThat.equal(rest.cardOverflow <= 0, true, `the embedded composer card does not overflow horizontally (${rest.cardOverflow})`)
      t.expectThat.equal(rest.title, `${LONG_NAME} · High`, 'the host trigger title attribute stays untouched')
      t.expectThat.equal(hovered.background !== rest.background, true, 'hovering paints the shared hover plate')
      t.expectThat.equal(hovered.opacity > rest.opacity, true, `hovering raises the ink strength (${rest.opacity} -> ${hovered.opacity})`)
    })
  }

  test('the main inline composer applies the same styling when the model picker preference is off', async (t) => {
    await setScheme(t, 'light')
    await t.prefs({ modelPicker: false })
    await t.page.evaluate(([cardSel, slotSel, rootCls, triggerCls, labelCls, chevronCls, longName]) => {
      const slot = document.querySelector(`${cardSel} ${slotSel}`)
      slot.innerHTML = `<div class="${rootCls}"><button type="button" class="${triggerCls}" title="${longName}"><span class="${labelCls}" style="display:block">${longName}</span><svg class="${chevronCls}" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"></svg></button></div>`
      const card = document.querySelector(cardSel)
      card.style.width = '360px'
      card.style.maxWidth = '360px'
    }, [CARD, MODEL_SLOT, HOST_ROOT_CLASS, TRIGGER_CLASS, TRIGGER_LABEL_CLASS, CHEVRON_CLASS, LONG_NAME])
    await t.settle()

    const { rest, hovered } = await inspectTrigger(t, CARD)
    t.expectThat.equal(rest.height, 28, 'the fallback host trigger keeps the 28px control height')
    t.expectThat.equal(rest.radius, '6px', 'the fallback host trigger carries the 6px radius')
    t.expectThat.equal(rest.fontSize, '13px', 'the fallback host trigger uses the 13px interface size')
    t.expectThat.equal(rest.fontWeight, '500', 'the fallback host trigger uses weight 500')
    t.expectThat.equal(rest.labelFontSize, '13px', 'the fallback host label stays at 13px rather than 12px mono')
    t.expectThat.equal(rest.chevronDisplay, 'none', 'the fallback host chevron is hidden')
    t.expectThat.equal(rest.labelOverflow, 'ellipsis', 'the fallback host label truncates with an ellipsis')
    t.expectThat.equal(rest.labelShortened, true, 'the fallback host label shortens in a narrow main card')
    t.expectThat.equal(hovered.background !== rest.background, true, 'hovering paints the shared hover plate')
    t.expectThat.equal(hovered.opacity > rest.opacity, true, 'hovering raises the ink strength')
  })
})
