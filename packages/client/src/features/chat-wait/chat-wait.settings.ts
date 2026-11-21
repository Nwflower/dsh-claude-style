import * as React from 'react'
import { STATUS_MOTION_SWEEP, STATUS_MOTION_WASH } from '../../constants'
import { hostChatCopy } from '../../core/i18n'
import { motionReduced } from '../../core/prefs'
import { motionMs } from '../../shared/motion'
import { SWEEP_BAND_CLASS, SWEEP_GLYPHS_CLASS } from '../../shared/sweep-band'
import { waitingWord } from '../../shared/turn-activity'
import { PreviewCards } from '../../shared/preview-cards'
import { copy } from './copy'
import type { PreviewOption } from '../../shared/preview-cards'
import type { Prefs } from '../../constants'
import type { SettingsControlsOf, SettingsRowView } from '../../core/feature'
import type manifest from './chat-wait.manifest'

/**
 * The rows this feature draws itself (D76). The waiting line's switch and its
 * detail choice are switches the settings page draws from the manifest; the
 * paint is the option under the switch, and it is shown as the effect itself:
 * the card wears the very look the line wears (shared/motion.css builds both),
 * so a card is the effect and not a picture of it.
 */
export const controls: SettingsControlsOf<typeof manifest> = {
  'status-paint': StatusMotionPicker,
}

/** The paint the line wears as two preview cards, each painting the words that stand on it. */
function StatusMotionPicker(props: SettingsRowView) {
  const pickerRef = React.useRef<HTMLDivElement | null>(null)
  const [alt, setAlt] = React.useState(false)
  React.useEffect(() => {
    // A card that takes no input holds its sample still (settings-controls.ts
    // greys the row while the line's own switch is off).
    if (props.disabled) return
    let phase = false
    const timer = window.setInterval(() => {
      phase = !phase
      setAlt(phase)
    }, motionMs('--dsh-claude-period-preview-swap') / 2)
    return () => window.clearInterval(timer)
  }, [props.disabled])
  React.useLayoutEffect(() => {
    const picker = pickerRef.current
    if (picker === null) return
    // Only the still page needs the hand-over: with motion the CSS loop is
    // already taking turns, and the attribute would cut across it.
    if (motionReduced() && alt) picker.setAttribute('data-dsh-claude-word-alt', '')
    else picker.removeAttribute('data-dsh-claude-word-alt')
    // The precise line writes the specifics one at a time, so the card's own
    // paint loop stands down and the picker above hands the turn over.
    if (props.prefs.statusDetail) picker.setAttribute('data-dsh-claude-precise', '')
    else picker.removeAttribute('data-dsh-claude-precise')
  }, [alt, props.prefs.statusDetail])
  // What the line says, in the wordings the card takes turns between. With the
  // precise status line on, the line writes the specifics a moment carries, so
  // the card takes turns between the three shapes those arrive in — a file
  // being read, a tree being checked out, the model thinking — one at a time,
  // because three wordings cannot share the two-word paint loop
  // (features/settings/settings-cards.css reads data-dsh-claude-precise).
  const preciseWords = [
    copy('statusDetailSampleRead'),
    copy('statusDetailSampleCheckout'),
    copy('statusDetailSampleThinking'),
  ]
  const plainWords = [
    waitingWord(props.prefs.brand, hostChatCopy('chat.deepDiving', 'Deep diving'), copy('chatWaitThinking')),
    copy('chatWaitTools'),
  ]
  const [preciseTurn, setPreciseTurn] = React.useState(0)
  React.useEffect(() => {
    if (!props.prefs.statusDetail || props.disabled) return
    const timer = window.setInterval(() => {
      setPreciseTurn(turn => (turn + 1) % preciseWords.length)
    }, motionMs('--dsh-claude-period-preview-swap') / preciseWords.length)
    return () => window.clearInterval(timer)
  }, [props.prefs.statusDetail, preciseWords.length, props.disabled])
  // The precise line swaps one specific for the next, so the card runs the
  // line's own two halves (settings-cards.css): the word leaving rises with a
  // blur while the one arriving rises in from below. Both are rendered, and
  // re-keyed each turn so the halves play again.
  const words = props.prefs.statusDetail
    ? [
      preciseWords[(preciseTurn + preciseWords.length - 1) % preciseWords.length] ?? preciseWords[0],
      preciseWords[preciseTurn % preciseWords.length] ?? preciseWords[0],
    ]
    : plainWords
  // Each wording wears the card's paint by carrying the shared look's own
  // class (shared/motion.css), so the band or the wash rides the words that are
  // standing; the band is the host's own, built the way shared/sweep-band.ts
  // builds it on the line.
  const sample = (option: Prefs['statusMotion']) => React.createElement(
    'span',
    { className: 'dsh-claude-motion-sample', 'aria-hidden': 'true' },
    words.map((word, at) => React.createElement('span', {
      // Each turn re-keys the pair, which is what makes the two halves
      // play again on the precise line.
      key: props.prefs.statusDetail ? `${preciseTurn}-${at}` : word,
      className: `dsh-claude-motion-word dsh-claude-${option}`
        + (props.prefs.statusDetail ? (at === 0 ? ' dsh-claude-word-out' : ' dsh-claude-word-in') : ''),
      'data-text': word,
    }, word, option === STATUS_MOTION_SWEEP
      ? React.createElement('span', { className: SWEEP_BAND_CLASS }, React.createElement('span', { className: SWEEP_GLYPHS_CLASS, 'data-text': word }))
      : null)),
  )
  const options: PreviewOption<Prefs['statusMotion']>[] = [
    { value: STATUS_MOTION_SWEEP, label: copy('statusMotionSweep'), content: sample(STATUS_MOTION_SWEEP) },
    { value: STATUS_MOTION_WASH, label: copy('statusMotionWash'), content: sample(STATUS_MOTION_WASH) },
  ]
  return React.createElement(PreviewCards<Prefs['statusMotion']>, {
    cardClass: 'dsh-claude-motion-card',
    options,
    value: props.prefs.statusMotion,
    write: (value: Prefs['statusMotion']) => props.write({ statusMotion: value }),
    disabled: props.disabled,
    // The two paints differ only in how the line's words move, so each card
    // names its answer over the sample, as the other motion-only rows do.
    showLabels: true,
    element: pickerRef,
  })
}
