import * as React from 'react'

/**
 * The percentage row's control, shared by the settings rows that offer one
 * (the page's own scale, the background fill's opacity): a percentage field,
 * the reset label beside it, and the seekbar the field opens on hover or
 * focus. The range and the default are the caller's own — each row clamps to
 * the span its preference declares.
 *
 * The field keeps the text typed so far, so a half-typed number survives the
 * preference echoing back; a commit writes a whole percentage and leaves the
 * field on what the row now holds, which also covers a number the range
 * closes onto one end. The seekbar writes once per gesture — the native
 * \`change\`, which lands on release and after each key step — because every
 * write is a host settings save and a page-wide preference pass.
 */
export function PercentControl(props: {
  percent: number
  min: number
  max: number
  defaultPercent: number
  fieldLabel: string
  trackLabel: string
  resetLabel: string
  onPick: (percent: number) => void
  onReset: () => void
}) {
  const [text, setText] = React.useState(String(props.percent))
  const [open, setOpen] = React.useState(false)
  const control = React.useRef<HTMLDivElement>(null)
  const range = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => { setText(String(props.percent)) }, [props.percent])

  /** Write one percentage, held to the row's range, and leave the field on what it lands on. */
  function write(percent: number) {
    const clamped = Math.min(props.max, Math.max(props.min, percent))
    setText(String(clamped))
    if (clamped !== props.percent) props.onPick(clamped)
  }

  /** The field's text as a whole percentage; unreadable text is the preference on hand. */
  function typedPercent() {
    const parsed = Number.parseInt(text, 10)
    return Number.isFinite(parsed) ? parsed : props.percent
  }

  function commitTyped() {
    const parsed = Number.parseInt(text, 10)
    if (!Number.isFinite(parsed)) {
      setText(String(props.percent))
      return
    }
    write(parsed)
  }

  // The seekbar's commit is attached once, so it reads this render's \`write\`
  // through a ref rather than a first render's props.
  const commitRange = React.useRef(() => {})
  commitRange.current = () => {
    const element = range.current
    if (element !== null) write(Number.parseInt(element.value, 10))
  }
  React.useEffect(() => {
    const element = range.current
    if (element === null) return
    const commit = () => { commitRange.current() }
    element.addEventListener('change', commit)
    return () => { element.removeEventListener('change', commit) }
  }, [])

  /** Close the seekbar unless the focus it serves is still inside the control. */
  function release() {
    if (control.current?.contains(document.activeElement)) return
    setOpen(false)
  }

  /** Where the seekbar's filled part ends, as the share of the range it covers. */
  const share = (Math.min(props.max, Math.max(props.min, typedPercent())) - props.min) / (props.max - props.min)
  // The label stands only while there is something to restore; at the default
  // size it would write the value already stored.
  const atDefault = props.percent === props.defaultPercent
  return React.createElement(
    'div',
    {
      ref: control,
      className: 'dsh-claude-settings-zoom',
      onPointerLeave: release,
      onBlurCapture: (event: React.FocusEvent<HTMLDivElement>) => {
        if (!control.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
      },
    },
    atDefault ? null : React.createElement('button', {
      type: 'button',
      className: 'dsh-claude-settings-zoom-reset',
      onClick: props.onReset,
    }, props.resetLabel),
    React.createElement(
      'label',
      {
        className: 'dsh-claude-settings-input dsh-claude-settings-zoom-field',
        onPointerEnter: () => setOpen(true),
        onFocus: () => setOpen(true),
      },
      React.createElement('input', {
        className: 'dsh-claude-settings-zoom-input',
        type: 'text',
        inputMode: 'numeric',
        maxLength: 4,
        value: text,
        placeholder: String(props.defaultPercent),
        'aria-label': props.fieldLabel,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => { setText(event.target.value) },
        onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commitTyped()
            event.currentTarget.blur()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            setText(String(props.percent))
            event.currentTarget.blur()
          }
        },
        onBlur: commitTyped,
      }),
      React.createElement('span', { className: 'dsh-claude-settings-zoom-unit' }, '%'),
    ),
    React.createElement(
      'div',
      { className: 'dsh-claude-settings-zoom-track dsh-claude-popover-card', 'data-open': open ? 'true' : 'false' },
      React.createElement('input', {
        ref: range,
        className: 'dsh-claude-settings-zoom-range',
        type: 'range',
        min: props.min,
        max: props.max,
        step: 1,
        value: typedPercent(),
        'aria-label': props.trackLabel,
        style: { '--dsh-claude-zoom-share': Math.round(share * 100) + '%' } as React.CSSProperties,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => { setText(event.target.value) },
      }),
    ),
  )
}
