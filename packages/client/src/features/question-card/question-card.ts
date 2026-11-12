import { CHAIN_OVERLAY_FALLBACK_ATTRIBUTE, CHAT_FLOW_SLOT_SELECTOR, COMPOSER_SELECTOR, CONVERSATION_CONTENT_SELECTOR, CONVERSATION_SCROLL_SELECTOR, QUESTION_CARD_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMatches } from '@dsh-claude-style/engine/bus'
import { buildElement, setAttributeIfChanged, writeTextInPlace } from '@dsh-claude-style/engine/dom'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { writeScroll } from '@dsh-claude-style/engine/scroll-owner'
import { createCopy } from '../../core/i18n'
import type { FeatureUi } from '../../core/feature'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type manifest from './question-card.manifest'
import COPY from './question-card.copy.json'

const copy = createCopy(COPY)
const CUSTOM_ROW_SELECTOR = ':is([role="radiogroup"], [role="group"]) > div:has(textarea)'
// A question without options asks for one typed answer: the host draws that field
// boxed inside the group instead of as an option row, and it names itself.
const FREE_TEXT_SELECTOR = ':is([role="radiogroup"], [role="group"]) > div:has(> textarea)'
const CUSTOM_ATTR = 'data-dsh-claude-question-custom'
/** The mark's value on the field a question with no options draws, which carries no mark of its own. */
const FREE_TEXT_VALUE = 'free'
const CUSTOM_ACTIVE_ATTR = 'data-dsh-claude-question-custom-active'
/**
 * The surface's own mark while the custom answer holds the choice: the
 * stylesheet draws no ring on the host's chosen radio under it. The host's
 * aria-checked is never written — React keeps its own record of that value, and
 * a false written under it stays missing when the reader picks the option back.
 */
const CUSTOM_CHOICE_ATTR = 'data-dsh-claude-question-custom-choice'
const LABEL_CLASS = 'dsh-claude-question-custom-label'
const SHORTCUT_CLASS = 'dsh-claude-question-submit-shortcut'
const SURFACE_ATTR = 'data-dsh-claude-question-surface'
const RELOCATED_ATTR = 'data-dsh-claude-question-relocated'
const FLOW_ITEM_CLASS = 'dsh-claude-question-flow-item'
const TITLED_HEADER_CLASS = 'dsh-claude-question-titled'
const PAGER_IDLE_CLASS = 'dsh-claude-question-pager-idle'

interface Placement {
  surface: HTMLElement
  mount: HTMLElement
  seat: HTMLElement
}

function buildSubmitShortcut() {
  const shortcut = buildElement('span', SHORTCUT_CLASS)
  shortcut.setAttribute('aria-hidden', 'true')
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  icon.setAttribute('viewBox', '0 0 16 16')
  icon.setAttribute('width', '14')
  icon.setAttribute('height', '14')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M13 3v6H4M7 6 4 9l3 3')
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', '1.5')
  path.setAttribute('stroke-linecap', 'round')
  path.setAttribute('stroke-linejoin', 'round')
  icon.append(path)
  shortcut.append(buildElement('span', '', 'Ctrl'), icon)
  return shortcut
}

/** The host keeps the component's root in the composer chain; only its section travels. */
export function createQuestionCards() {
  let released = false
  const pendingFrames = new Set<() => void>()
  /** A queued write belongs to this installation until it runs or is released. */
  function queue(write: () => void) {
    if (released) return
    const cancel = requestFrame({
      write() {
        pendingFrames.delete(cancel)
        if (released) return
        write()
      },
    })
    pendingFrames.add(cancel)
  }
  const cards = observeMatches<HTMLElement>(QUESTION_CARD_SELECTOR, () => queue(sync))
  const labels = new Map<HTMLElement, HTMLButtonElement>()
  const customSelected = new Set<HTMLElement>()
  const placements = new Map<HTMLElement, Placement>()
  const composerFallbacks = new Map<HTMLElement, { fallback: HTMLElement, display: string, count: number }>()

  function showComposer(seat: HTMLElement) {
    const kept = composerFallbacks.get(seat)
    if (kept !== undefined) {
      kept.count += 1
      kept.fallback.style.display = 'contents'
      return
    }
    const fallback = seat.querySelector<HTMLElement>(`[${CHAIN_OVERLAY_FALLBACK_ATTRIBUTE}="conversation.composer"]`)
    if (fallback === null) return
    composerFallbacks.set(seat, { fallback, display: fallback.style.display, count: 1 })
    fallback.style.display = 'contents'
  }

  function releaseComposer(seat: HTMLElement, answered: boolean) {
    const kept = composerFallbacks.get(seat)
    if (kept === undefined) return
    kept.count -= 1
    if (kept.count > 0) return
    // Once the host's question root is gone, no elected panel remains to hide
    // the composer. A skin teardown instead hands a still-pending card back.
    kept.fallback.style.display = answered ? 'contents' : kept.display
    composerFallbacks.delete(seat)
  }

  function place(frame: HTMLElement): Placement | null {
    const standing = placements.get(frame)
    if (standing !== undefined) return standing
    const surface = frame.querySelector<HTMLElement>(':scope > section')
    if (surface === null) return null
    const content = frame.closest(CONVERSATION_CONTENT_SELECTOR)
    const flow = content?.querySelector(CHAT_FLOW_SLOT_SELECTOR) ?? null
    const seat = frame.closest<HTMLElement>(COMPOSER_SELECTOR)
    // A session switch can publish the card before its transcript. That pass
    // leaves the host layout alone; the next pass sees the completed surface.
    if (content === null || flow === null || flow.parentElement === null || seat === null) return null
    const scroller = content.querySelector<HTMLElement>(CONVERSATION_SCROLL_SELECTOR)
    const followsTail = scroller !== null && scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 150
    const mount = buildElement('div', FLOW_ITEM_CLASS)
    frame.setAttribute(RELOCATED_ATTR, '')
    surface.setAttribute(SURFACE_ATTR, '')
    flow.parentElement.insertBefore(mount, flow.nextSibling)
    mount.append(surface)
    placements.set(frame, { surface, mount, seat })
    showComposer(seat)
    if (followsTail && scroller !== null) writeScroll(scroller, scroller.scrollHeight, 'composer')
    return placements.get(frame)!
  }

  function syncCustomAnswers(surface: HTMLElement, seen: Set<HTMLElement>) {
    let customChoice = false
    for (const row of surface.querySelectorAll<HTMLElement>(CUSTOM_ROW_SELECTOR)) {
      seen.add(row)
      const freeText = row.matches(FREE_TEXT_SELECTOR)
      let label = labels.get(row)
      if (label === undefined) {
        label = buildElement('button', LABEL_CLASS)
        label.type = 'button'
        label.setAttribute('role', row.parentElement?.getAttribute('role') === 'group' ? 'checkbox' : 'radio')
        labels.set(row, label)
      }
      // The radio and the answer field are the host's; an option row's label
      // stands between them in the stylesheet's two-column grid, while the field
      // of a question with no options names itself the way its placeholder does.
      if (freeText) {
        if (label.isConnected) label.remove()
      } else {
        if (row.children[1] !== label) row.insertBefore(label, row.children[1] ?? null)
        writeTextInPlace(label, copy('questionCustom'))
      }
      setAttributeIfChanged(row, CUSTOM_ATTR, freeText ? FREE_TEXT_VALUE : '')
      const active = customSelected.has(row) || row.querySelector('textarea')!.value.trim() !== ''
      row.toggleAttribute(CUSTOM_ACTIVE_ATTR, active)
      label.setAttribute('aria-checked', String(active))
      // Until text reaches the host's draft, choosing Other is the skin's
      // presentation state: the surface carries it, and the stylesheet draws the
      // host's chosen radio without its ring.
      if (active && customSelected.has(row) && row.parentElement?.getAttribute('role') === 'radiogroup') customChoice = true
    }
    surface.toggleAttribute(CUSTOM_CHOICE_ATTR, customChoice)
  }

  function syncSurfaceChrome(surface: HTMLElement) {
    const header = surface.querySelector<HTMLElement>(':scope > header')
    if (header !== null) header.classList.toggle(TITLED_HEADER_CLASS, header.querySelector('h2') !== null)
    const pager = surface.querySelector<HTMLElement>(':scope > footer > div:first-child')
    if (pager !== null) {
      const first = pager.querySelector(':scope > button:first-child')
      const last = pager.querySelector(':scope > button:last-child')
      const bothDisabled = first instanceof HTMLButtonElement && last instanceof HTMLButtonElement && first.disabled && last.disabled
      pager.classList.toggle(PAGER_IDLE_CLASS, bothDisabled)
    }
    const submit = surface.querySelector(':scope > footer > div:last-child > button:not([aria-label]):last-child')
    if (submit !== null && submit.querySelector(`.${SHORTCUT_CLASS}`) === null) submit.append(buildSubmitShortcut())
  }

  let choiceBound = false
  function syncChoiceListener() {
    const wanted = placements.size > 0
    if (wanted === choiceBound) return
    choiceBound = wanted
    if (wanted) document.addEventListener('click', onChoice)
    else document.removeEventListener('click', onChoice)
  }

  function onChoice(event: MouseEvent) {
    if (!(event.target instanceof Element)) return
    const surface = event.target.closest(`[${SURFACE_ATTR}]`)
    if (surface === null) return
    const custom = event.target.closest<HTMLElement>(CUSTOM_ROW_SELECTOR)
    if (custom !== null && surface.contains(custom)) {
      customSelected.add(custom)
      queue(() => {
        if (!custom.isConnected) return
        sync()
        custom.querySelector('textarea')!.focus()
      })
      return
    }
    if (event.target.closest('[data-option-row] > button[role]') === null) return
    for (const row of surface.querySelectorAll<HTMLElement>(CUSTOM_ROW_SELECTOR)) customSelected.delete(row)
    queue(sync)
  }
  function sync() {
    if (released) return
    const seenRows = new Set<HTMLElement>()
    const seenFrames = new Set<HTMLElement>()
    for (const frame of cards.all()) {
      const placement = place(frame)
      if (placement === null) continue
      seenFrames.add(frame)
      syncCustomAnswers(placement.surface, seenRows)
      syncSurfaceChrome(placement.surface)
    }
    for (const [frame, placement] of placements) {
      if (seenFrames.has(frame)) continue
      placement.mount.remove()
      releaseComposer(placement.seat, true)
      placements.delete(frame)
    }
    syncChoiceListener()
    for (const [row, label] of labels) {
      if (seenRows.has(row)) continue
      label.remove()
      row.removeAttribute(CUSTOM_ATTR)
      row.removeAttribute(CUSTOM_ACTIVE_ATTR)
      customSelected.delete(row)
      labels.delete(row)
    }
  }

  return {
    sync,
    release() {
      released = true
      for (const cancel of pendingFrames) cancel()
      pendingFrames.clear()
      if (choiceBound) {
        document.removeEventListener('click', onChoice)
        choiceBound = false
      }
      for (const [frame, placement] of placements) {
        frame.append(placement.surface)
        frame.removeAttribute(RELOCATED_ATTR)
        placement.surface.removeAttribute(SURFACE_ATTR)
        placement.surface.removeAttribute(CUSTOM_CHOICE_ATTR)
        placement.surface.querySelector(':scope > header')?.classList.remove(TITLED_HEADER_CLASS)
        placement.surface.querySelector(':scope > footer > div:first-child')?.classList.remove(PAGER_IDLE_CLASS)
        placement.surface.querySelectorAll(`.${SHORTCUT_CLASS}`).forEach(shortcut => shortcut.remove())
        placement.mount.remove()
        releaseComposer(placement.seat, false)
      }
      placements.clear()
      for (const [row, label] of labels) {
        label.remove()
        row.removeAttribute(CUSTOM_ATTR)
        row.removeAttribute(CUSTOM_ACTIVE_ATTR)
      }
      labels.clear()
      customSelected.clear()
      composerFallbacks.clear()
      cards.release()
    },
  }
}

/**
 * The switch's teardown hands a pending card back to the composer seat, so
 * turning it off mid-question leaves the host's own card where the host put it.
 */
export function install(_ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const questionCards = createQuestionCards()
  ui.questionCard = {
    sync: questionCards.sync,
    /** A typed custom answer marks its row selected. */
    onInput: questionCards.sync,
    /** The custom option's label follows the locale. */
    onCopyChange: questionCards.sync,
  }
  return () => questionCards.release()
}
