/**
 * The module scripts/build.mjs generates while bundling (D36): build output
 * the source imports by name instead of reading it from text placeholders.
 */
declare module 'virtual:dsh-claude-style/generated' {
  /** The skin's stylesheet: the generated token sheet and the src/ stylesheets in order, the composer gate stamped (D4). */
  export const STYLESHEET: string
  /** Vendor lockup markup by brand id (packages/assets/src/icons/combine/). */
  export const COMBINE_SVGS: Record<string, string>
  /** The vendor's own word each lockup draws, by brand id. */
  export const COMBINE_WORDS: Record<string, string>
  /** A hash of the bundle, written in after bundling (D19). */
  export const BUILD_ID: string
  /** The version of the package this bundle was built from; the account Remote wants a client build version. */
  export const CLIENT_VERSION: string
  /** The address each of Deepy's sheets plays from, by animation name (D38). */
  export const DEEPY_SHEET_URLS: Record<string, string>
  /** The crab's sheets as data URIs by animation name: its body and its ink mask. */
  export const CRAB_SHEET_URLS: Record<string, { body: string, ink: string }>
}

/** The feature registry scripts/build.mjs generates from the manifests (D42), in install order. */
declare module 'virtual:dsh-claude-style/features' {
  export const FEATURES: import('./core/feature').Feature[]
}
