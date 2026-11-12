import { CURRENCY_SYMBOL, formatMoneyMicro } from '@dsh-claude-style/contracts/prices'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { readAccountBalance } from '../../shared/account-balance'
import { ACCOUNT_MODEL_GROUP, OFFICIAL_MODEL_GROUP } from '@dsh-claude-style/contracts/services'
import { copy } from './copy'
import type { Currency } from '@dsh-claude-style/contracts/prices'
import type { AccountBalance } from '../../shared/account-balance'
import type { SessionCostReading } from '../context-stats/session-stats'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './mascot.manifest'

/** The figure a row prints while its amount is unknown: formatMoneyMicro's own dash. */
const DASH = '—'

/** How long the pointer rests on the mascot before the bubble opens. */
const HOVER_DELAY_MS = 250

/**
 * The pixel bubble over the mascot: the account balance on top, and the
 * shown conversation's cost under it, quieter.
 *
 * The balance is the host's account read, gifted wallets included
 * (shared/account-balance.ts); a reader with no signed-in account gets no
 * balance row, and neither does one whose route is billed by another provider:
 * that money never moves the platform's wallet. The cost is the figure the statistics print
 * (`ui.contextStats.sessionCost`), so the two never disagree, and it is
 * rewritten each time the statistics are; the home page and billing turned
 * off leave the row out. With neither row there is no bubble. It opens only
 * for a resting mouse or pen; a press on the mascot closes it, since the
 * press plays a reaction there.
 *
 * @returns `{ element, enter, leave, dispose }`: `element` is put inside the
 *     mascot's pointer window, the rest are the player's pointer hooks.
 */
export function createMascotBubble(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const root = buildElement('span', 'dsh-claude-mascot-bubble')
  let timer: ReturnType<typeof setTimeout> | null = null
  let open = false
  let balance: AccountBalance | null = null
  let offCost: (() => void) | null = null
  /**
   * What each session has cost since the balance was read: its cost when the
   * bubble first saw it after that read, and its latest. A session left and
   * come back to keeps its entry, so its spending is counted once.
   */
  let spent = new Map<string, { currency: Currency, first: number, last: number }>()

  /** Take one cost reading into the spending since the balance was read. */
  function observe(reading: SessionCostReading | null) {
    if (reading === null || reading.cost === null) return
    // 平台余额只对官方供应商的会话扣减：第三方供应商的花费在它自己的账单里结，
    // 不从这里走账，余额行就停在平台读到的数字上。
    if (!reading.official) return
    const seen = spent.get(reading.sessionId)
    if (seen === undefined || seen.currency !== reading.currency) {
      spent.set(reading.sessionId, { currency: reading.currency, first: reading.cost, last: reading.cost })
    } else seen.last = reading.cost
  }

  /** What the sessions have cost in one currency since the balance was read, in micro units. */
  function spentIn(currency: Currency) {
    let micro = 0
    for (const seen of spent.values()) if (seen.currency === currency) micro += seen.last - seen.first
    return micro
  }

  /** One row: its label, then one figure per amount. */
  function row(kind: 'balance' | 'session', label: string, figures: string[]) {
    const line = buildElement('span', 'dsh-claude-mascot-bubble-row')
    line.setAttribute('data-row', kind)
    line.appendChild(buildElement('span', 'dsh-claude-mascot-bubble-label', label))
    for (const figure of figures) line.appendChild(buildElement('span', 'dsh-claude-mascot-bubble-figure', figure))
    return line
  }

  /**
   * The balance row's figures: one per currency, a dash for a miss, none
   * without an account. Each is the platform's figure less what the sessions
   * have cost in that currency since it was read, so it falls as the cost
   * grows until the next read replaces it; a currency billing does not price
   * in stays as read. They carry as many places as the cost under them, so
   * the two figures line up on the point; four with no cost to follow.
   */
  function balanceFigures(session: string | null): string[] {
    if (balance === null || balance.status === 'none') return []
    if (balance.status === 'failed') return [DASH]
    const point = session?.indexOf('.') ?? -1
    const places = session === null || point === -1 ? 4 : session.length - point - 1
    return balance.totals.map(total => `${CURRENCY_SYMBOL[total.currency]}${((total.micro - spentIn(total.currency)) / 1_000_000).toFixed(places)}`)
  }

  /** The session row's figure, or null when it has none to print. */
  function sessionFigure(reading: SessionCostReading | null): string | null {
    if (reading === null) return null
    if (reading.cost !== null) return formatMoneyMicro(reading.cost, reading.currency)
    return reading.pending ? `${CURRENCY_SYMBOL[reading.currency]}${DASH}` : null
  }

  /** Write the rows the bubble owes now; it shows only while it has one. */
  function render() {
    if (!open) return
    const reading = ui.contextStats?.sessionCost() ?? null
    observe(reading)
    const rows: HTMLElement[] = []
    const session = sessionFigure(reading)
    // The platform's wallet stands only while the route in force is the
    // platform's: a provider that settles its own bill leaves this figure with
    // nothing to do with the conversation (features/model/model-picker.ts names it).
    const provider = ui.model?.provider?.() ?? null
    const platformBilled = provider === null || provider === OFFICIAL_MODEL_GROUP || provider === ACCOUNT_MODEL_GROUP
    const balances = platformBilled ? balanceFigures(session) : []
    if (balances.length > 0) rows.push(row('balance', copy('mascotBalanceLabel'), balances))
    if (session !== null) rows.push(row('session', copy('mascotSessionLabel'), [session]))
    const same = rows.length === root.children.length &&
      rows.every((line, i) => line.isEqualNode(root.children[i]))
    if (!same) root.replaceChildren(...rows)
    if (rows.length > 0) root.setAttribute('data-open', '')
    else root.removeAttribute('data-open')
  }

  function show() {
    timer = null
    open = true
    // The cost moves the balance's places with it, so a new cost redraws both rows.
    offCost = ui.contextStats?.onSessionCost(render) ?? null
    render()
    void readAccountBalance(ctx).then(answer => {
      // A kept answer comes back as the same object; a new one is a fresh
      // platform figure, which already holds what was spent before it.
      if (answer !== balance) spent = new Map()
      balance = answer
      render()
    })
  }

  /** The pointer came to rest on the mascot. */
  function enter(event: PointerEvent) {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
    if (open || timer !== null) return
    timer = setTimeout(show, HOVER_DELAY_MS)
  }

  /** The pointer left, a press started, or the mascot left the page. */
  function leave() {
    if (timer !== null) clearTimeout(timer)
    timer = null
    open = false
    if (offCost !== null) offCost()
    offCost = null
    root.removeAttribute('data-open')
  }

  return {
    element: root,
    enter,
    leave,
    dispose() {
      leave()
      root.remove()
    },
  }
}
