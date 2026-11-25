import * as React from 'react'
import * as reactDom from 'react-dom/client'
import {
  FONT_PREF_KEYS,
  FONT_RECOMMENDATIONS,
  FONT_STACK_MAX,
  formatFontFamily,
  normalizeFontFamily,
  reorderFontStack,
  toggleFontInStack,
} from '@dsh-claude-style/contracts/typeface'
import type { FontRole } from '@dsh-claude-style/contracts/typeface'
import { readPrefs, savePrefs, subscribePrefs } from '../../core/prefs'
import { anchorSpace, closeOtherPopovers, POPOVER_MARGIN, positionAnchoredPopover, registerPopover, unregisterPopover } from '../../shared/popover'
import { Glyph } from '../../shared/settings-glyphs'
import { loadSystemFontFamilies } from '../../shared/typeface'
import { copy } from './copy'

/**
 * Anchored font-family stack picker mounted on `<body>` so the settings dialog
 * never clips it. Combines a reorderable pinned list (pointer drag + keyboard
 * and button moves), an auto-focused search box with manual family entry, and a
 * grouped dropdown of curated recommendations plus locally installed fonts.
 */

const POPOVER_NAME = 'typeface-picker'
const DRAG_THRESHOLD_PX = 4

interface ActivePopover {
  role: FontRole
  anchor: HTMLElement
  host: HTMLElement
  root: reactDom.Root
}

let active: ActivePopover | null = null
const listeners = new Set<() => void>()

function notify() {
  for (const listener of [...listeners]) listener()
}

/** Which role currently holds the open picker, or null when closed. */
export function activeTypefacePopoverRole(): FontRole | null {
  return active === null ? null : active.role
}

/** Subscribe to open/close transitions so the active preview card mirrors its expanded state. */
export function subscribeTypefacePopover(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Close the font picker popover if one stands. */
export function closeTypefacePopover() {
  if (active === null) return
  const closing = active
  active = null
  unregisterPopover(POPOVER_NAME)
  notify()
  queueMicrotask(() => {
    closing.root.unmount()
    closing.host.remove()
  })
}

/** Toggle the picker for `role` anchored to `anchor`. */
export function toggleTypefacePopover(role: FontRole, anchor: HTMLElement) {
  if (active !== null && active.role === role && active.anchor === anchor) {
    closeTypefacePopover()
    return
  }
  closeTypefacePopover()
  closeOtherPopovers(POPOVER_NAME)
  const host = document.createElement('div')
  host.className = 'dsh-claude-typeface-popover-host'
  document.body.append(host)
  const root = reactDom.createRoot(host)
  active = { role, anchor, host, root }
  registerPopover(POPOVER_NAME, closeTypefacePopover)
  root.render(React.createElement(TypefacePopoverBody, { role, anchor, close: closeTypefacePopover }))
  notify()
}

function TypefacePopoverBody(props: { role: FontRole, anchor: HTMLElement, close(): void }) {
  const { role, anchor, close } = props
  const prefs = React.useSyncExternalStore(subscribePrefs, readPrefs)
  const prefKey = FONT_PREF_KEYS[role]
  const selected = prefs[prefKey]
  const [query, setQuery] = React.useState('')
  const [systemFonts, setSystemFonts] = React.useState<readonly string[]>([])
  const [dragging, setDragging] = React.useState<{ from: number, over: number } | null>(null)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const pinnedListRef = React.useRef<HTMLDivElement>(null)

  const commit = React.useCallback((next: string[]) => {
    void savePrefs({ [prefKey]: next })
  }, [prefKey])

  // Load installed system fonts on open (triggered from a user click gesture).
  React.useEffect(() => {
    let alive = true
    void loadSystemFontFamilies().then(list => { if (alive) setSystemFonts(list) })
    return () => { alive = false }
  }, [])

  // Focus search input without scrolling the settings page underneath.
  React.useEffect(() => {
    searchRef.current?.focus({ preventScroll: true })
  }, [])

  // Keep anchored below or above the card without covering the live preview cards.
  React.useLayoutEffect(() => {
    const card = cardRef.current
    if (card === null) return
    const place = () => {
      if (!anchor.isConnected) {
        close()
        return
      }
      const gap = 6
      const { rect, viewport } = anchorSpace(anchor)
      const roomBelow = viewport.height - rect.bottom - gap - POPOVER_MARGIN
      const roomAbove = rect.top - gap - POPOVER_MARGIN
      const bestRoom = Math.max(roomBelow, roomAbove)
      card.style.maxHeight = `${Math.min(340, Math.max(180, Math.floor(bestRoom)))}px`
      positionAnchoredPopover(anchor, card, { side: 'below-left', gap })
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(card)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [anchor, close, selected.length, query, systemFonts.length])

  // Dismiss on outside click or Escape.
  React.useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target === null) return
      if (cardRef.current?.contains(target)) return
      if (anchor.contains(target)) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      close()
      anchor.focus()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [anchor, close])

  const selectedKeys = React.useMemo(() => new Set(selected.map(item => item.toLowerCase())), [selected])
  const needle = query.trim().toLowerCase()

  const recommended = React.useMemo(() => {
    const base = FONT_RECOMMENDATIONS[role]
    return needle === '' ? base : base.filter(name => name.toLowerCase().includes(needle))
  }, [role, needle])

  const recommendedKeys = React.useMemo(
    () => new Set(FONT_RECOMMENDATIONS[role].map(name => name.toLowerCase())),
    [role],
  )

  const installed = React.useMemo(() => {
    const extra = systemFonts.filter(name => !recommendedKeys.has(name.toLowerCase()))
    return needle === '' ? extra : extra.filter(name => name.toLowerCase().includes(needle))
  }, [systemFonts, recommendedKeys, needle])

  const typedNormalized = normalizeFontFamily(query)
  const typedExactKnown = typedNormalized !== '' && (
    selectedKeys.has(typedNormalized.toLowerCase()) ||
    recommended.some(name => name.toLowerCase() === typedNormalized.toLowerCase()) ||
    installed.some(name => name.toLowerCase() === typedNormalized.toLowerCase())
  )
  const canAddTyped = typedNormalized !== '' && !typedExactKnown && selected.length < FONT_STACK_MAX
  const atLimit = selected.length >= FONT_STACK_MAX

  const toggleFamily = (family: string) => {
    commit(toggleFontInStack(selected, family))
  }

  const addTyped = () => {
    if (!canAddTyped) return
    commit(toggleFontInStack(selected, typedNormalized))
    setQuery('')
  }

  const moveRow = (from: number, to: number) => {
    const next = reorderFontStack(selected, from, to)
    commit(next)
  }

  /** Begin pointer drag-to-reorder on a pinned row once vertical movement crosses threshold. */
  const startDrag = (index: number, startEvent: React.PointerEvent<HTMLElement>) => {
    if (startEvent.button !== 0 || selected.length < 2) return
    const target = startEvent.target as HTMLElement | null
    if (target?.closest('button') !== null) return
    const startY = startEvent.clientY
    let activeDrag = false
    let currentOver = index

    const computeTarget = (clientY: number) => {
      const container = pinnedListRef.current
      if (container === null) return index
      const rows = Array.from(container.children) as HTMLElement[]
      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect()
        if (clientY < rect.top + rect.height / 2) return i
      }
      return Math.max(0, rows.length - 1)
    }

    const onMove = (event: PointerEvent) => {
      if (!activeDrag) {
        if (Math.abs(event.clientY - startY) < DRAG_THRESHOLD_PX) return
        activeDrag = true
      }
      event.preventDefault()
      currentOver = computeTarget(event.clientY)
      setDragging({ from: index, over: currentOver })
    }

    const finish = (applyMove: boolean) => {
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerup', onUp, true)
      document.removeEventListener('pointercancel', onCancel, true)
      setDragging(null)
      if (applyMove && activeDrag && currentOver !== index) moveRow(index, currentOver)
    }

    const onUp = () => finish(true)
    const onCancel = () => finish(false)

    document.addEventListener('pointermove', onMove, true)
    document.addEventListener('pointerup', onUp, true)
    document.addEventListener('pointercancel', onCancel, true)
  }

  const renderOption = (name: string) => {
    const chosen = selectedKeys.has(name.toLowerCase())
    const disabled = !chosen && atLimit
    return React.createElement(
      'button',
      {
        key: name,
        type: 'button',
        role: 'menuitemcheckbox',
        className: 'dsh-claude-popover-item dsh-claude-typeface-option',
        'aria-checked': chosen ? 'true' : 'false',
        'data-chosen': chosen ? '' : undefined,
        disabled,
        onClick: () => toggleFamily(name),
      },
      React.createElement(
        'span',
        { className: 'dsh-claude-popover-item-text', style: { fontFamily: formatFontFamily(name) } },
        name,
      ),
      chosen
        ? React.createElement('span', { className: 'dsh-claude-popover-check', 'aria-hidden': 'true' }, React.createElement(Glyph, { name: 'check' }))
        : null,
    )
  }

  const hasResults = recommended.length > 0 || installed.length > 0 || canAddTyped

  return React.createElement(
    'div',
    {
      ref: cardRef,
      className: 'dsh-claude-popover-card dsh-claude-typeface-popover',
      'data-open': 'true',
      role: 'dialog',
      'aria-label': copy('typefacePickerLabel'),
    },
    selected.length > 0
      ? React.createElement(
        'div',
        { className: 'dsh-claude-typeface-pinned' },
        React.createElement(
          'div',
          { className: 'dsh-claude-typeface-section-head' },
          React.createElement('span', { className: 'dsh-claude-typeface-section-title' }, copy('typefacePinned', { count: String(selected.length) })),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dsh-claude-typeface-icon-btn',
              'data-action': 'reset',
              title: copy('typefaceReset'),
              'aria-label': copy('typefaceReset'),
              onClick: () => commit([]),
            },
            React.createElement(Glyph, { name: 'refresh' }),
          ),
        ),
        React.createElement(
          'div',
          { ref: pinnedListRef, className: 'dsh-claude-typeface-pinned-list', role: 'list' },
          selected.map((family, index) => React.createElement(
            'div',
            {
              key: family,
              role: 'listitem',
              tabIndex: 0,
              className: 'dsh-claude-typeface-pinned-row',
              'data-dragging': dragging?.from === index ? '' : undefined,
              'data-over': dragging !== null && dragging.over === index && dragging.from !== index ? '' : undefined,
              onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => startDrag(index, event),
              onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
                if (event.altKey && event.key === 'ArrowUp' && index > 0) {
                  event.preventDefault()
                  moveRow(index, index - 1)
                } else if (event.altKey && event.key === 'ArrowDown' && index < selected.length - 1) {
                  event.preventDefault()
                  moveRow(index, index + 1)
                } else if (event.key === 'Delete' || event.key === 'Backspace') {
                  if (event.target !== event.currentTarget) return
                  event.preventDefault()
                  toggleFamily(family)
                }
              },
            },
            React.createElement('span', { className: 'dsh-claude-typeface-grip', 'aria-hidden': 'true' }, React.createElement(Glyph, { name: 'grip' })),
            React.createElement('span', { className: 'dsh-claude-typeface-order' }, String(index + 1)),
            React.createElement('span', { className: 'dsh-claude-typeface-pinned-name', style: { fontFamily: formatFontFamily(family) } }, family),
            React.createElement(
              'span',
              { className: 'dsh-claude-typeface-pinned-actions' },
              selected.length > 1
                ? [
                  React.createElement(
                    'button',
                    {
                      key: 'up',
                      type: 'button',
                      className: 'dsh-claude-typeface-icon-btn',
                      'data-action': 'move-up',
                      disabled: index === 0,
                      title: copy('typefaceMoveUp'),
                      'aria-label': copy('typefaceMoveUp'),
                      onClick: () => moveRow(index, index - 1),
                    },
                    React.createElement(Glyph, { name: 'arrowUp' }),
                  ),
                  React.createElement(
                    'button',
                    {
                      key: 'down',
                      type: 'button',
                      className: 'dsh-claude-typeface-icon-btn',
                      'data-action': 'move-down',
                      disabled: index === selected.length - 1,
                      title: copy('typefaceMoveDown'),
                      'aria-label': copy('typefaceMoveDown'),
                      onClick: () => moveRow(index, index + 1),
                    },
                    React.createElement(Glyph, { name: 'arrowDown' }),
                  ),
                ]
                : null,
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'dsh-claude-typeface-icon-btn',
                  'data-action': 'remove',
                  title: copy('typefaceRemove'),
                  'aria-label': copy('typefaceRemove'),
                  onClick: () => toggleFamily(family),
                },
                React.createElement(Glyph, { name: 'close' }),
              ),
            ),
          )),
        ),
      )
      : null,
    React.createElement(
      'div',
      { className: 'dsh-claude-typeface-search' },
      React.createElement('span', { className: 'dsh-claude-typeface-search-icon', 'aria-hidden': 'true' }, React.createElement(Glyph, { name: 'search' })),
      React.createElement('input', {
        ref: searchRef,
        type: 'text',
        className: 'dsh-claude-typeface-search-input',
        value: query,
        spellCheck: false,
        autoComplete: 'off',
        placeholder: copy('typefaceSearchPlaceholder'),
        'aria-label': copy('typefaceSearchPlaceholder'),
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value),
        onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          if (canAddTyped) {
            addTyped()
            return
          }
          const first = recommended[0] ?? installed[0]
          if (first !== undefined) toggleFamily(first)
        },
      }),
      query !== ''
        ? React.createElement(
          'button',
          {
            type: 'button',
            className: 'dsh-claude-typeface-icon-btn',
            title: copy('typefaceClearSearch'),
            'aria-label': copy('typefaceClearSearch'),
            onClick: () => {
              setQuery('')
              searchRef.current?.focus({ preventScroll: true })
            },
          },
          React.createElement(Glyph, { name: 'close' }),
        )
        : null,
    ),
    React.createElement(
      'div',
      { className: 'dsh-claude-typeface-dropdown', role: 'menu' },
      canAddTyped
        ? React.createElement(
          'button',
          {
            type: 'button',
            role: 'menuitem',
            className: 'dsh-claude-popover-item dsh-claude-typeface-add',
            onClick: addTyped,
          },
          React.createElement('span', { className: 'dsh-claude-popover-item-icon', 'aria-hidden': 'true' }, React.createElement(Glyph, { name: 'plus' })),
          React.createElement('span', { className: 'dsh-claude-popover-item-text' }, copy('typefaceAddCustom', { name: typedNormalized })),
        )
        : null,
      recommended.length > 0
        ? React.createElement(
          React.Fragment,
          null,
          React.createElement('div', { className: 'dsh-claude-typeface-group-label' }, copy('typefaceGroupRecommended')),
          recommended.map(renderOption),
        )
        : null,
      installed.length > 0
        ? React.createElement(
          React.Fragment,
          null,
          React.createElement('div', { className: 'dsh-claude-typeface-group-label' }, copy('typefaceGroupSystem')),
          installed.map(renderOption),
        )
        : null,
      !hasResults
        ? React.createElement('div', { className: 'dsh-claude-popover-status' }, copy('typefaceNoMatch'))
        : null,
    ),
  )
}
