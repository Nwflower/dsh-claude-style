import type * as React from 'react'
import type { Prefs } from '../constants'
import { peerPresent } from '../shared/peer-plugin'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { CopyEntries } from './i18n'
import type { SchedulerCalls } from '@dsh-claude-style/engine/scheduler'
import type { HandleName, Handles, Ui } from './scheduler'

/**
 * A feature's manifest (D72): every fact about the feature that something
 * outside it needs. It sits beside the feature's main module as
 * `<main>.manifest.ts` and holds data only — the build evaluates it in Node
 * (scripts/shared/read-manifests.cjs) to order the features and their stylesheets,
 * to check the switches, and to hand the smoke run its coverage table; the
 * browser half receives the runtime fields through the generated registry.
 */
export type FeatureManifest = FeatureIdentity & FeatureFields & FeatureSwitch

/** Exactly one of `pref` and `ungated` (D76). */
export type FeatureSwitch =
  | {
      /**
       * The preference that decides whether the reader gets the feature, live:
       * a flip installs or tears it down without a reload (D76).
       */
      pref: keyof Prefs
      /**
       * The preference values the feature runs under, for a choice switch: a
       * value outside the list runs its teardown. A boolean switch leaves this
       * out and is on unless stored as `false`.
       */
      prefValues?: string[]
      ungated?: never
    }
  | { /** Why the feature has no switch, for a feature that reads preferences while installed itself. */ ungated: string, pref?: never }

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
   * (D72). Its modules see `ui` as FeatureUi of this manifest, so a read
   * the manifest does not declare fails the type check.
   */
  reads?: HandleName[]
  /** Install order, and with it the scheduler's pass order: ascending, unique. */
  order: number
  /** The plugin implementing the same behaviour: while it is on the page the feature stays uninstalled (D74). */
  yieldsTo?: PeerPlugin
  /**
   * `'deferred'`: the feature's own modules leave the bundle for a chunk of
   * their own, fetched once the page is taken and installed when it arrives
   * (D72). Only for a feature the first frames can do without.
   */
  load?: 'deferred'
  /** The feature's stylesheets, relative to its directory; `rank` places each one in the concatenated sheet. */
  stylesheets: FeatureStylesheet[]
  /**
   * The settings rows this feature owns (D72): each writes one preference, and
   * the settings page assembles them by slot — a tab, or one of the main
   * window's groups — and rank with the rows it writes itself. A preference is
   * written by one row, in the feature it belongs to.
   */
  settingsRows?: FeatureSettingsRow[]
  /** The smoke cases that cover the feature (`npm run smoke -- --feature <dir>`). */
  cases: string[]
  /**
   * The host contract's entries this feature's own modules name
   * (packages/contracts/src/table.ts, D3): the answer to "what breaks if the host
   * changes this", and the build refuses an entry no manifest claims.
   */
  contracts: string[]
}

/** The other plugins a feature can yield to. */
export type PeerPlugin = 'dsh-chat-ux'

/** A written stylesheet, or one the build writes from constants.ts. */
export type FeatureStylesheet = FeatureStylesheetFile | FeatureStylesheetGenerated

export interface FeatureStylesheetFile {
  file: string
  /** Position in the concatenated stylesheet, shared with the theme's sheets (scripts/build.mjs). Unique. */
  rank: number
  /** The composer rules are gated (D9). */
  gate?: boolean
  /**
   * `'surface'`: the sheet is scoped to `body[data-dsh-claude-surface]` and
   * ships apart from the theme's sheet, so it stays while ds-bot's surface has
   * the page (D74).
   */
  scope?: 'surface'
}

/** A sheet of one rule per entry of a table the code reads too: its generator's name in scripts/feature-sheets.mjs. */
export interface FeatureStylesheetGenerated {
  generated: string
  rank: number
}

/**
 * The settings tabs, by id (packages/client/src/features/settings/settings-tab-*.ts).
 */
export type SettingsTabId = 'general' | 'appearance' | 'main-window' | 'sidebar' | 'motion'

/**
 * The groups the main-window tab draws, by id: the conversation side, the
 * composer's controls, and the context and cost figures under the composer,
 * each under its own label
 * (packages/client/src/features/settings/settings-tab-main-window.ts).
 */
export type SettingsGroupId = 'conversation' | 'composer' | 'statistics'

/** Where a settings row stands: a tab of the strip, or one of the main window's groups. */
export type SettingsRowSlot = SettingsTabId | SettingsGroupId

/**
 * One settings row a feature owns (D72). The control follows the preference's
 * own declaration (packages/contracts/src/prefs.ts): a boolean is an on/off
 * switch, a choice a segmented control over the values the table carries. Every
 * line is a key in the feature's own copy (`<功能>.copy.json`).
 */
export interface FeatureSettingsRow {
  /** The tab, or the main window group, the row stands in. */
  tab: SettingsRowSlot
  /** Position among the tab's rows, shared with the rows the settings feature writes itself. */
  rank: number
  /** The preference the row writes. */
  pref: keyof Prefs
  /** The row's title, by key in the feature's own copy; a row whose own control is the whole row carries none. */
  title?: string
  /** The line under the title; a row whose own control is the explanation carries none. */
  desc?: string
  /** A choice preference's labels: the copy key of each value. A value left out is drawn with its bare id. */
  choiceLabels?: Readonly<Record<string, string>>
  /**
   * The preference whose row this row stands under: it is drawn indented, with
   * no hairline between them, and refuses input while that preference is off
   * (`false`, or a choice's own `off`) or while the row above it cannot act at
   * all — a requirement of its own unmet, or an owner that yields the page.
   */
  parent?: keyof Prefs
  /** The preference the row's control only works under (D72). */
  requires?: FeatureRowRequirement
  /**
   * The row acts on the Windows desktop window alone: on any other page it
   * keeps the stored choice on show, refuses input and says where it acts
   * (packages/engine/src/desktop-band.ts).
   */
  windowsOnly?: boolean
  /**
   * The row's cards show a motion: while the animation choice resolves to
   * reduced they stand as stills that still tell the choices apart, the row
   * says so, and the choice stays editable.
   */
  stillWhenReduced?: boolean
  /**
   * The feature's own module that draws this row's control, beside its main
   * module: a preview card, a picker or an editor the generic switch cannot
   * draw. The build collects these modules for the settings page (D72).
   */
  control?: string
  /**
   * A choice preference drawn as an on/off switch: the value each side of the
   * switch writes. A stored value outside the two is drawn as off, and stays
   * stored until the reader flips the switch.
   */
  switch?: { on: string, off: string }
  /**
   * The feature's own module that draws a live line under the row's title,
   * beside its main module like `control`: what the feature is doing on the
   * page right now, which no fixed description can say.
   */
  status?: string
  /** The row carries the host's experimental tag beside its title: the feature is on show but not settled. */
  experimental?: boolean
}

/**
 * Another preference a row's control only works under: while that preference
 * holds none of `values` the row keeps the stored choice on show, refuses input
 * and says why with `note` under its description.
 */
export interface FeatureRowRequirement {
  pref: keyof Prefs
  values: readonly string[]
  /** The line the row shows while the requirement is unmet, by key in the feature's own copy. */
  note: string
}

/**
 * What a feature's own settings row control is rendered with (D72): the
 * preferences on show, the page's own write path, and whether the row can act
 * at all right now (it yields for another plugin, a requirement is unmet, or
 * the switch it stands under is off).
 */
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
  /**
   * The feature's own copy, for the settings page: a feature that declares
   * settings rows carries its lines so the page can label them whether the
   * feature is installed or not (D72).
   */
  copy?: CopyEntries
}

/** A feature main module's `install`. */
export type FeatureInstall = (ctx: HostContext, ui: Ui) => (() => void) | void

/**
 * One installable feature: its runtime manifest fields beside its main
 * module's `install`, or beside the address of the chunk that carries it (D72).
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

/** Whether a feature reading this preference stands down right now for a plugin it yields to. */
export function prefYielded(pref: keyof Prefs) {
  return registry.some(feature => feature.pref === pref && feature.yieldsTo !== undefined && peerPresent(feature.yieldsTo))
}
