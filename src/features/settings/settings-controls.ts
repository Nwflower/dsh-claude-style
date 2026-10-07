import * as React from 'react'
import { SEGMENTS_CLASS, SEGMENT_CLASS } from '../../constants'
import { createSlidingPill } from '../../shared/sliding-pill'
import type { Prefs } from '../../constants'
import type { QuickProvidersHandle } from './quick-providers'

/**
 * The settings page's controls: the segmented control, the switch, the row
 * shell and the indented sub-row. Every tab builds its rows from these, so
 * the page reads as one control set whichever tab is open.
 *
 * The segmented controls reuse the shared `.dsh-claude-segments` /
 * `.dsh-claude-segment` classes and sliding highlight — the same control the
 * composer's permission picker uses — so the two read as one design instead
 * of two lookalikes.
 */

/** One choice of a segmented control. */
export interface SegmentOption {
  value: string
  label: string
}

/** The control builders createSettingsControls returns. */
export type SettingsControls = ReturnType<typeof createSettingsControls>

/** What a tab's rows are built from on every render of the page (settings.ts). */
export interface SettingsView {
  prefs: Prefs
  write(patch: Partial<Prefs>): void
  controls: SettingsControls
  quickTrigger: React.RefObject<HTMLButtonElement | null>
  quickProviderApi(): QuickProvidersHandle | null
  username: {
    value: string
    onChange(e: React.ChangeEvent<HTMLInputElement>): void
    onBlur(): void
    onKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void
  }
}

/** One tab of the settings page: its id, its strip label and its rows. */
export interface SettingsTab {
  id: string
  label(): string
  rows(view: SettingsView): React.ReactNode[]
}
/**
 * One segmented control on the page, carrying the shared sliding highlight
 * (src/shared/sliding-pill.ts). The group is React's, so the pill is
 * placed from a layout effect after every render — before the frame is
 * painted — and taken off when the group unmounts. `role` defaults to a
 * plain group; the tab strip passes `tablist`.
 */
export function ClaudeStyleSegmentGroup(props: { role?: string, className?: string, children?: React.ReactNode }) {
  const group = React.useRef<HTMLDivElement>(null)
  const pill = React.useRef<ReturnType<typeof createSlidingPill> | null>(null)
  React.useLayoutEffect(() => {
    pill.current = createSlidingPill('[data-active]')
    return () => {
      pill.current!.release()
      pill.current = null
    }
  }, [])
  React.useLayoutEffect(() => {
    pill.current!.sync(group.current)
  })
  const className = props.className ? `${SEGMENTS_CLASS} ${props.className}` : SEGMENTS_CLASS
  return React.createElement('div', { ref: group, className, role: props.role || 'group' }, props.children)
}

/**
 * The control builders. They hold no state of their own: every value and
 * every write arrives through the arguments, so one set serves every tab.
 * @returns { segment, toggle, row, subRow }.
 */
export function createSettingsControls() {
  /**
   * A segmented control. `disabled` greys the whole group out and stops it
   * answering (a sub-row whose parent is off).
   */
  function segment(options: SegmentOption[], active: string, onPick: (value: string) => void, disabled?: boolean) {
    const buttons: React.ReactElement[] = []
    for (let i = 0; i < options.length; i++) {
      buttons.push(React.createElement(
        'button',
        {
          key: options[i].value,
          type: 'button',
          className: SEGMENT_CLASS,
          disabled: disabled === true,
          'data-active': options[i].value === active ? '' : undefined,
          'aria-pressed': options[i].value === active ? 'true' : 'false',
          onClick: (value => () => {
            if (value !== active) onPick(value)
          })(options[i].value),
        },
        options[i].label,
      ))
    }
    return React.createElement(ClaudeStyleSegmentGroup, null, buttons)
  }

  /** An on/off switch. */
  function toggle(on: boolean, onPick: (value: boolean) => void, disabled?: boolean) {
    return React.createElement(
      'button',
      {
        type: 'button',
        className: 'dsh-claude-settings-switch',
        role: 'switch',
        disabled: disabled === true,
        'aria-checked': on ? 'true' : 'false',
        'data-on': on ? '' : undefined,
        onClick() { onPick(!on) },
      },
      React.createElement('span', { className: 'dsh-claude-settings-switch-knob' }),
    )
  }

  /**
   * One row: title and description on the left, the control on the right.
   * A block row stacks its control under the text across the row's full
   * width.
   */
  function row(key: string, title: string, description: React.ReactNode, control: React.ReactNode, block?: boolean) {
    return React.createElement(
      'div',
      { className: block ? 'dsh-claude-settings-row dsh-claude-settings-row-block' : 'dsh-claude-settings-row', key },
      React.createElement(
        'div',
        { className: 'dsh-claude-settings-row-text' },
        React.createElement('div', { className: 'dsh-claude-settings-row-title' }, title),
        React.createElement('div', { className: 'dsh-claude-settings-row-desc' }, description),
      ),
      control,
    )
  }

  /**
   * A row that belongs to the row above it: indented under its parent, and
   * disabled while the parent is off. The control is built by the caller
   * with the same `disabled` flag, so it also refuses the keyboard.
   */
  function subRow(key: string, title: string, description: React.ReactNode, control: React.ReactNode, enabled: boolean) {
    return React.createElement(
      'div',
      {
        className: 'dsh-claude-settings-row dsh-claude-settings-row-sub',
        key,
        'aria-disabled': enabled ? undefined : 'true',
        'data-disabled': enabled ? undefined : '',
      },
      React.createElement(
        'div',
        { className: 'dsh-claude-settings-row-text' },
        React.createElement('div', { className: 'dsh-claude-settings-row-title' }, title),
        React.createElement('div', { className: 'dsh-claude-settings-row-desc' }, description),
      ),
      control,
    )
  }

  return { segment, toggle, row, subRow }
}
