import { buildRateBadge } from './badge'
import { currentRate } from './schedule'
import { loadPeakRate, peakProfiles, peakRateGeneration, stopPeakRate, subscribePeakRate } from './live'
import { matchProfile } from './match'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureHandle } from '@dsh-claude-style/engine/scheduler'
import type { FeatureUi } from '../../core/feature'
import type manifest from './peakrate.manifest'
import type { RateProfile, RateState } from '@dsh-claude-style/contracts/peakrate'

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

export function install(_ctx: HostContext, ui: FeatureUi<typeof manifest>) {
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

  /**
   * The profile each (provider, model) pair matched, per catalog generation:
   * a full paint asks for every row of a four-digit catalog, and the match
   * scans the whole price table each time it is answered from scratch. The
   * cache dies with the generation, and the countdown is judged per call.
   */
  let matchEpoch = -1
  const matchCache = new Map<string, RateProfile | undefined>()
  function cachedProfile(provider: string, modelId: string): RateProfile | undefined {
    const generation = peakRateGeneration()
    if (generation !== matchEpoch) {
      matchCache.clear()
      matchEpoch = generation
    }
    const key = `${provider}\u0000${modelId}`
    if (!matchCache.has(key)) matchCache.set(key, matchProfile(provider, modelId, peakProfiles()))
    return matchCache.get(key)
  }

  ui.peakrate = {
    sync() { loadPeakRate(Date.now()) },
    state,
    badge(provider, modelId) {
      const profile = cachedProfile(provider, modelId)
      if (profile === undefined) return null
      return buildRateBadge(currentRate(profile, new Date()))
    },
    epoch: peakRateGeneration,
    teardown() {
      unsubscribe()
      stopPeakRate()
    },
  }

  return ui.peakrate.teardown
}
