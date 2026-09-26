    /**
     * The sliding highlight of a segmented control: one pseudo-element on the
     * control (shared/sliding-pill.css) that travels to the active item,
     * instead of each item fading its own background out and the next one in.
     * The conversation view tabs, the permission segments and the workspace
     * section's 进行中 / 已归档 control all place it through this one factory.
     *
     * The control gets `data-dsh-claude-pill` and two custom properties,
     * `--dsh-claude-pill-x` and `--dsh-claude-pill-w`, measured from the active
     * item's box against the control's padding box — the box the absolutely
     * placed pseudo-element is laid out in. Any transform on the control moves
     * both boxes alike, so it cancels out. The attribute and the first placement
     * land in the same call: the pseudo-element does not exist before it, so the
     * pill appears in place and only later moves slide. A control with no
     * visible active item (hidden, or nothing selected) drops the attribute and
     * the item's own active background comes back.
     *
     * Item widths change without a DOM mutation when a font finishes loading,
     * so the control is also watched by a ResizeObserver.
     *
     * @param activeSelector - the active item, relative to the control.
     * @returns `{ sync(control), release() }`: `sync` places the pill on
     *   `control` (a different control takes the placement off the previous
     *   one; null just takes it off); `release` takes it off and stops watching.
     */
    function createSlidingPill(activeSelector) {
      const PILL_ATTR = 'data-dsh-claude-pill'
      let control = null
      /** The last written offset and width, so an unchanged placement writes nothing. */
      let lastX = null
      let lastW = null
      const observer = new ResizeObserver(() => {
        if (control !== null) place()
      })

      function clear(el) {
        el.removeAttribute(PILL_ATTR)
        el.style.removeProperty('--dsh-claude-pill-x')
        el.style.removeProperty('--dsh-claude-pill-w')
        lastX = null
        lastW = null
      }

      function place() {
        const active = control.querySelector(activeSelector)
        const box = control.getBoundingClientRect()
        const itemBox = active === null ? null : active.getBoundingClientRect()
        if (box.width === 0 || itemBox === null || itemBox.width === 0) {
          if (control.hasAttribute(PILL_ATTR)) clear(control)
          return
        }
        const x = Math.round((itemBox.left - box.left - control.clientLeft) * 100) / 100
        const w = Math.round(itemBox.width * 100) / 100
        if (x === lastX && w === lastW && control.hasAttribute(PILL_ATTR)) return
        lastX = x
        lastW = w
        control.style.setProperty('--dsh-claude-pill-x', `${x}px`)
        control.style.setProperty('--dsh-claude-pill-w', `${w}px`)
        if (!control.hasAttribute(PILL_ATTR)) control.setAttribute(PILL_ATTR, '')
      }

      function sync(next) {
        if (next !== control) {
          if (control !== null) {
            observer.unobserve(control)
            clear(control)
          }
          control = next
          if (control === null) return
          observer.observe(control)
        }
        if (control !== null) place()
      }

      function release() {
        observer.disconnect()
        if (control !== null) clear(control)
        control = null
      }

      return { sync, release }
    }
