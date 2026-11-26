import { writeBodyProperty } from '@dsh-claude-style/engine/body-properties'
import { inPageBox } from '../../shared/page-zoom'
import { resolveDisplayName } from '../../shared/identity'

/** The host row's own label, kept while the skin's name stands in its place. */
const HOST_ROW_NAME_ATTR = 'data-dsh-claude-account-host-name'

/** The entry row's boxes, as one read took them. */
interface RowBoxes {
  row: Element
  rowRect: DOMRect
  footRect: DOMRect | null
  footerWidth: number
}

/** The footer's content width: the box a plugin's own footer entry is laid out in. */
function readFooterContentWidth(footArea: Element): number {
  const styles = getComputedStyle(footArea)
  const contentWidth = Math.round(footArea.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight))
  return contentWidth > 0 ? contentWidth : 0
}

/**
 * Read the entry row's boxes. The footer's box is read only for the self-built
 * drawer, the one surface the stylesheet places against the footer's edges; a
 * plugin's footer entries are laid out in the footer's content box, and a
 * mirrored entry keeps that width so the card inside it does not reflow.
 */
function readRowBoxes(row: Element, footArea: Element, synthetic: boolean): RowBoxes {
  return {
    row,
    rowRect: inPageBox(row.getBoundingClientRect()),
    footRect: synthetic ? inPageBox(footArea.getBoundingClientRect()) : null,
    footerWidth: readFooterContentWidth(footArea),
  }
}

/**
 * The entry row's box, handed to the stylesheet.
 *
 * The host's account menu is portalled outside the sidebar, so it cannot
 * inherit the row's width: the card reads the measured width from
 * --dsh-claude-account-width. The self-built drawer is a child of the footer
 * instead, but the footer's padding box is wider than the row, so its left and
 * right are the measured distances from the footer's edges. Every value is
 * written only on a change. The pass's read phase takes the boxes before any
 * write (D40); a row the pass creates itself (the self-built button) is not
 * there yet, so that pass measures it while writing.
 */
export function createFooterGeometry() {
  /** The entry row's width, as last written to the stylesheet. */
  let accountWidth = 0
  /** The footer's content width, as last written: the width mirrored entries were laid out in. */
  let footerWidth = 0
  /** The self-built drawer's distance from the footer's edges, as last written. */
  let accountInsetLeft = -1
  let accountInsetRight = -1
  /** What the pass's read phase measured; its write consumes it. */
  let measured: RowBoxes | null = null

  return {
    /** The read phase: the entry row's boxes, or nothing while there is no row. */
    measure(row: Element | null, footArea: Element, synthetic: boolean) {
      measured = row === null ? null : readRowBoxes(row, footArea, synthetic)
    },

    /** The write phase: the row's width, the footer's width and the drawer's insets. */
    sync(row: Element | null, footArea: Element, synthetic: boolean) {
      if (row === null) return
      const boxes = measured !== null && measured.row === row ? measured : readRowBoxes(row, footArea, synthetic)
      const rowRect = boxes.rowRect
      const rowWidth = Math.round(rowRect.width)
      if (rowWidth > 0 && rowWidth !== accountWidth) {
        accountWidth = rowWidth
        writeBodyProperty('--dsh-claude-account-width', `${rowWidth}px`)
      }
      if (boxes.footerWidth > 0 && boxes.footerWidth !== footerWidth) {
        footerWidth = boxes.footerWidth
        writeBodyProperty('--dsh-claude-account-footer-width', `${footerWidth}px`)
      }
      if (!synthetic || boxes.footRect === null) return
      const footRect = boxes.footRect
      const left = Math.round(rowRect.left - footRect.left)
      const right = Math.round(footRect.right - rowRect.right)
      if (left !== accountInsetLeft) {
        accountInsetLeft = left
        writeBodyProperty('--dsh-claude-account-inset-left', `${left}px`)
      }
      if (right !== accountInsetRight) {
        accountInsetRight = right
        writeBodyProperty('--dsh-claude-account-inset-right', `${right}px`)
      }
    },

    /** Take every property this geometry wrote off the body. */
    clear() {
      measured = null
      if (accountWidth !== 0) {
        accountWidth = 0
        writeBodyProperty('--dsh-claude-account-width', null)
      }
      if (footerWidth !== 0) {
        footerWidth = 0
        writeBodyProperty('--dsh-claude-account-footer-width', null)
      }
      if (accountInsetLeft !== -1 || accountInsetRight !== -1) {
        accountInsetLeft = -1
        accountInsetRight = -1
        writeBodyProperty('--dsh-claude-account-inset-left', null)
        writeBodyProperty('--dsh-claude-account-inset-right', null)
      }
    },
  }
}

/**
 * The text node the host writes its own account label into — the account
 * number a Desktop signs in with. The row is the host's own button, so the
 * label is found rather than named: the first text node with words in it.
 */
function hostRowLabelNode(row: Element): Text | null {
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if ((node.nodeValue || '').trim() !== '') return node as Text
  }
  return null
}

/**
 * Put the skin's name where the host's own label stands.
 *
 * The settings page promises the stored name shows on the account row, and
 * on the host path that row is the host's own button: its box, its picture
 * and its click stay exactly as the host drew them, and only the words
 * change. A host that signed in writes the account number there, which is
 * the one thing that promise exists to keep off the row. Every pass
 * re-checks, because the host renders the row itself and may write its own
 * label back.
 */
export function syncHostRowName(row: Element) {
  // Nothing resolved: the host's own label is the only name there is.
  const name = resolveDisplayName()
  if (name === '') return
  const node = hostRowLabelNode(row)
  if (node === null) return
  const label = (node.nodeValue || '').trim()
  if (label === name) return
  // Kept on the row itself: the node belongs to the host, and handing the
  // footer back must leave the host's own label where it found it.
  if (!row.hasAttribute(HOST_ROW_NAME_ATTR)) row.setAttribute(HOST_ROW_NAME_ATTR, label)
  node.nodeValue = name
}

/** Hand the host's own label back to the row it came from. */
export function restoreHostRowName(row: Element) {
  if (!row.hasAttribute(HOST_ROW_NAME_ATTR)) return
  const original = row.getAttribute(HOST_ROW_NAME_ATTR) || ''
  row.removeAttribute(HOST_ROW_NAME_ATTR)
  const node = hostRowLabelNode(row)
  if (node !== null && (node.nodeValue || '').trim() !== original) node.nodeValue = original
}
