import * as React from 'react'
import { CARET_MOTION_OFF, CARET_MOTION_TYPING } from '../../constants'
import { motionMs } from '../../shared/motion'
import { inPagePixels } from '../../shared/page-zoom'
import { PreviewCards } from '../../shared/preview-cards'
import { copy } from './copy'
import type { PreviewOption } from '../../shared/preview-cards'
import type { Prefs } from '../../constants'
import type { SettingsControlsOf, SettingsRowView } from '../../core/feature'
import type manifest from './caret.manifest'

/**
 * The one row this feature draws itself (D76): the caret's two answers as
 * preview cards, each naming its answer over the sample because the two lines
 * differ only in how the caret moves. The same line is typed out in both,
 * character by character,
 * with the caret following it — the on card's caret glides to each new place
 * the way the drawn one does, the off card's arrives there at once the way the
 * host's own caret does (features/caret/caret.css). The caret is lit for the
 * whole time the line is being typed and blinks on the native cycle once the
 * line stands whole: the drawn caret restarts its blink on every move
 * (features/caret/caret.ts), so a reader who is typing never sees it dark.
 *
 * Both cards carry the same line in the same box, so the first card's measure of
 * the last typed character's edge places both carets; the bar's rule reads it as
 * `--dsh-claude-caret-x` (features/settings/settings-cards.css).
 */
export const controls: SettingsControlsOf<typeof manifest> = {
  'caret-preview': CaretPicker,
}

/**
 * The share of the caret preview's period the sample line takes to be typed;
 * the rest of the period is the line standing whole, which is where the caret
 * blinks. A share rather than a time, so a longer sample resolves at the same
 * pace of the card.
 */
const CARET_PREVIEW_TYPING_SHARE = 0.5

function CaretPicker(props: SettingsRowView) {
  const sample = copy('caretSample')
  const pieces = Array.from(sample)
  const [at, setAt] = React.useState(0)
  const pickerRef = React.useRef<HTMLDivElement | null>(null)
  const lineRef = React.useRef<HTMLSpanElement | null>(null)
  React.useEffect(() => {
    // A card that takes no input holds its sample still (settings-controls.ts
    // greys the row while the parent it belongs to is off).
    if (props.disabled) return
    const period = motionMs('--dsh-claude-period-preview-caret')
    const typing = Math.round(period * CARET_PREVIEW_TYPING_SHARE)
    const gap = Math.max(1, Math.round(typing / pieces.length))
    // The ticks the line stands whole before it clears: the rest of the
    // period, which is what gives the caret time to blink and the reader time
    // to read the line.
    const ticks = pieces.length + Math.max(0, Math.round((period - typing) / gap))
    let next = 0
    setAt(0)
    const timer = window.setInterval(() => {
      next = next + 1 >= ticks ? 0 : next + 1
      setAt(Math.min(next, pieces.length))
    }, gap)
    return () => window.clearInterval(timer)
  }, [sample, props.disabled])
  React.useLayoutEffect(() => {
    const picker = pickerRef.current
    const line = lineRef.current
    if (picker === null || line === null) return
    const last = at === 0 ? null : line.children[at - 1]
    // The caret's place inside the sample line, in the pixels the property is
    // read in (shared/page-zoom.ts).
    const lineLeft = line.getBoundingClientRect().left
    const edge = last === null || last === undefined
      ? lineLeft
      : last.getBoundingClientRect().right
    picker.style.setProperty('--dsh-claude-caret-x', `${inPagePixels(edge - lineLeft)}px`)
  }, [at, sample])
  const cardSample = (option: Prefs['caretMotion']) => React.createElement(
    'span',
    { className: 'dsh-claude-caret-sample', 'aria-hidden': 'true' },
    React.createElement(
      'span',
      {
        className: 'dsh-claude-caret-sample-text',
        ref: option === CARET_MOTION_TYPING ? lineRef : undefined,
      },
      pieces.map((piece, index) => React.createElement(
        'span',
        // A character that has not been typed yet holds its place in the
        // line, so the line does not reflow as it is typed.
        { key: `${index}-${piece}`, className: 'dsh-claude-caret-piece', 'data-in': index < at ? '' : undefined },
        piece,
      )),
    ),
    React.createElement('span', {
      className: `dsh-claude-caret-sample-bar dsh-claude-caret-${option}`,
      // The blink is switched off for the whole time the line is being
      // typed, so the caret is lit while it moves.
      'data-typing': at < pieces.length ? '' : undefined,
    }),
  )
  const options: PreviewOption<Prefs['caretMotion']>[] = [
    { value: CARET_MOTION_TYPING, label: copy('caretOn'), content: cardSample(CARET_MOTION_TYPING) },
    { value: CARET_MOTION_OFF, label: copy('caretOff'), content: cardSample(CARET_MOTION_OFF) },
  ]
  return React.createElement(PreviewCards<Prefs['caretMotion']>, {
    cardClass: 'dsh-claude-caret-card',
    options,
    value: props.prefs.caretMotion,
    write: (value: Prefs['caretMotion']) => props.write({ caretMotion: value }),
    disabled: props.disabled,
    element: pickerRef,
    showLabels: true,
  })
}
