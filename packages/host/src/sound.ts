/**
 * The macOS system cues the host half plays (D88).
 *
 * The two files are the machine's own, so the package carries no audio and no
 * Apple data. A machine without the player or the files answers `browser`, and
 * the page synthesises the same two voices there.
 */
import { SOUND_NAMES, SOUND_POP, SOUND_TINK } from '@dsh-claude-style/contracts/sound'
import type { HostSoundCapability, SoundName } from '@dsh-claude-style/contracts/sound'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/** The player every macOS install ships, and where its system sounds live. */
const PLAYER = '/usr/bin/afplay'
const DIRECTORY = '/System/Library/Sounds'

/** The file each cue names, from the system sounds' own names. */
const FILES: Readonly<Record<SoundName, string>> = {
  [SOUND_POP]: 'Pop.aiff',
  [SOUND_TINK]: 'Tink.aiff',
}

/** The range `afplay -v` accepts; a request outside it is clamped to the nearer end. */
const VOLUME_MIN = 0.02
const VOLUME_MAX = 1

/** Whether this machine is a macOS one with the player and both files in place. */
function playable() {
  return process.platform === 'darwin'
    && existsSync(PLAYER)
    && SOUND_NAMES.every(name => existsSync(join(DIRECTORY, FILES[name])))
}

/** The answer to the capability read. */
export function soundCapability(): HostSoundCapability {
  return playable()
    ? { ok: true, playback: 'system', sounds: [...SOUND_NAMES] }
    : { ok: true, playback: 'browser', sounds: [] }
}

/** Whether a request names one of the two cues. */
export function isSoundName(value: unknown): value is SoundName {
  return typeof value === 'string' && (SOUND_NAMES as readonly string[]).includes(value)
}

/** One request's gain, held to the range the player takes. */
export function clampSoundVolume(value: unknown) {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return Math.min(VOLUME_MAX, Math.max(VOLUME_MIN, number))
}

/**
 * Play one cue with the system player. The promise settles when the process
 * starts, so a cue that cannot start reaches the route as a failure instead of
 * passing silently (D12); the process then outlives the request.
 */
export function playSystemSound(name: SoundName, volume: number) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(PLAYER, ['-v', volume.toFixed(2), join(DIRECTORY, FILES[name])], { stdio: 'ignore' })
    child.once('spawn', () => {
      child.unref()
      resolve()
    })
    child.once('error', reject)
  })
}
