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
const RIGHT_SLOT = host('composer.right-slot')
const PHASE = host('shell.phase')
const DARK_ATTR = host('shell.dark-theme')
const CARD = host('composer.card')
const PART = surface.attribute('skin.part')
const SKIN_BTN = surface('model.trigger')
const LONG_NAME = 'DeepSeek-V4.1-Flash-Preview · Enterprise Long Model Name'

const HOST_ROOT_CLASS = partClass(PAGE_PARTS, 'host-root')
const TRIGGER_CLASS = partClass(CONVERSATION_PARTS, 'trigger')
const TRIGGER_LABEL_CLASS = partClass(PAGE_PARTS, 'trigger-label')
const TRIGGER_EFFORT_CLASS = partClass(CONVERSATION_PARTS, 'trigger-effort')
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

  const readState = () => t.page.evaluate(([containerSel, cardSel, slotSel, rootCls, triggerCls, labelCls, effortCls, chevronCls, skinBtnSel]) => {
    const container = document.querySelector(containerSel)
    const trigger = container.querySelector(`${slotSel} > .${rootCls} > .${triggerCls}`)
    const label = trigger.querySelector(`.${labelCls}`)
    const effort = trigger.querySelector(`.${effortCls}`)
    const chevron = trigger.querySelector(`.${chevronCls}`)
    const skinBtn = document.querySelector(skinBtnSel)
    const triggerStyle = getComputedStyle(trigger)
    const labelStyle = label === null ? null : getComputedStyle(label)
    const effortStyle = effort === null ? null : getComputedStyle(effort)
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
      effortFlexShrink: effortStyle?.flexShrink ?? null,
      effortShortened: effort !== null && effort.scrollWidth > effort.clientWidth + 0.5,
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
  }, [containerSelector, CARD, MODEL_SLOT, HOST_ROOT_CLASS, TRIGGER_CLASS, TRIGGER_LABEL_CLASS, TRIGGER_EFFORT_CLASS, CHEVRON_CLASS, SKIN_BTN])

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
                  <span class="${TRIGGER_EFFORT_CLASS}" style="display:block">High</span>
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
      t.expectThat.equal(rest.effortFlexShrink, '0', 'the host effort span does not shrink before the model label')
      t.expectThat.equal(rest.effortShortened, false, 'the effort text stays intact inside the narrow embedded card')
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

  test('the fallback host trigger keeps High intact alongside promotion badges and foreign right-slot controls across widths', async (t) => {
    await setScheme(t, 'light')
    await t.prefs({ modelPicker: false })
    await t.page.evaluate(([cardSel, part, phase, trailingCls, controlsCls, rightSlotSel, modelSlotSel, rootCls, triggerCls, labelCls, effortCls, chevronCls]) => {
      const hostStyle = document.createElement('style')
      hostStyle.textContent = `
        .${effortCls} { flex-shrink: 1000; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dsm-workbuddy-model-label { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
        .dsm-workbuddy-model-promo { flex: none; display: inline-flex; align-items: center; padding: 0 7px; border-radius: 999px; font-size: 10px; line-height: 16px; font-weight: 600; white-space: nowrap; }
        .dsm-workbuddy-model-label-promo { max-width: 6em; overflow: hidden; }
        .dsm-workbuddy-model-label-promo-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dsm-workbuddy-busy { flex: none; display: inline-flex; align-items: center; block-size: 12px; }
      `
      document.head.append(hostStyle)
      const card = document.querySelector(cardSel)
      let root = card.parentElement
      while (root !== null && root !== document.body) {
        if ((root.getAttribute(part) ?? '').split(/\s+/).includes('composer-stack')) {
          root.setAttribute(phase, 'active')
          break
        }
        root = root.parentElement
      }
      const trailing = card.querySelector(`.${trailingCls}`)
      const rightSlot = trailing.querySelector(rightSlotSel)
      const modelSlot = trailing.querySelector(modelSlotSel)
      const controls = document.createElement('div')
      controls.className = controlsCls
      controls.style.cssText = 'display:flex;align-items:center;min-width:0'
      trailing.insertBefore(controls, rightSlot)
      controls.append(rightSlot, modelSlot)

      const readout = document.createElement('span')
      readout.id = 'foreign-readout'
      readout.textContent = 'WB CN · 2,405'
      readout.style.cssText = 'display:inline-flex;align-items:center;white-space:nowrap;font-size:13px'
      rightSlot.replaceChildren(readout)

      modelSlot.innerHTML = `
        <div class="${rootCls}">
          <button type="button" class="${triggerCls}" title="DeepSeek-V4.1-Flash · x0.11 · High">
            <span class="${labelCls}" style="display:block">
              <span data-provider-id="workbuddy" data-model-id="deepseek-v4.1-flash">
                <span class="dsm-workbuddy-model-label">
                  <span id="wb-model-name">DeepSeek-V4.1-Flash</span>
                  <span class="dsm-workbuddy-model-label-rate"> · x0.11</span>
                  <span class="dsm-workbuddy-model-promo dsm-workbuddy-model-label-promo"><span class="dsm-workbuddy-model-label-promo-text">夜间折扣</span></span>
                  <span class="dsm-workbuddy-busy"><svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5"/></svg></span>
                </span>
              </span>
            </span>
            <span class="${effortCls}" style="display:block">High</span>
            <svg class="${chevronCls}" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"></svg>
          </button>
        </div>`
    }, [CARD, PART, PHASE, TRAILING_CLASS, CONTROLS_CLASS, RIGHT_SLOT, MODEL_SLOT, HOST_ROOT_CLASS, TRIGGER_CLASS, TRIGGER_LABEL_CLASS, TRIGGER_EFFORT_CLASS, CHEVRON_CLASS])
    await t.settle()

    const measureAt = async (width) => {
      await t.page.evaluate(([cardSel, w]) => {
        const card = document.querySelector(cardSel)
        card.style.width = `${w}px`
        card.style.maxWidth = `${w}px`
      }, [CARD, width])
      await t.settle()
      return t.page.evaluate(([cardSel, toolsCls, trailingCls, slotSel, rootCls, triggerCls, labelCls, effortCls]) => {
        const card = document.querySelector(cardSel)
        const tools = card.querySelector(`.${toolsCls}`)
        const trailing = card.querySelector(`.${trailingCls}`)
        const readout = card.querySelector('#foreign-readout')
        const hostRoot = card.querySelector(`${slotSel} > .${rootCls}`)
        const trigger = hostRoot.querySelector(`.${triggerCls}`)
        const label = trigger.querySelector(`.${labelCls}`)
        const nameSpan = trigger.querySelector('#wb-model-name')
        const promo = trigger.querySelector('.dsm-workbuddy-model-promo')
        const busy = trigger.querySelector('.dsm-workbuddy-busy')
        const effort = trigger.querySelector(`.${effortCls}`)
        const triggerRect = trigger.getBoundingClientRect()
        const promoRect = promo.getBoundingClientRect()
        const busyRect = busy.getBoundingClientRect()
        const centre = (el) => {
          const r = el.getBoundingClientRect()
          return r.top + r.height / 2
        }
        return {
          sameLine: Math.abs(centre(tools) - centre(trailing)) <= 1,
          cardOverflow: card.scrollWidth - card.clientWidth,
          gapFromReadout: hostRoot.getBoundingClientRect().left - readout.getBoundingClientRect().right,
          effortShortened: effort.scrollWidth > effort.clientWidth + 0.5,
          effortText: effort.textContent,
          nameShortened: nameSpan.scrollWidth > nameSpan.clientWidth + 0.5,
          promoInsideTrigger: promoRect.left >= triggerRect.left - 0.5 && promoRect.right <= triggerRect.right + 0.5,
          busyInsideTrigger: busyRect.left >= triggerRect.left - 0.5 && busyRect.right <= triggerRect.right + 0.5,
          labelWidth: label.getBoundingClientRect().width,
          labelMinWidth: parseFloat(getComputedStyle(label).minWidth) || 0,
        }
      }, [CARD, TOOLS_CLASS, TRAILING_CLASS, MODEL_SLOT, HOST_ROOT_CLASS, TRIGGER_CLASS, TRIGGER_LABEL_CLASS, TRIGGER_EFFORT_CLASS])
    }

    const roomy = await measureAt(800)
    t.expectThat.equal(roomy.sameLine, true, `roomy card keeps one toolbar line: ${JSON.stringify(roomy)}`)
    t.expectThat.equal(roomy.cardOverflow <= 1, true, `roomy card has no overflow: ${JSON.stringify(roomy)}`)
    t.expectThat.equal(roomy.gapFromReadout >= 3, true, `foreign readout stands apart from host seat: ${JSON.stringify(roomy)}`)
    t.expectThat.equal(roomy.effortShortened, false, `High stays whole on a roomy card: ${JSON.stringify(roomy)}`)
    t.expectThat.equal(roomy.nameShortened, false, `model name fits inside the 360px ceiling on a roomy card: ${JSON.stringify(roomy)}`)
    t.expectThat.equal(roomy.promoInsideTrigger, true, `promotion pill stays whole inside trigger: ${JSON.stringify(roomy)}`)
    t.expectThat.equal(roomy.busyInsideTrigger, true, `load glyph stays whole inside trigger: ${JSON.stringify(roomy)}`)

    const tight = await measureAt(420)
    t.expectThat.equal(tight.sameLine, true, `tight card stays on one line while above recognition floor: ${JSON.stringify(tight)}`)
    t.expectThat.equal(tight.cardOverflow <= 1, true, `tight card has no overflow: ${JSON.stringify(tight)}`)
    t.expectThat.equal(tight.effortShortened, false, `High stays whole when the row shortens the trigger: ${JSON.stringify(tight)}`)
    t.expectThat.equal(tight.nameShortened, true, `leading model name span absorbs the ellipsis on a tight card: ${JSON.stringify(tight)}`)
    t.expectThat.equal(tight.promoInsideTrigger, true, `promotion pill stays whole instead of being clipped on a tight card: ${JSON.stringify(tight)}`)
    t.expectThat.equal(tight.busyInsideTrigger, true, `load glyph stays whole on a tight card: ${JSON.stringify(tight)}`)
    t.expectThat.equal(tight.labelWidth + 1 >= tight.labelMinWidth, true, `host label keeps its recognition floor: ${JSON.stringify(tight)}`)

    await setScheme(t, 'dark')
    const tightDark = await measureAt(420)
    t.expectThat.equal(tightDark.effortShortened, false, `High stays whole in dark appearance: ${JSON.stringify(tightDark)}`)
    t.expectThat.equal(tightDark.nameShortened, true, `leading model name span absorbs the ellipsis in dark appearance: ${JSON.stringify(tightDark)}`)
    t.expectThat.equal(tightDark.promoInsideTrigger, true, `promotion pill stays whole in dark appearance: ${JSON.stringify(tightDark)}`)

    const wrapped = await measureAt(330)
    t.expectThat.equal(wrapped.sameLine, false, `cramped card wraps the trailing cluster onto a second line: ${JSON.stringify(wrapped)}`)
    t.expectThat.equal(wrapped.cardOverflow <= 1, true, `wrapped card has no horizontal overflow: ${JSON.stringify(wrapped)}`)
    t.expectThat.equal(wrapped.effortShortened, false, `High stays whole after wrapping: ${JSON.stringify(wrapped)}`)
    t.expectThat.equal(wrapped.labelWidth + 1 >= wrapped.labelMinWidth, true, `wrapped host label keeps its recognition floor: ${JSON.stringify(wrapped)}`)
  })
})
