import * as React from 'react'
import { CHAT_REVEAL_OFF, CHAT_REVEAL_ON } from '../../constants'
import { motionMs } from '../../shared/motion'
import { ClaudeStyleSwitch } from '../../shared/settings-switch'
import { PreviewCards } from '../../shared/preview-cards'
import { copy } from './copy'
import type { PreviewOption } from '../../shared/preview-cards'
import type { Prefs } from '../../constants'
import type { SettingsControlsOf, SettingsRowView } from '../../core/feature'
import type manifest from './chat-reveal.manifest'

/**
 * The one row this feature draws itself (D76): the fade's switch with its two
 * answers under it as preview cards, each showing the arriving characters the
 * way the answer it picks does (features/settings/settings-cards.css). The
 * switch is the control every other on/off row on the page wears, so the row's
 * state reads at a glance; the cards show what the two states look like.
 */
export const controls: SettingsControlsOf<typeof manifest> = {
  'reveal-preview': RevealPicker,
}

/**
 * The share of the reveal preview's period the sample takes to arrive; the rest
 * of the period is the hold before the next wipe. A share rather than a time, so
 * a longer sample resolves at the same pace of the card.
 */
const REVEAL_PREVIEW_ARRIVAL_SHARE = 0.45

function RevealPicker(props: SettingsRowView) {
  const sample = copy('chatRevealSample')
  const [tick, setTick] = React.useState(0)
  React.useEffect(() => {
    const count = Array.from(sample).length
    const period = motionMs('--dsh-claude-period-preview-reveal')
    const arrival = Math.round(period * REVEAL_PREVIEW_ARRIVAL_SHARE)
    const gap = Math.max(1, Math.round(arrival / count))
    // The ticks the sample is on show before the next wipe: the rest of the
    // period is the hold, which is what gives the reader time to read it.
    const ticks = count + Math.max(0, Math.round((period - arrival) / gap))
    let next = 0
    setTick(0)
    const timer = window.setInterval(() => {
      next = next + 1 >= ticks ? 0 : next + 1
      setTick(next)
    }, gap)
    return () => window.clearInterval(timer)
  }, [sample])
  const shown = Math.min(tick, Array.from(sample).length)
  const card = React.createElement(
    'span',
    { className: 'dsh-claude-reveal-sample', 'aria-hidden': 'true' },
    Array.from(sample).map((piece, index) => React.createElement(
      'span',
      { key: `${index}-${piece}`, className: 'dsh-claude-reveal-piece', 'data-in': index < shown ? '' : undefined },
      piece,
    )),
  )
  // The card whose pieces wear the fade (settings-cards.css); the other hands
  // them their turn with nothing between.
  const options: PreviewOption<Prefs['chatReveal']>[] = [
    { value: CHAT_REVEAL_ON, label: copy('chatRevealOn'), content: card, attributes: { 'data-fade': '' } },
    { value: CHAT_REVEAL_OFF, label: copy('chatRevealOff'), content: card },
  ]
  const write = (value: Prefs['chatReveal']) => props.write({ chatReveal: value })
  // The switch carries the row's own name: a switch with no text of its own is
  // announced as an unlabelled switch, and this control is not the settings
  // page's own ClaudeStyleSwitch for it to name (settings-controls.ts row()).
  return React.createElement(
    'div',
    { className: 'dsh-claude-reveal-picker' },
    React.createElement(
      'div',
      { className: 'dsh-claude-reveal-picker-switch' },
      React.createElement(ClaudeStyleSwitch, {
        label: copy('chatRevealTitle'),
        on: props.prefs.chatReveal === CHAT_REVEAL_ON,
        onPick: (on: boolean) => write(on ? CHAT_REVEAL_ON : CHAT_REVEAL_OFF),
        disabled: props.disabled,
      }),
    ),
    React.createElement(PreviewCards<Prefs['chatReveal']>, {
      cardClass: 'dsh-claude-reveal-card',
      options,
      value: props.prefs.chatReveal,
      write,
      disabled: props.disabled,
    }),
  )
}
