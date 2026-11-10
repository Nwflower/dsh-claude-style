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
  /** The cluster's needed width, measured while nothing capped it (D9). */
  let clusterNeed: number | null = null
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
    const header = row.closest<HTMLElement>(CONVERSATION_HEADER_SELECTOR)
    const title = row.querySelector<HTMLElement>(HEADER_TITLE_SELECTOR)
    const trail = row.querySelector<HTMLElement>(HEADER_ACTIONS_SELECTOR)
    const utilities = row.querySelector<HTMLElement>(HEADER_UTILITIES_SELECTOR)
    const corner = row.querySelector<HTMLElement>(HEADER_CORNER_SELECTOR)
    const stripEl = header === null ? null : header.querySelector<HTMLElement>(VIEW_TABS_STRIP_SELECTOR)
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
    // row; one still drawn in the header's own row takes nothing from it. The box
    // is the strip's content (the plate and the overflow button), because the row
    // the host draws them in spans the header (shared/content-box.ts).
    const stripEl = current.stripEl
    const stripBox = current.stripBox
    const inBand = stripBox !== null && stripBox.top < band.height
    const stripWidth = stripBox === null || !inBand ? 0 : stripBox.width
    // Where the row's lift already applied is taken back out, or the pass would
    // read the raised row as needing no rise.
    const applied = parseFloat(row.style.getPropertyValue(ROW_LIFT))
    const placement = placeCaptionRow({
      width: current.width,
      bandHeight: band.height,
      controls: band.controls.size,
      rowLeft: rowBox.left,
      menuRight: current.menuBox === null ? null : current.menuBox.right,
      strip: { width: stripWidth, inBand },
      title: { present: title !== null, width: current.titleBox === null ? 0 : current.titleBox.width, natural: current.titleNatural },
      trail: { present: current.trail !== null, width: current.trailBox === null ? 0 : current.trailBox.width, need: current.trailNeed },
      utilities: { present: current.utilitiesBox !== null, width: current.utilitiesBox === null ? 0 : current.utilitiesBox.width },
      corner: { present: current.cornerBox !== null, width: current.cornerBox === null ? 0 : current.cornerBox.width },
      row: { top: rowBox.top, applied: isFinite(applied) ? applied : 0 },
      titleHeight: current.titleBox === null ? 0 : current.titleBox.height,
    })
    const liftTitle = placement.lift.title
    const liftActions = placement.lift.actions
    rowStamp.mark(liftTitle ? row : null)
    if (liftTitle) setVar(row, ROW_LIFT, `${-placement.rowLift}px`)
    // The header closes to the row it no longer shares with the title: its top
    // inset becomes the air between its own edge and that row, so the height the
    // title held is not left standing empty above the conversation. A header
    // whose box was not read keeps the host's inset, the stylesheet's fallback.
    if (placement.title !== null && current.header !== null && current.headerBox !== null) {
      setVar(current.header, ROW_TOP, `${Math.max(0, Math.round(placement.rowTop - current.headerBox.top))}px`)
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
    // view-tabs centres the strip on the window; with the title and the controls
    // standing on either side of it that stops reading as the middle of the row,
    // so it takes the middle of what is left between them — or between the
    // shell's own left end and the caption buttons when a side stayed in the row.
    const stripInBand = inBand && stripEl !== null
    if (stripInBand && stripEl !== null && placement.stripLeft !== null) setVar(stripEl, TABS_LEFT, `${placement.stripLeft}px`)
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
  }

  // The row it reads lives in the conversation header, never inside the column
  // a streaming batch touches, so such a batch skips this pass (D40). The boxes
  // are read in the pass's read phase and written in its write phase.
  ui.headerBand = { measure, sync, skipOnContentOnly: true }
  // The slot entry is this generation's: the fiber is what takes it back when
  // the reader switches the band off, or another owner hands the page over.
  const closeButtonSlot = registerRightbarClose()

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
    if (closeButtonSlot !== null) closeButtonSlot.dispose()
    keptRow = null
    delete ui.headerBand
  }
}
