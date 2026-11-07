import { AUTO_POPOVER_ALL } from '../../constants'
import { readPrefs } from '../../core/prefs'
import { closestFrom } from '@dsh-claude-style/engine/dom'
import { POPOVER_MARGIN, POPOVER_OPEN_DELAY, closeOtherPopovers, createHoverIntent, positionAnchoredPopover, registerPopover, removeStrayNodes, setMenuPopoverOpen, unregisterPopover } from '../../shared/popover'
import { pageViewport } from '../../shared/page-zoom'
import { createModelSubMenu } from './sub-menu'

/**
 * The model picker's two cards: the open, close, dwell and placement of the
 * level-1 list and the More-models card beside it. The two cards are separate
 * boxes with a sliver of desktop between them, so the pointer is tracked
 * while either is up and the gap counts as still inside; the rows themselves
 * are painted by the feature's pass (model-picker.ts), which the cards call
 * back on every open through `onOpen`.
 */
export function createModelCards(options: {
  /** Load the catalog and repaint level 1's rows: a card opening repaints from scratch. */
  onOpen(): void
  /** Build level 2's content module when its card is first built (sub-menu.ts). */
  createSub(): ReturnType<typeof createModelSubMenu>
  /** The box both cards hang from: the seat box, with the trigger as its stand-in. */
  anchor(): HTMLElement | null
  /** The trigger the open card hands the focus back to on close. */
  trigger(): HTMLButtonElement | null
  /** Independent registry identity for a picker mounted outside the composer. */
  popoverKey?: string
  owner?: string
}) {
  const popoverKey = options.popoverKey ?? 'model'
  const owner = options.owner ?? 'composer'
  const popoverSelector = `.dsh-claude-model-popover[data-dsh-claude-model-owner="${owner}"]`
  let modelPop: HTMLElement | null = null
  let modelSubPop: HTMLElement | null = null
  let modelBody: HTMLElement | null = null
  let modelFooter: HTMLElement | null = null
  /** Level 2's content: the search field and the list it filters (features/model/sub-menu.ts). */
  let modelSub: ReturnType<typeof createModelSubMenu> | null = null
  /**
   * The picker is two cards wide, and the level-2 card only cancels a pending
   * close once the pointer is ON it — so the grace has to cover the journey
   * from a level-1 row, across the gap, onto the sub card. At the shared 100ms
   * a slow traverse ran it out and both cards folded up mid-journey.
   */
  const MODEL_CLOSE_DELAY = 150
  /** Pending fold of level 2 while the pointer is still crossing level 1. */
  let subFoldTimer: ReturnType<typeof setTimeout> | null = null

  function cancelCloseModel() {
    modelHoverIntent.cancel()
    if (subFoldTimer !== null) {
      clearTimeout(subFoldTimer)
      subFoldTimer = null
    }
  }

  /** Whether the hover preference covers this picker: the `all` scope alone. */
  function hoverOn() {
    return readPrefs().autoPopover === AUTO_POPOVER_ALL
  }

  function scheduleCloseModel() {
    modelHoverIntent.scheduleClose()
  }

  /**
   * Where the pointer last was, tracked only while a card is up. The two cards
   * are separate boxes with a sliver of desktop between them, and a pointer
   * crossing that sliver has not left the picker — without this the grace
   * simply runs out mid-gap and both cards fold.
   */
  let pointer: { x: number, y: number } | null = null
  let pointerBound = false
  function trackPointer(event: MouseEvent) {
    pointer = { x: event.clientX, y: event.clientY }
  }
  function trackPointerWhileOpen() {
    const wanted = modelPop !== null && modelPop.getAttribute('data-open') === 'true'
    if (wanted === pointerBound) return
    if (!wanted) {
      unbindPointerTracking()
      return
    }
    pointerBound = true
    document.addEventListener('mousemove', trackPointer, true)
  }

  /**
   * Take the pointer watch off the document. The open card is the only thing
   * that asks for it, so it goes with the card: a generation torn down while
   * the card stands would otherwise leave this listener, and the closure
   * behind it, on the document for the page's life.
   */
  function unbindPointerTracking() {
    if (!pointerBound) return
    document.removeEventListener('mousemove', trackPointer, true)
    pointerBound = false
    pointer = null
  }

  /** True while the tracked pointer sits within one card's box, with the same
   *  8px band of desktop around it that covers the sliver of gap between the
   *  two cards. */
  function pointerInCardBox(card: HTMLElement | null) {
    if (pointer === null || card === null) return false
    if (card.getAttribute('data-open') !== 'true') return false
    const box = card.getBoundingClientRect()
    return pointer.x >= box.left - 8 && pointer.x <= box.right + 8 &&
           pointer.y >= box.top - 8 && pointer.y <= box.bottom + 8
  }

  /** True while the pointer sits in either card, or in the gap between them. */
  function pointerInPicker() {
    return pointerInCardBox(modelPop) || pointerInCardBox(modelSubPop)
  }

  /** Close on leave, but treat the gap between the two cards as still inside. */
  function closeModelIfAway() {
    // A reader typing in the level-2 field is still using the card: the pointer
    // leaving the box it sits in does not fold it out from under their hands.
    // A press elsewhere and the Escape key are what close it then.
    if (modelSub !== null && modelSub.focused()) return
    if (pointerInPicker()) {
      scheduleCloseModel()
      return
    }
    closeModelPopovers()
  }

  // The picker takes part in the shared popover rule (shared/popover.ts): one
  // entry for BOTH levels, so opening the More-models card never folds the
  // card that carries it.
  const modelHoverIntent = createHoverIntent(openModelPopover, closeModelIfAway, POPOVER_OPEN_DELAY, MODEL_CLOSE_DELAY)
  registerPopover(popoverKey, closeModelPopovers)

  function closeModelPopovers() {
    cancelCloseModel()
    if (modelSub !== null) modelSub.forget()
    if (modelPop) setMenuPopoverOpen(modelPop, false, options.trigger())
    if (modelSubPop) setMenuPopoverOpen(modelSubPop, false)
  }

  function openModelPopover() {
    cancelCloseModel()
    // One card at a time: the second level is this same choice and stays,
    // every other popover folds (the level's card hangs from the same box, so
    // leaving it up would stack two panels over one corner).
    closeOtherPopovers(popoverKey)
    if (modelSubPop) setMenuPopoverOpen(modelSubPop, false)
    // A card opening repaints from scratch: its countdowns were drawn at
    // whatever minute it was last on screen, and a closed card is not part of
    // any signature (rateSignature).
    options.onOpen()
    positionModelPopovers()
    if (modelPop) setMenuPopoverOpen(modelPop, true, options.trigger())
  }

  function openModelSub(focusField?: boolean) {
    cancelCloseModel()
    // Open BEFORE placing: the placement pass reads the sub card only while
    // it is marked open, so positioning first would skip it and leave the
    // card at its previous position — every open has to place it fresh.
    if (modelSubPop) setMenuPopoverOpen(modelSubPop, true)
    if (modelSub !== null) {
      modelSub.reset()
      modelSub.render()
      // A press on the More-models cell is a reader asking to look a model up:
      // the field takes the focus. A card the hover opened leaves the focus
      // where the reader had it, since they asked for nothing.
      if (focusField === true) modelSub.focus()
    }
    positionModelPopovers()
  }

  function positionModelPopovers() {
    trackPointerWhileOpen()
    const anchor = options.anchor()
    if (!anchor || !modelPop) return
    // From the box, not the model's button: it is the row's one item and its
    // right edge is what both cards hang from (seat-box.ts).
    const pos = positionAnchoredPopover(anchor, modelPop, { side: 'above', gap: 6 })
    if (modelSubPop && modelSubPop.getAttribute('data-open') === 'true') {
      const w2 = modelSubPop.offsetWidth
      const h2 = modelSubPop.offsetHeight
      const h1 = modelPop.offsetHeight
      // The window in the same pixels as the two cards' sizes and the
      // position the first level just took (shared/page-zoom.ts).
      const viewport = pageViewport()
      // Beside the first level; flip to its left when the viewport is tight.
      let x2 = pos.x + modelPop.offsetWidth + 2
      if (x2 + w2 > viewport.width - POPOVER_MARGIN) x2 = Math.max(POPOVER_MARGIN, pos.x - 4 - w2)
      // Bottom-aligned with the first level; a level 2 TALLER than level 1
      // keeps its top instead, so it cannot push itself off the top edge.
      let y2 = pos.y + Math.max(0, h1 - h2)
      y2 = Math.max(POPOVER_MARGIN, Math.min(y2, viewport.height - h2 - POPOVER_MARGIN))
      modelSubPop.style.left = `${x2}px`
      modelSubPop.style.top = `${y2}px`
    }
  }

  /** Whether this call built either card's nodes fresh; the caller drops its render signature. */
  function ensureModelChrome() {
    let rebuilt = false
    // Idempotence guard, not just a null check: the picker's own teardown
    // sweep, or a hot-reload generation's stray sweep, can REMOVE the
    // popover node while the closure still references it. With a null-only
    // check the reference stays non-null-but-detached and is never rebuilt
    // — the trigger then toggles a popover that is not in the document and
    // the picker silently loses its click effect. The account footer's
    // equivalent guard (footArea.contains) is the established pattern.
    // Rebuilding also re-points the body and footer children; the rebuild is
    // answered to the caller, whose next paint drops its render signature and
    // fills the fresh nodes before the card can be seen.
    if (modelPop === null || modelPop.parentElement === null) {
      rebuilt = true
      modelPop = document.createElement('div')
      modelPop.className = 'dsh-claude-popover-card dsh-claude-model-popover'
      modelPop.setAttribute('data-dsh-claude-model-owner', owner)
      setMenuPopoverOpen(modelPop, false)
      modelBody = document.createElement('div')
      modelBody.className = 'dsh-claude-popover-body'
      modelPop.appendChild(modelBody)
      modelFooter = document.createElement('div')
      modelFooter.className = 'dsh-claude-model-footer'
      modelPop.appendChild(modelFooter)
      modelPop.addEventListener('mouseenter', cancelCloseModel)
      // The second level belongs to its More-models cell: while it is open,
      // the pointer landing anywhere else on the first level (a model row,
      // bare card) folds it — the first level itself stays open, it is the
      // hover-intent host. Delegated mouseover, not mouseenter: moving from
      // the cell to a model row never crosses the popover's boundary, so a
      // boundary event would never fire.
      modelPop.addEventListener('mouseover', e => {
        if (modelSubPop === null || modelSubPop.getAttribute('data-open') !== 'true') return
        if (closestFrom(e.target, '.dsh-claude-model-cell')) return
        // Delayed, not immediate: the sub card sits BESIDE level 1, so a
        // pointer on its way from the cell to the sub crosses level 1's own
        // rows — folding on the spot made that journey impossible at any
        // speed. Folding now waits out the same grace, and stands down only
        // when the pointer has meanwhile reached the sub card itself: the
        // pointer still being on level 1 means it left the More-models cell,
        // which is exactly when level 2 folds.
        if (subFoldTimer !== null) clearTimeout(subFoldTimer)
        subFoldTimer = setTimeout(() => {
          subFoldTimer = null
          if (pointerInCardBox(modelSubPop)) return
          if (modelSubPop !== null) setMenuPopoverOpen(modelSubPop, false)
        }, MODEL_CLOSE_DELAY)
      })
      modelPop.addEventListener('mouseleave', scheduleCloseModel)
      document.body.appendChild(modelPop)
    }
    if (modelSubPop === null || modelSubPop.parentElement === null) {
      rebuilt = true
      modelSubPop = document.createElement('div')
      modelSubPop.className = 'dsh-claude-popover-card dsh-claude-model-popover dsh-claude-model-popover-sub'
      modelSubPop.setAttribute('data-dsh-claude-model-owner', owner)
      setMenuPopoverOpen(modelSubPop, false)
      modelSub = options.createSub()
      // The field is pinned above the list: the reader sees what they typed
      // while they scroll the matches under it, the way level 1 keeps its
      // footer still. Only the body scrolls (the sheet).
      modelSubPop.appendChild(modelSub.head)
      modelSubPop.appendChild(modelSub.body)
      // The card holds the reader's typing, so a press anywhere inside it must
      // not be read as a press outside: the scheduler's own `owns` covers it.
      modelSubPop.addEventListener('mouseenter', cancelCloseModel)
      modelSubPop.addEventListener('mouseleave', scheduleCloseModel)
      document.body.appendChild(modelSubPop)
    }
    return rebuilt
  }

  /**
   * The More-models cell drills in on the same dwell/grace as the trigger. Held
   * here rather than built inside the returned object, so dispose can cancel a
   * dwell still waiting: its timer would otherwise fire into a feature that has
   * been torn down and open a card nothing owns.
   */
  const subIntent = createHoverIntent(openModelSub, closeModelIfAway, POPOVER_OPEN_DELAY, MODEL_CLOSE_DELAY)

  return {
    /** Level 1's scrolling body, for the pass that paints the rows. */
    body: () => modelBody,
    /** Level 1's footer: the divider and the More-models row. */
    footer: () => modelFooter,
    /** The level-1 card node, for the pass's stray sweep and open test. */
    popover: () => modelPop,
    /** The level-2 card node, for the pass's stray sweep and open test. */
    subPopover: () => modelSubPop,
    /** Level 2's content module, or null before its card is built. */
    sub: () => modelSub,
    mainOpen() { return modelPop !== null && modelPop.getAttribute('data-open') === 'true' },
    subOpen() { return modelSubPop !== null && modelSubPop.getAttribute('data-open') === 'true' },
    hoverOn,
    scheduleOpenMain: () => modelHoverIntent.scheduleOpen(),
    scheduleClose: scheduleCloseModel,
    subIntent,
    openMain: openModelPopover,
    openSub: openModelSub,
    closeAll: closeModelPopovers,
    position: positionModelPopovers,
    ensureChrome: ensureModelChrome,
    sweep() { removeStrayNodes(document, popoverSelector, [modelPop, modelSubPop]) },
    /** Take both cards out of the document and forget their nodes; the seat is the pass's to sweep. */
    dropNodes() {
      removeStrayNodes(document, popoverSelector, [])
      modelPop = null
      modelSubPop = null
      modelBody = null
      modelFooter = null
      modelSub = null
      unbindPointerTracking()
      cancelCloseModel()
    },
    /** Leave the shared popover registry, with no dwell left waiting to open a card. */
    dispose() {
      subIntent.cancel()
      unregisterPopover(popoverKey)
    },
  }
}
