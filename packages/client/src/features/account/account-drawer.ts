import { AUTO_POPOVER_OFF } from '../../constants'
import { findSidebarRoot } from '@dsh-claude-style/engine/host'
import { getUsername } from '../../shared/identity'
import { readPrefs } from '../../core/prefs'
import { POPOVER_CLOSE_DELAY, POPOVER_OPEN_DELAY, closeOtherPopovers, createHoverIntent, positionAnchoredPopover, removeStrayNodes } from '../../shared/popover'
import type { createAccountRows } from './rows'

/**
 * The self-built account drawer: the trigger row and the popover card the
 * skin draws on a host that has no account row of its own (the Web), with
 * their hover and click behaviour and the popover's placement in the
 * collapsed rail. The rows it holds — the account header, the mirrored
 * footer entries, the settings row — come from the rows module; the pass
 * (account-footer.ts) decides when the drawer stands and when it is dropped.
 */
export function createAccountDrawer(options: {
  rows: ReturnType<typeof createAccountRows>
  /** Reconcile the footer mirrors before the reveal, so the open shows fresh content. */
  beforeOpen(): void
  /** Whether the hold screen stands open: its opening must not read as the pointer leaving the card. */
  banOpen(): boolean
  /** Whether this press must leave the account surface open (press-keeps-open rule). */
  keepsOpen(): boolean
}) {
  let accountBtn: HTMLElement | null = null
  let accountPopover: HTMLElement | null = null
  let popoverBody: HTMLElement | null = null
  let settingsItem: HTMLElement | null = null
  const popoverHoverIntent = createHoverIntent(openPopover, closePopover, POPOVER_OPEN_DELAY, POPOVER_CLOSE_DELAY)
  // Whether the popover is up because it was CLICKED (rather than hovered).
  // Clicking the account row opens the ban-screen easter egg and leaves the
  // pointer inside the popover, so without this the row's own mouseleave
  // would tear the popover down behind the overlay; a click-opened popover
  // instead stays until the pointer leaves the whole footer.
  let popoverOpenedByClick = false

  function isPopoverOpen() {
    return !!(accountPopover && accountPopover.getAttribute('data-open') === 'true')
  }

  function openPopover() {
    if (!accountPopover || !accountBtn) return
    cancelClosePopover()
    closeOtherPopovers('account')
    // Mirrors are frozen while the popover is open (footer-mirror.sync
    // bails), so reconcile them here — before the reveal — to show fresh
    // content/order and bind click targets for the upcoming interaction.
    options.beforeOpen()
    // Resolve the rail anchor before the reveal so the panel never paints at
    // its stale coordinates for a frame.
    positionAccountPopover()
    accountPopover.setAttribute('data-open', 'true')
    accountBtn.setAttribute('data-open', 'true')
    accountBtn.setAttribute('aria-expanded', 'true')
  }

  function closePopover() {
    if (!accountPopover || !accountBtn) return
    cancelClosePopover()
    popoverOpenedByClick = false
    accountPopover.setAttribute('data-open', 'false')
    accountBtn.setAttribute('data-open', 'false')
    accountBtn.setAttribute('aria-expanded', 'false')
  }

  function togglePopover() {
    if (!accountPopover) return
    if (isPopoverOpen()) {
      closePopover()
    } else {
      // The pointer stays on the trigger after a click, and the popover
      // hangs below it, so the trigger's mouseleave must not close what the
      // click just opened — otherwise the panel is unreachable with a mouse.
      popoverOpenedByClick = true
      openPopover()
    }
  }

  function cancelClosePopover() {
    popoverHoverIntent.cancel()
  }

  function scheduleClosePopover() {
    popoverHoverIntent.scheduleClose()
  }

  /**
   * Anchor the account popover to its trigger while the sidebar is a rail.
   *
   * In the rail the popover is `position: fixed` (features/account/account-footer.css): the sidebar
   * column clips its overflow, so an absolutely positioned panel would be cut
   * off at the 56px rail edge and never seen. Its coordinates therefore have
   * to be resolved here — the same contract the model picker's popovers use.
   * The declarations are written `important` because the stylesheet anchors
   * the wide-sidebar popover with `!important` as well, and an author
   * `!important` beats a plain inline declaration.
   *
   * With the sidebar wide the CSS anchor is the right one, so the inline
   * overrides are dropped again and the footer rule takes over.
   */
  function positionAccountPopover() {
    if (!accountPopover || !accountBtn) return
    if (!inRail(accountBtn)) {
      accountPopover.style.removeProperty('left')
      accountPopover.style.removeProperty('top')
      accountPopover.style.removeProperty('right')
      accountPopover.style.removeProperty('bottom')
      return
    }
    positionAnchoredPopover(accountBtn, accountPopover, { side: 'right', important: true })
  }

  /** The sidebar collapsed into its rail, where a card opens beside the row. */
  function inRail(element: Element) {
    return element.closest('[data-dsh-claude-part~="sidebar-collapsed"]') !== null
  }

  /**
   * Build (or reuse) the self-built trigger and popover. Idempotent against a
   * torn-down-less reload: client HMR drops the old fiber's disposals instead
   * of running them, so a previous generation's button and popover are still
   * in the DOM and this fresh scope knows nothing of them. Sweep the strays
   * before deciding whether to build — otherwise the row renders twice (and
   * the orphan keeps a stale name).
   */
  function ensureSynthetic(footArea: Element) {
    const username = getUsername()
    removeStrayNodes(footArea, '.dsh-claude-account-btn', [accountBtn])
    // The popover is the skin's own card and lives in the footer's own subtree
    // (below, on the self-built path), so the sweep for a copy a client reload
    // stranded is scoped to the sidebar: it runs every pass, and a
    // whole-document query walks the conversation's rows too.
    removeStrayNodes(findSidebarRoot() ?? document, '.dsh-claude-account-popover', [accountPopover])

    if (accountBtn === null || !footArea.contains(accountBtn)) {
      if (accountBtn && accountBtn.parentElement) accountBtn.parentElement.removeChild(accountBtn)
      accountBtn = document.createElement('div')
      accountBtn.className = 'dsh-claude-account-btn'
      accountBtn.setAttribute('role', 'button')
      accountBtn.setAttribute('tabindex', '0')
      accountBtn.setAttribute('aria-haspopup', 'menu')
      accountBtn.setAttribute('aria-expanded', 'false')
      accountBtn.innerHTML =
        '<span class="dsh-claude-account-avatar"></span>' +
        '<span class="dsh-claude-account-label">' +
          '<span class="dsh-claude-account-user"></span>' +
        '</span>' +
        '<span class="dsh-claude-account-chevron"></span>'

      // Hover is the default way in; the "Open popovers on hover"
      // preference turns it off, leaving the click handler below as the only
      // way in (and the only way out, so a click-opened popover does not
      // vanish when the pointer leaves). The account row is the one popover
      // the `account` scope keeps on hover.
      accountBtn.addEventListener('mouseenter', () => {
        if (readPrefs().autoPopover !== AUTO_POPOVER_OFF) popoverHoverIntent.scheduleOpen()
      })
      accountBtn.addEventListener('mouseleave', () => {
        if (readPrefs().autoPopover !== AUTO_POPOVER_OFF && !popoverOpenedByClick) scheduleClosePopover()
      })
      accountBtn.addEventListener('click', e => {
        e.stopPropagation()
        if (options.keepsOpen()) return
        togglePopover()
      })
      footArea.appendChild(accountBtn)
    }
    // The name and the picture are user- and host-supplied (a preference, the
    // OS user, the account profile), so they are written as text and as an
    // image source, never spliced into markup — and synced on every pass, so a
    // profile that lands after the row was built still shows up.
    const userEl = accountBtn.querySelector('.dsh-claude-account-user')
    if (userEl && userEl.textContent !== username) userEl.textContent = username
    options.rows.syncAvatar(accountBtn.querySelector('.dsh-claude-account-avatar'))

    if (accountPopover === null || !footArea.contains(accountPopover)) {
      if (accountPopover && accountPopover.parentElement) accountPopover.parentElement.removeChild(accountPopover)
      accountPopover = document.createElement('div')
      accountPopover.id = 'dsh-claude-account-popover'
      accountPopover.className = 'dsh-claude-popover-card dsh-claude-account-popover'
      accountPopover.setAttribute('data-open', 'false')

      accountPopover.addEventListener('mouseenter', () => {
        cancelClosePopover()
      })
      accountPopover.addEventListener('mouseleave', () => {
        // The hold screen takes the window, so its opening "leaves" the
        // card without the pointer moving; that leave must not fold the
        // drawer behind the page (openBan leaves the footer as it was).
        if (options.banOpen()) return
        scheduleClosePopover()
      })

      accountPopover.appendChild(options.rows.buildHeader(username))

      popoverBody = document.createElement('div')
      popoverBody.className = 'dsh-claude-account-popover-body'
      accountPopover.appendChild(popoverBody)

      settingsItem = null
      footArea.appendChild(accountPopover)
    }

    // Built together with the popover above.
    const body = popoverBody!
    if (settingsItem === null || !body.contains(settingsItem)) {
      settingsItem = options.rows.buildSettingsItem()
      body.appendChild(settingsItem)
    }
    options.rows.syncSettingsItem(settingsItem)
    return body
  }

  /** Remove the self-built trigger and popover (the host path's shape). */
  function dropSynthetic() {
    cancelClosePopover()
    removeStrayNodes(document, '.dsh-claude-account-btn, .dsh-claude-account-popover', [])
    accountBtn = null
    accountPopover = null
    popoverBody = null
    settingsItem = null
  }

  return {
    /** The self-built trigger row, for the pass's measurement and ownership test. */
    btn: () => accountBtn,
    /** The popover card, for the pass's placement and ownership test. */
    popover: () => accountPopover,
    /** The popover's body, the surface's container on the self-built path. */
    body: () => popoverBody,
    /** The settings row, the anchor the mirrored footer entries insert before. */
    settingsAnchor: () => settingsItem,
    isOpen: isPopoverOpen,
    close: closePopover,
    /** Take the pending close off (the takeover's teardown hands the footer back). */
    cancelClose: cancelClosePopover,
    /** Leave what stands open standing (the hold screen's opening). */
    holdOpen() { popoverOpenedByClick = true },
    /** Place the open popover over its trigger, for the rail and the reposition route. */
    placeOpen: positionAccountPopover,
    /** Build or reuse the trigger and popover; the pass calls this on the synthetic path. */
    ensure: ensureSynthetic,
    /** Take the trigger and popover off the page. */
    drop: dropSynthetic,
  }
}
