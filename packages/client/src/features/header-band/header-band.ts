import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import {
  CONVERSATION_HEADER_SELECTOR,
  HEADER_ACTIONS_SELECTOR,
  HEADER_CORNER_SELECTOR,
  HEADER_TITLE_ROW_SELECTOR,
  HEADER_TITLE_SELECTOR,
  HEADER_UTILITIES_SELECTOR,
  VIEW_TABS_STRIP_SELECTOR,
} from '@dsh-claude-style/contracts/dom'
import { observeMatches, observeSize } from '@dsh-claude-style/engine/bus'
import { desktopBand } from '@dsh-claude-style/engine/desktop-band'
import { findRightbarToggle, findWindowsMenu, registerSlotEntries } from '@dsh-claude-style/engine/host'
import { createStamp, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { contentBox } from '../../shared/content-box'
import { inPageBox, inPagePixels } from '../../shared/page-zoom'
import type { FeatureUi } from '../../core/feature'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type manifest from './header-band.manifest'
import { copy } from './copy'

/**
 * The conversation header's title row, lifted into the desktop caption row.
 *
 * On Windows the shell's caption row is the one place a session title can sit
 * above every column. The pieces lifted here belong to the host, so they are
 * stamped and placed with `position: fixed`, never moved between parents. A
 * side whose measured room is too small writes nothing and stays in the row,
 * which is the stylesheet's base rule, so a failed placement needs no undoing.
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
 * and presses the host's own (syncRightbarClose).
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
  /** The two control clusters' stamps, and the right offset both rules read. */
  const ACTIONS_ATTR = 'data-dsh-header-actions'
  const CORNER_ATTR = 'data-dsh-header-corner'
  const ACTIONS_RIGHT = '--dsh-header-band-right'
  /**
   * The view-tab strip's own stamp and the centre its rule reads: view-tabs
   * places the strip at the window's centre, which stops reading as the middle
   * of the row once the title and the controls stand on either side of it.
   */
  const TABS_ATTR = 'data-dsh-header-band-tabs'
  const TABS_LEFT = '--dsh-header-band-tabs-left'
  /** The two tokens the body marker carries. */
  const TITLE_TOKEN = 'title'
  const ACTIONS_TOKEN = 'actions'
  /** The air between anything placed here and its neighbour. */
  const GAP = 8
  /** What the row keeps clear at its left end when the shell mounts no menu seat: the sidebar's control. */
  const FURNITURE = 48
  /** Below this a lifted title would be a stub: it stays in the row instead. */
  const MIN_TITLE = 120
  /** The host's seat in the header's own row that the header utilities land in. */
  const UTILITIES_SLOT = 'conversation.session.header.utilities'
  /** The skin's own control there, which the stylesheet paints and the pass shows. */
  const CLOSE_CLASS = 'dsh-claude-rightbar-close'

  const rowStamp = createStamp<HTMLElement>(ROW_ATTR)
  const titleStamp = createStamp<HTMLElement>(TITLE_ATTR)
  const trailStamp = createStamp<HTMLElement>(TRAIL_ATTR)
  const actionsStamp = createStamp<HTMLElement>(ACTIONS_ATTR)
  const cornerStamp = createStamp<HTMLElement>(CORNER_ATTR)
  const tabsStamp = createStamp<HTMLElement>(TABS_ATTR)
  /** The row whose size the pass follows. */
  let watched: HTMLElement | null = null
  /** Stops watching it. */
  let stopSize: (() => void) | null = null
  /** Every candidate title row, kept current by the bus (D40), and the one this pass took. */
  const titleRows = observeMatches<HTMLElement>(HEADER_TITLE_ROW_SELECTOR)
  let keptRow: HTMLElement | null = null
  /** The header carrying BAND_ATTR right now, or null. */
  let bandHost: HTMLElement | null = null
  /** Every control the skin registered for the right panel, kept current by the bus (D40). */
  const closeButtons = observeMatches<HTMLElement>(`.${CLOSE_CLASS}`)

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

  /**
   * Show the skin's control wherever the panel is open. Its `display` is written
   * on the node rather than by a rule: the host's control exists only while the
   * panel does, and a rule keyed on that state would be a marker no page outside
   * the desktop carries.
   */
  function syncRightbarClose() {
    const host = findRightbarToggle()
    for (const button of closeButtons.all()) {
      const wanted = host === null ? 'none' : 'inline-flex'
      if (button.style.display !== wanted) button.style.display = wanted
    }
  }

  /** Register that control in the header's utilities seat, which renders it wherever it stands. */
  function registerRightbarClose() {
    registerSlotEntries(ctx, [{
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
    return row.querySelector(HEADER_TITLE_SELECTOR) !== null || row.querySelector(HEADER_UTILITIES_SELECTOR) !== null
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
    rowStamp.release()
    titleStamp.release()
    trailStamp.release()
    actionsStamp.release()
    cornerStamp.release()
    tabsStamp.release()
    placedInBand = null
    if (bandHost !== null) {
      bandHost.removeAttribute(BAND_ATTR)
      bandHost.style.removeProperty(ROW_TOP)
      bandHost.style.removeProperty(BAND_HEIGHT)
      bandHost = null
    }
  }

  /**
   * Follow the row's own box. The sidebar's collapse is an animation of the
   * column's width with no mutation under it, and a placement written once
   * would trail the column the whole way; a resize report asks for a pass in
   * the same frame, and the pass writes the same numbers, so it stops there.
   */
  function watch(row: HTMLElement | null) {
    if (row === watched) return
    if (stopSize !== null) stopSize()
    stopSize = null
    watched = row
    if (row !== null) stopSize = observeSize(row, () => { ui.schedule?.() })
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
    stripEl: HTMLElement | null
    rowBox: DOMRect | null
    headerBox: DOMRect | null
    stripBox: DOMRect | null
    menuBox: DOMRect | null
    utilitiesBox: DOMRect | null
    cornerBox: DOMRect | null
    titleBox: DOMRect | null
    trailBox: DOMRect | null
  }

  /** The reading this pass places against, and whether `measure` took it for this pass. */
  let reading: BandReading | null = null
  let measured = false
  /** Which pieces the last pass lifted, so a lift can ask for one more pass to settle against it. */
  let placedInBand: { title: boolean, trail: boolean } | null = null

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
    const header = row.closest<HTMLElement>(CONVERSATION_HEADER_SELECTOR)
    const title = row.querySelector<HTMLElement>(HEADER_TITLE_SELECTOR)
    const trail = row.querySelector<HTMLElement>(HEADER_ACTIONS_SELECTOR)
    const utilities = row.querySelector<HTMLElement>(HEADER_UTILITIES_SELECTOR)
    const corner = row.querySelector<HTMLElement>(HEADER_CORNER_SELECTOR)
    const stripEl = header === null ? null : header.querySelector<HTMLElement>(VIEW_TABS_STRIP_SELECTOR)
    reading = {
      band: pageBand(band),
      width: pageWidth(),
      row,
      header,
      title,
      trail,
      utilities,
      corner,
      stripEl,
      rowBox: rect(row),
      headerBox: rect(header),
      // The plate and overflow button standing in the strip's row
      // (shared/content-box.ts): the row spans the header, so its own box would
      // reserve the window for the tabs.
      stripBox: stripEl === null ? null : contentBox(stripEl),
      menuBox: rect(findWindowsMenu()),
      utilitiesBox: rect(utilities),
      cornerBox: rect(corner),
      titleBox: rect(title),
      trailBox: rect(trail),
    }
  }

  function sync() {
    if (!measured) measure()
    measured = false
    // The right panel's control is placed on every page, not only where the
    // caption row exists: whether it shows is the panel's own state.
    syncRightbarClose()
    const current = reading
    if (current === null) {
      watch(null)
      clear()
      return
    }
    const { band, row, title, utilities, corner } = current
    watch(row)
    const rowBox = current.rowBox
    if (rowBox === null) {
      clear()
      return
    }
    // Only a strip the view-tabs feature has already lifted shares the caption
    // row; one still drawn in the header's own row takes nothing from it. Its
    // room is read off the width rather than the box: view-tabs centres it on
    // the window, this pass then moves it, and a fit decided against the moved
    // box would answer differently on the next pass. The box is the strip's
    // content (the plate and the overflow button), because the row the host
    // draws them in spans the header (shared/content-box.ts).
    const stripEl = current.stripEl
    const stripBox = current.stripBox
    const inBand = stripBox !== null && stripBox.top < band.height
    const stripWidth = stripBox === null || !inBand ? 0 : stripBox.width
    const stripRight = stripWidth === 0 ? 0 : current.width / 2 + stripWidth / 2
    // The shell's own menu seat takes the row's left end, and the collapsed
    // sidebar's control sits left of it whether the seat is mounted or not.
    const menuBox = current.menuBox
    const furniture = menuBox === null ? FURNITURE : Math.max(FURNITURE, menuBox.right)
    // Either cluster can be missing: the corner seat is empty while the right
    // sidebar is open, whose own chrome carries those controls. The cluster
    // that is there still belongs in the caption row, and a missing one leaves
    // no air behind.
    const utilitiesBox = current.utilitiesBox
    const cornerBox = current.cornerBox
    const utilitiesWidth = utilitiesBox === null ? 0 : utilitiesBox.width
    const cornerWidth = cornerBox === null ? 0 : cornerBox.width
    const clusterWidth = utilitiesWidth + cornerWidth + (utilitiesBox === null || cornerBox === null ? 0 : GAP)
    // The caption buttons' reserve, and the air this skin keeps off it. The
    // width is the one fixed boxes are placed in: the document's client width
    // leaves out a page scrollbar, which `innerWidth` counts.
    const edge = current.width - band.controls.size - GAP
    const cornerRight = band.controls.size + GAP
    // The controls hang off the right edge, so whether they fit does not
    // depend on the title; the title then takes what is left of the row's
    // left end, up to the first thing in its way.
    const liftActions = clusterWidth > 0 &&
      edge - clusterWidth >= Math.max(furniture, stripRight) + GAP
    const left = Math.max(rowBox.left, furniture + GAP)
    // Where the row's right-hand content ends: the controls when they are lifted,
    // the caption buttons when they stayed in the row.
    const rightStop = liftActions ? edge - clusterWidth : current.width - band.controls.size
    // The title's room runs up to that end, less the strip's own width and the
    // air on both sides of it: the strip is centred in what is left between the
    // two, so its width is reserved here rather than read off a position it is
    // about to leave.
    const room = rightStop - GAP - (inBand ? stripWidth + GAP : 0) - left
    const titleBox = current.titleBox
    const liftTitle = title !== null && room >= MIN_TITLE
    // The cluster the host keeps beside the title — the preset picker and the
    // chips the session mounts there — takes the caption row's next place, and
    // its own width comes off the title's room. The title's box is not that
    // limit: the host draws the crumb ellipsized inside the width this pass last
    // wrote, so a name that grew back would stay clipped at the old name's size.
    const trail = current.trail
    const trailBox = current.trailBox
    const trailWidth = trailBox === null ? 0 : trailBox.width
    const titleRoom = room - trailWidth - GAP
    // A window too narrow for both keeps the cluster in the row the host drew it
    // in, which then keeps the height it takes there: the title keeps its own
    // width rather than shrinking to the stub beside the cluster. The pass writes
    // no width limit on the cluster, so the width this fit is judged by is the
    // one the cluster needs: a capped cluster measures at the cap, and one that
    // outgrew its place would keep passing the test and be crushed there instead
    // of returning to the row (D9).
    const liftTrail = liftTitle && trail !== null && trailBox !== null && titleRoom >= MIN_TITLE
    const trailLeft = left + (titleBox === null ? 0 : titleBox.width) + GAP
    // The row the title leaves holds only controls, and the host's inset for a
    // row that still carried a title would leave them floating below the caption
    // row. It starts at the title box's lower edge; the target is computed rather
    // than read because the title has not been lifted on this pass. Where the
    // offset already applied is taken back out, or the pass would read the raised
    // row as needing no rise.
    const titleHeight = titleBox === null ? 0 : titleBox.height
    const titleCentre = band.height / 2
    const applied = parseFloat(row.style.getPropertyValue(ROW_LIFT))
    /** Where the row's top belongs: the lower edge of the title's centred box. */
    const rowTop = titleCentre + titleHeight / 2
    const rise = !liftTitle ? 0 : Math.max(0, Math.round(rowBox.top - (isFinite(applied) ? applied : 0) - rowTop))
    // A lift, or a title whose room changed, leaves the cluster beside it placed
    // against the width the title no longer has. One more pass reads the width
    // this one writes, and a pass that changes nothing ends it (D40).
    let settle = placedInBand !== null && (placedInBand.title !== liftTitle || placedInBand.trail !== liftTrail)

    rowStamp.mark(liftTitle ? row : null)
    if (liftTitle) setVar(row, ROW_LIFT, `${-rise}px`)
    // The header closes to the row it no longer shares with the title: its top
    // inset becomes the air between its own edge and that row, so the height the
    // title held is not left standing empty above the conversation. A header
    // whose box was not read keeps the host's inset, the stylesheet's fallback.
    if (liftTitle && current.header !== null && current.headerBox !== null) {
      setVar(current.header, ROW_TOP, `${Math.max(0, Math.round(rowTop - current.headerBox.top))}px`)
    } else if (current.header !== null) {
      current.header.style.removeProperty(ROW_TOP)
    }
    titleStamp.mark(liftTitle ? title : null)
    if (liftTitle && title !== null) {
      setVar(title, TITLE_LEFT, `${Math.round(left)}px`)
      // The title's room runs up to the cluster standing beside it, and no
      // further; without one it is the row's whole run.
      if (setVar(title, TITLE_MAX, `${Math.round(liftTrail ? titleRoom : room)}px`) && liftTrail) settle = true
      setVar(title, TITLE_TOP, `${Math.round(titleCentre)}px`)
    }
    trailStamp.mark(liftTrail ? trail : null)
    if (liftTrail && trail !== null) {
      setVar(trail, TITLE_LEFT, `${Math.round(trailLeft)}px`)
      setVar(trail, TITLE_TOP, `${Math.round(titleCentre)}px`)
      // A limit this element still carries from an earlier placement would be
      // measured as its width and squeeze the chips it holds.
      if (trail.style.getPropertyValue(TITLE_MAX) !== '') trail.style.removeProperty(TITLE_MAX)
    }
    actionsStamp.mark(liftActions && utilitiesBox !== null ? utilities : null)
    cornerStamp.mark(liftActions && cornerBox !== null ? corner : null)
    if (liftActions) {
      const utilitiesRight = cornerRight + (cornerBox === null ? 0 : cornerWidth + GAP)
      if (utilities !== null && utilitiesBox !== null) setVar(utilities, ACTIONS_RIGHT, `${Math.round(utilitiesRight)}px`)
      if (corner !== null && cornerBox !== null) setVar(corner, ACTIONS_RIGHT, `${Math.round(cornerRight)}px`)
    }
    // view-tabs centres the strip on the window; with the title and the controls
    // standing on either side of it that stops reading as the middle of the row,
    // so it takes the middle of what is left between them — or between the
    // shell's own left end and the caption buttons when a side stayed in the row.
    const stripInBand = inBand && stripEl !== null
    if (stripInBand && stripEl !== null) {
      // The left-hand content ends where the cluster beside the title ends: the
      // title's own width is the one this pass is about to write, not the width
      // it still holds.
      const leftStop = liftTrail && trailBox !== null
        ? left + Math.min(titleBox === null ? 0 : titleBox.width, titleRoom) + GAP + trailWidth
        : liftTitle && titleBox !== null ? left + titleBox.width : furniture
      setVar(stripEl, TABS_LEFT, `${Math.round((leftStop + rightStop) / 2)}px`)
    }
    tabsStamp.mark(stripInBand ? stripEl : null)

    // The tokens ride the header itself: they change on every page the row
    // appears on or leaves, and a body write would invalidate the whole
    // document each time (D9). Every stamped piece sits under the header.
    const tokens = `${liftTitle ? TITLE_TOKEN : ''} ${liftActions ? ACTIONS_TOKEN : ''}`.trim()
    const header = current.header
    if (tokens === '' || header === null) {
      if (bandHost !== null) {
        bandHost.removeAttribute(BAND_ATTR)
        bandHost.style.removeProperty(ROW_TOP)
        bandHost.style.removeProperty(BAND_HEIGHT)
        bandHost = null
      }
    } else {
      if (bandHost !== null && bandHost !== header) {
        bandHost.removeAttribute(BAND_ATTR)
        bandHost.style.removeProperty(ROW_TOP)
        bandHost.style.removeProperty(BAND_HEIGHT)
      }
      bandHost = header
      setVar(header, BAND_HEIGHT, `${band.height}px`)
      setAttributeIfChanged(header, BAND_ATTR, tokens)
    }
    // A lift changes the width the other piece may keep: the title is measured
    // where it stood before this pass, so the cluster beside it is placed against
    // the room it is about to lose or gain. One more pass places it against what
    // this one wrote, and settles there; a pass that lifts nothing new ends it.
    if (settle) ui.schedule?.()
    placedInBand = { title: liftTitle, trail: liftTrail }
  }

  // The row it reads lives in the conversation header, never inside the column
  // a streaming batch touches, so such a batch skips this pass (D40). The boxes
  // are read in the pass's read phase and written in its write phase.
  ui.headerBand = { measure, sync, skipOnContentOnly: true }
  registerRightbarClose()

  return () => {
    const row = rowStamp.current()
    const title = titleStamp.current()
    const trail = trailStamp.current()
    const utilities = actionsStamp.current()
    const corner = cornerStamp.current()
    const strip = tabsStamp.current()
    if (row !== null) row.style.removeProperty(ROW_LIFT)
    if (title !== null) {
      title.style.removeProperty(TITLE_LEFT)
      title.style.removeProperty(TITLE_MAX)
      title.style.removeProperty(TITLE_TOP)
    }
    if (trail !== null) {
      trail.style.removeProperty(TITLE_LEFT)
      trail.style.removeProperty(TITLE_MAX)
      trail.style.removeProperty(TITLE_TOP)
    }
    if (utilities !== null) utilities.style.removeProperty(ACTIONS_RIGHT)
    if (corner !== null) corner.style.removeProperty(ACTIONS_RIGHT)
    if (strip !== null) strip.style.removeProperty(TABS_LEFT)
    clear()
    watch(null)
    titleRows.release()
    closeButtons.release()
    keptRow = null
    delete ui.headerBand
  }
}
