    /**
     * Deepy, the pixel whale the DeepSeek brand puts on the composer in the
     * crab's place (src/features/mascot/mascot.js decides which one is out).
     *
     * On the home page it stands on the composer card's top edge, near the
     * right end, like the crab. In a conversation it stands on top of the
     * whole input area — the card and the queue, todo and goal cards stacked
     * above it — and when an approval, a question or a plan review takes the
     * card's place, on top of that panel instead. Only the main conversation
     * carries it; the sidebar's subagent chats do not.
     *
     * What it plays follows the work (src/features/mascot/whale-signals.js),
     * the way Deepy's Clawd on Desk theme maps agent states to animations:
     * idle breathing; thinking while the model reasons or has not answered;
     * typing while it writes or runs tools, headphones when two sessions
     * work at once and a hard hat from three; headphones or conducting its
     * little clones while one or more subagents run; context compaction; the
     * notification bubble while the reader is asked for something; the error
     * shake after a failed tool call or turn; the celebration when a turn or
     * a compaction finishes. The home page reads the whole workspace. Between
     * jobs it looks around or spouts now and then, falls asleep after a quiet
     * minute and wakes up startled at the next pointer move or key press. A
     * click on its face or its tail pokes it, four quick clicks tickle it, and
     * pressing it and pulling lifts it for as long as the press lasts.
     *
     * Each animation is one sheet (DEEPY_SHEETS): the sprite's box and sheet
     * are custom properties on the whale's own node, and a frame change moves
     * the sprite's own background — the `style` attribute, which the
     * scheduler's observer does not watch, so playing never wakes a pass. A
     * sheet loads the first time its animation is wanted; the animation on
     * screen keeps playing until the new sheet is decoded, so a switch never
     * blinks. A reader who asks for reduced motion gets each state's still
     * frame, and the reactions only when they click.
     *
     * @param ctx - client context.
     * @param ui - shared handle table (`ui.composer`).
     * @returns `{ sync, release, onActivity, dispose }`.
     */
    function createMascotWhale(ctx, ui) {
      /** A level state that just took the stage holds it this long against an equal or lower one. */
      const MIN_SHOW_MS = 1000
      /** The quiet spell before the whale dozes off. */
      const SLEEP_AFTER_MS = 60000
      /** The quiet spell between two idle extras. */
      const EXTRA_MIN_MS = 20000
      const EXTRA_SPAN_MS = 20000
      const EXTRAS = ['idle-look', 'idle-spout']
      /** Moments hold for two rounds of their animation, as Clawd's auto-return does. */
      const MOMENTS = {
        error: { state: 'error', animation: 'error', priority: 8, holdMs: 4800 },
        attention: { state: 'attention', animation: 'happy', priority: 5, holdMs: 5200 },
      }
      /** A reaction outranks every state: it answers the reader's own hand. */
      const REACTION_PRIORITY = 10
      /** Clicks this close in a row are one tickle when four of them land. */
      const TICKLE_GAP_MS = 450
      const TICKLE_CLICKS = 4
      /** How far a press travels before it lifts the whale. */
      const LIFT_PX = 4
      /** A marker on the host element the whale stands on, which makes it the whale's containing block. */
      const ANCHOR_ATTR = 'data-dsh-claude-deepy-anchor'

      /** Whether the reader asks the system for reduced motion, as of now. */
      function reducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      }

      let root = null
      let sprite = null
      let anchor = null
      let signals = null
      let alive = true
      /** The followed session id, or null on the home page. */
      let sessionId = null
      let level = null
      /** The moment on screen, and the lesser one that waits for it to end. */
      let moment = null
      let queued = null
      let reaction = null
      let extra = null
      let waking = false
      let asleep = false
      let lastActivity = Date.now()
      let nextExtraAt = 0
      /** The animation on screen: `{ key, mode, priority, start }`. */
      let current = null
      let drawnFrame = -1
      let timer = null
      /** Sheet key → 'loading' | 'ready' | 'failed'. */
      const sheets = new Map()
      let clicks = []
      let press = null

      function sheetUrl(key) {
        return `${DEEPY_ROUTE}${key}.png?v=${BUILD_ID}`
      }

      /**
       * Whether a sheet is ready to paint, starting its load the first time.
       * A sheet that does not load leaves its animation out and says so once:
       * the host half serves the sheets, and one that predates them answers 404.
       */
      function sheetReady(key) {
        const known = sheets.get(key)
        if (known !== undefined) return known === 'ready'
        sheets.set(key, 'loading')
        const image = new Image()
        image.src = sheetUrl(key)
        image.decode().then(() => {
          sheets.set(key, 'ready')
          if (alive && root !== null) step()
        }, () => {
          // The host half did not serve the sheet: the animation stays out.
          sheets.set(key, 'failed')
          console.warn(`[dsh-claude-style] Deepy's "${key}" sheet did not load from ${image.src}; the host half serves it, so restart the host after an update.`)
        })
        return false
      }

      function build() {
        root = buildElement('span', 'dsh-claude-deepy')
        root.setAttribute('aria-hidden', 'true')
        sprite = buildElement('span', 'dsh-claude-deepy-sprite')
        root.appendChild(sprite)
        const hit = buildElement('span', 'dsh-claude-deepy-hit')
        hit.addEventListener('pointerdown', onPressStart)
        hit.addEventListener('pointermove', onPressMove)
        hit.addEventListener('pointerup', onPressEnd)
        hit.addEventListener('pointercancel', onPressCancel)
        // The card a whale stands on can be a button of its own (the home
        // page's "choose a workspace" card): a click on the whale stays here.
        hit.addEventListener('click', event => { event.stopPropagation() })
        root.appendChild(hit)
      }

      /**
       * Where the whale stands on the page shown: the home page's card, or the
       * main conversation's input area (its composer stack, or the panel that
       * takes the card's place). Null when neither is on screen.
       */
      function findStand() {
        const heroCard = ui.composer ? ui.composer.heroCard() : null
        if (heroCard !== null) return { element: heroCard, session: null, place: 'card' }
        if (document.body.hasAttribute('data-dsh-claude-composer-hidden')) return null
        const content = document.querySelector('[data-phase="active"] [data-conversation-session]')
        const seat = content === null ? null : content.querySelector('[data-composer-seat]')
        if (seat === null) return null
        const session = content.getAttribute('data-conversation-session')
        // The composer chain's own wrapper (ui-renderer): the host hides it
        // inline when a panel is elected, and mounts that panel right after it.
        const fallback = seat.querySelector('[data-chain-overlay-fallback="conversation.composer"]')
        if (fallback !== null && fallback.style.display === 'none') {
          const panel = fallback.nextElementSibling
          return panel === null ? null : { element: panel, session, place: 'panel' }
        }
        const stack = seat.querySelector('[class*="composerStack"]')
        return stack === null ? null : { element: stack, session, place: 'stack' }
      }

      function setAnchor(element, place) {
        if (anchor !== null && anchor !== element) anchor.removeAttribute(ANCHOR_ATTR)
        anchor = element
        if (anchor !== null && anchor.getAttribute(ANCHOR_ATTR) !== place) anchor.setAttribute(ANCHOR_ATTR, place)
      }

      /** Each pass: stand where the page puts the whale, follow that page's session, read its state. */
      function sync() {
        const stand = findStand()
        if (stand === null) {
          release()
          return
        }
        if (root === null) build()
        if (signals === null) {
          lastActivity = Date.now()
          signals = createMascotWhaleSignals(ctx, onMoment, refresh)
        }
        if (root.parentNode !== stand.element) stand.element.appendChild(root)
        setAnchor(stand.element, stand.place)
        if (stand.session !== sessionId) {
          sessionId = stand.session
          // A moment belongs to the page it happened on.
          moment = null
          queued = null
        }
        signals.follow(sessionId)
        refresh()
      }

      /** Read the state again and play what it asks for. */
      function refresh() {
        if (signals === null) return
        level = signals.read(sessionId)
        step()
      }

      /**
       * A moment happened. One that outranks the moment on screen (or equals
       * it) takes over now; a lesser one waits its turn — a turn that finishes
       * right after a tool failed still celebrates once the shake is over.
       */
      function onMoment(name) {
        const now = Date.now()
        if (moment !== null && now < moment.until && moment.priority > MOMENTS[name].priority) {
          queued = name
          return
        }
        startMoment(name, now)
        step()
      }

      function startMoment(name, now) {
        const next = MOMENTS[name]
        moment = { state: next.state, animation: next.animation, priority: next.priority, until: now + next.holdMs }
      }

      /** What should be on screen now: `{ key, mode, priority }`. */
      function decide(now) {
        if (moment !== null && now >= moment.until) {
          moment = null
          if (queued !== null) startMoment(queued, now)
          queued = null
        }
        if (reaction !== null) return { key: reaction.key, mode: reaction.mode, priority: REACTION_PRIORITY }
        const held = moment
        const pick = held !== null && held.priority >= level.priority ? held : level
        if (pick.state !== 'idle') {
          asleep = false
          waking = false
          extra = null
          nextExtraAt = 0
          return { key: pick.animation, mode: 'loop', priority: pick.priority }
        }
        if (!asleep && now - lastActivity >= SLEEP_AFTER_MS) {
          asleep = true
          extra = null
        }
        if (asleep) return { key: 'sleeping', mode: 'loop', priority: 1 }
        if (waking) return { key: 'waking', mode: 'once', priority: 1 }
        if (extra === null && !reducedMotion() && !document.hidden) {
          if (nextExtraAt === 0) nextExtraAt = now + EXTRA_MIN_MS + Math.random() * EXTRA_SPAN_MS
          else if (now >= nextExtraAt) extra = EXTRAS[Math.floor(Math.random() * EXTRAS.length)]
        }
        if (extra !== null) return { key: extra, mode: 'once', priority: 1 }
        return { key: 'idle', mode: 'loop', priority: 1 }
      }

      /** A once animation reached its last frame: whoever asked for it lets go. */
      function finish(key, now) {
        if (reaction !== null && reaction.key === key) reaction = null
        if (extra === key) {
          extra = null
          nextExtraAt = now + EXTRA_MIN_MS + Math.random() * EXTRA_SPAN_MS
        }
        if (key === 'waking') waking = false
      }

      /** Whether the reader asks for stillness for what is on screen now. */
      function still() {
        return reducedMotion() && reaction === null
      }

      /**
       * Advance the whale: settle what is on screen, then draw its frame. Runs
       * on the tick, on every state read and whenever a sheet lands.
       */
      function step() {
        if (root === null || level === null) return
        const now = Date.now()
        if (current !== null && current.mode === 'once' && now - current.start >= DEEPY_SHEETS[current.key].frames * DEEPY_FRAME_MS) {
          finish(current.key, now)
        }
        const next = decide(now)
        const switching = current === null || next.key !== current.key
        // A state that just arrived is not pushed off by an equal or lower one
        // within MIN_SHOW_MS, so thinking and typing do not flicker. A reaction
        // gives way the moment it ends.
        const settled = current === null || current.mode !== 'loop' || current.priority === REACTION_PRIORITY ||
          next.priority > current.priority || now - current.start >= MIN_SHOW_MS
        if (switching && settled) {
          if (sheetReady(next.key)) show(next, now)
          // A once animation whose sheet never came counts as played, so the
          // whale does not wait on it for good.
          else if (next.mode === 'once' && sheets.get(next.key) === 'failed') finish(next.key, now)
        }
        if (!document.hidden) draw(now)
        schedule()
      }

      function show(next, now) {
        const sheet = DEEPY_SHEETS[next.key]
        current = { key: next.key, mode: next.mode, priority: next.priority, start: now }
        drawnFrame = -1
        const style = root.style
        style.setProperty('--dsh-claude-deepy-sheet', `url("${sheetUrl(next.key)}")`)
        style.setProperty('--dsh-claude-deepy-x', String(sheet.box[0]))
        style.setProperty('--dsh-claude-deepy-y', String(sheet.box[1]))
        style.setProperty('--dsh-claude-deepy-w', String(sheet.box[2]))
        style.setProperty('--dsh-claude-deepy-h', String(sheet.box[3]))
        if (root.getAttribute('data-animation') !== next.key) root.setAttribute('data-animation', next.key)
      }

      function draw(now) {
        if (current === null) return
        const sheet = DEEPY_SHEETS[current.key]
        let frame = sheet.still
        if (!still()) {
          frame = Math.floor((now - current.start) / DEEPY_FRAME_MS)
          frame = current.mode === 'once' ? Math.min(frame, sheet.frames - 1) : frame % sheet.frames
        }
        if (frame === drawnFrame) return
        drawnFrame = frame
        // The frame moves the sprite's own background, so a frame restyles that
        // one element and nothing around it.
        sprite.style.backgroundPosition = `${(frame % 8) * sheet.box[2] * -2}px ${Math.floor(frame / 8) * sheet.box[3] * -2}px`
        if (!root.hasAttribute('data-ready')) root.setAttribute('data-ready', '')
      }

      /** The next step: one a frame while the whale moves, slower when it holds still or the page is away. */
      function schedule() {
        if (timer !== null) clearTimeout(timer)
        const delay = document.hidden ? 1000 : still() ? 250 : DEEPY_FRAME_MS
        timer = setTimeout(() => {
          timer = null
          step()
        }, delay)
      }

      function react(key, mode) {
        reaction = { key, mode }
        // A reaction always starts from its first frame.
        current = null
        step()
      }

      function onPressStart(event) {
        if (event.button !== 0) return
        press = { id: event.pointerId, x: event.clientX, y: event.clientY, lifted: false }
        event.currentTarget.setPointerCapture(event.pointerId)
      }

      function onPressMove(event) {
        if (press === null || press.lifted || event.pointerId !== press.id) return
        if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < LIFT_PX) return
        press.lifted = true
        clicks = []
        react('drag', 'loop')
      }

      /** A press let go: a lift ends, a click pokes the side it landed on — or tickles, the fourth in a row. */
      function onPressEnd(event) {
        if (press === null || event.pointerId !== press.id) return
        const lifted = press.lifted
        press = null
        if (lifted) {
          reaction = null
          step()
          return
        }
        const now = Date.now()
        if (clicks.length > 0 && now - clicks[clicks.length - 1] > TICKLE_GAP_MS) clicks = []
        clicks.push(now)
        if (clicks.length >= TICKLE_CLICKS) {
          clicks = []
          react('tickle', 'once')
          return
        }
        const box = event.currentTarget.getBoundingClientRect()
        react(event.clientX - box.left < box.width / 2 ? 'poke-left' : 'poke-right', 'once')
      }

      function onPressCancel(event) {
        if (press === null || event.pointerId !== press.id) return
        const lifted = press.lifted
        press = null
        if (lifted) {
          reaction = null
          step()
        }
      }

      /** The reader is at the page: a sleeping whale wakes up, startled unless stillness was asked for. */
      function onActivity() {
        lastActivity = Date.now()
        if (!asleep) return
        asleep = false
        waking = !reducedMotion()
        step()
      }

      /** The page shows no stand: the whale leaves it, and its reading stops. */
      function release() {
        if (timer !== null) clearTimeout(timer)
        timer = null
        if (root !== null && root.parentNode !== null) root.parentNode.removeChild(root)
        setAnchor(null, null)
        if (signals !== null) signals.dispose()
        signals = null
        sessionId = null
        level = null
        moment = null
        queued = null
        reaction = null
        extra = null
        waking = false
        asleep = false
        nextExtraAt = 0
        current = null
        drawnFrame = -1
        press = null
        clicks = []
      }

      function dispose() {
        alive = false
        release()
        root = null
        sprite = null
      }

      return { sync, release, onActivity, dispose }
    }
