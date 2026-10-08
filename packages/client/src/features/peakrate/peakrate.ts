import { buildRateBadge } from './badge'
import { currentRate } from './schedule'
import { loadPeakRate, peakProfiles, peakRateGeneration, stopPeakRate, subscribePeakRate } from './live'
import { matchProfile } from './match'
import type { HostContext } from '../../core/host'
import type { FeatureHandle } from '../../core/scheduler'
import type { FeatureUi } from '../../core/feature'
import type manifest from './peakrate.manifest'
import type { RateState } from '@dsh-claude-style/contracts/peakrate'

/**
 * What the model picker reads off this feature: the rate for one row.
 *
 * The badge belongs to the rows, and the rows belong to the model picker, so
 * the picker asks and this feature answers: the catalog, the matching and the
 * time judgement stay here, the row layout stays there.
 */
export interface PeakRateHandle extends FeatureHandle {
  /** The state in force for one provider and model, or null when no profile claims it. */
  state(provider: string, modelId: string): RateState | null
  /** That state as the badge a model row carries, or null. */
  badge(provider: string, modelId: string): HTMLElement | null
  /** A number that changes when the catalog does: part of the rows' render signature. */
  epoch(): number
  teardown(): void
}

export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /**
   * The catalog is the host half's (packages/host/src/peakrate.ts): it fetches
   * the source, caches it on disk and serves it over the plugin's own route.
   * This half asks for it once, matches it against the picker's rows and
   * judges it against the clock — no third party is ever contacted from here.
   */
  const unsubscribe = subscribePeakRate(() => {
    // A new catalog repaints the rows that are already built.
    if (typeof ui.schedule === 'function') ui.schedule()
  })

  /** The judgement for one row, or null when the model carries no clock. */
  function state(provider: string, modelId: string): RateState | null {
    const profile = matchProfile(provider, modelId, peakProfiles())
    if (profile === undefined) return null
    return currentRate(profile, new Date())
  }

  ui.peakrate = {
    sync() { loadPeakRate(Date.now()) },
    state,
    badge(provider, modelId) {
      const judgement = state(provider, modelId)
      return judgement === null ? null : buildRateBadge(judgement)
    },
    epoch: peakRateGeneration,
    teardown() {
      unsubscribe()
      stopPeakRate()
    },
  }

  return ui.peakrate.teardown
}
