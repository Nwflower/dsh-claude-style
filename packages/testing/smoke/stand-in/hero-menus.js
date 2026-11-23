/**
 * The hero row's two pickers and the host menus their clicks toggle, for the
 * popovers case. They are TWO independent host menus behind one row — the
 * workspace chip and the preset seat in the real page — which is what made
 * crossing from one trigger to the other leave both cards up. The workspace
 * card is the host's search-menu shape (ui-primitives Menu.tsx, since
 * 0.2.3-alpha.1): the card answers data-menu-popup, the role sits on the inner
 * row container, and the search field stands above the rows. The preset card
 * keeps the plain role on the card itself.
 */
(function () {
  var CASE = window.__dshSmokeHost.CASE

  if (CASE === 'popovers') {
    var heroMenus = {}
    function heroMenuOf(id) { return heroMenus[id] || null }
    function closeHeroMenu(id) {
      var menu = heroMenus[id]
      if (menu && menu.parentElement) menu.parentElement.removeChild(menu)
      heroMenus[id] = null
      var trigger = document.getElementById(id)
      trigger.setAttribute('aria-expanded', 'false')
      trigger.style.removeProperty('anchor-name')
    }
    // Each card is the host Menu's markup: a row with its glyph and label, and
    // for the workspace picker the pinned add row in the footer. The row carries
    // the host's own border: none (Menu.module.css .item).
    function heroMenuRow(label) {
      return '<div class="_itemWrap_x_1"><button type="button" role="menuitem" class="_item_x_1" style="border:none">' +
        '<span class="_itemIcon_x_1"><svg viewBox="0 0 16 16" width="16" height="16"></svg></span>' +
        '<span class="_itemLabel_x_1">' + label + '</span></button></div>'
    }
    // The host's SearchField (ui-primitives SearchField.tsx): a leading magnifier
    // and the text input, marked data-search-field.
    function heroSearchField() {
      return '<div data-search-field class="_field_x_1 _search_x_1">' +
        '<span class="_leading_x_1" aria-hidden="true"><svg viewBox="0 0 16 16" width="14" height="14"></svg></span>' +
        '<input class="_input_x_1" type="text" role="searchbox" aria-label="Search workspaces" placeholder="Search workspaces">' +
        '</div>'
    }
    function bindHeroTrigger(id, rows, footer, search) {
      document.getElementById(id).addEventListener('click', function () {
        if (heroMenus[id]) { closeHeroMenu(id); return }
        // The host's workspace picker anchors its Menu on the trigger it was
        // handed (anchorRef) and names that anchor only while the card is open;
        // the portaled card reads the same name back (ui-primitives Menu.tsx).
        var anchor = '--dsh-menu-trigger-' + id
        document.getElementById(id).style.setProperty('anchor-name', anchor)
        var menu = document.createElement('div')
        menu.style.setProperty('position-anchor', anchor)
        var list = '<div class="_viewport_x_1" role="presentation">' + rows.map(heroMenuRow).join('') + '</div>' +
          (footer ? '<div class="_footer_x_1" role="presentation">' + heroMenuRow(footer) + '</div>' : '')
        if (search) {
          menu.className = '_surface_x_1 _list_x_1 _scrollable_x_1 _portal_x_1'
          menu.setAttribute('data-menu-popup', '')
          menu.innerHTML = heroSearchField() + '<div class="_searchRows_x_1" role="menu">' + list + '</div>'
        } else {
          menu.setAttribute('role', 'menu')
          menu.innerHTML = list
        }
        document.body.appendChild(menu)
        heroMenus[id] = menu
        document.getElementById(id).setAttribute('aria-expanded', 'true')
      })
    }
    bindHeroTrigger('hero-workspace', ['Workspace A', 'Workspace B'], 'Add workspace…', true)
    bindHeroTrigger('hero-preset', ['Standard mode'], null, false)
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return
      closeHeroMenu('hero-workspace')
      closeHeroMenu('hero-preset')
    })
    window.__heroMenuOpen = function (id) { return heroMenuOf(id) !== null }
    window.__heroMenusOpen = function () {
      var count = 0
      for (var id in heroMenus) if (heroMenus[id]) count++
      return count
    }
  }
})()