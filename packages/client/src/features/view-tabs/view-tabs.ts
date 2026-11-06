import { windowsDesktop } from '@dsh-claude-style/engine/desktop-band'
import { cacheFirstMatch } from '@dsh-claude-style/engine/host'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
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
 * The conversation view-tab strip's placement — measured, not guessed.
 *
 * The host draws the strip as a row holding the tablist and, when it has views
 * to offer beyond the pinned ones, the "more views" button; it reads that row's
 * width to decide how many tabs stay visible. The row therefore keeps the
 * header's full width while the plate inside it hugs the tabs (view-tabs.css),
 * and every box this pass places from is the row's content box
 * (shared/content-box.ts).
 *
 * The strip's own row sits below the header's title row, and that title row ALSO
 * carries the header actions (the background-task chip, the workspace / preset
 * picker, the overflow menu, the panel toggle). Whether the strip can rise onto
 * the title's line therefore depends on the window: centred, it fits beside a
 * short title on a wide header and collides with the actions on a narrow one, so
 * a fixed offset cannot be right in both cases.
 *
 * So the skin measures the boxes and writes ONE custom property,
 * `--dsh-view-tabs-shift`, which the stylesheet turns into the translate. The
 * stylesheet keeps the fallback (its own row); this only lifts the strip when the
 * room above is real — the title and the actions both clear it, and the header's
 * top inset still holds.
 *
 * Windows titlebar mode is the one case where no measurement is needed: the
 * desktop shell marks <html> with `data-windows-titlebar` and the strip is
 * placed fixed in the titlebar row, centred (view-tabs.css). This mirrors that
 * marker onto the header holding the strip so the stylesheet can switch, and
 * skips the measured shift entirely there.
 *
 * macOS keeps the measured path. Its shell hands the top of the window to
 * the traffic lights and pads no content around them: the host sets
 * `--dsh-frame-top-clearance: 48px` under `html[data-platform=darwin]` and
 * leaves `--dsh-frame-chrome-top` at 0, so the conversation header keeps its
 * own top inset and draws its first row inside that strip. A fixed strip
 * would land on the title and the header actions; the measured shift already
 * seats it on the row beneath the strip.
 *
 * The row is stamped `data-dsh-view-tabs`, and every strip rule in
 * view-tabs.css keys on that attribute. The marks and the Windows titlebar marker are written in the
 * batch that mounts the strip, before the browser paints; the measured shift is
 * taken and written in that same frame's read and write phases, so the first
 * frame already draws the skin's placement (#189) without forcing the rest of
 * the freshly mounted page to lay out again in the observer's callback (#196).
 * The pass afterwards keeps them all on the element the page shows. Finding the
 * strip is a query this pass runs once; as a stylesheet selector
 * (`header:has(tabs) tabs`) it would make the browser re-match the whole
 * document on every DOM change.
 *
 * The strip's active pill slides between tabs (packages/client/src/shared/sliding-pill.ts).
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const STRIP = '[data-dsh-claude-part~="view-tabs"]'
  const HEADER = `[data-dsh-claude-part~="conversation-header"]:has(${STRIP})`
  /**
   * The title's TEXT, not its row or cluster: the title row is a flex row and
   * the cluster takes up the slack, so testing against them reported a clash on
   * every window and the strip never lifted. The crumb is the content-sized
   * element that actually draws the words; the cluster is the fallback for a
   * header whose crumb the host does not render.
   */
  const TITLE = '[data-dsh-claude-part~="header-crumb"], [data-dsh-claude-part~="title-cluster"]'
  const ACTIONS = '[data-dsh-claude-part~="header-actions"], [data-dsh-claude-part~="header-utilities"]'
  /** The custom property the stylesheet turns into the strip's translate (view-tabs.css). */
  const SHIFT = '--dsh-view-tabs-shift'
  /** The stylesheet's fallback: the strip's own row, 10px up from y=50. */
  const FALLBACK = -10
  /** The header's own top inset; the lifted strip may not enter it. */
  const TOP_INSET = 8
  /** Breathing room between the lifted strip and whatever shares the line. */
  const CLEARANCE = 6
  let last: number | null = null
  /** The element last was written to: a re-rendered strip must be told again. */
  let lastEl: HTMLElement | null = null
  /** The header marker the stylesheet reads for the fixed titlebar placement. */
  const TITLEBAR_ATTR = 'data-dsh-titlebar-tabs'
  /** Whether the last pass saw the host's Windows titlebar marker. */
  let titlebar = false
  /** The header carrying TITLEBAR_ATTR right now, or null. */
  let titlebarHost: HTMLElement | null = null
  /** The strip mark every strip rule in view-tabs.css keys on. */
  const stripStamp = createStamp<HTMLElement>('data-dsh-view-tabs')
  /** The control wearing the shared small segment look (shared/segment-control.css): a class, since the look is the control's own, not the mark's. */
  let classedControl: HTMLElement | null = null
  function classStamp(control: HTMLElement | null) {
    if (classedControl !== null && classedControl !== control) classedControl.classList.remove(VIEW_SWITCH_CLASS)
    classedControl = control
    if (control !== null) control.classList.add(VIEW_SWITCH_CLASS)
  }
  const pill = createSlidingPill('[aria-selected="true"]')
  /**
   * The two seats a strip is found through, each resolved once per batch
   * (engine/host.ts): a pass re-reads them, and the document is walked again
   * only when the page's structure changed.
   */
  const firstStamped = cacheFirstMatch<HTMLElement>(STRIP)
  const firstTabs = cacheFirstMatch<HTMLElement>(CONVERSATION_TABS_SELECTOR)
  // Warm the cache's own batch watch here, before the mutation route below
  // subscribes: the watch bumps the epoch at the head of a batch, and a seat read
  // after that bump sees the batch's own nodes. Subscribed later than the route,
  // it would leave the route reading the previous batch's answer (#189).
  firstStamped()

  /**
   * Read the host's Windows titlebar marker; the write that publishes it
   * happens in sync, on the header holding the strip. The mode is a shell
   * fact, so it flips only with the window's chrome.
   */
  function syncTitlebar() {
    titlebar = windowsDesktop()
  }

  /**
   * Publish the mode on the header holding the strip — the mark's every
   * reader is that header or the strip inside it, and a header-level write
   * keeps a flip from invalidating the document (D9). The observer's
   * attributeFilter is aria-* only, so this write cannot feed itself another
   * pass.
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
   * The title's box. `querySelector` on the selector list returns the first
   * match in DOCUMENT order, which is the wrapper (`.titleCluster` contains
   * the crumb) — and the wrapper stretches, so the strip never lifted. Take
   * the narrowest match instead: that is the element drawing the words.
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
   * The strip and the header holding it.
   *
   * A strip the skin has stamped is taken as it is. One it has not is read off
   * the host's own tablist mark, which sits on the plate: its parent is the row
   * the host keeps for its own tab count. Answering this before the pass has
   * stamped anything is what the mutation route below needs to mark a strip in
   * the batch that mounted it (#189).
   *
   * `header` is the conversation header above the strip — its part mark once the
   * walk has run, the slot it is mounted in before that; `list` is the tablist.
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

  /**
   * The boxes the shift is decided from: the strip's content, the header, the
   * title that carries the words and the header's actions. Taken in the pass's
   * read phase (D40), so no feature's write of the same frame can invalidate
   * them.
   */
  interface StripReading {
    header: HTMLElement
    strip: HTMLElement
    /** What the strip draws: the plate and the overflow button. */
    stripBox: DOMRect | null
    headerBox: DOMRect | null
    titleBox: DOMRect | null
    actionsBox: DOMRect | null
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
    }
  }

  /**
   * Place a strip a batch has mounted, in the frame that batch paints in.
   *
   * The marks go on in the observer's callback, so the first frame draws the
   * skin's own layout (#189). The boxes the shift is decided from are taken in
   * that frame's read phase instead: a read here would force the whole freshly
   * mounted, still-dirty conversation to lay out again inside the observer's
   * callback, and every batch of the switch would pay it once more; the frame
   * pipeline takes one read after the frame's writes, and a later batch before
   * the frame joins the same read (#196).
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
        writeShift(target.strip, shiftIn(boxes))
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
      stripStamp.mark(null)
      classStamp(null)
      pill.sync(null)
      return
    }
    const { header, strip, list } = found
    markTitlebar(header)
    stripStamp.mark(strip)
    classStamp(list)
    pill.sync(list)
    // Windows titlebar mode places the strip itself (view-tabs.css): it is
    // fixed there, so neither the measured shift nor the fallback applies.
    if (titlebar) return
    const boxes = reading !== null && measuredStrip === strip ? reading : takeReading(header, strip)
    writeShift(strip, shiftIn(boxes))
  }

  /**
   * The shift the boxes ask for: the measured one when the room above is real,
   * the stylesheet's fallback otherwise, and null for a strip with no box to
   * decide from.
   */
  function shiftIn(boxes: StripReading) {
    const stripBox = boxes.stripBox
    if (stripBox === null) return null
    const headerBox = boxes.headerBox
    if (headerBox === null) return null
    // The strip's own layout position, with the shift we may already have
    // applied taken back out: rect.top moves with the transform.
    let applied = parseFloat(boxes.strip.style.getPropertyValue(SHIFT))
    if (!isFinite(applied)) applied = FALLBACK
    const naturalTop = stripBox.top - applied
    const titleBox = boxes.titleBox
    let shift = FALLBACK
    if (titleBox !== null) {
      let want = titleBox.top + titleBox.height / 2 - naturalTop - stripBox.height / 2
      // Room above: the lifted strip stays under the header's top inset.
      const top = naturalTop + want
      if (top < headerBox.top + TOP_INSET) want = headerBox.top + TOP_INSET - naturalTop
      // Room sideways: centred, it must clear the title and the actions, the
      // boxes it would share the title's line with.
      const actionsBox = boxes.actionsBox
      const clash = [titleBox, actionsBox].some((box) => box !== null && stripBox.right > box.left - CLEARANCE && stripBox.left < box.right + CLEARANCE)
      if (!clash) shift = Math.round(want)
    }
    return shift
  }

  /** Write the shift the strip takes; the strip already wearing it takes no write. */
  function writeShift(strip: HTMLElement, shift: number | null) {
    if (shift === null) return
    if (shift === last && strip === lastEl) return
    last = shift
    lastEl = strip
    strip.style.setProperty(SHIFT, `${shift}px`)
  }

  // The strip lives in the conversation header, outside the column a streaming
  // batch touches, so such a batch skips this pass (D40). The boxes are read in
  // the pass's read phase and written in its write phase.
  ui.viewTabs = { measure, sync, skipOnContentOnly: true }

  /**
   * Whether a strip already draws the way the frame's paint reads it: its own
   * mark on it, the titlebar mode on its header, and the shift
   * this window needs — Windows titlebar mode places the strip itself, so it
   * writes none.
   */
  function placedForPaint(strip: HTMLElement, header: HTMLElement) {
    if (stripStamp.current() !== strip) return false
    if (header.getAttribute(TITLEBAR_ATTR) !== (titlebar ? '' : null)) return false
    return titlebar || strip.style.getPropertyValue(SHIFT) !== ''
  }

  /**
   * Put the marks a batch has just mounted before the browser paints (#189).
   *
   * The pass lands on the next frame, and a batch the size of a session switch
   * is dispatched after that frame's paint (engine/bus.ts): a strip left for
   * either draws in the host's own layout and jumps when the pass reaches it.
   * This subscription asks for `beforePaint`, so it runs inside every batch's
   * callback whatever the batch weighs, and writes what that frame reads: the
   * strip's mark, the control's class and the header's titlebar mark. A strip already
   * placed costs one kept lookup and a style read; the pass keeps everything in
   * step afterwards. The shift the boxes ask for is measured and written in the
   * same frame's read and write phases (placeForPaint), not here.
   */
  const stopMutations = subscribeMutations(document.body, { childList: true, subtree: true, beforePaint: true }, () => {
    syncTitlebar()
    const found = findStrip()
    if (found === null) return
    const { header, strip, list } = found
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
    // The strip the passes wrote to: the placement belongs to the element the
    // last pass held, and the page may have moved on since.
    const strip = stripStamp.current()
    if (strip !== null) strip.style.removeProperty(SHIFT)
    pill.release()
    stripStamp.release()
    classStamp(null)
    last = null
    lastEl = null
    delete ui.viewTabs
  }
}
