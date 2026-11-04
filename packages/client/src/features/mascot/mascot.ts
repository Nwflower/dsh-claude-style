import { MASCOT_CRAB, MASCOT_DEEPY, MASCOT_SCOPE_ALL, MASCOT_WHALEGIRL } from '../../constants'
import { readPrefs, resolveMascot } from '../../core/prefs'
import { createMascotCrab } from './crab'
import { createMascotWhaleGirl } from './whale-girl'
import { createMascotWhale } from './whale'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './mascot.manifest'

/**
 * The mascot on the composer: Claude Code's pixel crab
 * (packages/client/src/features/mascot/crab.ts), Deepy, the DeepSeek brand's pixel whale
 * (packages/client/src/features/mascot/whale.ts), or the pixel whale girl of the shipped
 * emoji set (packages/client/src/features/mascot/whale-girl.ts), all played by the agent's
 * state (packages/client/src/features/mascot/mascot-player.ts).
 *
 * Which one is out is the mascot preference, resolved onto <body> as
 * MASCOT_ATTR: "follow the brand" puts the crab under Claude and Deepy
 * under DeepSeek, and the reader may pick any of the three, or none. Where it
 * stands is the "where it appears" preference: the home page alone, or the home
 * page and the conversation. The other characters are released, so only one
 * mascot is ever on the page.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const crab = createMascotCrab(ctx, ui)
  const whale = createMascotWhale(ctx, ui)
  const whaleGirl = createMascotWhaleGirl(ctx, ui)

  function sync() {
    const prefs = readPrefs()
    const mascot = resolveMascot(prefs)
    const conversation = prefs.mascotScope === MASCOT_SCOPE_ALL
    if (mascot === MASCOT_CRAB) crab.sync(conversation)
    else crab.release()
    if (mascot === MASCOT_DEEPY) whale.sync(conversation)
    else whale.release()
    if (mascot === MASCOT_WHALEGIRL) whaleGirl.sync(conversation)
    else whaleGirl.release()
  }

  function onActivity() {
    crab.onActivity()
    whale.onActivity()
    whaleGirl.onActivity()
  }

  ui.mascot = { sync, onActivity }

  return () => {
    crab.dispose()
    whale.dispose()
    whaleGirl.dispose()
    delete ui.mascot
  }
}
