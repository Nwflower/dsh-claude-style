import type { Prefs } from '../constants'
import { peerPresent } from '../shared/peer-plugin'
import type { HostContext } from './host'
import type { Ui } from './scheduler'

/**
 * A feature's manifest (D42): every fact about the feature that something
 * outside it needs. It sits beside the feature's main module as
 * `<main>.manifest.ts` and holds data only — the build evaluates it in Node
 * (scripts/read-manifests.cjs) to order the features and their stylesheets,
 * to check the switches, and to hand the smoke run its coverage table; the
 * browser half receives the runtime fields through the generated registry.
 */
export type FeatureManifest = FeatureFields & FeatureSwitch

/** Exactly one of `pref` and `ungated` (D29). */
export type FeatureSwitch =
  | { /** The preference that decides whether the reader gets the feature. */ pref: keyof Prefs, ungated?: never }
  | { /** Why the feature has no switch. */ ungated: string, pref?: never }

export interface FeatureFields {
  /** The install name: the failure report, the teardown and `retire()` use it. */
  id: string
  /** The name the feature's handle registers on `ui`, when it differs from `id` (settings → settingsNav). */
  handle?: string
  /** Install order, and with it the scheduler's pass order: ascending, unique. */
  order: number
  /** The plugin implementing the same behaviour: while it is on the page the feature stays uninstalled (D32). */
  yieldsTo?: PeerPlugin
  /** The feature's stylesheets, relative to its directory; `rank` places each one in the concatenated sheet. */
  stylesheets: FeatureStylesheet[]
  /** The settings row of the switch this feature owns; a preference shared by several features is owned by one. */
  switchRow?: FeatureSwitchRow
  /** The smoke cases that cover the feature (`npm run smoke -- --feature <dir>`). */
  cases: string[]
  /**
   * The host contract's entries this feature's own modules name
   * (src/contracts/table.ts, D44): the answer to "what breaks if the host
   * changes this", and the build refuses an entry no manifest claims.
   */
  contracts: string[]
  /** What the feature does, for a reader: the README's feature paragraphs (D48). */
  description: { zh: FeatureCopy, en: FeatureCopy }
}

/** The other plugins a feature can yield to. */
export type PeerPlugin = 'dsh-chat-ux'

export interface FeatureStylesheet {
  file: string
  /** Position in the concatenated stylesheet, shared with the theme's sheets (scripts/build.mjs). Unique. */
  rank: number
  /** The composer rules are gated (D4). */
  gate?: boolean
}

/** A line of settings copy: its key in the model copy document and the English fallback. */
export interface SettingsCopyLine {
  key: string
  fallback: string
}

/** The settings tabs, by id (packages/client/src/features/settings/settings-tab-*.ts). */
export type SettingsTabId = 'general' | 'appearance' | 'composer' | 'sidebar' | 'conversation'

export interface FeatureSwitchRow {
  tab: SettingsTabId
  /** Position among the tab's rows, shared with the rows the tab writes itself. */
  rank: number
  title: SettingsCopyLine
  desc: SettingsCopyLine
}

export interface FeatureCopy {
  title: string
  text: string
}

/** The manifest fields the browser half reads. */
export type FeatureRuntime = Pick<FeatureManifest, 'id' | 'handle' | 'order' | 'pref' | 'ungated' | 'yieldsTo' | 'switchRow'>

/** One installable feature: its runtime manifest fields and its main module's `install`. */
export interface Feature extends FeatureRuntime {
  install(ctx: HostContext, ui: Ui): (() => void) | void
}

/** The registry the entry installs from, kept for readers outside the install loop (the settings page). */
let registry: readonly Feature[] = []

export function setFeatureRegistry(features: readonly Feature[]) {
  registry = features
}

/** The features whose manifest places a switch row on this settings tab. */
export function switchRowFeatures(tab: SettingsTabId) {
  return registry.filter((feature): feature is Feature & { pref: keyof Prefs, switchRow: FeatureSwitchRow } => feature.switchRow?.tab === tab)
}

/** Whether a feature reading this preference stands down right now for a plugin it yields to. */
export function prefYielded(pref: keyof Prefs) {
  return registry.some(feature => feature.pref === pref && feature.yieldsTo !== undefined && peerPresent(feature.yieldsTo))
}
