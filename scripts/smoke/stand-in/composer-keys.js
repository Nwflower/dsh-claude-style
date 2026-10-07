/**
 * The host's composer keymap: Enter on the editor picks an open menu's item
 * first and submits after that, and the send button records the skin's own
 * click. Both are read back through window.__keys.
 */
(function () {
  window.__keys = []
  var menuOpen = true
  document.getElementById('editor').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    window.__keys.push(menuOpen ? 'host picked the menu item' : 'host submitted')
    menuOpen = false
  })
  document.getElementById('send').addEventListener('click', function () { window.__keys.push('skin clicked Send') })
})()
