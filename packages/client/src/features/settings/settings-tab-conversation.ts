import { CARET_MOTION_MOVE, CARET_MOTION_OFF, CARET_MOTION_TYPING } from '../../constants'
import { prefYielded } from '../../core/feature'
import { settingsCopy } from '../../core/i18n'
import { managedDesc } from './settings-controls'
import type { SettingsRow, SettingsTab, SettingsView } from './settings-controls'

/**
 * The settings page's Conversation tab: the turn status line, the
 * conversation navigator, the ported chat-area interactions and the
 * Chat / Trajectory tab strip. All of them but the caret's three-way choice
 * are feature switches, placed here by their manifests (D42).
 *
 * While dsh-chat-ux is on the page the ported rows show the reader's own
 * answer with the control disabled and a line saying who owns the behaviour
 * right now: that plugin implements the same interactions, and these
 * features stand down whole for as long as it is there
 * (packages/client/src/shared/peer-plugin.ts, docs/decisions D32). Nothing is written
 * to the stored preference, so the control already says what will happen the
 * moment that plugin goes away.
 */
export function createSettingsConversationTab(): SettingsTab {
  function rows(view: SettingsView): SettingsRow[] {
    const prefs = view.prefs
    const write = view.write
    const controls = view.controls
    const caretOptions = [
      { value: CARET_MOTION_TYPING, label: settingsCopy('caretTyping', 'Every move') },
      { value: CARET_MOTION_MOVE, label: settingsCopy('caretMove', 'Explicit moves') },
      { value: CARET_MOTION_OFF, label: settingsCopy('caretOff', 'Off') },
    ]
    const caretYielded = prefYielded('caretMotion')
    return [
      {
        rank: 40,
        node: controls.row(
          'caretMotion',
          settingsCopy('caretTitle', 'Composer caret motion'),
          managedDesc(settingsCopy('caretDesc', 'The composer\'s caret is drawn by the plugin and glides between positions instead of jumping. Explicit moves glides only on an arrow key or a click, and lands instantly while typing.'), caretYielded),
          controls.segment(caretOptions, prefs.caretMotion, value => { write({ caretMotion: value }) }, caretYielded),
        ),
      },
    ]
  }
  return { id: 'conversation', label: () => settingsCopy('tabConversation', 'Conversation'), rows }
}
