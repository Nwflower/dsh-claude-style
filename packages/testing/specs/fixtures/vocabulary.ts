import type { SkinSeam } from '@dsh-claude-style/engine/skin'
import type { PartsVocabulary } from '@dsh-claude-style/engine/parts'

/** The vocabulary the specs hand the engine, the way a skin hands its own over (D73), so no spec leans on the skin's names. */
export const QUIET_ATTR = 'data-test-quiet'
export const READER_HOLD_ATTR = 'data-test-reader-hold'
/** Where a spec says which motion the reader asked for: `reduced` or anything else. */
export const MOTION_ATTR = 'data-test-motion'
export const MOTION_REDUCED = 'reduced'
export const MOTION_FULL = 'full'

export const TEST_SKIN: SkinSeam = {
  packageName: 'dsh-test-skin',
  quiet: QUIET_ATTR,
  readerHold: READER_HOLD_ATTR,
  motionReduced: () => document.body.getAttribute(MOTION_ATTR) === MOTION_REDUCED,
}

/** The marks the part walk writes under, and the anchors its three menu regions stand in. */
export const PART_ATTR = 'data-test-part'
export const HOLDS_ATTR = 'data-test-holds'
export const TEST_PARTS: PartsVocabulary = {
  part: PART_ATTR,
  holds: HOLDS_ATTR,
  regions: { account: 'data-test-account-menu', hero: 'data-test-hero-menu', more: 'data-test-more-menu' },
}
