import { AUTO_POPOVER_ALL } from '../../constants'
import { observeSize } from '@dsh-claude-style/engine/bus'
import { readPrefs } from '../../core/prefs'
import { setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { POPOVER_CLOSE_DELAY, POPOVER_OPEN_DELAY, createHoverIntent, isProgrammaticPress, pressKeepsPopoverOpen, programmaticPress, resolveAnchoredPosition } from '../../shared/popover'
import { inPageBox, pageViewport } from '../../shared/page-zoom'
import { CONTEXT_PANEL_ALIGNED_ATTR, CONTEXT_PANEL_ATTR, contextMeterOf, contextPanel, contextTrigger, contextTriggerOf, expandedContextTrigger, findContextMeter, observeDialogs } from './stats-panel'
import { meterRingOf } from './meter-ring'
import { copy } from './copy'
import type { MatchList } from '@dsh-claude-style/engine/bus'

/**
 * The hover path onto the host's own panel: opening and closing it through the
 * host's trigger, keeping a node's bindings to one generation, and the reading
 * that places the panel over the meter in the page's own pixels.
 */

/** The custom property the stylesheet reads to line the panel's right edge up with the meter's. */
const CONTEXT_PANEL_LEFT = '--dsh-claude-context-panel-left'
/** The custom property the stylesheet reads to keep the panel's bottom edge on the meter's top. */
const CONTEXT_PANEL_TOP = '--dsh-claude-context-panel-top'
/** The viewport margin the host keeps for this panel (ui-chat's stat-dialog). */
const CONTEXT_PANEL_MARGIN = 12
/** The host's distance from the meter's top edge to the panel's bottom (ui-chat's stat-dialog). */
const CONTEXT_PANEL_GAP = 8

/**
 * The panel's bindings.
 *
 * @param ring - the skin's own ring while it stands in the composer row, else
 *   null. The panel hangs from the face the reader pressed, which is the ring
 *   in the context position and the host's own meter wherever it keeps its
 *   place.
 * @returns { bindMeter, bindPanel, align, close, cancelHover, releaseSize, release }.
 */
export function createContextStatsBinding(ring: () => HTMLElement | null) {
  /** Identity of the bindings THIS generation installed (a hot reload reuses the host's nodes). */
  const statsBindingToken = {}
  /** The open panel's size watcher, or null before a panel has been seen. */
  let stopPanelSize: (() => void) | null = null
  /**
   * Every listener this generation put on a node the host owns, with the node
   * and the call that takes it off. The ring, the meter, the line and the panel
   * outlive the generation, so the teardown removes what it bound, and a node
   * the page takes out is released as soon as the next binding sees it
   * (forgetDetachedBindings): the token above only keeps one generation from
   * binding the same element twice.
   */
  const boundListeners: { surface: Element, remove: () => void }[] = []

  /**
   * Drop the bindings whose surface the page took out. A session switch
   * replaces the meter, the line and the panel under the old conversation, and
   * a binding left behind holds that element, whose ancestors hold the whole
   * removed transcript. The token comes off with it, so a surface the page
   * moves back is bound again.
   */
  function forgetDetachedBindings() {
    for (let index = boundListeners.length - 1; index >= 0; index -= 1) {
      const binding = boundListeners[index]
      if (binding.surface.isConnected) continue
      binding.remove()
      delete binding.surface.__dshContextMeterToken
      delete binding.surface.__dshContextLineToken
      delete binding.surface.__dshContextPanelToken
      if (binding.surface === dwellFace) dwellFace = null
      boundListeners.splice(index, 1)
    }
  }

  /**
   * The trigger a face drives: the meter of that face's own composer card, else
   * the first meter the document holds. A page can carry more than one card — a
   * sub-agent's docked conversation beside the main one — and each card's meter
   * opens that card's own panel.
   */
  function triggerFor(surface: Element | null) {
    return contextTriggerOf(surface) ?? contextTrigger()
  }

  /**
   * The face a panel hangs from: the skin's ring while it stands in the same
   * card as the trigger that opened the panel, else that card's own meter, and
   * the first face only when the page names neither.
   */
  function faceFor(trigger: Element | null) {
    const fallback = ring()
    if (trigger === null) return fallback ?? findContextMeter()
    const meter = contextMeterOf(trigger)
    // A ring stands in the card whose meter it hides: the face over the panel
    // is that card's ring, not the meter behind it. Each card of a page with a
    // sub-agent's docked conversation has one (meter-ring.ts).
    const own = meterRingOf(trigger)
    if (own !== null) return own
    return meter ?? fallback ?? findContextMeter()
  }

  /** The face whose panel is up: the one the host marks expanded, if any. */
  function openFace() {
    return faceFor(expandedContextTrigger())
  }

  /**
   * Open the context panel by pressing the host's trigger: the panel, its
   * placement, its dismissal and its keyboard handling all stay the
   * host's. Only the trigger is driven, and only when it is closed.
   */
  function openContextPanel(surface: Element | null) {
    const trigger = triggerFor(surface)
    if (trigger === null || trigger.getAttribute('aria-expanded') === 'true') return
    trigger.click()
  }

  /**
   * Close it again, the same way. The panel's own mouseenter cancels this
   * first (hover intent); the `:hover` test is the second net for the
   * frame in which the pointer is already inside a panel the leave event
   * still saw as left.
   */
  function closeContextPanel(surface?: Element | null) {
    const trigger = expandedContextTrigger() ?? triggerFor(surface ?? null)
    if (trigger === null || trigger.getAttribute('aria-expanded') !== 'true') return
    const panel = contextPanel()
    if (panel !== null && panel.matches(':hover')) return
    programmaticPress(trigger)
  }

  /** The face whose dwell is pending: the panel opens from that face's own card. */
  let dwellFace: Element | null = null

  const hoverIntent = createHoverIntent(() => {
    const surface = dwellFace
    dwellFace = null
    openContextPanel(surface)
  }, () => {
    // Layout can return the pointer to the face before the close grace expires.
    // Explicit line and keyboard dismissal still use closeContextPanel directly.
    if (openFace()?.matches(':hover')) return
    closeContextPanel()
  }, POPOVER_OPEN_DELAY, POPOVER_CLOSE_DELAY)

  /** The hover preference gates both directions, as it does for the skin's other popovers. */
  function hoverEnabled() {
    return readPrefs().autoPopover === AUTO_POPOVER_ALL
  }

  /**
   * Bind one face as the panel's trigger: the host's own meter wherever it keeps
   * its place, or the skin's ring that stands in the composer row instead.
   *
   * The host dismisses its panel on any press its root and the panel do not
   * hold, and the ring stands in the composer row, outside both. But the ring is
   * that trigger's face: the press it takes is the press the host's meter would
   * have taken. So the press is delivered to the meter instead — stopped on the
   * ring and dispatched again on the host's trigger, which the panel's root
   * holds. The host's dismissal passes over it while every other reader of a
   * press (the skin's own popovers closing on a press outside them) still hears
   * one. The click that follows is the ring's own: it opens a shut panel, closes
   * an open one, and leaves up the panel the pointer's own dwell opened
   * (shared/popover.ts::pressKeepsPopoverOpen).
   */
  function bindContextMeter(surface: HTMLElement, ringSurface: boolean) {
    forgetDetachedBindings()
    if (surface.__dshContextMeterToken === statsBindingToken) return
    surface.__dshContextMeterToken = statsBindingToken
    const onDown = (event: Event) => {
      if (!ringSurface || !(event instanceof PointerEvent)) return
      const trigger = triggerFor(surface)
      if (trigger === null) return
      event.stopPropagation()
      trigger.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: event.clientX,
        clientY: event.clientY,
        button: event.button,
        buttons: event.buttons,
        pointerType: event.pointerType,
        isPrimary: event.isPrimary,
      }))
    }
    const onEnter = () => {
      if (!hoverEnabled()) return
      dwellFace = surface
      hoverIntent.scheduleOpen()
    }
    const onLeave = () => {
      if (hoverEnabled()) hoverIntent.scheduleClose()
    }
    // The host's own trigger toggles the panel on a press, and its onClick is
    // delegated from the document, so a press on the meter the dwell just
    // opened is stopped on its way there: the pointer is on the trigger it
    // opened from, and the leave is the way out
    // (shared/popover.ts::pressKeepsPopoverOpen). The line of figures keeps
    // its own press behaviour: it is not a hover trigger
    const onClick = (event: Event) => {
      if (isProgrammaticPress()) return
      const trigger = triggerFor(surface)
      const target = event.target
      if (trigger === null || !(target instanceof Node)) return
      const open = trigger.getAttribute('aria-expanded') === 'true'
      if (!ringSurface) {
        if (!trigger.contains(target)) return
        if (!pressKeepsPopoverOpen(hoverEnabled(), open)) return
        event.stopPropagation()
        return
      }
      if (pressKeepsPopoverOpen(hoverEnabled(), open)) return
      if (open) closeContextPanel(surface)
      else openContextPanel(surface)
    }
    surface.addEventListener('pointerdown', onDown, true)
    surface.addEventListener('mouseenter', onEnter)
    surface.addEventListener('mouseleave', onLeave)
    surface.addEventListener('click', onClick, true)
    boundListeners.push({
      surface,
      remove() {
        surface.removeEventListener('pointerdown', onDown, true)
        surface.removeEventListener('mouseenter', onEnter)
        surface.removeEventListener('mouseleave', onLeave)
        surface.removeEventListener('click', onClick, true)
      },
    })
  }

  /**
   * Bind the line of numbers as the panel's second trigger: the figures are what
   * the panel's rows expand on, so the line opens it and closes it again. Only
   * the press does that — the pointer path stays the meter's alone, so resting a
   * pointer on the figures never unfolds the panel A rebuilt line is bound
   * once per generation, like the meter.
   */
  function bindContextLine(line: Element) {
    forgetDetachedBindings()
    if (line.__dshContextLineToken === statsBindingToken) return
    line.__dshContextLineToken = statsBindingToken
    line.setAttribute('role', 'button')
    line.setAttribute('tabindex', '0')
    line.setAttribute('aria-haspopup', 'dialog')
    line.setAttribute('aria-expanded', 'false')
    const onClick = (event: Event) => {
      // The host reads presses outside its panel as a dismissal; the press that
      // opens it must not reach that reader in the same event.
      event.stopPropagation()
      toggleContextPanel(line)
    }
    const onKeyDown = (event: Event) => {
      if (!(event instanceof KeyboardEvent)) return
      if (event.key === 'Escape') {
        event.stopPropagation()
        closeContextPanel()
        return
      }
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      event.stopPropagation()
      toggleContextPanel(line)
    }
    line.addEventListener('click', onClick)
    line.addEventListener('keydown', onKeyDown)
    boundListeners.push({
      surface: line,
      remove() {
        line.removeEventListener('click', onClick)
        line.removeEventListener('keydown', onKeyDown)
      },
    })
  }

  /** Open the panel from either trigger, or close it when it is already open. */
  function toggleContextPanel(surface?: Element | null) {
    if (expandedContextTrigger() !== null) closeContextPanel(surface)
    else openContextPanel(surface ?? null)
  }

  /**
   * Say on the line what the host's trigger says, so the button follows the panel
   * it drives.
   *
   * The line is a button made of figures and arrows, so it carries the name the
   * reader needs to know what it opens; the name is written with the state, so a
   * locale or copy change reaches it too.
   */
  function syncContextLineState(line: Element) {
    const trigger = expandedContextTrigger() ?? triggerFor(line)
    const expanded = trigger !== null && trigger.getAttribute('aria-expanded') === 'true' ? 'true' : 'false'
    if (line.getAttribute('aria-expanded') !== expanded) line.setAttribute('aria-expanded', expanded)
    setAttributeIfChanged(line, 'aria-label', copy('statsLineLabel'))
  }

  /**
   * Place the panel over the meter: both edges, in the page's own pixels.
   *
   * The panel is the host's and its coordinates are inline: ui-chat places it
   * above the anchor from the box `getBoundingClientRect` answers in the
   * window's pixels and the panel's own laid-out height, and writes the answer
   * into the inline style. The anchor it reads is the host's own trigger, which
   * stands in a dock the skin's ring replaces — a node with no box, so the
   * host's answer is the window's corner. The stylesheet reads that space at
   * the page's zoom factor, which scales a written `left` or `top` again — at
   * 125% the panel lands a quarter of its distance from the window's top too
   * low and runs past the bottom edge. The skin reads the face the reader
   * pressed and the window in the same pixels (shared/page-zoom.ts), keeps the
   * host's own placement — above that face, by the gap ui-chat's stat dialog
   * keeps — and hands the stylesheet two values (features/composer/
   * inline-bar.css), the hand-over the hero menu makes for the menu the host
   * places below its own trigger. The properties and the mark are written
   * together, so the rule never runs on a reading that has gone.
   */
  function alignContextPanel(panel: HTMLElement) {
    const face = openFace()
    if (face === null) return
    const anchor = inPageBox(face.getBoundingClientRect())
    // The panel's own entrance scales it (the cards' 0.98), and a TRANSFORMED
    // rect is two percent narrower than the box that settles: read the layout
    // size, which is the one the panel ends up with.
    const width = panel.offsetWidth
    const height = panel.offsetHeight
    if (width === 0 || height === 0) return
    const { x, y } = resolveAnchoredPosition(anchor, width, height, {
      side: 'above',
      gap: CONTEXT_PANEL_GAP,
      margin: CONTEXT_PANEL_MARGIN,
      viewport: pageViewport(),
    })
    panel.style.setProperty(CONTEXT_PANEL_LEFT, `${Math.round(x)}px`)
    panel.style.setProperty(CONTEXT_PANEL_TOP, `${Math.round(y)}px`)
    panel.setAttribute(CONTEXT_PANEL_ALIGNED_ATTR, '')
  }

  function bindContextPanel(panel: HTMLElement) {
    forgetDetachedBindings()
    if (!panel.hasAttribute(CONTEXT_PANEL_ATTR)) panel.setAttribute(CONTEXT_PANEL_ATTR, '')
    if (panel.__dshContextPanelToken === statsBindingToken) {
      // A reading taken before the face had a box is no reading: the panel
      // stays unpainted (features/composer/inline-bar.css) until one lands, and
      // a later pass is where it is asked for again.
      if (!panel.hasAttribute(CONTEXT_PANEL_ALIGNED_ATTR)) alignContextPanel(panel)
      return
    }
    panel.__dshContextPanelToken = statsBindingToken
    const onEnter = () => {
      hoverIntent.cancel()
    }
    const onLeave = () => {
      if (hoverEnabled()) hoverIntent.scheduleClose()
    }
    panel.addEventListener('mouseenter', onEnter)
    panel.addEventListener('mouseleave', onLeave)
    boundListeners.push({
      surface: panel,
      remove() {
        panel.removeEventListener('mouseenter', onEnter)
        panel.removeEventListener('mouseleave', onLeave)
      },
    })
    // The panel's own box is what the reading is taken from, so the reading
    // is re-taken whenever that box changes: the host's rows growing, or
    // the block below them arriving.
    if (stopPanelSize !== null) stopPanelSize()
    stopPanelSize = observeSize(panel, () => {
      const open = contextPanel()
      if (open !== null) alignContextPanel(open)
    })
    alignContextPanel(panel)
  }

  /** The dialogs on the page, as the bus keeps them, while this generation stands. */
  let panelArrivals: MatchList<HTMLElement> | null = null

  /**
   * Bind the panel the moment the host mounts it.
   *
   * The host places the panel from its anchor's box, and that anchor is a node
   * with no box: the first frame the panel would paint stands in the window's
   * corner. The bus delivers an arrival in the batch that made it, before the
   * browser computes style (D40), so the stamp that holds the panel and the
   * placement that reveals it are written in the frame it mounts in.
   */
  function watchPanelArrival() {
    if (panelArrivals !== null) return
    panelArrivals = observeDialogs(() => {
      const panel = contextPanel()
      if (panel !== null) bindContextPanel(panel)
    })
  }

  watchPanelArrival()

  /**
   * Composer focus closes the panel the host's trigger opened, without the
   * `:hover` net the hover path keeps (the pointer is not what asked).
   */
  function closeContextStatsPanel() {
    hoverIntent.cancel()
    dwellFace = null
    const trigger = expandedContextTrigger()
    if (trigger === null) return
    trigger.click()
  }

  /** Stop watching the open panel's size. */
  function releasePanelSize() {
    if (stopPanelSize !== null) {
      stopPanelSize()
      stopPanelSize = null
    }
  }

  return {
    /** Bind one face as the panel's trigger, once per generation. */
    bindMeter: bindContextMeter,
    /** Bind the panel once per generation, and take the alignment reading. */
    bindPanel: bindContextPanel,
    /** Bind the line of numbers as the panel's second trigger, once per generation. */
    bindLine: bindContextLine,
    /** Write the host panel's open state onto the line. */
    syncLine: syncContextLineState,
    /** Re-take the alignment reading (the viewport moved). */
    align: alignContextPanel,
    /** Close the panel the host's trigger opened. */
    close: closeContextStatsPanel,
    /** Drop the pending hover timers. */
    cancelHover() {
      hoverIntent.cancel()
    },
    /** Stop watching the panel's size. */
    releaseSize: releasePanelSize,
    /**
     * The generation's whole binding goes: the hover timers, the size watcher
     * and every listener put on the host's own meter, line and panel. Those
     * nodes outlive the generation, so what is not taken off here would answer
     * a later generation's pointer with this one's closure.
     */
    release() {
      hoverIntent.cancel()
      releasePanelSize()
      panelArrivals?.release()
      panelArrivals = null
      for (let i = 0; i < boundListeners.length; i++) boundListeners[i].remove()
      boundListeners.length = 0
    },
  }
}
