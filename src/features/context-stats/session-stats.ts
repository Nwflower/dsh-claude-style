import { observeSize } from '../../core/bus'
import { AUTO_POPOVER_ALL } from '../../constants'
import { conversationSessionId, findComposerStats, findConversationSession } from '../../core/host'
import { COMPOSER_STAT_SELECTOR } from '../../contracts/dom'
import type { HostContext, HostText, HostValue } from '../../core/host'

/** One row of the block: a label and its figure. */
interface StatsRow {
  label: string
  value: string
}
import { copyLabel } from '../../core/i18n'
import { readPrefs } from '../../core/prefs'
import { POPOVER_CLOSE_DELAY, POPOVER_OPEN_DELAY, createHoverIntent, removeStrayNodes } from '../../shared/popover'

/**
 * The session's numbers, read from the host's own projections and shown in
 * the context popover.
 *
 * The composer's stats row is hidden (features/composer/inline-bar.css) and
 * the numbers move into the popover the context meter owns, which opens on
 * hover. They are read as DATA: the host computes `sessionStats` and
 * `tokenUsage` as durable whole-log session projections, and the session
 * face carries their key-addressed read faces (`session.projections.faceOf`)
 * — the same seat the host's own `useProjection` resolves. The host's two
 * stat dialogs are never opened, so nothing is rendered twice, and the block
 * is filled the moment the popover appears (and again on every projection
 * frame while it is open).
 *
 * The WORDS come from the host's own `chat` locale namespace, the one its
 * pills read, so the two surfaces agree letter for letter and follow the
 * shell language together. Three small formatting rules live on top of the
 * raw values (the host applies them in ui-chat before it paints): each is
 * mirrored here and named after its source — formatDuration,
 * formatTokensPerSecond, formatExactTokens and formatCacheHitPercent.
 *
 * @param ctx - client context: the session binding and the locale seat.
 * @returns { sync, close, reposition, teardown }.
 */
export function createSessionStats(ctx: HostContext) {
  /** The mark on the block this feature appends to the host's panel. */
  const CONTEXT_STATS_ATTR = 'data-dsh-claude-context-stats'
  /** The mark on the host's panel itself, which is what takes the entrance. */
  const CONTEXT_PANEL_ATTR = 'data-dsh-claude-context-panel'
  /** The mark on the block while it holds the numbers' place. */
  const CONTEXT_SKELETON_ATTR = 'data-dsh-claude-context-skeleton'
  /** The projections the block reads, in the order its sections appear. */
  const STATS_KEYS = ['sessionStats', 'tokenUsage']
  /** Identity of the bindings THIS generation installed (a hot reload reuses the host's nodes). */
  const statsBindingToken = {}
  /**
   * How long the block may hold the numbers' place.
   *
   * A projection that has not answered yet is what this covers: the block
   * reserves the height it will need, so the panel opens whole. A host that
   * serves no such projection never answers, and the place is given up at
   * this deadline rather than standing there as a lie.
   */
  const STATS_SKELETON_MS = 2000
  /** Rows of each section the placeholder reserves (a session's usual count). */
  const STATS_SKELETON_ROWS = 4
  /** The same, for the compact block: four items in a single 2x2 grid. */
  const COMPACT_SKELETON_ITEMS = 4

  /** The custom property the stylesheet reads to line the panel up with the meter. */
  const CONTEXT_PANEL_LEFT = '--dsh-claude-context-panel-left'
  /** The mark that turns that reading on; written with the property, never without it. */
  const CONTEXT_PANEL_ALIGNED_ATTR = 'data-dsh-claude-context-aligned'
  /** The viewport margin the host keeps for this panel (ui-chat's stat-dialog). */
  const CONTEXT_PANEL_MARGIN = 12
  /**
   * The host's own marks on its three statistics dialogs — the two session
   * pills' and the per-turn token panel's. Their rows are a `dl` as well,
   * so the context panel is told from them by these marks.
   */
  const HOST_STATS_DIALOGS = '[data-session-stats-details], [data-session-stats-usage], [data-turn-usage-details]'

  /** The projection keys this page is following, and how to stop. */
  let watch: { sessionId: string, faces: Record<string, HostValue>, off: (() => void)[] } | null = null
  /** The block's last written content, so an unchanged pass writes nothing. */
  let blockSignature = ''
  /** Whether the block is holding the numbers' place, and since when. */
  let skeleton = false
  let skeletonSince = 0
  /** The timer that gives the place up at the deadline, while one runs. */
  let skeletonTimer: ReturnType<typeof setTimeout> | null = null
  /** The open panel's size watcher, or null before a panel has been seen. */
  let stopPanelSize: (() => void) | null = null

  /**
   * The shown conversation's host session id.
   *
   * Read off the active conversation's own column (features/turn-status
   * does the same): the id names the conversation on screen, which is the
   * composer whose meter opened the popover.
   */
  function shownSessionId() {
    const id = conversationSessionId(findConversationSession())
    return id === null ? '' : id
  }

  /**
   * The host's key-addressed read faces for one session, or null while the
   * session or its projections cannot be reached.
   */
  function statsFaces(sessionId: string) {
    const sessions = ctx.get('sessions')
    const binding = typeof sessions?.binding === 'function' ? sessions.binding(sessionId) : undefined
    const projections = binding?.session?.projections
    if (typeof projections?.faceOf !== 'function') return null
    const faces: Record<string, HostValue> = {}
    for (let i = 0; i < STATS_KEYS.length; i++) faces[STATS_KEYS[i]] = projections.faceOf(STATS_KEYS[i])
    return faces
  }

  /** One projection's current whole value, or undefined while it is absent. */
  function statsValue(key: string): HostValue {
    const face = watch === null ? undefined : watch.faces[key]
    return typeof face?.getSnapshot === 'function' ? face.getSnapshot() : undefined
  }

  /** Stop following the projections (a different session, or the teardown). */
  function releaseWatch() {
    if (watch === null) return
    for (let i = 0; i < watch.off.length; i++) watch.off[i]()
    watch = null
    stopSkeleton()
  }

  /** Give up the numbers' place, if the block is holding it. */
  function stopSkeleton() {
    skeleton = false
    skeletonSince = 0
    if (skeletonTimer !== null) {
    clearTimeout(skeletonTimer)
    skeletonTimer = null
    }
  }

  /**
   * A projection frame landed. The block is the skin's own node inside the
   * host's panel, so it is rewritten here rather than through a pass.
   */
  function onStatsFrame() {
    renderContextStats()
  }

  /**
   * Follow the shown conversation's projections, one subscription per
   * session: a switch releases the old faces and binds the new ones.
   */
  function syncWatch() {
    const sessionId = shownSessionId()
    if (watch !== null && watch.sessionId === sessionId) return
    releaseWatch()
    blockSignature = ''
    if (sessionId === '') return
    const faces = statsFaces(sessionId)
    if (faces === null) return
    const off: (() => void)[] = []
    for (let i = 0; i < STATS_KEYS.length; i++) {
    const face = faces[STATS_KEYS[i]]
    if (typeof face?.subscribe === 'function') off.push(face.subscribe(onStatsFrame))
    }
    watch = { sessionId, faces, off }
  }

  /** The host's `chat` namespace translate seat, or null when it is absent. */
  function chatText(): HostText | null {
    const locale = ctx.get('locale')
    return typeof locale?.bind === 'function' ? locale.bind('chat') : null
  }

  /* ---------- the numbers, in the host's own words ---------- */

  /**
   * Compact duration, mirroring ui-chat's `formatDuration`: tenths of a
   * second under a minute, whole minutes and seconds from there on,
   * through the namespace's own templates.
   */
  function sessionStatsDuration(ms: number, chat: HostText) {
    const seconds = ms / 1_000
    if (seconds < 60) return chat('duration.compactSeconds', { seconds: Math.round(seconds * 10) / 10 })
    const whole = Math.round(seconds)
    return chat('duration.compactMinutes', { minutes: Math.floor(whole / 60), seconds: whole % 60 })
  }

  /** Decode throughput, mirroring ui-chat's `formatTokensPerSecond`. */
  function sessionStatsSpeed(tps: number) {
    const clamped = Math.max(0, tps)
    return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10)
  }

  /** Exact token count with the locale's group separator, mirroring ui-chat's `formatExactTokens`. */
  function sessionStatsGrouped(value: number, chat: HostText) {
    const digits = String(value)
    const groups = []
    for (let end = digits.length; end > 0; end -= 3) groups.unshift(digits.slice(Math.max(0, end - 3), end))
    return groups.join(chat('number.groupSeparator'))
  }

  /** One usage row's reading, as the host writes it: the count template around the grouped number. */
  function sessionStatsTokens(value: number, chat: HostText) {
    return chat('message.turnUsage.count', { count: sessionStatsGrouped(value, chat) })
  }

  /**
   * The largest whole-percent unit a ratio reaches, ties rounded up —
   * ui-chat's `roundedPercentUnits` at its ordinary precision.
   */
  function sessionStatsPercentUnits(cacheReadTokens: number, denominator: number) {
    const scale = 100
    const doubled = scale * 2
    const quotient = Math.floor(denominator / doubled)
    const remainder = denominator % doubled
    let lower = 0
    let upper = scale
    while (lower < upper) {
    const candidate = Math.floor((lower + upper + 1) / 2)
    const factor = candidate * 2 - 1
    const threshold = factor * quotient + Math.ceil(factor * remainder / doubled)
    if (cacheReadTokens >= threshold) lower = candidate
    else upper = candidate - 1
    }
    return lower
  }

  /**
   * Cache-hit share of the prompt side, mirroring ui-chat's
   * `formatCacheHitPercent`: a partial hit never rounds up to 100 — the
   * ordinary precision is one whole percent, and a ratio that would round
   * to 100 takes exactly enough extra decimals to stay below it. Null when
   * nothing was billed.
   */
  function sessionStatsCacheHit(cacheReadTokens: number, promptTokens: number) {
    if (promptTokens === 0) return null
    const missed = promptTokens - cacheReadTokens
    if (missed === 0) return '100'
    const units = sessionStatsPercentUnits(cacheReadTokens, promptTokens)
    if (units < 100) return String(units)
    let places = 1
    let gap = missed * 200
    const tens = Math.floor(promptTokens / 10)
    while (gap <= tens) {
    gap *= 10
    places += 1
    }
    const ones = promptTokens % 10
    let loss = 5
    for (let candidate = 1; candidate < 5; candidate += 1) {
    const factor = candidate * 2 + 1
    if (gap <= factor * tens + Math.floor(factor * ones / 10)) {
      loss = candidate
      break
    }
    }
    return `99.${'9'.repeat(places - 1)}${10 - loss}`
  }

  /**
   * The time and throughput rows, in both widths: the host's own 模型用时
   * and 工具调用用时 while the row is detailed, their sum under the skin's
   * 总用时 while it is compact (the host has no single figure for the time
   * a session has taken). The first-token average and the output speed are
   * the same two rows either way.
   */
  function statsTimeRows(stats: HostValue, chat: HostText, compact: boolean) {
    const rows: StatsRow[] = []
    if (compact) {
    const totalMs = (stats.llmMs > 0 ? stats.llmMs : 0) + (stats.toolMs > 0 ? stats.toolMs : 0)
    if (totalMs > 0) {
      rows.push({ label: copyLabel('contextTotalTime', 'Total time'), value: sessionStatsDuration(totalMs, chat) })
    }
    } else {
    if (stats.llmMs > 0) rows.push({ label: chat('stats.dialog.llmTime'), value: sessionStatsDuration(stats.llmMs, chat) })
    if (stats.toolMs > 0) rows.push({ label: chat('stats.dialog.toolTime'), value: sessionStatsDuration(stats.toolMs, chat) })
    }
    if (stats.ttftSteps > 0) rows.push({ label: chat('stats.dialog.ttft'), value: sessionStatsDuration(stats.ttftMs / stats.ttftSteps, chat) })
    if (stats.decodeMs > 0) {
    rows.push({
      label: chat('stats.dialog.speed'),
      value: chat('message.tokensPerSecond', { tps: sessionStatsSpeed(stats.decodeTokens / (stats.decodeMs / 1_000)) }),
    })
    }
    return rows
  }

  /**
   * The block's sections, with the host's own row rules: a row appears
   * only when its input exists, so a session without tool time or without
   * a recorded first token shows fewer rows rather than zeros, and a
   * session that never billed shows no usage section.
   *
   * `compact` follows the host's statistics row: its compact form carries
   * the output speed and the cache-hit share on the composer line and
   * nothing else, so the usage section keeps only the cache-hit row — the
   * four figures a reader who chose that row still wants.
   */
  function sessionStatsSections(chat: HostText, compact: boolean) {
    const sections: { title: string, rows: StatsRow[] }[] = []
    const stats = statsValue('sessionStats')
    if (compact) {
    const rows: StatsRow[] = []
    if (stats !== undefined && stats !== null) {
      const timeRows = statsTimeRows(stats, chat, true)
      for (let i = 0; i < timeRows.length; i++) rows.push(timeRows[i])
    }
    const usage = statsValue('tokenUsage')
    if (usage !== undefined && usage !== null) {
      const billed = usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
      if (billed > 0 || usage.outputTokens > 0) {
      const hit = sessionStatsCacheHit(usage.cacheReadTokens, billed)
      if (hit !== null) rows.push({ label: chat('message.turnUsage.cacheHit'), value: `${hit}%` })
      }
    }
    if (rows.length > 0) sections.push({ title: '', rows })
    return sections
    }
    if (stats !== undefined && stats !== null) {
    const rows = statsTimeRows(stats, chat, false)
    if (rows.length > 0) sections.push({ title: chat('stats.dialog.title'), rows })
    }
    const usage = statsValue('tokenUsage')
    if (usage !== undefined && usage !== null) {
    const billed = usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
    if (billed > 0 || usage.outputTokens > 0) {
      const rows: StatsRow[] = []
      const hit = sessionStatsCacheHit(usage.cacheReadTokens, billed)
      if (hit !== null) rows.push({ label: chat('message.turnUsage.cacheHit'), value: `${hit}%` })
      rows.push({ label: chat('message.turnUsage.input'), value: sessionStatsTokens(usage.uncachedInputTokens, chat) })
      rows.push({ label: chat('message.turnUsage.cacheRead'), value: sessionStatsTokens(usage.cacheReadTokens, chat) })
      if (usage.cacheWriteTokens !== 0) {
      rows.push({ label: chat('message.turnUsage.cacheWrite'), value: sessionStatsTokens(usage.cacheWriteTokens, chat) })
      }
      rows.push({ label: chat('message.turnUsage.output'), value: sessionStatsTokens(usage.outputTokens, chat) })
      if (rows.length > 0) sections.push({ title: chat('stats.dialog.usageTitle'), rows })
    }
    }
    return sections
  }

  /* ---------- the context popover: what the numbers go into ---------- */

  /**
   * The meter's trigger: the host's own button, whose click opens and
   * closes the context panel. The meter itself is stamped by the composer
   * pass (features/composer/composer.ts), which is also what tells this
   * feature the composer restyle covers the page.
   */
  function contextTrigger() {
    const meter = document.querySelector('[data-dsh-claude-context-meter]')
    return meter === null ? null : meter.querySelector('button')
  }

  /**
   * The host's context panel: the dialog it portals to <body>.
   *
   * A `dl` alone does not name it. The host's three statistics dialogs
   * carry one too, and so does a popover whose content holds one
   * (dsh-better-sidebar's agent node detail, portaled to the same <body>).
   * The three are excluded by the marks on them, and the panel is named by
   * where its rows sit: the host puts the grid directly in the panel, while
   * a popover keeps its `dl` inside the card that paints the surface. The
   * box carrying that card holds the positioning only, and paints nothing,
   * so a walk that stops there writes the numbers onto the page.
   */
  function contextPanel() {
    const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]')
    for (let i = 0; i < dialogs.length; i++) {
    const dialog = dialogs[i]
    if (dialog.getAttribute('aria-modal') === 'true') continue
    if (dialog.querySelector(HOST_STATS_DIALOGS) !== null) continue
    if (dialog.querySelector(':scope > dl') === null) continue
    return dialog
    }
    return null
  }

  /**
   * Take the block and the panel marks off the dialogs a generation before
   * this one wrote them on: a client hot reload drops the previous
   * generation's disposals without running them, so what it left on a node
   * it wrongly took for the panel would stay there for good. The host's
   * panel keeps the block it holds, and the pass that follows fills it.
   */
  function clearStrayContextNodes() {
    const panel = contextPanel()
    const kept = panel === null ? null : panel.querySelector(`[${CONTEXT_STATS_ATTR}]`)
    removeStrayNodes(document, `[${CONTEXT_STATS_ATTR}]`, [kept])
    const marked = document.querySelectorAll(`[${CONTEXT_PANEL_ATTR}]`)
    for (let i = 0; i < marked.length; i++) {
    if (marked[i] === panel) continue
    marked[i].removeAttribute(CONTEXT_PANEL_ATTR)
    marked[i].removeAttribute(CONTEXT_PANEL_ALIGNED_ATTR)
    }
  }

  /**
   * Whether the host rendered its DETAILED statistics row, which is the
   * host's own answer to how much of these numbers it shows: detailed gets
   * the whole set, compact the four figures the compact row leaves out.
   *
   * The host keeps the performanceUsage mode in React state and puts no
   * marker on the DOM, so the two structures have to be told apart by
   * shape. Detailed wraps each pill in an anchor span and makes the
   * dialog-carrying ones buttons; compact renders bare span pills with no
   * trigger and no dialog. The wrapper check catches the detailed pill
   * whose dialog has no rows yet — a static span, not a button. The row is
   * HIDDEN by the stylesheet but still rendered, which is what makes this
   * readable.
   */
  function hostStatsDetailed(root: Element) {
    // The current host marks each figure and leaves the container unmarked; an
    // older one marks the container alone. Detailed reads the same in both: a
    // figure carries the dialog trigger, compact is a bare reading.
    const figures = root.querySelectorAll(COMPOSER_STAT_SELECTOR)
    if (figures.length > 0) {
      for (let i = 0; i < figures.length; i++) {
        if (figures[i].querySelector('button[aria-haspopup="dialog"]') !== null) return true
      }
      return false
    }
    if (root.querySelector('button[aria-haspopup="dialog"]') !== null) return true
    const children = root.children
    for (let i = 0; i < children.length; i++) {
    if (children[i].querySelector('button, span') !== null) return true
    }
    return false
  }

  /** The block this feature keeps at the panel's end, created on first sight. */
  function ensureContextBlock(panel: Element) {
    let block = panel.querySelector(`[${CONTEXT_STATS_ATTR}]`)
    if (block === null) {
    block = document.createElement('div')
    block.className = 'dsh-claude-context-stats'
    block.setAttribute(CONTEXT_STATS_ATTR, '')
    panel.appendChild(block)
    }
    return block
  }

  /** Take the block out of the panel (nothing to show, or the place given up). */
  function removeContextBlock(panel: Element) {
    const block = panel.querySelector(`[${CONTEXT_STATS_ATTR}]`)
    if (block !== null && block.parentElement !== null) block.parentElement.removeChild(block)
    blockSignature = ''
  }

  /**
   * Hold the numbers' place while the projections have answered nothing:
   * the two real headings over bars at a row's own size, so the panel
   * opens at the height the numbers will take. The place is given up at
   * STATS_SKELETON_MS — a host that serves no such projection never
   * answers, and the block then leaves rather than standing there as
   * placeholder bars.
   */
  function renderContextSkeleton(panel: Element, chat: HostText, compact: boolean) {
    if (!skeleton) {
    skeleton = true
    skeletonSince = Date.now()
    }
    const held = Date.now() - skeletonSince
    if (held >= STATS_SKELETON_MS) {
    stopSkeleton()
    removeContextBlock(panel)
    return
    }
    if (skeletonTimer === null) {
    skeletonTimer = setTimeout(() => {
      skeletonTimer = null
      stopSkeleton()
      renderContextStats()
    }, STATS_SKELETON_MS - held)
    }
    let signature = compact ? 'skeleton-compact' : 'skeleton'
    let html = ''
    if (compact) {
    html += '<div class="dsh-claude-context-stats-grid">'
    for (let r = 0; r < COMPACT_SKELETON_ITEMS; r++) {
      html += '<div class="dsh-claude-context-stats-item"><span class="dsh-claude-context-stats-skeleton-label"></span><span class="dsh-claude-context-stats-skeleton-value"></span></div>'
    }
    html += '</div>'
    } else {
    const titles = [chat('stats.dialog.title'), chat('stats.dialog.usageTitle')]
    const counts = [STATS_SKELETON_ROWS, STATS_SKELETON_ROWS]
    for (let i = 0; i < titles.length; i++) {
      signature += `\u0001${titles[i]}`
      html += `<div class="dsh-claude-context-stats-section">${statsEscape(titles[i])}</div><div class="dsh-claude-context-stats-grid">`
      for (let r = 0; r < counts[i]; r++) {
      html += '<div class="dsh-claude-context-stats-item"><span class="dsh-claude-context-stats-skeleton-label"></span><span class="dsh-claude-context-stats-skeleton-value"></span></div>'
      }
      html += '</div>'
    }
    }
    const block = ensureContextBlock(panel)
    if (signature === blockSignature && block.childElementCount > 0) return
    blockSignature = signature
    block.setAttribute(CONTEXT_SKELETON_ATTR, '')
    block.innerHTML = html
  }

  /**
   * Write the numbers into the open panel, or keep the panel as the host
   * drew it while there is nothing to show. A block whose content has not
   * changed is left alone; a block with no sections at all is taken out,
   * so no hairline is left standing over nothing.
   */
  function renderContextStats() {
    const panel = contextPanel()
    if (panel === null) return
    const root = findComposerStats()
    if (root === null) return
    const chat = chatText()
    if (chat === null) return
    const compact = !hostStatsDetailed(root)
    const waiting = statsValue('sessionStats') === undefined && statsValue('tokenUsage') === undefined
    const sections = waiting ? [] : sessionStatsSections(chat, compact)
    if (sections.length === 0) {
    if (waiting) renderContextSkeleton(panel, chat, compact)
    else removeContextBlock(panel)
    return
    }
    stopSkeleton()
    let html = ''
    let signature = compact ? 'compact' : ''
    for (let sIndex = 0; sIndex < sections.length; sIndex++) {
    const section = sections[sIndex]
    if (section.title) {
      signature += `\u0001${section.title}`
      html += `<div class="dsh-claude-context-stats-section">${statsEscape(section.title)}</div>`
    }
    html += '<div class="dsh-claude-context-stats-grid">'
    for (let r = 0; r < section.rows.length; r++) {
      const row = section.rows[r]
      signature += `\u0001${row.label}\u0002${row.value}`
      html += `<div class="dsh-claude-context-stats-item"><div class="dsh-claude-context-stats-label">${statsEscape(row.label)}</div><div class="dsh-claude-context-stats-value">${statsEscape(row.value)}</div></div>`
    }
    html += '</div>'
    }
    const block = ensureContextBlock(panel)
    block.removeAttribute(CONTEXT_SKELETON_ATTR)
    if (signature === blockSignature && block.childElementCount > 0) return
    blockSignature = signature
    block.innerHTML = html
  }

  /**
   * One value as markup. Every string above is either a locale template
   * (numbers substituted in) or a formatted number, and both reach the
   * block as text.
   */
  function statsEscape(value: unknown) {
    return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  }

  /* ---------- hover opens the host's own popover ---------- */

  /**
   * Open the context panel by pressing the host's trigger: the panel, its
   * placement, its dismissal and its keyboard handling all stay the
   * host's. Only the trigger is driven, and only when it is closed.
   */
  function openContextPanel() {
    const trigger = contextTrigger()
    if (trigger === null || trigger.getAttribute('aria-expanded') === 'true') return
    trigger.click()
  }

  /**
   * Close it again, the same way. The panel's own mouseenter cancels this
   * first (hover intent); the `:hover` test is the second net for the
   * frame in which the pointer is already inside a panel the leave event
   * still saw as left.
   */
  function closeContextPanel() {
    const trigger = contextTrigger()
    if (trigger === null || trigger.getAttribute('aria-expanded') !== 'true') return
    const panel = contextPanel()
    if (panel !== null && panel.matches(':hover')) return
    trigger.click()
  }

  const hoverIntent = createHoverIntent(openContextPanel, closeContextPanel, POPOVER_OPEN_DELAY, POPOVER_CLOSE_DELAY)

  /** The hover preference gates both directions, as it does for the skin's other popovers. */
  function hoverEnabled() {
    return readPrefs().autoPopover === AUTO_POPOVER_ALL
  }

  function bindContextMeter(meter: Element) {
    if (meter.__dshContextMeterToken === statsBindingToken) return
    meter.__dshContextMeterToken = statsBindingToken
    meter.addEventListener('mouseenter', () => {
    if (hoverEnabled()) hoverIntent.scheduleOpen()
    })
    meter.addEventListener('mouseleave', () => {
    if (hoverEnabled()) hoverIntent.scheduleClose()
    })
  }

  /**
   * Line the panel's right edge up with the meter's.
   *
   * The panel is the host's and its coordinates are inline: ui-chat places
   * it from the anchor's LEFT edge and only then clamps it into the
   * viewport, which for a trigger at the composer's right end parks the
   * panel against the window's right margin, past the ring. The skin reads
   * the two boxes and hands the stylesheet one left value
   * (features/composer/inline-bar.css), the hand-over the hero menu makes
   * for the menu the host places below its own trigger. The property and
   * the mark are written together, so the rule never runs on a reading
   * that has gone.
   */
  function alignContextPanel(panel: HTMLElement) {
    const meter = document.querySelector('[data-dsh-claude-context-meter]')
    if (meter === null) return
    const anchor = meter.getBoundingClientRect()
    // The panel's own entrance scales it (the cards' 0.98), and a TRANSFORMED
    // rect is two percent narrower than the box that settles: read the
    // layout width, which is the one the panel ends up with.
    const width = panel.offsetWidth
    if (width === 0) return
    const widest = window.innerWidth - width - CONTEXT_PANEL_MARGIN
    const left = Math.round(Math.min(Math.max(anchor.right - width, CONTEXT_PANEL_MARGIN), widest))
    panel.style.setProperty(CONTEXT_PANEL_LEFT, `${left}px`)
    panel.setAttribute(CONTEXT_PANEL_ALIGNED_ATTR, '')
  }

  function bindContextPanel(panel: HTMLElement) {
    if (!panel.hasAttribute(CONTEXT_PANEL_ATTR)) panel.setAttribute(CONTEXT_PANEL_ATTR, '')
    if (panel.__dshContextPanelToken === statsBindingToken) return
    panel.__dshContextPanelToken = statsBindingToken
    panel.addEventListener('mouseenter', () => {
      hoverIntent.cancel()
    })
    panel.addEventListener('mouseleave', () => {
      if (hoverEnabled()) hoverIntent.scheduleClose()
    })
    // The panel's own box is what the reading is taken from, so the reading
    // is re-taken whenever that box changes: the host's rows growing, or
    // the block below them arriving.
    if (stopPanelSize !== null) stopPanelSize()
    stopPanelSize = observeSize(panel, () => {
      const open = contextPanel()
      if (open !== null) alignContextPanel(open)
    })
    alignContextPanel(panel)
  }

  /**
   * A pass over the context popover: follow the shown conversation's
   * projections, then keep the panel's block current while it is open.
   */
  function syncContextPopover() {
    syncWatch()
    const meter = document.querySelector('[data-dsh-claude-context-meter]')
    if (meter !== null) bindContextMeter(meter)
    const panel = contextPanel()
    if (panel === null) return
    bindContextPanel(panel)
    renderContextStats()
  }

  clearStrayContextNodes()

  return {
    /** One pass: keep the panel filled while it is open. */
    sync() {
      syncContextPopover()
    },
    /** Composer focus closes the panel the host's trigger opened. */
    close() {
      hoverIntent.cancel()
      const trigger = contextTrigger()
      if (trigger === null || trigger.getAttribute('aria-expanded') !== 'true') return
      trigger.click()
    },
    /**
     * The viewport moved under the panel: the host re-places it from its
     * anchor, so the skin's own reading of where its right edge belongs
     * is taken again in the same frame.
     */
    reposition(reason: 'viewport' | 'composer') {
      if (reason !== 'viewport') return
      const panel = contextPanel()
      if (panel !== null) alignContextPanel(panel)
    },
    /** Drop the appends, the projection subscriptions and the hover timers. */
    teardown() {
      hoverIntent.cancel()
      releaseWatch()
      if (stopPanelSize !== null) {
        stopPanelSize()
        stopPanelSize = null
      }
      const blocks = document.querySelectorAll(`[${CONTEXT_STATS_ATTR}]`)
      for (let i = 0; i < blocks.length; i++) {
        blocks[i].remove()
      }
      const panels = document.querySelectorAll(`[${CONTEXT_PANEL_ATTR}]`)
      for (let i = 0; i < panels.length; i++) panels[i].removeAttribute(CONTEXT_PANEL_ATTR)
      blockSignature = ''
    }
  }
}
