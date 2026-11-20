import { FOOTER_ACTIONS_SELECTOR, MENU_TRIGGER_SELECTOR, SIGN_OUT_GLYPH_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hasSkinClass, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { FOOTER_BLOCK_ATTR, FOOTER_MENU_ATTR, FOOTER_SEAT_ATTR, FOOTER_SEATS } from '../../constants'

/**
 * What the sidebar footer holds and how the takeover leaves each entry: the
 * action slot's entries and any card a plugin mounted beside them, classified
 * and hidden in place. The account popover's mirror (footer-mirror.ts) reads the
 * entry list this pass returns and the marks it writes; the row model and the
 * popover's own behaviour belong to account-footer.ts. Splitting the classification
 * from the mirroring keeps each file under the source stop line.
 */

/**
 * The units the drawer mirrors, in the footer's own order: the action slot's
 * entries, read where the slot stands, and any card a plugin mounted beside
 * them.
 *
 * The slot is not the only way into the footer: a plugin may mount its own
 * card straight into the foot area — the usage plugin's foot card sits
 * between the slot and the settings area — and the takeover collects what the
 * footer holds wherever the plugin put it. The slot container is read through,
 * and the settings area (which carries the host's own account row) and the
 * skin's own nodes are no entries.
 */
export function footerEntriesIn(footArea: Element) {
  const entries: Element[] = []
  const kids = footArea.children
  for (let i = 0; i < kids.length; i++) {
    const kid = kids[i]
    if (kid.matches(FOOTER_ACTIONS_SELECTOR)) {
      entries.push(...footerEntriesOf(kid))
      continue
    }
    if (kid.matches('[data-dsh-claude-part~="settings-area"]')) continue
    if (hasSkinClass(kid)) continue
    entries.push(kid)
  }
  return entries
}

/**
 * Mirrorable footer units. Every slot outlet renders inside a
 * `div[data-slot]` anchor with `display:contents`, so a list slot's
 * entries are the ANCHOR's children, not footerActions' — reading
 * `footerActions.children` directly collapses every registrant into a
 * single mirrorable unit and drops all but the first from the popover.
 * Dead cells (`data-slot-error`) never mirror.
 */
function footerEntriesOf(footerActions: Element) {
  const entries: Element[] = []
  const kids = footerActions.children
  for (let i = 0; i < kids.length; i++) {
    const kid = kids[i]
    if (kid.hasAttribute('data-slot-error')) continue
    if (kid.hasAttribute('data-slot')) {
      const slotKids = kid.children
      for (let j = 0; j < slotKids.length; j++) {
        if (!slotKids[j].hasAttribute('data-slot-error')) entries.push(slotKids[j])
      }
    } else {
      entries.push(kid)
    }
  }
  return entries
}

/** The nodes one entry is read through: the entry itself and its whole subtree. */
function entryNodes(entry: Element) {
  const nodes: Element[] = [entry]
  const all = entry.querySelectorAll('*')
  for (let i = 0; i < all.length; i++) nodes.push(all[i])
  return nodes
}

/**
 * The seat a footer entry keeps in the sidebar, or null for an entry the
 * popover gathers (constants.ts, FOOTER_SEATS). A seat is matched on the
 * naming the plugin itself writes on its control, so the skin reaches a
 * control the plugin owns without a class name the build hashes.
 */
function seatOf(entry: Element) {
  for (const option of FOOTER_SEATS) {
    if (entry.matches(option.selector)) return option.seat
  }
  return null
}

/**
 * Whether an entry opens a menu — its own trigger or a control inside it — or
 * carries the host's sign-out glyph. Both the hiding pass and the mirror read
 * this one answer, so an entry the popover refuses to gather is never hidden
 * out of the sidebar (issue #417). A menu portals from its trigger's own box
 * and returns focus to that trigger, so the trigger must keep painting where
 * the plugin put it: a mirrored copy's press would open the menu against a
 * hidden anchor. The sign-out control belongs to the account area the popover
 * itself is, so a second copy would be two controls for one state.
 */
function keepsMenuAnchor(entry: Element) {
  return entry.matches(MENU_TRIGGER_SELECTOR) ||
    entry.querySelector(MENU_TRIGGER_SELECTOR) !== null ||
    entry.querySelector(SIGN_OUT_GLYPH_SELECTOR) !== null
}

/**
 * Whether one node is a floating overlay the footer must leave in the page: a
 * menu, listbox or ARIA dialog, or a native `<dialog>`. A native dialog's role
 * is implicit and, closed, its box is `position: absolute`, so neither the
 * role nor the fixed test sees it before it opens; hidden, an open one stays
 * modal, and the browser holds the whole page inert behind an overlay that
 * nothing paints.
 */
function isOverlay(el: Element) {
  if (el.tagName === 'DIALOG') return true
  const role = el.getAttribute('role') || ''
  return role === 'dialog' || role === 'menu' || role === 'listbox'
}

function isFixedPanel(el: Element) {
  return window.getComputedStyle(el).position === 'fixed'
}

/** A node mounted after the read phase still needs its own fixed-position answer. */
function isFixedPanelForSync(el: Element, read: { fixed: Set<Element>, measured: Set<Element> } | null) {
  if (read !== null && read.measured.has(el)) return read.fixed.has(el)
  return isFixedPanel(el)
}

/** Hide every branch of `el`'s subtree that does not carry an overlay. */
function markFooterHiddenBranches(el: Element) {
  if (el.hasAttribute('data-dsh-claude-footer-overlay')) {
    el.removeAttribute('data-dsh-claude-footer-hidden')
    return
  }
  if (el.querySelector('[data-dsh-claude-footer-overlay]') !== null) {
    el.removeAttribute('data-dsh-claude-footer-hidden')
    const kids = el.children
    for (let i = 0; i < kids.length; i++) markFooterHiddenBranches(kids[i])
    return
  }
  setAttributeIfChanged(el, 'data-dsh-claude-footer-hidden', '')
}

/**
 * The footer's visibility pass: measure the fixed panels in the read phase,
 * classify and hide the entries in the write phase, and hand the mirror the
 * live entry list. The marks it writes are the mirror's eligibility answers, so
 * an entry the popover skips is never hidden out of the sidebar as well.
 */
export function createFooterVisibility() {
  /**
   * The footer elements laid out as fixed panels, read in the pass's read phase
   * and taken by the same pass's sync (D40): a computed style read while the
   * pass writes forces the page's whole style recalc under it. `measured` tells
   * a later sync which nodes already have an answer; a panel mounted between
   * that read and the sync is measured on its own rather than collapsed as an
   * ordinary entry (the Remote page's backdrop).
   */
  let fixedRead: { footArea: Element, fixed: Set<Element>, measured: Set<Element> } | null = null

  function measure(footArea: Element) {
    const fixed = new Set<Element>()
    const measured = new Set<Element>()
    for (const entry of footerEntriesIn(footArea)) {
      const nodes = entryNodes(entry)
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i]
        measured.add(el)
        // A node already carrying the overlay mark is read like any other: the
        // mark is this function's own earlier answer, and skipping it leaves
        // `sync` with no reading for a panel it had marked. The node then falls
        // back to the entry's first control, which takes the panel's box away
        // with `display: contents` (the Remote page's own backdrop is the case).
        if (!isOverlay(el) && isFixedPanel(el)) fixed.add(el)
      }
    }
    fixedRead = { footArea, fixed, measured }
  }

  /**
   * Hide the footer's own controls in place and return the units the drawer
   * mirrors. The `sidebar.footer.action` list slot accepts arbitrary plugin
   * controls, not just buttons: a plugin may render a composite widget
   * (toggles, selects, status chips) straight into the sidebar footer.
   * Redirection therefore works on ENTRIES, not on
   * `querySelectorAll('button')`:
   *   - every entry is marked `data-dsh-claude-footer-entry` (CSS
   *     collapses its box so nothing paints in the sidebar);
   *   - entries without a floating overlay are hidden wholesale via
   *     `data-dsh-claude-footer-hidden`;
   *   - entries hosting an overlay — a fixed-position panel (the cordis
   *     inventory panel) or a dialog/menu/listbox — stay visible, but
   *     every branch of their subtree that does not lead to the overlay
   *     is hidden, so only the overlay itself can surface;
   *   - an entry that IS an overlay (a plugin's own dialog mounted into
   *     the footer, the cost-meter update notice) is no unit at all: it
   *     is left whole, marked `data-dsh-claude-footer-overlay` and
   *     nothing else, so the takeover writes no display rule onto it;
   *   - an entry a FOOTER_SEATS seat claims (constants.ts) stays in the
   *     sidebar: it keeps its entry mark and gains the seat and the snapshot
   *     its rule copies, and the popover gathers no row for it.
   *   - an entry that is a `<section>` is a block the plugin laid out for the
   *     sidebar, not a control: it keeps its place above the account row under
   *     FOOTER_BLOCK_ATTR, the popover carries a copy of it for the collapsed
   *     rail alone.
   *   - an entry that opens a menu (its own trigger or a control inside it) or
   *     carries the host's sign-out glyph keeps its place in the sidebar under
   *     FOOTER_MENU_ATTR: the menu portals from the trigger's own box and returns
   *     focus to it, so the popover gathers no row and the takeover hides nothing
   *     (issue #417).
   * Returns the live entry list for popover mirroring.
   */
  function sync(footArea: Element) {
    const read = fixedRead !== null && fixedRead.footArea === footArea ? fixedRead : null
    // The pass measures one footer, and only that footer's sync may take the
    // reading: a sync for another element leaves it to the reader it belongs to.
    if (read !== null) fixedRead = null
    const entries = footerEntriesIn(footArea)
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      // A sync outside a pass (the popover opening) has no read phase, and
      // reads the panels while it writes.
      const entryOverlay = isOverlay(entry) || isFixedPanelForSync(entry, read)
      if (entryOverlay) {
        // An entry that is itself an overlay — a plugin's own dialog mounted
        // into the footer (the cost-meter update notice), or a fixed panel — is
        // no unit to collapse: it keeps its whole box, and the takeover puts no
        // entry or hidden mark on it. An open modal dialog left visible stays
        // modal; hidden, the browser would hold the whole page inert behind an
        // overlay that nothing paints (issue #97).
        entry.removeAttribute('data-dsh-claude-footer-entry')
        entry.removeAttribute('data-dsh-claude-footer-hidden')
        entry.removeAttribute(FOOTER_BLOCK_ATTR)
        entry.removeAttribute(FOOTER_MENU_ATTR)
        setAttributeIfChanged(entry, 'data-dsh-claude-footer-overlay', '')
        continue
      }
      const seat = seatOf(entry)
      if (seat !== null) {
        // A kept entry stands in the sidebar: the account row carries a copy of
        // it (footer-seats.ts), and the plugin's own node stays hidden in its
        // slot rather than collapsed into the popover. Neither the entry mark
        // nor the hidden mark is written — the seat rule owns the node.
        setAttributeIfChanged(entry, FOOTER_SEAT_ATTR, seat)
        entry.removeAttribute('data-dsh-claude-footer-entry')
        entry.removeAttribute('data-dsh-claude-footer-hidden')
        entry.removeAttribute(FOOTER_BLOCK_ATTR)
        entry.removeAttribute(FOOTER_MENU_ATTR)
        continue
      }
      if (keepsMenuAnchor(entry)) {
        // A menu trigger keeps its place in the sidebar: the menu portals from
        // the trigger's own box and returns focus to it, so the takeover writes
        // no display rule onto the entry and footer-takeover.css gives the
        // footer's action box its size back for it. The popover gathers no row
        // (the mirror reads the same mark), so the entry is never hidden out of
        // both places at once (issue #417). A hidden mark an earlier pass wrote
        // on a branch comes off, so a trigger that grew into an entry already
        // collapsed paints whole again.
        setAttributeIfChanged(entry, FOOTER_MENU_ATTR, '')
        entry.removeAttribute('data-dsh-claude-footer-entry')
        entry.removeAttribute('data-dsh-claude-footer-hidden')
        entry.removeAttribute(FOOTER_SEAT_ATTR)
        entry.removeAttribute(FOOTER_BLOCK_ATTR)
        const stale = entry.querySelectorAll('[data-dsh-claude-footer-hidden]')
        for (let s = 0; s < stale.length; s++) stale[s].removeAttribute('data-dsh-claude-footer-hidden')
        continue
      }
      entry.removeAttribute(FOOTER_SEAT_ATTR)
      entry.removeAttribute(FOOTER_MENU_ATTR)
      const block = entry.tagName === 'SECTION'
      if (block) {
        // A section is the plugin's own block laid out for the sidebar — a
        // heading and the rows under it — not a control the account menu can
        // stand in for: it keeps its place above the account row, and
        // footer-takeover.css gives the footer's action box its size back for
        // it. The popover still carries a copy, which the rail shows where the
        // block itself has no room.
        setAttributeIfChanged(entry, FOOTER_BLOCK_ATTR, '')
        entry.removeAttribute('data-dsh-claude-footer-entry')
        entry.removeAttribute('data-dsh-claude-footer-hidden')
        entry.removeAttribute(FOOTER_MENU_ATTR)
        continue
      }
      entry.removeAttribute(FOOTER_BLOCK_ATTR)
      setAttributeIfChanged(entry, 'data-dsh-claude-footer-entry', '')
      const all = entry.querySelectorAll('*')
      for (let j = 0; j < all.length; j++) {
        const el = all[j]
        if (el.hasAttribute('data-dsh-claude-footer-overlay')) continue
        const overlay = isOverlay(el) || isFixedPanelForSync(el, read)
        if (overlay) setAttributeIfChanged(el, 'data-dsh-claude-footer-overlay', '')
      }
      markFooterHiddenBranches(entry)
    }
    return entries
  }

  /** Drop every takeover marker from the host's footer entries. */
  function clear(footArea: Element) {
    const marked = footArea.querySelectorAll(
      '[data-dsh-claude-footer-entry], [data-dsh-claude-footer-hidden], [data-dsh-claude-footer-overlay], [data-dsh-claude-footer-seat], [data-dsh-claude-footer-block], [data-dsh-claude-footer-menu]',
    )
    for (let i = 0; i < marked.length; i++) {
      marked[i].removeAttribute('data-dsh-claude-footer-entry')
      marked[i].removeAttribute('data-dsh-claude-footer-hidden')
      marked[i].removeAttribute('data-dsh-claude-footer-overlay')
      marked[i].removeAttribute(FOOTER_SEAT_ATTR)
      marked[i].removeAttribute(FOOTER_BLOCK_ATTR)
      marked[i].removeAttribute(FOOTER_MENU_ATTR)
    }
  }

  return { measure, sync, clear }
}
