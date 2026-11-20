import { CONVERSATION_ACTIVE_TAB_SELECTOR, CONVERSATION_HEADER_SLOT_SELECTOR, CONVERSATION_TAB_SELECTOR, CONVERSATION_TABS_SELECTOR, HEADER_TITLE_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeSize, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { createStamp } from '@dsh-claude-style/engine/dom'
import { cacheFirstMatch, closestConversationHeader, conversationHeaderTools } from '@dsh-claude-style/engine/host'
import type { FeatureHandle } from '@dsh-claude-style/engine/scheduler'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import { motionReduced, subscribePrefs } from '../../core/prefs'
import { inPageBox, inPagePixels } from '../../shared/page-zoom'
import type manifest from './view-tabs.manifest'
import { playUnderline, underlineTransform, visibleUnderline, type UnderlineEdges } from './underline'

export interface ViewTabsHandle extends FeatureHandle {
  widthFor(header: HTMLElement | null): number
}

const GAP = 8
const MIN_TITLE = 48
const RIGHT = '--dsh-view-tabs-inline-right'
const TOP = '--dsh-view-tabs-inline-top'
const SPACE = '--dsh-view-tabs-inline-space'
const UNDERLINE_TRANSFORM = '--dsh-view-tabs-underline-transform'

interface UnderlineReading extends UnderlineEdges {
  list: HTMLElement
  trackWidth: number
  from: UnderlineEdges | null
}

/** The row stays in the host's React tree and the host still counts its tabs (D43). */
export function install(_ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const stripStamp = createStamp<HTMLElement>('data-dsh-view-tabs')
  const headerStamp = createStamp<HTMLElement>('data-dsh-view-tabs-taken')
  const underlineStamp = createStamp<HTMLElement>('data-dsh-view-tabs-underline')
  const tabs = cacheFirstMatch<HTMLElement>(CONVERSATION_TABS_SELECTOR)
  let watched: HTMLElement | null = null
  let stopSize: (() => void) | null = null
  let placedUnderline: Omit<UnderlineReading, 'from'> | null = null
  let underlineAnimation: Animation | null = null
  let hoveredTab: HTMLElement | null = null
  let hoverChanged = false

  function find() {
    const list = tabs()
    const strip = list?.parentElement ?? null
    const header = closestConversationHeader(strip) ?? strip?.closest<HTMLElement>(CONVERSATION_HEADER_SLOT_SELECTOR) ?? null
    return list === null || strip === null || header === null ? null : { list, strip, header }
  }

  function clearInline(header: HTMLElement) {
    for (const property of [RIGHT, TOP, SPACE]) header.style.removeProperty(property)
  }

  function stopUnderlineMotion() {
    underlineAnimation?.cancel()
    underlineAnimation = null
  }

  function clearUnderline() {
    stopUnderlineMotion()
    underlineStamp.current()?.style.removeProperty(UNDERLINE_TRANSFORM)
    underlineStamp.release()
    placedUnderline = null
  }

  function onTabPointer(event: PointerEvent) {
    if (event.pointerType === 'touch') return
    const target = event.type === 'pointerover' ? event.target : event.relatedTarget
    const tab = target instanceof Element ? target.closest<HTMLElement>(CONVERSATION_TAB_SELECTOR) : null
    const next = tab?.parentElement === watched ? tab : null
    if (next === hoveredTab) return
    hoveredTab = next
    hoverChanged = true
    ui.schedule?.()
  }

  function mark(found: ReturnType<typeof find>) {
    const previous = headerStamp.current()
    if (previous !== (found?.header ?? null)) {
      if (previous !== null) clearInline(previous)
      headerStamp.mark(found?.header ?? null)
    }
    stripStamp.mark(found?.strip ?? null)
    const list = found?.list ?? null
    if (watched !== list) {
      watched?.removeEventListener('pointerover', onTabPointer)
      watched?.removeEventListener('pointerout', onTabPointer)
      stopSize?.()
      clearUnderline()
      hoveredTab = null
      hoverChanged = false
      watched = list
      list?.addEventListener('pointerover', onTabPointer)
      list?.addEventListener('pointerout', onTabPointer)
      // The font or window can change the room for tabs without mounting nodes (D40).
      stopSize = found === null ? null : observeSize([found.header, found.list], () => ui.schedule?.())
    }
  }

  function measureUnderline(list: HTMLElement, box: DOMRect): UnderlineReading | null {
    const target = hoveredTab?.parentElement === list ? hoveredTab : list.querySelector(CONVERSATION_ACTIVE_TAB_SELECTOR)
    if (target === null) return null
    const tab = target.getBoundingClientRect()
    if (tab.width === 0 || box.width === 0) return null
    const style = getComputedStyle(target)
    const trackWidth = inPagePixels(box.width)
    const left = inPagePixels(tab.left - box.left) + parseFloat(style.paddingLeft)
    const right = inPagePixels(tab.right - box.left) - parseFloat(style.paddingRight)
    // Only a hover can start motion. A click on the hovered tab keeps the same
    // destination and leaves any running compositor animation alone (D40).
    const previous = hoverChanged && placedUnderline?.list === list ? placedUnderline : null
    const from = previous !== null && underlineAnimation?.effect?.getComputedTiming().progress != null
      ? visibleUnderline(list, trackWidth) : previous
    return { list, trackWidth, left, right, from }
  }

  function syncUnderline(next: UnderlineReading | null) {
    hoverChanged = false
    if (next === null) {
      clearUnderline()
      return
    }
    const previous = placedUnderline
    const { list, trackWidth, left, right, from } = next
    if (previous?.list === list && previous.trackWidth === trackWidth && previous.left === left && previous.right === right) return
    stopUnderlineMotion()
    list.style.setProperty(UNDERLINE_TRANSFORM, underlineTransform(next, trackWidth))
    underlineStamp.mark(list)
    if (from !== null && !motionReduced()) underlineAnimation = playUnderline(list, trackWidth, from, next)
    placedUnderline = { list, trackWidth, left, right }
  }

  function measureStrip(found: NonNullable<ReturnType<typeof find>>) {
    const { strip, header, list } = found
    let left = Infinity
    let right = -Infinity
    let underline: UnderlineReading | null = null
    for (const child of strip.children) {
      const viewportBox = child.getBoundingClientRect()
      if (viewportBox.width === 0 || viewportBox.height === 0) continue
      if (child === list) underline = measureUnderline(list, viewportBox)
      const box = inPageBox(viewportBox)
      left = Math.min(left, box.left)
      right = Math.max(right, box.right)
    }
    const width = right < left ? 0 : Math.ceil(right - left)
    const titleRow = header.querySelector<HTMLElement>(HEADER_TITLE_ROW_SELECTOR)
    if (titleRow === null || width === 0) return { header, width, inline: null, underline }

    const rowBox = inPageBox(titleRow.getBoundingClientRect())
    const headerBox = inPageBox(header.getBoundingClientRect())
    const { utilities, corner } = conversationHeaderTools(titleRow)
    let edge = rowBox.right
    let nativeTools = true
    for (const tool of [utilities, corner]) {
      if (tool === null) continue
      const box = inPageBox(tool.getBoundingClientRect())
      if (box.width === 0 || box.height === 0) continue
      if (box.bottom <= rowBox.top || box.top >= rowBox.bottom) nativeTools = false
      edge = Math.min(edge, box.left)
    }
    const leading = parseFloat(getComputedStyle(titleRow).paddingInlineStart) || 0
    const space = width + GAP
    // Measure from the uncapped row and tool boxes, so reserving title space
    // cannot make the next pass change its answer (D40).
    const fits = nativeTools && rowBox.height > 0 && edge - rowBox.left - leading >= MIN_TITLE + space
    const inline = fits ? {
      right: headerBox.right - edge + GAP,
      top: rowBox.top - headerBox.top + rowBox.height / 2,
      space,
    } : null
    return { header, width, inline, underline }
  }

  let reading: ReturnType<typeof measureStrip> | null = null
  function measure() {
    const found = find()
    reading = found === null ? null : measureStrip(found)
  }

  function sync() {
    const found = find()
    mark(found)
    if (found === null) return
    const { header, list } = found
    syncUnderline(reading?.underline?.list === list ? reading.underline : null)
    const inline = reading?.header === header ? reading.inline : null
    headerStamp.mark(header, inline === null ? '' : 'inline')
    if (inline === null) {
      clearInline(header)
      return
    }
    const lengths = [[RIGHT, inline.right], [TOP, inline.top], [SPACE, inline.space]] as const
    for (const [property, length] of lengths) {
      const value = `${Math.round(length)}px`
      if (header.style.getPropertyValue(property) !== value) header.style.setProperty(property, value)
    }
  }

  // A replacement strip takes its right alignment in the mounting batch.
  // Geometry stays in the scheduler's read phase (D40).
  const stop = subscribeMutations(document.body, { childList: true, subtree: true, beforePaint: true }, () => {
    const found = find()
    if (headerStamp.current() === (found?.header ?? null) && stripStamp.current() === (found?.strip ?? null)) return
    mark(found)
    ui.schedule?.()
  })
  const stopPrefs = subscribePrefs(() => {
    if (motionReduced()) stopUnderlineMotion()
  })
  ui.viewTabs = {
    measure, sync, skipOnContentOnly: true,
    widthFor: (header) => reading !== null && reading.header === header ? reading.width : 0,
  }
  mark(find())
  return () => {
    stop()
    stopPrefs()
    mark(null)
    delete ui.viewTabs
  }
}
