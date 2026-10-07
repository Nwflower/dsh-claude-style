import { COMPOSER_ATTR, COMPOSER_HIDDEN_ATTR, HOME_LAYOUT_STUDIO } from '../../constants'
import { COMPOSER_STACK, closestComposerCard, findAccessTrigger, findComposerCards, findComposerPlaceholder } from '../../core/host'
import { composerRestyleRetired, readPrefs } from '../../core/prefs'
import type { HostContext } from '../../core/host'
import type { FeatureHandle, Ui } from '../../core/scheduler'
import { closestFrom, setAttributeIfChanged } from '../../shared/dom'
import { writeScroll } from '../../shared/scroll-owner'

/** What other features read off the composer's reading (ui.composer). */
export interface ComposerHandle extends FeatureHandle {
  isHero(): boolean
  heroCard(): HTMLElement | null
  isActive(): boolean
}

/**
 * The composer's own layout: one feature for the whole input area.
 *
 * Each pass starts here. It reads the page's composer state once — whether
 * the host shows the hero composer, and whether the restyle applies to it —
 * and every other feature reads that answer through `ui.composer` for the
 * rest of the pass. From the same reading it writes what the stylesheet
 * keys on: the hero/inline variant on the cards and their stack, the
 * composer gate on <body>, the attachment state and tiles, the context
 * meter's stamp and room, and whether the chat tab (the composer's only
 * view) is up. The scheduler triggers its two behaviours through hooks: a
 * press on the inline card focuses the editor, and the transcript follows
 * the card when it changes height.
 */
export function install(ctx: HostContext, ui: Ui) {
  /** Whether the page shows the hero composer, as of the last reading. */
  let hero = false
  /** Whether the composer restyle applies to the page shown, as of the last reading. */
  let active = false
  /** Whether the studio home layout owns the hero page, as of the last reading. */
  let studioHome = false
  /** The hero page's composer card, or null off the hero page, as of the last pass. */
  let heroCard: HTMLElement | null = null

  /**
   * Read the page's composer state. The host marks the conversation root
   * `data-phase="hero"` exactly when it renders the hero composer (no
   * session yet, or a blank one), so that marker is the whole test; the
   * composer-scope preference then decides whether the restyle covers the
   * page.
   */
  function readState() {
    hero = document.querySelector('[data-phase="hero"]') !== null
    const scope = readPrefs().composerScope
    active = !composerRestyleRetired && (scope === 'all' || (hero ? scope === 'hero' : scope === 'conversation'))
    studioHome = hero && readPrefs().homeLayout === HOME_LAYOUT_STUDIO
  }

  /**
   * Mirror the variant onto every card and its composerStack ancestor, so
   * stack-scoped rules read an attribute instead of re-deriving hero/inline
   * through :has() on every DOM mutation. Write only when the value differs
   * (re-setting the same value still invalidates the element's styles), and
   * once per stack even when several cards share one.
   *
   * The studio home layout draws its composer in the conversation's
   * single-line form, so a studio hero page stamps `inline`, not `hero`.
   */
  function syncVariant(cards: NodeListOf<HTMLElement>) {
    const value = hero && !studioHome ? 'hero' : 'inline'
    const stacks = new Set<Element>()
    for (const card of cards) {
      setAttributeIfChanged(card, 'data-composer-variant', value)
      const stack = card.closest(COMPOSER_STACK)
      if (stack !== null) stacks.add(stack)
    }
    for (const stack of stacks) setAttributeIfChanged(stack, 'data-composer-variant', value)
  }

  /**
   * The attachment rails inside a card (ui-attachment): the shell rail and
   * its scrolling inner rail, both `_rail`.
   */
  const ATTACHMENT_RAIL = '[class*="_rail"]'
  /**
   * Anything in a card that means it carries attachments: an image tile
   * (`_imageItem`, `_thumbnail`), or any item, image or file card
   * (FileCard's `_card`) on a rail.
   */
  const ATTACHMENT_PRESENT = `[class*="_imageItem"], [class*="_thumbnail"], ${ATTACHMENT_RAIL} :is([class*="_item"], img, [class*="_card"])`
  /**
   * The attachment tiles the stylesheet reshapes into thumbnails. They are
   * found here once per pass and marked, so the rules read one attribute
   * instead of re-running this list, with its structural :has(img), on
   * every DOM change.
   */
  const ATTACHMENT_TILES = `${ATTACHMENT_RAIL} :is([class*="_imageItem"], [class*="_thumbnail"], [class*="_item"]:has(img), [class*="_card"]:has(img))`
  const ATTACHMENT_TILE_ATTR = 'data-dsh-claude-attachment'

  /** Mark the cards that carry attachments, and the tiles inside them. */
  function syncAttachments(cards: NodeListOf<HTMLElement>) {
    const tiles = new Set<Element>()
    for (const card of cards) {
      const carries = active && card.querySelector(ATTACHMENT_PRESENT) !== null
      if (carries) {
        setAttributeIfChanged(card, 'data-has-attachments', 'true')
        for (const tile of card.querySelectorAll(ATTACHMENT_TILES)) tiles.add(tile)
      } else {
        card.removeAttribute('data-has-attachments')
      }
    }
    for (const marked of document.querySelectorAll(`[${ATTACHMENT_TILE_ATTR}]`)) {
      if (!tiles.has(marked)) marked.removeAttribute(ATTACHMENT_TILE_ATTR)
    }
    for (const tile of tiles) tile.toggleAttribute(ATTACHMENT_TILE_ATTR, true)
  }

  const CONTROL_ATTR = 'data-dsh-claude-control'

  /**
   * Mark each host control on the composer with what it is, so the
   * stylesheets key on `data-dsh-claude-control` instead of the host's
   * button text — text that changes with the shell language and with each
   * host release. Read from the host's structure (InputBar):
   *   commands — the tools row's `+`, the one button that opens a listbox;
   *   stop / send — the trailing row's primary buttons, told apart by their
   *     glyph: stop draws a rect, the submit arrow a path (queue and steer
   *     are the same submit button under another label);
   *   access — the button the permission slot renders (host.ts).
   */
  function syncControls(cards: NodeListOf<HTMLElement>) {
    for (const card of cards) {
      const commands = card.querySelector('[class*="_tools"] button[aria-haspopup="listbox"]')
      if (commands !== null) setAttributeIfChanged(commands, CONTROL_ATTR, 'commands')
      for (const button of card.querySelectorAll('[class*="_trailing"] button[class*="_primary"]')) {
        setAttributeIfChanged(button, CONTROL_ATTR, button.querySelector('svg rect') !== null ? 'stop' : 'send')
      }
    }
    const access = findAccessTrigger()
    if (access !== null) setAttributeIfChanged(access, CONTROL_ATTR, 'access')
  }

  const DRAFT_EMPTY_ATTR = 'data-dsh-claude-draft-empty'

  /**
   * Mark the cards whose draft is empty. The host's editor shows its
   * placeholder exactly then (DraftEditor's `data-composer-placeholder`),
   * and the send button's ghost and ready looks key on this mark — as a
   * stylesheet test (`card:has(placeholder) button`) it made every DOM
   * change re-match the whole document. The placeholder comes and goes as a
   * DOM change, so the pass that follows it moves the mark in the same frame.
   */
  function syncDraftState(cards: NodeListOf<HTMLElement>) {
    for (const card of cards) card.toggleAttribute(DRAFT_EMPTY_ATTR, findComposerPlaceholder(card) !== null)
  }

  /**
   * The composer's dock line, which the host renders right after the card
   * (a notice line, when there is one, sits before it).
   */
  function composerDock(card: Element) {
    return card.nextElementSibling
  }

  /**
   * The meter the host parks in that dock, or null when it is not there.
   * Its trigger is told apart by its glyph (ui-conversation ContextMeter):
   * the dialog trigger that draws a ring of `<circle>`s; the stats pills
   * draw none.
   */
  function dockedContextMeter(dock: Element | null) {
    if (dock === null) return null
    for (const trigger of dock.querySelectorAll<HTMLElement>('button[aria-haspopup="dialog"]')) {
      if (trigger.querySelector(':scope > svg > circle') === null) continue
      let node: HTMLElement = trigger
      while (node.parentElement !== null && node.parentElement !== dock) node = node.parentElement
      return node
    }
    return null
  }

  /** The room the meter takes at the toolbar row's right end, as the row carries it. */
  let meterRoom = ''
  /** The meter node the room was measured from, and the reading and scope it had then. */
  let meterNode: HTMLElement | null = null
  let meterReading = ''
  let meterMeasuredActive = false
  let meterWidth = 0

  /**
   * Stamp the context-occupancy meter and keep its room on the toolbar row.
   *
   * The meter stays in the host's dock line, its native React parent: moving
   * it out crashed React's unmount (Node.removeChild). The stylesheet lays
   * the dock over the toolbar row and puts the meter at the row's right end,
   * after the model and effort triggers; the trailing cluster keeps that
   * room free through --dsh-claude-meter-room — the meter's width plus the
   * cluster's own 8px gap.
   *
   * The meter is re-resolved only when the cached node left the tree, and
   * its width is re-read only when its reading moved (the trigger IS the
   * percentage text, whose width follows the text): a pass with an unmoved
   * meter reads no layout, which during streaming would otherwise force one.
   * A reading taken with no box — the composer's seat is display: none while
   * another conversation tab is up — is no reading: it stays unrecorded, the
   * row keeps the room it has, and the next pass measures again.
   *
   * The write is decided against the value the document carries: a variable
   * another generation or feature cleared has to come back, and the
   * declaration is the cheapest thing to ask.
   */
  function stampContextMeter(card: HTMLElement | undefined) {
    if (meterNode !== null && !meterNode.isConnected) {
      meterNode = null
      meterReading = ''
      meterWidth = 0
    }
    let meter = meterNode
    if (card === undefined) meter = null
    else if (meter === null) meter = dockedContextMeter(composerDock(card))
    let room = ''
    if (meter !== null) {
      meter.toggleAttribute('data-dsh-claude-context-meter', true)
      const reading = meter.textContent || ''
      // Re-measure when the reading moved or the restyle scope flipped:
      // either can change what the room should be.
      if (reading !== meterReading || active !== meterMeasuredActive) {
        const width = active ? meter.offsetWidth : 0
        // A zero width with the restyle on is the composer having no box
        // right now, never a meter that takes no room.
        if (!active || width > 0) {
          meterReading = reading
          meterMeasuredActive = active
          meterWidth = width
        }
      }
      if (active) room = meterWidth > 0 ? `${meterWidth + 8}px` : meterRoom
    }
    meterNode = meter
    const written = document.body.style.getPropertyValue('--dsh-claude-meter-room')
    if (room === written) {
      meterRoom = room
      return
    }
    meterRoom = room
    if (room === '') document.body.style.removeProperty('--dsh-claude-meter-room')
    else document.body.style.setProperty('--dsh-claude-meter-room', room)
  }

  /**
   * The composer is chat-view-only. The host mounts the seat inside the
   * conversation root on every tab (轨迹 / 上下文 even reserve room for
   * it), so the skin reflects the active view on <body> and CSS drops the
   * whole bottom area unless the chat tab is selected.
   *
   * Scope: the conversation tablist lives in the panel header, which is
   * the root's first child — any other tablist (the trajectory detail
   * panel, say) renders later inside the ledger. The chat view registers
   * at order 0, so it is always the tablist's FIRST tab; reading that
   * tab's aria-selected is locale-independent. No tab bar at all (hero /
   * single view) means the chat surface is all there is.
   */
  function syncChatTabComposer() {
    const root = closestFrom(document.querySelector('[data-composer-seat]'), '[data-phase]')
    const list = root === null ? null : root.querySelector('[role="tablist"]')
    const first = list === null ? null : list.querySelector('[role="tab"]')
    const chatActive = first === null || first.getAttribute('aria-selected') === 'true'
    document.body.toggleAttribute(COMPOSER_HIDDEN_ATTR, active && !chatActive)
  }

  function syncComposer() {
    readState()
    const cards = findComposerCards()
    heroCard = hero && cards.length > 0 ? cards[0] : null
    syncVariant(cards)
    document.body.toggleAttribute(COMPOSER_ATTR, active)
    syncAttachments(cards)
    syncDraftState(cards)
    syncControls(cards)
    stampContextMeter(cards[0])
    syncChatTabComposer()
  }

  /**
   * A press on the inline card lands in its editor: the card's padding and
   * toolbar row surround a one-line field, and a press on the card that is
   * not one of its controls means the field.
   */
  function focusEditorOnPress(target: EventTarget | null) {
    const card = closestComposerCard(target, 'inline')
    if (!card) return
    if (closestFrom(target, 'button, [role="button"], [role="menu"], [role="radiogroup"], input, select')) return
    const input = card.querySelector<HTMLElement>('[data-composer-input]')
    if (input && document.activeElement !== input) {
      input.focus()
    }
  }

  /**
   * Keep a reader who was at the transcript's end there while the card
   * changes height: the card growing with a multi-line draft (or shrinking
   * back) moves the transcript's bottom edge without any scroll. Within
   * 150px of the end counts as at the end.
   */
  function followTranscript() {
    // ui-conversation marks its transcript scroller with this attribute.
    const scroller = document.querySelector('[data-conversation-scroll]')
    if (scroller === null) return
    const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    if (distance < 150) writeScroll(scroller, scroller.scrollHeight, 'composer')
  }

  ui.composer = {
    sync: syncComposer,
    /** Whether the page shows the hero composer, as of this pass. */
    isHero() { return hero },
    /** The hero page's composer card as of this pass, or null off the hero page. */
    heroCard() { return heroCard },
    /** Whether the composer restyle applies to the page shown, as of this pass. */
    isActive() { return active },
    /** A copy source changed, the composer-scope preference among them: read again now. */
    onCopyChange: readState,
    onPointerDown: focusEditorOnPress,
    /** The composer card changed size: the transcript follows it. */
    reposition(reason: 'viewport' | 'composer') {
      if (reason === 'composer') followTranscript()
    }
  }
  readState()

  return () => {
    active = false
    heroCard = null
    document.body.removeAttribute(COMPOSER_ATTR)
    document.body.removeAttribute(COMPOSER_HIDDEN_ATTR)
    const marks = ['data-composer-variant', 'data-has-attachments', ATTACHMENT_TILE_ATTR, DRAFT_EMPTY_ATTR, CONTROL_ATTR, 'data-dsh-claude-context-meter']
    for (const mark of marks) {
      for (const marked of document.querySelectorAll(`[${mark}]`)) marked.removeAttribute(mark)
    }
    if (meterRoom !== '') {
      meterRoom = ''
      document.body.style.removeProperty('--dsh-claude-meter-room')
    }
    meterNode = null
    meterReading = ''
    meterMeasuredActive = false
    meterWidth = 0
  }
}
