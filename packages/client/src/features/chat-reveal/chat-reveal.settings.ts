import * as React from 'react'
import { CHAT_REVEAL_OFF, CHAT_REVEAL_ON } from '../../constants'
import { motionMs } from '../../shared/motion'
import { PreviewCards } from '../../shared/preview-cards'
import { copy } from './copy'
import type { PreviewOption } from '../../shared/preview-cards'
import type { Prefs } from '../../constants'
import type { SettingsControlsOf, SettingsRowView } from '../../core/feature'
import type manifest from './chat-reveal.manifest'

/**
 * The one row this feature draws itself (D76): the fade's two answers as
 * preview cards, each showing the arriving characters the way the answer it
 * picks does (features/settings/settings-cards.css). The cards are the answers
 * themselves — picking one writes it — and each names its answer over its
 * sample, because the two samples differ only in how their characters arrive.
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
    // A card that takes no input holds its sample still (settings-controls.ts
    // greys the row while the parent it belongs to is off).
    if (props.disabled) return
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
  }, [sample, props.disabled])
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
  return React.createElement(PreviewCards<Prefs['chatReveal']>, {
    cardClass: 'dsh-claude-reveal-card',
    options,
    value: props.prefs.chatReveal,
    write: (value: Prefs['chatReveal']) => props.write({ chatReveal: value }),
    disabled: props.disabled,
    showLabels: true,
  })
}
