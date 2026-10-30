import { COMPOSER_ATTR, COMPOSER_HIDDEN_ATTR, HOME_LAYOUT_STUDIO, MOBILE_PORTRAIT_ATTR, TRANSCRIPT_ATTR } from '../../constants'
import { COMPOSER_ATTACHMENT_RAIL_SELECTOR, COMPOSER_CARD_SELECTOR, COMPOSER_INPUT_SELECTOR, COMPOSER_VARIANT_ATTRIBUTE, CONVERSATION_TABS_SELECTOR, MOBILE_PORTRAIT_SELECTOR, PHASE_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { conversationColumn } from '@dsh-claude-style/engine/chat-dom'
import { COMPOSER_STACK, closestComposerCard, findAccessTrigger, findComposerPlaceholder, findComposerSeat, findConversationScroller, findHeroRoot, observeComposerCards, observeComposerPlaceholders } from '@dsh-claude-style/engine/host'
import { composerRestyleRetired, readPrefs } from '../../core/prefs'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureHandle } from '@dsh-claude-style/engine/scheduler'
import type { FeatureUi } from '../../core/feature'
import type manifest from './composer.manifest'
import { closestFrom, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { writeScroll } from '@dsh-claude-style/engine/scroll-owner'
import { captureComposerCaret, composerComposing, focusKeepingComposerCaret } from '../../shared/composer-caret'
import { createPlaceholderCopy } from './placeholder-copy'
import { installWindowBlurMirror } from './selection-mirror'

/** What other features read off the composer's reading (ui.composer). */
export interface ComposerHandle extends FeatureHandle {
  isHero(): boolean
  heroCard(): HTMLElement | null
  isActive(): boolean
  isStudioHome(): boolean
  isChatHidden(): boolean
}

/**
 * The composer's own layout: one feature for the whole input area.
 *
 * Each pass starts here. It reads the page's composer state once — whether
 * the host shows the hero composer, and whether the restyle applies to it —
 * and every other feature reads that answer through `ui.composer` for the
 * rest of the pass. From the same reading it writes what the stylesheet
 * keys on: the hero/inline variant on the cards and their stack, the
 * composer gate on <body>, the attachment state and tiles, and whether the
 * chat tab (the composer's only view) is up. The scheduler triggers its
 * behaviours through hooks: a press on the inline card focuses the editor, a
 * composer input refreshes the hint's synthetic placeholder, and the transcript
 * follows the card when it changes height. The window-blur mirror the selection
 * paints key on and the idle hint's own words live here too — both read the
 * same card state this reading produces.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /** Whether the page shows the hero composer, as of the last reading. */
  let hero = false
  /** Whether the composer restyle applies to the page shown, as of the last reading. */
  let active = false
  /** Whether the studio home layout owns the hero page, as of the last reading. */
  let studioHome = false
  /** The hero page's composer card, or null off the hero page, as of the last pass. */
  let heroCard: HTMLElement | null = null
  /** The idle hint's own words, and the synthetic placeholder that carries them. */
  const cards = observeComposerCards()
  const placeholders = observeComposerPlaceholders()
  const placeholderCopy = createPlaceholderCopy(cards, placeholders, composerComposing)
  /**
   * The attachment tiles the skin marked, read once at install so a generation
   * whose teardown a hot reload dropped still has its marks swept.
   */
  const markedTiles = new Set<Element>(document.querySelectorAll(`[data-dsh-claude-attachment]`))
  /** The window-blur mirror the selection paints key on */
  const stopWindowBlur = installWindowBlurMirror()

  /**
   * A composition has landed: the hint's writes were held back while one was in
   * flight, and the host's own flag may still stand when this listener runs, so
   * the settle waits for the frame after it.
   */
  const onCompositionEnd = () => {
    requestFrame({ write() { placeholderCopy.settle(hero, active) } })
  }
  document.addEventListener('compositionend', onCompositionEnd, true)

  /**
   * Read the page's composer state. The host marks the conversation root
   * `data-phase="hero"` exactly when it renders the hero composer (no
   * session yet, or a blank one), so that marker is the whole test; the
   * composer-scope preference then decides whether the restyle covers the
   * page.
   */
  function readState() {
    // Read through the kept match: this runs on every pass, and on the
    // conversation page the hero marker is absent, so a bare query re-walked
    // the document every frame for an answer that only the host's own
    // re-render can change (D9).
    hero = findHeroRoot() !== null
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
  function syncVariant(cards: readonly HTMLElement[]) {
    const value = hero && !studioHome ? 'hero' : 'inline'
    const stacks = new Set<Element>()
    for (const card of cards) {
      setAttributeIfChanged(card, COMPOSER_VARIANT_ATTRIBUTE, value)
      const stack = card.closest(COMPOSER_STACK)
      if (stack !== null) stacks.add(stack)
    }
    for (const stack of stacks) setAttributeIfChanged(stack, COMPOSER_VARIANT_ATTRIBUTE, value)
  }

  /**
   * The attachment rails inside a card (ui-attachment): the shell rail and
   * its scrolling inner rail, both `_rail`, the local name the host's own
   * stylesheet carries. Nothing in the parts tables names the rail, so the
   * skin reads it by that local name here (D3).
   */
  const ATTACHMENT_RAIL = '[data-dsh-claude-part~="attachment-rail"]'
  /**
   * The shell rail as ui-attachment draws it, for a card whose nodes the parts
   * walk has not carried into a region yet: the element the host mounts after
   * the restyle was told the card carries no attachment.
   */
  const ATTACHMENT_SHELL_RAIL = COMPOSER_ATTACHMENT_RAIL_SELECTOR
  /**
   * Anything in a card that means it carries attachments: an image tile
   * (`_imageItem`, `_thumbnail`), or any item, image or file card
   * (FileCard's `_card`) on a rail.
   */
  const ATTACHMENT_PRESENT = `[data-dsh-claude-part~="attachment-image-item"], [data-dsh-claude-part~="attachment-thumbnail"], ${ATTACHMENT_RAIL} :is([data-dsh-claude-part~="attachment-item"], img, [data-dsh-claude-part~="composer-card-box"]), ${ATTACHMENT_SHELL_RAIL} :is([data-dsh-claude-part~="attachment-item"], [class*="_imageItem"], img, [data-dsh-claude-part~="composer-card-box"], [class*="_card"])`
  /**
   * The attachment tiles the stylesheet reshapes into thumbnails. They are
   * found here once per pass and marked, so the rules read one attribute
   * instead of re-running this list, with its structural :has(img), on
   * every DOM change.
   */
  const ATTACHMENT_TILES = `${ATTACHMENT_RAIL} :is([data-dsh-claude-part~="attachment-image-item"], [data-dsh-claude-part~="attachment-thumbnail"], [data-dsh-claude-part~="attachment-item"]:has(img), [data-dsh-claude-part~="composer-card-box"]:has(img))`
  const ATTACHMENT_TILE_ATTR = 'data-dsh-claude-attachment'
  /**
   * The card's attachment nodes, as the restyle looks for them. A card the host
   * has rebuilt holds them where neither the parts walk nor a class name says
   * so yet; the rail from the pass before is what says so then.
   */
  const ATTACHMENT_ANYWHERE = ':is([data-dsh-claude-part~="attachment-image-item"], [data-dsh-claude-part~="attachment-thumbnail"], [data-dsh-claude-part~="attachment-item"], [data-dsh-claude-part~="composer-card-box"], [class*="_imageItem"], [class*="_thumbnail"], [class*="_card"])'
  /**
   * The card a node was last seen holding attachments in, kept after the node
   * leaves the page: the host unmounts the rail and mounts it again as one
   * draft, and a rail the page has just lost is the card's own, on its way back.
   */
  const lastHolder = new WeakMap<Element, Element>()
  /** The nodes whose card that list answers for while they stand off the page, with the pass each was lost in. */
  const heldNodes = new Map<Element, number>()
  /** The passes run so far, so a lost rail answers for the one pass that reads the card next. */
  let passCount = 0

  /**
   * Mark the cards that carry attachments, and the tiles inside them, and keep
   * the rail that answers for a card the host has just rebuilt: the host unmounts
   * the rail and mounts it again as one draft, so the pass that reads the card
   * after that commit finds the rail in the node list every matched node's
   * holder was read to.
   */
  function syncAttachments(cards: readonly HTMLElement[]) {
    passCount += 1
    const tiles = new Set<Element>()
    for (const card of cards) {
      const held = [...heldNodes.keys()].some(node => lastHolder.get(node) === card)
      const carries = active && (card.querySelector(ATTACHMENT_PRESENT) !== null || held)
      if (carries) {
        setAttributeIfChanged(card, 'data-has-attachments', 'true')
        for (const tile of card.querySelectorAll(ATTACHMENT_TILES)) tiles.add(tile)
      } else {
        card.removeAttribute('data-has-attachments')
      }
    }
    // The skin wrote every mark, so the sweep reads its own registry (D40)
    // rather than querying the document for the attribute each pass.
    for (const marked of markedTiles) {
      if (tiles.has(marked) && marked.isConnected) continue
      if (marked.isConnected) marked.removeAttribute(ATTACHMENT_TILE_ATTR)
      markedTiles.delete(marked)
    }
    for (const tile of tiles) {
      tile.toggleAttribute(ATTACHMENT_TILE_ATTR, true)
      markedTiles.add(tile)
    }
    // The rail answering for a card in the middle of a rebuild is the one the
    // page has just lost: it answers for the pass that reads the card after
    // the commit, and a node back on the page keeps its card from then on.
    for (const [node, lostIn] of [...heldNodes]) {
      if (node.isConnected || lostIn < passCount - 1) heldNodes.delete(node)
    }
    if (!active) heldNodes.clear()
    for (const card of cards) {
      for (const node of card.querySelectorAll(ATTACHMENT_ANYWHERE)) {
        lastHolder.set(node, card)
        if (!node.isConnected && !heldNodes.has(node)) heldNodes.set(node, passCount)
      }
    }
  }

  const CONTROL_ATTR = 'data-dsh-claude-control'
  /**
   * The card's primary button, as the host draws it: the trailing row's button
   * the parts walk marked as the composer's primary one.
   */
  const PRIMARY_SELECTOR = '[data-dsh-claude-part~="trailing"] button[data-dsh-claude-part~="composer-primary"]'

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
  function syncControls(cards: readonly HTMLElement[]) {
    for (const card of cards) {
      const commands = card.querySelector('[data-dsh-claude-part~="tools"] button[aria-haspopup="listbox"]')
      if (commands !== null) setAttributeIfChanged(commands, CONTROL_ATTR, 'commands')
      for (const button of card.querySelectorAll(PRIMARY_SELECTOR)) {
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
  function syncDraftState(cards: readonly HTMLElement[]) {
    for (const card of cards) card.toggleAttribute(DRAFT_EMPTY_ATTR, findComposerPlaceholder(card) !== null)
  }

  /** The conversation root carrying COMPOSER_HIDDEN_ATTR right now, or null. */
  let hiddenRoot: Element | null = null
  /** The conversation root carrying TRANSCRIPT_ATTR right now, or null. */
  let transcriptRoot: Element | null = null
  /** Whether the composer is restyled but the chat tab is not up, as of the last pass. */
  let chatHidden = false
  /** The cards carrying MOBILE_PORTRAIT_ATTR right now. */
  const portraitCards = new Set<HTMLElement>()

  /**
   * The two marks the conversation root carries for the composer's place.
   *
   * The composer is chat-view-only. The host mounts the seat inside the
   * conversation root on every tab (轨迹 / 上下文 even reserve room for
   * it), so the skin reflects the active view on that root and CSS drops the
   * whole bottom area unless the chat tab is selected. The mark rides the
   * root rather than <body>, so a tab switch invalidates the conversation's
   * subtree alone (D9).
   *
   * Scope: the conversation's view tablist is the one the host marks. Any
   * other tablist in the root — the trajectory detail panel, a plugin's
   * popover in the composer's toolbar — switches no view, and on the hero
   * page it would be the only tablist there is. The chat view registers at
   * order 0, so it is always the tablist's FIRST tab; reading that tab's
   * aria-selected is locale-independent. No tab bar at all (hero / single
   * view) means the chat surface is all there is.
   *
   * The second mark says the transcript is mounted. The host grants the
   * seat's pin, the bar behind the card and the view area's content-sized
   * height from `data-phase="active"` alone, so a phase mark landing on
   * `hero` or `settling` with the column already up drops all three and leaves
   * the composer standing in the middle of the rows, which paint on below it
   * (inline.css follows this mark as it follows the phase). Written only while
   * the restyle covers the page: the sheet holding those rules is dropped
   * whole otherwise.
   */
  function syncRootMarks() {
    const root = closestFrom(findComposerSeat(), `[${PHASE_ATTRIBUTE}]`)
    const list = root === null ? null : root.querySelector(CONVERSATION_TABS_SELECTOR)
    const first = list === null ? null : list.querySelector('[role="tab"]')
    const chatActive = first === null || first.getAttribute('aria-selected') === 'true'
    chatHidden = active && !chatActive
    if (root !== hiddenRoot) {
      hiddenRoot?.removeAttribute(COMPOSER_HIDDEN_ATTR)
      hiddenRoot = root
    }
    hiddenRoot?.toggleAttribute(COMPOSER_HIDDEN_ATTR, chatHidden)
    if (root !== transcriptRoot) {
      transcriptRoot?.removeAttribute(TRANSCRIPT_ATTR)
      transcriptRoot = root
    }
    transcriptRoot?.toggleAttribute(TRANSCRIPT_ATTR, active && conversationColumn() !== null)
  }

  /**
   * The portrait layer a mobile remote plugin applies to the desktop GUI (D3):
   * it floats the composer's controls with transforms of its own, so the
   * stylesheet scopes the skin's own placement of the send and stop buttons by
   * this mark, carried on the cards themselves. Read every pass — the layer
   * installs and reverts with the viewport.
   */
  function syncMobilePortrait(found: readonly HTMLElement[]) {
    const portrait = active && document.body.matches(MOBILE_PORTRAIT_SELECTOR)
    const next = new Set(portrait ? found : [])
    for (const card of portraitCards) if (!next.has(card)) card.removeAttribute(MOBILE_PORTRAIT_ATTR)
    for (const card of next) card.toggleAttribute(MOBILE_PORTRAIT_ATTR, true)
    portraitCards.clear()
    for (const card of next) portraitCards.add(card)
  }

  function syncComposer() {
    readState()
    const found = cards.all()
    heroCard = hero && found.length > 0 ? found[0] : null
    syncVariant(found)
    document.body.toggleAttribute(COMPOSER_ATTR, active)
    syncMobilePortrait(found)
    syncAttachments(found)
    // Before the draft mark: the hint the skin adds is part of what "empty"
    // means to the stylesheet's `card:has(placeholder)` rules.
    placeholderCopy.sync(hero, active)
    syncDraftState(found)
    syncControls(found)
    syncRootMarks()
  }

  /**
   * Whether a card already carries the marks the frame that paints it reads:
   * the variant the stylesheet keys on, and the control mark on the primary
   * button. A card with no primary button has nothing left to mark.
   */
  function markedForPaint(card: HTMLElement) {
    if (!card.hasAttribute(COMPOSER_VARIANT_ATTRIBUTE)) return false
    const primary = card.querySelector(PRIMARY_SELECTOR)
    return primary === null || primary.hasAttribute(CONTROL_ATTR)
  }

  /**
   * The cards a batch brought in: the card an added node stands in, and the
   * cards inside an added node. The batch's own records name them, so the
   * document is never walked for them (D9).
   */
  function addedCards(records: readonly MutationRecord[]) {
    const cards = new Set<HTMLElement>()
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue
        const owner = node.closest<HTMLElement>(COMPOSER_CARD_SELECTOR)
        if (owner !== null) cards.add(owner)
        for (const card of node.querySelectorAll<HTMLElement>(COMPOSER_CARD_SELECTOR)) cards.add(card)
      }
    }
    return [...cards]
  }

  /**
   * Put the marks a mounted card needs on it before the browser paints (#188).
   *
   * The scheduler's pass lands on the frame after the one a batch paints in,
   * and a batch the size of a session switch is dispatched after that frame's
   * paint (engine/bus.ts): a card left for the pass draws one frame in the
   * host's own look — a filled send button and its own edge — and the skin's
   * transition into its own look takes a few hundred milliseconds more.
   *
   * This subscription asks for `beforePaint`, so it runs inside every batch's
   * own callback and writes what that frame paints (#189). The cards are taken
   * off the batch's own records and not off `cards`: the registry behind
   * `observeMatches` listens without `beforePaint`, so on a large batch it
   * is a task late and the card this batch mounted is not in its list yet.
   */
  const stopMutations = subscribeMutations(document.body, { childList: true, subtree: true, beforePaint: true }, (records) => {
    const pending = addedCards(records).filter(card => !markedForPaint(card))
    if (pending.length === 0) return
    readState()
    document.body.toggleAttribute(COMPOSER_ATTR, active)
    syncVariant(pending)
    syncDraftState(pending)
    syncControls(pending)
  })

  /**
   * A press on the inline card lands in its editor: the card's padding and
   * toolbar row surround a one-line field, and a press on the card that is
   * not one of its controls means the field.
   */
  function focusEditorOnPress(target: EventTarget | null) {
    const card = closestComposerCard(target, 'inline')
    if (!card) return
    if (closestFrom(target, 'button, [role="button"], [role="menu"], [role="radiogroup"], input, select')) return
    const input = card.querySelector<HTMLElement>(COMPOSER_INPUT_SELECTOR)
    if (input === null || document.activeElement === input) return
    // The host's own press handling settles the caret after this listener,
    // and a focus taken here would pre-empt it and re-home the selection to
    // the start of the draft. The press settles first; this focuses only when
    // nothing else did, carrying the selection across.
    const caret = captureComposerCaret(input.ownerDocument)
    requestFrame({
      write() {
        if (!input.isConnected || document.activeElement === input) return
        focusKeepingComposerCaret(input, caret)
      },
    })
  }

  /**
   * Keep a reader who was at the transcript's end there while the card
   * changes height: the card growing with a multi-line draft (or shrinking
   * back) moves the transcript's bottom edge without any scroll. Within
   * 150px of the end counts as at the end.
   */
  function followTranscript() {
    const scroller = findConversationScroller()
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
    /** Whether the studio home layout owns the hero page, as of this pass. */
    isStudioHome() { return studioHome },
    /** Whether the composer is restyled but the chat tab is not up, as of this pass. */
    isChatHidden() { return chatHidden },
    /** A copy source changed, the composer-scope preference among them: read again now. */
    onCopyChange: readState,
    /** A composer input: the hint's synthetic placeholder may have changed, unless a composition holds it. */
    onInput() { placeholderCopy.onInput(hero, active) },
    onPointerDown: focusEditorOnPress,
    /** The composer card changed size: the transcript follows it. */
    reposition(reason: 'viewport' | 'composer') {
      if (reason === 'composer') followTranscript()
    }
  }
  readState()

  return () => {
    stopMutations()
    active = false
    heroCard = null
    stopWindowBlur()
    document.removeEventListener('compositionend', onCompositionEnd, true)
    placeholderCopy.dispose()
    cards.release()
    placeholders.release()
    document.body.removeAttribute(COMPOSER_ATTR)
    hiddenRoot?.removeAttribute(COMPOSER_HIDDEN_ATTR)
    hiddenRoot = null
    transcriptRoot?.removeAttribute(TRANSCRIPT_ATTR)
    transcriptRoot = null
    chatHidden = false
    for (const card of portraitCards) card.removeAttribute(MOBILE_PORTRAIT_ATTR)
    portraitCards.clear()
    const marks = ['data-composer-variant', 'data-has-attachments', ATTACHMENT_TILE_ATTR, DRAFT_EMPTY_ATTR, CONTROL_ATTR]
    for (const mark of marks) {
      for (const marked of document.querySelectorAll(`[${mark}]`)) marked.removeAttribute(mark)
    }
  }
}
