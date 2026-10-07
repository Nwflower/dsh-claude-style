import { CARET_ATTR, CARET_HOST_ATTR, CARET_LAYER_ATTR, CARET_MOTION_MOVE, CARET_MOTION_OFF, CARET_VISIBLE_ATTR, QUIET_ATTR } from '../../constants'
import { subscribeMutations } from '../../core/bus'
import { requestFrame } from '../../core/frame'
import { readPrefs, subscribePrefs } from '../../core/prefs'
import { caretClipToField, caretMeasurePlain, caretMeasureRich } from './caret-measure'
import type { CaretBox } from './caret-measure'
import { COMPOSER_INPUT_SELECTOR, COMPOSER_TEXTAREA_SELECTOR } from '@dsh-claude-style/contracts/dom'
import type { HostContext } from '../../core/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './caret.manifest'

/**
 * The composer caret's motion, ported from dsh-chat-ux: the browser's own
 * caret is pressed down and one is drawn in its place, so moving it can
 * carry a transition.
 *
 * The browser's caret has no animatable property beyond its colour and its
 * blink, so a transition has only one road: make it transparent and draw
 * one. Two surfaces under the composer seat are taken over — the
 * contenteditable input (measured through the collapsed Range the browser
 * keeps, caret-measure.ts) and a textarea inside the seat, such as a
 * question card's answer box or a queued message's inline editor (measured
 * through a hidden mirror, caret-measure.ts).
 *
 * What the mode means (the settings page's three-way choice):
 *
 *   typing  every move transitions, which is the default;
 *   move    only explicit moves (an arrow key, a click) transition — a
 *           keystroke lands instantly, told apart by the frame's input;
 *   off     nothing is taken over at all: no drawn caret, no mark, the
 *           browser's own caret throughout. That road is also the fallback,
 *           because the one way this effect really hurts a reader is a
 *           caret that cannot be seen.
 *
 * Two more rules, both measured in a real Chromium: the first frame the
 * drawn caret appears writes its place with no transition (otherwise it
 * slides in from wherever it last was), and a measurement that fails hands
 * the native caret back rather than leaving the surface with none.
 */
/** The blink animation, by name; the stylesheet's keyframes carry the same name by hand. */
export const CARET_BLINK_NAME = 'dsh-claude-caret-blink'
/** The drawn caret's colour, on the element itself: read off the native caret when taking over. */
export const CARET_COLOR_PROPERTY = '--dsh-claude-caret-color'
/** How long after a focus change to look again: a session switch leaves a few frames between the focus and a selection that is ready. */
export const CARET_FOCUS_SETTLE_MS = 120

/** One surface's drawn state: the drawn caret, whether it shows, and the container it sits in (marked when the skin made it a positioning context). */
interface CaretLayer {
  caret: HTMLDivElement
  visible: boolean
  host: HTMLElement
  markedHost: boolean
}

/**
 * Whether an element is an editable surface this takes over, and which kind.
 * @param element - usually whatever holds the focus right now.
 * @returns 'rich' for the composer input, 'plain' for a textarea in the
 *     composer seat, null for anything else.
 */
export function caretSurfaceOf(element: Element) {
  if (element.matches(COMPOSER_INPUT_SELECTOR)) return 'rich'
  if (element instanceof HTMLTextAreaElement && element.matches(COMPOSER_TEXTAREA_SELECTOR)) {
    return element.disabled || element.readOnly ? null : 'plain'
  }
  return null
}

/**
 * Draw the caret in place of the browser's own, for the whole page.
 *
 * @param read - reads the mode in force now; it is read on every frame's
 *     sync, so changing it at runtime needs no reinstall.
 * @returns { resync, dispose }: resync queues a sync for the next frame,
 *     dispose takes every listener, drawn caret and mark away.
 */
export function createCaretMotion(read: () => string) {
  /** One drawn state per editable surface; only one surface holds the focus at a time, so this usually holds one. */
  const layers = new Map<HTMLElement, CaretLayer>()
  /** A sync is already queued for the next frame. */
  let queued = false
  /** Cancels the frame queued; null when there is none, so dispose can cancel it. */
  let cancelFrame: (() => void) | null = null
  /**
   * Cancels the one-off frame that gives the transition back after an
   * instant landing; null when there is none, so dispose can cancel it too —
   * an untracked frame here would outlive the teardown and write into a
   * released layer.
   */
  let cancelTransitionFrame: (() => void) | null = null
  /**
   * After dispose, nothing acts.
   *
   * A frame callback and the two timers behind syncAfterFocusChange can
   * still be in flight; letting them run would rebuild the drawn caret and
   * re-attach the observer after the native caret's mark is gone — leaving
   * a reader with neither.
   */
  let disposed = false
  /** Input arrived in this frame; the move mode tells typing from an explicit move with it. */
  let typed = false
  /**
   * The last move was the End key.
   *
   * One offset at a soft wrap has two places: the previous line's end and
   * the next line's start. A textarea does not say which side it means, and
   * Chromium draws at the line's end after End and at its start otherwise —
   * so this is remembered.
   */
  let endKeyed = false
  /**
   * Where the measuring probes are built. It is marked quiet (QUIET_ATTR),
   * so the shared scheduler never reads a measurement as a change (D40); the
   * probes are built and removed inside it, in the same call.
   */
  const probeHome = document.createElement('div')
  probeHome.setAttribute(QUIET_ATTR, '')
  document.body.appendChild(probeHome)

  const queue = () => {
    if (disposed || queued) return
    queued = true
    // Measuring builds probes and reads them, then draws: write phase (D40).
    cancelFrame = requestFrame({
      write() {
        cancelFrame = null
        queued = false
        if (disposed) return
        const typing = typed
        typed = false
        sync(typing)
      },
    })
  }

  const markTyped = () => {
    typed = true
    endKeyed = false
  }

  /** Note whether this move was End (with Shift it selects, and there is no caret to draw). */
  const noteKey = (event: KeyboardEvent) => {
    if (event.key === 'Shift' || event.key === 'Control' || event.key === 'Meta' || event.key === 'Alt') return
    endKeyed = event.key === 'End' && !event.shiftKey
  }

  /** Where a pointer lands is the browser's decision, so the last End's leaning no longer stands. */
  const clearEndKey = () => {
    endKeyed = false
  }

  /**
   * A plain surface scrolled on its own: the drawn caret is not inside it and
   * does not come along, so it is measured again. scroll does not bubble,
   * hence the capture listener; every scroll on the page passes here and only
   * a surface already taken over is acted on.
   */
  const followPlainScroll = (event: Event) => {
    const target = event.target
    if (!(target instanceof HTMLTextAreaElement) || !layers.has(target)) return
    queue()
  }

  /**
   * An editable surface's content, editability or identity changed.
   *
   * selectionchange does not cover those silent changes: clearing a draft
   * need not move the selection and the browser fires nothing at all; on a
   * session switch the editor is still binding and contenteditable goes
   * false for a moment, the browser takes the focus away, and its return is
   * another event that never comes. The plain surface does not ride this:
   * its content is not in the DOM.
   */
  const onContentChange = () => {
    if (read() === CARET_MOTION_OFF) return
    queue()
  }
  /** The rich surfaces watched, each with what stops watching it. */
  const watchedSurfaces = new Map<HTMLElement, () => void>()

  /**
   * Watch a rich surface. Watching the same one twice is idempotent; a
   * surface that has left the page is let go here.
   */
  const observeComposer = (input: HTMLElement) => {
    for (const [surface, stop] of watchedSurfaces) {
      if (surface.isConnected) continue
      stop()
      watchedSurfaces.delete(surface)
    }
    if (watchedSurfaces.has(input)) return
    watchedSurfaces.set(input, subscribeMutations(input, {
      childList: true,
      subtree: true,
      characterData: true,
      attributeFilter: ['contenteditable', 'data-composer-input'],
    }, onContentChange))
  }

  /** The focus is on this surface and no caret has been drawn yet: the gap a session switch leaves. */
  const needsTakeover = () => {
    const active = document.activeElement
    if (!(active instanceof HTMLElement) || caretSurfaceOf(active) === null) return false
    return !active.hasAttribute(CARET_ATTR)
  }

  /**
   * Look again after a focus change.
   *
   * A session switch leaves a few frames between the focus leaving the old
   * surface and landing on the new one, with no event in between: the
   * browser moves the selection silently, and focusin does not even always
   * arrive (the new element may exist before the editor binds). Both
   * directions are listened for, since either can be the last word. Only a
   * surface not taken over yet is looked at again — an already drawn caret
   * is left alone, or its blink would restart.
   */
  const syncAfterFocusChange = () => {
    queue()
    window.setTimeout(() => {
      if (needsTakeover()) queue()
    }, CARET_FOCUS_SETTLE_MS)
  }

  const hide = (layer: CaretLayer) => {
    layer.caret.removeAttribute(CARET_VISIBLE_ATTR)
    layer.visible = false
  }

  /** Take a surface's drawn state away whole: the caret, the mark, and any positioning context lent to its parent. */
  const release = (input: HTMLElement, layer: CaretLayer) => {
    layer.caret.remove()
    input.removeAttribute(CARET_ATTR)
    if (layer.markedHost) layer.host.removeAttribute(CARET_HOST_ATTR)
  }

  /** This surface's drawn caret; one is built when there is none. */
  const layerFor = (input: HTMLElement) => {
    const host = input.parentElement
    if (host === null) return null
    const known = layers.get(input)
    if (known !== undefined && known.host === host) {
      // A React re-render takes the caret away with it: put it back and let
      // it land afresh.
      if (known.caret.isConnected) return known
      host.appendChild(known.caret)
      known.visible = false
      return known
    }
    // The parent changed: the old state goes whole and is rebuilt on the new parent.
    if (known !== undefined) {
      release(input, known)
      layers.delete(input)
    }
    // The drawn caret is placed against the container's padding box, so the
    // container has to be a positioning context. When it is not, a mark is
    // written and the stylesheet turns it relative — a question card's field
    // and a queued row are both like that. A display: contents container has
    // no box of its own, and marking it would do nothing: better to leave the
    // native caret alone.
    const hostStyle = getComputedStyle(host)
    if (hostStyle.display === 'contents') return null
    const markedHost = hostStyle.position === 'static'
    if (markedHost) host.setAttribute(CARET_HOST_ATTR, '')
    const caret = document.createElement('div')
    caret.setAttribute(CARET_LAYER_ATTR, '')
    // The scheduler reads the insertion of a marked node as no change (D40).
    caret.setAttribute(QUIET_ATTR, '')
    host.appendChild(caret)
    if (input.isContentEditable) observeComposer(input)
    const layer = { caret, visible: false, host, markedHost }
    layers.set(input, layer)
    return layer
  }

  /**
   * Read the native caret's colour at the moment of taking over, so the drawn
   * one can be painted with it.
   *
   * It is only readable while the mark is not written yet; afterwards the
   * computed value is transparent. An auto colour follows the text colour.
   */
  const adoptCaretColor = (input: HTMLElement, layer: CaretLayer) => {
    const style = getComputedStyle(input)
    // A transparent computed colour means the native caret is already pressed
    // down — another plugin's caret took this surface over first. Copying that
    // would draw nothing at all, so the text colour stands in; it is also what
    // an auto colour means.
    const color = style.caretColor === 'auto' || style.caretColor === 'rgba(0, 0, 0, 0)' ? style.color : style.caretColor
    layer.caret.style.setProperty(CARET_COLOR_PROPERTY, color)
  }

  /**
   * Put the drawn caret on this viewport box.
   * @param paused - no transition on this frame: it just appeared, or the
   *     move mode is landing a keystroke.
   */
  const drawCaret = (layer: CaretLayer, box: CaretBox, paused: boolean) => {
    // Absolute positioning goes by the container's padding box and follows
    // its own scroll: the border comes off the difference and the scrolled
    // distance goes back on.
    const hostRect = layer.host.getBoundingClientRect()
    // Snapped to whole pixels. The native caret sits on the pixel grid, and a
    // box landing on a fraction gets antialiased into a grey fringe that reads
    // as a different caret. The cost is up to half a pixel, which is invisible.
    const left = Math.round(box.left - hostRect.left - layer.host.clientLeft + layer.host.scrollLeft)
    const top = Math.round(box.top - hostRect.top - layer.host.clientTop + layer.host.scrollTop)

    // The frame that lands without a transition has to arrive instantly; the
    // transition comes back on the next one.
    const fresh = !layer.visible
    const instant = fresh || paused
    if (instant) layer.caret.style.transitionProperty = 'none'
    layer.caret.style.transform = 'translate(' + left + 'px, ' + top + 'px)'
    layer.caret.style.height = box.height + 'px'
    if (instant) {
      if (cancelTransitionFrame !== null) cancelTransitionFrame()
      cancelTransitionFrame = requestFrame({
        write() {
          cancelTransitionFrame = null
          if (disposed) return
          layer.caret.style.transitionProperty = ''
        },
      })
    }
    if (fresh) {
      layer.visible = true
      layer.caret.setAttribute(CARET_VISIBLE_ATTR, '')
    }
    // Every move restarts the blink: caught on the dark half of the cycle, a
    // reader would think the caret did not keep up. Only the blink is
    // restarted — getAnimations() also holds the travel transition this very
    // method drives, and pulling that back would make steady typing arrive
    // one grid step at a time.
    for (const animation of layer.caret.getAnimations()) {
      if (animation instanceof CSSAnimation && animation.animationName === CARET_BLINK_NAME) animation.currentTime = 0
    }
  }

  /**
   * Whose caret this frame's is.
   * @param typing - input arrived in this frame.
   */
  const sync = (typing: boolean) => {
    const mode = read()
    // off is absolute: the drawn caret and the mark go away together and the
    // native caret comes back. Keeping them only leaves the reader with none.
    if (mode === CARET_MOTION_OFF) {
      for (const [input, layer] of layers) release(input, layer)
      layers.clear()
      return
    }
    const selection = document.getSelection()
    const active = document.activeElement
    const kind = active instanceof HTMLElement ? caretSurfaceOf(active) : null
    // A rich surface holding the focus is watched even before it is editable:
    // contenteditable goes false for a moment on a session switch, and
    // watching the attribute is the only way to catch its return.
    if (kind === 'rich' && active instanceof HTMLElement) observeComposer(active)
    // A caret only exists on the editable surface holding the focus: the hero
    // input has none, and with several sessions only one holds it. A selection
    // (a candidate word during composition included) has no caret.
    let target: HTMLElement | null = null
    let range: Range | null = null
    if (kind === 'rich' && active instanceof HTMLElement && active.isContentEditable
      && selection !== null && selection.isCollapsed && selection.rangeCount > 0) {
      const candidate = selection.getRangeAt(0)
      if (active.contains(candidate.startContainer)) {
        target = active
        range = candidate
      }
    }
    if (kind === 'plain' && active instanceof HTMLTextAreaElement && active.selectionStart === active.selectionEnd) {
      target = active
    }
    for (const [input, layer] of layers) {
      // A session switch replaces the whole input area, and answering a
      // question card or saving a queued row unmounts one whole; the caret
      // that came along goes with it.
      if (!input.isConnected) {
        release(input, layer)
        layers.delete(input)
        continue
      }
      if (input === target) continue
      // The caret is not this surface's, or there is none: hide the drawn one
      // and give the native caret back. The mark only stands while a drawn
      // caret really exists, so taking it away is safe at any other time.
      hide(layer)
      input.removeAttribute(CARET_ATTR)
    }
    if (target === null) return
    const layer = layerFor(target)
    if (layer === null) return
    const measured = target instanceof HTMLTextAreaElement
      ? caretMeasurePlain(target, endKeyed, probeHome)
      : range === null ? null : caretMeasureRich(target, range, probeHome)
    // The mark is written only after a caret was really drawn. A measurement
    // that fails gives the native caret back: a transparent native caret
    // beside no drawn one is the one failure that really hurts a reader, so
    // every failed measurement returns to the start rather than holding on.
    if (measured === null) {
      target.removeAttribute(CARET_ATTR)
      hide(layer)
      return
    }
    if (!target.hasAttribute(CARET_ATTR)) adoptCaretColor(target, layer)
    // A plain surface's own scrolled-away part is not drawn. That is not a
    // failed measurement — the native caret is invisible there too — so the
    // mark still stands.
    const box = target instanceof HTMLTextAreaElement ? caretClipToField(target, measured) : measured
    if (box === null) hide(layer)
    else drawCaret(layer, box, mode === CARET_MOTION_MOVE && typing)
    target.setAttribute(CARET_ATTR, '')
  }

  document.addEventListener('selectionchange', queue)
  document.addEventListener('focusin', syncAfterFocusChange)
  document.addEventListener('focusout', syncAfterFocusChange)
  // What the move mode reads: it arrives before selectionchange, so whether
  // this frame's move is typing is read rather than guessed from position.
  document.addEventListener('beforeinput', markTyped)
  // Which side of a soft wrap is meant: whether the last move was End.
  document.addEventListener('keydown', noteKey, true)
  document.addEventListener('pointerdown', clearEndKey, true)
  document.addEventListener('scroll', followPlainScroll, { capture: true, passive: true })
  window.addEventListener('resize', queue)
  // The shipped faces arrive after the first frame and wrap differently, so the caret is measured again.
  document.fonts.addEventListener('loadingdone', queue)

  return {
    resync: queue,
    dispose: () => {
      disposed = true
      if (cancelFrame !== null) cancelFrame()
      cancelFrame = null
      if (cancelTransitionFrame !== null) cancelTransitionFrame()
      cancelTransitionFrame = null
      document.removeEventListener('selectionchange', queue)
      document.removeEventListener('focusin', syncAfterFocusChange)
      document.removeEventListener('focusout', syncAfterFocusChange)
      document.removeEventListener('beforeinput', markTyped)
      document.removeEventListener('keydown', noteKey, true)
      document.removeEventListener('pointerdown', clearEndKey, true)
      document.removeEventListener('scroll', followPlainScroll, true)
      window.removeEventListener('resize', queue)
      document.fonts.removeEventListener('loadingdone', queue)
      for (const stop of watchedSurfaces.values()) stop()
      watchedSurfaces.clear()
      for (const [input, layer] of layers) release(input, layer)
      layers.clear()
      probeHome.remove()
    },
  }
}

/**
 * Install the caret motion and keep it in step with the preference.
 *
 * @param ctx - client context.
 * @param ui - shared handle table.
 * @returns teardown.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  // dsh-chat-ux draws its own caret on the same surfaces, and two drawn
  // carets blink out of phase: the entry keeps this uninstalled while that
  // plugin is on the page (the manifest).
  const motion = createCaretMotion(() => readPrefs().caretMotion)
  const stopPrefs = subscribePrefs(() => motion.resync())
  return () => {
    stopPrefs()
    motion.dispose()
  }
}
