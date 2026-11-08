/**
 * The two sound cues and the volume levels, shared by both halves (D89).
 *
 * The browser half decides which cue a moment plays and how loud; the host half
 * maps a cue onto the machine's own macOS system file and clamps the gain. The
 * package ships no audio: the files stay where the operating system keeps them.
 */

/** The system sound a session waiting on the reader plays. */
export const SOUND_POP = 'pop'
/** The system sound a finished task plays. */
export const SOUND_TINK = 'tink'
/** The cue names, as the settings and the private route carry them. */
export const SOUND_NAMES = [SOUND_POP, SOUND_TINK] as const
export type SoundName = typeof SOUND_NAMES[number]

/** The volume choices, in settings order. */
export const SOUND_VOLUME_QUIET = 'quiet'
export const SOUND_VOLUME_SUBTLE = 'subtle'
export const SOUND_VOLUME_CLEAR = 'clear'
export const SOUND_VOLUMES = [SOUND_VOLUME_QUIET, SOUND_VOLUME_SUBTLE, SOUND_VOLUME_CLEAR] as const
export type SoundVolume = typeof SOUND_VOLUMES[number]

/** The gain each choice sends; `afplay`'s `-v` and the browser fallback both read it. */
export const SOUND_GAIN: Readonly<Record<SoundVolume, number>> = {
  [SOUND_VOLUME_QUIET]: 0.2,
  [SOUND_VOLUME_SUBTLE]: 0.35,
  [SOUND_VOLUME_CLEAR]: 0.55,
}

/** Which cue each moment plays. */
export const SOUND_CUE_PERMISSION: SoundName = SOUND_POP
export const SOUND_CUE_COMPLETION: SoundName = SOUND_TINK

/**
 * What the capability read answers: whether the host can play a system sound
 * itself, and which cues it can play. A host on another platform answers
 * `browser` and the page synthesises the same two voices.
 */
export interface HostSoundCapability {
  ok: true
  playback: 'system' | 'browser'
  sounds: SoundName[]
}

/** One play request: the cue and the gain the settings resolved to. */
export interface HostSoundRequest {
  name: SoundName
  volume: number
}
