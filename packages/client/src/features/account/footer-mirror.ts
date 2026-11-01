import { FOOTER_ACTIONS_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { findFootArea } from '@dsh-claude-style/engine/host'
import { hasSkinClass } from '@dsh-claude-style/engine/dom'
import { FOOTER_SEAT_ATTR, FOOTER_SEATS } from '../../constants'
import { buildPopoverItem } from '../../shared/popover'
import { copy } from './copy'

/**
 * The host's sidebar footer entries, mirrored as rows of the account popover:
 * the row model, the two mount points and the popover's own behaviour belong to
 * account-footer.ts, and this module only reads what the footer holds — the
 * action slot's entries and any card a plugin mounted beside them — and rebuilds
 * those entries inside the popover body.
 */
export function createFooterMirror(options: {
  body(): HTMLElement | null
  anchor(): Element | null
  isOpen(): boolean
  close(): void
}) {
  /** The popover body, while sync and its helpers run (sync returns early without one). */
  function openBody() {
    const body = options.body()
    if (body === null) throw new Error('dsh-claude-style: the footer mirror has no popover body')
    return body
  }

  /**
   * Whether a press this skin must not interrupt is in flight: the browser is
   * between a pointerdown and its pointerup.
   */
  let pressDepth = 0

  function pressInFlight() {
    return pressDepth > 0
  }

  // Every press inside the card is tracked, in the capture phase so the depth is
  // already up before any row's own handler runs. The count is taken off on the
  // document, because a press that ends outside the card is still this press.
  const onPressStart = () => { pressDepth += 1 }
  const onPressEnd = () => { if (pressDepth > 0) pressDepth -= 1 }
  document.addEventListener('pointerdown', onPressStart, true)
  document.addEventListener('pointerup', onPressEnd, true)
  document.addEventListener('pointercancel', onPressEnd, true)

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
   * Returns the live entry list for popover mirroring.
   */
  function syncFooterVisibility(footArea: Element) {
    const fixed = fixedRead !== null && fixedRead.footArea === footArea ? fixedRead.fixed : null
    fixedRead = null
    const entries = footerEntriesIn(footArea)
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      // A sync outside a pass (the popover opening) has no read phase, and
      // reads the panels while it writes.
      const entryOverlay = isOverlay(entry) || (fixed === null ? isFixedPanel(entry) : fixed.has(entry))
      if (entryOverlay) {
        // An entry that is itself an overlay — a plugin's own dialog mounted
        // into the footer (the cost-meter update notice), or a fixed panel — is
        // no unit to collapse: it keeps its whole box, and the takeover puts no
        // entry or hidden mark on it. An open modal dialog left visible stays
        // modal; hidden, the browser would hold the whole page inert behind an
        // overlay that nothing paints (issue #97).
        entry.removeAttribute('data-dsh-claude-footer-entry')
        entry.removeAttribute('data-dsh-claude-footer-hidden')
        entry.setAttribute('data-dsh-claude-footer-overlay', '')
        continue
      }
      const seat = seatOf(entry)
      if (seat !== null) {
        // A kept entry stands in the sidebar: the account row carries a copy of
        // it (footer-seats.ts), and the plugin's own node stays hidden in its
        // slot rather than collapsed into the popover. Neither the entry mark
        // nor the hidden mark is written — the seat rule owns the node.
        entry.setAttribute(FOOTER_SEAT_ATTR, seat)
        entry.removeAttribute('data-dsh-claude-footer-entry')
        entry.removeAttribute('data-dsh-claude-footer-hidden')
        continue
      }
      entry.removeAttribute(FOOTER_SEAT_ATTR)
      entry.setAttribute('data-dsh-claude-footer-entry', '')
      const all = entry.querySelectorAll('*')
      for (let j = 0; j < all.length; j++) {
        const el = all[j]
        if (el.hasAttribute('data-dsh-claude-footer-overlay')) continue
        const overlay = isOverlay(el) || (fixed === null ? isFixedPanel(el) : fixed.has(el))
        if (overlay) el.setAttribute('data-dsh-claude-footer-overlay', '')
      }
      markFooterHiddenBranches(entry)
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

  /**
   * The footer elements laid out as fixed panels, read in the pass's read phase
   * and taken by the same pass's sync (D40): a computed style read while the
   * pass writes forces the page's whole style recalc under it.
   */
  let fixedRead: { footArea: Element, fixed: Set<Element> } | null = null

  function measure(footArea: Element) {
    const fixed = new Set<Element>()
    for (const entry of footerEntriesIn(footArea)) {
      const nodes = entryNodes(entry)
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i]
        // A node already carrying the overlay mark is read like any other: the
        // mark is this function's own earlier answer, and skipping it leaves
        // `sync` with no reading for a panel it had marked. The node then falls
        // back to the entry's first control, which takes the panel's box away
        // with `display: contents` (the Remote page's own backdrop is the case).
        if (!isOverlay(el) && isFixedPanel(el)) fixed.add(el)
      }
    }
    fixedRead = { footArea, fixed }
  }

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
  function footerEntriesIn(footArea: Element) {
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
    el.setAttribute('data-dsh-claude-footer-hidden', '')
  }

  /**
   * Bring one mirrored text item in line with the entry behind its index.
   * The label and badge are the plugin's own strings, so they are written as
   * text; the icon is a copy of the plugin's node rather than re-parsed
   * markup, and is replaced only when the source's markup changed.
   */
  function syncMirrorItem(item: Element, iconEl: Element | null, text: string, badge: string) {
    const iconBox = item.querySelector('.dsh-claude-popover-item-icon')
    const iconHtml = iconEl ? iconEl.outerHTML : ''
    if (iconBox !== null && iconBox.__dshIconHtml !== iconHtml) {
      iconBox.__dshIconHtml = iconHtml
      while (iconBox.firstChild) iconBox.removeChild(iconBox.firstChild)
      if (iconEl) iconBox.appendChild(iconEl.cloneNode(true))
    }
    const textBox = item.querySelector('.dsh-claude-popover-item-text')
    if (textBox !== null && textBox.textContent !== text) textBox.textContent = text
    let badgeBox = item.querySelector('.dsh-claude-popover-item-badge')
    if (badge) {
      if (badgeBox === null) {
        badgeBox = document.createElement('span')
        badgeBox.className = 'dsh-claude-popover-item-badge'
        item.appendChild(badgeBox)
      }
      if (badgeBox.textContent !== badge) badgeBox.textContent = badge
    } else if (badgeBox !== null) {
      item.removeChild(badgeBox)
    }
  }

  /** Remove the mirrored text item for one entry index, if present. */
  function removeActionMirror(idx: number) {
    const item = openBody().querySelector(`[data-action-index="${idx}"]`)
    if (item && item.parentElement) item.parentElement.removeChild(item)
  }

  /** Remove the embedded widget clone for one entry index, if present. */
  function removeEmbedMirror(idx: number) {
    const embed = openBody().querySelector(`[data-embed-index="${idx}"]`)
    if (embed && embed.parentElement) embed.parentElement.removeChild(embed)
  }

  /**
   * Whether an entry reads as a plain ACTION (mirror it as a text menu
   * item) or as a rich WIDGET (embed a live clone). A text item is only
   * faithful when the trigger accounts for essentially all of the
   * entry's visible content: a clickable progress-bar stack (cost-meter
   * balance) would otherwise shrink to one label and lose its bars.
   * Overlay text is excluded so an open cordis panel does not flip its
   * own entry into a widget.
   */
  function entryIsActionLike(entry: Element, trigger: HTMLElement | null) {
    if (trigger === null) return false
    if (trigger === entry) {
      // Only genuinely interactive ROOTS count as actions; a clickable
      // container (a region or tabindex wrapper) is still a widget.
      const tag = entry.tagName
      const role = entry.getAttribute('role') || ''
      return tag === 'BUTTON' || tag === 'A' || role === 'button'
    }
    // Semantic meter markup is always a widget, however small.
    if (entry.querySelector('[role="progressbar"], [role="meter"], meter, progress') !== null) return false
    const entryText = textExcludingOverlays(entry)
    const triggerText = (trigger.textContent || '').trim()
    // Tight slack: the trigger must account for essentially all of the
    // entry's visible text. A balance box reading "余额¥10.07" beside an
    // icon-only trigger already exceeds it — and its bar must survive.
    return entryText.length - triggerText.length <= 2
  }

  /** Visible text of an entry, skipping overlay subtrees. */
  function textExcludingOverlays(entry: Element) {
    let text = ''
    const walker = document.createTreeWalker(entry, 4 /* SHOW_TEXT */, {
      acceptNode(node) {
        let p = node.parentElement
        while (p && p !== entry) {
          if (p.hasAttribute('data-dsh-claude-footer-overlay')) return 2 // REJECT
          p = p.parentElement
        }
        return 1 // ACCEPT
      }
    })
    while (walker.nextNode()) text += walker.currentNode.nodeValue
    return text.trim()
  }

  /**
   * Embed a live clone of a display-only footer entry (a progress bar
   * reads as nothing as a text menu item — the cost-meter balance/quota
   * stack is the known case). The clone is replaced only when the
   * source's markup changes, so it tracks the plugin's re-renders without
   * churning the popover DOM. Skin marker attributes, ids, and overlay
   * subtrees are stripped from the copy: it must never be re-hidden by
   * the footArea hiding rule, double-register an id, or duplicate an
   * open panel next to the real one. Event listeners do not survive
   * cloning, so the embed forwards clicks back into the live entry —
   * path-mapped to the clicked sub-control (see resolveEmbedActivator) —
   * and deliberately leaves the popover open so the widget's response
   * stays visible; it still closes on pointer-leave as usual. The embed
   * is marked `data-clickable` for the cursor when the entry has a
   * trigger at all.
   */
  function syncEmbedMirror(entry: Element, idx: number, forward: HTMLElement | null) {
    let embed = openBody().querySelector<HTMLElement>(`[data-embed-index="${idx}"]`)
    if (!embed) {
      const built = document.createElement('div')
      built.className = 'dsh-claude-popover-embed'
      built.setAttribute('data-embed-index', String(idx))
      built.addEventListener('click', e => {
        if (!built.__dshEntry) return
        e.stopPropagation()
        const activator = resolveEmbedActivator(e.target, built)
        if (activator) activator.click()
      })
      openBody().insertBefore(built, options.anchor())
      embed = built
    }
    embed.__dshEntry = entry
    embed.__dshForward = forward || null
    if (forward) {
      embed.setAttribute('data-clickable', '')
    } else {
      embed.removeAttribute('data-clickable')
    }
    const clone = entry.cloneNode(true) as Element
    clone.removeAttribute('id')
    clone.removeAttribute('data-dsh-claude-footer-entry')
    clone.removeAttribute('data-dsh-claude-footer-hidden')
    clone.removeAttribute('data-dsh-claude-footer-overlay')
    const overlays = clone.querySelectorAll('[data-dsh-claude-footer-overlay]')
    for (let o = 0; o < overlays.length; o++) {
      overlays[o].remove()
    }
    const stripped = clone.querySelectorAll('[id], [data-dsh-claude-footer-hidden]')
    for (let s = 0; s < stripped.length; s++) {
      stripped[s].removeAttribute('id')
      stripped[s].removeAttribute('data-dsh-claude-footer-hidden')
    }
    const html = clone.outerHTML
    // A replacement between pointerdown and pointerup takes the node the reader
    // is pressing away from under them: the browser cancels the press and the
    // click never lands. A plugin that repaints its own card while the reader is
    // pressing it does this on every poll, so the rewrite waits for the press to
    // finish and the next pass carries the change in. Outside a press the card
    // stays live, which is what keeps a figure that updates while the card is
    // open from freezing at the value it had when the card opened.
    if (embed.getAttribute('data-embed-html') !== html && !pressInFlight()) {
      embed.setAttribute('data-embed-html', html)
      while (embed.firstChild) embed.removeChild(embed.firstChild)
      embed.appendChild(clone)
    }
  }

  const INTERACTIVE_SELECTOR = 'button, [role="button"], a[href], [tabindex], input, select, summary'

  /**
   * Map a click inside the embedded clone back to the matching control
   * of the live entry. Forwarding every embed click to the entry's FIRST
   * trigger misfires for multi-control widgets (the cost-meter stack
   * carries refresh / collapse / tab buttons): the user clicks the
   * balance box but the first button in tree order fires. The clone
   * preserves the entry's tree shape, so the clicked node's child-index
   * path replays onto the original (tag-checked per level — overlay
   * stripping can shift siblings); the nearest interactive element at or
   * above the mapped node wins, and any mismatch falls back to the
   * entry's primary trigger.
   */
  function resolveEmbedActivator(clicked: EventTarget | null, embed: HTMLElement): HTMLElement | null | undefined {
    const entry = embed.__dshEntry
    const cloneRoot = embed.firstElementChild
    if (!entry || !cloneRoot || !(clicked instanceof Element)) return embed.__dshForward
    if (clicked === embed || clicked === cloneRoot) return embed.__dshForward
    // Child-index path from the clicked clone node up to the clone root.
    const path: number[] = []
    let node: Element = clicked
    while (node && node !== cloneRoot) {
      const parent = node.parentElement
      if (!parent) return embed.__dshForward
      path.unshift(Array.prototype.indexOf.call(parent.children, node))
      node = parent
    }
    // Replay the path on the live entry, verifying shape level by level.
    let original = entry
    let cloneNode = cloneRoot
    for (let i = 0; i < path.length; i++) {
      const nextClone = cloneNode.children[path[i]]
      const nextOrig = original.children[path[i]]
      if (!nextClone || !nextOrig || nextClone.tagName !== nextOrig.tagName) {
        return embed.__dshForward
      }
      cloneNode = nextClone
      original = nextOrig
    }
    // Nearest interactive element at or above the mapped original,
    // bounded by the entry and never inside an overlay subtree.
    let target: Element | null = original
    while (target) {
      if (target !== entry && target instanceof HTMLElement && target.matches(INTERACTIVE_SELECTOR) &&
          !hasOverlayAncestor(target, entry)) {
        return target
      }
      if (target === entry) break
      target = target.parentElement
    }
    return embed.__dshForward
  }

  /** Whether `el` sits inside an overlay-marked subtree above `entry`. */
  function hasOverlayAncestor(el: Element, entry: Element) {
    let node: Element | null = el
    while (node && node !== entry) {
      if (node.hasAttribute('data-dsh-claude-footer-overlay')) return true
      node = node.parentElement
    }
    return false
  }

  /**
   * First interactive element of a footer entry that is not part of an
   * overlay subtree (an open panel may render action buttons of its own,
   * and those must never become the popover item's activation target).
   */
  function findFooterTrigger(entry: Element): HTMLElement | null {
    const selector = INTERACTIVE_SELECTOR
    if (entry instanceof HTMLElement && entry.matches(selector) &&
        !entry.hasAttribute('data-dsh-claude-footer-overlay')) {
      return entry
    }
    const found = entry.querySelectorAll<HTMLElement>(selector)
    for (let i = 0; i < found.length; i++) {
      const candidate = found[i]
      let node: Element | null = candidate
      let insideOverlay = false
      while (node && node !== entry) {
        if (node.hasAttribute('data-dsh-claude-footer-overlay')) {
          insideOverlay = true
          break
        }
        node = node.parentElement
      }
      if (!insideOverlay) return candidate
    }
    return null
  }

  function sync(footArea: Element) {
    const footerEntries = syncFooterVisibility(footArea)
    const body = options.body()

    // A closed host drawer has no container to mirror into, but the entries
    // above are hidden in place all the same: the host re-renders them, and a
    // pass that skips this leaves their icons painted in the sidebar until the
    // drawer is opened once.
    if (body === null) return

    // The self-built drawer builds its rows before it is revealed and must stay
    // completely static afterwards: a rewrite under the pointer cancels the
    // browser's :hover and can swallow the click between pointerdown and
    // pointerup. The host's own menu is the other case — it mounts empty and
    // these rows are what fills it, so a sync that stopped while it stands would
    // leave the card with no rows at all. There the same rule is applied per
    // row instead (see `pointerInside`), which is what keeps a plugin that
    // repaints its own card while the reader hovers it from tearing the row
    // out from under them.
    if (options.isOpen()) return

    const existingActionItems = body.querySelectorAll('[data-action-index], [data-embed-index]')
    for (let ea = 0; ea < existingActionItems.length; ea++) {
      const staleIdx = parseInt(existingActionItems[ea].getAttribute('data-action-index') || existingActionItems[ea].getAttribute('data-embed-index') || '', 10)
      if (isNaN(staleIdx) || staleIdx >= footerEntries.length) {
        existingActionItems[ea].remove()
      }
    }

    for (let f = 0; f < footerEntries.length; f++) {
      try {
        ((entry: Element, idx: number) => {
        // The host's account area also lives in the footer: skip anything
        // that is a menu anchor or contains one, and anything carrying the
        // host's sign-out glyph, so its logout button stays out of the
        // drawer's header. The glyph is identified by its geometry
        // (ui-primitives LogoutIcon: a 13.664×13.571 svg), never by text —
        // the row is icon-only and its label follows the interface
        // language.
        if (entry.getAttribute('aria-haspopup') === 'menu') return
        if (entry.querySelector('[aria-haspopup="menu"]') !== null) return
        if (entry.querySelector('svg[viewBox="0 0 13.664 13.571"]') !== null) return
        // An entry that is itself an overlay is no footer control: it gets no
        // row, and a clone of it would carry the dialog's own `open` into the
        // popover as a second, non-modal copy.
        if (entry.hasAttribute('data-dsh-claude-footer-overlay')) return
        // An entry the skin keeps in the sidebar already stands where the
        // reader finds it: a second copy inside the popover would be two
        // controls for one state.
        if (entry.hasAttribute(FOOTER_SEAT_ATTR)) return
        const trigger = findFooterTrigger(entry)
        const hasContent = (entry.textContent || '').trim() !== '' ||
                         entry.querySelector('svg, img, canvas') !== null

        // Rich widgets (progress bars, stat panels) cannot collapse into
        // a text menu item — embed a live clone instead, forwarding
        // clicks to the entry's trigger when it has one (the cost-meter
        // balance stack is itself clickable). A card a plugin mounted into
        // the footer itself is one of those whatever its own text says: the
        // usage card reads as one line, and a text row would drop the
        // figures it draws, so it keeps its own markup.
        const inSlot = entry.closest(FOOTER_ACTIONS_SELECTOR) !== null
        if (!inSlot || !entryIsActionLike(entry, trigger)) {
          removeActionMirror(idx)
          if (hasContent) {
            syncEmbedMirror(entry, idx, trigger)
          } else {
            removeEmbedMirror(idx)
          }
          return
        }
        removeEmbedMirror(idx)

        // The mirrored item activates the first interactive element
        // outside any overlay.
        // entryIsActionLike answered true, so there is a trigger.
        const activator = trigger!
        let item = body.querySelector<HTMLElement>(`[data-action-index="${idx}"]`)
        const iconEl = (trigger && trigger.querySelector('svg')) || entry.querySelector('svg')
        const text = activator.getAttribute('aria-label') || (activator.textContent || '').trim() || copy('footerPluginRow')
        const badge = activator.getAttribute('data-cordis-badge') || entry.getAttribute('data-cordis-badge') || ''

        if (!item) {
          // The shared row skeleton: icon, text, and the badge slot the
          // sync below fills or drops.
          const built = buildPopoverItem({ icon: true }).row
          built.setAttribute('data-action-index', String(idx))

          built.addEventListener('click', e => {
            e.stopPropagation()
            options.close()
            // The activator is rebound on every (closed-state) sync pass
            // (`item.__dshActivator`), never captured at creation — the
            // host re-sorts list slots by `order` on each render, so the
            // entry behind an index changes over time.
            let live = built.__dshActivator
            if (!live || typeof live.click !== 'function') {
              // Safety net: re-resolve the current trigger for this index
              // from the live footer DOM. Covers the rare case where the
              // stored node was detached by a host re-render while the
              // popover was open.
              const fa = findFootArea()
              const liveEntries = fa ? footerEntriesIn(fa) : []
              const liveEntry = liveEntries[idx] || null
              live = liveEntry ? findFooterTrigger(liveEntry) : null
            }
            if (live && typeof live.click === 'function') live.click()
          })
          body.insertBefore(built, options.anchor())
          item = built
        }
        // Entries are reused by index: the host re-sorts list slots by
        // `order` on every render, so a re-sort can seat a different
        // plugin under an existing item — icon, text, badge AND the
        // click target must all re-sync, or the label shows one entry
        // while the click fires the previous occupant's trigger.
        syncMirrorItem(item, iconEl, text, badge)
        // Rebind the click target to the entry currently behind this
        // index. Done on every pass, for new and reused items alike.
        item.__dshActivator = activator
        })(footerEntries[f], f)
      } catch (error) {
        // A single broken entry must not abort the rest of the mirror
        // sync (which would leave later items without a rebound
        // activator or un-ordered); it is reported.
        reportError(error)
      }
    }

    // The host re-sorts list-slot outlets by `order` on every render
    // (stable, ties keep registration order), and plugins mount
    // progressively at startup — so the mirror nodes must track the live
    // footer order on every pass: a later re-sort would otherwise leave
    // the popover frozen in a stale order that no longer matches the
    // real controls. Re-append action items and embedded widgets in
    // entry-index order.
    const mirrors: Element[] = []
    for (let mi = 0; mi < body.children.length; mi++) {
      const mirrorNode = body.children[mi]
      if (mirrorNode === options.anchor()) continue
      if (mirrorNode.hasAttribute('data-action-index') || mirrorNode.hasAttribute('data-embed-index')) {
        mirrors.push(mirrorNode)
      }
    }
    mirrors.sort((a, b) => {
      const ai = parseInt(a.getAttribute('data-action-index') || a.getAttribute('data-embed-index') || '', 10) || 0
      const bi = parseInt(b.getAttribute('data-action-index') || b.getAttribute('data-embed-index') || '', 10) || 0
      return ai - bi
    })
    // Walk back from the settings row and move a mirror only when it is out
    // of place. Inserting front to back before the settings row moved every
    // mirror on every pass once there were two (each insert lands after the
    // ones already placed), and each move is a mutation that schedules the
    // next pass — the scheduler never went idle.
    let nextMirror = options.anchor()
    for (let mr = mirrors.length - 1; mr >= 0; mr--) {
      if (mirrors[mr].nextSibling !== nextMirror) body.insertBefore(mirrors[mr], nextMirror)
      nextMirror = mirrors[mr]
    }
  }

  /** Drop every takeover marker from the host's footer entries. */
  function clear(footArea: Element) {
    const marked = footArea.querySelectorAll(
      '[data-dsh-claude-footer-entry], [data-dsh-claude-footer-hidden], [data-dsh-claude-footer-overlay], [data-dsh-claude-footer-seat]',
    )
    for (let i = 0; i < marked.length; i++) {
      marked[i].removeAttribute('data-dsh-claude-footer-entry')
      marked[i].removeAttribute('data-dsh-claude-footer-hidden')
      marked[i].removeAttribute('data-dsh-claude-footer-overlay')
      marked[i].removeAttribute(FOOTER_SEAT_ATTR)
    }
  }

  /** Take the press tracker off: the listeners outlive no generation. */
  function stop() {
    document.removeEventListener('pointerdown', onPressStart, true)
    document.removeEventListener('pointerup', onPressEnd, true)
    document.removeEventListener('pointercancel', onPressEnd, true)
  }

  return { measure, sync, clear, stop }
}
