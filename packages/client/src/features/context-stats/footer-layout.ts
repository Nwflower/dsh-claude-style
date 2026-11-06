import { COMPOSER_ATTR, STATS_POSITION_FOOTER } from '../../constants'
import { readPrefs } from '../../core/prefs'
import { COMPOSER_STACK, findComposerCard, findComposerStats } from '@dsh-claude-style/engine/host'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { inPageBox } from '../../shared/page-zoom'

export const FOOTER_LINE_ATTR = 'data-dsh-claude-footer-line'

/** The dock holding the host's statistics figures. */
export function findStatsDock() {
  return findComposerStats()?.closest<HTMLElement>('[data-dsh-claude-part~="composer-dock"]') ?? null
}

/**
 * The compact footer's figures over the toolbar row: their line alone leaves the
 * host's dock, so the meter keeps the row the host draws it in and the figures
 * ride the toolbar's free middle. The measured box is the line's own, taken
 * against the stack the dock stands in.
 */
export function createFooterLayout(refit: () => void) {
  let line: HTMLElement | null = null
  let cancel: (() => void) | null = null
  let fittedRoom: number | null = null
  const properties = ['--dsh-claude-footer-left', '--dsh-claude-footer-bottom', '--dsh-claude-footer-height']

  function clear() {
    cancel?.()
    cancel = null
    fittedRoom = null
    if (line !== null) {
      line.removeAttribute(FOOTER_LINE_ATTR)
      for (const property of properties) line.style.removeProperty(property)
    }
    line = null
  }

  /** Mark `next` as the line the footer is laid out on, taking the mark off the one before. */
  function mark(next: HTMLElement) {
    if (line === next) return
    clear()
    line = next
    setAttributeIfChanged(next, FOOTER_LINE_ATTR, '')
  }

  /** The row edges the figures may use, in page pixels. */
  function geometry() {
    const card = findComposerCard()
    const row = card?.querySelector<HTMLElement>('[data-dsh-claude-part~="trailing"]')?.parentElement
    const stack = card?.closest<HTMLElement>(COMPOSER_STACK)
    if (!row || !stack) return null
    const tools = row.querySelector<HTMLElement>('[data-dsh-claude-part~="tools"]')
    const trailing = row.querySelector<HTMLElement>('[data-dsh-claude-part~="trailing"]')
    const rowBox = inPageBox(row.getBoundingClientRect())
    const stackBox = inPageBox(stack.getBoundingClientRect())
    const start = tools ? inPageBox(tools.getBoundingClientRect()).right + 12 : rowBox.left
    const end = trailing ? inPageBox(trailing.getBoundingClientRect()).left - 12 : rowBox.right
    return { rowBox, stackBox, start, end }
  }

  /** The pixels between the toolbar's controls, or null while the row is absent. */
  function room() {
    const view = geometry()
    return view === null ? null : Math.max(0, view.end - view.start)
  }

  function sync(root: HTMLElement) {
    if (readPrefs().statsPosition !== STATS_POSITION_FOOTER || !document.body.hasAttribute(COMPOSER_ATTR)) {
      clear()
      return
    }
    mark(root)
    if (cancel !== null) return
    let measured: { mode: string, left: number, bottom: number, height: number, room: number } | null = null
    cancel = requestFrame({
      read() {
        const view = geometry()
        if (view === null || !root.isConnected) return
        const { rowBox, stackBox, start, end } = view
        const width = inPageBox(root.getBoundingClientRect()).width
        const align = readPrefs().statsFooterAlign
        const left = align === 'left' ? start : align === 'right' ? end - width : (start + end - width) / 2
        measured = {
          mode: width <= end - start ? 'overlay' : 'below',
          left: Math.max(start, left) - stackBox.left,
          bottom: stackBox.bottom - rowBox.bottom,
          height: rowBox.height,
          room: Math.max(0, end - start),
        }
      },
      write() {
        cancel = null
        if (measured === null) {
          clear()
          return
        }
        // The ring joins the toolbar after the statistics pass. A changed
        // budget must refit the figures before their next box is positioned,
        // even when the session's numbers and the card's width stayed still.
        if (measured.room !== fittedRoom) {
          fittedRoom = measured.room
          refit()
          sync(root)
          return
        }
        setAttributeIfChanged(root, FOOTER_LINE_ATTR, measured.mode)
        const values = [measured.left, measured.bottom, measured.height]
        for (let i = 0; i < properties.length; i++) {
          const value = `${Math.round(values[i] * 100) / 100}px`
          if (root.style.getPropertyValue(properties[i]) !== value) root.style.setProperty(properties[i], value)
        }
      },
    })
  }
  return { sync, clear, room }
}
