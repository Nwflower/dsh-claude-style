/** Private route names registered by the host and addressed by the browser (D73). */

/** Route prefix this plugin owns. */
export const ROUTE_PREFIX = '/dsh-claude-style'

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

/** Brand status; each stored image's version changes with its bytes (D30). */
export const BRAND_PATH = `${ROUTE_PREFIX}/brand`

/** The custom mark's bytes: `GET` serves them, `PUT` replaces them, `DELETE` removes them. */
export const BRAND_MARK_PATH = `${ROUTE_PREFIX}/brand/mark`

/** The custom wordmark's bytes, answered the same three ways as the mark. */
export const BRAND_WORDMARK_PATH = `${ROUTE_PREFIX}/brand/wordmark`

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

/** `?id=` selects the session; the answer is the session overview panel's folded data (D94). */
export const SESSION_PANEL_PATH = `${ROUTE_PREFIX}/session-panel`
