import { FOOTER_ACTIONS_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { findFootArea } from '@dsh-claude-style/engine/host'
import { FOOTER_BLOCK_ATTR, FOOTER_MENU_ATTR, FOOTER_SEAT_ATTR } from '../../constants'
import { buildPopoverItem } from '../../shared/popover'
import { copy } from './copy'
import { createFooterVisibility, footerEntriesIn } from './footer-visibility'

/**
 * The host's sidebar footer entries, rebuilt as rows of the account popover:
 * the row model, the two mount points and the popover's own behaviour belong to
 * account-footer.ts. What the footer holds and how each entry is classified and
 * hidden in place is footer-visibility.ts; this module reads the entry list that
 * pass returns and the marks it writes, and mirrors the entries into the popover
 * body.
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

  /** The footer's classification and hiding pass, whose marks are the mirror's eligibility answers. */
  const visibility = createFooterVisibility()

  /**
   * Whether a press this skin must not interrupt is in flight: the browser is
   * between a pointerdown and its pointerup, anywhere on the page.
   */
  const pressing = new Set<number>()

  function pressInFlight() {
    return pressing.size > 0
  }

  // Every press on the document is tracked, in the capture phase so the set is
  // already filled before any row's own handler runs. A press that never
  // reports its pointerup — the window lost focus while the button was down —
  // is cleared by the blur handler, or the card would never take a rewrite
  // again.
  const onPressStart = (event: PointerEvent) => { pressing.add(event.pointerId) }
  const onPressEnd = (event: PointerEvent) => { pressing.delete(event.pointerId) }
  const onPressCleared = () => { pressing.clear() }
  document.addEventListener('pointerdown', onPressStart, true)
  document.addEventListener('pointerup', onPressEnd, true)
  document.addEventListener('pointercancel', onPressCleared, true)
  window.addEventListener('blur', onPressCleared)

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
      if (tag !== 'BUTTON' && tag !== 'A' && role !== 'button') return false
      // A card can be the control itself: a quota card is one button whose
      // rows draw a label, an amount and a percentage each. One label belongs
      // in a menu item; a drawing with several figures keeps its markup, so a
      // text item would drop what the card exists to show.
      return textPieces(entry) < 3
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

  /**
   * The entry's own text nodes, in document order, with the subtrees of any
   * overlay left out: an open panel's copy must not change what its entry
   * reads as.
   */
  function ownTextNodes(entry: Element): Text[] {
    const nodes: Text[] = []
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
    while (walker.nextNode()) nodes.push(walker.currentNode as Text)
    return nodes
  }

  /**
   * The number of separate leaves an entry writes text into. One label is an
   * action's whole vocabulary; a card that draws figures has several (a name,
   * an amount and a percentage per row), and a text menu item would drop them.
   */
  function textPieces(entry: Element): number {
    const nodes = ownTextNodes(entry).filter(node => (node.nodeValue || '').trim() !== '')
    let pieces = 0
    for (let at = 0; at < nodes.length; at++) {
      const parent = nodes[at].parentElement
      if (parent !== null && !nodes.slice(0, at).some(earlier => earlier.parentElement === parent)) pieces++
    }
    return pieces
  }

  /** Visible text of an entry, skipping overlay subtrees. */
  function textExcludingOverlays(entry: Element) {
    return ownTextNodes(entry).map(node => node.nodeValue).join('').trim()
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
      embed.classList.toggle('dsh-claude-popover-embed-section', clone.tagName === 'SECTION')
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
    const footerEntries = visibility.sync(footArea)
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
    // leave the card with no rows at all. There only the embed's rewrite waits
    // for a press (see `pressInFlight`); the rows themselves stay live.
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
        // An entry that opens a menu or carries the host's sign-out glyph keeps
        // its place in the sidebar (the visibility pass stamps FOOTER_MENU_ATTR
        // from the same answer the hiding pass reads): the menu portals from the
        // trigger's own box and returns focus to it, so a row here would press a
        // hidden anchor, and the entry is never hidden out of both places at once
        // (issue #417).
        if (entry.hasAttribute(FOOTER_MENU_ATTR)) return
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
        // figures it draws, so it keeps its own markup. A block is one for
        // the same reason, and its clone is the copy the rail shows.
        const inSlot = entry.closest(FOOTER_ACTIONS_SELECTOR) !== null
        if (!inSlot || entry.hasAttribute(FOOTER_BLOCK_ATTR) || !entryIsActionLike(entry, trigger)) {
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

  /** Take the press tracker off: the listeners outlive no generation. */
  function stop() {
    document.removeEventListener('pointerdown', onPressStart, true)
    document.removeEventListener('pointerup', onPressEnd, true)
    document.removeEventListener('pointercancel', onPressCleared, true)
    window.removeEventListener('blur', onPressCleared)
    pressing.clear()
  }

  return { measure: visibility.measure, sync, clear: visibility.clear, stop }
}
