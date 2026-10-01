    /** macOS: the clearance the traffic lights need, read off the host's own leading seat. */
    const MAC_TRAFFIC_LIGHTS = 88
    /** macOS: the strip height the host declares, used when the token is absent. */
    const MAC_BAND_HEIGHT = 48
    /** Windows: the three caption buttons at their standard size, used when the overlay cannot measure them. */
    const WIN_CAPTION_CONTROLS = 140
    /** Windows: the strip height the host declares, used when the token is absent. */
    const WIN_BAND_HEIGHT = 40

    /**
     * The host's declared caption-strip height, or `fallback` when the host
     * declares none.
     *
     * `--dsh-frame-top-clearance` is the host's own name for the strip, and the
     * one token both desktop platforms set: 48px under
     * `html[data-platform=darwin]`, and `var(--dsh-windows-titlebar-height)`
     * under `html[data-windows-titlebar]`. It is read through the computed
     * style, so that alias chain resolves to a length.
     *
     * @param fallback - the height to answer with when the token is absent.
     * @returns the height in CSS pixels.
     */
    function bandHeight(fallback) {
      const declared = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dsh-frame-top-clearance'))
      return isFinite(declared) && declared > 0 ? Math.round(declared) : fallback
    }

    /**
     * The desktop shell's native caption strip, resolved in one place.
     *
     * Both desktop platforms hand the top of the window to a native layer, and
     * every consumer of that strip asks the same three questions: whether it
     * exists, how tall it is, and which end the platform's window controls take.
     * The platforms answer differently, so the answers are resolved here once.
     *
     *   - Marker. Windows marks `<html>` with `data-windows-titlebar`; macOS
     *     marks it `data-platform="darwin"`. The shell's preload writes both.
     *   - Controls. Windows draws its three caption buttons at the right end and
     *     publishes their box through the Window Controls Overlay API; macOS
     *     draws its traffic lights at the left, at (16, 18) — the shell's own
     *     `trafficLightPosition` — and publishes no measurement. The host's own
     *     leading seat starts at 88px, the clearance those lights need.
     *   - Fullscreen. A fullscreen macOS window hides its traffic lights, and
     *     the host zeroes `--dsh-frame-chrome-top` with them, so that platform
     *     answers null. Windows keeps the answer it gave before this module
     *     existed: its frame holds both the strip and its padding in fullscreen,
     *     and the Window Controls Overlay API's own visibility is the authority
     *     there.
     *
     * Windows' answers are the ones the caption-band code computed before this
     * module existed, the Window Controls Overlay API included, so that
     * platform's behaviour is unchanged.
     *
     * @returns {{ platform: 'win32' | 'darwin', height: number, controls: { side: 'left' | 'right', size: number } } | null}
     *          the strip, or null when the page owns its whole surface.
     */
    function desktopBand() {
      const root = document.documentElement
      if (root.hasAttribute('data-windows-titlebar')) {
        const overlay = navigator.windowControlsOverlay
        if (!overlay || overlay.visible !== true) return null
        const rect = typeof overlay.getTitlebarAreaRect === 'function' ? overlay.getTitlebarAreaRect() : null
        if (rect && rect.width > 0 && rect.height > 0) {
          return {
            platform: 'win32',
            height: Math.round(rect.height),
            controls: { side: 'right', size: Math.max(0, Math.round(window.innerWidth - rect.right)) },
          }
        }
        // The API is present and visible with no measurement yet: the declared
        // caption height, and Windows' three caption buttons at their standard
        // size.
        return {
          platform: 'win32',
          height: bandHeight(WIN_BAND_HEIGHT),
          controls: { side: 'right', size: WIN_CAPTION_CONTROLS },
        }
      }
      if (root.dataset.platform === 'darwin') {
        if (root.hasAttribute('data-fullscreen')) return null
        return {
          platform: 'darwin',
          height: bandHeight(MAC_BAND_HEIGHT),
          controls: { side: 'left', size: MAC_TRAFFIC_LIGHTS },
        }
      }
      return null
    }
