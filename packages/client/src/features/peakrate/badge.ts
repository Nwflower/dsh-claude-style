import { copyLabel } from '../../core/i18n'
import { formatCountdown } from './schedule'
import { buildElement } from '../../shared/dom'
import type { RatePeriod, RateState } from '@dsh-claude-style/contracts/peakrate'

/**
 * The rate badge and its wording (D54).
 *
 * The shape carries which state it is, the colour carries whether it is
 * expensive or cheap: twin peaks for the peak rate, twin valleys for the
 * off-peak rate, a spark for a dated promotion. Nothing here reads a
 * direction — every transition but a promotion is a two-state flip, and a
 * promotion's badge is a plan name with no order in it.
 *
 * The badge's text is the data source's own (`2×`, `0.5× credits`): it is
 * foreign text and is written with `textContent`, never as markup
 * (docs/decisions D11).
 */

/** The mark each state draws, in a 16×16 box stroked with the current colour. */
const ICONS: Record<RatePeriod, string> = {
  peak: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M1.6 12.4 5.4 6.2l3.1 4.1 2.4-3.3 3.5 5.4"/></svg>',
  offPeak: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M1.6 3.6 5.4 9.8l3.1-4.1 2.4 3.3 3.5-5.4"/></svg>',
  campaign: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 2.4l1.6 4 4 1.6-4 1.6L8 13.6l-1.6-4-4-1.6 4-1.6z"/></svg>',
}

/** The state's own name, and the neutral English constant that stands until the copy document answers. */
const NAMES: Record<RatePeriod, { key: string, fallback: string }> = {
  peak: { key: 'ratePeak', fallback: 'Peak rate' },
  offPeak: { key: 'rateOffPeak', fallback: 'Off-peak rate' },
  campaign: { key: 'rateCampaign', fallback: 'Promotion' },
}

/** One state's name in the shell's language. */
export function rateName(period: RatePeriod) {
  return copyLabel(NAMES[period].key, NAMES[period].fallback)
}

/** `峰价 2×`, in one string: the state's name and the multiplier the source prints. */
function rateText(period: RatePeriod, badge: string) {
  return `${rateName(period)} ${badge}`.trim()
}

/**
 * The whole judgement in one line: the state in force, and what it becomes and
 * when. A state with no switch in sight (nothing changes within ten days) says
 * only what it is.
 */
export function rateDetail(state: RateState) {
  const now = copyLabel('rateNow', 'Now {rate}', { rate: rateText(state.period, state.badge) })
  const countdown = formatCountdown(state.minutesUntilSwitch)
  if (state.nextPeriod === undefined || countdown === '') return now
  const next = rateText(state.nextPeriod, state.nextBadge ?? '')
  return `${now} · ${copyLabel('rateNext', 'in {countdown} → {next}', { countdown, next })}`
}

/**
 * The badge as it stands in a model row: the state's mark, the multiplier and
 * the countdown, with the whole judgement as its own title.
 *
 * @param state - the judgement for one row.
 * @returns the badge element.
 */
export function buildRateBadge(state: RateState): HTMLElement {
  const detail = rateDetail(state)
  const badge = buildElement('span', 'dsh-claude-peakrate')
  badge.setAttribute('data-period', state.period)
  badge.setAttribute('role', 'img')
  badge.setAttribute('aria-label', detail)
  badge.setAttribute('title', detail)
  const icon = buildElement('span', 'dsh-claude-peakrate-icon')
  icon.innerHTML = ICONS[state.period]
  badge.appendChild(icon)
  badge.appendChild(buildElement('span', 'dsh-claude-peakrate-value', state.badge))
  const countdown = formatCountdown(state.minutesUntilSwitch)
  if (countdown !== '') {
    badge.appendChild(buildElement('span', 'dsh-claude-peakrate-countdown', `· ${countdown}`))
  }
  return badge
}
