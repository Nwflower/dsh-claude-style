/**
 * The host's account menu: the trigger in the footer portals a role=menu card
 * with the host's own rows, places it from its own geometry, walks it with the
 * direction keys, closes it on Escape or a press outside, and opens the settings
 * dialog its Settings row picks.
 */
(function () {
  var CASE = window.__dshSmokeHost.CASE

  var menu = null
  var menuViewport = null
  var menuSizer = null
  var hostRowsHtml = ''
  /** The host's own placement: the card sits above its trigger, by its height. */
  function placeHostMenu() {
    if (!menu || !menu.parentElement || !accountTrigger) return
    var row = accountTrigger.getBoundingClientRect()
    menu.style.top = Math.round(row.top - menu.offsetHeight - 6) + 'px'
    window.__hostMenuTops.push({ at: Math.round(performance.now()), top: menu.style.top })
  }
  function closeHostMenu() {
    if (menuSizer) { menuSizer.disconnect(); menuSizer = null }
    if (menu && menu.parentElement) menu.parentElement.removeChild(menu)
    menu = null
    menuViewport = null
    // The host reports the menu state on its trigger (ui-primitives' Menu).
    if (accountTrigger) accountTrigger.setAttribute('aria-expanded', 'false')
  }
  function openHostSettingsDialog() {
    var area = document.querySelector('[class*="settingsArea"]')
    if (!area) return
    var dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    dialog.textContent = 'Settings'
    area.appendChild(dialog)
  }
  function fillHostRows() {
    while (menuViewport.firstChild) menuViewport.removeChild(menuViewport.firstChild)
    menuViewport.innerHTML = hostRowsHtml
  }
  // The host re-renders its list from React: the viewport is emptied and the
  // host's own rows go back. Our injected container is dropped with them and the
  // skin has to re-insert it.
  window.__rerenderHostMenu = function () {
    if (menuViewport) fillHostRows()
  }
  var accountTrigger = document.getElementById('host-account')
  if (accountTrigger) accountTrigger.addEventListener('click', function () {
    if (menu) { closeHostMenu(); return }
    accountTrigger.setAttribute('aria-expanded', 'true')
    // The host's real Menu DOM (ui-primitives/Menu.tsx): a role=menu portal to
    // body, a role=presentation viewport, and itemWrap > button[role=menuitem].
    // Picking an item selects it and the menu closes itself (onSelect), so the
    // skin must not click the trigger again. The sign-out glyph copies
    // LogoutIcon.tsx's geometry: a 16px relative box holding a 13.664x13.571 svg
    // at (1.168, 1.214) absolute.
    hostRowsHtml = CASE === 'desktop'
      ? '<div class="itemWrap"><button type="button" role="menuitem" aria-keyshortcuts="Control+,">' +
          '<svg viewBox="0 0 16 16" width="16" height="16"></svg>Settings</button></div>' +
        '<div class="itemWrap"><button type="button" role="menuitem">' +
          '<svg viewBox="0 0 16 16" width="16" height="16"></svg>Feedback</button></div>' +
        '<div class="itemWrap"><button type="button" role="menuitem">' +
          '<span style="position:relative;display:inline-block;width:16px;height:16px">' +
            '<svg viewBox="0 0 13.664 13.571" width="13.664" height="13.571" style="position:absolute;left:1.168px;top:1.214px">' +
              '<path d="M1 1 L12.664 12.571" fill="none" stroke="currentColor" stroke-width="1.4"></path>' +
            '</svg></span>Sign out</button></div>'
      : '<div class="itemWrap"><button type="button" role="menuitem">Settings</button></div>' +
        '<div class="itemWrap"><button type="button" role="menuitem">Feedback</button></div>' +
        '<div class="itemWrap"><button type="button" role="menuitem">Sign out</button></div>'
    menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    // The host's shared menu card carries this material marker (ui-primitives'
    // Menu), which is what the skin's card rules are keyed on.
    menu.setAttribute('data-menu-material', '')
    menuViewport = document.createElement('div')
    menuViewport.className = 'viewport'
    menuViewport.setAttribute('role', 'presentation')
    menu.appendChild(menuViewport)
    fillHostRows()
    // The host places the card from its own geometry when it mounts it, and
    // re-places it on the frame after its list changes (measured on the real
    // menu: the skin's container lands a frame after the mount, the card grows,
    // and the host follows one frame later). __hostMenuTops records every
    // placement so the probe can tell the frames apart.
    window.__hostMenuTops = []
    placeHostMenu()
    if (typeof ResizeObserver === 'function') {
      menuSizer = new ResizeObserver(function () { requestAnimationFrame(placeHostMenu) })
      menuSizer.observe(menu)
    }
    menu.addEventListener('click', function (e) {
      var item = e.target && e.target.closest ? e.target.closest('button[role="menuitem"]') : null
      if (!item) return
      if ((item.textContent || '').trim() === 'Settings') openHostSettingsDialog()
      closeHostMenu()
    })
    document.body.appendChild(menu)
  })
  // The host's Menu keyboard walk: every button in the list is reachable with
  // the direction keys, our injected rows included.
  document.addEventListener('keydown', function (e) {
    if (!menu) return
    if (e.key === 'Escape') { closeHostMenu(); return }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    var buttons = menuViewport.querySelectorAll('button:not(:disabled)')
    if (!buttons.length) return
    var idx = Array.prototype.indexOf.call(buttons, document.activeElement)
    var next = e.key === 'ArrowDown' ? idx + 1 : idx - 1
    if (next < 0) next = buttons.length - 1
    if (next >= buttons.length) next = 0
    buttons[next].focus()
  })
  // A press outside the menu closes it, the way the host's Menu does.
  document.addEventListener('pointerdown', function (e) {
    if (!menu) return
    if (menu.contains(e.target)) return
    closeHostMenu()
  }, true)
})()
