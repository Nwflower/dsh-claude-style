    /**
     * The account surface: one row model, two mount points.
     *
     * A host with an account area (Desktop 0.1.7+) owns the entry — its own
     * account row, restyled by the stylesheet, opens its own account menu. The
     * host renders that menu's list itself and unmounts it on close, so this
     * surface re-identifies the list every pass and injects our container at its
     * head: the first child INSIDE the list, never a sibling of the host's rows.
     * The list is content-matched (account/host-menu.js), so the permission
     * control's menu and the model picker's submenu are never touched.
     *
     * A host without one (Web) gets a self-built trigger and popover
     * (account-footer.js); that popover's body is the container.
     *
     * A closed list leaves no reference behind: the next open builds a fresh
     * container. A host re-render that merely empties the list is healed by
     * re-inserting the node we still hold, so our rows survive it unchanged.
     */
    function createAccountSurface(options) {
      let mode = null
      let hostContainer = null
      /** The open account menu, marked for the stylesheet. */
      const menuStamp = createStamp(ACCOUNT_MENU_ATTR)

      function detect() {
        return options.hostTrigger() !== null ? 'host' : 'synthetic'
      }

      function container() {
        return mode === 'host' ? hostContainer : options.syntheticContainer()
      }

      /**
       * Stamp the open account menu so the stylesheet can tell the host's
       * hashed card from its other menus, and clear the stamp when it is gone.
       * Value-change only: the attribute is written on the transition, never
       * once per pass. The transition is also reported to the caller, which
       * binds its hover behaviour on the menu the host has just mounted.
       */
      function markMenu(menu) {
        if (menuStamp.current() === menu) return
        menuStamp.mark(menu)
        if (options.onMenu) options.onMenu(menu)
      }

      function syncHost() {
        const menu = options.findMenu()
        if (menu === null) {
          // Closed: the host unmounted the list, and our node is dead to us.
          markMenu(null)
          hostContainer = null
          return
        }
        markMenu(menu)
        const viewport = options.menuViewport(menu)
        if (viewport === null) {
          hostContainer = null
          return
        }
        if (hostContainer === null) hostContainer = options.buildContainer()
        // Re-insert whenever the host has moved or dropped us. This is the
        // self-heal, and it is also what keeps our container first.
        if (viewport.firstChild !== hostContainer) viewport.insertBefore(hostContainer, viewport.firstChild)
      }

      function sync() {
        const next = detect()
        if (next !== mode) {
          mode = next
          hostContainer = null
          options.onMode(mode)
        }
        if (mode === 'host') syncHost()
      }

      return {
        mode() { return mode },
        container,
        clearMenu() { markMenu(null) },
        sync
      }
    }
