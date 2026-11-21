import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import {
  HEADER_ACTIONS_SELECTOR,
  HEADER_TITLE_ROW_SELECTOR,
  RIGHTBAR_OPEN_ATTRIBUTE,
  RIGHTBAR_PANEL_SELECTOR,
} from '@dsh-claude-style/contracts/dom'
import { observeMatches, observeSize, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { desktopBand } from '@dsh-claude-style/engine/desktop-band'
import { closestConversationHeader, conversationHeaderMore, conversationHeaderTitle, conversationHeaderTools, findRightbarToggle, findWindowsMenu, registerSlotEntries } from '@dsh-claude-style/engine/host'
import { createStamp, setAttributeIfChanged, shown } from '@dsh-claude-style/engine/dom'
import { FRAME_SELECTOR } from '../../shared/page-scale-columns'
import { inPageBox, inPagePixels } from '../../shared/page-zoom'
import type { FeatureUi } from '../../core/feature'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type manifest from './header-band.manifest'
import { copy } from './copy'
import { placeCaptionRow } from './placement'

/**
 * The conversation header's title row, lifted into the desktop caption row.
 *
 * On Windows the shell's caption row is the one place a session title can sit
 * above every column. The pieces lifted here belong to the host, so they are
 * stamped and placed with `position: fixed`, never moved between parents. A
 * side whose measured room is too small writes nothing and stays in the row,
 * which is the stylesheet's base rule, so a failed placement needs no undoing.
 *
 * The session's more-actions trigger rides beside the lifted title, the way
 * Claude's app keeps the session's own menu at the name: the trigger is
 * stamped and fixed out of the utilities cluster, which closes the gap it
 * leaves, and the host's menu anchors from the trigger's own box, so the
 * panel opens beside the title. The conversation header keeps the trigger
 * at the end of an unlifted title. The shell's application menu seat keeps
 * the caption row's left end throughout.
 *
 * The row the title leaves rises by a relative offset, which creates no
 * containing block for the fixed pieces; the header then closes to that row, so
 * the height the title held is not left standing empty above the conversation.
 * The host's container query hides chip labels to protect the title, so this
 * mode shows them again.
 * The marks ride the header, since a body write here would invalidate the whole
 * document on every page change (D9). The sidebar collapse animates width with
 * no DOM change, which is why the title row's size is subscribed.
 *
 * macOS has nothing to lift. A host slot for the title row retires this pass.
 *
 * The right panel's own collapse control is placed from here too, on every page
 * rather than the desktop alone: that panel keeps its copy inside a transformed,
 * clipped subtree, so the skin draws the control in the header's utilities seat
 * and presses the host's own (D43).
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /** The body marker: which parts of the row the caption row holds, as a token list. */
  const BAND_ATTR = 'data-dsh-header-band'
  /** The title's stamp. */
  const TITLE_ATTR = 'data-dsh-header-title'
  /**
   * The numbers every piece the caption row holds reads, written on the piece
   * itself: where it stands, how wide its place is, and the row's middle it is
   * centred on.
   */
  const TITLE_LEFT = '--dsh-header-band-left'
  const TITLE_MAX = '--dsh-header-band-max'
  const TITLE_TOP = '--dsh-header-band-title-top'
  /**
   * The cluster the host keeps beside the title — the preset picker and the
   * chips the session mounts there. Left in the row it carries no stamp and the
   * row keeps the height it takes there.
   */
  const TRAIL_ATTR = 'data-dsh-header-trail'
  /** The more-actions trigger's stamp; lifted out of the utilities cluster beside the title. */
  const MORE_ATTR = 'data-dsh-header-more'
  /**
   * The row's own stamp and the negative top margin its rule reads: with the
   * title gone the row holds only the controls, and the host's top inset for a
   * row that also carried a title leaves it too low.
   */
  const ROW_ATTR = 'data-dsh-header-row'
  const ROW_LIFT = '--dsh-header-band-row-lift'
  /**
   * The header's top inset once it has closed around that row, measured from
   * the row's target and the header's own edge. The host's inline inset predates
   * the title's move, so the stylesheet has to stand over it.
   */
  const ROW_TOP = '--dsh-header-band-top'
  /** The measured caption height shared by the title and the fixed controls. */
  const BAND_HEIGHT = '--dsh-header-band-height'
  const TABS_RIGHT = '--dsh-view-tabs-caption-right'
  /** The two control clusters' stamps, and the right offset both rules read. */
  const ACTIONS_ATTR = 'data-dsh-header-actions'
  const CORNER_ATTR = 'data-dsh-header-corner'
  const ACTIONS_RIGHT = '--dsh-header-band-right'
  /** The pieces the header marker places in the caption. */
  const TITLE_TOKEN = 'title'
  const ACTIONS_TOKEN = 'actions'
  /** The host's seat in the header's own row that the header utilities land in. */
  const UTILITIES_SLOT = 'conversation.session.header.utilities'
  /** The skin's own control there, which the stylesheet shows while the panel is open. */
  const CLOSE_CLASS = 'dsh-claude-rightbar-close'
  /**
   * The host hides a retained Session's right column with this attribute while
   * another Session takes the foreground; that Session's panel keeps its own
   * open mark, so this attribute change is what makes the visible panel win.
   */
  const HIDDEN_ATTRIBUTE = 'hidden'

  const rowStamp = createStamp<HTMLElement>(ROW_ATTR)
  const titleStamp = createStamp<HTMLElement>(TITLE_ATTR)
  const moreStamp = createStamp<HTMLElement>(MORE_ATTR)
  const trailStamp = createStamp<HTMLElement>(TRAIL_ATTR)
  const actionsStamp = createStamp<HTMLElement>(ACTIONS_ATTR)
  const cornerStamp = createStamp<HTMLElement>(CORNER_ATTR)
  const rightbarOpenStamp = createStamp<HTMLElement>('data-dsh-header-rightbar-open')
  /** The row whose size the pass follows. */
  let watched: HTMLElement | null = null
  /** Stops watching it. */
  let stopSize: (() => void) | null = null
  /** The title whose size the pass follows beside the row. */
  let watchedTitle: HTMLElement | null = null
  /** Stops watching the title. */
  let stopTitleSize: (() => void) | null = null
  /** The cluster's needed width, measured while nothing capped it (D9). */
  let clusterNeed: number | null = null
  /** Every candidate title row, kept current by the bus (D40), and the one this pass took. */
  const titleRows = observeMatches<HTMLElement>(HEADER_TITLE_ROW_SELECTOR)
  let keptRow: HTMLElement | null = null
  /** The header carrying BAND_ATTR right now, or null. */
  let bandHost: HTMLElement | null = null
  /**
   * The places the last pass gave the pieces. A pass moves the rows the next one
   * reads, so a piece keeps its place across a small step back (placement.ts).
   */
  let lastLift: { title: boolean, trail: boolean, actions: boolean } | null = null
  /**
   * The skin's own control for the right panel, in the header's utilities seat.
   *
   * The host keeps its collapse control inside the panel's chrome strip, which
   * hangs from a transformed subtree and is clipped at the panel's own edge: a
   * fixed box placed there is measured from the panel and cut at its edge, so
   * that control cannot be lifted into the header's row. This button stands
   * there instead and presses it, and the host's own copy stays where it is.
   */
  function RightbarClose() {
    const label = copy('rightbarClose')
    return React.createElement(primitives.Tooltip, {
      label,
      side: 'bottom',
      delayMs: 500,
      children: React.createElement('button', {
        type: 'button',
        className: CLOSE_CLASS,
        'aria-label': label,
        onClick: () => { findRightbarToggle()?.click() },
      }, React.createElement(primitives.IconPanelLeftOutlineRegular, { size: 16 })),
    })
  }

  /** The expand button leaves the header when the host marks the panel open.
   * Show its replacement before the frame pipeline reads either control box
   * so that measurement never depends on the later width transition (D40, D43).
   */
  function markRightbarOpen() {
    const panel = rightbarPanels.all().find(element => element.hasAttribute(RIGHTBAR_OPEN_ATTRIBUTE) && element.closest(`[${HIDDEN_ATTRIBUTE}]`) === null && shown(element))
    const frame = panel?.closest<HTMLElement>(FRAME_SELECTOR) ?? null
    if (frame === rightbarOpenStamp.current()) return
    rightbarOpenStamp.mark(frame)
    ui.schedule?.()
  }

  /**
   * Ignore unrelated `hidden` toggles across the rest of the page: only an open
   * mark on a panel or a `hidden` change on a panel or its ancestor can move
   * which panel stands on screen, so chat folds never force a visibility read.
   */
  function onRightbarMutation(records: MutationRecord[]) {
    const panels = rightbarPanels.all()
    if (panels.length === 0) return
    for (let i = 0; i < records.length; i += 1) {
      const record = records[i]
      if (record.attributeName === RIGHTBAR_OPEN_ATTRIBUTE) {
        if (panels.includes(record.target as HTMLElement)) {
          markRightbarOpen()
          return
        }
        continue
      }
      for (let j = 0; j < panels.length; j += 1) {
        if (record.target.contains(panels[j])) {
          markRightbarOpen()
          return
        }
      }
    }
  }

  const rightbarPanels = observeMatches<HTMLElement>(RIGHTBAR_PANEL_SELECTOR, markRightbarOpen)
  // The frame's part mark can land after the panel is already on the page (a
  // restored session opens the panel at load): the stamp is re-read when the
  // frame arrives, not only when the panel or its open state changes.
  const rightbarFrames = observeMatches<HTMLElement>(FRAME_SELECTOR, markRightbarOpen)
  const stopRightbarOpen = subscribeMutations(document.body, {
    subtree: true,
    attributeFilter: [RIGHTBAR_OPEN_ATTRIBUTE, HIDDEN_ATTRIBUTE],
    beforePaint: true,
  }, onRightbarMutation)
  markRightbarOpen()

  /** Register that control in the header's utilities seat, which renders it wherever it stands. */
  function registerRightbarClose() {
    return registerSlotEntries(ctx, [{
      options: { name: UTILITIES_SLOT, id: 'claude-style-rightbar-close', order: 90 },
      component: RightbarClose,
    }], 'dsh-claude-style: right panel control')
  }

  /**
   * The header's title row: the one carrying a title or the utilities. The
   * bare substring also names rows inside the sidebar's panels, and a pass
   * that took one of those would lift nothing all session.
   */
  function titleRow() {
    if (keptRow !== null && stillHeaderRow(keptRow)) return keptRow
    for (const row of titleRows.all()) {
      if (!carriesHeaderText(row)) continue
      keptRow = row
      return row
    }
    keptRow = null
    return null
  }

  /** Whether `row` carries a title or the utilities. */
  function carriesHeaderText(row: HTMLElement) {
    return conversationHeaderTitle(row) !== null || conversationHeaderTools(row).utilities !== null
  }

  /** Whether the kept row is still the first match carrying header text (D40). */
  function stillHeaderRow(row: HTMLElement) {
    if (!row.isConnected || !carriesHeaderText(row)) return false
    for (const earlier of titleRows.all()) {
      if (earlier === row) return true
      if (carriesHeaderText(earlier)) return false
    }
    return false
  }

  function rect(element: Element | null) {
    if (element === null) return null
    const box = inPageBox(element.getBoundingClientRect())
    return box.width === 0 && box.height === 0 ? null : box
  }

  /**
   * The caption strip's own sizes, in the pixels the placement numbers are read
   * in: the shell publishes them in the viewport's while every `left`, `top` and
   * width this pass writes is read in the page's, which the reader's page zoom
   * scales (shared/page-zoom.ts).
   */
  function pageBand(band: NonNullable<ReturnType<typeof desktopBand>>) {
    return { ...band, height: inPagePixels(band.height), controls: { ...band.controls, size: inPagePixels(band.controls.size) } }
  }

  /** The window's width, in the pixels the placement numbers are read in. */
  function pageWidth() {
    return inPagePixels(document.documentElement.clientWidth)
  }

  /** Write one placement number, and report whether it moved. */
  function setVar(element: HTMLElement, name: string, value: string) {
    if (element.style.getPropertyValue(name) === value) return false
    element.style.setProperty(name, value)
    return true
  }

  /** Hand the row back: no placement, no marks. */
  function clear() {
    lastLift = null
    rowStamp.release()
    titleStamp.release()
    moreStamp.release()
    trailStamp.release()
    actionsStamp.release()
    cornerStamp.release()
    releaseBand()
  }

  function releaseBand() {
    if (bandHost === null) return
    bandHost.removeAttribute(BAND_ATTR)
    for (const property of [ROW_TOP, BAND_HEIGHT, TABS_RIGHT]) bandHost.style.removeProperty(property)
    bandHost = null
  }

  /**
   * Follow the row's own box. The sidebar's collapse is an animation of the
   * column's width with no mutation under it, and a placement written once
   * would trail the column the whole way; a resize report asks for a pass in
   * the same frame, and the pass writes the same numbers, so it stops there.
   *
   * The title's box is followed beside it: a webfont arriving changes the
   * width the words take without a mutation and without moving the row, which
   * spans the header. The cluster's place is computed from that width, so
   * without this report it would keep the gap the fallback font measured.
   */
  function watch(row: HTMLElement | null, title: HTMLElement | null) {
    if (row !== watched) {
      if (stopSize !== null) stopSize()
      stopSize = null
      watched = row
      if (row !== null) stopSize = observeSize(row, () => { ui.schedule?.() })
    }
    if (title !== watchedTitle) {
      if (stopTitleSize !== null) stopTitleSize()
      stopTitleSize = null
      watchedTitle = title
      if (title !== null) stopTitleSize = observeSize(title, () => { ui.schedule?.() })
    }
  }

  /**
   * What one pass places against: the row and the clusters, with the boxes read
   * in the frame's read phase (D40). `row` is kept even when its box is not
   * laid out, so the size watch follows a row that is merely hidden.
   */
  interface BandReading {
    band: NonNullable<ReturnType<typeof desktopBand>>
    /** The window's width (pageWidth), read with the boxes. */
    width: number
    row: HTMLElement
    header: HTMLElement | null
    title: HTMLElement | null
    trail: HTMLElement | null
    utilities: HTMLElement | null
    corner: HTMLElement | null
    rowBox: DOMRect | null
    headerBox: DOMRect | null
    /** The shell's application menu seat, which keeps the row's left end. */
    menuRight: number | null
    /** The row's more-actions trigger, read inside the row so embedded headers are not taken. */
    more: HTMLElement | null
    /** The trigger's presence and the width of its square, which no placement caps. */
    moreSize: { present: boolean, width: number }
    utilitiesBox: DOMRect | null
    cornerBox: DOMRect | null
    titleBox: DOMRect | null
    trailBox: DOMRect | null
    /** The width the title's words need, past any limit an earlier pass wrote. */
    titleNatural: number
    /** The width the cluster needs, measured while nothing capped it (D9). */
    trailNeed: number
  }

  /** The reading this pass places against, and whether `measure` took it for this pass. */
  let reading: BandReading | null = null
  let measured = false

  /**
   * Read the boxes the pass places against. Written in the pass's read phase,
   * before any feature's write can invalidate the layout it read (D40).
   */
  function measure() {
    measured = true
    const band = desktopBand()
    if (band === null || band.platform !== 'win32') {
      reading = null
      return
    }
    const row = titleRow()
    if (row === null) {
      reading = null
      return
    }
    const header = closestConversationHeader(row)
    const title = conversationHeaderTitle(row)
    const trail = row.querySelector<HTMLElement>(HEADER_ACTIONS_SELECTOR)
    const { utilities, corner } = conversationHeaderTools(row)
    const menuBox = rect(findWindowsMenu())
    const more = conversationHeaderMore(utilities)
    const moreBox = rect(more)
    const titleBox = rect(title)
    const trailBox = rect(trail)
    // The cluster's need is measured while nothing of ours caps it, which is the
    // one state its box answers the question: a capped cluster measures at the
    // cap (D9). The pass writes no limit on the cluster, so this re-read never
    // follows a limit of its own writing.
    if (trail !== null && trailBox !== null && trail.style.getPropertyValue(TITLE_MAX) === '') clusterNeed = trailBox.width
    reading = {
      band: pageBand(band),
      width: pageWidth(),
      row,
      header,
      title,
      trail,
      utilities,
      corner,
      rowBox: rect(row),
      headerBox: rect(header),
      menuRight: menuBox === null ? null : menuBox.right,
      more,
      moreSize: { present: moreBox !== null, width: moreBox === null ? 0 : moreBox.width },
      utilitiesBox: rect(utilities),
      cornerBox: rect(corner),
      titleBox,
      trailBox,
      // The host draws the crumb ellipsized inside the width this pass last
      // wrote, so the box is that width; what the words take is the scrollable
      // content, which a cap does not change.
      titleNatural: title === null ? 0 : Math.max(titleBox === null ? 0 : titleBox.width, title.scrollWidth),
      trailNeed: clusterNeed === null ? 0 : clusterNeed,
    }
  }

  function sync() {
    if (!measured) measure()
    measured = false
    const current = reading
    if (current === null) {
      watch(null, null)
      clear()
      return
    }
    const { band, row, title, utilities, corner } = current
    watch(row, title)
    const rowBox = current.rowBox
    if (rowBox === null) {
      clear()
      return
    }
    // The header's own top edge decides the row's rise; where its box was not
    // read, the row's unraised top is the edge the inset starts from.
    const applied = parseFloat(row.style.getPropertyValue(ROW_LIFT))
    const headerTop = current.headerBox === null ? rowBox.top - (isFinite(applied) ? applied : 0) : current.headerBox.top
    const placement = placeCaptionRow({
      width: current.width,
      bandHeight: band.height,
      controls: band.controls.size,
      rowLeft: rowBox.left,
      menuRight: current.menuRight,
      menu: current.moreSize,
      title: { present: title !== null, width: current.titleBox === null ? 0 : current.titleBox.width, natural: current.titleNatural },
      trail: { present: current.trail !== null, width: current.trailBox === null ? 0 : current.trailBox.width, need: current.trailNeed },
      utilities: { present: current.utilitiesBox !== null, width: current.utilitiesBox === null ? 0 : current.utilitiesBox.width },
      corner: { present: current.cornerBox !== null, width: current.cornerBox === null ? 0 : current.cornerBox.width },
      tabsWidth: ui.viewTabs?.widthFor(current.header) ?? 0,
      headerTop,
      titleHeight: current.titleBox === null ? 0 : current.titleBox.height,
      ...(lastLift === null ? {} : { previous: lastLift }),
    })
    lastLift = placement.lift
    const liftTitle = placement.lift.title
    const liftActions = placement.lift.actions
    rowStamp.mark(liftTitle ? row : null)
    // The rise is written on every pass that lifts the title and taken off every
    // pass that hands it back: the stylesheet draws no raise for a row without the
    // stamp, and a value left on the element would outlive the placement and stand
    // in for a raise the next reading has to take back out.
    if (liftTitle) setVar(row, ROW_LIFT, `${-placement.rowLift}px`)
    else if (row.style.getPropertyValue(ROW_LIFT) !== '') row.style.removeProperty(ROW_LIFT)
    // The header closes to the row it no longer shares with the title: its top
    // inset becomes the air between its own edge and that row, so the height the
    // title held is not left standing empty above the conversation. A header
    // whose box was not read takes the inset the pass decided from the row, the
    // stylesheet's fallback standing only until the pass writes it.
    if (placement.title !== null && current.header !== null) {
      setVar(current.header, ROW_TOP, `${placement.headerInset}px`)
    } else if (current.header !== null) {
      current.header.style.removeProperty(ROW_TOP)
    }
    titleStamp.mark(placement.title === null ? null : title)
    if (placement.title !== null && title !== null) {
      setVar(title, TITLE_LEFT, `${placement.title.left}px`)
      // The title's room runs up to the cluster standing beside it, and no
      // further; without one it is the row's whole run.
      setVar(title, TITLE_MAX, `${placement.title.max}px`)
      setVar(title, TITLE_TOP, `${placement.title.top}px`)
    }
    // The trigger is fixed out of the utilities cluster, which closes the gap
    // it leaves; the host's menu anchors from the trigger's own box, so the
    // panel opens beside the title. Handing the title back lets its own anchor
    // place the trigger in the conversation header again (D43).
    const more = current.more
    moreStamp.mark(placement.menuLeft === null ? null : more)
    if (placement.menuLeft !== null && more !== null) {
      setVar(more, TITLE_LEFT, `${placement.menuLeft}px`)
      setVar(more, TITLE_TOP, `${placement.title?.top ?? band.height / 2}px`)
    }
    const trail = current.trail
    trailStamp.mark(placement.trail === null ? null : trail)
    if (placement.trail !== null && trail !== null) {
      setVar(trail, TITLE_LEFT, `${placement.trail.left}px`)
      setVar(trail, TITLE_TOP, `${placement.trail.top}px`)
      // A limit this element still carries from an earlier placement would be
      // measured as its width and squeeze the chips it holds.
      if (trail.style.getPropertyValue(TITLE_MAX) !== '') trail.style.removeProperty(TITLE_MAX)
    }
    actionsStamp.mark(placement.utilitiesRight === null ? null : utilities)
    cornerStamp.mark(placement.cornerRight === null ? null : corner)
    if (placement.utilitiesRight !== null && utilities !== null) setVar(utilities, ACTIONS_RIGHT, `${placement.utilitiesRight}px`)
    if (placement.cornerRight !== null && corner !== null) setVar(corner, ACTIONS_RIGHT, `${placement.cornerRight}px`)
    // The tokens ride the header itself: they change on every page the row
    // appears on or leaves, and a body write would invalidate the whole
    // document each time (D9). Every stamped piece sits under the header.
    const tokens = [liftTitle ? TITLE_TOKEN : '', liftActions ? ACTIONS_TOKEN : '', placement.tabsRight === null ? '' : 'tabs'].filter(Boolean).join(' ')
    const header = current.header
    if (tokens === '' || header === null) {
      releaseBand()
    } else {
      if (bandHost !== header) releaseBand()
      bandHost = header
      setVar(header, BAND_HEIGHT, `${band.height}px`)
      if (placement.tabsRight === null) header.style.removeProperty(TABS_RIGHT)
      else setVar(header, TABS_RIGHT, `${placement.tabsRight}px`)
      setAttributeIfChanged(header, BAND_ATTR, tokens)
    }
  }

  // The row it reads lives in the conversation header, never inside the column
  // a streaming batch touches, so such a batch skips this pass (D40). The boxes
  // are read in the pass's read phase and written in its write phase.
  ui.headerBand = { measure, sync, skipOnContentOnly: true }
  const overlay = navigator.windowControlsOverlay
  const scheduleGeometry = () => ui.schedule?.()
  overlay?.addEventListener('geometrychange', scheduleGeometry)
  // The slot entry is this generation's: the fiber is what takes it back when
  // the reader switches the band off, or another owner hands the page over.
  const closeButtonSlot = registerRightbarClose()

  return () => {
    overlay?.removeEventListener('geometrychange', scheduleGeometry)
    const row = rowStamp.current()
    const title = titleStamp.current()
    const more = moreStamp.current()
    const trail = trailStamp.current()
    const utilities = actionsStamp.current()
    const corner = cornerStamp.current()
    if (row !== null) row.style.removeProperty(ROW_LIFT)
    if (title !== null) {
      title.style.removeProperty(TITLE_LEFT)
      title.style.removeProperty(TITLE_MAX)
      title.style.removeProperty(TITLE_TOP)
    }
    if (more !== null) {
      more.style.removeProperty(TITLE_LEFT)
      more.style.removeProperty(TITLE_TOP)
    }
    if (trail !== null) {
      trail.style.removeProperty(TITLE_LEFT)
      trail.style.removeProperty(TITLE_MAX)
      trail.style.removeProperty(TITLE_TOP)
    }
    if (utilities !== null) utilities.style.removeProperty(ACTIONS_RIGHT)
    if (corner !== null) corner.style.removeProperty(ACTIONS_RIGHT)
    clear()
    watch(null, null)
    titleRows.release()
    stopRightbarOpen()
    rightbarPanels.release()
    rightbarFrames.release()
    rightbarOpenStamp.release()
    if (closeButtonSlot !== null) closeButtonSlot.dispose()
    keptRow = null
    delete ui.headerBand
  }
}
