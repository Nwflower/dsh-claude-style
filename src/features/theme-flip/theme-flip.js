    /**
     * The skin's own 0.12s border/box-shadow transitions (composer card, input
     * scroll, attachment rail, hero tray) are worth keeping for hover/focus, but
     * a theme flip re-runs them: the canvas repaints in one recalc (CSS
     * variables swap with the attribute) while the borders and halos ease in
     * behind it — the staged "colours first, styles later" beat. Two layers
     * make the swap land in one frame:
     *
     * 1. An attribute on <html> and <body> suppresses every transition the
     *    suppression rule can out-specify (see theme-flip.css).
     * 2. A forced style flush inside the flip's microtask, then cancelling
     *    every running paint transition: the flush makes the transitions the
     *    flip would start NOW (before any paint), and cancel() snaps
     *    their properties to the final values in the same frame. This covers
     *    the high-specificity rules the stylesheet cannot out-specify (the
     *    input scroll is (0,6,1), the rail (0,7,1)). A cancel in a rAF would
     *    be one frame late — recalc runs after rAF callbacks.
     *
     * Only paint properties themes actually change are cancelled; transform
     * and opacity transitions (hover/menu feedback) keep running. The flag
     * comes down after a short window, so everyday hover/focus feel is
     * untouched.
     *
     * The host flips `data-ds-dark-theme` on <body> itself; this observer only
     * times the suppression around that flip. It deliberately does NOT live
     * in the scheduler: the scheduler's pass observer only watches
     * aria-label/aria-selected (D9), and this flag must not feed it.
     */
    const THEME_FLIP_ATTR = 'data-dsh-theme-transitioning'
    const THEME_FLIP_MS = 300
    // Paint properties a theme flip changes; cancelling their transitions
    // snaps them to the new theme's values in one frame.
    const THEME_FLIP_PROPS = {
      'border-color': true,
      'border': true,
      'border-top-color': true,
      'border-right-color': true,
      'border-bottom-color': true,
      'border-left-color': true,
      'box-shadow': true,
      'color': true,
      'background-color': true,
      'background': true,
      'background-image': true,
      'outline-color': true,
      'fill': true,
      'stroke': true,
      'text-decoration-color': true,
      'caret-color': true
    }

    function installThemeFlip() {
      const body = document.body
      const root = document.documentElement
      let flipTimer = null

      // The flag lives on <html> AND <body> so the suppression selector can
      // out-specify the gated composer rules it can (html[flag] body[skin][flag] *).
      function setFlag(on) {
        if (on) {
          root.setAttribute(THEME_FLIP_ATTR, '')
          body.setAttribute(THEME_FLIP_ATTR, '')
        } else {
          root.removeAttribute(THEME_FLIP_ATTR)
          body.removeAttribute(THEME_FLIP_ATTR)
        }
      }

      function cancelThemeTransitions() {
        const anims = document.getAnimations()
        for (let i = 0; i < anims.length; i++) {
          const anim = anims[i]
          // CSSTransition carries transitionProperty; CSSAnimation does not.
          if (!anim || typeof anim.transitionProperty !== 'string') continue
          if (!THEME_FLIP_PROPS[anim.transitionProperty]) continue
          anim.cancel()
        }
      }

      function onThemeFlip() {
        setFlag(true)
        // Force the flip's style recalc right now — inside this microtask,
        // before any paint — so every transition it would start has started.
        void root.offsetHeight
        cancelThemeTransitions()
        // The host may commit more of the flip after us; sweep the next two
        // frames to catch those starts as well.
        requestAnimationFrame(() => {
          cancelThemeTransitions()
          requestAnimationFrame(cancelThemeTransitions)
        })
        if (flipTimer !== null) clearTimeout(flipTimer)
        flipTimer = setTimeout(() => {
          setFlag(false)
          flipTimer = null
        }, THEME_FLIP_MS)
      }

      const themeObserver = new MutationObserver(onThemeFlip)
      themeObserver.observe(body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })

      return () => {
        themeObserver.disconnect()
        if (flipTimer !== null) clearTimeout(flipTimer)
        setFlag(false)
      }
    }
