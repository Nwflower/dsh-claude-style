import { COMPOSER_HIDDEN_ATTR } from '../../constants'
import { COMPOSER_STACK, conversationSessionId, findComposerSeat, findConversationSession } from '../../core/host'
import { motionReduced } from '../../core/prefs'
import { createMascotSignals } from './mascot-signals'
import type { MascotLevel, MascotMoment } from './mascot-signals'
import { buildElement, createStamp, setAttributeIfChanged } from '../../shared/dom'
import type { HostContext } from '../../core/host'
import type { Ui } from '../../core/scheduler'

/** One animation's sheet: its frame count, its crop box `[x, y, width, height]` in logical pixels, and its still frame. */
export interface MascotSheet {
  frames: number
  box: number[]
  still: number
}

/** A character's sheet pipeline: whether a sheet plays, whether it never will, how it is painted. */
export interface MascotSheets {
  ready(key: string): boolean
  failed(key: string): boolean
  paint(style: CSSStyleDeclaration, key: string): void
  dispose(): void
}

/** What one character hands the player (see createMascotPlayer). */
export interface MascotCharacter {
  name: string
  sheets: Record<string, MascotSheet>
  frameMs: number
  gutter?: number
  extras: string[]
  createSheets(onReady: () => void): MascotSheets
}

/** How an animation plays: round and round, or once to its last frame. */
type PlayMode = 'loop' | 'once'

/** What should be on screen (decide). */
interface MascotPick {
  key: string
  mode: PlayMode
  priority: number
}

/** Everything the mascot is doing on the page it stands on (freshStage). */
interface MascotStage {
  sessionId: string | null
  level: MascotLevel | null
  moment: (MascotLevel & { until: number }) | null
  queued: MascotMoment | null
  reaction: { key: string, mode: PlayMode, fresh: boolean } | null
  extra: string | null
  waking: boolean
  asleep: boolean
  quietSince: number
  nextExtraAt: number
  current: (MascotPick & { start: number, done?: boolean }) | null
  animation: Animation | null
  timer: ReturnType<typeof setTimeout> | null
  clicks: number[]
  press: { id: number, x: number, y: number, lifted: boolean } | null
}

/**
 * One mascot on the composer — the crab or Deepy — played from its sheets
 * by the state the agent is in (packages/client/src/features/mascot/mascot-signals.ts).
 *
 * On the home page it stands on the composer card's top edge, near the
 * right end. In a conversation it stands on top of the whole input area —
 * the card and the queue, todo and goal cards stacked above it — and when
 * an approval, a question or a plan review takes the card's place, on top
 * of that panel instead. Only the main conversation carries it; the
 * sidebar's subagent chats do not. The "where it appears" preference can
 * keep it to the home page.
 *
 * What it plays follows the work, the way the Clawd on Desk themes map
 * agent states to animations: idle breathing; thinking while the model
 * reasons or has not answered; typing while it writes or runs tools,
 * headphones when two sessions work at once and a hard hat from three;
 * headphones or conducting while one or more subagents run; context
 * compaction; the notification while the reader is asked for something;
 * the error shake after a failed tool call or turn; the celebration when
 * a turn or a compaction finishes. The home page reads the whole
 * workspace. Between jobs it plays one of the character's idle extras now
 * and then, falls asleep after a quiet minute — no work to show and no
 * pointer move or key press — and wakes up startled at the next pointer
 * move or key press. A click on its left or right half pokes it, four
 * quick clicks tickle it, and pressing it and pulling lifts it for as long
 * as the press lasts.
 *
 * Each animation is one sheet: the sprite's box and sheet are custom
 * properties on the mascot's own node, and a frame change is a translation
 * of the strip inside the sprite's overflow-hidden window, played by the
 * browser's animation engine (WAAPI steps keyframes) — no timer, no DOM
 * mutation, so playing never wakes a pass. The character's sheet pipeline
 * says when a sheet is ready and paints it; the animation on screen keeps
 * playing until the new sheet is ready, so a switch never blinks. A reader
 * who asks for reduced motion gets each state's still frame, and the
 * reactions only when they click.
 *
 * @param ctx - client context.
 * @param ui - shared handle table (`ui.composer`).
 * @param character - `{ name, sheets, frameMs, gutter, extras, createSheets }`:
 *     `name` prefixes the class names, the custom properties and the anchor
 *     mark (`dsh-claude-<name>`); `sheets` is the animation table
 *     (`{ frames, box, still }` per key, every key the signals, moments,
 *     sleep, extras and reactions name); `gutter` the transparent margin
 *     each frame cell carries in the character's sheets, in logical pixels
 *     (absent when they carry none); `extras` the idle extras;
 *     `createSheets(onReady)` returns `{ ready, failed, paint, dispose }`.
 * @returns `{ sync, release, onActivity, dispose }`.
 */
export function createMascotPlayer(ctx: HostContext, ui: Ui, character: MascotCharacter) {
  /** A level state that just took the stage holds it this long against an equal or lower one. */
  const MIN_SHOW_MS = 1000
  /** The quiet spell before the mascot dozes off. */
  const SLEEP_AFTER_MS = 60000
  /** The quiet spell between two idle extras. */
  const EXTRA_MIN_MS = 20000
  const EXTRA_SPAN_MS = 20000
  /** Moments hold for two rounds of their animation, as Clawd's auto-return does. */
  const MOMENTS: Record<MascotMoment, MascotLevel & { holdMs: number }> = {
    error: { state: 'error', animation: 'error', priority: 8, holdMs: 4800 },
    attention: { state: 'attention', animation: 'happy', priority: 5, holdMs: 5200 },
  }
  /** A reaction outranks every state: it answers the reader's own hand. */
  const REACTION_PRIORITY = 10
  /** Clicks this close in a row are one tickle when four of them land. */
  const TICKLE_GAP_MS = 450
  const TICKLE_CLICKS = 4
  /** How far a press travels before it lifts the mascot. */
  const LIFT_PX = 4
  const PREFIX = `dsh-claude-${character.name}`
  /** The transparent margin each frame cell carries in this character's sheets (DEEPY_GUTTER), in logical pixels. */
  const GUTTER = character.gutter ?? 0
  /** A marker on the host element the mascot stands on, which makes it the mascot's containing block. */
  const ANCHOR_ATTR = `data-${PREFIX}-anchor`
  /** The stamp carrying the anchor mark across re-renders. */
  const anchorStamp = createStamp(ANCHOR_ATTR)
  const SHEETS = character.sheets
  const FRAME_MS = character.frameMs

  /** The nodes the mascot is drawn with, built once per generation. */
  let root: HTMLElement | null = null
  let sprite: HTMLElement | null = null
  let strip: HTMLElement | null = null
  /** The signal reader, created when the mascot first stands somewhere. */
  let signals: ReturnType<typeof createMascotSignals> | null = null

  /**
   * Everything the mascot is doing on the page it stands on: the session it
   * follows, the moment on screen and the one waiting its turn, the
   * reaction, the idle extra, the sleep and wake flags, the quiet spell,
   * the animation playing and the reader's own press or click run.
   *
   * One object, replaced whole when the mascot leaves a page: the fields
   * reset together, so none can be forgotten.
   */
  function freshStage(): MascotStage {
    return {
      /** The followed session id, or null on the home page. */
      sessionId: null,
      level: null,
      /** The moment on screen, and the lesser one that waits for it to end. */
      moment: null,
      queued: null,
      reaction: null,
      extra: null,
      waking: false,
      asleep: false,
      /** Where the quiet spell starts: the reader's last pointer move or key, or the mascot's last work. */
      quietSince: Date.now(),
      nextExtraAt: 0,
      /** The animation on screen: `{ key, mode, priority, start, done? }`. */
      current: null,
      /** The WAAPI animation playing on the strip; null while a still frame is pinned. */
      animation: null,
      timer: null,
      clicks: [],
      press: null,
    }
  }
  let stage = freshStage()

  /** The character's sheet pipeline. */
  const sheets = character.createSheets(onSheetReady)

  /** A sheet became playable: read the state again and play what it asks for. */
  function onSheetReady() {
    if (root !== null) step()
  }

  /** @returns the new root; the sprite and the strip are set beside it. */
  function build() {
    const built = buildElement('span', PREFIX)
    built.setAttribute('aria-hidden', 'true')
    sprite = buildElement('span', `${PREFIX}-sprite`)
    strip = buildElement('span', `${PREFIX}-strip`)
    sprite.appendChild(strip)
    built.appendChild(sprite)
    const hit = buildElement('span', `${PREFIX}-hit`)
    hit.addEventListener('pointerdown', onPressStart)
    hit.addEventListener('pointermove', onPressMove)
    hit.addEventListener('pointerup', onPressEnd)
    hit.addEventListener('pointercancel', onPressCancel)
    // The card a mascot stands on can be a button of its own (the home
    // page's "choose a workspace" card): a click on the mascot stays here.
    hit.addEventListener('click', event => { event.stopPropagation() })
    built.appendChild(hit)
    return built
  }

  /**
   * Where the mascot stands on the page shown: the home page's card, or
   * the main conversation's input area (its composer stack, or the panel
   * that takes the card's place) when the conversation is in scope. Null
   * when neither is on screen.
   */
  function findStand(conversation: boolean): { element: Element, session: string | null, place: string } | null {
    const heroCard = ui.composer ? ui.composer.heroCard() : null
    if (heroCard !== null) return { element: heroCard, session: null, place: 'card' }
    if (!conversation) return null
    if (document.body.hasAttribute(COMPOSER_HIDDEN_ATTR)) return null
    const content = findConversationSession()
    const seat = content === null ? null : findComposerSeat(content)
    if (seat === null) return null
    const session = conversationSessionId(content)
    // The composer chain's own wrapper (ui-renderer): the host hides it
    // inline when a panel is elected, and mounts that panel right after it.
    const fallback = seat.querySelector<HTMLElement>('[data-chain-overlay-fallback="conversation.composer"]')
    if (fallback !== null && fallback.style.display === 'none') {
      const panel = fallback.nextElementSibling
      return panel === null ? null : { element: panel, session, place: 'panel' }
    }
    const stack = seat.querySelector(COMPOSER_STACK)
    return stack === null ? null : { element: stack, session, place: 'stack' }
  }

  /**
   * Each pass: stand where the page puts the mascot, follow that page's
   * session, read its state.
   * @param conversation - whether the conversation page is in scope.
   */
  function sync(conversation: boolean) {
    const stand = findStand(conversation)
    if (stand === null) {
      release()
      return
    }
    if (root === null) root = build()
    if (signals === null) {
      stage.quietSince = Date.now()
      signals = createMascotSignals(ctx, onMoment, refresh)
    }
    if (root.parentNode !== stand.element) stand.element.appendChild(root)
    anchorStamp.mark(stand.element, stand.place)
    if (stand.session !== stage.sessionId) {
      stage.sessionId = stand.session
      // A moment belongs to the page it happened on.
      stage.moment = null
      stage.queued = null
    }
    signals.follow(stage.sessionId)
    refresh()
  }

  /** Read the state again and play what it asks for. */
  function refresh() {
    if (signals === null) return
    stage.level = signals.read(stage.sessionId)
    step()
  }

  /**
   * A moment happened. One that outranks the moment on screen (or equals
   * it) takes over now; a lesser one waits its turn — a turn that finishes
   * right after a tool failed still celebrates once the shake is over.
   */
  function onMoment(name: MascotMoment) {
    const now = Date.now()
    if (stage.moment !== null && now < stage.moment.until && stage.moment.priority > MOMENTS[name].priority) {
      stage.queued = name
      return
    }
    startMoment(name, now)
    step()
  }

  function startMoment(name: MascotMoment, now: number) {
    const next = MOMENTS[name]
    stage.moment = { state: next.state, animation: next.animation, priority: next.priority, until: now + next.holdMs }
  }

  /** What should be on screen now: `{ key, mode, priority }`. */
  function decide(now: number, level: MascotLevel): MascotPick {
    if (stage.moment !== null && now >= stage.moment.until) {
      stage.moment = null
      if (stage.queued !== null) startMoment(stage.queued, now)
      stage.queued = null
    }
    if (stage.reaction !== null) return { key: stage.reaction.key, mode: stage.reaction.mode, priority: REACTION_PRIORITY }
    const held = stage.moment
    const pick = held !== null && held.priority >= level.priority ? held : level
    if (pick.state !== 'idle') {
      stage.asleep = false
      stage.waking = false
      stage.extra = null
      stage.nextExtraAt = 0
      // Work on screen is no quiet spell: the minute to sleep starts when it ends.
      stage.quietSince = now
      return { key: pick.animation, mode: 'loop', priority: pick.priority }
    }
    if (!stage.asleep && now - stage.quietSince >= SLEEP_AFTER_MS) {
      stage.asleep = true
      stage.extra = null
    }
    if (stage.asleep) return { key: 'sleeping', mode: 'loop', priority: 1 }
    if (stage.waking) return { key: 'waking', mode: 'once', priority: 1 }
    if (stage.extra === null && !motionReduced() && !document.hidden) {
      if (stage.nextExtraAt === 0) stage.nextExtraAt = now + EXTRA_MIN_MS + Math.random() * EXTRA_SPAN_MS
      else if (now >= stage.nextExtraAt) stage.extra = character.extras[Math.floor(Math.random() * character.extras.length)]
    }
    if (stage.extra !== null) return { key: stage.extra, mode: 'once', priority: 1 }
    return { key: 'idle', mode: 'loop', priority: 1 }
  }

  /** A once animation reached its last frame: whoever asked for it lets go. */
  function finish(key: string, now: number) {
    // A fresh reaction has not played yet: the one ending is its predecessor.
    if (stage.reaction !== null && stage.reaction.key === key && !stage.reaction.fresh) stage.reaction = null
    if (stage.extra === key) {
      stage.extra = null
      stage.nextExtraAt = now + EXTRA_MIN_MS + Math.random() * EXTRA_SPAN_MS
    }
    if (key === 'waking') stage.waking = false
  }

  /** Whether the animation choice holds what is on screen now still. */
  function still() {
    return motionReduced() && stage.reaction === null
  }

  /** One frame cell of a sheet: the crop box plus the transparent margin around it. */
  function cellSize(sheet: MascotSheet) {
    return [sheet.box[2] + GUTTER * 2, sheet.box[3] + GUTTER * 2]
  }

  /** The strip translation that puts one frame of a sheet in the window. */
  function frameOffset(sheet: MascotSheet, frame: number) {
    const [cellWidth, cellHeight] = cellSize(sheet)
    return `translate(${-((frame % 8) * cellWidth + GUTTER) * 2}px, ${-(Math.floor(frame / 8) * cellHeight + GUTTER) * 2}px)`
  }

  /**
   * Put an animation on the strip: a WAAPI animation whose keyframes hold
   * each frame for the character's frame time (steps(1) jumps at the
   * slot's end), so a loop runs entirely on the browser's animation engine
   * with no tick of the mascot's own; or the state's still frame, pinned
   * while the motion choice says so. A once animation's end is reported by
   * its `finished`; the deadline schedule() arms is the backstop for a
   * throttled tab.
   */
  function play(strip: HTMLElement, key: string, mode: PlayMode) {
    if (stage.animation !== null) {
      stage.animation.cancel()
      stage.animation = null
    }
    const sheet = SHEETS[key]
    if (still()) {
      strip.style.transform = frameOffset(sheet, sheet.still)
      return
    }
    strip.style.transform = ''
    const keyframes: Keyframe[] = []
    for (let frame = 0; frame < sheet.frames; frame++) {
      keyframes.push({ offset: frame / sheet.frames, transform: frameOffset(sheet, frame), easing: 'steps(1)' })
    }
    keyframes.push({ offset: 1, transform: frameOffset(sheet, mode === 'loop' ? 0 : sheet.frames - 1) })
    const playing = strip.animate(keyframes, {
      duration: sheet.frames * FRAME_MS,
      iterations: mode === 'loop' ? Infinity : 1,
      fill: 'forwards',
    })
    stage.animation = playing
    if (mode !== 'once') return
    playing.finished.then(() => {
      if (stage.animation !== playing || stage.current === null || stage.current.key !== key || stage.current.done === true) return
      stage.current.done = true
      finish(key, Date.now())
      step()
    }, () => {
      // finished rejects on cancel(): a newer animation took the strip.
    })
  }

  /**
   * Advance the mascot: settle what is on screen, then arm the one timer
   * at the next moment a time-based decision can flip. Runs on state
   * reads, sheet arrivals, reactions, the reader's hand and that timer —
   * playing itself needs no tick (play()).
   */
  function step() {
    if (root === null || strip === null || stage.level === null) return
    const now = Date.now()
    if (stage.current !== null && stage.current.mode === 'once' && stage.current.done !== true && now - stage.current.start >= SHEETS[stage.current.key].frames * FRAME_MS) {
      stage.current.done = true
      finish(stage.current.key, now)
    }
    const next = decide(now, stage.level)
    const switching = stage.current === null || next.key !== stage.current.key || (stage.reaction !== null && stage.reaction.fresh)
    // A state that just arrived is not pushed off by an equal or lower one
    // within MIN_SHOW_MS, so thinking and typing do not flicker. A reaction
    // gives way the moment it ends.
    const settled = stage.current === null || stage.current.mode !== 'loop' || stage.current.priority === REACTION_PRIORITY ||
      next.priority > stage.current.priority || now - stage.current.start >= MIN_SHOW_MS
    if (switching && settled) {
      if (sheets.ready(next.key)) show(root, strip, next, now)
      // A once animation whose sheet never came counts as played, so the
      // mascot does not wait on it for good.
      else if (next.mode === 'once' && sheets.failed(next.key)) {
        if (stage.reaction !== null) stage.reaction.fresh = false
        finish(next.key, now)
      }
    } else if (!switching && stage.current !== null) {
      // The motion choice flipped under the animation on stage: pin its
      // still frame, or set it playing again from where it stands.
      if (still() && stage.animation !== null) {
        stage.animation.cancel()
        stage.animation = null
        strip.style.transform = frameOffset(SHEETS[stage.current.key], SHEETS[stage.current.key].still)
      } else if (!still() && stage.animation === null) {
        play(strip, stage.current.key, stage.current.mode)
        // play() put the new animation on the stage.
        const playing = stage.animation as Animation | null
        if (playing !== null && stage.current.mode === 'loop') {
          playing.currentTime = (now - stage.current.start) % (SHEETS[stage.current.key].frames * FRAME_MS)
        }
      }
    }
    schedule(now, switching && !settled)
  }

  function show(root: HTMLElement, strip: HTMLElement, next: MascotPick, now: number) {
    const sheet = SHEETS[next.key]
    const [cellWidth, cellHeight] = cellSize(sheet)
    stage.current = { key: next.key, mode: next.mode, priority: next.priority, start: now }
    if (stage.reaction !== null && stage.reaction.key === next.key) stage.reaction.fresh = false
    const style = root.style
    sheets.paint(style, next.key)
    style.setProperty(`--${PREFIX}-x`, String(sheet.box[0]))
    style.setProperty(`--${PREFIX}-y`, String(sheet.box[1]))
    style.setProperty(`--${PREFIX}-w`, String(sheet.box[2]))
    style.setProperty(`--${PREFIX}-h`, String(sheet.box[3]))
    style.setProperty(`--${PREFIX}-cell-w`, String(cellWidth))
    style.setProperty(`--${PREFIX}-strip-h`, String(cellHeight * Math.ceil(sheet.frames / 8)))
    setAttributeIfChanged(root, 'data-animation', next.key)
    play(strip, next.key, next.mode)
    if (!root.hasAttribute('data-ready')) root.setAttribute('data-ready', '')
  }

  /**
   * The one timer: the next moment a time-based decision can flip — a
   * moment's hold ending, a deferred switch settling, a once animation's
   * last frame (backstop for its `finished`), the quiet minute to sleep,
   * the next idle extra. Everything else arrives as an event.
   */
  function schedule(now: number, waitSettle: boolean) {
    if (stage.timer !== null) clearTimeout(stage.timer)
    stage.timer = null
    let at = Infinity
    if (stage.moment !== null) at = Math.min(at, stage.moment.until)
    if (waitSettle && stage.current !== null) at = Math.min(at, stage.current.start + MIN_SHOW_MS)
    if (stage.current !== null && stage.current.mode === 'once' && stage.current.done !== true) {
      at = Math.min(at, stage.current.start + SHEETS[stage.current.key].frames * FRAME_MS)
    }
    if (!stage.asleep && stage.level !== null && stage.level.state === 'idle') at = Math.min(at, stage.quietSince + SLEEP_AFTER_MS)
    if (stage.extra === null && stage.nextExtraAt > now) at = Math.min(at, stage.nextExtraAt)
    if (at === Infinity) return
    stage.timer = setTimeout(() => {
      stage.timer = null
      step()
    }, Math.max(at - now, 0))
  }

  /**
   * The reader's hand on the mascot. A reaction always starts from its
   * first frame (`fresh` until it is shown, even over the same reaction
   * still on screen); until its sheet is ready, what is on screen keeps
   * playing.
   */
  function react(key: string, mode: PlayMode) {
    stage.reaction = { key, mode, fresh: true }
    step()
  }

  function onPressStart(event: PointerEvent) {
    if (event.button !== 0) return
    stage.press = { id: event.pointerId, x: event.clientX, y: event.clientY, lifted: false }
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
  }

  function onPressMove(event: PointerEvent) {
    if (stage.press === null || stage.press.lifted || event.pointerId !== stage.press.id) return
    if (Math.hypot(event.clientX - stage.press.x, event.clientY - stage.press.y) < LIFT_PX) return
    stage.press.lifted = true
    stage.clicks = []
    react('drag', 'loop')
  }

  /** A press let go: a lift ends, a click pokes the side it landed on — or tickles, the fourth in a row. */
  function onPressEnd(event: PointerEvent) {
    if (stage.press === null || event.pointerId !== stage.press.id) return
    const lifted = stage.press.lifted
    stage.press = null
    if (lifted) {
      stage.reaction = null
      step()
      return
    }
    const now = Date.now()
    if (stage.clicks.length > 0 && now - stage.clicks[stage.clicks.length - 1] > TICKLE_GAP_MS) stage.clicks = []
    stage.clicks.push(now)
    if (stage.clicks.length >= TICKLE_CLICKS) {
      stage.clicks = []
      react('tickle', 'once')
      return
    }
    const box = (event.currentTarget as Element).getBoundingClientRect()
    react(event.clientX - box.left < box.width / 2 ? 'poke-left' : 'poke-right', 'once')
  }

  function onPressCancel(event: PointerEvent) {
    if (stage.press === null || event.pointerId !== stage.press.id) return
    const lifted = stage.press.lifted
    stage.press = null
    if (lifted) {
      stage.reaction = null
      step()
    }
  }

  /**
   * The reader is at the page: a sleeping mascot wakes up, startled unless
   * stillness was asked for. The hook fires once at the wake (a quiet
   * reader's pointer sweep only rewrites quietSince), so the scheduler's
   * pointer and key paths stay cheap.
   */
  function onActivity() {
    stage.quietSince = Date.now()
    if (!stage.asleep) return
    stage.asleep = false
    stage.waking = !motionReduced()
    step()
  }

  /** The page shows no stand: the mascot leaves it, and its reading stops. */
  function release() {
    if (stage.timer !== null) clearTimeout(stage.timer)
    if (stage.animation !== null) stage.animation.cancel()
    if (root !== null && root.parentNode !== null) root.parentNode.removeChild(root)
    anchorStamp.release()
    if (signals !== null) signals.dispose()
    signals = null
    // One replacement for every field the page owned.
    stage = freshStage()
  }

  function dispose() {
    release()
    sheets.dispose()
    root = null
    sprite = null
    strip = null
  }

  return { sync, release, onActivity, dispose }
}
