import { PRICES_PATH, SESSION_COST_PATH } from '@dsh-claude-style/contracts/routes'
import type { PriceDocument, SessionCostAnswer } from '@dsh-claude-style/contracts/prices'
import { billingQuery, billingRows } from '../../shared/billing'
import { createHostRequest } from '@dsh-claude-style/engine/resource'

/**
 * The price table and the current session's settled cost, both from the host
 * half over its own routes.
 *
 * The browser cannot price a settlement on its own: the log and the table live
 * on the host. So it asks for the table once a day and for the session's
 * settled total whenever the usage projection moves (a settlement), throttled
 * so a stream of projection frames cannot become a poll. The estimate for the
 * answer still streaming is added on top by the caller, from the same character
 * count the written-back token figure rides (stream-estimate.ts).
 */

const DAY_MS = 24 * 60 * 60 * 1000
/** The shortest gap between two asks about one session. */
const ASK_MS = 1500

export { adoptBillingRows, entryOf, billingRows } from '../../shared/billing'

let document: PriceDocument | null = null
let fetchedAt = 0
/** Bumped when the document changes, so a page that adopted one keeps it. */
let generation = 0
// Per generation: the shared price table survives individual statistics views.
const prices = createHostRequest(data => data as { ok?: boolean, document?: PriceDocument, fetchedAt?: string } | null, body => {
  if (body?.ok !== true || body.document == null) return
  document = body.document
  fetchedAt = typeof body.fetchedAt === 'string' ? Date.parse(body.fetchedAt) : Date.now()
  generation += 1
})

/** The table in force, or null until the host answers. */
export function priceDocument() {
  return document
}

/** One generation count the tick can compare, so a new table re-renders. */
export function priceGeneration() {
  return generation
}

/** Ask the host for its table; a fetch in flight is shared and one a day is enough. */
export function loadPrices(now: number): Promise<void> {
  if (prices.busy()) return prices.load(PRICES_PATH).then(() => {})
  if (document !== null && now - fetchedAt < DAY_MS) return Promise.resolve()
  // A transport failure keeps the last table and permits a later attempt (D12).
  return prices.load(PRICES_PATH, {}, () => {}).then(() => {})
}

/** One session's settled cost, followed across a session switch. */
export function createSessionCost() {
  let sessionId = ''
  let answer: SessionCostAnswer | null = null
  let askedAt = 0
  let stopped = false
  const listeners = new Set<() => void>()
  // Per session: follow and stop release the old session's request (D12, D91).
  const request = createHostRequest(data => data as { ok?: boolean, value?: SessionCostAnswer | null } | null, body => {
    if (body?.ok !== true || body.value == null) return
    answer = body.value
    for (const listener of listeners) listener()
    // A cold placeholder is retried on the next projection pass.
    if (answer !== null && answer.cny === 0 && answer.usd === 0 && answer.model === null) askedAt = 0
  })

  /** Follow the conversation on screen; a switch drops the previous session's answer. */
  function follow(id: string) {
    if (id === sessionId) return
    sessionId = id
    answer = null
    askedAt = 0
    request.reset()
  }

  /**
   * Ask for the settled total, at most once per `ASK_MS`.
   *
   * The total moves on every settlement, so an answer already in hand never
   * makes a later ask unnecessary; the interval alone is what keeps the passes
   * from becoming a poll.
   *
   * @param now - the pass's instant.
   * @param force - ask even inside the interval (a new price table).
   */
  function ask(now: number, force = false) {
    if (stopped || sessionId === '' || request.busy()) return
    if (!force && askedAt !== 0 && now - askedAt < ASK_MS) return
    askedAt = now
    // A transport failure keeps the last total until the next settlement (D12).
    void request.load(`${SESSION_COST_PATH}?id=${encodeURIComponent(sessionId)}${billingQuery()}`, {}, () => {})
  }

  return {
    follow,
    ask,
    /** The settled totals in both currencies, or null before the first answer. */
    value() {
      return answer
    },
    /** Tell the caller a new total landed, so the line can be written again. */
    onChange(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    stop() {
      stopped = true
      request.reset()
      answer = null
      listeners.clear()
    },
  }
}
