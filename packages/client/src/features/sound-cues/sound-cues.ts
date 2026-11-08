import { SOUND_CUE_COMPLETION, SOUND_CUE_PERMISSION, SOUND_GAIN } from '@dsh-claude-style/contracts/sound'
import { readPrefs } from '../../core/prefs'
import { createAttentionFeed } from './attention-feed'
import { createSoundPlayer } from './player'
import type { AttentionEvent } from './attention'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './sound-cues.manifest'

/** Two cues inside this window are one moment, and the permission cue takes it. */
const CUE_WINDOW_MS = 200

/**
 * The two quiet cues: Pop when a session starts waiting on the reader, Tink
 * when a top-level session stops running (D89). Both read the host's own
 * status; the host half plays the macOS system sounds, and the browser
 * synthesises them where it cannot.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const player = createSoundPlayer()
  let disposed = false
  let timer: number | null = null
  let pending = new Set<AttentionEvent>()

  function flush() {
    timer = null
    if (disposed) return
    const events = pending
    pending = new Set()
    const prefs = readPrefs()
    if (!prefs.soundCues) return
    const kind = events.has('permission') ? 'permission' : events.has('finished') ? 'finished' : null
    if (kind === null) return
    if (kind === 'permission' ? !prefs.soundPermission : !prefs.soundCompletion) return
    const name = kind === 'permission' ? SOUND_CUE_PERMISSION : SOUND_CUE_COMPLETION
    // The player reports its own downgrade to the browser voices; a cue never
    // throws into the status subscription that asked for it (D12).
    void player.play(name, SOUND_GAIN[prefs.soundVolume])
  }

  function queue(event: AttentionEvent) {
    if (disposed) return
    pending.add(event)
    if (timer === null) timer = window.setTimeout(flush, CUE_WINDOW_MS)
  }

  const feed = createAttentionFeed(ctx, queue)
  // No scheduler hook: the cue follows the host's snapshots, not the DOM.
  ui.soundCues = {}

  return () => {
    disposed = true
    if (timer !== null) window.clearTimeout(timer)
    timer = null
    feed.dispose()
    player.dispose()
    delete ui.soundCues
  }
}
