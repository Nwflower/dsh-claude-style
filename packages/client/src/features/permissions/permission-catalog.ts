import { PERMISSION_ACCESS_NAMESPACE, PERMISSION_CHINESE_LABELS, PERMISSION_CURRENT_LABELS, PERMISSION_HOST_LABEL_KEYS, PERMISSION_HOST_LABEL_LOCALE, PERMISSION_ORDER, PERMISSION_PRESETS, PERMISSION_SEGMENTS, PERMISSION_SHIPPED_PRESETS } from './permission-copy'
import { hostLocale, hostRemote, hostRemotePermissionPresets } from '@dsh-claude-style/engine/host'
import { activeLocale, localized } from '../../core/i18n'
import type { HostContext, HostFiber } from '@dsh-claude-style/engine/host'
import type { HostPermissionCatalogAnswer, HostPermissionOption } from '@dsh-claude-style/contracts/services'

/**
 * The permission catalog and the words the control reads off it: the read of
 * the host's `remote.permissionPresets`, the retry that carries it over a
 * client connection still coming up, and the resolution of a preset's name
 * and line from the host's own dictionary, the skin's table and the catalog
 * (D43). A failure is kept and handed out for the feature's sync to throw,
 * which retires the control and hands the shipped access button back (D12).
 */
export interface PermissionCatalog {
  /** Wait for the namespace declaratively and re-read on its change event. */
  start(): void
  /** Read the catalog now (the cold start screen re-reads on every return). */
  probe(): void
  /** Release the inject fiber and the change-event subscription. */
  dispose(): void
  /** The first catalog failure, for the feature's sync to throw (D12). */
  error(): Error | null
  /** The preset a new session starts in, or null before a read settles. */
  coldStartPreset(): string | null
  /** Whether a catalog read has settled (the shipped built-ins stand in before). */
  hasCatalog(): boolean
  /** The name a preset reads as: the host's own Chinese name first, then the skin's table, then the host's catalog. */
  presetLabel(preset: string): string
  /** The one line under that name, from the same two sources. */
  presetDesc(preset: string): string
  /** The name the control reads before a session's preset is known. */
  restingLabel(): string
  /** Every preset the control offers, in the order its rows list them. */
  offeredPresets(): string[]
  /** The segments to draw: each slot bound to the first of its presets the host offers. */
  resolvedSegments(): { label: string, preset: string }[]
}

/**
 * Read the host's permission catalog once per install: the feature's install
 * calls `start`, its pass calls the resolvers, and its teardown calls
 * `dispose` (features/permissions/permissions.ts).
 */
export function createPermissionCatalog(ctx: HostContext, schedule: () => void): PermissionCatalog {
  /**
   * The host's permission catalog: every preset this deployment offers, in
   * the host's order, or null before the first read settles. It is the
   * authority on what is switchable — a third-party plugin's preset rides
   * in it — while PERMISSION_PRESETS decides how a known one reads.
   */
  let catalogOptions: HostPermissionOption[] | null = null
  /**
   * The preset a new session starts in (the catalog's `defaultPreset`: the
   * configured default, or the one the host infers). The cold start screen
   * has no session to read a preset from, so its segments show this one.
   * null until a catalog read settled.
   */
  let defaultPreset: string | null = null
  /** The first catalog failure; thrown on the next sync to retire the feature. */
  let autoPresetError: Error | null = null
  let catalogFiber: HostFiber | null = null
  let catalogChangedDisposer: (() => void) | null = null

  /** The catalog's entry for one preset, or null. */
  function catalogOption(preset: string): HostPermissionOption | null {
    if (catalogOptions === null) return null
    for (let i = 0; i < catalogOptions.length; i++) {
      const option = catalogOptions[i]
      if (option !== null && typeof option === 'object' && option.value === preset) return option
    }
    return null
  }

  /**
   * Whether the host offers a preset. Until the first read settles the
   * shipped built-ins stand in, which is what the control drew before the
   * catalog existed; a preset the catalog does not carry is not drawn at
   * all, so a deployment that configures fewer presets gets fewer rows
   * rather than dead ones.
   */
  function presetOffered(preset: string) {
    if (catalogOptions === null) return PERMISSION_SHIPPED_PRESETS.includes(preset)
    return catalogOption(preset) !== null
  }

  /** Whether the interface language reads the host's own tier dictionary (D43). */
  function readsHostTierNames() {
    return activeLocale(ctx).startsWith(PERMISSION_HOST_LABEL_LOCALE)
  }

  /**
   * The host's own name for a tier, or '' when the skin's table answers. Claude
   * names the tiers in English and a Chinese interface shows the host's original
   * Chinese names instead. A host that mounts no locale service, and one that
   * never registers the namespace — whose translate seat then answers with the
   * key itself — both leave the skin's table in charge, and so does an entry the
   * host never translated (its `auto.label` is the English name in every
   * language).
   */
  function hostPresetLabel(preset: string): string {
    const key = PERMISSION_HOST_LABEL_KEYS[preset]
    if (key === undefined || !readsHostTierNames()) return ''
    const locale = hostLocale(ctx)
    if (typeof locale?.bind !== 'function') return ''
    const text: string = locale.bind(PERMISSION_ACCESS_NAMESPACE)(key)
    if (typeof text !== 'string' || text === '' || text === key) return ''
    const known = PERMISSION_PRESETS[preset]
    return known !== undefined && known.label === text ? '' : text
  }

  /** The name a preset reads as: the host's own Chinese name first, then the skin's table, then the host's catalog. */
  function presetLabel(preset: string): string {
    const hostName = hostPresetLabel(preset)
    if (hostName !== '') return hostName
    const known = PERMISSION_PRESETS[preset]
    if (known !== undefined) {
      // A Chinese interface takes the skin's own Chinese name where it carries
      // one (PERMISSION_CHINESE_LABELS); the English name is for every other
      // language, and for a tier the host translates itself.
      const chinese = readsHostTierNames() ? PERMISSION_CHINESE_LABELS[preset] : undefined
      return chinese === undefined ? known.label : chinese
    }
    const option = catalogOption(preset)
    if (option !== null && typeof option.name === 'string' && option.name !== '') return option.name
    const current = PERMISSION_CURRENT_LABELS[preset]
    return current === undefined ? preset : current
  }

  /** The name the control reads before a session's preset is known: the tier the host starts a session in. */
  function restingLabel(): string {
    return presetLabel('workspace-write')
  }

  /**
   * The one line under that name, in the shell's language, from the same two
   * sources: the skin's own line for a preset it knows, the catalog's
   * description for one it does not. A language the skin ships no line for
   * reads the English one (core/i18n.ts, COPY_FALLBACK_LOCALE).
   */
  function presetDesc(preset: string): string {
    const known = PERMISSION_PRESETS[preset]
    if (known !== undefined) return localized(known.desc, ctx)
    const option = catalogOption(preset)
    return option !== null && typeof option.description === 'string' ? option.description : ''
  }

  /** Every preset the control offers, in the order its rows list them. */
  function offeredPresets() {
    let i
    if (catalogOptions === null) return PERMISSION_SHIPPED_PRESETS.slice()
    const offered: string[] = []
    for (i = 0; i < catalogOptions.length; i++) {
      const option = catalogOptions[i]
      if (option === null || typeof option !== 'object') continue
      if (typeof option.value !== 'string' || option.value === '') continue
      if (!offered.includes(option.value)) offered.push(option.value)
    }
    // The skin's order for the presets it knows; anything else the host
    // offers follows in the host's own order.
    const ordered = []
    for (i = 0; i < PERMISSION_ORDER.length; i++) {
      if (offered.includes(PERMISSION_ORDER[i])) ordered.push(PERMISSION_ORDER[i])
    }
    for (i = 0; i < offered.length; i++) {
      if (!ordered.includes(offered[i])) ordered.push(offered[i])
    }
    return ordered
  }

  /** The segments to draw: each slot bound to the first of its presets the host offers. */
  function resolvedSegments() {
    const out = []
    for (let i = 0; i < PERMISSION_SEGMENTS.length; i++) {
      const slot = PERMISSION_SEGMENTS[i]
      for (let j = 0; j < slot.presets.length; j++) {
        if (!presetOffered(slot.presets[j])) continue
        out.push({ label: slot.label, preset: slot.presets[j] })
        break
      }
    }
    return out
  }

  /**
   * Read the host's permission catalog into `catalogOptions`, and which
   * preset a new session starts in into `defaultPreset`. The shipped
   * picker builds its rows from the same catalog, so it is the authority on
   * what is switchable — including presets a third-party plugin registered.
   * A rejected read retries like the account profile's reads (the client
   * connection may still be coming up at install); once the retries are
   * exhausted the failure is remembered and thrown on the next sync, which
   * retires this feature and hands the shipped access button back (D12).
   */
  const AUTO_PRESET_RETRY_MS = [1000, 5000]
  let autoPresetRetries = 0
  let autoPresetRead = 0
  let autoPresetRetry: ReturnType<typeof setTimeout> | null = null

  /** Invalidate the read in flight and drop any retry still waiting. */
  function dropAutoPresetRead() {
    autoPresetRead++
    if (autoPresetRetry !== null) {
      clearTimeout(autoPresetRetry)
      autoPresetRetry = null
    }
  }

  function probeAutoPreset() {
    const namespace = hostRemotePermissionPresets(ctx)
    if (typeof namespace?.catalog !== 'function') {
      if (typeof ctx.inject !== 'function') {
        autoPresetError = new Error('permission: the host exposes no remote.permissionPresets catalog')
        schedule()
      }
      return
    }
    dropAutoPresetRead()
    const read = autoPresetRead
    namespace.catalog().then((result: HostPermissionCatalogAnswer) => {
      if (read !== autoPresetRead) return
      if (result === null || typeof result !== 'object' || result.ok !== true ||
          result.value === null || typeof result.value !== 'object' ||
          !Array.isArray(result.value.options) || typeof result.value.defaultPreset !== 'string') {
        autoPresetError = new Error('permission: unexpected permissionPresets catalog shape')
        schedule()
        return
      }
      autoPresetRetries = 0
      autoPresetError = null
      // The whole option list is kept, not just whether one preset is in
      // it: the rows and the segments are built from what the host serves.
      catalogOptions = result.value.options.slice()
      defaultPreset = result.value.defaultPreset
      schedule()
    }, () => {
      if (read !== autoPresetRead) return
      if (autoPresetRetries >= AUTO_PRESET_RETRY_MS.length) {
        autoPresetError = new Error(`permission: the permissionPresets catalog read failed ${AUTO_PRESET_RETRY_MS.length + 1} times`)
        schedule()
        return
      }
      autoPresetRetry = setTimeout(() => {
        autoPresetRetry = null
        probeAutoPreset()
      }, AUTO_PRESET_RETRY_MS[autoPresetRetries++])
    })
  }

  /**
   * The namespace may register after this plugin (the host registers each
   * remote namespace as its package loads), so wait for it the way the
   * account row waits for remote.account; a host without inject gets one
   * read now. The catalog-changed event re-reads when the auto-review
   * integration is registered or dropped while the page stays open.
   */
  function startAutoPresetProbe() {
    if (typeof ctx.inject === 'function') {
      catalogFiber = ctx.inject(['remote.permissionPresets'], scope => {
        scope.effect(() => {
          probeAutoPreset()
          return () => {}
        }, 'dsh-claude-style: permission catalog')
      })
    } else {
      probeAutoPreset()
    }
    const remoteRoot = hostRemote(ctx)
    if (typeof remoteRoot?.$on === 'function') {
      catalogChangedDisposer = remoteRoot.$on('permission-presets/catalog-changed', () => {
        probeAutoPreset()
      })
    }
  }

  return {
    start: startAutoPresetProbe,
    probe: probeAutoPreset,
    dispose() {
      dropAutoPresetRead()
      if (catalogFiber !== null && typeof catalogFiber.dispose === 'function') {
        catalogFiber.dispose()
        catalogFiber = null
      }
      if (catalogChangedDisposer !== null) {
        catalogChangedDisposer()
        catalogChangedDisposer = null
      }
    },
    error: () => autoPresetError,
    coldStartPreset: () => defaultPreset,
    hasCatalog: () => catalogOptions !== null,
    presetLabel,
    presetDesc,
    restingLabel,
    offeredPresets,
    resolvedSegments,
  }
}
