import {
  composerInlineCss, composerInlineBarCss, composerResponsiveCss, composerModelCss,
  composerVarsCss, composerSwappingCss, createComposerResponsive, setSwappingText, releaseSwappingText,
} from '@dsh-claude-style/client/pure'
import {
  COMPOSER_CARD_SELECTOR, COMPOSER_SCROLL_SELECTOR, COMPOSER_VARIANT_ATTRIBUTE, CONVERSATION_SCROLL_SELECTOR,
  MODEL_SLOT_SELECTOR as CONVERSATION_MODEL_SLOT_SELECTOR, CONVERSATION_INPUT_RIGHT_SLOT_SELECTOR, CONVERSATION_ACTIVITY_SLOT_SELECTOR,
} from '@dsh-claude-style/contracts/dom'
import { installParts } from '@dsh-claude-style/engine/parts'
import { partRegion } from '../../fixtures/part-region'
import { TEST_PARTS } from '../../fixtures/vocabulary'
import { attach } from '../../fixtures/host-markup'
import { surfaceAttribute, surfaceClass } from '../../fixtures/surface'

const ROOT = surfaceAttribute('skin.root')
const PART = surfaceAttribute('skin.part')
const CONTROL = surfaceAttribute('composer.control')
const vocabulary = { ...TEST_PARTS, part: PART, holds: surfaceAttribute('skin.holds') }
const conversation = partRegion(CONVERSATION_SCROLL_SELECTOR, vocabulary)
export const LAYOUT = surfaceAttribute('composer.responsive-layout')
export const TOOLBAR = surfaceAttribute('composer.responsive-toolbar')
export async function frames(count = 7) {
  for (let index = 0; index < count; index += 1) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

/** RC5 boundary dimensions; the external pressure is not account/quota data. */
export function crowdingFixture(options: { width: number; zoom?: number; direction?: string; variant?: string; foreign?: boolean }) {
  const zoom = options.zoom ?? 1
  document.body.setAttribute(ROOT, '')
  const hostSheet = document.createElement('style')
  hostSheet.textContent = `
    [${PART}~="row"] { display:flex;align-items:center;justify-content:space-between;gap:12px;height:28px; }
    [${PART}~="tools"] { display:flex;align-items:center;gap:8px;flex:none; }
    [${PART}~="trailing"] { display:flex;align-items:center;gap:12px;flex:none; }
    [${PART}~="composer-controls"] { display:flex;align-items:center;gap:12px;min-width:0; }
    [${PART}~='composer-primary'] { display:grid;place-items:center;width:34px;height:34px;border:none;flex:none;transform:translateY(-2px); }
    [${PART}~='composer-activity'] { display:flex;align-items:center;flex:none; }
    .${conversation.box('activityExpanded').className} { flex:1;min-width:0; }
    [hidden] { display:none ${String.fromCharCode(33)}important; }
  `
  const productSheet = document.createElement('style')
  productSheet.textContent = [composerVarsCss, composerInlineCss, composerModelCss, composerInlineBarCss, composerSwappingCss, composerResponsiveCss].join('\n')
  document.head.append(hostSheet, productSheet)
  const host = attach(document.body, CONVERSATION_SCROLL_SELECTOR)
  host.style.cssText = `width:${options.width / zoom}px;zoom:${zoom};direction:${options.direction ?? 'ltr'};padding:16px;box-sizing:border-box;margin:8px;font:13px Arial,sans-serif;--dsw-font-family:Arial,sans-serif;`
  document.body.append(host)
  const part = (parent: HTMLElement, name: string) => {
    const local = name === 'composer-stack' ? 'composerStack' : name === 'composer-controls' ? 'standardControls' : name === 'composer-activity' ? 'activity' : name
    const element = conversation.box(local); parent.append(element); return element
  }
  const button = (parent: HTMLElement, text: string, width = 0) => {
    const element = document.createElement('button'); element.textContent = text
    if (width > 0) element.style.cssText = `width:${width}px;height:28px;flex:none;padding:0;box-sizing:border-box`
    parent.append(element); return element
  }
  const surface = (parent: HTMLElement, name: string) => {
    const element = document.createElement('div'); element.className = surfaceClass(name); parent.append(element); return element
  }
  const variant = options.variant ?? 'inline'
  const stack = part(host, 'composer-stack'); stack.setAttribute(COMPOSER_VARIANT_ATTRIBUTE, variant)
  const card = attach(stack, COMPOSER_CARD_SELECTOR); card.setAttribute(COMPOSER_VARIANT_ATTRIBUTE, variant)
  card.style.cssText = 'display:flex;flex-direction:column;width:100%;position:relative;box-sizing:border-box'
  card.className = conversation.box('card').className
  const editor = attach(card, COMPOSER_SCROLL_SELECTOR); editor.className = conversation.box('scroll').className; editor.style.cssText = 'height:46px;flex:none'; editor.textContent = 'Draft text'
  const row = part(card, 'row'); const tools = part(row, 'tools')
  const permission = button(tools, '完全权限', 56); permission.setAttribute(CONTROL, 'access')
  const extension = button(tools, 'PUA', 64)
  const commands = button(tools, '+', 24); commands.setAttribute(CONTROL, 'commands')
  const voice = button(tools, '语音', 36)
  const trailing = part(row, 'trailing'); const controls = part(trailing, 'composer-controls')
  const right = attach(controls, CONVERSATION_INPUT_RIGHT_SLOT_SELECTOR); right.style.display = 'contents'
  const vision = button(right, '识图', 30)
  const pressureAnchor = attach(controls, CONVERSATION_INPUT_RIGHT_SLOT_SELECTOR); pressureAnchor.style.display = 'contents'
  const pressure = document.createElement('span'); pressure.textContent = 'External width; not account'; pressure.title = 'Host slot width boundary only'
  pressure.style.cssText = 'display:none;flex:none;height:22px;overflow:hidden;font-size:11px;box-sizing:border-box'; pressureAnchor.append(pressure)
  const modelSlot = attach(controls, CONVERSATION_MODEL_SLOT_SELECTOR); modelSlot.style.display = 'contents'
  const nativeRoot = document.createElement('div'); modelSlot.append(nativeRoot)
  nativeRoot.setAttribute(surfaceAttribute('model.host-root'), '')
  const nativeTrigger = button(nativeRoot, 'Original model / High')
  const seat = surface(modelSlot, 'model.seat'); const modelPart = surface(seat, 'model.seat-model')
  const model = button(modelPart, ''); model.className = surfaceClass('model.trigger')
  model.setAttribute('aria-label', '选择模型，当前 DeepSeek-V4.1-Flash 1017'); model.setAttribute('aria-haspopup', 'menu')
  const label = document.createElement('span'); label.className = surfaceClass('model.seat-name'); model.append(label)
  setSwappingText(label, 'DeepSeek-V4.1-Flash')
  const release = document.createElement('span'); release.className = surfaceClass('model.release-tag'); release.textContent = '1017'; model.append(release)
  const effortPart = surface(seat, 'model.seat-effort'); const effort = button(effortPart, 'High')
  effort.className = surfaceClass('effort.trigger'); effort.setAttribute('aria-label', '推理等级 High')
  const foreignRoot = document.createElement('div'); foreignRoot.style.cssText = 'display:flex;min-width:0;max-width:360px;align-items:center'
  const foreign = button(foreignRoot, 'Foreign model'); foreign.style.cssText = 'display:inline-flex;min-width:0;white-space:nowrap;overflow:hidden;height:28px'
  if (options.foreign === true) modelSlot.append(foreignRoot)
  const usage = button(modelSlot, '25%', 66)
  const activity = part(trailing, 'composer-activity')
  const activityAnchor = attach(activity, CONVERSATION_ACTIVITY_SLOT_SELECTOR); activityAnchor.style.display = 'contents'
  const activityButton = button(activityAnchor, '', 28); activityButton.setAttribute('aria-label', 'Activity slot contribution')
  // Native speech uses an 18px icon; this empty SVG is only that host geometry boundary, not a voice glyph or implementation.
  const activityIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  activityIcon.setAttribute('width', '18'); activityIcon.setAttribute('height', '18'); activityIcon.setAttribute('aria-hidden', 'true')
  activityButton.append(activityIcon); activityButton.remove()
  const primary = button(trailing, ''); primary.className = conversation.box('primary').className
  primary.setAttribute(CONTROL, 'send'); primary.setAttribute('aria-label', 'Send')
  const primaryIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  primaryIcon.setAttribute('viewBox', '0 0 16 16'); primaryIcon.setAttribute('width', '16'); primaryIcon.setAttribute('height', '16'); primaryIcon.setAttribute('aria-hidden', 'true')
  const glyph = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  glyph.setAttribute('d', 'M8.3125 0.980183C8.66767 1.0531 8.97902 1.20418 9.2627 1.43233C9.48724 1.61297 9.73029 1.85793 9.97949 2.10714L14.707 6.83468L13.293 8.24874L9 3.95577V15.0417H7V3.95577L2.70703 8.24874L1.29297 6.83468L6.02051 2.10714C6.26971 1.85793 6.51277 1.61297 6.7373 1.43233C6.97662 1.23986 7.28445 1.04402 7.6875 0.980183C7.8973 0.947006 8.1031 0.95516 8.3125 0.980183Z')
  glyph.setAttribute('fill', 'currentColor'); primaryIcon.append(glyph); primary.append(primaryIcon)
  const hiddenFile = button(tools, 'hidden upload', 28); hiddenFile.hidden = true
  let modelClicks = 0; let primaryClicks = 0
  model.addEventListener('click', () => { modelClicks += 1 }); primary.addEventListener('click', () => { primaryClicks += 1 })
  const parents = new Map([model, effort, nativeTrigger, nativeRoot, foreignRoot, usage, primary, hiddenFile].map(node => [node, node.parentElement]))
  const stopParts = installParts(vocabulary)
  const responsive = createComposerResponsive(); responsive.sync([card], true)
  return {
    host, card, editor, row, tools, trailing, controls, right, pressureAnchor, pressure, modelSlot, seat, modelPart,
    model, label, release, effort, usage, nativeRoot, nativeTrigger, foreignRoot, foreign, activity, activityButton,
    primary, permission, commands, extension, voice, vision, hiddenFile, parents, responsive, zoom,
    clicks: () => ({ model: modelClicks, primary: primaryClicks }),
    setPressure(width: number) {
      pressure.style.display = width === 0 ? 'none' : 'inline-flex'; pressure.style.width = `${width}px`
      pressure.style.minWidth = `${width}px`; pressure.style.maxWidth = `${width}px`; responsive.measure()
    },
    setAction(action: 'send' | 'stop') {
      primary.setAttribute(CONTROL, action); primary.setAttribute('aria-label', action)
      if (action === 'send') primaryIcon.replaceChildren(glyph)
      else {
        const stop = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        for (const [name, value] of Object.entries({ x: '3', y: '3', width: '10', height: '10', rx: '3', fill: 'currentColor' })) stop.setAttribute(name, value)
        primaryIcon.replaceChildren(stop)
      }
    },
    setActivity(active: boolean) {
      controls.hidden = active; activity.className = conversation.box(active ? 'activityExpanded' : 'activity').className
      if (active) activityAnchor.append(activityButton)
      else activityButton.remove()
      responsive.measure()
    },
    resize(width: number) { host.style.width = `${width / zoom}px`; responsive.measure() },
    dispose() { responsive.dispose(); stopParts(); releaseSwappingText(label); host.remove(); hostSheet.remove(); productSheet.remove(); document.body.removeAttribute(ROOT) },
  }
}
export type CrowdedComposer = ReturnType<typeof crowdingFixture>
