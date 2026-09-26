    /**
     * Text selection has two paints and CSS cannot tell them apart: gray on
     * black while the browser window is unfocused, blue on white while it is
     * focused. Chromium reaches that difference through its own internal
     * selection colors (`-internal-inactive-selection-*`), which a stylesheet
     * cannot address — so the focus state is mirrored onto the document here
     * and `src/theme/chrome.css` switches on the attribute. Nothing else about
     * the selection is stateful; the paint itself stays pure CSS.
     *
     * `blur`/`focus` on the window are the events that matter (a click on
     * another window, Alt+Tab, a devtools focus), and `document.hasFocus()`
     * seeds the state so a page loaded in a background tab is unfocused from
     * its first paint instead of inheriting the focused default.
     */
    function installSelectionFocus() {
      var body = document.body

      function sync() {
        if (document.hasFocus()) body.removeAttribute(WINDOW_BLUR_ATTR)
        else body.setAttribute(WINDOW_BLUR_ATTR, '')
      }

      // Capture phase: the events are dispatched at the window, so the flag
      // records the transition before anything downstream can stop it.
      window.addEventListener('focus', sync, true)
      window.addEventListener('blur', sync, true)
      sync()

      return function () {
        window.removeEventListener('focus', sync, true)
        window.removeEventListener('blur', sync, true)
        body.removeAttribute(WINDOW_BLUR_ATTR)
      }
    }
