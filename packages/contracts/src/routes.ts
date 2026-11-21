/** Private route names registered by the host and addressed by the browser (D73). */

/** The origin root the host registers this plugin's routes under. */
export const ROUTE_ROOT = '/dsh-claude-style'

/**
 * The document's own directory, which the served page resolves URLs against. The
 * host serves origin-root routes and never learns the mount (`dsh --public-url`
 * advertises only); behind a prefix-stripping proxy the same routes answer under
 * the mount, and the directory stays at the mount root across in-page navigation.
 * @param documentBase - the document's base URL.
 */
export function deployRootOf(documentBase: string): string {
  return new URL('.', documentBase).href
}

/** The document's base URL when this module runs in a browser; absent in Node. */
const DOCUMENT_BASE = (globalThis as unknown as { document?: { baseURI?: string } }).document?.baseURI

/** The browser's deployment root; null in Node, where the host half keeps the origin root. */
export const DEPLOY_ROOT = typeof DOCUMENT_BASE === 'string' ? deployRootOf(DOCUMENT_BASE) : null

/**
 * The route prefix under a deployment root: the origin root with no root (Node),
 * the mounted path otherwise. Pure so the contract spec judges both entries.
 * @param deployRoot - the document's directory, or null for the host's origin root.
 */
export function routePrefixUnder(deployRoot: string | null): string {
  return deployRoot === null ? ROUTE_ROOT : new URL(ROUTE_ROOT.slice(1), deployRoot).pathname
}

/** Route prefix this plugin owns: the origin root in Node, the mounted path in the browser. */
export const ROUTE_PREFIX = routePrefixUnder(DEPLOY_ROOT)

/**
 * Resolve a build-baked origin-root address against a deployment root. The build
 * bakes `${ROUTE_ROOT}/assets/…`; the leading slash is dropped so the address
 * resolves against the document's directory rather than the origin root.
 * @param baked - the origin-root address the build wrote.
 * @param deployRoot - the document's directory, or null to keep the baked address.
 */
export function assetUrlUnder(baked: string, deployRoot: string | null): string {
  return deployRoot === null ? baked : new URL(baked.replace(/^\/+/, ''), deployRoot).href
}

/** One-shot host OS user route; the browser half caches the response and never polls. */
export const USERNAME_PATH = `${ROUTE_PREFIX}/username`

/** Forwards the launcher's `HDSL_` environment metadata, which browser code cannot read. */
export const HDSL_PATH = `${ROUTE_PREFIX}/hdsl`

/** The player's own avatar PNG, forwarded; the absolute path never leaves the host half. */
export const HDSL_SKIN_PATH = `${ROUTE_PREFIX}/hdsl-skin.png`

/** Deletes stored session data and its archive id; the browser has no host deletion API. */
export const SESSION_DELETE_PATH = `${ROUTE_PREFIX}/session-delete`

/** Host-assembled usage roll-up; browser code cannot reach `sessionQuery` or the cost ledger. */
export const USAGE_PATH = `${ROUTE_PREFIX}/usage`

/** `?q=` searches message content; without it, the route only refreshes its cache. */
export const SESSION_SEARCH_PATH = `${ROUTE_PREFIX}/session-search`

/** Brand status; each stored image's version changes with its bytes (D97). */
export const BRAND_PATH = `${ROUTE_PREFIX}/brand`

/** The custom mark's bytes: `GET` serves them, `PUT` replaces them, `DELETE` removes them. */
export const BRAND_MARK_PATH = `${ROUTE_PREFIX}/brand/mark`

/** The custom wordmark's bytes, answered the same three ways as the mark. */
export const BRAND_WORDMARK_PATH = `${ROUTE_PREFIX}/brand/wordmark`

/** One named preset's image bytes, with `id`, `slot` and `ref` query parameters. */
export const BRANDING_ASSET_PATH = `${ROUTE_PREFIX}/branding/asset`
/** POST a preset record and appearance to read image states and invalid references. */
export const BRANDING_STATUS_PATH = `${ROUTE_PREFIX}/branding/status`
/** UI-owned palette and logo overlays, merged with file-defined base records. */
export const APPEARANCE_OVERLAY_PATH = `${ROUTE_PREFIX}/appearance-overlays`

/** `GET` returns the cached peak-rate catalog; `POST` refreshes it from the host-known source. */
export const PEAKRATE_PATH = `${ROUTE_PREFIX}/peakrate`

/** `GET` returns the price snapshot; `POST` refreshes it from the repository. */
export const PRICES_PATH = `${ROUTE_PREFIX}/prices`

/** `?id=` selects the session; the host prices its settlements without another plugin. */
export const SESSION_COST_PATH = `${ROUTE_PREFIX}/session-cost`

/** Serves whitelisted font files; optional faces are declared only after WEBFONTS_PATH reports them. */
export const FONT_FILES_PATH = `${ROUTE_PREFIX}/fonts/`

/** Lists optional font files present at the drop point; the browser declares only these (D75). */
export const WEBFONTS_PATH = `${ROUTE_PREFIX}/webfonts`

/** `GET` reports system-cue capability and `POST` plays one using OS files (D89). */
export const SOUND_PATH = `${ROUTE_PREFIX}/sound`

/** `?id=` selects the session; the answer is the session overview panel's folded data (D106). */
export const SESSION_PANEL_PATH = `${ROUTE_PREFIX}/session-panel`

/** `POST` with a session id compacts that session's own history through the host's compaction seam (D100). */
export const SESSION_COMPACT_PATH = `${ROUTE_PREFIX}/session-compact`

/** Fork-backed logical conversations, their rewind plans and confirmed commits (D105). */
export const SESSION_REVISIONS_PATH = `${ROUTE_PREFIX}/session-revisions`
export const SESSION_REWIND_PLAN_PATH = `${ROUTE_PREFIX}/session-rewind-plan`
export const SESSION_REWIND_COMMIT_PATH = `${ROUTE_PREFIX}/session-rewind-commit`
