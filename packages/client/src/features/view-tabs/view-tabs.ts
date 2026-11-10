import { windowsDesktop } from '@dsh-claude-style/engine/desktop-band'
import { SESSION_PANEL_ATTR } from '../../constants'
import { FALLBACK_VIEW_TAB_SHIFT, placementFor } from './placement'
import type { StripPlacement } from './placement'
import { cacheFirstMatch } from '@dsh-claude-style/engine/host'
import { observeSize, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { createStamp } from '@dsh-claude-style/engine/dom'
import { CONVERSATION_HEADER_SELECTOR, CONVERSATION_HEADER_SLOT_SELECTOR, CONVERSATION_TABS_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { contentBox } from '../../shared/content-box'
import { VIEW_SWITCH_CLASS } from '../../shared/segment-control'
import { createSlidingPill } from '../../shared/sliding-pill'
import { inPageBox } from '../../shared/page-zoom'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './view-tabs.manifest'

/**
 * Measure the view-tab strip's lift onto the title row and write
 * `--dsh-view-tabs-shift`. Windows titlebar mode places it fixed; the pill
 * slides between tabs (shared/sliding-pill.ts).
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const STRIP = '[data-dsh-claude-part~="view-tabs"]'
  const HEADER = `[data-dsh-claude-part~="conversation-header"]:has(${STRIP})`
  /** Measure the title text, not the flexible row; the cluster is the fallback. */
  const TITLE = '[data-dsh-claude-part~="header-crumb"], [data-dsh-claude-part~="title-cluster"]'
  const ACTIONS = '[data-dsh-claude-part~="header-actions"], [data-dsh-claude-part~="header-utilities"]'
  /** The custom property the stylesheet turns into the strip's translate (view-tabs.css). */
  const SHIFT = '--dsh-view-tabs-shift'
  /** The horizontal part of the same translate, used when the session overview takes the title's line. */
  const SHIFT_X = '--dsh-view-tabs-shift-x'
  /** The width the title's words keep when the strip shares its line. */
  const TITLE_CAP = '--dsh-view-tabs-title-cap'
  /** The header's own right cluster, the boundary a strip placed beside the title may not cross. */
  const UTILITIES = '[data-dsh-claude-part~="header-utilities"]'
  let last: string | null = null
  /** The element last was written to: a re-rendered strip must be told again. */
  let lastEl: HTMLElement | null = null
  /** The header marker the stylesheet reads for the fixed titlebar placement. */
  const TITLEBAR_ATTR = 'data-dsh-titlebar-tabs'
  /** Theme marker for the strip row's edge; off when the feature yields the header. */
  const TAKEN_ATTR = 'data-dsh-view-tabs-taken'
  /** Whether the last pass saw the host's Windows titlebar marker. */
  let titlebar = false
  /** The header carrying TITLEBAR_ATTR right now, or null. */
  let titlebarHost: HTMLElement | null = null
  /** The strip mark every strip rule in view-tabs.css keys on. */
  const stripStamp = createStamp<HTMLElement>('data-dsh-view-tabs')
  /** The header carrying the strip, marked for the theme's chrome sheet. */
  const takenStamp = createStamp<HTMLElement>(TAKEN_ATTR)
  /** The control wearing the shared small segment look (shared/segment-control.css). */
  let classedControl: HTMLElement | null = null
  function classStamp(control: HTMLElement | null) {
    if (classedControl !== null && classedControl !== control) classedControl.classList.remove(VIEW_SWITCH_CLASS)
    classedControl = control
    if (control !== null) control.classList.add(VIEW_SWITCH_CLASS)
  }
  const pill = createSlidingPill('[aria-selected="true"]')
  /** The two seats a strip is found through, each resolved once per batch (engine/host.ts). */
  const firstStamped = cacheFirstMatch<HTMLElement>(STRIP)
  const firstTabs = cacheFirstMatch<HTMLElement>(CONVERSATION_TABS_SELECTOR)
  // Warm the cache's batch watch before the mutation route subscribes: the watch
  // bumps the epoch at the head of a batch, and a seat read after that bump sees
  // the batch's own nodes (#189).
  firstStamped()

  /**
   * Read the host's Windows titlebar marker: a shell fact, so it flips only with
   * the window's chrome.
   */
  function syncTitlebar() {
    titlebar = windowsDesktop()
  }

  /**
   * Publish the mode on the header holding the strip: every reader is that header
   * or the strip inside it, and a header-level write keeps a flip from
   * invalidating the document (D9). The observer filters `aria-*` only.
   */
  function markTitlebar(header: HTMLElement | null) {
    const host = titlebar ? header : null
    if (host === titlebarHost) return
    titlebarHost?.removeAttribute(TITLEBAR_ATTR)
    titlebarHost = host
    host?.setAttribute(TITLEBAR_ATTR, '')
  }

  function rect(el: Element | null | undefined) {
    if (el === null || el === undefined) return null
    // In the pixels the strip's own shift is read in (shared/page-zoom.ts).
    const box = inPageBox(el.getBoundingClientRect())
    if (box.width === 0 && box.height === 0) return null
    return box
  }

  /**
   * `querySelector` returns the wrapper in document order, and the wrapper
   * stretches; take the narrowest match, the element that draws the words.
   */
  function titleBoxOf(header: Element) {
    const all = header.querySelectorAll(TITLE)
    let best: DOMRect | null = null
    for (let i = 0; i < all.length; i++) {
      const box = rect(all[i])
      if (box === null) continue
      if (best === null || box.width <= best.width) best = box
    }
    return best
  }

  /**
   * The strip and the header holding it. A stamped strip is taken as it is; one
   * not yet stamped is read off the host's tablist mark, whose parent is the row
   * the host keeps. Answering before the pass has stamped anything is what lets
   * the mutation route mark a strip in the batch that mounted it (#189).
   */
  function findStrip() {
    const header = (el: Element) => el.closest<HTMLElement>(CONVERSATION_HEADER_SELECTOR) ?? el.closest<HTMLElement>(CONVERSATION_HEADER_SLOT_SELECTOR)
    const stamped = firstStamped()
    if (stamped !== null) {
      const marked = header(stamped)
      const list = stamped.querySelector<HTMLElement>(CONVERSATION_TABS_SELECTOR)
      return marked === null || list === null ? null : { header: marked, strip: stamped, list }
    }
    const list = firstTabs()
    const strip = list?.parentElement ?? null
    if (list === null || strip === null) return null
    const marked = header(strip)
    return marked === null ? null : { header: marked, strip, list }
  }

  /** The boxes the shift is decided from, taken in the pass's read phase (D40). */
  interface StripReading {
    header: HTMLElement
    strip: HTMLElement
    /** What the strip draws: the plate and the overflow button. */
    stripBox: DOMRect | null
    headerBox: DOMRect | null
    titleBox: DOMRect | null
    actionsBox: DOMRect | null
    utilitiesBox: DOMRect | null
  }

  /** The reading this pass places from, and the strip it belongs to. */
  let reading: StripReading | null = null
  let measuredStrip: HTMLElement | null = null
  /** The strip a batch mounted, waiting for the frame's read phase to be measured. */
  let pendingShift: { header: HTMLElement, strip: HTMLElement } | null = null
  /** The reading the last frame took for `pendingShift`, written in its write phase. */
  let shiftReading: StripReading | null = null
  /** Cancels the frame a batch's placement waits on. */
  let cancelShift: (() => void) | null = null

  /** Read the four boxes for one strip. */
  function takeReading(header: HTMLElement, strip: HTMLElement): StripReading {
    return {
      header,
      strip,
      // The plate and the overflow button, inside a row the host keeps wide for
      // its own count.
      stripBox: contentBox(strip),
      headerBox: rect(header),
      titleBox: titleBoxOf(header),
      actionsBox: rect(header.querySelector(ACTIONS)),
      utilitiesBox: rect(header.querySelector(UTILITIES)),
    }
  }

  /**
   * Place a strip a batch has mounted, in the frame that batch paints in. The
   * marks go on in the observer's callback (#189); the boxes are read in that
   * frame's read phase, since a read here would re-lay out the whole freshly
   * mounted conversation (#196).
   */
  function placeForPaint(header: HTMLElement, strip: HTMLElement) {
    pendingShift = { header, strip }
    if (cancelShift !== null) return
    cancelShift = requestFrame({
      read() {
        const target = pendingShift
        shiftReading = target === null ? null : takeReading(target.header, target.strip)
      },
      write() {
        cancelShift = null
        const target = pendingShift
        const boxes = shiftReading
        pendingShift = null
        shiftReading = null
        if (target === null || boxes === null) return
        if (boxes.strip !== target.strip || !target.strip.isConnected) return
        writePlacement(target.strip, target.header, placementIn(boxes))
      },
    })
  }

  /** The pass's read phase: the strip is resolved and its boxes read before anyone writes; the pill travels in the tablist. */
  function measure() {
    const found = findStrip()
    measuredStrip = found === null ? null : found.strip
    reading = found === null ? null : takeReading(found.header, found.strip)
    pill.measure(found === null ? null : found.list)
  }

  function sync() {
    syncTitlebar()
    const found = findStrip()
    if (found === null) {
      markTitlebar(null)
      takenStamp.mark(null)
      stripStamp.mark(null)
      classStamp(null)
      pill.sync(null)
      if (stopSize !== null) stopSize()
      stopSize = null
      if (stopTitle !== null) stopTitle()
      stopTitle = null
      sizedHeader = null
      titledHeader = null
      sizedWidth = 0
      clearTitleCap()
      return
    }
    const { header, strip, list } = found
    takenStamp.mark(header)
    markTitlebar(header)
    stripStamp.mark(strip)
    classStamp(list)
    pill.sync(list)
    followSize(header)
    followTitle(header)
    // Windows titlebar mode places the strip itself (view-tabs.css): it is
    // fixed there, so neither the measured shift nor the fallback applies.
    if (titlebar) {
      clearTitleCap()
      return
    }
    const boxes = reading !== null && measuredStrip === strip ? reading : takeReading(header, strip)
    writePlacement(strip, header, placementIn(boxes))
  }

  /**
   * Where the boxes put the strip, in the page's pixels.
   *
   * The strip is lifted onto the title's own line when the room above it is
   * real. When the session overview is installed the lift always happens and a
   * sideways clash is answered by moving the strip past the title's own actions
   * instead of leaving it on its row: the panel has taken the header's
   * background-work chips, and the reader expects this switch beside the title.
   * Without the panel the lift still stands down on a clash, as before.
   */
  function placementIn(boxes: StripReading) {
    const strip = boxes.strip
    // The strip's own box comes from the pass's content read; the applied
    // translate is read off the element the stylesheet will update.
    let appliedY = parseFloat(strip.style.getPropertyValue(SHIFT))
    if (!isFinite(appliedY)) appliedY = FALLBACK_VIEW_TAB_SHIFT
    let appliedX = parseFloat(strip.style.getPropertyValue(SHIFT_X))
    if (!isFinite(appliedX)) appliedX = 0
    return placementFor({
      strip: boxes.stripBox,
      header: boxes.headerBox,
      title: boxes.titleBox,
      actions: boxes.actionsBox,
      utilities: boxes.utilitiesBox,
    }, { y: appliedY, x: appliedX }, document.body.hasAttribute(SESSION_PANEL_ATTR))
  }

  /**
   * Follow the header's own size: a column resize or an opened sidebar reshapes
   * every box under it. The observer's first report is the header's current
   * width and asks for nothing; only a width it has not seen wakes a pass.
   */
  function followSize(header: HTMLElement) {
    if (header === sizedHeader) return
    if (stopSize !== null) stopSize()
    sizedHeader = header
    sizedWidth = 0
    stopSize = observeSize(header, (entries) => {
      const width = entries[0]?.contentRect.width ?? header.getBoundingClientRect().width
      if (sizedWidth === 0) {
        sizedWidth = width
        return
      }
      if (Math.abs(width - sizedWidth) < 1) return
      sizedWidth = width
      // A column resize moves every box a placement reads; it is rare, so it
      // places the strip itself rather than making each streaming batch check.
      const strip = stripStamp.current()
      if (strip !== null) placeForPaint(header, strip)
    })
  }

  /**
   * Follow the title's own words: the session title and its crumb arrive after
   * the strip mounts, so a change there places the strip again. Only the title's
   * subtree is watched character by character; the page's own text streams do
   * not wake this feature.
   */
  function followTitle(header: HTMLElement) {
    if (header === titledHeader) return
    if (stopTitle !== null) stopTitle()
    titledHeader = header
    const title = header.querySelector(TITLE)
    if (title === null) {
      stopTitle = null
      return
    }
    stopTitle = subscribeMutations(title, { childList: true, characterData: true, subtree: true, beforePaint: true }, () => {
      const strip = stripStamp.current()
      if (strip !== null) placeForPaint(header, strip)
    })
  }

  /** The header whose title the last placement capped, and the cap it holds. */
  let cappedHeader: HTMLElement | null = null
  let cappedAt: number | null = null
  /** Whether the session overview was installed when the last placement was written. */
  let placedMark: boolean | null = null
  /** The header whose title the pass follows, and the subscription on the title's own words. */
  let titledHeader: HTMLElement | null = null
  let stopTitle: (() => void) | null = null
  /** The header whose size the pass follows, the subscription on it, and the width last reported. */
  let sizedHeader: HTMLElement | null = null
  let stopSize: (() => void) | null = null
  let sizedWidth = 0

  /** Give the title its own width back where a cap stands. */
  function clearTitleCap() {
    if (cappedHeader !== null) cappedHeader.style.removeProperty(TITLE_CAP)
    cappedHeader = null
    cappedAt = null
  }

  /** Write the placement the strip takes; the strip already wearing it takes no write. */
  function writePlacement(strip: HTMLElement, header: HTMLElement, placement: StripPlacement | null) {
    if (placement === null) return
    const seen = `${placement.y}|${placement.x}`
    if (seen !== last || strip !== lastEl) {
      last = seen
      lastEl = strip
      strip.style.setProperty(SHIFT, `${placement.y}px`)
      strip.style.setProperty(SHIFT_X, `${placement.x}px`)
    }
    placedMark = document.body.hasAttribute(SESSION_PANEL_ATTR)
    if (placement.titleCap === null) {
      clearTitleCap()
    } else if (header !== cappedHeader || placement.titleCap !== cappedAt) {
      clearTitleCap()
      header.style.setProperty(TITLE_CAP, `${placement.titleCap}px`)
      cappedHeader = header
      cappedAt = placement.titleCap
    }
  }

  // The strip lives in the conversation header, outside the column a streaming
  // batch touches, so such a batch skips this pass (D40). The boxes are read in
  // the pass's read phase and written in its write phase.
  ui.viewTabs = { measure, sync, skipOnContentOnly: true }

  /**
   * Whether a strip already draws the way the frame's paint reads it: its mark,
   * the titlebar mode on its header, and the shift this window needs — Windows
   * titlebar mode places the strip itself and writes none.
   */
  function placedForPaint(strip: HTMLElement, header: HTMLElement) {
    if (stripStamp.current() !== strip) return false
    if (header.getAttribute(TITLEBAR_ATTR) !== (titlebar ? '' : null)) return false
    // The session overview changes where the strip may stand, so a flip of its
    // mark makes the last placement stale without touching the strip itself.
    if (placedMark !== document.body.hasAttribute(SESSION_PANEL_ATTR)) return false
    return titlebar || strip.style.getPropertyValue(SHIFT) !== ''
  }

  /**
   * Put the marks a batch has just mounted before the browser paints (#189): the
   * pass lands on the next frame, and a session-switch batch is dispatched after
   * that frame's paint, so a strip left for it draws in the host's layout and
   * jumps. `beforePaint` runs inside every batch's callback; the shift itself is
   * measured and written in the same frame (placeForPaint).
   */
  const stopMutations = subscribeMutations(document.body, { childList: true, subtree: true, beforePaint: true, attributes: true, attributeFilter: [SESSION_PANEL_ATTR] }, () => {
    syncTitlebar()
    const found = findStrip()
    if (found === null) return
    const { header, strip, list } = found
    takenStamp.mark(header)
    followSize(header)
    // The title's own subscription and the size observer place the strip when
    // the words or the row's width move; a batch that changed neither leaves the
    // placement alone, so streaming text wakes no placement work.
    if (placedForPaint(strip, header)) return
    markTitlebar(header)
    stripStamp.mark(strip)
    classStamp(list)
    if (titlebar) return
    placeForPaint(header, strip)
  })

  return () => {
    stopMutations()
    if (cancelShift !== null) cancelShift()
    cancelShift = null
    pendingShift = null
    shiftReading = null
    titlebar = false
    markTitlebar(null)
    clearTitleCap()
    // The placement belongs to the element the last pass held.
    const strip = stripStamp.current()
    if (strip !== null) {
      strip.style.removeProperty(SHIFT)
      strip.style.removeProperty(SHIFT_X)
    }
    pill.release()
    stripStamp.release()
    takenStamp.release()
    classStamp(null)
    if (stopSize !== null) stopSize()
    stopSize = null
    if (stopTitle !== null) stopTitle()
    stopTitle = null
    sizedHeader = null
    titledHeader = null
    sizedWidth = 0
    last = null
    lastEl = null
    placedMark = null
    delete ui.viewTabs
  }
}
