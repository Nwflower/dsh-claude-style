import { DS_BOT_ACCOUNT_SELECTOR, DS_BOT_AGENT_ITEM_SELECTOR, DS_BOT_RETURN_SELECTOR, DS_BOT_SIDEBAR_TOP_SELECTOR, SIDEBAR_BRAND_SELECTOR, SIDEBAR_ROOT_SELECTOR, SIDEBAR_TOGGLE_SELECTOR, WINDOWS_MENU_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { SURFACE_STYLESHEET } from 'virtual:dsh-claude-style/generated'
import { QUIET_ATTR, SURFACE_PLUGIN_CSS, SURFACE_STYLE_ID } from '../../constants'
import { observeSize, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { desktopBand } from '@dsh-claude-style/engine/desktop-band'
import { cacheFirstMatch, findSidebarBrand, findSidebarRoot, findSidebarToggle, findWindowsMenu } from '@dsh-claude-style/engine/host'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { onModelCopyLoaded } from '../model/model-copy'
import { mountStylesheet } from '../../core/stylesheet'
import { buildElement, createStamp, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { dsBotInstalled, dsBotSurfaceActive, subscribePageOwner } from '../../shared/visual-owner'
import { hostTooltip } from '../../shared/host-tooltip'
import { inPagePixels } from '../../shared/page-zoom'
import { copy } from './copy'

/**
 * The Chat / Code switch at the top of the sidebar, the way Claude's desktop
 * app moves between its two interfaces (D74): Chat is ds-bot's Bot surface,
 * Code is the shell's own interface under this theme.
 *
 * The mode is ds-bot's own: the switch presses ds-bot's controls — its
 * footer button back to the Bot surface, and the Agent mode item of its
 * account menu — and reads the mode off the page owner's verdict
 * (shared/visual-owner.ts), so a switch made through ds-bot's own controls
 * moves it too. The entry keeps this feature through ds-bot's yield, and
 * with no scheduler running then, the switch keeps its own place.
 *
 * Its sheet is its own (`scope: 'surface'`): the theme's sheet leaves with
 * the theme, and the switch has to look the same on both sides.
 */

type Mode = 'chat' | 'code'

/** On `<body>` while the switch is live, naming the mode: the surface sheets' scope. */
const SURFACE_ATTR = 'data-dsh-claude-surface'
/** On `<body>` while the switch presses ds-bot's account menu item: the menu stays out of sight. */
const SWITCHING_ATTR = 'data-dsh-claude-surface-switching'
/** On the switch: the desktop caption strip, the strip with no room left beside the sidebar's controls, or a sidebar row. */
const PLACE_ATTR = 'data-dsh-claude-surface-place'
type Place = 'band' | 'tucked' | 'row'
/** The custom properties the caption strip placement writes on the switch. */
const LEFT_PROPERTY = '--dsh-claude-surface-left'
const TOP_PROPERTY = '--dsh-claude-surface-top'
/** In the caption strip: the switch's right edge stands this far inside the sidebar column's, and this far clear of the controls left of it. */
const BAND_INSET = 12
const BAND_CLEARANCE = 8

const SVG_OPEN = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
const ICONS: Record<Mode, string> = {
  chat: `${SVG_OPEN}<path d="M3 5.5h5.5A1.5 1.5 0 0 1 10 7v3a1.5 1.5 0 0 1-1.5 1.5H5.2L3 13.3v-1.8A1.5 1.5 0 0 1 1.5 10V7A1.5 1.5 0 0 1 3 5.5z"/><path d="M6 5.5V4a1.5 1.5 0 0 1 1.5-1.5H13A1.5 1.5 0 0 1 14.5 4v3A1.5 1.5 0 0 1 13 8.5v1.8L11 8.5h-1"/></svg>`,
  code: `${SVG_OPEN}<path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9.2 3 6.8 13"/></svg>`,
}
const MODES: Mode[] = ['chat', 'code']

/** The mode the page is in now: ds-bot's Bot surface has it, or the theme. */
function currentMode(): Mode {
  return dsBotSurfaceActive() ? 'chat' : 'code'
}

/**
 * ds-bot's own controls: the row and the account entry the switch stands beside
 * and presses, and the account menu's Agent item. Each is read once and kept
 * until the page's structure changes (packages/engine/src/host.ts's
 * cacheFirstMatch), because every one of them is absent while the Bot surface
 * is down and the switch's pass runs on every refresh (D9). Taken on the first
 * install and reused, so a page the switch never reaches pays nothing and a
 * re-install adds no reader.
 */
let seatReaders: {
  botTopRow: () => HTMLElement | null
  botAccount: () => HTMLElement | null
  botReturn: () => HTMLElement | null
  botAgentItem: () => HTMLElement | null
} | null = null

function seats() {
  seatReaders ??= {
    botTopRow: cacheFirstMatch<HTMLElement>(DS_BOT_SIDEBAR_TOP_SELECTOR),
    botAccount: cacheFirstMatch<HTMLElement>(DS_BOT_ACCOUNT_SELECTOR),
    botReturn: cacheFirstMatch<HTMLElement>(DS_BOT_RETURN_SELECTOR),
    botAgentItem: cacheFirstMatch<HTMLElement>(DS_BOT_AGENT_ITEM_SELECTOR),
  }
  return seatReaders
}

export function install() {
  // Without ds-bot the host has one interface, and nothing to switch to.
  if (!dsBotInstalled()) return
  const body = document.body
  const seat = seats()
  const stopSheet = mountStylesheet(SURFACE_STYLE_ID, SURFACE_STYLESHEET, SURFACE_PLUGIN_CSS)

  const root = buildElement('div', 'dsh-claude-surface-switch')
  root.setAttribute('role', 'radiogroup')
  // Its own moves are no page change for the passes that watch the page, its own included.
  root.setAttribute(QUIET_ATTR, '')
  const options = MODES.map((mode) => {
    const button = buildElement('button', 'dsh-claude-surface-option')
    button.type = 'button'
    button.setAttribute('role', 'radio')
    button.innerHTML = ICONS[mode]
    button.addEventListener('click', () => choose(mode))
    const tip = hostTooltip(button, copy(mode === 'chat' ? 'surfaceChat' : 'surfaceCode'), { side: 'bottom' })
    root.appendChild(tip.node)
    return { mode, button, tip }
  })
  /** The web's sidebar row holding the switch, which takes a third column for it. */
  const rowStamp = createStamp('data-dsh-claude-surface-row')

  /** ds-bot's own route back to its Bot surface. */
  function pressReturn() {
    const button = seat.botReturn()
    if (button === null) throw new Error('surface: ds-bot shows no button back to its Bot surface')
    button.click()
  }

  /**
   * ds-bot's own route to Agent mode, the last item of its account menu. The
   * menu renders after the click returns, so the item is pressed on the next
   * frame, and the menu is kept out of sight until it has closed again.
   */
  function pressAgentItem() {
    const account = seat.botAccount()
    if (account === null) throw new Error('surface: ds-bot\'s account button is not on the page')
    body.toggleAttribute(SWITCHING_ATTR, true)
    account.click()
    cancelSwitchFrame = requestFrame({
      write() {
        cancelSwitchFrame = null
        const item = seat.botAgentItem()
        cancelSwitchFrame = requestFrame({
          write() {
            cancelSwitchFrame = null
            body.removeAttribute(SWITCHING_ATTR)
          },
        })
        if (item === null) throw new Error('surface: ds-bot\'s account menu carries no Agent mode item')
        item.click()
      },
    })
  }

  function choose(mode: Mode) {
    if (mode === currentMode()) return
    if (mode === 'chat') pressReturn()
    else pressAgentItem()
  }

  function writeCopy() {
    setAttributeIfChanged(root, 'aria-label', copy('surfaceSwitch'))
    for (const { mode, button, tip } of options) {
      const label = mode === 'chat' ? copy('surfaceChat') : copy('surfaceCode')
      setAttributeIfChanged(button, 'aria-label', label)
      tip.setLabel(label)
    }
  }

  /**
   * Take the switch off the page. Its tooltips stay mounted: sync seats the
   * switch again whenever the page's shape allows, and a released root answers
   * the setLabel that follows with React's "cannot update an unmounted root",
   * leaving its anchor — and the option inside it — undrawn for good. They are
   * released with the feature, in the teardown below.
   */
  function detach() {
    root.remove()
    rowStamp.release()
  }

  function mark(place: Place) {
    setAttributeIfChanged(root, PLACE_ATTR, place)
    if (place !== 'row') rowStamp.release()
  }

  function setProperty(name: string, value: string) {
    if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value)
  }

  /**
   * The desktop caption strip, where Claude's app keeps its switch: right
   * inside the sidebar column's right edge, centred in the strip. The column
   * narrows to a rail or under the reader's drag; with no room left past the
   * controls at the strip's left end, the switch stays measured but unseen.
   */
  function placeInBand(band: NonNullable<ReturnType<typeof desktopBand>>) {
    const column = findSidebarRoot()
    if (column === null) {
      detach()
      return
    }
    if (root.parentElement !== body) body.appendChild(root)
    const width = root.offsetWidth
    const height = root.offsetHeight
    // The strip and the column are measured in the window's pixels while both
    // properties are read as the page's, so every measurement is halved across
    // by the page's scale before it is written (shared/page-zoom.ts).
    let clear = band.controls.side === 'left' ? inPagePixels(band.controls.size) : 0
    for (const read of [findSidebarToggle, findWindowsMenu]) {
      const box = read()?.getBoundingClientRect()
      if (box !== undefined && box.width > 0 && box.top < band.height) clear = Math.max(clear, inPagePixels(box.right))
    }
    const left = Math.round(inPagePixels(column.getBoundingClientRect().right) - BAND_INSET - width)
    setProperty(LEFT_PROPERTY, `${left}px`)
    setProperty(TOP_PROPERTY, `${Math.round((inPagePixels(band.height) - height) / 2)}px`)
    mark(left < clear + BAND_CLEARANCE ? 'tucked' : 'band')
  }

  /**
   * The web's first sidebar row: ds-bot's own top row on the Bot surface, the
   * host's brand row under the theme, before the collapse toggle. The
   * collapsed rail has neither, and the switch leaves with them.
   */
  function placeInRow(mode: Mode) {
    if (mode === 'chat') {
      const row = seat.botTopRow()
      if (row === null) {
        detach()
        return
      }
      if (root.parentElement !== row || root.nextSibling !== null) row.appendChild(root)
      mark('row')
      return
    }
    const row = findSidebarBrand()?.parentElement ?? null
    if (row === null) {
      detach()
      return
    }
    const toggle = findSidebarToggle()
    const before = toggle !== null && toggle.parentElement === row ? toggle : null
    if (root.parentElement !== row || root.nextSibling !== before) row.insertBefore(root, before)
    mark('row')
    rowStamp.mark(row)
  }

  /** The sidebar column the size watch follows; React may mount a new one. */
  let watchedColumn: Element | null = null
  let stopColumnSize: (() => void) | null = null

  function watchColumn() {
    const column = findSidebarRoot()
    if (column === watchedColumn) return
    if (stopColumnSize !== null) stopColumnSize()
    stopColumnSize = null
    watchedColumn = column
    // Collapsing the sidebar animates the column's width with no DOM change.
    if (column !== null) stopColumnSize = observeSize(column, schedule)
  }

  function sync() {
    const mode = currentMode()
    setAttributeIfChanged(body, SURFACE_ATTR, mode)
    writeCopy()
    for (const { mode: option, button } of options) setAttributeIfChanged(button, 'aria-checked', String(option === mode))
    watchColumn()
    // The control the other side presses has to be on the page, or the switch has nothing to do.
    if ((mode === 'chat' ? seat.botAccount() : seat.botReturn()) === null) {
      detach()
      return
    }
    // The caption strip is the host's, and its placement measures the host's
    // sidebar column through this theme's part marks. Those marks leave with
    // the theme (D74), so beside ds-bot's Bot surface the strip has no column
    // to sit against: there the switch stays in ds-bot's own top row, or a
    // page booting on that side would lose the way back.
    const band = mode === 'code' ? desktopBand() : null
    if (band !== null) placeInBand(band)
    else placeInRow(mode)
  }

  // The pass reads and writes, so it runs in the frame's write phase (D40).
  let cancelPass: (() => void) | null = null
  /**
   * The two frames the mode switch presses ds-bot's own menu in. They outlive
   * the press, so the teardown drops them: a press still waiting would click
   * ds-bot's item, and the mark it lifts, after the switch is off the page.
   */
  let cancelSwitchFrame: (() => void) | null = null
  const pass = {
    write() {
      cancelPass = null
      sync()
    },
  }
  function schedule() {
    if (cancelPass === null) cancelPass = requestFrame(pass)
  }

  const stopMutations = subscribeMutations(body, { childList: true, subtree: true, skipQuiet: true }, schedule)
  const stopOwner = subscribePageOwner(schedule)
  const stopCopy = onModelCopyLoaded(schedule)
  const overlay = navigator.windowControlsOverlay
  window.addEventListener('resize', schedule)
  overlay?.addEventListener('geometrychange', schedule)
  sync()

  return () => {
    if (cancelPass !== null) cancelPass()
    cancelPass = null
    if (cancelSwitchFrame !== null) cancelSwitchFrame()
    cancelSwitchFrame = null
    stopMutations()
    stopOwner()
    stopCopy()
    window.removeEventListener('resize', schedule)
    overlay?.removeEventListener('geometrychange', schedule)
    if (stopColumnSize !== null) stopColumnSize()
    detach()
    for (const { tip } of options) tip.release()
    body.removeAttribute(SURFACE_ATTR)
    body.removeAttribute(SWITCHING_ATTR)
    stopSheet()
  }
}
