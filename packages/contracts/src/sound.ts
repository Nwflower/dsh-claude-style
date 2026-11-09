/**
 * Shared sound cue contract (D89). The host plays operating-system files;
 * the package ships no audio.
 */

/** The system sound a session waiting on the reader plays. */
export const SOUND_POP = 'pop'
/** The system sound a finished task plays. */
export const SOUND_TINK = 'tink'
/** The cue names, as the settings and the private route carry them. */
export const SOUND_NAMES = [SOUND_POP, SOUND_TINK] as const
export type SoundName = typeof SOUND_NAMES[number]

/** The setting's three levels: `off` silences both cues, and the two audible ones set the gain. */
export const SOUND_LEVEL_OFF = 'off'
export const SOUND_LEVEL_SOFT = 'soft'
export const SOUND_LEVEL_CLEAR = 'clear'
export const SOUND_LEVELS = [SOUND_LEVEL_OFF, SOUND_LEVEL_SOFT, SOUND_LEVEL_CLEAR] as const
export type SoundLevel = typeof SOUND_LEVELS[number]

/** The gain each level sends; `afplay`'s `-v` and the browser fallback both read it. */
export const SOUND_GAIN: Readonly<Record<SoundLevel, number>> = {
  [SOUND_LEVEL_OFF]: 0,
  [SOUND_LEVEL_SOFT]: 0.2,
  [SOUND_LEVEL_CLEAR]: 0.55,
}

/** Which cue each moment plays. */
export const SOUND_CUE_PERMISSION: SoundName = SOUND_POP
export const SOUND_CUE_COMPLETION: SoundName = SOUND_TINK

/** `browser` tells the page to synthesize cues when system playback is unavailable. */
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
