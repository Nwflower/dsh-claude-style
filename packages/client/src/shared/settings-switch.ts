import * as React from 'react'

/**
 * One on/off switch: a button carrying the switch role and nothing but its knob
 * inside. The name comes from the row it sits in — `row()` hands it the row's
 * title — because a switch with no text of its own is announced as an
 * unlabelled switch.
 *
 * The knob bounces across only once the reader has pressed this switch: the
 * mark that arms the bounce is written by the press, so a page opening, a tab
 * switching back or a value arriving from elsewhere draws every knob at rest
 * (settings.css).
 */
export function ClaudeStyleSwitch(props: { on: boolean, onPick(value: boolean): void, disabled?: boolean, label?: string }) {
  const [moved, setMoved] = React.useState(false)
  return React.createElement(
    'button',
    {
      type: 'button',
      className: 'dsh-claude-settings-switch',
      role: 'switch',
      disabled: props.disabled === true,
      'aria-checked': props.on ? 'true' : 'false',
      'aria-label': props.label,
      'data-on': props.on ? '' : undefined,
      'data-moved': moved ? '' : undefined,
      onClick() {
        setMoved(true)
        props.onPick(!props.on)
      },
    },
    React.createElement('span', { className: 'dsh-claude-settings-switch-knob' }),
  )
}
