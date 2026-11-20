import { CONVERSATION_HEADER_SLOT_SELECTOR, CONVERSATION_TABS_SELECTOR, HEADER_TITLE_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeSize, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { createStamp } from '@dsh-claude-style/engine/dom'
import { cacheFirstMatch, closestConversationHeader, conversationHeaderTools } from '@dsh-claude-style/engine/host'
import type { FeatureHandle } from '@dsh-claude-style/engine/scheduler'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import { inPageBox } from '../../shared/page-zoom'
import type manifest from './view-tabs.manifest'

export interface ViewTabsHandle extends FeatureHandle {
  widthFor(header: HTMLElement | null): number
}

const GAP = 8
const MIN_TITLE = 48
const RIGHT = '--dsh-view-tabs-inline-right'
const TOP = '--dsh-view-tabs-inline-top'
const SPACE = '--dsh-view-tabs-inline-space'

/** The row stays in the host's React tree and the host still counts its tabs (D43). */
export function install(_ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const stripStamp = createStamp<HTMLElement>('data-dsh-view-tabs')
  const headerStamp = createStamp<HTMLElement>('data-dsh-view-tabs-taken')
  const tabs = cacheFirstMatch<HTMLElement>(CONVERSATION_TABS_SELECTOR)
  let watched: HTMLElement | null = null
  let stopSize: (() => void) | null = null

  function find() {
    const list = tabs()
    const strip = list?.parentElement ?? null
    const header = closestConversationHeader(strip) ?? strip?.closest<HTMLElement>(CONVERSATION_HEADER_SLOT_SELECTOR) ?? null
    return list === null || strip === null || header === null ? null : { list, strip, header }
  }

  function clearInline(header: HTMLElement) {
    for (const property of [RIGHT, TOP, SPACE]) header.style.removeProperty(property)
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
      stopSize?.()
      watched = list
      // The font or window can change the room for tabs without mounting nodes (D40).
      stopSize = found === null ? null : observeSize([found.header, found.list], () => ui.schedule?.())
    }
  }

  function measureStrip(found: NonNullable<ReturnType<typeof find>>) {
    const { strip, header } = found
    let left = Infinity
    let right = -Infinity
    for (const child of strip.children) {
      const box = inPageBox(child.getBoundingClientRect())
      if (box.width === 0 || box.height === 0) continue
      left = Math.min(left, box.left)
      right = Math.max(right, box.right)
    }
    const width = right < left ? 0 : Math.ceil(right - left)
    const titleRow = header.querySelector<HTMLElement>(HEADER_TITLE_ROW_SELECTOR)
    if (titleRow === null || width === 0) return { header, width, inline: null }

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
    return { header, width, inline }
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
    const { header } = found
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
  ui.viewTabs = {
    measure, sync, skipOnContentOnly: true,
    widthFor: (header) => reading !== null && reading.header === header ? reading.width : 0,
  }
  mark(find())
  return () => {
    stop()
    mark(null)
    delete ui.viewTabs
  }
}
