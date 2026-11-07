import { SOUND_POP } from '@dsh-claude-style/contracts/sound'
import type { SoundName } from '@dsh-claude-style/contracts/sound'

/** The synth's gain under the setting's: the two system files peak near a third of full scale. */
const HEADROOM = 0.55

/** One decaying sine, from `start` down to `end`; the envelope cannot ramp to zero. */
function voice(context: AudioContext, destination: AudioNode, at: number, start: number, end: number, attack: number, decay: number, peak: number) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(start, at)
  oscillator.frequency.exponentialRampToValueAtTime(end, at + attack + decay)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  oscillator.connect(gain).connect(destination)
  oscillator.start(at)
  oscillator.stop(at + attack + decay + 0.02)
}

/**
 * The browser's voices for the two cues, for a machine whose host cannot play
 * a system sound (D88). Each follows the file's pitch family and envelope at a
 * quiet gain.
 */
export function createSynth() {
  let context: AudioContext | null = null
  let release: (() => void) | null = null

  function open() {
    if (context === null) context = new AudioContext()
    if (context.state === 'suspended') void context.resume()
    return context
  }

  // A browser holds audio until the reader has acted; the first press or key
  // opens it, so the next cue is not left suspended.
  if (typeof document !== 'undefined') {
    const unlock = () => {
      open()
      cleanup()
    }
    const cleanup = () => {
      document.removeEventListener('pointerdown', unlock, true)
      document.removeEventListener('keydown', unlock, true)
      release = null
    }
    document.addEventListener('pointerdown', unlock, true)
    document.addEventListener('keydown', unlock, true)
    release = cleanup
  }

  function play(name: SoundName, gain: number) {
    const audio = open()
    const at = audio.currentTime + 0.01
    const out = audio.createGain()
    out.gain.value = gain * HEADROOM
    out.connect(audio.destination)
    if (name === SOUND_POP) {
      const blips = [[0, 560, 0.9], [0.07, 500, 0.55], [0.145, 470, 0.3]]
      for (let i = 0; i < blips.length; i++) {
        const [offset, start, weight] = blips[i]
        voice(audio, out, at + offset, start, start * 0.55, 0.004, 0.09, 0.5 * weight)
      }
      return
    }
    voice(audio, out, at, 760, 690, 0.002, 0.055, 0.72)
    voice(audio, out, at, 1520, 1520, 0.002, 0.035, 0.16)
  }

  function dispose() {
    release?.()
    if (context !== null) {
      void context.close()
      context = null
    }
  }

  return { play, dispose }
}
