    /**
     * The crab that sits on the studio home page's composer: Claude Code's own
     * pixel mascot, perched on the card's top edge near its right end. The
     * classic home page keeps its centred hero without it.
     *
     * It stands still facing the reader. When it is clicked, when the pointer
     * leaves it, and now and then on its own while the hero page stays up, it
     * plays Claude Code's fishing routine: a blink, a rod raised overhead and
     * cast down past the card's edge, a hop into a side-on stance, a spell of
     * fishing, and the rod reeled in as it turns back. A reader who asks the
     * system for reduced motion gets the routine only by clicking the crab.
     *
     * The frames are Claude Code's animation cut into two strips the build
     * inlines (src/assets/mascot): the crab in its colours, and the rod as a
     * mask the stylesheet fills with the theme's quiet ink. A frame change
     * writes one custom property on the crab's own node — the `style`
     * attribute, which the scheduler's observer does not watch — so the
     * routine never wakes a pass. The card comes from the composer's own
     * reading (`ui.composer.heroCard`), and the crab is the skin's own node
     * appended to it, re-appended when the host replaces the card.
     *
     * @param ui - shared handle table.
     * @returns teardown.
     */
    function installMascot(ui) {
      /** How long each frame of the routine holds, as in Claude Code's animation. */
      const FRAME_MS = 80
      /**
       * The routine, frame by frame, as indices into the strips (the strips
       * hold each distinct frame once). It starts and ends on the resting
       * frame 0.
       */
      const ROUTINE = [
        0, 0, 0, 0, 1, 2, 1, 2, 2, 3, 4, 4, 5, 6, 7, 8, 9, 10, 11, 12, 10, 11, 12, 10, 11, 12,
        10, 11, 12, 10, 11, 12, 10, 13, 14, 15, 16, 17, 17, 18, 19, 0, 0,
      ]
      /** The quiet spell between two unprompted routines, in milliseconds. */
      const IDLE_MIN_MS = 25000
      const IDLE_SPAN_MS = 20000

      let root = null
      let playing = false
      let stepTimer = null
      let idleTimer = null

      /** Whether the reader asks the system for reduced motion, as of now. */
      function reducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      }

      function build() {
        root = buildElement('span', 'dsh-claude-mascot')
        root.setAttribute('aria-hidden', 'true')
        root.appendChild(buildElement('span', 'dsh-claude-mascot-body'))
        root.appendChild(buildElement('span', 'dsh-claude-mascot-rod'))
        // The pointer only meets the crab itself, never the rod's empty room.
        const hit = buildElement('span', 'dsh-claude-mascot-hit')
        hit.addEventListener('click', play)
        hit.addEventListener('pointerleave', play)
        root.appendChild(hit)
        show(0)
      }

      function show(frame) {
        root.style.setProperty('--dsh-claude-mascot-frame', String(frame))
      }

      function stopRoutine() {
        if (stepTimer !== null) clearTimeout(stepTimer)
        stepTimer = null
        playing = false
        if (root !== null) show(0)
      }

      /**
       * Play the routine once. Under reduced motion only a click plays it — the
       * reader asked for it by name; the pointer passing by and the idle timer
       * do not.
       */
      function play(event) {
        if (playing || root === null || !root.isConnected) return
        if (reducedMotion() && !(event && event.type === 'click')) return
        playing = true
        let step = 0
        function next() {
          show(ROUTINE[step])
          step++
          if (step >= ROUTINE.length) {
            stepTimer = null
            playing = false
            return
          }
          stepTimer = setTimeout(next, FRAME_MS)
        }
        next()
      }

      /** The next unprompted routine, some time from now, while the page is in view. */
      function scheduleIdle() {
        idleTimer = setTimeout(() => {
          if (!document.hidden) play()
          scheduleIdle()
        }, IDLE_MIN_MS + Math.random() * IDLE_SPAN_MS)
      }

      /** Each pass: the crab rides the studio hero's card, and leaves with it. */
      function sync() {
        const card = readPrefs().homeLayout === HOME_LAYOUT_STUDIO ? ui.composer.heroCard() : null
        if (card === null) {
          if (root !== null && root.parentNode !== null) {
            stopRoutine()
            root.parentNode.removeChild(root)
          }
          return
        }
        if (root === null) build()
        if (root.parentNode !== card) card.appendChild(root)
      }

      ui.mascot = { sync }
      scheduleIdle()

      return () => {
        stopRoutine()
        clearTimeout(idleTimer)
        idleTimer = null
        if (root !== null && root.parentNode !== null) root.parentNode.removeChild(root)
        root = null
        delete ui.mascot
      }
    }
