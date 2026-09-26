    /**
     * The "Your account is on hold" screen, reproduced from Claude's own
     * account-hold page. It is an EASTER EGG, not a real state: nothing here
     * touches the host, the session, or the preference store — the overlay is
     * one node appended to `<body>` and removed again on the way out.
     *
     * Entry is the account row at the top of the sidebar footer's account
     * popover (src/features/account/account-footer.js binds that row to
     * `ui.ban.open()`). Exit follows the way in — every control the page
     * paints ("Sign out", "Request a review", the two "What you can do" rows,
     * the toast's dismiss button, the window controls) closes it, and Esc
     * closes it (scheduler.js's global key handler). Nothing inside the overlay
     * performs the action its label names.
     *
     * Losing focus does NOT close it, on purpose. The page is something to
     * READ: the reader has to switch windows to look something up, and an
     * overlay that vanishes the moment they do is worse than one that waits.
     * Leaving is always an explicit act — a control on the page or Esc — so the
     * blur listener this used to carry is gone.
     *
     * Layout note: the overlay is `position: fixed` at the top of the stacking
     * order rather than a real page, so it covers the whole window (sidebar,
     * titlebar, composer) whatever the host renders underneath — and it can
     * never be clipped by the sidebar column, which the account popover itself
     * has to work around.
     */
    function installBanScreen(ctx, ui) {
      var banRoot = null

      /**
       * Close the easter egg. Safe to call at any time (teardown, a second
       * click, a missing overlay): everything is null-checked and the handle
       * is idempotent, so the caller never has to know the current state.
       */
      function closeBanScreen() {
        if (banRoot !== null && banRoot.parentElement !== null) {
          banRoot.parentElement.removeChild(banRoot)
        }
        banRoot = null
      }

      /** Whether `node` is one of the overlay's own dismiss controls. */
      function isBanDismissTarget(node) {
        var el = node
        while (el && el !== banRoot) {
          if (el.nodeType === 1 && el.hasAttribute('data-dsh-ban-dismiss')) return true
          el = el.parentElement
        }
        return false
      }

      /**
       * One inline SVG. The page's own icons: none of them ship as assets.
       *
       * `strokeWidth` is a PARAMETER, not an extra attribute: appending a second
       * `stroke-width` to the same `<svg>` produces a duplicate attribute, and
       * the HTML parser drops every attribute after the first — the override
       * silently does nothing and the icon keeps the set's own 1.6 (which is how
       * the lock shipped at nearly 4px instead of the traced weight).
       */
      function banSvg(body, strokeWidth) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
          (strokeWidth === undefined ? 1.6 : strokeWidth) + '" ' +
          'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>'
      }

      /**
       * The lock is a HAND-DRAWN TRACE, not a `rect` + `circle` assembly: every
       * edge is a cubic whose anchors and handles carry the sketch's own wobble.
       * Nothing here is a filter or a jitter — the hand-drawn character lives in
       * the anchor points themselves, so it survives any scale, and the geometry
       * stays reviewable: each `C` below is one anchor with its two handles.
       *
       * What the anchors encode, read off the reference sketch: the body's top
       * edge slants down to the right while the bottom edge sags; the left side
       * drifts outward on the way down and the right side bows out around the
       * keyhole before coming back; a short diagonal cuts each corner so no two
       * strokes meet at a perfect right angle; the shackle's two arches are not
       * concentric and its legs stop on the body's top edge instead of crossing
       * it; the keyhole's head is flatter than a circle, its waist sits
       * off-centre, and its base flares wider than the head.
       *
       * The numbers are the reference's ink centrelines (measured off an 89x92
       * px drawing) mapped onto this icon set's 24-unit grid: the ink box
       * (58.5x76.3 px) becomes 15.3x20 units, centred. `stroke-width` is 0.5
       * units — the ban screen paints this in a 75px box, so the ink lands at
       * ~61px and the line at ~1.6px, which is the weight the reference itself
       * is drawn at (a 2px line on a 77px lock).
       */
      /** The overlay's icon set, in one place so the markup below stays readable. */
      var BAN_ICONS = {
        lock: banSvg(
          // body: top edge, right side (with its outward bow), bottom edge, left side
          '<path d="M4.412 9.025 C9.287 8.894 14.136 9.077 19.379 9.182' +
          ' C19.379 11.541 19.379 13.638 19.405 14.949' +
          ' C19.667 15.735 19.641 16.784 19.457 17.57' +
          ' C19.379 18.619 19.379 20.191 19.379 21.659' +
          ' C14.923 21.764 9.156 21.764 4.674 21.659' +
          ' C4.7 19.405 4.7 16.26 4.674 14.163' +
          ' C4.621 13.114 4.516 12.066 4.438 11.279' +
          ' C4.385 10.231 4.385 9.444 4.412 9.025 Z"></path>' +
          // shackle: outer arch, then the inner one, both ending on the top edge
          '<path d="M8.081 8.972 C7.95 7.872 7.95 6.561 8.081 5.25' +
          ' C8.212 3.94 8.789 2.734 9.837 2.341' +
          ' C10.676 2.105 12.721 2.131 13.507 2.315' +
          ' C14.503 2.603 15.29 3.258 15.394 4.071' +
          ' C15.499 5.25 15.499 6.561 15.526 9.156' +
          ' M9.89 9.025 C9.785 7.609 9.785 6.299 9.89 5.25' +
          ' C9.995 4.359 10.519 3.861 11.567 3.861' +
          ' C12.537 3.809 13.324 4.097 13.664 4.988' +
          ' C13.796 5.644 13.796 7.085 13.796 9.13"></path>' +
          // keyhole: head, right wall into the waist, base, left wall back up
          '<path d="M10.021 14.634 C9.864 14.32 9.811 14.11 9.811 13.9' +
          ' C9.759 13.245 9.916 12.485 10.729 12.092' +
          ' C11.253 11.882 12.197 11.882 12.695 12.092' +
          ' C13.271 12.301 13.691 12.983 13.664 13.9' +
          ' C13.664 14.11 13.612 14.32 13.35 14.634' +
          ' C13.166 14.844 12.773 15.001 12.695 15.316' +
          ' C12.668 15.84 13.455 17.046 13.927 18.383' +
          ' C12.433 18.592 10.86 18.566 9.68 18.435' +
          ' C10.152 17.151 10.702 16.417 10.598 15.683' +
          ' C10.519 15.263 10.257 14.949 10.021 14.634 Z"></path>',
          0.5
        ),
        warning: banSvg(
          '<path d="M10.3 3.9 2.6 17.2a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>' +
          '<path d="M12 9v4.2"></path>' +
          '<path d="M12 16.8h.01"></path>'
        ),
        close: banSvg('<path d="M6.4 6.4 17.6 17.6"></path><path d="M17.6 6.4 6.4 17.6"></path>'),
        download: banSvg('<path d="M12 3.5v11"></path><path d="m7.5 10 4.5 4.5 4.5-4.5"></path><path d="M4.5 19.5h15"></path>'),
        trash: banSvg(
          '<path d="M4.5 6.8h15"></path>' +
          '<path d="M9.5 6.8V5.2a1.2 1.2 0 0 1 1.2-1.2h2.6a1.2 1.2 0 0 1 1.2 1.2v1.6"></path>' +
          '<path d="M6.8 6.8 7.7 19a1.5 1.5 0 0 0 1.5 1.4h5.6a1.5 1.5 0 0 0 1.5-1.4l.9-12.2"></path>' +
          '<path d="M10.3 10.4v6.2"></path><path d="M13.7 10.4v6.2"></path>'
        ),
        chevron: banSvg('<path d="m9.5 5.5 7 6.5-7 6.5"></path>'),
        minimize: banSvg('<path d="M4 12h16"></path>'),
        maximize: banSvg('<rect x="4.5" y="4.5" width="15" height="15" rx="2"></rect>'),
        restore: banSvg(
          '<rect x="4.5" y="8.5" width="11" height="11" rx="2"></rect>' +
          '<path d="M8.5 8.5V6a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 19.5 6v8a1.5 1.5 0 0 1-1.5 1.5h-2.5"></path>'
        ),
      }

      /**
       * The hold timestamp. The date part is Claude's own format ("Jul 4, 2026")
       * and is built by hand rather than through `toLocaleString`, because the
       * page is a fixed bilingual document and the stamp must not re-translate
       * itself into a third format when the browser's locale is neither of the
       * two. The time part follows the chosen language's own convention — the
       * AM/PM clock in English, the 24-hour clock in Chinese.
       */
      var BAN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      function formatBanStamp(date) {
        var datePart = BAN_MONTHS[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear()
        var timePart
        if (readPrefs().banLocale === BAN_LOCALE_ZH) {
          var hh = date.getHours()
          var mm = date.getMinutes()
          timePart = (hh < 10 ? '0' + hh : String(hh)) + ':' + (mm < 10 ? '0' + mm : String(mm))
        } else {
          var hours = date.getHours()
          var hour12 = hours % 12
          if (hour12 === 0) hour12 = 12
          var minutes = date.getMinutes()
          timePart = hour12 + ':' + (minutes < 10 ? '0' + minutes : String(minutes)) + ' ' + (hours < 12 ? 'AM' : 'PM')
        }
        return datePart + ', ' + timePart
      }

      /** When the open overlay is dated, so a refresh never re-dates the page. */
      var banOpenedAt = null

      /**
       * Show the screen.
       *
       * @param bannedAt - when the "hold" is dated; defaults to now. Exposed so
       *   a caller (or a probe) can pin the timestamp instead of reading it off
       *   the clock.
       */
      function openBanScreen(bannedAt) {
        closeBanScreen()
        if (typeof document === 'undefined' || document.body === null) return

        var root = document.createElement('div')
        root.className = 'dsh-claude-ban'
        root.setAttribute('role', 'dialog')
        root.setAttribute('aria-modal', 'true')
        root.setAttribute('data-dsh-ban', '')

        banOpenedAt = bannedAt instanceof Date ? bannedAt : new Date()
        var stamp = formatBanStamp(banOpenedAt)
        var username = getUsername(ctx)

        // The wordmark follows the brand preference like the sidebar does; the
        // "off" choice only drops the starburst, since a bare "Claude" text
        // wordmark is what the page is.
        var brand = readPrefs().brand
        var showMark = brand !== BRAND_OFF
        var useAnthropic = brand === BRAND_ANTHROPIC

        root.innerHTML =
          '<div class="dsh-claude-ban-bar">' +
            '<div class="dsh-claude-ban-brand">' +
              (showMark ? '<span class="dsh-claude-ban-mark"></span>' : '') +
              '<span class="dsh-claude-ban-word"></span>' +
            '</div>' +
            '<div class="dsh-claude-ban-bar-actions">' +
              '<button type="button" class="dsh-claude-ban-signout" data-dsh-ban-dismiss>' +
                banCopy('signOut', 'Sign out') +
              '</button>' +
              '<div class="dsh-claude-ban-window" aria-hidden="true">' +
                '<button type="button" class="dsh-claude-ban-win" tabindex="-1" data-dsh-ban-dismiss>' + BAN_ICONS.minimize + '</button>' +
                '<button type="button" class="dsh-claude-ban-win" tabindex="-1" data-dsh-ban-dismiss>' + BAN_ICONS.restore + '</button>' +
                '<button type="button" class="dsh-claude-ban-win" tabindex="-1" data-dsh-ban-dismiss>' + BAN_ICONS.close + '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="dsh-claude-ban-toast" data-dsh-ban-dismiss role="status">' +
            '<span class="dsh-claude-ban-toast-icon">' + BAN_ICONS.warning + '</span>' +
            '<span class="dsh-claude-ban-toast-text"></span>' +
            '<span class="dsh-claude-ban-toast-close">' + BAN_ICONS.close + '</span>' +
          '</div>' +
          '<div class="dsh-claude-ban-scroll">' +
            '<div class="dsh-claude-ban-column">' +
              '<span class="dsh-claude-ban-lock">' + BAN_ICONS.lock + '</span>' +
              '<h1 class="dsh-claude-ban-title">' + banCopy('title', 'Your account is on hold') + '</h1>' +
              '<p class="dsh-claude-ban-lead">' +
                banCopy('lead', 'We put your account on hold on <strong>{time}</strong> because of unusual activity. Your chats and data are safe.', { time: stamp }) +
              '</p>' +
              '<p class="dsh-claude-ban-lead">' + banCopy('leadError', 'If you think this hold is an error, you can request an account review.') + '</p>' +
              '<p class="dsh-claude-ban-next">' + banCopy('nextLabel', 'What happens next:') + '</p>' +
              '<div class="dsh-claude-ban-card">' +
                '<div class="dsh-claude-ban-step">' +
                  '<span class="dsh-claude-ban-step-num">1</span>' +
                  '<span class="dsh-claude-ban-step-body">' +
                    '<span class="dsh-claude-ban-step-title">' + banCopy('step1Title', 'Request a review') + '</span>' +
                    '<span class="dsh-claude-ban-step-desc">' + banCopy('step1Desc', 'Tell us more about what happened.') + '</span>' +
                  '</span>' +
                '</div>' +
                '<div class="dsh-claude-ban-step">' +
                  '<span class="dsh-claude-ban-step-num">2</span>' +
                  '<span class="dsh-claude-ban-step-body">' +
                    '<span class="dsh-claude-ban-step-title">' + banCopy('step2Title', 'We\u2019ll review your account') + '</span>' +
                    '<span class="dsh-claude-ban-step-desc">' + banCopy('step2Desc', 'A team member will review your request and account activity together.') + '</span>' +
                  '</span>' +
                '</div>' +
                '<div class="dsh-claude-ban-step">' +
                  '<span class="dsh-claude-ban-step-num">3</span>' +
                  '<span class="dsh-claude-ban-step-body">' +
                    '<span class="dsh-claude-ban-step-title">' + banCopy('step3Title', 'We\u2019ll email you the outcome') + '</span>' +
                    '<span class="dsh-claude-ban-step-desc">' + banCopy('step3Desc', 'Reviews take about 10 days.') + '</span>' +
                  '</span>' +
                '</div>' +
              '</div>' +
              '<button type="button" class="dsh-claude-ban-primary" data-dsh-ban-dismiss>' +
                banCopy('review', 'Request a review') +
              '</button>' +
              '<h2 class="dsh-claude-ban-subtitle">' + banCopy('whatYouCanDo', 'What you can do') + '</h2>' +
              '<div class="dsh-claude-ban-card dsh-claude-ban-actions">' +
                '<button type="button" class="dsh-claude-ban-action" data-dsh-ban-dismiss>' +
                  '<span class="dsh-claude-ban-action-icon">' + BAN_ICONS.download + '</span>' +
                  '<span class="dsh-claude-ban-action-text">' +
                    '<span class="dsh-claude-ban-action-title">' + banCopy('exportTitle', 'Export your data') + '</span>' +
                    '<span class="dsh-claude-ban-action-desc">' + banCopy('exportDesc', 'We\u2019ll package up your conversations, projects, and settings for download. This might take some time to complete.') + '</span>' +
                  '</span>' +
                  '<span class="dsh-claude-ban-action-chevron">' + BAN_ICONS.chevron + '</span>' +
                '</button>' +
                '<button type="button" class="dsh-claude-ban-action" data-dsh-ban-dismiss>' +
                  '<span class="dsh-claude-ban-action-icon">' + BAN_ICONS.trash + '</span>' +
                  '<span class="dsh-claude-ban-action-text">' +
                    '<span class="dsh-claude-ban-action-title dsh-claude-ban-action-title-danger">' + banCopy('deleteTitle', 'Delete your account') + '</span>' +
                    '<span class="dsh-claude-ban-action-desc">' + banCopy('deleteDesc', 'You can permanently delete your account and data. This can\u2019t be undone.') + '</span>' +
                  '</span>' +
                  '<span class="dsh-claude-ban-action-chevron">' + BAN_ICONS.chevron + '</span>' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>'
        // The username is user- and host-supplied text (a preference, the OS user,
        // the account nickname), so it is written as text, never spliced into the
        // markup above.
        root.querySelector('.dsh-claude-ban-toast-text').textContent = username + ': account_banned'

        // One listener for every way out that is a click: the markup marks each
        // control with `data-dsh-ban-dismiss`, and a click that lands on the
        // page's empty canvas stays put (so the page can still be read). The
        // keyboard way out is Esc, handled with the other overlays in
        // scheduler.js — deliberately not a window `blur`, which would close
        // the page the moment the reader switched windows to look something up.
        root.addEventListener('click', function (e) {
          if (isBanDismissTarget(e.target)) closeBanScreen()
        })

        banRoot = root
        document.body.appendChild(root)
      }

      // The account row reaches this through the shared `ui` handle registry —
      // the same discipline the scheduler and the other features use — so the
      // handle must be REGISTERED here, not merely returned. (The account row is
      // wired in account-footer.js before this runs, but it only reads
      // `ui.ban` at click time, so the order is safe either way.)
      ui.ban = {
        open: openBanScreen,
        /**
         * Esc is the overlay's only keyboard exit. The scheduler dispatches
         * 'composer' for composer focus and 'outside' for a press; neither may
         * dismiss a page the reader is looking at.
         */
        close: function (reason) {
          if (reason === 'composer' || reason === 'outside') return
          closeBanScreen()
        },
        isOpen: function () {
          return banRoot !== null
        },
        /**
         * Rebuild an OPEN overlay in place — the page is assembled once, so a
         * copy change (the locale, the preferences or the model copy document)
         * would otherwise only land the next time it is opened. A no-op while
         * closed, and the hold timestamp is kept so a re-render never re-dates
         * the page under the reader. The scheduler dispatches this for every
         * copy source; the shipped code only did it for a preferences change,
         * which is a no-op while closed and the more correct rebuild while open.
         */
        onCopyChange: function () {
          if (banRoot === null) return
          openBanScreen(banOpenedAt === null ? new Date() : banOpenedAt)
        },
      }

      return closeBanScreen
    }
