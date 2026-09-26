    /**
     * The host's account trigger, its settings entry, and its open account menu.
     *
     * The skin no longer drives the host's account menu to read its rows: the
     * account surface (account/surface.js) injects our rows into the menu while
     * it is open, and the host renders its own rows. This factory therefore keeps
     * only what the remaining callers need — the trigger (which is both the entry
     * on a host that has one and the "is there an account area?" probe), the
     * menu's list element to inject into, and the settings drive that Ctrl+, and
     * the synthetic path's settings row still use.
     */
    function createHostAccountMenu(options) {
      /** A click the host's React handlers actually see (pointerdown + click). */
      function realClick(el) {
        if (el === null || el === undefined) return
        var rect = el.getBoundingClientRect()
        var init = {
          bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1,
          clientX: Math.round(rect.left + rect.width / 2),
          clientY: Math.round(rect.top + rect.height / 2)
        }
        try { el.dispatchEvent(new PointerEvent('pointerdown', init)) } catch (error) { /* older engines */ }
        el.dispatchEvent(new MouseEvent('mousedown', init))
        try { el.dispatchEvent(new PointerEvent('pointerup', init)) } catch (error) { /* older engines */ }
        el.dispatchEvent(new MouseEvent('mouseup', init))
        el.click()
      }

      /**
       * The host's account trigger: the menu anchor inside the FOOTER, which is
       * where the account row lives. Taking "the first menu anchor that is not
       * ours" was wrong — the shell has several (the open-in-app picker, the
       * workspace selector), and on a host without the desktop account the skin
       * then mirrored THAT menu into the account drawer. The trigger names
       * itself ("账号菜单" / "Account menu"), so the label is matched first.
       */
      function hostAccountTrigger() {
        var foot = findFootArea()
        var scopes = [foot, document]
        for (var s = 0; s < scopes.length; s++) {
          if (scopes[s] === null || scopes[s] === undefined) continue
          var anchors = scopes[s].querySelectorAll('[aria-haspopup="menu"]')
          for (var i = 0; i < anchors.length; i++) {
            var el = anchors[i]
            if (String(el.className || '').indexOf('dsh-claude-') !== -1) continue
            if (/账号|account/i.test(el.getAttribute('aria-label') || '')) return el
          }
        }
        // No fallback. "The first non-ours anchor in the footer" picked the
        // open-in-app menu instead, filling the drawer with Cursor / VS Code / …
        // Returning null is the honest answer: the surface self-builds instead.
        return null
      }

      /**
       * The host's settings button, a dialog trigger in the footer, or null. The
       * desktop has none: its account menu took that slot and carries 设置
       * itself, and "any button that is not a menu anchor" there is the update
       * pill beside it — the settings row read "Retry update" and clicked it.
       */
      function hostSettingsTrigger() {
        var foot = findFootArea()
        return foot === null ? null : foot.querySelector('[class*="settingsArea"] button[aria-haspopup="dialog"]')
      }

      var SETTINGS_LABEL = /^(设置|settings)$/i

      /**
       * Whether an open `role=menu` is the host's account menu.
       *
       * Content-matched, not class-matched: the shell renders several menus (the
       * permission control's, the model picker's submenu) and the host's class
       * names are hashed. Only the account menu carries a sign-out/sign-in row,
       * or both a settings and a feedback row.
       */
      function isAccountMenu(menu) {
        var items = menu.querySelectorAll('[role="menuitem"]')
        var sign = false
        var settings = false
        var feedback = false
        for (var i = 0; i < items.length; i++) {
          var text = (items[i].textContent || '').trim()
          if (/退出登录|登出|Sign out|登录|Sign in/i.test(text)) sign = true
          if (SETTINGS_LABEL.test(text)) settings = true
          if (/反馈|Feedback|contact|意见/i.test(text)) feedback = true
        }
        return sign || (settings && feedback)
      }

      /** The host's open account menu, or null while it is closed. */
      function findAccountMenu() {
        var menus = document.querySelectorAll('[role="menu"]')
        for (var i = 0; i < menus.length; i++) {
          if (isAccountMenu(menus[i])) return menus[i]
        }
        return null
      }

      /**
       * The menu's list element — the host's own keyboard walk and our injected
       * rows both live inside it — or null when the host's list markup differs
       * from the one this skin was built against.
       */
      function menuViewport(menu) {
        return menu.querySelector('[role="presentation"]')
      }

      /**
       * Open the host's settings: its settings button where it has one, or else
       * the 设置 item of its account menu — the desktop, where that menu is the
       * settings launcher. The menu's rows carry no ids, so the item is found by
       * the host's own label in its two locales. The drive is hidden in place
       * while it runs: the menu is a means to the dialog, never the answer.
       */
      function openHostSettings() {
        options.close()
        var trigger = hostSettingsTrigger()
        if (trigger !== null) {
          trigger.click()
          return
        }
        var account = hostAccountTrigger()
        if (account === null) return
        realClick(account)
        var tries = 0
        function look() {
          var menu = findAccountMenu()
          if (menu !== null) {
            var items = menu.querySelectorAll('[role="menuitem"]')
            var previous = menu.style.visibility
            menu.style.visibility = 'hidden'
            for (var k = 0; k < items.length; k++) {
              if (SETTINGS_LABEL.test((items[k].textContent || '').trim())) {
                realClick(items[k])
                menu.style.visibility = previous
                return
              }
            }
            menu.style.visibility = previous
            realClick(account)
            return
          }
          if (tries++ > 20) return
          setTimeout(look, 40)
        }
        setTimeout(look, 40)
      }

      /**
       * Open the host's account menu the way the row's own click does. The
       * "Open popovers on hover" preference opens the account surface without a
       * click, so the footer has to drive the host's trigger from outside; a
       * plain click is not enough for the host's React handlers, hence the full
       * press the settings drive already uses.
       */
      /**
       * Open the host's account menu for the hover preference. The trigger opens
       * on its own onClick, so one click is the whole press: the extra
       * pointerdown/mouseup pair realClick adds reaches any host handler that
       * acts on a press, and the click that follows then toggles the just-opened
       * menu shut.
       */
      function openAccountMenu() {
        var trigger = hostAccountTrigger()
        if (trigger === null) return
        trigger.click()
      }

      return {
        trigger: hostAccountTrigger,
        settingsTrigger: hostSettingsTrigger,
        findMenu: findAccountMenu,
        menuViewport: menuViewport,
        openMenu: openAccountMenu,
        openSettings: openHostSettings
      }
    }
