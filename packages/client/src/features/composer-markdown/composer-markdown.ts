import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { COMPOSER_CARD_SELECTOR, COMPOSER_INPUT_SELECTOR, COMPOSER_SCROLL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { findComposerInput, observeComposerCards } from '@dsh-claude-style/engine/host'
import { copy } from './copy'

/** The preview owned by this feature; host mutations below it never schedule another render. */
const PREVIEW_ATTRIBUTE = 'data-dsh-claude-composer-markdown'
const PREVIEW_SELECTOR = '[' + PREVIEW_ATTRIBUTE + ']'

/** Parse GFM and remove active or style-bearing HTML before it enters the page. */
export function renderComposerMarkdown(source: string) {
  const html = marked.parse(source, { async: false, gfm: true, breaks: true })
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style'], FORBID_ATTR: ['style'] })
}

interface MountedPreview {
  preview: HTMLElement
  /** The last rendered draft, or null before the first frame. */
  draft: string | null
}

/** Mount one sanitized preview per host composer card. */
export function install() {
  let stopped = false
  /** Per interface: each card's preview lives until that card leaves or this feature is torn down. */
  const mounted = new Map<HTMLElement, MountedPreview>()
  /** Per interface: cards coalesced into the next frame, emptied by its write or by teardown. */
  const pending = new Set<HTMLElement>()
  /** Per interface: drafts read for the next frame, emptied by its write or by teardown. */
  const drafts = new Map<HTMLElement, string>()
  let cancelFrame: (() => void) | null = null

  const remove = (card: HTMLElement) => {
    const entry = mounted.get(card)
    if (entry !== undefined) entry.preview.remove()
    mounted.delete(card)
  }

  const render = (card: HTMLElement, draft: string) => {
    if (!cards.all().includes(card)) {
      remove(card)
      return
    }
    const input = findComposerInput(card)
    const scroll = card.querySelector<HTMLElement>(COMPOSER_SCROLL_SELECTOR)
    // The current host wraps the grow layer in a scrollport; older and lighter
    // hosts mount that layer directly in the card. Both keep the preview below it.
    const anchor = scroll ?? input?.parentElement ?? null
    if (input === null || anchor === null) {
      remove(card)
      return
    }
    let entry = mounted.get(card)
    if (entry === undefined) {
      const preview = document.createElement('div')
      preview.className = 'dsh-claude-composer-markdown'
      preview.setAttribute(PREVIEW_ATTRIBUTE, '')
      preview.setAttribute('aria-label', copy('composerMarkdownLabel'))
      preview.hidden = true
      entry = { preview, draft: null }
      mounted.set(card, entry)
    }
    if (anchor.nextElementSibling !== entry.preview) anchor.after(entry.preview)
    if (entry.draft === draft) return
    entry.draft = draft
    if (draft.trim().length === 0) {
      entry.preview.hidden = true
      entry.preview.replaceChildren()
      return
    }
    entry.preview.innerHTML = renderComposerMarkdown(draft)
    for (const anchor of entry.preview.querySelectorAll('a')) {
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
    }
    entry.preview.hidden = false
  }

  const schedule = (card: HTMLElement) => {
    if (stopped) return
    pending.add(card)
    if (cancelFrame !== null) return
    cancelFrame = requestFrame({
      read() {
        for (const pendingCard of pending) drafts.set(pendingCard, findComposerInput(pendingCard)?.innerText ?? '')
      },
      write() {
        cancelFrame = null
        const batch = [...pending]
        pending.clear()
        for (const pendingCard of batch) render(pendingCard, drafts.get(pendingCard) ?? '')
        drafts.clear()
      },
    })
  }

  function syncCards() {
    const present = new Set(cards.all())
    for (const card of present) schedule(card)
    for (const card of mounted.keys()) if (!present.has(card)) schedule(card)
  }

  const cards = observeComposerCards(syncCards)
  const stopMutations = subscribeMutations(document.body, { childList: true, subtree: true, characterData: true }, records => {
    for (const record of records) {
      const target = record.target instanceof Element ? record.target : record.target.parentElement
      if (target === null || target.closest(PREVIEW_SELECTOR) !== null) continue
      const card = target.closest(COMPOSER_CARD_SELECTOR)
      if (card instanceof HTMLElement) schedule(card)
    }
  })
  const onInput = (event: Event) => {
    if (!(event.target instanceof Element)) return
    const input = event.target.closest(COMPOSER_INPUT_SELECTOR)
    if (input === null) return
    const card = input.closest(COMPOSER_CARD_SELECTOR)
    if (card instanceof HTMLElement) schedule(card)
  }
  document.addEventListener('input', onInput, true)
  syncCards()

  return () => {
    stopped = true
    if (cancelFrame !== null) cancelFrame()
    stopMutations()
    cards.release()
    document.removeEventListener('input', onInput, true)
    for (const card of mounted.keys()) remove(card)
    pending.clear()
    drafts.clear()
  }
}
