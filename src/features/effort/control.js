    /**
     * The reasoning-effort slider inside the effort picker's card
     * (src/features/effort/effort-picker.js).
     *
     * The catalog describes a model's reasoning as a discrete ladder
     * (`reasoning.efforts` plus the level in force), and this control draws that
     * ladder as a track: the label carries the level's name, `Faster` / `Smarter`
     * name the direction of travel, and the knob follows the pointer
     * CONTINUOUSLY rather than hopping stop to stop. The value settles only when
     * the gesture ends — release, or the pointer leaving the control — and it
     * settles on the NEAREST level, so dragging never reads as a hard switch
     * between fixed positions.
     *
     * The face of the control follows Claude Desktop's effort slider: a filled
     * portion grows from the left end to the knob, one tick dot marks every
     * stop the ladder offers, and the TOP rung is special — reaching it swaps
     * the plain fill for a dot-matrix (effort/matrix.js) that twinkles in
     * Claude's Ultracode violet (the grid is solved in whole device pixels,
     * the phases scattered by hash, the entrance swept in from the right, in
     * the manner of the community skin-switcher plugin), tints the knob, and
     * colours the level's name. The violet is the one deliberate exception to
     * the skin's single clay accent, at the user's request.
     *
     * A seat that names no levels (the catalog has not produced a ladder yet)
     * leaves the slider in its empty state: the knob travels the same way and
     * eases back to its resting end, but there is nothing to snap to and
     * nothing to select.
     *
     * The element is built once and never detached (effort-picker.js): a
     * detach mid-gesture would drop the pointer capture, and a re-insertion
     * restarts its CSS animations.
     *
     * @param opts - `{ read, onPick, onDragStart, onDragEnd }`. `read()` returns
     *   the current seat's effort descriptor — the model picker's `effort()`,
     *   held over while a selection is in flight — or null,
     *   `onPick(levelId)` commits one level — `undefined` is the
     *   model's own default level — and `onDragEnd(event)` hears the physical
     *   release wherever it lands (the gesture itself may have settled earlier,
     *   at the control's edge).
     * @returns `{ el, update, isHeld }`.
     */
    function createEffortControl(opts) {
      const root = buildElement('div', 'dsh-claude-effort')
      const head = buildElement('div', 'dsh-claude-effort-head')
      const labelEl = buildElement('span', 'dsh-claude-effort-label')
      const valueEl = buildElement('span', 'dsh-claude-effort-value')
      /* The outgoing name, absolutely positioned over the value: it takes no
         layout space and never needs removing — the out animation ends at
         opacity 0 and is re-armed on the next swap. */
      const valueGhost = buildElement('span', 'dsh-claude-effort-value-ghost')
      const ends = buildElement('div', 'dsh-claude-effort-ends')
      const fasterEl = buildElement('span', 'dsh-claude-effort-end')
      const smarterEl = buildElement('span', 'dsh-claude-effort-end')
      const track = buildElement('div', 'dsh-claude-effort-track')
      const fill = buildElement('div', 'dsh-claude-effort-fill')
      const ticks = buildElement('div', 'dsh-claude-effort-ticks')
      const matrix = buildElement('div', 'dsh-claude-effort-matrix')
      const knob = buildElement('div', 'dsh-claude-effort-knob')

      head.appendChild(labelEl)
      head.appendChild(valueEl)
      head.appendChild(valueGhost)
      ends.appendChild(fasterEl)
      ends.appendChild(smarterEl)
      /* Paint order is DOM order: the fill under the ticks, the matrix over
         both, and the opaque knob on top — it covers whatever it rides over. */
      track.appendChild(fill)
      track.appendChild(ticks)
      track.appendChild(matrix)
      track.appendChild(knob)
      root.appendChild(head)
      root.appendChild(ends)
      root.appendChild(track)
      track.setAttribute('role', 'slider')
      track.setAttribute('tabindex', '0')
      /** The top rung's dot matrix (effort/matrix.js). */
      const dotMatrix = createEffortMatrix(track, matrix)

      /** The ladder in force, the level it is on, and the words around it. */
      let steps = []
      let selected = -1
      let live = -1
      /**
       * A press and a drag are two states, not one. `pressed` starts on
       * pointerdown and the knob GLIDES to the press position (the stylesheet's
       * translate transition is still live, so a click on bare track reads as
       * travel rather than a teleport). `dragging` starts on the first move and
       * writes directly, with `data-dragging` switching the transition off so
       * the knob keeps up with the pointer. Setting the drag flag at pointerdown
       * would kill the glide before the browser ever started it: the transition
       * list is read at the next style recalc, by which time the flag is on.
       */
      let pressed = false
      let dragging = false
      /**
       * The PHYSICAL hold: down at pointerdown, up only at the real release.
       * `pressed` ends early when the pointer leaves the control (the gesture
       * settles there), but the picker's hover-close must stand down until the
       * button is up — the card closing mid-hold read as a crash.
       */
      let held = false
      let painted = false
      let pointerId = null
      /** The dash shown when there is no level to name; cached, not re-read per move. */
      let noneLabel = ''
      /** Whether the top-rung treatment (the matrix) is on. */
      let apexOn = false
      /** The track width the ticks were laid out for, so a late layout re-does them. */
      let ticksWidth = -1
      /**
       * The level just committed, and whether the host has echoed it back yet.
       * The host's catalog snapshot TRAILS the commit — its selection RPC is
       * slow (seconds, on some providers) — so between the release and the echo
       * the snapshot still names the OLD level. Following it there would drag
       * the knob back to where the gesture started, then forward again once the
       * echo lands: the "bounce" on release. While this flag is set, update()
       * keeps the knob on the committed level; the echo (or the safety timeout,
       * for a commit that never lands) ends the wait.
       */
      let pendingEcho = false
      let pendingId = void 0
      let pendingTimer = 0
      /** Longest a commit waits for its echo before the host is trusted again.
          Host selections have been measured at up to ~8s on slow providers. */
      const PENDING_ECHO_MS = 12000

      /**
       * The ladder as ordered steps, the step in force, and the words. A model
       * with no reasoning (or one whose catalog entry has not loaded) resolves to
       * an empty ladder: the slider is still shown, it just has nothing to
       * select. The catalog may leave out a default level (`defaultEffort` is
       * undefined) — that "Default" is a real position on the track, so it leads
       * the steps with an undefined id.
       */
      function state() {
        const effort = opts.read()
        const list = []
        let index = -1
        if (effort !== null) {
          if (effort.reasoning.defaultEffort === void 0) list.push({ id: void 0, name: MODEL_EFFORT_DEFAULT })
          for (let i = 0; i < effort.reasoning.efforts.length; i++) {
            list.push({ id: effort.reasoning.efforts[i].id, name: effort.reasoning.efforts[i].name })
          }
          index = 0
          for (let s = 0; s < list.length; s++) {
            if (list[s].id === effort.effective) { index = s; break }
          }
        }
        return {
          steps: list,
          index,
          labels: {
            label: copyLabel('effortLabel', MODEL_EFFORT_LABEL),
            faster: copyLabel('effortFaster', MODEL_EFFORT_FASTER),
            smarter: copyLabel('effortSmarter', MODEL_EFFORT_SMARTER),
            none: MODEL_EFFORT_NONE,
          },
        }
      }

      /** How wide the knob is, and how far its centre may travel. */
      function geometry() {
        const size = knob.offsetWidth || 16
        return { size, span: Math.max(0, track.clientWidth - size) }
      }

      /** The knob's x for one level. No levels (or a single one) rest at the end. */
      function positionFor(index) {
        const box = geometry()
        if (index < 0 || steps.length < 2) return box.span
        return (index / (steps.length - 1)) * box.span
      }

      /**
       * Move the knob. While the gesture runs this is ONE compositor write:
       * the stylesheet already drops `translate` from the transition for
       * `data-dragging`, so an inline transition dance (and the forced reflow
       * it needs to take effect) would be pure overhead on every pointermove.
       * The inline dance survives only for the rare non-drag instant move (a
       * ladder swap on first paint), where the stylesheet's transition would
       * otherwise animate the jump.
       *
       * The travel goes through the INDIVIDUAL `translate` property, never
       * `transform`: the drag lift is `scale`, and the individual properties
       * compose as translate → scale. Writing the travel into `transform` puts
       * it AFTER the scale in the product, so a 1.1 lift would scale the travel
       * itself (see the stylesheet's note on the knob).
       */
      let lastTravel = ''
      let lastWidth = ''

      function place(x, animate) {
        const px = Math.round(x)
        const value = `${px}px`
        /* The fill runs from the track's left end to the knob's centre (+8 is
           half the 16px knob from the stylesheet) and disappears under the
           opaque knob, so its right end is never seen. An empty ladder selects
           nothing, and nothing stays unfilled. */
        const width = steps.length === 0 ? '0px' : `${px + 8}px`
        /* Same-value guard: update() runs on every scheduler pass, and re-writing
           an unchanged position would run the transition dance's forced reflow
           for nothing — worse, mid-glide it cancels the transition and snaps the
           knob to its end. Only a real change touches the DOM. */
        if (value === lastTravel && width === lastWidth) return
        lastTravel = value
        lastWidth = width
        if (animate || dragging) {
          knob.style.translate = value
          fill.style.width = width
          return
        }
        knob.style.transition = 'none'
        fill.style.transition = 'none'
        knob.style.translate = value
        fill.style.width = width
        void knob.offsetWidth
        knob.style.transition = ''
        fill.style.transition = ''
      }

      /** Where the pointer sits along the track, in knob-travel units. */
      function pointerTravel(clientX) {
        const box = geometry()
        const raw = clientX - track.getBoundingClientRect().left - box.size / 2
        return Math.max(0, Math.min(box.span, raw))
      }

      /**
       * How strongly the knob resists leaving a stop, as a fraction of the
       * pointer's speed right at the stop. 0 is pure 1:1 tracking; 0.8 makes the
       * knob creep out of a stop at a FIFTH of the pointer's speed (slope
       * 1 - D at t = 0) and then overtake it mid-segment (slope 1 + D at t = ½,
       * i.e. 1.8×) — a detent you can feel. Must stay below 1: the slope
       * `1 - D·cos(2πt)` would reach zero and the travel would stop being
       * monotone, so the knob could jump backwards.
       */
      const DETENT = 0.8

      /**
       * The detent transfer: raw pointer travel → knob travel. Within one
       * segment the knob lags near the ends and catches up in the middle
       * (`t - D·sin(2πt)/2π`), so leaving a stop feels damped while the middle
       * still tracks the pointer. The curve fixes every stop and every midpoint
       * (t = 0, ½, 1 map to themselves) and is monotone, so `nearest()` may keep
       * reading the RAW position: the knob's nearest stop is the pointer's
       * nearest stop either way. Applied on the pointer paths only — settle and
       * the host echo place the knob on a stop, which the curve already fixes.
       */
      function dampTravel(x) {
        if (steps.length < 2) return x
        const box = geometry()
        if (box.span === 0) return x
        const seg = box.span / (steps.length - 1)
        const index = Math.floor(x / seg)
        if (index >= steps.length - 1) return x
        const t = (x - index * seg) / seg
        return (index + t - DETENT * Math.sin(2 * Math.PI * t) / (2 * Math.PI)) * seg
      }

      /** The level nearest a travel position: the one a release settles on. */
      function nearest(x) {
        if (steps.length === 0) return -1
        if (steps.length === 1) return 0
        const box = geometry()
        const ratio = box.span === 0 ? 0 : x / box.span
        return Math.max(0, Math.min(steps.length - 1, Math.round(ratio * (steps.length - 1))))
      }

      /**
       * The top rung is the slider's showpiece: reaching it (a settled level or
       * a drag's live position alike) swaps the plain fill for the matrix,
       * tints the knob and colours the level's name. Everything hangs off
       * `data-apex`; the guard keeps the attribute writes — which the
       * scheduler's observer sees — to actual transitions.
       */
      function paintApex(at) {
        const want = steps.length > 1 && at === steps.length - 1
        if (want === apexOn) return
        if (want && !dotMatrix.ensure()) return
        apexOn = want
        if (want) root.setAttribute('data-apex', '')
        else root.removeAttribute('data-apex')
      }

      /**
       * One tick dot per stop, centred on the stop's resting position. Rebuilt
       * when the ladder changes or the track's width moved out from under the
       * last layout (first paint can run before the picker has its width).
       * The dots carry no state: the fill they share a colour with swallows
       * the passed ones, and the opaque knob swallows the current one.
       */
      function paintTicks() {
        const w = track.clientWidth
        if (!w || w === ticksWidth) return
        ticksWidth = w
        while (ticks.firstChild) ticks.removeChild(ticks.firstChild)
        const box = geometry()
        for (let i = 0; i < steps.length; i++) {
          const dot = buildElement('span', 'dsh-claude-effort-tick')
          dot.style.left = `${Math.round(positionFor(i) + box.size / 2)}px`
          ticks.appendChild(dot)
        }
      }

      /**
       * Re-arm a stylesheet animation on one element. The reset must be an
       * !important inline: the rules carry !important (they have to, to outrank
       * the host), and a plain inline 'none' loses that cascade — the restart
       * would be a silent no-op.
       */
      function restartAnimation(el) {
        el.style.setProperty('animation', 'none', 'important')
        void el.offsetWidth
        el.style.removeProperty('animation')
      }

      /**
       * The level's name while the gesture runs, the committed one otherwise.
       * Same-value guard: the write runs per frame while dragging, and an
       * identical textContent assignment still replaces the text node — the
       * resulting mutation would feed the scheduler's observer and keep a full
       * pass running every frame.
       *
       * A real change is a SWAP, not a replacement: the outgoing name is copied
       * into the ghost (which sits exactly where the value sat), the ghost blurs
       * away upward, and the value — now carrying the new name — rises out of a
       * blur from below. Both animations are re-armed on every swap, mid-drag
       * included: a slider whose label changes as the knob crosses a stop reads
       * as a rolling counter, which is the point.
       */
      function paintValue() {
        const at = pressed ? live : selected
        const text = at >= 0 && steps[at] ? steps[at].name : noneLabel
        if (valueEl.textContent !== text) {
          const previous = valueEl.textContent
          if (previous !== '') {
            /* Anchor the ghost where the value sits (offsetLeft is measured
               against the positioned head, and the ghost shares that space). */
            valueGhost.textContent = previous
            valueGhost.style.left = `${valueEl.offsetLeft}px`
            restartAnimation(valueGhost)
          }
          valueEl.textContent = text
          restartAnimation(valueEl)
        }
        paintApex(at)
      }

      function paintAria(labels) {
        noneLabel = labels.none
        // Same-value guards throughout: update() runs on every scheduler pass,
        // and an identical write here (in particular the aria-label, which is
        // in the observer's attributeFilter) re-schedules the next pass — a
        // self-sustaining one-pass-per-frame loop.
        if (labelEl.textContent !== labels.label) labelEl.textContent = labels.label
        if (fasterEl.textContent !== labels.faster) fasterEl.textContent = labels.faster
        if (smarterEl.textContent !== labels.smarter) smarterEl.textContent = labels.smarter
        if (track.getAttribute('aria-label') !== labels.label) track.setAttribute('aria-label', labels.label)
        if (steps.length === 0) {
          root.setAttribute('data-empty', '')
          track.setAttribute('aria-disabled', 'true')
          track.removeAttribute('aria-valuemin')
          track.removeAttribute('aria-valuemax')
          track.removeAttribute('aria-valuenow')
          track.removeAttribute('aria-valuetext')
          return
        }
        const at = Math.max(0, selected)
        root.removeAttribute('data-empty')
        track.removeAttribute('aria-disabled')
        track.setAttribute('aria-valuemin', '0')
        track.setAttribute('aria-valuemax', String(steps.length - 1))
        track.setAttribute('aria-valuenow', String(at))
        track.setAttribute('aria-valuetext', steps[at] ? steps[at].name : '')
      }

      /** Drop the wait for the host's echo (echo seen, ladder changed, or timeout). */
      function clearPending() {
        if (pendingTimer !== 0) {
          clearTimeout(pendingTimer)
          pendingTimer = 0
        }
        pendingEcho = false
        pendingId = void 0
      }

      /** Commit one level, once: the host is told only when the level moved. */
      function commit(index) {
        if (index < 0 || index >= steps.length || index === selected) return
        selected = index
        /* Hold the knob here until the host's snapshot agrees (see pendingEcho). */
        pendingEcho = true
        pendingId = steps[index].id
        if (pendingTimer !== 0) clearTimeout(pendingTimer)
        pendingTimer = setTimeout(clearPending, PENDING_ECHO_MS)
        opts.onPick(steps[index].id)
      }

      function releaseCapture() {
        if (pointerId !== null && track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId)
        pointerId = null
      }

      /** The gesture ends: the knob lands on the nearest level and commits it. */
      function settle() {
        if (!pressed) return
        if (moveQueued) {
          // Land the still-pending position first, so the release settles on
          // where the pointer actually is rather than one event behind.
          cancelAnimationFrame(pendingFrame)
          moveQueued = false
          pendingFrame = 0
          applyPending()
          if (!pressed) return
        }
        pressed = false
        dragging = false
        root.removeAttribute('data-dragging')
        releaseCapture()
        const index = live
        live = -1
        /* Commit FIRST, then paint ONCE on the committed level. Painting before
           the commit read the OLD `selected`: the name went back to the level
           the gesture started from (replaying its blur-in), and the apex
           attribute flipped off and on, which hid the matrix and restarted its
           entrance sweep — a visible double take on every release. */
        commit(index)
        place(positionFor(selected), true)
        paintValue()
      }

      /**
       * The physical release, wherever it lands: after a boundary settle the
       * track's own pointerup only arrives while the capture holds, so the end
       * of the hold is heard on the document — capture phase, so a host
       * handler's stopPropagation cannot steal it. This fires BEFORE the
       * track's bubble-phase pointerup (settle), which is safe: the close it
       * may cause only flips data-open, the commit below proceeds regardless.
       */
      function onHeldRelease(e) {
        if (e.pointerId !== pointerId) return
        held = false
        document.removeEventListener('pointerup', onHeldRelease, true)
        document.removeEventListener('pointercancel', onHeldRelease, true)
        if (typeof opts.onDragEnd === 'function') opts.onDragEnd(e)
      }

      function onPointerDown(e) {
        if (e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()
        painted = true
        pointerId = e.pointerId
        held = true
        document.addEventListener('pointerup', onHeldRelease, true)
        document.addEventListener('pointercancel', onHeldRelease, true)
        track.setPointerCapture(e.pointerId)
        if (typeof opts.onDragStart === 'function') opts.onDragStart()
        const x = pointerTravel(e.clientX)
        /* Glide to the press position. The drag state (and with it the
           transition-off flag) only starts on the first MOVE — see the flags'
           note: setting it here would suppress the very transition that makes
           this read as travel. */
        pressed = true
        place(dampTravel(x), true)
        live = nearest(x)
        paintValue()
      }

      /**
       * The gesture's latest pointer position. pointermove fires faster than
       * frames render; the event stores the position and ONE animation-frame
       * callback applies it — reads first (boundary box, travel geometry),
       * writes after (one transform + the level name) — so the drag costs one
       * layout flush per frame instead of one forced reflow per event.
       */
      let pendingFrame = 0
      let moveQueued = false
      let pendingX = 0
      let pendingY = 0

      function applyPending() {
        if (!pressed) return
        const box = root.getBoundingClientRect()
        // Leaving the control ends the gesture where it stands — the knob
        // settles on the nearest level instead of trailing the pointer away.
        if (pendingX < box.left - 6 || pendingX > box.right + 6 || pendingY < box.top - 6 || pendingY > box.bottom + 6) {
          settle()
          return
        }
        const x = pointerTravel(pendingX)
        place(dampTravel(x), false)
        live = nearest(x)
        paintValue()
      }

      function onPointerMove(e) {
        if (!pressed) return
        if (!dragging) {
          // The pointer is moving: the gesture is a drag now, so the knob must
          // follow it without easing.
          dragging = true
          root.setAttribute('data-dragging', '')
        }
        pendingX = e.clientX
        pendingY = e.clientY
        if (moveQueued) return
        moveQueued = true
        pendingFrame = requestAnimationFrame(() => {
          moveQueued = false
          pendingFrame = 0
          applyPending()
        })
      }

      track.addEventListener('pointerdown', onPointerDown)
      track.addEventListener('pointermove', onPointerMove)
      track.addEventListener('pointerup', () => { settle() })
      track.addEventListener('pointercancel', () => { settle() })
      track.addEventListener('keydown', e => {
        if (steps.length === 0) return
        const base = selected < 0 ? 0 : selected
        let next = base
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(0, base - 1)
        else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(steps.length - 1, base + 1)
        else if (e.key === 'Home') next = 0
        else if (e.key === 'End') next = steps.length - 1
        else return
        e.preventDefault()
        e.stopPropagation()
        commit(next)
        place(positionFor(next), true)
        paintAria(state().labels)
        paintValue()
      })

      /**
       * Re-point the control at the model in force. The ladder is rebuilt only
       * when the levels themselves change; the knob is only animated when the
       * selected level moved on its own (the host echoing a selection back).
       */
      function update() {
        const next = state()
        let changed = next.steps.length !== steps.length
        if (!changed) {
          for (let i = 0; i < next.steps.length; i++) {
            if (next.steps[i].id !== steps[i].id) { changed = true; break }
          }
        }
        if (changed) {
          steps = next.steps.slice()
          ticksWidth = -1
          /* A different ladder is a different question; the old commit's echo
             will never come. */
          clearPending()
        }
        /* The echo test: the snapshot now names the level we committed. */
        if (pendingEcho && next.index >= 0 && next.steps[next.index] !== void 0 && next.steps[next.index].id === pendingId) {
          clearPending()
        }
        if (!pressed && !pendingEcho) {
          const moved = painted && !changed && selected !== next.index
          selected = next.index
          place(positionFor(selected), moved)
          painted = true
        }
        paintTicks()
        paintAria(next.labels)
        paintValue()
      }

      return {
        el: root,
        update,
        // The picker's hover-close guard keys on the PHYSICAL hold: from
        // pointerdown until the real release, wherever it lands. `pressed`
        // ends earlier — at the boundary settle — which is exactly when the
        // pointer is on its way out of the card.
        isHeld() { return held },
      }
    }
