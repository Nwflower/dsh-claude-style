import { requestFrame } from '@dsh-claude-style/engine/frame'
import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import * as reactDom from 'react-dom/client'
import { conversationSessionId, findConversationSession, sessionOutline, turnForSeq } from '@dsh-claude-style/engine/host'
import { createSearchSources } from './sources'
import type { ContentHit, SearchFilter, SearchRow } from './sources'
import { buildElement, createStamp } from '@dsh-claude-style/engine/dom'
import { motionMs } from '../../shared/motion'
import { closeOtherPopovers, registerPopover, unregisterPopover } from '../../shared/popover'
import { createSlidingPill } from '../../shared/sliding-pill'
import { createTurnNavHost } from '../turn-nav/turn-nav-host'
import { createSearchTrigger } from './search-trigger'
import { createHostSearchTakeover } from './search-host-takeover'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './search.manifest'
import { copy } from './copy'
import type { CopyKey } from './copy'

/**
 * Search: a host-owned sidebar entry that opens a palette over the window, the
 * way Claude's sidebar search does.
 *
 * The sidebar entry and its main-panel target are registered by the trigger
 * module (features/search/search-trigger.ts), and the host's own search control —
 * kept mounted under every `searchStyle`, because the host's shortcut has no
 * public replacement and only expands that control — is taken over by the
 * host-takeover module (features/search/search-host-takeover.ts). The palette
 * is the host's own `Modal`, so the host's shortcuts treat it as the
 * foreground dialog; the overlay stays marked until the host unmounts it, or
 * the card replays its entrance for one frame. Services are read by name at
 * the moment of use, since cordis refuses a remote namespace's child read off
 * the root context.
 *
 * Content search runs in the host half (packages/host/src/search.ts): the
 * host's own index is off in the web composition and cannot match part of a
 * Chinese sentence. It takes this over once it can.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const sources = createSearchSources(ctx, revealHit)
  /** The host-side navigator, which lands a picked hit on its turn */
  const hostTurns = createTurnNavHost(ctx)
  /** The host-owned sidebar entry and its panel target (search-trigger.ts). */
  const triggerCtl = createSearchTrigger(ctx, { open: openPalette })
  /** The host's own sidebar search, taken over (search-host-takeover.ts). */
  const takeover = createHostSearchTakeover({
    ctx,
    open: openPalette,
    isOpen: () => isOpen,
    focusField: () => { if (input !== null) input.focus() },
    isDisposed: () => disposed,
  })
  const FILTERS: { id: SearchFilter, key: CopyKey }[] = [
    { id: 'all', key: 'searchFilterAll' },
    { id: 'session', key: 'searchFilterSessions' },
    { id: 'project', key: 'searchFilterProjects' },
    { id: 'plugin', key: 'searchFilterPlugins' },
    { id: 'skill', key: 'searchFilterSkills' },
    { id: 'shortcut', key: 'searchFilterShortcuts' }
  ]
  /** Pause between the latest keystroke and a content-index request, as the host's sidebar search waits. */
  const CONTENT_DEBOUNCE_MS = 250
  /**
   * How long a picked content hit waits for its session to be the shown one and
   * for the outline that names its turn. Both arrive within a few frames; a
   * session that never shows leaves the reader where its row put him.
   */
  const REVEAL_WAIT_MS = 5000
  /** The listbox the field controls; option ids hang off it. */
  const LIST_ID = 'dsh-claude-search-listbox'
  const SVG_OPEN = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  const ICONS: Record<string, string> = {
    search: `${SVG_OPEN}<circle cx="7" cy="7" r="4.5"/><path d="M10.4 10.4 13.5 13.5"/></svg>`,
    session: `${SVG_OPEN}<path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9.2 3 6.8 13"/></svg>`,
    project: `${SVG_OPEN}<path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.6l1.4 1.5h5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z"/></svg>`,
    plugin: `${SVG_OPEN}<rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1"/><rect x="9" y="9" width="4.5" height="4.5" rx="1"/></svg>`,
    skill: `${SVG_OPEN}<path d="M8 2.5 9.3 6.7 13.5 8 9.3 9.3 8 13.5 6.7 9.3 2.5 8 6.7 6.7z"/></svg>`,
    shortcut: `${SVG_OPEN}<rect x="1.5" y="4" width="13" height="8" rx="1.5"/><path d="M4.2 6.6h.1M6.7 6.6h.1M9.2 6.6h.1M11.7 6.6h.1M4.8 9.4h6.4"/></svg>`,
    newSession: `${SVG_OPEN}<circle cx="8" cy="8" r="6"/><path d="M8 5.5v5M5.5 8h5"/></svg>`,
    settings: `${SVG_OPEN}<path d="M2.5 5h6.2M11.8 5h1.7M2.5 11h1.7M7.3 11h6.2"/><circle cx="10.2" cy="5" r="1.5"/><circle cx="5.8" cy="11" r="1.5"/></svg>`,
    close: `${SVG_OPEN}<path d="M4 4l8 8M12 4l-8 8"/></svg>`,
    enter: `${SVG_OPEN}<path d="M13 3.5v4a2 2 0 0 1-2 2H3.5M6 7 3.5 9.5 6 12"/></svg>`
  }

  /** The React root the host's Modal renders from, and its container. */
  let modalRoot: reactDom.Root | null = null
  /**
   * `isOpen` while the palette takes input; `closing` while it fades out,
   * still mounted. The row picked on the way out runs once the modal is
   * gone, so its navigation gets the keyboard after the modal hands focus
   * back.
   */
  let isOpen = false
  let closing = false
  let closeTimer = 0
  let pendingRun: (() => void) | null = null
  /** The fade-out's length, the exit token the closing animations run (D9). */
  const CLOSE_MS = motionMs('--dsh-claude-duration-exit')
  /** The modal's overlay root, marked while it fades out. */
  const closingStamp = createStamp('data-dsh-claude-search-closing')
  /** The palette's own nodes while it is open; `card` is the div the modal hands over. */
  let card: HTMLElement | null = null
  let input: HTMLInputElement | null = null
  let filterBar: HTMLElement | null = null
  let list: HTMLElement | null = null
  const filterPill = createSlidingPill('[aria-checked="true"]')
  let query = ''
  let filter: SearchFilter = 'all'
  /** Every selectable row on screen, in order, and the highlighted one's index. */
  let rows: SearchRow[] = []
  let active = 0
  /** The content index's hits for `contentQuery`; the request in flight and its timer. */
  let contentHits: ContentHit[] = []
  let contentQuery = ''
  let contentAbort: AbortController | null = null
  let contentTimer = 0
  let disposed = false

  function sync() {
    takeover.sync()
    triggerCtl.sync()
  }

  // ---------- the palette ----------

  function renderModal() {
    if (modalRoot === null) modalRoot = reactDom.createRoot(document.createElement('div'))
    modalRoot.render(React.createElement(primitives.Modal, {
      open: isOpen || closing,
      onClose: closePalette,
      title: copy('searchPlaceholder'),
      headless: true,
      shortcutModal: 'dsh-claude-search',
      className: 'dsh-claude-search-dialog',
    }, React.createElement('div', { className: 'dsh-claude-search', ref: adoptCard })))
  }

  /**
   * The modal mounts its card on open and drops it on close; the skin's
   * nodes are built into it when it appears. React renders the div with no
   * children, so it never touches what the skin puts inside.
   */
  function adoptCard(element: HTMLDivElement | null) {
    if (element === null) {
      filterPill.sync(null)
      card = null
      input = null
      filterBar = null
      list = null
      return
    }
    if (element === card) return
    card = element
    const field = buildPalette(element)
    render()
    field.focus()
  }

  /** @returns the query field. */
  function buildPalette(card: HTMLElement) {
    const head = buildElement('div', 'dsh-claude-search-head')
    const field = buildElement('input', 'dsh-claude-search-input')
    input = field
    field.type = 'text'
    field.spellcheck = false
    field.setAttribute('autocomplete', 'off')
    // The list itself never takes focus: the field is the combobox, and the
    // active option is named through aria-activedescendant (paintActive).
    field.setAttribute('role', 'combobox')
    field.setAttribute('aria-expanded', 'true')
    field.setAttribute('aria-controls', LIST_ID)
    field.setAttribute('aria-autocomplete', 'list')
    field.setAttribute('data-modal-autofocus', '')
    field.placeholder = copy('searchPlaceholder')
    field.value = query
    field.addEventListener('input', () => {
      if (!isOpen) return
      query = field.value
      active = 0
      scheduleContentSearch()
      render()
    })
    field.addEventListener('keydown', onKeyDown)
    head.appendChild(field)
    const close = buildElement('button', 'dsh-claude-search-close')
    close.type = 'button'
    close.setAttribute('aria-label', copy('searchClose'))
    close.innerHTML = ICONS.close
    close.addEventListener('click', closePalette)
    head.appendChild(close)
    card.appendChild(head)

    const chips = buildElement('div', 'dsh-claude-search-filters')
    filterBar = chips
    chips.setAttribute('role', 'radiogroup')
    for (let i = 0; i < FILTERS.length; i++) {
      const chip = buildElement('button', 'dsh-claude-search-filter', copy(FILTERS[i].key))
      chip.type = 'button'
      chip.tabIndex = -1
      chip.setAttribute('role', 'radio')
      chip.setAttribute('data-filter', FILTERS[i].id)
      chip.addEventListener('click', () => {
        setFilter(FILTERS[i].id)
        field.focus()
      })
      chips.appendChild(chip)
    }
    card.appendChild(chips)

    const listbox = buildElement('div', 'dsh-claude-search-list')
    list = listbox
    listbox.id = LIST_ID
    listbox.setAttribute('role', 'listbox')
    card.appendChild(listbox)

    const foot = buildElement('div', 'dsh-claude-search-foot')
    foot.appendChild(footHint(copy('searchClose'), ['Esc']))
    foot.appendChild(footHint(copy('searchFilterHint'), ['Tab']))
    foot.appendChild(footHint(copy('searchOpenHint'), ['↵']))
    card.appendChild(foot)
    return field
  }

  function footHint(text: string, keys: string[]) {
    const hint = buildElement('span', 'dsh-claude-search-hint', text)
    hint.appendChild(keycaps(keys))
    return hint
  }

  /** One cap per key; the host's key lists carry `+` between the keys of a chord, which the caps' spacing already says. */
  function keycaps(keys: string[]) {
    const group = buildElement('span', 'dsh-claude-search-keys')
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] !== '+') group.appendChild(buildElement('kbd', 'dsh-claude-search-key', keys[i]))
    }
    return group
  }

  function setFilter(next: SearchFilter) {
    if (next === filter) return
    filter = next
    active = 0
    scheduleContentSearch()
    render()
  }

  function stepFilter(delta: number) {
    let index = 0
    for (let i = 0; i < FILTERS.length; i++) {
      if (FILTERS[i].id === filter) index = i
    }
    setFilter(FILTERS[(index + delta + FILTERS.length) % FILTERS.length].id)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!isOpen || event.isComposing || event.keyCode === 229) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (rows.length === 0) return
      active = (active + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length
      paintActive(true)
      return
    }
    if (event.key === 'Tab') {
      // Before the modal's own Tab trap, which leaves a handled key alone.
      event.preventDefault()
      stepFilter(event.shiftKey ? -1 : 1)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (!event.repeat && rows[active] !== undefined) pick(rows[active])
    }
  }

  /** The trimmed query the sources read. */
  function currentQuery() {
    return query.trim()
  }

  /**
   * Ask the content index once the typing pauses; only the sessions view
   * and the all view list its hits.
   */
  function scheduleContentSearch() {
    const q = currentQuery()
    const wanted = q !== '' && (filter === 'all' || filter === 'session')
    if (wanted && q === contentQuery) return
    window.clearTimeout(contentTimer)
    if (contentAbort !== null) contentAbort.abort()
    contentAbort = null
    contentHits = []
    contentQuery = ''
    if (!wanted) return
    contentTimer = window.setTimeout(() => {
      const controller = new AbortController()
      contentAbort = controller
      sources.searchContent(q, controller.signal).then(hits => {
        if (controller.signal.aborted) return
        contentHits = hits
        contentQuery = q
        render()
      }, reason => {
        if (controller.signal.aborted) return
        // A deployment can switch the index off; the title matches stand
        // alone, and the list stops saying it is still searching.
        console.warn('dsh-claude-style: session content search failed:', reason)
        contentHits = []
        contentQuery = q
        render()
      })
    }, CONTENT_DEBOUNCE_MS)
  }

  function buildRow(row: SearchRow, index: number) {
    const item = buildElement('div', 'dsh-claude-search-item')
    item.id = `${LIST_ID}-option-${index}`
    item.setAttribute('role', 'option')
    item.setAttribute('aria-selected', 'false')
    item.setAttribute('data-kind', row.kind)
    item.setAttribute('data-index', String(index))
    const icon = buildElement('span', 'dsh-claude-search-item-icon')
    if (row.image) {
      const image = buildElement('img', 'dsh-claude-search-item-image')
      image.alt = ''
      image.src = row.image
      icon.appendChild(image)
    } else {
      // The host names the icon; a name this build does not carry leaves the span empty rather than printing "undefined".
      const svg = (row.icon === undefined ? undefined : ICONS[row.icon]) ?? ICONS[row.kind]
      if (svg !== undefined) icon.innerHTML = svg
    }
    item.appendChild(icon)
    const text = buildElement('span', 'dsh-claude-search-item-text')
    const line = buildElement('span', 'dsh-claude-search-item-line')
    line.appendChild(buildElement('span', 'dsh-claude-search-item-name', row.title))
    if (row.detail) line.appendChild(buildElement('span', 'dsh-claude-search-item-detail', row.detail))
    text.appendChild(line)
    if (row.snippet) {
      const snippet = buildElement('span', 'dsh-claude-search-item-snippet')
      if (row.snippetMatch) {
        const [start, end] = row.snippetMatch
        snippet.append(row.snippet.slice(0, start), buildElement('mark', 'dsh-claude-search-item-match', row.snippet.slice(start, end)), row.snippet.slice(end))
      } else {
        snippet.textContent = row.snippet
      }
      text.appendChild(snippet)
    }
    item.appendChild(text)
    if (row.keys && row.keys.length > 0) item.appendChild(keycaps(row.keys))
    const enter = buildElement('span', 'dsh-claude-search-item-enter')
    enter.innerHTML = ICONS.enter
    item.appendChild(enter)
    item.addEventListener('mousemove', () => {
      if (active === index) return
      active = index
      paintActive(false)
    })
    item.addEventListener('click', () => pick(row))
    return item
  }

  function paintActive(reveal: boolean) {
    if (list === null) return
    const items = list.querySelectorAll('.dsh-claude-search-item')
    let named: string | null = null
    for (let i = 0; i < items.length; i++) {
      const on = i === active
      if (items[i].hasAttribute('data-active') !== on) items[i].toggleAttribute('data-active', on)
      if (items[i].getAttribute('aria-selected') !== String(on)) items[i].setAttribute('aria-selected', String(on))
      if (on) {
        named = items[i].id
        if (reveal) items[i].scrollIntoView({ block: 'nearest' })
      }
    }
    // The field keeps focus; this is what tells a reader which option the
    // arrows and Enter will act on.
    if (input !== null) {
      if (named === null) input.removeAttribute('aria-activedescendant')
      else input.setAttribute('aria-activedescendant', named)
    }
  }

  function render() {
    // The card, the filter bar and the list are built and dropped together (adoptCard).
    if (card === null || filterBar === null || list === null) return
    for (let i = 0; i < filterBar.children.length; i++) {
      const chip = filterBar.children[i]
      const on = chip.getAttribute('data-filter') === filter
      if (chip.getAttribute('aria-checked') !== String(on)) chip.setAttribute('aria-checked', String(on))
    }
    filterPill.sync(filterBar)
    const q = currentQuery()
    const sections = sources.sections(q, filter, contentQuery === q ? contentHits : [])
    rows = []
    while (list.firstChild) list.removeChild(list.firstChild)
    for (let s = 0; s < sections.length; s++) {
      const section = sections[s]
      list.appendChild(buildElement('div', 'dsh-claude-search-section', section.title))
      for (let r = 0; r < section.rows.length; r++) {
        list.appendChild(buildRow(section.rows[r], rows.length))
        rows.push(section.rows[r])
      }
    }
    if (rows.length === 0) {
      const waiting = sources.pending(filter) || (q !== '' && contentQuery !== q && (filter === 'all' || filter === 'session'))
      list.appendChild(buildElement('div', 'dsh-claude-search-status', waiting ? copy('searchLoading') : copy('searchEmpty')))
    }
    if (active >= rows.length) active = Math.max(0, rows.length - 1)
    paintActive(true)
  }

  function pick(row: SearchRow) {
    closePalette(row.run)
  }

  /**
   * Land on the turn holding one picked content hit, after that row's own
   * navigation opened its session. The conversation shows the session a frame
   * or two later and the whole-log outline lands with its binding, so both are
   * waited for; the host's own rail takes the jump
   */
  function revealHit(sessionId: string, seq: number) {
    const until = Date.now() + REVEAL_WAIT_MS
    const retry = () => {
      if (!disposed && Date.now() < until) requestFrame({ write: step })
    }
    function step() {
      if (disposed) return
      if (conversationSessionId(findConversationSession()) !== sessionId) {
        retry()
        return
      }
      const turn = turnForSeq(sessionOutline(ctx, sessionId), seq)
      if (turn === null) {
        retry()
        return
      }
      hostTurns.jumpToTurn(turn, () => {})
    }
    step()
  }

  function openPalette() {
    if (isOpen) return
    closeOtherPopovers('search')
    query = ''
    filter = 'all'
    active = 0
    contentHits = []
    contentQuery = ''
    sources.open(() => { if (isOpen) render() })
    isOpen = true
    if (closing) {
      // Reopened while fading out: the card is still mounted, so it is
      // reset in place instead of being built again. A row picked on the
      // way out still gets its navigation.
      const run = settleClose()
      closingStamp.release()
      if (run !== null) run()
      // Still mounted while it fades: the field is there. A host that took the
      // card away mid-fade leaves no field to reset, and the rebuild path below
      // is the one that can put one back.
      if (input !== null) {
        input.value = ''
        render()
        input.focus()
        return
      }
      renderModal()
    }
    renderModal()
  }

  /**
   * Fade the palette out, then unmount it.
   * @param then - a picked row's navigation, run once the modal is gone.
   */
  function closePalette(then?: unknown) {
    if (disposed || !isOpen) return
    isOpen = false
    closing = true
    pendingRun = typeof then === 'function' ? then as () => void : null
    window.clearTimeout(contentTimer)
    if (contentAbort !== null) contentAbort.abort()
    contentAbort = null
    sources.close()
    closingStamp.mark(card === null || card.parentElement === null ? null : card.parentElement.parentElement)
    closeTimer = window.setTimeout(finishClose, CLOSE_MS)
  }

  /** End the fade and hand back the row still to run. */
  function settleClose() {
    window.clearTimeout(closeTimer)
    closing = false
    const run = pendingRun
    pendingRun = null
    return run
  }

  function finishClose() {
    const run = settleClose()
    renderModal()
    // After the modal has let go. The mark stays on until then: taken off
    // a mounted overlay, it would hand the card and the mask back their
    // entrance animations for the frame before the unmount. And the modal
    // hands focus back to where it came from as it unmounts, so the row's
    // own navigation (a composer, a page) takes the keyboard after that.
    requestFrame({
      write() {
        closingStamp.release()
        if (run !== null && !disposed) run()
      },
    })
  }

  registerPopover('search', closePalette)

  /**
   * The pass's read phase: the filter bar's own box, taken before this frame's
   * writes. A bar the pass builds measures itself in the write phase instead
   * (sliding-pill).
   */
  function measure() {
    if (filterBar !== null) filterPill.measure(filterBar)
  }

  ui.search = { measure, sync, onFocusIn: takeover.onFocusIn }

  return () => {
    disposed = true
    unregisterPopover('search')
    settleClose()
    closingStamp.release()
    window.clearTimeout(contentTimer)
    if (contentAbort !== null) contentAbort.abort()
    sources.close()
    hostTurns.stop()
    filterPill.release()
    if (modalRoot !== null) {
      modalRoot.unmount()
      modalRoot = null
    }
    triggerCtl.drop()
    takeover.detach()
    delete ui.search
  }
}
