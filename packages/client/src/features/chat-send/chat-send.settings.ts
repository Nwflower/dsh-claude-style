import * as React from 'react'
import { MESSAGE_ENTER_FLIGHT, MESSAGE_ENTER_GROW } from '../../constants'
import { motionReduced } from '../../core/prefs'
import { motionMs } from '../../shared/motion'
import { withoutTransition } from '../../shared/transition'
import { PreviewCards } from '../../shared/preview-cards'
import { copy } from './copy'
import type { PreviewOption } from '../../shared/preview-cards'
import type { Prefs } from '../../constants'
import type { SettingsControlsOf, SettingsRowView } from '../../core/feature'
import type manifest from './send-flight.manifest'

/**
 * The one row this feature draws itself (D76): the sent message's entrance as
 * two preview cards, each playing the arrival it picks over the same sample
 * message (features/settings/settings-cards.css).
 */
export const controls: SettingsControlsOf<typeof manifest> = {
  'send-preview': MessageEnterPicker,
}

function MessageEnterPicker(props: SettingsRowView) {
  // What the reader watches arrive, in the order the card takes turns: one
  // message asking for a star, one for an issue, one for a pull request.
  const texts = [
    copy('messageEnterSampleStar'),
    copy('messageEnterSampleIssue'),
    copy('messageEnterSamplePr'),
  ]
  const pickerRef = React.useRef<HTMLDivElement | null>(null)
  // The messages standing on the cards, by their own number rather than by
  // their words: the number is also the React key, so the message just
  // appended is a new node — which is what lets it play its arrival — while
  // the ones already there keep theirs.
  const [shown, setShown] = React.useState([0, 1])
  const nextId = React.useRef(shown.length)
  React.useEffect(() => {
    // A card that takes no input holds its messages still (settings-controls.ts
    // greys the row while the entrance's own switch is off).
    if (props.disabled) return
    const timer = window.setInterval(() => {
      // The reader's animation choice is read each turn (D40): on a still page
      // the card stands on the messages already there, the way the line writes
      // its words at once, instead of a new message appearing without its
      // arrival and the column jumping a row.
      if (motionReduced()) return
      const id = nextId.current
      nextId.current += 1
      setShown(previous => previous.length >= 3 ? [...previous.slice(1), id] : [...previous, id])
    }, motionMs('--dsh-claude-period-preview-enter'))
    return () => window.clearInterval(timer)
  }, [props.disabled])
  // The lift: appending a message has already moved the column up a row, so
  // the column is pushed back down first and then slides to where it belongs
  // — the same flip the conversation's own entrance needs, without which the
  // messages would jump.
  const first = React.useRef(true)
  React.useLayoutEffect(() => {
    const picker = pickerRef.current
    if (picker === null) return
    if (first.current) {
      first.current = false
      return
    }
    for (const stack of picker.querySelectorAll<HTMLElement>('.dsh-claude-enter-stack')) {
      const row = Number.parseFloat(getComputedStyle(stack).getPropertyValue('--dsh-claude-enter-row')) || 28
      withoutTransition([stack], () => { stack.style.transform = `translateY(${row}px)` })
      stack.style.transform = ''
    }
  }, [shown])
  const sample = React.createElement(
    'span',
    { className: 'dsh-claude-enter-sample', 'aria-hidden': 'true' },
    React.createElement(
      'span',
      { className: 'dsh-claude-enter-stack' },
      ...shown.map((id, at) => React.createElement(
        'span',
        {
          key: id,
          className: 'dsh-claude-enter-bubble',
          // The messages already standing arrived in earlier turns and
          // stay as they are; the last one is the one arriving now.
          'data-standing': at < shown.length - 1 ? '' : undefined,
        },
        texts[id % texts.length],
      )),
    ),
  )
  const options: PreviewOption<Prefs['messageEnter']>[] = [
    // The effect each card shows, which is also the value it writes
    // (settings-cards.css).
    { value: MESSAGE_ENTER_GROW, label: copy('messageEnterGrow'), content: sample, attributes: { 'data-enter': MESSAGE_ENTER_GROW } },
    { value: MESSAGE_ENTER_FLIGHT, label: copy('messageEnterFlight'), content: sample, attributes: { 'data-enter': MESSAGE_ENTER_FLIGHT } },
  ]
  return React.createElement(PreviewCards<Prefs['messageEnter']>, {
    cardClass: 'dsh-claude-enter-card',
    options,
    value: props.prefs.messageEnter,
    write: (value: Prefs['messageEnter']) => props.write({ messageEnter: value }),
    disabled: props.disabled,
    // The two cards differ in nothing but the arrival, which is over in a few
    // hundred milliseconds: each card names its entrance over the sample, the
    // way the reveal's and the caret's do.
    showLabels: true,
    element: pickerRef,
  })
}
