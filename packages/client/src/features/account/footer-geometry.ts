import { ACCOUNT_HOST_ROW_ATTR } from '../../constants'
import { writeBodyProperty } from '@dsh-claude-style/engine/body-properties'
import { findFootArea } from '@dsh-claude-style/engine/host'
import { readPrefs } from '../../core/prefs'
import { inPageBox } from '../../shared/page-zoom'
import { resolveDisplayName } from '../../shared/identity'
import type { createAccountDrawer } from './account-drawer'
import type { createHostAccountMenu } from './host-menu'
import type { createAccountSurface } from './surface'
import type { createFooterMirror } from './footer-mirror'
import type { createFooterSeats } from './footer-seats'
import type { createAccountRows } from './rows'
import type { createHostMenuPlacement } from './menu-placement'
import type { createHoverIntent, createPointerWatch } from '../../shared/popover'

/** The marker the stylesheet hangs the host account row's Claude shape on. */
const HOST_ROW_ATTR = ACCOUNT_HOST_ROW_ATTR
/** The host row's own label, kept while the skin's name stands in its place. */
const HOST_ROW_NAME_ATTR = 'data-dsh-claude-account-host-name'

/** One host row's four listeners, as account-footer.ts binds and takes them off. */
export interface HostRowBindings {
  catch: (e: Event) => void
  enter: () => void
  leave: () => void
  press: () => void
}

/** The pieces the footer's geometry reads, all owned by account-footer.ts. */
export interface FooterGeometryOptions {
  /** The self-built trigger and popover (features/account/account-drawer.ts). */
  drawer: ReturnType<typeof createAccountDrawer>
  /** The host's own account row and its menu (features/account/host-menu.ts). */
  hostMenu: ReturnType<typeof createHostAccountMenu>
  /** Which surface stands on this host (features/account/surface.ts). */
  surface: ReturnType<typeof createAccountSurface>
  /** The plugin footer entries mirrored into the footer (features/account/footer-mirror.ts). */
  mirror: ReturnType<typeof createFooterMirror>
  /** The copies the skin seats in the account row (features/account/footer-seats.ts). */
  seats: ReturnType<typeof createFooterSeats>
  /** The account rows, for the host path's header (features/account/rows.ts). */
  rows: ReturnType<typeof createAccountRows>
  /** The host menu's placement watch (features/account/menu-placement.ts). */
  menuPlacement: ReturnType<typeof createHostMenuPlacement>
  /** The host path's hover intent, cancelled when the footer is handed back. */
  hostHoverIntent: ReturnType<typeof createHoverIntent>
  /** The pointer watch that hover intent reads. */
  pointerWatch: ReturnType<typeof createPointerWatch>
  /** The host row bindings this generation installed; the hand-back clears them. */
  hostRowBindings: Map<HTMLElement, HostRowBindings>
  /** Take one host row's listeners off. */
  takeHostRowBindings(row: HTMLElement, bindings: HostRowBindings): void
  /** Bind the hover preference on the host's account row. */
  bindHostRowHover(row: HTMLElement): void
  /** Take the armed marker off the body. */
  disarmAccountMenu(): void
  /** Take the host menu's own listeners off. */
  unbindHostMenu(): void
}

/**
 * The footer's geometry and the host row's label.
 *
 * The host renders its own account row, so the skin cannot place anything by
 * moving it: the entry row's measured box and the host's own label are handed
 * over instead — the width and insets as body properties the stylesheet reads,
 * the name as a text node rewritten in place and restored from the row's own
 * attribute. The pass's read half takes the row's box before any write, and a
 * pass that finds the takeover switched off hands the whole footer back.
 */
export function createFooterGeometry(options: FooterGeometryOptions) {
  const { drawer, hostMenu, surface, mirror, seats, rows } = options

  /** The entry row's width, as last written to the stylesheet. */
  let accountWidth = 0
  /** The footer's content width, as last written: the width mirrored entries were laid out in. */
  let footerWidth = 0
  /** The self-built drawer's distance from the footer's edges, as last written. */
  let accountInsetLeft = -1
  let accountInsetRight = -1

  /**
   * Hand the sidebar footer back to the host.
   *
   * The "Redraw the account area" preference turns the whole
   * takeover off, so the skin's own nodes and injected container go and
   * every marker it put on the host's entries is removed — with the
   * stylesheet's takeover rules gated on the same attribute, the footer then
   * renders exactly as shipped.
   */
  function dropAccountFooter(footArea: Element | null) {
    drawer.cancelClose()
    options.hostHoverIntent.cancel()
    options.pointerWatch.unbind()
    // The drive that presses the host's own settings row stops with the footer
    // it was reaching through.
    hostMenu.stopSettingsDrive()
    options.disarmAccountMenu()
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
    drawer.drop()
    // The menu marker goes with the takeover: an open host menu must not
    // keep the skin's card styling after the footer is handed back.
    surface.clearMenu()
    // The copies stand inside the row the takeover draws, so they leave with it.
    seats.clear()
    const injected = document.querySelectorAll('.dsh-claude-account-inject')
    for (let i = 0; i < injected.length; i++) injected[i].remove()
    const marked = document.querySelectorAll(`[${HOST_ROW_ATTR}]`)
    for (let m = 0; m < marked.length; m++) {
      // The row outlives the takeover, so its own label goes back with it.
      restoreHostRowName(marked[m])
      marked[m].removeAttribute(HOST_ROW_ATTR)
    }
    // The host's row outlives this generation, so its listeners come off here:
    // a switch off and on again must not leave a second set behind.
    for (const [row, bindings] of options.hostRowBindings) {
      options.takeHostRowBindings(row, bindings)
    }
    options.hostRowBindings.clear()
    options.unbindHostMenu()
    options.menuPlacement.unwatch()
    if (footArea) mirror.clear(footArea)
  }

  /** The entry row's boxes, taken in the pass's read phase when the row already stands (D40). */
  let rowBoxes: { row: Element, rowRect: DOMRect, footRect: DOMRect | null, footerWidth: number } | null = null

  /** The footer's content width: the box a plugin's own footer entry is laid out in. */
  function readFooterContentWidth(footArea: Element): number {
    const styles = getComputedStyle(footArea)
    const contentWidth = Math.round(footArea.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight))
    return contentWidth > 0 ? contentWidth : 0
  }

  /**
   * Read the entry row's box before the pass writes. The row a pass creates
   * itself (the synthetic button) is not there yet, so that pass falls back to
   * measuring it while writing, as it always did.
   */
  function measureAccountRow() {
    rowBoxes = null
    const footArea = findFootArea()
    if (footArea === null) return
    if (readPrefs().collapseFooter) mirror.measure(footArea)
    const synthetic = surface.mode() === 'synthetic'
    const row = synthetic ? drawer.btn() : hostMenu.trigger()
    if (row === null) return
    // A plugin's footer entries are laid out in the footer's content box; a
    // mirrored entry keeps that width so the card inside it does not reflow.
    rowBoxes = {
      row,
      rowRect: inPageBox(row.getBoundingClientRect()),
      footRect: synthetic ? inPageBox(footArea.getBoundingClientRect()) : null,
      footerWidth: readFooterContentWidth(footArea)
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
  function syncHostRowName(row: Element) {
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
  function restoreHostRowName(row: Element) {
    if (!row.hasAttribute(HOST_ROW_NAME_ATTR)) return
    const original = row.getAttribute(HOST_ROW_NAME_ATTR) || ''
    row.removeAttribute(HOST_ROW_NAME_ATTR)
    const node = hostRowLabelNode(row)
    if (node !== null && (node.nodeValue || '').trim() !== original) node.nodeValue = original
  }

  /**
   * Measure the entry row and hand its box to the stylesheet.
   *
   * The host's account menu is portalled outside the sidebar, so it cannot
   * inherit the row's width: the card reads the measured width from
   * --dsh-claude-account-width. The self-built drawer is a child of the
   * footer instead, but the footer's padding box is wider than the row, so
   * its left and right are the measured distances from the footer's edges.
   * Every value is written only on a change.
   */
  function syncAccountRowBox(row: Element | null, footArea: Element) {
    if (row === null) return
    const synthetic = surface.mode() === 'synthetic'
    const measured = rowBoxes !== null && rowBoxes.row === row
      ? rowBoxes
      : {
          row,
          rowRect: inPageBox(row.getBoundingClientRect()),
          footRect: synthetic ? inPageBox(footArea.getBoundingClientRect()) : null,
          footerWidth: readFooterContentWidth(footArea)
        }
    const rowRect = measured.rowRect
    const rowWidth = Math.round(rowRect.width)
    if (rowWidth > 0 && rowWidth !== accountWidth) {
      accountWidth = rowWidth
      writeBodyProperty('--dsh-claude-account-width', `${rowWidth}px`)
    }
    if (measured.footerWidth > 0 && measured.footerWidth !== footerWidth) {
      footerWidth = measured.footerWidth
      writeBodyProperty('--dsh-claude-account-footer-width', `${footerWidth}px`)
    }
    if (!synthetic || measured.footRect === null) return
    const footRect = measured.footRect
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
  }

  function syncAccountFooter() {
    const footArea = findFootArea()
    if (footArea === null) return

    if (!readPrefs().collapseFooter) {
      dropAccountFooter(footArea)
      return
    }
    surface.sync()
    if (surface.mode() === 'host') {
      drawer.drop()
    } else {
      drawer.ensure(footArea)
    }

    // The host's own account row is the entry on the host path: mark it so
    // the stylesheet can repaint it as a Claude row. It is left in the host's
    // DOM and flow, never moved or copied.
    const hostTrigger = hostMenu.trigger()
    if (hostTrigger !== null && !hostTrigger.hasAttribute(HOST_ROW_ATTR)) hostTrigger.setAttribute(HOST_ROW_ATTR, '')
    // The host path's row holds the host's own label — the account number a
    // signed-in Desktop shows. The skin's name stands in its place.
    if (hostTrigger !== null && surface.mode() === 'host') syncHostRowName(hostTrigger)
    // The entry row — the host's own row, or the self-built button — is the
    // shape both cards have to match, so its box is measured here and handed
    // to the stylesheet. The hover preference is bound on the host's row in
    // the same pass, since the host renders that row itself.
    const entryRow = surface.mode() === 'host' ? hostTrigger : drawer.btn()
    syncAccountRowBox(entryRow, footArea)
    if (hostTrigger !== null) options.bindHostRowHover(hostTrigger)

    // The host's footer entries are hidden in place on every pass, drawer or
    // no drawer: the host re-renders them, and a pass that skipped this left
    // their icons painted beside the account row until the drawer had been
    // opened once. Only the mirroring needs a container to write into.
    mirror.sync(footArea)
    // A seated entry stands in the account row itself, so the row has to be
    // mounted before the copy has a place to go.
    if (entryRow !== null) seats.sync(footArea)

    const root = surface.mode() === 'host' ? surface.container() : drawer.popover()
    if (root === null) return
    rows.syncHeader(root, hostTrigger)
    // The rail toggle (and any reflow) moves the anchor without a window
    // resize or a page scroll, so an open drawer re-resolves its position at
    // the end of its own pass.
    if (drawer.isOpen()) drawer.placeOpen()
  }

  return {
    /** The write half of a pass: the footer's surfaces, the row's box and its label. */
    sync: syncAccountFooter,
    /** The read half: the entry row's box, taken before the pass writes (D40). */
    measure: measureAccountRow,
    /** Hand the whole footer back to the host. */
    drop: dropAccountFooter,
  }
}
