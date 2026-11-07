import { conversationSessionId, findConversationSession, hostSessions } from '@dsh-claude-style/engine/host'
import { hostChatSeat } from '../../core/i18n'
import { prefsFromForm, readPrefs } from '../../core/prefs'
import { peerPresent } from '../../shared/peer-plugin'
import { BILLING_OFF, CONTEXT_DISPLAY_PIE, CONTEXT_DISPLAY_RING_BAND, STATS_POSITION_FOOTER, STATS_POSITION_INLINE } from '../../constants'
import { createContextStatsBinding } from './stats-binding'
import { createInlineStats } from './inline-stats'
import { createStatsBlock } from './stats-block'
import { createStreamEstimate } from './stream-estimate'
import { adoptBillingRows, billingRows, createSessionCost, loadPrices, priceDocument, priceGeneration } from './session-cost'
import { noteUnpricedModel } from './billing-editor'
import { paintContextPie, readPieColours, releaseContextPie } from './context-meter-pie'
import { CONTEXT_STATS_ATTR, CONTEXT_PANEL_ATTR, clearStrayContextNodes, contextMeters, contextPanel, findContextMeter, markContextMeter, meterOccupancy, releaseCardWatch, releaseDialogWatch } from './stats-panel'
import { CONTEXT_STOPS, rampPosition, writeRamp } from './stats-ramp'
import { writeContextBand } from './context-meter-face'
import { priceFor, priceTierAt } from '@dsh-claude-style/contracts/prices'
import { overlayBilling } from '@dsh-claude-style/contracts/billing-table'
import type { Currency } from '@dsh-claude-style/contracts/prices'
import type { HostContext, HostText } from '@dsh-claude-style/engine/host'
import type { HostContextPressureProjection, HostSessionStatsProjection, HostSnapshotSource, HostTokenUsageProjection } from '@dsh-claude-style/contracts/services'
import type { StatsReading } from './stats-count'
import type { PieColours } from './context-meter-pie'

/** The shown session's cost in micro units, in the currency billing follows. */
export interface SessionCostReading {
  cost: number | null
  currency: Currency
  pending: boolean
}

/** The ring the composer row carries, as the statistics read it (meter-ring.ts). */
export interface MeterRingFace {
  root(): HTMLElement | null
  roots(): HTMLElement[]
  setReading(percent: number | null): void
}

/**
 * The occupancy a context-pressure projection carries, as the host's own meter
 * reads it, or null while it names no window.
 */
function pressureOccupancy(pressure: HostContextPressureProjection | null) {
  const used = pressure?.projectedTokens ?? pressure?.pressureTokens
  const window = pressure?.contextWindow
  if (used === undefined || window === undefined || window <= 0) return null
  return Math.min(100, Math.round(used / window * 100))
}

/**
 * The session's numbers, read from the host's own projections
 *
 * Where they show follows the `statsPosition` choice: `context` hides the
 * composer's statistics row and moves the numbers into the popover the context
 * meter owns (features/composer/inline-bar.css), while `inline` leaves the host
 * row hidden too and writes them onto a line of its own under the card, with
 * the meter at that line's end. The choice is read on every pass, so switching
 * it moves the numbers without a reload. The panel carries the rows in both
 * positions: with the numbers on their own line, that line is the panel's
 * second trigger, so the figures expand into the rows a reader asks for.
 *
 * They are read as DATA: the host computes `sessionStats`, `tokenUsage` and
 * `contextPressure` as durable whole-log session projections, and the session
 * face carries their key-addressed read faces (`session.projections.faceOf`) —
 * the same seat the host's own `useProjection` resolves. The host's two stat
 * dialogs are never opened, so nothing is rendered twice, and both surfaces are
 * filled the moment they appear (and again on every projection frame). The
 * written-back figure carries an estimate of the text streaming now
 * (stream-estimate.ts): the host settles a step's usage at its end, so without
 * it that figure would stand still through the answer.
 *
 * The WORDS come from the host's own `chat` locale namespace, the one its
 * pills read, so the three surfaces agree letter for letter and follow the
 * shell language together; the formatting rules the host applies before it
 * paints are mirrored in stats-format.ts. The meter's own reading takes the
 * occupancy colour band (stats-ramp.ts).
 *
 * The projections are followed here, the rows and sections are built in
 * stats-model.ts, the host's panel and its marks are read in stats-panel.ts,
 * the popover block is written in stats-block.ts, the line of its own in
 * inline-stats.ts, the ring the composer row carries in meter-ring.ts, and the
 * hover path and the alignment reading in stats-binding.ts.
 *
 * @param ctx - client context: the session binding and the locale seat.
 * @param ring - the ring the composer row carries (ui.meterRing), while the
 *   feature that draws it is installed.
 * @returns { measure, sync, close, sessionCost, onSessionCost, reposition, teardown }.
 */
export function createSessionStats(ctx: HostContext, ring: () => MeterRingFace | null) {
  /** The projections the reading follows: the figures, the route the cost prices at, and the meter's share. */
  const STATS_KEYS = ['sessionStats', 'tokenUsage', 'modelSelection', 'contextPressure']

  /**
   * How long the line stands without a reading across a session switch. The new
   * session's faces usually answer within a frame or two; the hold covers the
   * host's own re-render on the way, and gives up rather than leave stale
   * figures standing.
   */
  const SWITCH_HOLD_MS = 800

  /** The projection keys this page is following, and how to stop. */
  let watch: { sessionId: string, faces: Record<string, HostSnapshotSource<unknown>>, off: (() => void)[] } | null = null

  /**
   * The shown conversation's host session id.
   *
   * Read off the active conversation's own column (features/chat-wait
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
    const sessions = hostSessions(ctx)
    const binding = typeof sessions?.binding === 'function' ? sessions.binding(sessionId) : undefined
    const projections = binding?.session?.projections
    if (typeof projections?.faceOf !== 'function') return null
    const faces: Record<string, HostSnapshotSource<unknown>> = {}
    for (let i = 0; i < STATS_KEYS.length; i++) faces[STATS_KEYS[i]] = projections.faceOf(STATS_KEYS[i])
    return faces
  }

  /** The estimate of the text streaming now, riding on the settled written-back total. */
  const estimate = createStreamEstimate()
  estimate.watch()

  /** The settled cost the host priced, and the table the estimate ticks by. */
  const cost = createSessionCost()

  /** The session's route from the host's model-selection projection. */
  interface ModelSelection {
    next?: { model?: string }
    lastUsed?: { model?: string }
  }

  /** The host's `chat` namespace translate seat, or null when it is absent (core/i18n). */
  function chatText(): HostText | null {
    return hostChatSeat(ctx)
  }

  /** Which official price table the reader chose, or null when billing is off. */
  function currency(): Currency | null {
    const choice = readPrefs().billingCurrency
    return choice === BILLING_OFF ? null : choice
  }

  /**
   * Whether the billing choice is the reader's own yet.
   *
   * The settings form answers a moment after the page's first pass, and until
   * it does the table's default says CNY. Asking then would fetch a price table
   * and a session's total for a reader who turned billing off; the form's
   * arrival runs a pass of its own, which is where the first ask belongs. A
   * host that never binds the form loses nothing: after a short wait the
   * default is the only answer there is.
   */
  const billingSettledAt = Date.now() + 2000
  function billingChosen(): boolean {
    return prefsFromForm() || Date.now() >= billingSettledAt
  }

  /** One projection's current whole value, with no stream estimate added. */
  function faceValue<Value>(key: string): Value | undefined {
    const face = watch === null ? undefined : watch.faces[key]
    if (typeof face?.getSnapshot !== 'function') return undefined
    return face.getSnapshot() as Value | undefined
  }

  /**
   * What the session has cost so far, in micro units, and whether the figure is
   * still being fetched.
   *
   * The amount is the host's settled total plus the tokens the streaming answer
   * has grown by, priced at the output rate in force now. `pending` is true only
   * while something is still coming — the host's answer or the price table — so
   * the line can hold the segment's width with a dash. A route the table does
   * not price is not pending: it answers null and the segment goes.
   */
  function costOfReading(usage: HostTokenUsageProjection | null, grown: number, currency: Currency, selection: ModelSelection | undefined): { cost: number | null, pending: boolean } {
    const answered = cost.value()
    if (answered === null) return { cost: null, pending: true }
    if (usage === null) return { cost: null, pending: false }
    // The host names the route the last settlement was billed at; the
    // selection projection is the fallback for a session that has not settled
    // yet, and it is not always served.
    const model = answered.model ?? selection?.lastUsed?.model ?? selection?.next?.model
    const document = priceDocument()
    if (document === null) return { cost: null, pending: true }
    if (model === null || model === undefined) return { cost: null, pending: false }
    const price = priceFor(document, model, currency)
    // The reader's own rows answer over the table for the answer still coming
    // (billing-table.ts), in the currency they were written in.
    const table = price === undefined ? undefined : priceTierAt(price, Date.now(), document.schedule)
    const tier = readPrefs().billingCurrency === currency ? overlayBilling(billingRows(), model, table) : table
    if (tier === undefined) {
      // A route neither the tables nor the reader's rows answer: offered to the
      // custom table's editor as a row to fill (billing-editor.ts).
      noteUnpricedModel(model)
      return { cost: null, pending: false }
    }
    const settled = currency === 'CNY' ? answered.cny : answered.usd
    return { cost: settled + grown * tier.output, pending: false }
  }

  /** The whole reading, with the stream's estimate on both the usage and the cost. */
  function readReading(): StatsReading {
    const stats = faceValue<HostSessionStatsProjection>('sessionStats') ?? null
    const raw = faceValue<HostTokenUsageProjection>('tokenUsage') ?? null
    // The route the estimate's own multiplier is bound to: the model the last
    // settlement was billed at, or the one the picker holds before the first.
    const selection = faceValue<ModelSelection>('modelSelection')
    const model = selection?.lastUsed?.model ?? selection?.next?.model ?? null
    let usage: HostTokenUsageProjection | null = raw
    let grown = 0
    if (raw !== null) {
      estimate.settle(raw.outputTokens, model)
      grown = estimate.tokens(model)
      if (grown > 0) usage = { ...raw, outputTokens: Math.round(raw.outputTokens + grown) }
    }
    const billing = currency()
    syncBillingRows()
    const priced = billing === null ? { cost: null, pending: false } : costOfReading(usage, grown, billing, selection)
    return { stats, usage, cost: priced.cost, billing: billing !== null, costPending: priced.pending }
  }

  /** One reading per pass, so the block and the line price the same frame the same way. */
  let readingMemo: StatsReading | null = null
  function reading(): StatsReading {
    readingMemo ??= readReading()
    return readingMemo
  }

  const block = createStatsBlock(reading, chatText, currency)
  const inline = createInlineStats(reading, chatText, findContextMeter, currency)
  const binding = createContextStatsBinding(() => ring()?.root() ?? null)

  /**
   * A settled total landed. The figures on screen were priced from the previous
   * one, so the reading is taken again and both surfaces are written once more
   * — the count they are on is the same, so the new figure travels from where
   * the old one stands rather than jumping (stats-count.ts).
   */
  const offCost = cost.onChange(() => {
    readingMemo = null
    renderNumbers()
  })

  /** The pie's colours this frame's read phase took, until the pass's sync uses them. */
  let pieColours: PieColours | null = null

  /** Stop following the projections (a different session, or the teardown). */
  function releaseWatch() {
    if (watch !== null) {
      for (let i = 0; i < watch.off.length; i++) watch.off[i]()
      watch = null
    }
    // The stream's estimate belongs to the session it was read from; the next
    // session counts its own text from a fresh baseline (stream-estimate.ts).
    estimate.reset()
    // The settled cost and the reading belong to the session they were read
    // from; the next one starts from its own.
    cost.follow('')
    readingMemo = null
    // The skeleton's wait holds the panel's place, not the session's: it goes
    // whether a session was ever bound or not (stats-block.ts). The line keeps
    // the numbers it is showing: another session's readings are counted to
    // from them (stats-count.ts).
    block.stopSkeleton()
  }

  /**
   * Write the numbers onto whichever surface the position names. The host's
   * panel carries the rows in BOTH positions: with the numbers on a line of
   * their own, that panel is what the line opens (stats-binding.ts), so the
   * line's figures and the panel's rows stay the same session's numbers.
   */
  function renderNumbers() {
    readingMemo = null
    const position = readPrefs().statsPosition
    if (position === STATS_POSITION_INLINE || position === STATS_POSITION_FOOTER) inline.render()
    else inline.clear()
    block.render()
    for (const listener of costListeners) listener()
  }

  /** Who reads the session's cost outside the two surfaces (the mascot's bubble), told whenever they are rewritten. */
  const costListeners = new Set<() => void>()

  /**
   * The shown session's cost as the two surfaces print it, or null when no
   * session is followed or billing is off. `cost` is null while pending, and
   * also for a route nothing prices (then `pending` is false).
   */
  function sessionCost(): SessionCostReading | null {
    const billing = currency()
    if (watch === null || billing === null) return null
    const read = reading()
    return { cost: read.cost, currency: billing, pending: read.costPending }
  }

  /**
   * A projection frame landed. Both surfaces are the skin's own nodes — the
   * block inside the host's panel, the line beside the host's statistics row —
   * so they are rewritten here rather than through a pass.
   */
  function onStatsFrame() {
    // A settlement is what moves the settled cost. The ask is throttled like a
    // pass's own: several projections can change on one settlement, and with
    // billing off there is nothing to ask for.
    if (billingChosen() && currency() !== null) cost.ask(Date.now())
    renderNumbers()
  }

  /**
   * Hand the reader's own price rows to the cost ask (billing-table.ts). The
   * rows are the page's preferences and the currency is the table they were
   * written in; a row that moved re-prices the sessions already asked about, so
   * an edit shows at once instead of after the next settlement.
   */
  function syncBillingRows() {
    const choice = readPrefs().billingCurrency
    const currencyCode = choice === BILLING_OFF ? null : choice
    if (adoptBillingRows(readPrefs().billingTable, currencyCode) && currencyCode !== null) cost.ask(Date.now(), true)
  }

  /**
   * Follow the shown conversation's projections, one subscription per
   * session: a switch releases the old faces and binds the new ones.
   */
  function syncWatch() {
    const sessionId = shownSessionId()
    if (watch !== null && watch.sessionId === sessionId) return
    // The old session's faces go before the new ones answer, and the host
    // re-renders the row the line stands beside: the line keeps its place for
    // a moment instead of folding and unfolding the composer's bottom line.
    if (watch !== null) inline.hold(SWITCH_HOLD_MS)
    releaseWatch()
    block.resetContent()
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

  /**
   * A pass over the session's numbers: follow the shown conversation's
   * projections, paint the meter's own reading, then keep whichever surface
   * the position names current.
   */
  function syncNumbers() {
    syncWatch()
    cost.follow(watch?.sessionId ?? '')
    // With billing off nothing is priced and nothing is asked: the price table,
    // the session's total and the host route behind it stay untouched.
    if (billingChosen() && currency() !== null) {
      // A table that arrives after the page's first pass re-prices everything:
      // the host clears its totals on the swap, so its settled figure is asked
      // for again before the new rate is drawn. The pass itself never waits on
      // the fetch — the figures of this frame are drawn from what is in hand.
      const before = priceGeneration()
      void loadPrices(Date.now()).then(() => {
        if (priceGeneration() === before) return
        cost.ask(Date.now(), true)
        renderNumbers()
      })
      cost.ask(Date.now())
    }
    // Every composer card draws its own meter: a sub-agent's docked
    // conversation stands beside the main one, and each card's meter opens its
    // own panel. The first meter keeps the reading this pass paints.
    const meters = contextMeters()
    const meter = meters[0] ?? null
    for (let i = 0; i < meters.length; i += 1) markContextMeter(meters[i])
    // Every ring the skin drew is a face of its own: the press it takes is
    // delivered to its own card's trigger, and the panel it opens hangs from it
    // (stats-binding.ts::faceFor reads the ring off the trigger's card).
    const skinRing = ring()
    const ringRoot = skinRing === null ? null : skinRing.root()
    const rings = skinRing === null ? [] : skinRing.roots()
    for (let i = 0; i < rings.length; i += 1) binding.bindMeter(rings[i], true)
    // A card with no ring yet keeps its own meter, which drives that card's own
    // panel: the meter wherever the host keeps it (the numbers on a line of
    // their own leave it in the row).
    for (let i = 0; i < meters.length; i += 1) binding.bindMeter(meters[i], false)
    // The ring draws its own reading from the session's context-pressure
    // projection: the host's meter keeps the host's place and stops painting,
    // so its text is only the fallback of a host serving no such projection.
    const occupancy = pressureOccupancy(faceValue<HostContextPressureProjection>('contextPressure') ?? null)
      ?? (meter === null ? null : meterOccupancy(meter))
    if (skinRing !== null && ringRoot !== null) skinRing.setReading(occupancy)
    else if (meter !== null) {
      const display = readPrefs().contextDisplay
      if (display === CONTEXT_DISPLAY_RING_BAND) {
        // The measured face keeps the host's circle and takes the three bands.
        writeRamp(meter, 'context', null)
        writeContextBand(meter, occupancy)
        releaseContextPie(meter)
      } else {
        writeContextBand(meter, null)
        const rampMoved = writeRamp(meter, 'context', occupancy === null ? null : rampPosition(occupancy, CONTEXT_STOPS))
        // The pie is dsh-chat-ux's own reading of the same meter: while that
        // plugin draws it, the host's ring is left to that plugin's draw
        // (docs/THIRD_PARTY_NOTICES.md). The drawn ring keeps the host's circle
        // in the continuous band instead of a pie.
        if (display !== CONTEXT_DISPLAY_PIE || peerPresent('dsh-chat-ux')) releaseContextPie(meter)
        else {
          // The read phase's colours hold until this pass moves the band they
          // come from; only then are they read again, after the write (D40).
          const stale = rampMoved || pieColours === null || pieColours.trigger !== meter.querySelector('button')
          paintContextPie(meter, occupancy, stale ? readPieColours(meter) : pieColours)
        }
      }
    }
    pieColours = null
    // The line of numbers is the panel's second trigger, so it is bound (and
    // told whether the panel stands open) on every pass, in either position: a
    // reader who switches back finds the same line driving the same panel.
    const line = inline.root()
    if (line !== null) {
      binding.bindLine(line)
      binding.syncLine(line)
    }
    // The panel is both surfaces' popover, so its own bindings — the stamp the
    // stylesheet reads and the reading that lines it up with the meter — are
    // taken in either position.
    const panel = contextPanel()
    if (panel !== null) binding.bindPanel(panel)
    renderNumbers()
  }

  clearStrayContextNodes()

  return {
    /**
     * The pass's read phase: take the pie's colours while the frame's styles
     * are settled anyway, since a read after the pass's writes would settle
     * them a second time (D40).
     */
    measure() {
      const meter = findContextMeter()
      // The ring the skin draws reads its own colours (meter-ring.ts): only a
      // meter that keeps its place, drawn as a pie, is read here.
      const skinRing = ring()
      pieColours = skinRing?.root() != null || meter === null || peerPresent('dsh-chat-ux') || readPrefs().contextDisplay !== CONTEXT_DISPLAY_PIE
        ? null
        : readPieColours(meter)
    },
    /** One pass: keep the numbers current on whichever surface the position names. */
    sync() {
      syncNumbers()
    },
    /** Composer focus closes the panel the host's trigger opened. */
    close() {
      binding.close()
    },
    sessionCost,
    /** Be told whenever the figures are written again; the return stops it. */
    onSessionCost(listener: () => void) {
      costListeners.add(listener)
      return () => { costListeners.delete(listener) }
    },
    /**
     * The viewport moved under the panel: the host re-places it from its
     * anchor, so the skin's own reading of where its edges belong
     * is taken again in the same frame. A narrower card is also a new
     * budget for the line of figures, which is measured again on the next
     * frame (inline-stats.ts).
     */
    reposition(reason: 'viewport' | 'composer') {
      if (reason === 'viewport') {
        const panel = contextPanel()
        if (panel !== null) binding.align(panel)
      }
      inline.refit()
    },
    /** Drop the appends, the line, the projection subscriptions and the host-node bindings. */
    teardown() {
      releaseWatch()
      offCost()
      costListeners.clear()
      // The structure bus behind the estimate's call rows goes with the rest.
      estimate.stop()
      releaseCardWatch()
      releaseDialogWatch()
      // Everything this generation bound on the host's own meter, line and
      // panel comes off with it (stats-binding.ts's release).
      binding.release()
      inline.clear()
      // A count still running would write the block back after the nodes are
      // taken off below (stats-block.ts).
      block.stop()
      const meter = findContextMeter()
      if (meter !== null) {
        writeRamp(meter, 'context', null)
        writeContextBand(meter, null)
        // The host's ring comes back with the stylesheet the pie replaced.
        releaseContextPie(meter)
      }
      const blocks = document.querySelectorAll(`[${CONTEXT_STATS_ATTR}]`)
      for (let i = 0; i < blocks.length; i++) {
        blocks[i].remove()
      }
      const panels = document.querySelectorAll(`[${CONTEXT_PANEL_ATTR}]`)
      for (let i = 0; i < panels.length; i++) panels[i].removeAttribute(CONTEXT_PANEL_ATTR)
    }
  }
}
