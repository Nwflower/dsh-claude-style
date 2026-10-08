import type { Prefs } from '../constants'
import { peerPresent } from '../shared/peer-plugin'
import type { HostContext } from './host'
import type { HandleName, Handles, Ui, UiCalls } from './scheduler'

/**
 * A feature's manifest (D42): every fact about the feature that something
 * outside it needs. It sits beside the feature's main module as
 * `<main>.manifest.ts` and holds data only — the build evaluates it in Node
 * (scripts/shared/read-manifests.cjs) to order the features and their stylesheets,
 * to check the switches, and to hand the smoke run its coverage table; the
 * browser half receives the runtime fields through the generated registry.
 */
export type FeatureManifest = FeatureIdentity & FeatureFields & FeatureSwitch

/** Exactly one of `pref` and `ungated` (D29). */
export type FeatureSwitch =
  | {
      /** The preference that decides whether the reader gets the feature. */
      pref: keyof Prefs
      /**
       * The preference values the feature runs under, for a choice switch
       * (`chatAnimations`): a value outside the list runs its teardown. A
       * boolean switch leaves this out and is on unless stored as `false`.
       */
      prefValues?: string[]
      ungated?: never
    }
  | { /** Why the feature has no switch. */ ungated: string, pref?: never }

/**
 * The install name — the failure report, the teardown and `retire()` use it —
 * and the name the feature's handle registers on `ui`. They are one name,
 * except for the settings page, whose handle is its navigation alone
 * (settingsNav): a failing sync stops the navigation and keeps the page.
 */
export type FeatureIdentity =
  | { id: HandleName, handle?: never }
  | { id: 'settings', handle: HandleName }

export interface FeatureFields {
  /**
   * The other features' handles this feature's modules read off `ui`
   * (D42). Its modules see `ui` as FeatureUi of this manifest, so a read
   * the manifest does not declare fails the type check.
   */
  reads?: HandleName[]
  /** Install order, and with it the scheduler's pass order: ascending, unique. */
  order: number
  /** The plugin implementing the same behaviour: while it is on the page the feature stays uninstalled (D32). */
  yieldsTo?: PeerPlugin
  /**
   * `'deferred'`: the feature's own modules leave the bundle for a chunk of
   * their own, fetched once the page is taken and installed when it arrives
   * (D39). Only for a feature the first frames can do without.
   */
  load?: 'deferred'
  /** The feature's stylesheets, relative to its directory; `rank` places each one in the concatenated sheet. */
  stylesheets: FeatureStylesheet[]
  /** The settings row of the switch this feature owns; a preference shared by several features is owned by one. */
  switchRow?: FeatureSwitchRow
  /** The smoke cases that cover the feature (`npm run smoke -- --feature <dir>`). */
  cases: string[]
  /**
   * The host contract's entries this feature's own modules name
   * (packages/contracts/src/table.ts, D44): the answer to "what breaks if the host
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
  /** The choices of a segmented control; without them the row is an on/off switch. */
  choices?: FeatureSwitchChoice[]
}

/** One choice of a switch row's segmented control: the stored value and its line of copy. */
export interface FeatureSwitchChoice {
  value: string
  label: SettingsCopyLine
}

export interface FeatureCopy {
  title: string
  text: string
}

/** The manifest fields the browser half reads. */
export type FeatureRuntime = FeatureIdentity & Pick<FeatureFields, 'order' | 'yieldsTo' | 'switchRow'> & { pref?: keyof Prefs, prefValues?: string[], ungated?: string }

/** A feature main module's `install`. */
export type FeatureInstall = (ctx: HostContext, ui: Ui) => (() => void) | void

/**
 * One installable feature: its runtime manifest fields beside its main
 * module's `install`, or beside the address of the chunk that carries it (D39).
 */
export type Feature = FeatureRuntime & ({ install: FeatureInstall, chunk?: never } | { chunk: string, install?: never })

/** The name a feature's handle registers under on `ui`. */
export function handleName(feature: FeatureIdentity): HandleName {
  return feature.handle === undefined ? feature.id : feature.handle
}

/** The handle a manifest's feature registers under. */
type OwnHandle<M> = M extends { handle: infer H extends HandleName } ? H : M extends { id: infer I extends HandleName } ? I : never

/** The handles a manifest says its feature reads. */
type ReadHandles<M> = M extends { reads: readonly (infer R extends HandleName)[] } ? R : never

/**
 * What one feature's modules see of `ui`: the two calls, the feature's own
 * handle and the handles its manifest `reads` (D42). Its install takes `ui` as
 * `FeatureUi<typeof manifest>`, with the manifest imported as a type.
 */
export type FeatureUi<M> = UiCalls & { [K in OwnHandle<M> | ReadHandles<M>]?: Handles[K] }

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
