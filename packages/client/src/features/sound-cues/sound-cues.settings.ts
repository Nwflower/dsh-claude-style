import * as React from 'react'
import { SOUND_CUE_COMPLETION, SOUND_GAIN, SOUND_LEVEL_CLEAR, SOUND_LEVEL_OFF, SOUND_LEVEL_SOFT, SOUND_LEVELS } from '@dsh-claude-style/contracts/sound'
import { SEGMENT_CLASS } from '../../shared/segment-control'
import { ClaudeStyleSegmentGroup } from '../../shared/segment-group'
import { createSoundPlayer } from './player'
import { copy } from './copy'
import type { SoundLevel } from '@dsh-claude-style/contracts/sound'
import type { SettingsControlsOf, SettingsRowView } from '../../core/feature'
import type manifest from './sound-cues.manifest'
import type { CopyKey } from './copy'

/** The line that names each level. */
const LEVEL_LABELS: Readonly<Record<SoundLevel, CopyKey>> = {
  [SOUND_LEVEL_OFF]: 'soundLevelOff',
  [SOUND_LEVEL_SOFT]: 'soundLevelSoft',
  [SOUND_LEVEL_CLEAR]: 'soundLevelClear',
}

/**
 * The sound level as three picks, each of which sounds its own cue on the way
 * in (D89): the row decides a gain nobody can hear from a word, so a pick plays
 * the completion cue at the level it just chose. `off` has no gain to hear and
 * stays silent. A press on the level already in force still sounds — the reader
 * pressing it again is asking to hear it again, which the shared segment
 * control's "same value does nothing" rule would swallow.
 *
 * The player is the browser half's own (features/sound-cues/player.ts), built on
 * the first press and closed with the row. The feature is not installed while
 * the level is `off`, and the pick that leaves `off` is the one that most needs
 * a sound, so the row cannot borrow the installed feature's player.
 */
function SoundLevels({ prefs, write, disabled }: SettingsRowView) {
  const player = React.useRef<ReturnType<typeof createSoundPlayer> | null>(null)

  React.useEffect(() => () => {
    player.current?.dispose()
    player.current = null
  }, [])

  function pick(level: SoundLevel) {
    write({ soundCues: level })
    if (level === SOUND_LEVEL_OFF) return
    if (player.current === null) player.current = createSoundPlayer()
    void player.current.play(SOUND_CUE_COMPLETION, SOUND_GAIN[level])
  }

  const buttons = SOUND_LEVELS.map(level => React.createElement(
    'button',
    {
      key: level,
      type: 'button',
      className: SEGMENT_CLASS,
      disabled: disabled === true,
      'data-active': level === prefs.soundCues ? '' : undefined,
      'aria-pressed': level === prefs.soundCues ? 'true' : 'false',
      onClick() { pick(level) },
    },
    copy(LEVEL_LABELS[level]),
  ))
  return React.createElement(
    'div',
    { className: 'dsh-claude-settings-inline-control' },
    React.createElement(ClaudeStyleSegmentGroup, { label: copy('soundCuesTitle') }, buttons),
  )
}

export const controls: SettingsControlsOf<typeof manifest> = { 'sound-levels': SoundLevels }
