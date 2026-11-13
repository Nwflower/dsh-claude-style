import { conversationSessionId, findConversationSession, hostSessions, observeSession } from '@dsh-claude-style/engine/host'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { sessionProjectionFaces } from '../../shared/session-projections'
import { hostChatSeat } from '../../core/i18n'
import { prefsFromForm, readPrefs } from '../../core/prefs'
import { peerPresent } from '../../shared/peer-plugin'
import { BILLING_OFF, CONTEXT_DISPLAY_PIE, CONTEXT_DISPLAY_RING_BAND, STATS_POSITION_CONTEXT } from '../../constants'
import { createContextStatsBinding } from './stats-binding'
import { createInlineStats } from './inline-stats'
import { createStatsBlock } from './stats-block'
import { createStatsCount } from './stats-count'
import { createStreamEstimate } from './stream-estimate'
import { adoptBillingRows, billingRows, createSessionCost, loadPrices, priceDocument, priceGeneration } from './session-cost'
import { noteUnpricedModel } from './billing-editor'
import { paintContextPie, readPieColours, releaseContextPie } from './context-meter-pie'
import { CONTEXT_STATS_ATTR, CONTEXT_PANEL_ATTR, clearStrayContextNodes, contextMeters, contextPanel, findContextMeter, markContextMeter, meterOccupancy, releaseCardWatch, releaseDialogWatch } from './stats-panel'
import { CONTEXT_STOPS, rampPosition, writeRamp } from './stats-ramp'
import { writeContextBand } from './context-meter-face'
import { priceFor, priceModelId, priceTierAt } from '@dsh-claude-style/contracts/prices'
import { platformBilledProvider } from '../../shared/account-balance'
import { overlayBilling } from '@dsh-claude-style/contracts/billing-table'
import type { Currency } from '@dsh-claude-style/contracts/prices'
import type { HostContext, HostText } from '@dsh-claude-style/engine/host'
import type { HostContextPressureProjection, HostSessionStatsProjection, HostSnapshotSource, HostTokenUsageProjection } from '@dsh-claude-style/contracts/services'
import type { StatsReading } from './stats-count'
import type { PieColours } from './context-meter-pie'
import type { SessionFigures } from '../../shared/session-projections'

/** The shown session's cost in micro units, in the currency billing follows. */
export interface SessionCostReading {
  /** The host session the figure belongs to. */
  sessionId: string
  cost: number | null
  currency: Currency
  pending: boolean
  /** Whether the route bills at the platform's own list (the official models only). */
  official: boolean
}

/** The ring the composer row carries, as the statistics read it (meter-ring.ts). */
export interface MeterRingFace {
  root(): HTMLElement | null
  roots(): HTMLElement[]
  setReading(percent: number | null): void
}

/**
 * The occupancy a context-pressure projection carries, as the host's meter
 * reads it, or null while it names no window.
 */
function pressureOccupancy(pressure: HostContextPressureProjection | null) {
  const used = pressure?.projectedTokens ?? pressure?.pressureTokens
  const window = pressure?.contextWindow
  if (used === undefined || window === undefined || window <= 0) return null
  return Math.min(100, Math.round(used / window * 100))
}

/**
 * Read the session's usage projections and show them in the meter popover or
 * under the card, never by opening host dialogs. The stream estimate covers text
 * not yet settled; stats-format mirrors host wording.
 */
export function createSessionStats(ctx: HostContext, ring: () => MeterRingFace | null, provider: () => string | null = () => null) {
  /** The projections the reading follows: the figures, the route the cost prices at, and the meter's share. */
  const STATS_KEYS = ['sessionStats', 'tokenUsage', 'modelSelection', 'contextPressure']

  /** Hold across a session switch, then drop stale figures if no reading arrives. */
  const SWITCH_HOLD_MS = 800

  /** The projection keys this page is following, and how to stop. */
  let watch: { sessionId: string, faces: Record<string, HostSnapshotSource<unknown>>, off: (() => void)[] } | null = null

  /** The active conversation's host session id. */
  function shownSessionId() {
    const id = conversationSessionId(findConversationSession())
    return id === null ? '' : id
  }

  /** The host's key-addressed read faces for one session, when reachable. */
  function statsFaces(sessionId: string) {
    return sessionProjectionFaces(ctx, sessionId, STATS_KEYS)
  }

  /** The estimate of the text streaming now, riding on the settled written-back total. */
  const estimate = createStreamEstimate(scheduleNumbers)
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
   * Whether the billing choice is the reader's own yet: the settings form answers
   * after the page's first pass, and until it does the default says CNY, so the
   * first ask waits for the form's own pass. A host that never binds the form
   * loses nothing — after a short wait the default is the only answer there is.
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
   * still being fetched: the host's settled total plus the tokens the streaming
   * answer has grown by, priced at the output rate in force now. `pending` is
   * true only while something is still coming (the host's answer or the price
   * table), so the segment can hold its width; a route nothing prices answers
   * null with `pending` false.
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

  /**
   * The last reading as the two faces publish it: the figures with the streaming
   * answer's estimate in them, kept for the other face to read between writes
   * (shared/session-projections.ts).
   */
  let liveFigures: SessionFigures | null = null

  /** The figures another face prints, or null while this session's reading has no owner. */
  function figures(): SessionFigures | null {
    return liveFigures !== null && liveFigures.sessionId !== '' ? liveFigures : null
  }

  /**
   * The reading the other face draws, counted to each new one the way the line
   * counts (stats-count.ts): both faces take the same readings, so both travel
   * between them instead of one landing while the other glides.
   */
  const figuresCount = createStatsCount((counting) => {
    liveFigures = { sessionId: watch?.sessionId ?? '', stats: counting.stats, usage: counting.usage, cost: counting.cost, currency: currency() }
    for (const listener of figureListeners) listener()
  })

  const block = createStatsBlock(reading, chatText, currency)
  const inline = createInlineStats(reading, chatText, findContextMeter, currency)
  const binding = createContextStatsBinding(() => ring()?.root() ?? null)
  /**
   * A session switch is one broadcast (D91): what the old transcript's meter,
   * line and panel carried is released in the batch the switch is heard in,
   * rather than at the next binding pass.
   */
  const stopSessionWatch = observeSession(() => { binding.onSessionSwitch() })

  /**
   * A settled total landed, so the figures on screen were priced from the
   * previous one: read again and rewrite both surfaces — the count is the same,
   * so the new figure travels from where the old one stands (stats-count.ts).
   */
  const offCost = cost.onChange(() => {
    // Cost asks already have their own 1500ms throttle; a settled answer writes
    // immediately, while the streaming projection and text sources coalesce.
    renderNumbers()
  })

  /** The pie's colours this frame's read phase took, until the pass's sync uses them. */
  let pieColours: PieColours | null = null

  /**
   * The occupancy a provider sample answered for the shown session, kept while
   * a failed attempt's zero sample stands in the projection (occupancyOf).
   */
  let sampledOccupancy: number | null = null

  /** Stop following the projections (a different session, or the teardown). */
  function releaseWatch() {
    if (watch !== null) {
      for (let i = 0; i < watch.off.length; i++) watch.off[i]()
      watch = null
    }
    // The estimate belongs to the session it was read from; the next counts its
    // own text from a fresh baseline (stream-estimate.ts).
    estimate.reset()
    // The settled cost belongs to the session it was read from.
    cost.follow('')
    // So does the occupancy the last real sample answered.
    sampledOccupancy = null
    readingMemo = null
    // And the figures published for the other face: the next session's numbers
    // are written as they come rather than counted from this session's
    // (shared/session-projections.ts).
    liveFigures = null
    figuresCount.reset()
    // The skeleton holds the panel's place, not the session's (stats-block.ts);
    // the line keeps the numbers it shows, which the next session counts on from.
    block.stopSkeleton()
  }

  /**
   * The occupancy the meter shows: the projection's own reading, unless its
   * newest usage sample is a failed attempt's zero. A failed attempt reports
   * `{ inputTokens: 0 }`, the projection's last-wins sample slot takes it, and
   * `projectedTokens` is re-anchored to that zero, so a meter that read a fifth
   * of the window would read 0 % until the next request reports usage. The last
   * sample a provider did report stands while that placeholder does, and a
   * session that never had one leaves the reading to the host's own text.
   */
  function occupancyOf(pressure: HostContextPressureProjection | null) {
    if (pressure?.pressureTokens === 0) return sampledOccupancy
    const occupancy = pressureOccupancy(pressure)
    if (occupancy !== null) sampledOccupancy = occupancy
    return occupancy
  }

  /**
   * Write the numbers onto whichever surface the position names. The host's panel
   * carries the rows in BOTH positions: with the numbers on a line of their own,
   * that line opens the panel (stats-binding.ts), so both show one session.
   */
  let cancelNumbers: (() => void) | null = null
  let numbersStopped = false
  const numbersFrame = {
    write() {
      cancelNumbers = null
      renderNumbers()
    },
  }
  /** Projection, price and settlement callbacks share one write in the next frame. */
  function scheduleNumbers() {
    if (numbersStopped || cancelNumbers !== null) return
    cancelNumbers = requestFrame(numbersFrame)
  }

  function renderNumbers() {
    if (cancelNumbers !== null) cancelNumbers()
    cancelNumbers = null
    readingMemo = null
    // Every position but the popover's writes the line: the footer rides the
    // toolbar with it, and the rail position keeps it written while the rail
    // stands, hidden by the stylesheet, so it is whole the moment the rail goes.
    if (readPrefs().statsPosition === STATS_POSITION_CONTEXT) inline.clear()
    else inline.render()
    block.render()
    for (const listener of figureListeners) listener()
    // The two surfaces read the figures only where they stand — the popover
    // closed reads nothing at all — so the reading the rail prints is taken here,
    // on every frame that moves it, and counts to the same place the line's
    // figures count to (D94).
    figuresCount.to(reading())
  }

  /**
   * Who reads these figures outside the two surfaces: the mascot's bubble and the
   * details rail, each told whenever they are rewritten.
   */
  const figureListeners = new Set<() => void>()

  /** Hear one more reader of the figures; the returned function stops it. */
  function listenFigures(listener: () => void) {
    figureListeners.add(listener)
    return () => { figureListeners.delete(listener) }
  }

  /**
   * Whether the route in force bills at the platform's own list: the document's
   * official table holds every model the platform sells, and a catalogue-only
   * model is billed by the vendor behind it instead.
   */
  function officialRoute(): boolean {
    // A route billed at the platform's own list, by its provider as well as by
    // its model: a reader who runs a vendored model id through another provider
    // settles that provider's bill, and the platform's balance does not move
    // (features/mascot/mascot-bubble.ts reads this to hold the balance still).
    if (!platformBilledProvider(provider())) return false
    const selection = faceValue<ModelSelection>('modelSelection')
    const model = cost.value()?.model ?? selection?.lastUsed?.model ?? selection?.next?.model ?? null
    const document = priceDocument()
    return model !== null && model !== undefined && document !== null && priceModelId(document, model) !== null
  }

  /**
   * The shown session's cost as the two surfaces print it, or null with no
   * session or billing off; `cost` is null while pending or unpriced.
   */
  function sessionCost(): SessionCostReading | null {
    const billing = currency()
    if (watch === null || billing === null) return null
    const read = reading()
    return { sessionId: watch.sessionId, cost: read.cost, currency: billing, pending: read.costPending, official: officialRoute() }
  }

  /**
   * A projection frame landed: both surfaces are the skin's own nodes, so they
   * are rewritten here rather than through a pass.
   */
  function onStatsFrame() {
    // A settlement is what moves the settled cost. The ask is throttled like a
    // pass's own: several projections can change on one settlement, and with
    // billing off there is nothing to ask for.
    if (billingChosen() && currency() !== null) cost.ask(Date.now())
    scheduleNumbers()
  }

  /**
   * Hand the reader's own price rows to the cost ask (billing-table.ts): the rows
   * are the page's preferences in the currency they were written in, and an edit
   * re-prices the sessions already asked about.
   */
  function syncBillingRows() {
    const choice = readPrefs().billingCurrency
    const currencyCode = choice === BILLING_OFF ? null : choice
    if (adoptBillingRows(readPrefs().billingTable, currencyCode) && currencyCode !== null) cost.ask(Date.now(), true)
  }

  /**
   * Follow the shown conversation's projections, one subscription per session: a
   * switch releases the old faces and binds the new ones.
   */
  function syncWatch() {
    const sessionId = shownSessionId()
    if (watch !== null && watch.sessionId === sessionId) return
    // The line keeps its place for a moment instead of folding and unfolding the
    // composer's bottom line while the host re-renders the row beside it.
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
   * projections, paint the meter's own reading, keep the named surface current.
   */
  function syncNumbers() {
    syncWatch()
    cost.follow(watch?.sessionId ?? '')
    // With billing off nothing is priced and nothing is asked: the price table,
    // the session's total and the host route behind it stay untouched.
    if (billingChosen() && currency() !== null) {
      // A table arriving after the first pass re-prices everything: the host
      // clears its totals on the swap, so the settled figure is asked for again.
      // The pass never waits on the fetch — this frame draws from what is in hand.
      const before = priceGeneration()
      void loadPrices(Date.now()).then(() => {
        if (priceGeneration() === before) return
        cost.ask(Date.now(), true)
        scheduleNumbers()
      })
      cost.ask(Date.now())
    }
    // Every composer card draws its own meter: a sub-agent's docked conversation
    // stands beside the main one, and each card's meter opens its own panel.
    const meters = contextMeters()
    const meter = meters[0] ?? null
    for (let i = 0; i < meters.length; i += 1) markContextMeter(meters[i])
    // Every ring the skin drew is a face of its own: its press reaches its own
    // card's trigger, and the panel it opens hangs from it (stats-binding.ts).
    const skinRing = ring()
    const ringRoot = skinRing === null ? null : skinRing.root()
    const rings = skinRing === null ? [] : skinRing.roots()
    for (let i = 0; i < rings.length; i += 1) binding.bindMeter(rings[i], true)
    // A card with no ring yet keeps its own meter, which drives that card's own
    // panel: the meter wherever the host keeps it.
    for (let i = 0; i < meters.length; i += 1) binding.bindMeter(meters[i], false)
    // The ring reads the context-pressure projection itself; the host's meter
    // stops painting, so its text falls back to a host serving no projection.
    const occupancy = occupancyOf(faceValue<HostContextPressureProjection>('contextPressure') ?? null)
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
        // plugin draws it, the host's ring is left to the plugin
        // (docs/THIRD_PARTY_NOTICES.md). A drawn ring keeps the continuous band.
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
    // The line of numbers is the panel's second trigger, bound on every pass in
    // either position, so switching back finds the same line driving the panel.
    const line = inline.root()
    if (line !== null) {
      binding.bindLine(line)
      binding.syncLine(line)
    }
    // The panel is both surfaces' popover, so its bindings — the stamp the
    // stylesheet reads and the alignment with the meter — are taken either way.
    const panel = contextPanel()
    if (panel !== null) binding.bindPanel(panel)
    renderNumbers()
  }

  clearStrayContextNodes()

  return {
    /**
     * The pass's read phase: take the pie's colours while the frame's styles are
     * settled anyway; a read after the pass's writes would settle them again (D40).
     */
    measure() {
      const meter = findContextMeter()
      // Only a meter that keeps its place, drawn as a pie, is read here: the
      // skin's ring reads its own colours (meter-ring.ts).
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
    figures,
    /** Be told whenever the figures are written again; the return stops it. */
    onSessionCost: listenFigures,
    /** The same word, for the face that prints the figures rather than the cost alone. */
    onFigures: listenFigures,
    /**
     * The viewport moved under the panel: the host re-places it from its anchor,
     * so the skin's own reading is taken again in the same frame, and a narrower
     * card is a new budget for the line (inline-stats.ts).
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
      numbersStopped = true
      if (cancelNumbers !== null) cancelNumbers()
      cancelNumbers = null
      releaseWatch()
      offCost()
      cost.stop()
      figureListeners.clear()
      // The structure bus behind the estimate's call rows goes with the rest.
      estimate.stop()
      releaseCardWatch()
      releaseDialogWatch()
      // Everything this generation bound on the host's meter, line and panel.
      stopSessionWatch()
      binding.release()
      inline.clear()
      // A running count would write the block back after the nodes come off.
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
