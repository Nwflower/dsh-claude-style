import * as React from 'react'
import { CARET_MOTION_MOVE, CARET_MOTION_OFF, CARET_MOTION_TYPING } from '../../constants'
import { settingsCopy } from '../../core/i18n'
import { dshChatUxPresent } from '../../shared/peer-plugin'
import type { SettingsTab, SettingsView } from './settings-controls'

/**
 * The settings page's Conversation tab: the turn status line, the
 * conversation navigator, the ported chat-area interactions and the
 * Chat / Trajectory tab strip.
 *
 * While dsh-chat-ux is on the page the ported rows show the reader's own
 * answer with the control disabled and a line saying who owns the behaviour
 * right now: that plugin implements the same interactions, and these
 * features stand down whole for as long as it is there
 * (src/shared/peer-plugin.ts, docs/decisions D32). Nothing is written
 * to the stored preference, so the switch already says what will happen the
 * moment that plugin goes away.
 */
export function createSettingsConversationTab(): SettingsTab {
  function rows(view: SettingsView) {
    const prefs = view.prefs
    const write = view.write
    const controls = view.controls
    const caretOptions = [
      { value: CARET_MOTION_TYPING, label: settingsCopy('caretTyping', 'Every move') },
      { value: CARET_MOTION_MOVE, label: settingsCopy('caretMove', 'Explicit moves') },
      { value: CARET_MOTION_OFF, label: settingsCopy('caretOff', 'Off') },
    ]
    /** dsh-chat-ux on the page: its own copy of these interactions is the live one. */
    const takenOver = dshChatUxPresent()
    /**
     * One row's description. The reader's own text stays as it is; the line
     * naming the owner is added below it, in the accent colour, so a row
     * that refuses input says why where the eye already is.
     */
    const desc = (key: string, fallback: string) => {
      const text = settingsCopy(key, fallback)
      if (!takenOver) return text
      return [
        text,
        React.createElement('span', { key: 'managed', className: 'dsh-claude-settings-row-managed' },
          settingsCopy('chatUxManaged', 'Managed by dsh-chat-ux')),
      ]
    }
    /** A switch: the reader's own answer, refusing input while the other plugin owns the behaviour. */
    const peerToggle = (on: boolean, onPick: (value: boolean) => void) => controls.toggle(on, onPick, takenOver)
    return [
      controls.row(
        'turnStatus',
        settingsCopy('turnStatusTitle', 'Turn status line'),
        settingsCopy('turnStatusDesc', 'Move the status of a running, stopped or failed turn to the end of the turn\'s work, with the elapsed time, the output tokens and what the model is doing. Off restores the host\'s turn status.'),
        controls.toggle(prefs.turnStatus, value => { write({ turnStatus: value }) }),
      ),
      controls.row(
        'turnNav',
        settingsCopy('turnNavTitle', 'Conversation navigator'),
        settingsCopy('turnNavDesc', 'Rest the pointer on the turn marks at the conversation\'s right edge and they open into a list of every turn, one line each with the message that started it; the wheel scrolls the list and a click jumps to that turn. Alt+↑ and Alt+↓ jump to the previous or the next turn, and the turn you land on is marked with a short line. Off restores the host\'s turn marks.'),
        controls.toggle(prefs.turnNav, value => { write({ turnNav: value }) }),
      ),
      controls.row(
        'chatAnimations',
        settingsCopy('chatAnimationsTitle', 'Chat-area animations'),
        desc('chatAnimationsDesc', 'The conversation area\'s animations in one switch: the view follows the newest line as an answer grows, gliding there and catching up the same way inside a scrolling work log; the thinking row and a running step open and fold back by themselves, and a press rolls a height open or shut; new text fades in as it arrives; a write or edit run from inside a program is shown as a row carrying its +n -m count; and the composer lifts into the message bubble on send. Off stops all of them and the host\'s own behaviour returns.'),
        peerToggle(prefs.chatAnimations, value => { write({ chatAnimations: value }) }),
      ),
      controls.row(
        'caretMotion',
        settingsCopy('caretTitle', 'Composer caret motion'),
        desc('caretDesc', 'The composer\'s caret is drawn by the plugin and glides between positions instead of jumping. Explicit moves glides only on an arrow key or a click, and lands instantly while typing.'),
        controls.segment(caretOptions, prefs.caretMotion, value => { write({ caretMotion: value }) }, takenOver),
      ),
      controls.row(
        'viewTabs',
        settingsCopy('viewTabsTitle', 'Chat / Trajectory tabs'),
        settingsCopy('viewTabsDesc', 'Redraw the Chat / Trajectory tab strip at the top of the conversation, lifted onto the title\'s line when it fits. Off restores the host\'s tab strip.'),
        controls.toggle(prefs.viewTabs, value => { write({ viewTabs: value }) }),
      ),
    ]
  }
  return { id: 'conversation', label: () => settingsCopy('tabConversation', 'Conversation'), rows }
}
