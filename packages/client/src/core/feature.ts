import type * as React from 'react'
import type { Prefs } from '../constants'
import { peerPresent } from '../shared/peer-plugin'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { CopyEntries } from './i18n'
import type { SchedulerCalls } from '@dsh-claude-style/engine/scheduler'
import type { HandleName, Handles, Ui } from './scheduler'

/** Data-only manifests are evaluated by the build and projected into the browser registry (D72). */
export type FeatureManifest = FeatureIdentity & FeatureFields & FeatureSwitch

/** Exactly one of `pref` and `ungated`; preference flips install or tear down live (D76). */
export type FeatureSwitch =
  | {
      pref: keyof Prefs
      /** Choice values outside this list tear the feature down. */
      prefValues?: string[]
      ungated?: never
    }
  | { /** Why this feature has no switch despite reading preferences. */ ungated: string, pref?: never }

/** Settings uses `settingsNav` so a failed sync stops navigation without removing its page. */
export type FeatureIdentity =
  | { id: HandleName, handle?: never }
  | { id: 'settings', handle: HandleName }

export interface FeatureFields {
  /** Undeclared handle reads fail the type check (D72). */
  reads?: HandleName[]
  /** Unique ascending install and scheduler pass order. */
  order: number
  /** Stay uninstalled while this peer owns the behaviour (D74). */
  yieldsTo?: PeerPlugin
  /** Deferred features must be unnecessary for the first frames (D72). */
  load?: 'deferred'
  stylesheets: FeatureStylesheet[]
  /** Each preference has one owning settings row (D72). */
  settingsRows?: FeatureSettingsRow[]
  cases: string[]
  /** End-to-end scenarios that guard this feature (D92). */
  scenarios?: string[]
  /** The build refuses host contract entries no manifest claims (D3). */
  contracts: string[]
}

export type PeerPlugin = 'dsh-chat-ux'

export type FeatureStylesheet = FeatureStylesheetFile | FeatureStylesheetGenerated

export interface FeatureStylesheetFile {
  file: string
  /** Unique rank across feature and theme sheets. */
  rank: number
  /** Whether composer rules need the build gate (D9). */
  gate?: boolean
  /** Surface sheets ship separately to survive ds-bot's ownership (D74). */
  scope?: 'surface'
}

/** Names a generator in scripts/build/feature-sheets.mjs. */
export interface FeatureStylesheetGenerated {
  generated: string
  rank: number
}

export type SettingsTabId = 'general' | 'appearance' | 'main-window' | 'sidebar' | 'motion'

export type SettingsGroupId = 'conversation' | 'composer' | 'statistics'

export type SettingsRowSlot = SettingsTabId | SettingsGroupId

/** Copy keys and control types must match the preference declaration (D72). */
export interface FeatureSettingsRow {
  tab: SettingsRowSlot
  /** Rank is shared with rows written by the settings feature. */
  rank: number
  pref: keyof Prefs
  title?: string
  desc?: string
  /** Values without labels show their bare ids. */
  choiceLabels?: Readonly<Record<string, string>>
  /** A child row is disabled while its parent or owner cannot act. */
  parent?: keyof Prefs
  /**
   * `header` seats the row's control in the title line of the row `parent`
   * names, across from that row's text, instead of giving it a row of its own;
   * the title becomes the control's accessible name. The row carries a title
   * and a plain control and no description, status line, own control or
   * requirement, because the header has no line to show them on.
   */
  placement?: 'header'
  requires?: FeatureRowRequirement
  /** Other platforms show the stored choice but refuse input. */
  windowsOnly?: boolean
  /** Reduced motion swaps previews for distinguishable stills without disabling the choice. */
  stillWhenReduced?: boolean
  /** Names a feature module collected by the settings build (D72). */
  control?: string
  /** Values outside this pair display as off and remain stored until flipped. */
  switch?: { on: string, off: string }
  /** Names a feature module that renders live status. */
  status?: string
  experimental?: boolean
}

/** Unmet requirements preserve the stored choice, disable input and show `note`. */
export interface FeatureRowRequirement {
  pref: keyof Prefs
  values: readonly string[]
  note: string
}

export interface SettingsRowView {
  prefs: Prefs
  write(patch: Partial<Prefs>): void
  disabled: boolean
}

/** One feature's own row controls, by the name its manifest gives each row. */
export type SettingsRowControls = Readonly<Record<string, React.ComponentType<SettingsRowView>>>

/** The names a manifest's `settingsRows` give their own controls and status lines. */
export type RowControlNames<M> = M extends { settingsRows: readonly (infer R)[] }
  ? (R extends { control: infer C extends string } ? C : never) | (R extends { status: infer S extends string } ? S : never)
  : never

/**
 * The controls one feature's settings module exports, keyed by the names its
 * own manifest gives: a name the manifest does not carry, or one it carries and
 * the record leaves out, fails the type check (D72).
 */
export type SettingsControlsOf<M> = Record<RowControlNames<M>, React.ComponentType<SettingsRowView>>

/** The manifest fields the browser half reads. */
export type FeatureRuntime = FeatureIdentity & Pick<FeatureFields, 'order' | 'yieldsTo' | 'settingsRows'> & {
  pref?: keyof Prefs
  prefValues?: string[]
  ungated?: string
  /** Settings copy remains available while the feature is uninstalled (D72). */
  copy?: CopyEntries
}

/** A feature main module's `install`. */
export type FeatureInstall = (ctx: HostContext, ui: Ui) => (() => void) | void

/** A feature carries either `install` or its deferred chunk address (D72). */
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
 * handle and the handles its manifest `reads` (D72). Its install takes `ui` as
 * `FeatureUi<typeof manifest>`, with the manifest imported as a type.
 */
export type FeatureUi<M> = SchedulerCalls & { [K in OwnHandle<M> | ReadHandles<M>]?: Handles[K] }

/** The registry the entry installs from, kept for readers outside the install loop (the settings page). */
let registry: readonly Feature[] = []

export function setFeatureRegistry(features: readonly Feature[]) {
  registry = features
}

/** One settings row in a slot, with the feature that owns it (its copy carries the row's lines). */
export function settingsRowsOf(slot: SettingsRowSlot) {
  const out: { feature: Feature, row: FeatureSettingsRow }[] = []
  for (const feature of registry) {
    for (const row of feature.settingsRows ?? []) if (row.tab === slot) out.push({ feature, row })
  }
  return out
}

/** The rows whose control stands in the header of the row `parent` names (FeatureSettingsRow.placement). */
export function headerRowsOf(parent: keyof Prefs) {
  const out: { feature: Feature, row: FeatureSettingsRow }[] = []
  for (const feature of registry) {
    for (const row of feature.settingsRows ?? []) if (row.placement === 'header' && row.parent === parent) out.push({ feature, row })
  }
  return out
}

/** Whether a feature reading this preference stands down right now for a plugin it yields to. */
export function prefYielded(pref: keyof Prefs) {
  return registry.some(feature => feature.pref === pref && feature.yieldsTo !== undefined && peerPresent(feature.yieldsTo))
}
