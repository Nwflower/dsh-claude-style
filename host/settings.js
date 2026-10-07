/**
 * The settings surface: the preferences schema the host's settings domain
 * derives its form from, and the registration that hands it over.
 *
 * The host derives every settings form from the profile entry's Config and
 * exposes only the fields marked `.volatile()`; the schema resolution is
 * defensive because a `link:`-installed plugin resolves its realpath outside
 * the profile tree (see resolveSchemaFactory). A host that cannot resolve the
 * package still loads the skin — it just loses the settings form.
 */

/**
 * The preference list. This one table is every field declaration: the Config
 * below is generated from it, and scripts/build.mjs imports it to hold the
 * browser half's PREF_DEFAULTS (src/constants.ts) and src/entry.ts's feature
 * switches to it.
 */
export const PREFS_DEFAULT = Object.freeze({
  brand: 'claude',
  motion: 'system',
  collapseFooter: true,
  autoPopover: 'all',
  composerScope: 'all',
  modelPicker: true,
  quickProviders: [],
  username: '',
  banLocale: 'en',
  homeLayout: 'studio',
  palette: 'claude',
  typeface: 'claude',
  mascot: 'brand',
  mascotScope: 'all',
  permissionsControl: true,
  workspaceView: true,
  sidebarSearch: true,
  turnStatus: true,
  turnNav: true,
  viewTabs: true,
  chatAnimations: true,
  caretMotion: 'typing',
})

/**
 * The schemastery instance the HARNESS itself resolves.
 *
 * A plugin installed by link (`link:D:/…`) resolves its realpath outside the
 * profile tree, so Node never walks the profile's `node_modules` and the plain
 * import fails outright — and the copy the profile's interception layer would
 * offer can belong to a DIFFERENT installation (the Desktop bundle's 3.18.2,
 * which has no `.volatile()`). The harness always carries schemastery beside
 * its own bin, and that copy is the instance the settings domain validates
 * forms against, so it is asked for first; normal resolution stays as the
 * fallback for a plainly installed plugin.
 *
 * @returns the schema factory, or null when neither path resolves.
 */
async function resolveSchemaFactory() {
  try {
    const { createRequire } = await import('node:module')
    const anchor = typeof process.argv[1] === 'string' && process.argv[1] !== '' ? process.argv[1] : process.execPath
    const factory = createRequire(anchor)('@deepseek-ai/schemastery')
    if (factory !== null && factory !== undefined && typeof factory.object === 'function') return factory
  } catch { /* the anchor carries no schemastery: try normal resolution */ }
  try {
    const module = await import('@deepseek-ai/schemastery')
    return module?.default ?? module?.Schema ?? null
  } catch {
    return null
  }
}

const SchemaFactory = await resolveSchemaFactory()

/** Mark one field editable by the settings page, where the factory supports it. */
function volatileField(field) {
  return typeof field?.volatile === 'function' ? field.volatile() : field
}

/**
 * One typed Config field for one preference. The default's own type picks the
 * field type (an array is an array of strings), so PREFS_DEFAULT stays the
 * only field list.
 */
function prefsField(Schema, key) {
  const value = PREFS_DEFAULT[key]
  const field = Array.isArray(value)
    ? Schema.array(Schema.string())
    : typeof value === 'boolean' ? Schema.boolean() : Schema.string()
  return field.default(value)
}

/**
 * The declared Config.
 *
 * The host derives every settings form from the profile entry's Config and
 * exposes only the fields marked `.volatile()`, so the preferences are
 * declared here. schemastery grew `volatile()` in 3.18.3 and the desktop
 * bundle ships 3.18.2, so the marker is applied only when the installed
 * factory provides it.
 *
 * The import is guarded and top-level-awaited (docs/decisions D10): a
 * host that cannot resolve schemastery must still load the skin — it just
 * loses the settings form.
 *
 * Field types stay permissive (plain string / boolean / array) on purpose: a
 * union resolves by rejection, so one stale value left in the profile patch by
 * an older build would fail resolution for the whole entry. The accepted sets
 * are enforced where they are consumed — the browser half clamps everything it
 * reads.
 */
export const Config = SchemaFactory === null
  ? undefined
  : SchemaFactory.object(Object.fromEntries(
      Object.keys(PREFS_DEFAULT).map(key => [key, volatileField(prefsField(SchemaFactory, key))]),
    ))

/**
 * Register the settings surface: the skin ships its own settings page, which
 * is what `configure({ auto: false })` says — without it a client that
 * projects pages from the schema would grow a second page beside ours.
 *
 * The wait is declarative (`ctx.inject`) because `settings` may mount after
 * this plugin. The inject callback deliberately returns nothing — a plain
 * object throws "Invalid effect" and would take the whole plugin down.
 *
 * @param ctx - host plugin context.
 */
export function registerSettings(ctx) {
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['settings'], (scope) => {
    const settings = scope.settings
    if (typeof settings?.configure !== 'function') return
    scope.effect(
      () => settings.configure({ auto: false }, ctx.fiber),
      'dsh-claude-style: settings presentation',
    )
  })
}
