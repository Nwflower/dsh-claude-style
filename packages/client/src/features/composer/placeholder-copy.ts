import { COMPOSER_PLACEHOLDER_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { findComposerInput } from '@dsh-claude-style/engine/host'
import type { MatchList } from '@dsh-claude-style/engine/bus'
import { activeLocale, copyIn, COPY_FALLBACK_LOCALE } from '../../core/i18n'
import type { CopyEntries } from '../../core/i18n'
import COPY from './composer.copy.json'

/** This feature's copy, as a table of lines rather than of keys (composer.copy.json). */
const ENTRIES: CopyEntries = COPY

/** The mark that tells the skin's own placeholder from the host's (its teardown swears by it). */
const SYNTHETIC_ATTR = 'data-dsh-synthetic-placeholder'
/** The host's hint as the composer card carries it, the skin's stand-in among them. */
const HINT_ATTRIBUTE = '[data-composer-placeholder]'
/** The composer pass's mark on a card holding attachments, which is when the host draws no hint. */
const ATTACHED_ATTR = 'data-has-attachments'
/** The pass that drew a stand-in, so the pass right after it leaves the stand-in standing. */
const DRAWN_ATTR = 'data-dsh-claude-drawn'

/**
 * Replace a host hint's words without taking the host's own nodes with them.
 *
 * The host stopped drawing its hint as a bare text run: it now renders the
 * sentence through a slot chain, so the element that carries
 * `data-composer-placeholder` holds a React-owned element — a slot anchor —
 * somewhere in its subtree, and the words themselves sit inside that anchor.
 * Writing `textContent` on the hint drops every child, the anchor included,
 * and React then throws `NotFoundError: Failed to execute 'removeChild'` when
 * it unmounts the hint. That exception is raised inside the composer's own
 * render, crashing the `conversation.composer.bar` slot entry until reload.
 *
 * So the words are written into the deepest first text node the hint holds,
 * and every element is left where React put it. A hint with no text node of
 * its own — a bare anchor whose text is still being committed — is not
 * rewritten, because writing there would be the same destruction one level
 * down: the pass after it writes again once the text has arrived.
 *
 * @param node - the hint element, the host's own or the skin's stand-in.
 * @param text - the words to show.
 * @returns whether the words were written.
 */
function writeHintText(node: HTMLElement, text: string) {
  const target = findHintText(node)
  if (target === null) return false
  if (target.textContent !== text) target.textContent = text
  // The rest of the hint's text is the host's own copy of the same sentence
  // (a repeated chain slot); cleared so the reader sees one line, not two.
  for (const other of hintTextNodes(node)) {
    if (other !== target && other.textContent !== '') other.textContent = ''
  }
  return true
}

/** The first text node under a hint, depth first, or null while it holds none. */
function findHintText(node: Node): Text | null {
  const children = node.childNodes
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (child === null) continue
    if (child.nodeType === 3) return child as Text
    if (child.nodeType !== 1) continue
    const found = findHintText(child)
    if (found !== null) return found
  }
  return null
}

/** Every text node under a hint, in document order. */
function hintTextNodes(node: Node, out: Text[] = []): Text[] {
  const children = node.childNodes
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (child === null) continue
    if (child.nodeType === 3) out.push(child as Text)
    else if (child.nodeType === 1) hintTextNodes(child, out)
  }
  return out
}

/**
 * Shipped idle composer hints (zh / en, hero / default) this skin replaces:
 * the host's own two sentences, and the skin's two in each language.
 */
const HINT_SOURCES = [
  '描述你想要构建的内容',
  '发消息或创建任务',
  'Describe what you want to build',
  'Message or run a task',
  ENTRIES.heroHint.zh,
  ENTRIES.defaultHint.zh,
  ENTRIES.heroHint[COPY_FALLBACK_LOCALE],
  ENTRIES.defaultHint[COPY_FALLBACK_LOCALE],
]

/**
 * The composer's idle hint, in the skin's own words and the shell's language.
 *
 * The host draws its hint as one of the composer card's children, inside the
 * field's wrapper, and leaves it off in two card forms: one holding an
 * attachment, and one whose field answers for something else. The skin's own
 * words go where a shipped hint already stands, and where the host draws none
 * for a card the skin covers — the attachment form, a draft of images alone —
 * the skin adds its own hint (`data-dsh-synthetic-placeholder`).
 *
 * A commit of the host's runs several passes, and the pass after a stand-in's
 * write reads the card the way it did before: the stand-in carries the pass
 * that drew it, and only a later pass takes it back once the card has moved on.
 * Whether the card holds a hint of the host's is read on the card itself: the
 * bus may still hold a hint the page has already dropped.
 *
 * The words follow the shell's locale rather than the hint already on the
 * node, because a locale switch and a rebuild between two passes need not
 * arrive in one order: a writer that only moves a shipped hint across would
 * leave the previous language standing.
 *
 * A composition in flight over the field holds every write: the hint's nodes
 * stand in the card the reader's editor composes in, and a write there makes
 * the browser drop the letters typed but not committed. The settle after
 * compositionend is what puts the hint right.
 *
 * @param cards - the composer cards, kept current by the bus (D40).
 * @param placeholders - the placeholders those cards carry, from the same source.
 * @param composing - whether the reader's field is part-way through a composition.
 */
export function createPlaceholderCopy(cards: MatchList<HTMLElement>, placeholders: MatchList<HTMLElement>, composing: () => boolean) {
  /** How many passes this generation has run. */
  let pass = 0
  /** The shell's locale when the stand-in was last drawn. */
  let drawnLocale = ''
  /** Whether a composition in flight held a pass back, so the settle after it has work to do. */
  let held = false
  /**
   * The host's own hint text this generation replaced, with the skin's text it
   * was replaced by. The teardown and a restyle that stands down put the host's
   * words back; a node whose text no longer matches what was written is left
   * alone, because the host has re-rendered it since.
   */
  const replaced = new Map<HTMLElement, { original: string, written: string }>()

  /** Whether a placeholder's text is one of the hints this skin replaces. */
  function isShippedHint(text: string) {
    for (let j = 0; j < HINT_SOURCES.length; j++) {
      if (text.indexOf(HINT_SOURCES[j]) === 0) return true
    }
    return false
  }

  /**
   * Whether the card's field declares a shipped hint in the shell's language:
   * the field in the attachment form says the same sentence the host draws as a
   * placeholder, and its other sentences say why the field is closed.
   */
  function declaresShippedHint(input: HTMLElement) {
    const words = (input.getAttribute(COMPOSER_PLACEHOLDER_ATTRIBUTE) || '').trim()
    if (activeLocale().startsWith('zh')) return words !== '' && words === copyIn(ENTRIES, 'defaultHint', 'zh')
    return isShippedHint(words)
  }

  /** The words the skin's hint shows, in the shell's language. */
  function targetHint(hero: boolean) {
    return copyIn(ENTRIES, hero ? 'heroHint' : 'defaultHint', activeLocale())
  }

  /**
   * Whether a composition in flight keeps this pass from writing. The hint's
   * nodes stand in the card the reader's editor composes in, and a write there
   * under a composition makes the browser drop the letters typed but not
   * committed (composer.composing).
   */
  function heldByComposition() {
    if (!composing()) return false
    held = true
    return true
  }

  /** Put the hint in the words this page wants, now. */
  function write(hero: boolean, active: boolean) {
    held = false
    const target = targetHint(hero)
    rewriteHint(target, active)
    syncStandIn(target, active)
  }

  /**
   * Put the host's own hint back into every node this generation rewrote.
   *
   * The host's text goes back only where the skin's text still stands: a node
   * the host has re-rendered since owns its new words. A hint the host no longer
   * shows needs nothing — the node left with it.
   */
  function restoreHints() {
    for (const [node, entry] of replaced) {
      if (!node.isConnected) {
        replaced.delete(node)
        continue
      }
      if ((node.textContent || '') !== entry.written) {
        replaced.delete(node)
        continue
      }
      // Same rule as the write: the host's words go back into the hint's own
      // text, and React's anchor stays where it is.
      writeHintText(node, entry.original)
      replaced.delete(node)
    }
  }

  /** Write the skin's words into every shipped hint the page shows. */
  function rewriteHint(target: string, active: boolean) {
    if (!active) {
      restoreHints()
      return
    }
    for (const node of replaced.keys()) if (!node.isConnected) replaced.delete(node)
    const hints = placeholders.all()
    for (let i = 0; i < hints.length; i++) {
      const node = hints[i]
      if (node.hasAttribute(SYNTHETIC_ATTR)) continue
      const text = node.textContent || ''
      if (!isShippedHint(text) || text === target) continue
      // The host's own words are kept per node, so turning the restyle off (or
      // reloading the plugin) leaves the host's hint rather than the skin's.
      const entry = replaced.get(node)
      // The words go into the hint's own text, never over React's anchor (writeHintText).
      if (!writeHintText(node, target)) continue
      replaced.set(node, { original: entry?.original ?? text, written: target })
    }
  }

  /**
   * Whether the card wants the skin's words where the host draws none: the
   * attachment form, where the host keeps the field's own text and drops its
   * hint. A card that holds a shipped hint of the host's keeps that hint.
   */
  function wantsStandIn(card: HTMLElement) {
    if (card.querySelector(`${HINT_ATTRIBUTE}:not([${SYNTHETIC_ATTR}])`) !== null) return false
    return card.hasAttribute(ATTACHED_ATTR)
  }

  /**
   * The stand-in the skin draws where the host draws none.
   *
   * A commit of the host's runs several passes, and the pass that follows the
   * drawing one reads the card the way the drawing did: the stand-in carries the
   * pass that drew it, and only a later pass takes it back once the card has
   * moved on. A card that holds a hint of the host's keeps it, and the sweep
   * takes the skin's away: one field never shows two hints.
   */
  function syncStandIn(target: string, active: boolean) {
    pass += 1
    const draw = active && activeLocale() !== drawnLocale
    drawnLocale = activeLocale()
    const found = cards.all()
    const standIns = placeholders.all()
    // The answer stands at the head of the pass: a card whose hint the host has
    // drawn keeps it, and the stand-in beside it goes whichever pass reads it.
    const over = new Set<Element>()
    for (const card of found) {
      if (card.querySelector(`${HINT_ATTRIBUTE}:not([${SYNTHETIC_ATTR}])`) !== null) over.add(card)
    }
    for (let i = 0; i < standIns.length; i++) {
      const node = standIns[i]
      if (!node.hasAttribute(SYNTHETIC_ATTR) || node.parentElement === null) continue
      let owner: HTMLElement | null = null
      for (let c = 0; c < found.length; c++) if (found[c].contains(node)) owner = found[c]
      if (owner !== null && over.has(owner)) {
        node.remove()
        continue
      }
      const wants = owner !== null && wantsStandIn(owner)
      // The pass right after the drawing one finds the card as the drawing did,
      // and leaves the stand-in standing; every later pass takes it back once
      // the card has moved on.
      const fresh = draw || node.getAttribute(DRAWN_ATTR) === String(pass - 1)
      if (wants && fresh) continue
      node.remove()
    }
    if (!active) return
    for (let c = 0; c < found.length; c++) {
      const card = found[c]
      if (!wantsStandIn(card)) continue
      const held = card.querySelector<HTMLElement>(`[${SYNTHETIC_ATTR}]`)
      if (held !== null && !draw) {
        // The stand-in is the skin's own node, but a later host version may hand
        // it React children the same way; the words are written the same way too.
        writeHintText(held, target)
        held.setAttribute(DRAWN_ATTR, String(pass))
        continue
      }
      if (held !== null) held.remove()
      const standIn = document.createElement('div')
      standIn.setAttribute('data-composer-placeholder', '')
      standIn.setAttribute(SYNTHETIC_ATTR, 'true')
      standIn.setAttribute(DRAWN_ATTR, String(pass))
      standIn.textContent = target
      card.appendChild(standIn)
    }
  }
  return {
    /**
     * One pass: the visible hint follows the page (hero or conversation).
     * The restyle's off branch is what takes the skin's placeholders away
     * again, so this runs whether or not the restyle applies.
     */
    sync(hero: boolean, active: boolean) {
      if (heldByComposition()) return
      write(hero, active)
    },
    /** A composer input or composition event: only the stand-in can have changed. */
    onInput(hero: boolean, active: boolean) {
      if (heldByComposition()) return
      held = false
      syncStandIn(targetHint(hero), active)
    },
    /**
     * A composition has landed: the pass it held back runs now. The host's flag
     * may still stand when this is queued, and a new composition in flight
     * leaves the hint to that one's end.
     */
    settle(hero: boolean, active: boolean) {
      if (!held || heldByComposition()) return
      write(hero, active)
    },
    /** The placeholders the skin added stand in for the host's own, so they leave with it. */
    dispose() {
      for (const node of placeholders.all()) {
        if (node.hasAttribute(SYNTHETIC_ATTR)) node.remove()
      }
      restoreHints()
      replaced.clear()
    },
  }
}
