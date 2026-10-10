import { requestFrame } from '../../core/frame'
import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import * as reactDom from 'react-dom/client'
import { SIDEBAR_SEARCH_SLOT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { SEARCH_STYLE_ICON, SEARCH_STYLE_STANDALONE } from '../../constants'
import { conversationSessionId, findConversationSession, sessionOutline, turnForSeq } from '../../core/host'
import { copyLabel } from '../../core/i18n'
import { readPrefs } from '../../core/prefs'
import { createSearchSources } from './sources'
import type { ContentHit, SearchFilter, SearchRow } from './sources'
import { buildElement, createStamp, setAttributeIfChanged } from '../../shared/dom'
import { closeOtherPopovers, registerPopover, unregisterPopover } from '../../shared/popover'
import { createSlidingPill } from '../../shared/sliding-pill'
import { createTurnNavHost } from '../turn-nav/turn-nav-host'
import type { HostContext } from '../../core/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './search.manifest'

/**
 * Search: a box in the sidebar that opens a palette over the window, the way
 * Claude's sidebar search does.
 *
 * Where the box stands is the `searchStyle` preference, read on every pass:
 * `overlay` (the default) keeps it in the host's logo row beside the brand and
 * replaces the brand only while the pointer is over the sidebar (search.css);
 * `standalone` gives it a row of its own under the brand row, shown always;
 * `icon` draws no box of the skin's at all and takes the click of the host's
 * own search button instead, which is left where the host draws it. It is
 * placed only where the row carries the wide brand, so the collapsed rail
 * keeps its expand toggle. The palette is the host's own `Modal`
 * (ui-primitives): the host's mask, focus return and modal layer, so while it
 * is open the host's shortcuts treat it as the foreground dialog, and Esc
 * closes it. The skin fills the modal's card with its own rows (sources.ts).
 * docs/decisions D22.
 *
 * @param ctx - client context.
 * @param ui - shared handle table.
 * @returns teardown.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const sources = createSearchSources(ctx, revealHit)
  /** The host-side navigator, which lands a picked hit on its turn (D34). */
  const hostTurns = createTurnNavHost(ctx)
  const FILTERS: { id: SearchFilter, key: string, fallback: string }[] = [
    { id: 'all', key: 'searchFilterAll', fallback: 'All' },
    { id: 'session', key: 'searchFilterSessions', fallback: 'Sessions' },
    { id: 'project', key: 'searchFilterProjects', fallback: 'Projects' },
    { id: 'plugin', key: 'searchFilterPlugins', fallback: 'Plugins' },
    { id: 'skill', key: 'searchFilterSkills', fallback: 'Skills' },
    { id: 'shortcut', key: 'searchFilterShortcuts', fallback: 'Shortcuts' }
  ]
  /** Pause between the latest keystroke and a content-index request, as the host's sidebar search waits. */
  const CONTENT_DEBOUNCE_MS = 250
  /**
   * How long a picked content hit waits for its session to be the shown one and
   * for the outline that names its turn. Both arrive within a few frames; a
   * session that never shows leaves the reader where its row put him.
   */
  const REVEAL_WAIT_MS = 5000
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

  /** The sidebar box, and the logo row it was placed in. */
  let trigger: HTMLButtonElement | null = null
  const rowStamp = createStamp('data-dsh-claude-search-row')
  /** The box's own row in the `standalone` style, under the brand row. */
  let bar: HTMLElement | null = null
  /**
   * The host's own search button, and the listener on it: the `icon` style
   * leaves that button where the host draws it and opens the palette from its
   * click, so the listener follows the element React mounts this time.
   */
  let hostButton: HTMLElement | null = null
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
  /** The fade-out's length (search.css `dsh-claude-search-out`). */
  const CLOSE_MS = 140
  /** The modal's overlay root, marked while it fades out. */
  const closingStamp = createStamp('data-dsh-claude-search-closing')
  /** The host's own sidebar search, which the palette stands in for. */
  const HOST_SEARCH = SIDEBAR_SEARCH_SLOT_SELECTOR
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

  function buildTrigger() {
    const button = buildElement('button', 'dsh-claude-search-trigger')
    button.type = 'button'
    const icon = buildElement('span', 'dsh-claude-search-trigger-icon')
    icon.innerHTML = ICONS.search
    button.appendChild(icon)
    button.appendChild(buildElement('span', 'dsh-claude-search-trigger-label'))
    button.appendChild(buildElement('span', 'dsh-claude-search-keys'))
    button.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      openPalette()
    })
    return button
  }

  /**
   * The host's own search button, whose click opens the palette in the `icon`
   * style: the listener follows the element React mounts this time, because a
   * re-render can replace it.
   */
  function syncHostButton() {
    const found = document.querySelector<HTMLElement>(`${HOST_SEARCH} button`)
    if (found === hostButton) return
    if (hostButton !== null) hostButton.removeEventListener('click', onHostSearchClick)
    hostButton = found
    if (hostButton !== null) hostButton.addEventListener('click', onHostSearchClick)
  }

  /**
   * The host's own click, taken over: the palette opens in its place. The
   * press never reaches the host's own handler, so its search input never
   * expands and the header keeps its actions.
   */
  function onHostSearchClick(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    openPalette()
  }

  /** Take the box and its own row off the page, giving the host's brand row back. */
  function dropTrigger() {
    if (trigger !== null && trigger.parentElement !== null) trigger.parentElement.removeChild(trigger)
    if (bar !== null && bar.parentElement !== null) bar.parentElement.removeChild(bar)
    rowStamp.release()
  }

  /**
   * Place the box for the style in force. The `icon` style places nothing of
   * the skin's; `overlay` and `standalone` share the box and differ in what
   * holds it — the host's logo row, or the skin's own row under it.
   */
  function syncTrigger() {
    const brand = document.querySelector('[data-slot="sidebar"] [class*="_logoRow"] > [class*="_brand"]')
    const row = brand === null ? null : brand.parentElement
    const style = readPrefs().searchStyle
    // The brand is absent in the collapsed rail: no wide brand, no box.
    if (brand === null || row === null || style === SEARCH_STYLE_ICON) {
      dropTrigger()
      return
    }
    if (trigger === null) trigger = buildTrigger()
    if (style === SEARCH_STYLE_STANDALONE) {
      if (bar === null) bar = buildElement('div', 'dsh-claude-search-bar')
      // The box's row stands under the brand row, in the sidebar's own list;
      // the host may re-render around it, so the pass re-seats it.
      if (bar.parentElement !== row.parentElement || bar.previousElementSibling !== row) row.after(bar)
      if (trigger.parentElement !== bar) bar.appendChild(trigger)
      rowStamp.release()
    } else {
      if (bar !== null && bar.parentElement !== null) bar.parentElement.removeChild(bar)
      if (trigger.parentElement !== row) row.insertBefore(trigger, brand.nextSibling)
      rowStamp.mark(row)
    }
    const label = copyLabel('searchPlaceholder', 'Search')
    const text = trigger.children[1]
    if (text.textContent !== label) text.textContent = label
    setAttributeIfChanged(trigger, 'aria-label', label)
    syncTriggerKeys(trigger.children[2])
  }

  /**
   * The host's search shortcut on the box's right, as the palette's action
   * rows show theirs; it follows a rebinding, and a shortcut left unbound
   * shows no caps.
   */
  let triggerKeys: string | null = null
  function syncTriggerKeys(group: Element) {
    const shortcuts = ctx.get('shortcuts')
    let keys: string[] = []
    if (shortcuts) {
      const rows = shortcuts.catalog.getSnapshot()
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].id === 'session.search') keys = rows[i].keys.filter((key: string) => key !== '+')
      }
    }
    const joined = keys.join('\n')
    if (joined === triggerKeys && group.childNodes.length === keys.length) return
    triggerKeys = joined
    while (group.firstChild) group.removeChild(group.firstChild)
    for (let k = 0; k < keys.length; k++) group.appendChild(buildElement('kbd', 'dsh-claude-search-key', keys[k]))
  }

  function sync() {
    syncHostButton()
    syncTrigger()
  }

  /**
   * The host's search shortcut (Ctrl+K) and its rail button end in its own
   * sidebar search taking focus; search.css keeps that control out of
   * sight, and the palette opens in its place. The host's search is then
   * folded back through its own clear button, which exists once the
   * expanded state has rendered — a frame or two after the first focus.
   */
  function onFocusIn(target: HTMLElement) {
    if (target.tagName !== 'INPUT' || target.closest(HOST_SEARCH) === null) return
    target.blur()
    if (isOpen) input!.focus()
    else openPalette()
    foldHostSearch(3)
  }

  function foldHostSearch(tries: number) {
    requestFrame({
      write() {
        if (disposed) return
        const clear = document.querySelector<HTMLElement>(`${HOST_SEARCH} [class*="_clearButton"]`)
        if (clear !== null) {
          clear.click()
          return
        }
        if (tries > 1) foldHostSearch(tries - 1)
      },
    })
  }

  // ---------- the palette ----------

  function renderModal() {
    if (modalRoot === null) modalRoot = reactDom.createRoot(document.createElement('div'))
    modalRoot.render(React.createElement(primitives.Modal, {
      open: isOpen || closing,
      onClose: closePalette,
      title: copyLabel('searchPlaceholder', 'Search'),
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
    field.setAttribute('data-modal-autofocus', '')
    field.placeholder = copyLabel('searchPlaceholder', 'Search')
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
    close.setAttribute('aria-label', copyLabel('searchClose', 'Close'))
    close.innerHTML = ICONS.close
    close.addEventListener('click', closePalette)
    head.appendChild(close)
    card.appendChild(head)

    const chips = buildElement('div', 'dsh-claude-search-filters')
    filterBar = chips
    chips.setAttribute('role', 'radiogroup')
    for (let i = 0; i < FILTERS.length; i++) {
      const chip = buildElement('button', 'dsh-claude-search-filter', copyLabel(FILTERS[i].key, FILTERS[i].fallback))
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
    listbox.setAttribute('role', 'listbox')
    card.appendChild(listbox)

    const foot = buildElement('div', 'dsh-claude-search-foot')
    foot.appendChild(footHint(copyLabel('searchClose', 'Close'), ['Esc']))
    foot.appendChild(footHint(copyLabel('searchFilterHint', 'Filters'), ['Tab']))
    foot.appendChild(footHint(copyLabel('searchOpenHint', 'Open'), ['↵']))
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
    item.setAttribute('role', 'option')
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
    for (let i = 0; i < items.length; i++) {
      const on = i === active
      if (items[i].hasAttribute('data-active') !== on) items[i].toggleAttribute('data-active', on)
      if (on && reveal) items[i].scrollIntoView({ block: 'nearest' })
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
      list.appendChild(buildElement('div', 'dsh-claude-search-status', waiting ? copyLabel('searchLoading', 'Searching…') : copyLabel('searchEmpty', 'No results')))
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
   * waited for; the host's own rail takes the jump (D34).
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
      // Still mounted while it fades: the field is there.
      input!.value = ''
      render()
      input!.focus()
      return
    }
    renderModal()
  }

  /**
   * Fade the palette out, then unmount it.
   * @param then - a picked row's navigation, run once the modal is gone.
   */
  function closePalette(then?: unknown) {
    if (!isOpen) return
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

  ui.search = { sync, onFocusIn }

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
    if (trigger !== null && trigger.parentElement !== null) trigger.parentElement.removeChild(trigger)
    if (bar !== null && bar.parentElement !== null) bar.parentElement.removeChild(bar)
    trigger = null
    bar = null
    if (hostButton !== null) {
      hostButton.removeEventListener('click', onHostSearchClick)
      hostButton = null
    }
    rowStamp.release()
    delete ui.search
  }
}
