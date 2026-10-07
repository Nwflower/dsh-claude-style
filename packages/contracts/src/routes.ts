/**
 * The plugin's private route names, shared by both halves (D46): the host half
 * registers them under this prefix and the browser half addresses them, so
 * every path is declared once.
 */

/** Route prefix this plugin owns. */
export const ROUTE_PREFIX = '/dsh-claude-style'

/** One-shot host OS user route; the browser half caches the response and never polls. */
export const USERNAME_PATH = `${ROUTE_PREFIX}/username`

/**
 * The HDSL launcher's account metadata. The browser half cannot read a process
 * environment, so the `HDSL_`-prefixed variables the launcher publishes are
 * forwarded from here; the player's avatar bytes ride HDSL_SKIN_PATH.
 */
export const HDSL_PATH = `${ROUTE_PREFIX}/hdsl`

/** The player's own avatar PNG, forwarded; the absolute path never leaves the host half. */
export const HDSL_SKIN_PATH = `${ROUTE_PREFIX}/hdsl-skin.png`

/**
 * Session deletion. The harness gives the browser half no deletion API of its
 * own, so the archived row's delete button posts one session id here and the
 * host half removes the stored session directory and drops the id from the
 * workspace registry's archive set.
 */
export const SESSION_DELETE_PATH = `${ROUTE_PREFIX}/session-delete`

/**
 * Cross-session usage roll-up for the home dashboard: the browser half cannot
 * reach the host's `sessionQuery` service or read the cost-meter ledger, so the
 * day buckets are assembled on the host half and handed over as one small JSON
 * document.
 */
export const USAGE_PATH = `${ROUTE_PREFIX}/usage`

/**
 * Message-content search for the search palette; `?q=` is the query, and
 * without one the route only brings its message cache up to date.
 */
export const SESSION_SEARCH_PATH = `${ROUTE_PREFIX}/session-search`
