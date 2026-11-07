import { CURRENCY_SYMBOL, formatMoneyMicro } from '@dsh-claude-style/contracts/prices'
import { buildElement, writeTextInPlace } from '@dsh-claude-style/engine/dom'
import { readPrefs } from '../../core/prefs'
import { readAccountBalance } from '../../shared/account-balance'
import { copy } from './copy'
import type { AccountBalance } from '../../shared/account-balance'
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
 * The balance is the host's account read (shared/account-balance.ts); a
 * reader with no signed-in account gets no balance row. The cost is the
 * figure the statistics print (`ui.contextStats.sessionCost`), so the two
 * never disagree, and it is rewritten each time the statistics are; the home
 * page and billing turned off leave the row out. With neither row there is no
 * bubble. It opens only for a resting mouse or pen and only under the
 * `mascotBalance` preference; a press on the mascot closes it, since the press
 * plays a reaction there.
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

  /** One row: its label, then one figure per amount. */
  function row(kind: 'balance' | 'session', label: string, figures: string[]) {
    const line = buildElement('span', 'dsh-claude-mascot-bubble-row')
    line.setAttribute('data-row', kind)
    line.appendChild(buildElement('span', 'dsh-claude-mascot-bubble-label', label))
    for (const figure of figures) line.appendChild(buildElement('span', 'dsh-claude-mascot-bubble-figure', figure))
    return line
  }

  /** The balance row's figures: one per wallet, a dash for a miss, none without an account. */
  function balanceFigures(): string[] {
    if (balance === null || balance.status === 'none') return []
    if (balance.status === 'failed') return [DASH]
    return balance.wallets.map(wallet => `${CURRENCY_SYMBOL[wallet.currency]}${wallet.balance}`)
  }

  /** The session row's figure, or null when it has none to print. */
  function sessionFigure(): string | null {
    const reading = ui.contextStats?.sessionCost() ?? null
    if (reading === null) return null
    if (reading.cost !== null) return formatMoneyMicro(reading.cost, reading.currency)
    return reading.pending ? `${CURRENCY_SYMBOL[reading.currency]}${DASH}` : null
  }

  /** Write the rows the bubble owes now; it shows only while it has one. */
  function render() {
    if (!open) return
    if (!readPrefs().mascotBalance) {
      leave()
      return
    }
    const rows: HTMLElement[] = []
    const balances = balanceFigures()
    if (balances.length > 0) rows.push(row('balance', copy('mascotBalanceLabel'), balances))
    const session = sessionFigure()
    if (session !== null) rows.push(row('session', copy('mascotSessionLabel'), [session]))
    const same = rows.length === root.children.length &&
      rows.every((line, i) => line.isEqualNode(root.children[i]))
    if (!same) root.replaceChildren(...rows)
    if (rows.length > 0) root.setAttribute('data-open', '')
    else root.removeAttribute('data-open')
  }

  /** Writes only the figures in place while the statistics count, so the rows keep their nodes. */
  function renderSession() {
    const figure = sessionFigure()
    const cell = root.querySelector('[data-row="session"] .dsh-claude-mascot-bubble-figure')
    if (cell !== null && figure !== null) writeTextInPlace(cell, figure)
    else render()
  }

  function show() {
    timer = null
    open = true
    offCost = ui.contextStats?.onSessionCost(renderSession) ?? null
    render()
    void readAccountBalance(ctx).then(answer => {
      balance = answer
      render()
    })
  }

  /** The pointer came to rest on the mascot. */
  function enter(event: PointerEvent) {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
    if (!readPrefs().mascotBalance || open || timer !== null) return
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
