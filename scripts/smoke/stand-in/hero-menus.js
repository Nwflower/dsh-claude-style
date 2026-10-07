/**
 * The hero row's two pickers and the host menus their clicks toggle, for the
 * popovers case. They are TWO independent host menus behind one row — the
 * workspace chip and the preset seat in the real page — which is what made
 * crossing from one trigger to the other leave both cards up.
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
      document.getElementById(id).setAttribute('aria-expanded', 'false')
    }
    // Each card is the host Menu's markup: a row with its glyph and label, and
    // for the workspace picker the pinned add row in the footer. The row carries
    // the host's own border: none (Menu.module.css .item).
    function heroMenuRow(label) {
      return '<div class="_x_itemWrap_1"><button type="button" role="menuitem" class="_x_item_1" style="border:none">' +
        '<span class="_x_itemIcon_1"><svg viewBox="0 0 16 16" width="16" height="16"></svg></span>' +
        '<span class="_x_itemLabel_1">' + label + '</span></button></div>'
    }
    function bindHeroTrigger(id, label, footer) {
      document.getElementById(id).addEventListener('click', function () {
        if (heroMenus[id]) { closeHeroMenu(id); return }
        var menu = document.createElement('div')
        menu.setAttribute('role', 'menu')
        menu.innerHTML = '<div class="_x_viewport_1" role="presentation">' + heroMenuRow(label) + '</div>' +
          (footer ? '<div class="_x_footer_1" role="presentation">' + heroMenuRow(footer) + '</div>' : '')
        document.body.appendChild(menu)
        heroMenus[id] = menu
        document.getElementById(id).setAttribute('aria-expanded', 'true')
      })
    }
    bindHeroTrigger('hero-workspace', 'Workspace A', 'Add workspace…')
    bindHeroTrigger('hero-preset', 'Standard mode', null)
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
