import { SOUND_PATH } from '@dsh-claude-style/contracts/routes'
import { readHostJson } from '@dsh-claude-style/engine/resource'
import { createSynth } from './synth'
import type { HostSoundCapability, SoundName } from '@dsh-claude-style/contracts/sound'

/**
 * Whether the page is served from this machine. Host audio plays on the host,
 * so a page opened from another machine (or a remote `dsh web`) must use the
 * browser's own voices; only a loopback page is hearing the reader's Mac.
 */
function loopbackPage() {
  const host = location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1'
}

/**
 * Play one cue through the host when it can, and through the browser otherwise
 * (D89). The capability is read on the first cue and kept; a failed play
 * downgrades for the rest of the generation instead of throwing into the status
 * feed.
 */
export function createSoundPlayer() {
  const synth = createSynth()
  let mode: 'system' | 'browser' | null = null
  let warned = false

  async function resolveMode(): Promise<'system' | 'browser'> {
    if (mode !== null) return mode
    if (!loopbackPage()) return (mode = 'browser')
    try {
      const answer = await readHostJson(SOUND_PATH) as HostSoundCapability | null
      mode = answer?.playback === 'system' && Array.isArray(answer.sounds) && answer.sounds.length > 0 ? 'system' : 'browser'
    } catch {
      // A host without the route, or a page the route cannot authenticate,
      // still has the browser voices; a decorative cue stops at this read.
      mode = 'browser'
    }
    return mode
  }

  async function play(name: SoundName, gain: number) {
    if (await resolveMode() === 'system') {
      try {
        await readHostJson(SOUND_PATH, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, volume: gain }),
        })
        return
      } catch (error) {
        // The cue is decorative: one failed play must not reach the status
        // feed. The synth plays it, and the downgrade is reported once (D12).
        mode = 'browser'
        if (!warned) {
          warned = true
          console.warn('sound-cues: system playback failed, using the browser voices', error)
        }
      }
    }
    synth.play(name, gain)
  }

  return { play, dispose: synth.dispose }
}
