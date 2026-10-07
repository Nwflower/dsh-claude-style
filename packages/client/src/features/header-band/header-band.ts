import {
  CONVERSATION_HEADER_SELECTOR,
  HEADER_CORNER_SELECTOR,
  HEADER_TITLE_ROW_SELECTOR,
  HEADER_TITLE_SELECTOR,
  HEADER_UTILITIES_SELECTOR,
  VIEW_TABS_STRIP_SELECTOR,
  WINDOWS_MENU_SELECTOR,
} from '@dsh-claude-style/contracts/dom'
import { observeSize } from '../../core/bus'
import { desktopBand } from '../../core/desktop-band'
import { createStamp, setAttributeIfChanged } from '../../shared/dom'
import type { FeatureUi } from '../../core/feature'
import type { HostContext } from '../../core/host'
import type manifest from './header-band.manifest'

/**
 * The conversation header's title row, lifted into the desktop caption row.
 *
 * The Windows shell hands the window's top 40px to a caption row and lets the
 * columns run up under it (D31), so that row is the one place a session title
 * can sit above everything else — the row the collapsed sidebar's own button
 * and the view-tab strip (view-tabs.css) already use. Everything lifted here
 * belongs to the host, so nothing is moved between parents: each piece is
 * stamped and placed with `position: fixed`, and the row it leaves reflows on
 * its own — the title cluster keeps the preset picker, which closes up to the
 * row's left edge (D52).
 *
 * Both placements are measured, never assumed: the caption buttons' reserve
 * comes from desktopBand (D28), the row's own inset from the title row, and
 * the strip's box from wherever view-tabs put it. A side whose room is too
 * small stays in the row, which is the stylesheets' base rule — a placement
 * that does not fit writes nothing, so the fallback needs no restoring. The
 * title and the controls are decided apart, because a window wide enough for
 * one of them is often too narrow for the other, and either cluster may be
 * missing (the corner seat is empty while the right sidebar is open, whose own
 * chrome carries those controls) without the other losing its place.
 *
 * The row the title leaves rises: with the words gone it holds only controls,
 * and the inset the host gives a row that also carried a title would leave
 * them floating a title's height below the caption row.
 *
 * macOS is left alone: its shell pads no content and the header already draws
 * its first line inside the traffic-light strip, so there is nothing to lift.
 *
 * The marks: `data-dsh-header-band` on <body> carries which parts left the row
 * (`title`, `actions`, or both) and header-band.css keys every rule on it; the
 * three element stamps keep the stylesheet free of host class names.
 *
 * @param ctx - client context.
 * @param ui - shared handle table.
 * @returns teardown.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /** The body marker: which parts of the row the caption row holds, as a token list. */
  const BAND_ATTR = 'data-dsh-header-band'
  /** The title's stamp, and the numbers its rule reads. */
  const TITLE_ATTR = 'data-dsh-header-title'
  const TITLE_LEFT = '--dsh-header-band-left'
  const TITLE_MAX = '--dsh-header-band-max'
  const TITLE_TOP = '--dsh-header-band-title-top'
  /**
   * How far below the caption row's middle the title sits: its text draws 20px
   * in a 28px box, so a box centred on the row leaves the line reading high
   * against the controls beside it.
   */
  const TITLE_NUDGE = 2
  /**
   * The row's own stamp and the negative top margin its rule reads: with the
   * title gone the row holds only the controls, and the host's top inset for a
   * row that also carried a title leaves it too low.
   */
  const ROW_ATTR = 'data-dsh-header-row'
  const ROW_LIFT = '--dsh-header-band-row-lift'
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
  /**
   * How far the row the title left tucks into the title's own box. The title
   * draws 20px of text in a 28px box (ink ending 5px above the box), and a
   * chip's text starts about 7px below the row's top, so this is what leaves
   * about 10px of air between the two lines of text.
   */
  const ROW_TUCK = 2
  /** What the row keeps clear when the shell mounts no menu seat: the sidebar's own control. */
  const FURNITURE = 48
  /** Below this a lifted title would be a stub: it stays in the row instead. */
  const MIN_TITLE = 120

  const rowStamp = createStamp<HTMLElement>(ROW_ATTR)
  const titleStamp = createStamp<HTMLElement>(TITLE_ATTR)
  const actionsStamp = createStamp<HTMLElement>(ACTIONS_ATTR)
  const cornerStamp = createStamp<HTMLElement>(CORNER_ATTR)
  const tabsStamp = createStamp<HTMLElement>(TABS_ATTR)
  /** The row whose size the pass follows. */
  let watched: HTMLElement | null = null
  /** Stops watching it. */
  let stopSize: (() => void) | null = null

  /**
   * The header's title row: the one carrying a title or the utilities. The
   * bare substring also names rows inside the sidebar's panels, and a pass
   * that took one of those would lift nothing all session.
   */
  function titleRow() {
    for (const row of document.querySelectorAll<HTMLElement>(HEADER_TITLE_ROW_SELECTOR)) {
      if (row.querySelector(HEADER_TITLE_SELECTOR) !== null) return row
      if (row.querySelector(HEADER_UTILITIES_SELECTOR) !== null) return row
    }
    return null
  }

  function rect(element: Element | null) {
    if (element === null) return null
    const box = element.getBoundingClientRect()
    return box.width === 0 && box.height === 0 ? null : box
  }

  /** Write one placement number, and nothing when it is already the one there. */
  function setVar(element: HTMLElement, name: string, value: string) {
    if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value)
  }

  /** Hand the row back: no placement, no marks. */
  function clear() {
    rowStamp.release()
    titleStamp.release()
    actionsStamp.release()
    cornerStamp.release()
    tabsStamp.release()
    document.body.removeAttribute(BAND_ATTR)
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

  function sync() {
    const band = desktopBand()
    const row = band === null || band.platform !== 'win32' ? null : titleRow()
    if (band === null || band.platform !== 'win32' || row === null) {
      watch(null)
      clear()
      return
    }
    watch(row)
    const rowBox = rect(row)
    if (rowBox === null) {
      clear()
      return
    }
    const header = row.closest(CONVERSATION_HEADER_SELECTOR)
    const title = row.querySelector<HTMLElement>(HEADER_TITLE_SELECTOR)
    const utilities = row.querySelector<HTMLElement>(HEADER_UTILITIES_SELECTOR)
    const corner = row.querySelector<HTMLElement>(HEADER_CORNER_SELECTOR)
    // Only a strip the view-tabs feature has already lifted shares the caption
    // row; one still drawn in the header's own row takes nothing from it. Its
    // room is read off the width rather than the box: view-tabs centres it on
    // the window, this pass then moves it, and a fit decided against the moved
    // box would answer differently on the next pass.
    const stripEl = header === null ? null : header.querySelector<HTMLElement>(VIEW_TABS_STRIP_SELECTOR)
    const stripBox = rect(stripEl)
    const inBand = stripBox !== null && stripBox.top < band.height
    const stripWidth = stripBox === null || !inBand ? 0 : stripBox.width
    const stripRight = stripWidth === 0 ? 0 : document.documentElement.clientWidth / 2 + stripWidth / 2
    // The shell's own menu seat takes the row's left end, and the collapsed
    // sidebar's control sits left of it whether the seat is mounted or not.
    const menuBox = rect(document.querySelector(WINDOWS_MENU_SELECTOR))
    const furniture = menuBox === null ? FURNITURE : Math.max(FURNITURE, menuBox.right)
    // Either cluster can be missing: the corner seat is empty while the right
    // sidebar is open, whose own chrome carries those controls. The cluster
    // that is there still belongs in the caption row, and a missing one leaves
    // no air behind.
    const utilitiesBox = rect(utilities)
    const cornerBox = rect(corner)
    const utilitiesWidth = utilitiesBox === null ? 0 : utilitiesBox.width
    const cornerWidth = cornerBox === null ? 0 : cornerBox.width
    const clusterWidth = utilitiesWidth + cornerWidth + (utilitiesBox === null || cornerBox === null ? 0 : GAP)
    // The caption buttons' reserve, and the air this skin keeps off it. The
    // width is the one fixed boxes are placed in: the document's client width
    // leaves out a page scrollbar, which `innerWidth` counts.
    const edge = document.documentElement.clientWidth - band.controls.size - GAP
    const cornerRight = band.controls.size + GAP
    // The controls hang off the right edge, so whether they fit does not
    // depend on the title; the title then takes what is left of the row's
    // left end, up to the first thing in its way.
    const liftActions = clusterWidth > 0 &&
      edge - clusterWidth >= Math.max(furniture, stripRight) + GAP
    const left = Math.max(rowBox.left, furniture + GAP)
    // Where the row's right-hand content ends: the controls when they are lifted,
    // the caption buttons when they stayed in the row.
    const rightStop = liftActions ? edge - clusterWidth : document.documentElement.clientWidth - band.controls.size
    // The title's room runs up to that end, less the strip's own width and the
    // air on both sides of it: the strip is centred in what is left between the
    // two, so its width is reserved here rather than read off a position it is
    // about to leave.
    const room = rightStop - GAP - (inBand ? stripWidth + GAP : 0) - left
    const titleBox = rect(title)
    const liftTitle = title !== null && room >= MIN_TITLE
    // The row the title leaves holds only controls, and the host's inset for a
    // row that still carried a title would leave them floating below the caption
    // row. It rides up to tuck ROW_TUCK px into the title's own box, which the
    // stylesheet centres in the caption row — the target is computed rather than
    // read, because the title's box is not there yet on the pass that lifts it
    // and nothing would wake a second pass. Where the offset already applied is
    // taken back out, or the pass would read the raised row as needing no rise.
    const titleHeight = titleBox === null ? 0 : titleBox.height
    const titleCentre = band.height / 2 + TITLE_NUDGE
    const applied = parseFloat(row.style.getPropertyValue(ROW_LIFT))
    const rise = !liftTitle ? 0 : Math.max(0, Math.round(rowBox.top - (isFinite(applied) ? applied : 0) - (titleCentre + titleHeight / 2 - ROW_TUCK)))

    rowStamp.mark(liftTitle ? row : null)
    if (liftTitle) setVar(row, ROW_LIFT, `${-rise}px`)
    titleStamp.mark(liftTitle ? title : null)
    if (liftTitle && title !== null) {
      setVar(title, TITLE_LEFT, `${Math.round(left)}px`)
      setVar(title, TITLE_MAX, `${Math.round(room)}px`)
      setVar(title, TITLE_TOP, `${Math.round(titleCentre)}px`)
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
      const leftStop = liftTitle && titleBox !== null ? left + titleBox.width : furniture
      setVar(stripEl, TABS_LEFT, `${Math.round((leftStop + rightStop) / 2)}px`)
    }
    tabsStamp.mark(stripInBand ? stripEl : null)

    const tokens = `${liftTitle ? TITLE_TOKEN : ''} ${liftActions ? ACTIONS_TOKEN : ''}`.trim()
    if (tokens === '') document.body.removeAttribute(BAND_ATTR)
    else setAttributeIfChanged(document.body, BAND_ATTR, tokens)
  }

  ui.headerBand = { sync }

  return () => {
    const row = rowStamp.current()
    const title = titleStamp.current()
    const utilities = actionsStamp.current()
    const corner = cornerStamp.current()
    const strip = tabsStamp.current()
    if (row !== null) row.style.removeProperty(ROW_LIFT)
    if (title !== null) {
      title.style.removeProperty(TITLE_LEFT)
      title.style.removeProperty(TITLE_MAX)
      title.style.removeProperty(TITLE_TOP)
    }
    if (utilities !== null) utilities.style.removeProperty(ACTIONS_RIGHT)
    if (corner !== null) corner.style.removeProperty(ACTIONS_RIGHT)
    if (strip !== null) strip.style.removeProperty(TABS_LEFT)
    clear()
    watch(null)
    delete ui.headerBand
  }
}
