import * as React from 'react'
import { Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { PREFS } from '@dsh-claude-style/contracts/prefs'
import { ROW_CONTROLS } from 'virtual:dsh-claude-style/settings-controls'
import { SEGMENTS_CLASS, SEGMENT_CLASS } from '../../shared/segment-control'
import { windowsDesktop } from '@dsh-claude-style/engine/desktop-band'
import { headerRowsOf, prefYielded, settingsRowsOf } from '../../core/feature'
import { featureCopy } from '../../core/i18n'
import { motionReduced } from '../../core/prefs'
import { copy, sharedLine } from './copy'
import { createSlidingPill } from '../../shared/sliding-pill'
import type { Feature, FeatureSettingsRow } from '../../core/feature'
import type { Prefs } from '../../constants'
import type { SettingsGroupId, SettingsRowSlot, SettingsTabId } from '../../core/feature'
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

/**
 * One choice of a segmented control. Its value type is the preference's own, so
 * a control that writes one hands back a value the table carries.
 */
export interface SegmentOption<V extends string = string> {
  value: V
  label: string
}

/** The control builders createSettingsControls returns. */
export type SettingsControls = ReturnType<typeof createSettingsControls>

/** What a tab's rows are built from on every render of the page (settings.ts). */
export interface SettingsView {
  prefs: Prefs
  write(patch: Partial<Prefs>): void
  controls: SettingsControls
  /** The control a manifest row places in the header of the row for this preference, or null (headerAside). */
  aside(parent: keyof Prefs): React.ReactElement | null
  quickTrigger: React.RefObject<HTMLButtonElement | null>
  quickProviderApi(): QuickProvidersHandle | null
  username: {
    value: string
    onChange(e: React.ChangeEvent<HTMLInputElement>): void
    onCompositionStart(e: React.CompositionEvent<HTMLInputElement>): void
    onCompositionEnd(e: React.CompositionEvent<HTMLInputElement>): void
    onBlur(): void
    onKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void
  }
}

/** One row of a tab, with its place among the slot's rows and the switch rows the manifests add (D72). */
export interface SettingsRow {
  rank: number
  node: React.ReactNode
}

/**
 * One labelled group of the main-window tab: the label that opens it and the
 * rows this page writes for it; the manifests' rows that name the group stand
 * among them (settings-tab-main-window.ts).
 */
export interface SettingsGroup {
  id: SettingsGroupId
  label(): string
  rows?(view: SettingsView): SettingsRow[]
}

/**
 * One tab that draws a single list of rows: its id, its strip label, the rows
 * it writes itself and, when the page it is open on calls for one, the line it
 * opens with.
 */
export interface ListSettingsTab {
  id: SettingsTabId
  label(): string
  rows(view: SettingsView): SettingsRow[]
  notice?(): string | null
}

/** One tab that draws labelled groups of rows: the main window's conversation side and the composer's. */
export interface GroupedSettingsTab {
  id: SettingsTabId
  label(): string
  groups(view: SettingsView): SettingsGroup[]
  notice?(): string | null
}

export type SettingsTab = ListSettingsTab | GroupedSettingsTab

/**
 * The rows of one slot: the rows the page writes for it and the rows the
 * feature manifests place in it, in rank order.
 */
function slotRows(id: SettingsRowSlot, own: SettingsRow[], view: SettingsView) {
  const rows = [...own, ...featureRows(id, view)]
  return rows.sort((a, b) => a.rank - b.rank).map(row => row.node)
}

/**
 * The tab's whole row list: its notice, then the rows of the tab's slot — a
 * single list, or the main window's groups with a label before each one.
 */
export function tabRows(tab: SettingsTab, view: SettingsView) {
  let nodes: React.ReactNode[]
  if ('groups' in tab) {
    nodes = []
    for (const group of tab.groups(view)) {
      const own = group.rows === undefined ? [] : group.rows(view)
      // The label is the group's heading, so a screen reader can move between
      // the main window's two halves without passing every row.
      nodes.push(React.createElement('div', { key: `group-${group.id}`, className: 'dsh-claude-settings-group', role: 'heading', 'aria-level': 3 }, group.label()))
      nodes.push(...slotRows(group.id, own, view))
    }
  } else {
    nodes = slotRows(tab.id, tab.rows(view), view)
  }
  const notice = tab.notice === undefined ? null : tab.notice()
  if (notice === null) return nodes
  return [React.createElement('div', { key: 'notice', className: 'dsh-claude-settings-notice dsh-claude-settings-tab-notice', role: 'note' }, notice), ...nodes]
}

/**
 * One line of a row's copy: the owning feature's own line, or this page's own
 * for a line two features' rows share (D72).
 */
function rowLine(feature: Feature, key: string) {
  return feature.copy === undefined || feature.copy[key] === undefined ? sharedLine(key) : featureCopy(feature.copy, key)
}

/** The slot's manifest rows by preference, for the rows that stand under another. */
function rowsByPrefOf(slot: SettingsRowSlot) {
  return new Map(settingsRowsOf(slot).map(({ row }) => [row.pref, row]))
}

/**
 * Whether a preference is off: a switch stored `false`, or a choice stored its
 * own `off`.
 */
function isOff(prefs: Prefs, pref: keyof Prefs) {
  const stored = prefs[pref]
  return stored === false || stored === 'off'
}

/**
 * Whether a row cannot act right now: the preference it stands under is off,
 * the row above it cannot act either, or its own requirement is unmet.
 */
function blocked(row: FeatureSettingsRow, seen: ReadonlySet<string>, prefs: Prefs, rowsByPref: ReadonlyMap<keyof Prefs, FeatureSettingsRow>): boolean {
  if (isOff(prefs, row.pref)) return true
  if (row.requires !== undefined && !row.requires.values.includes(String(prefs[row.requires.pref]))) return true
  if (row.windowsOnly === true && !windowsDesktop()) return true
  if (row.parent !== undefined && !seen.has(row.parent)) {
    const parent = rowsByPref.get(row.parent)
    if (parent !== undefined && blocked(parent, new Set([...seen, row.parent]), prefs, rowsByPref)) return true
  }
  return false
}

/**
 * What one manifest row draws: its title and description lines, its control and
 * whether it refuses input. The control follows the preference's own
 * declaration (packages/contracts/src/prefs.ts): a boolean is an on/off switch,
 * a choice a segmented control over the values the table carries, each labelled
 * by the row's own copy.
 *
 * A row refuses input and says why where it cannot act: a preference its
 * feature yields for (dsh-chat-ux on the page, managedDesc), one that only
 * works under another preference's values (`requires`), one standing under a row
 * that cannot act either (`parent`: the switch above it is off, or that row is
 * itself waiting), and one acting on the Windows desktop window alone
 * (`windowsOnly`) on every page that is not that window.
 */
function featureRowParts(feature: Feature, row: FeatureSettingsRow, view: SettingsView, rowsByPref: ReadonlyMap<keyof Prefs, FeatureSettingsRow>) {
  const controls = view.controls
  const pref = row.pref
  const spec = PREFS[pref]
  const yielded = prefYielded(pref)
  const title = row.title === undefined ? null : rowLine(feature, row.title)
  const desc = row.desc === undefined ? '' : rowLine(feature, row.desc)
  const requires = row.requires
  const waits = requires !== undefined && !requires.values.includes(String(view.prefs[requires.pref]))
    ? rowLine(feature, requires.note)
    : null
  const offWindows = row.windowsOnly === true && !windowsDesktop()
  const above = row.parent === undefined ? undefined : rowsByPref.get(row.parent)
  const parentBlocked = above !== undefined && blocked(above, new Set([row.parent as string]), view.prefs, rowsByPref)
  const stored = view.prefs[pref]
  // The row's key and its values are the table's data: the clamp holds them.
  const write = (value: string | boolean) => { view.write({ [pref]: value } as Partial<Prefs>) }
  // The row's own value never disables it: that is what the reader changes.
  const off = yielded || waits !== null || offWindows || parentBlocked
  // A row the feature draws itself renders its own control (D72); every other
  // row follows the preference's own type.
  const own = row.control === undefined ? undefined : ROW_CONTROLS[feature.id]?.[row.control]
  const sides = row.switch
  const control = own !== undefined
    ? React.createElement(own, { prefs: view.prefs, write: view.write, disabled: off })
    : spec.type === 'boolean'
      ? controls.toggle(stored !== false, write, off)
      : sides !== undefined
        ? controls.toggle(stored === sides.on, value => { write(value ? sides.on : sides.off) }, off)
        : controls.segment(
          (spec.type === 'choice' ? spec.values : []).map((value: string) => ({ value, label: rowLine(feature, row.choiceLabels?.[value] ?? value) })),
          String(stored),
          write,
          off,
        )
  const still = row.stillWhenReduced === true && motionReduced()
  const note = waits ?? (offWindows ? sharedLine('windowsOnlyNote') : still ? sharedLine('motionStillNote') : null)
  // A yielded row says who manages it even when it carries no description of
  // its own: the switch rows over the preview cards have none.
  const described = yielded
    ? managedDesc(desc, true)
    : (row.desc === undefined && note === null ? null : noteDesc(desc, note))
  const ownStatus = row.status === undefined ? undefined : ROW_CONTROLS[feature.id]?.[row.status]
  const status = ownStatus === undefined ? null : React.createElement(ownStatus, { key: 'status', prefs: view.prefs, write: view.write, disabled: off })
  const description = status === null ? described : described === null ? status : [described, status]
  return { title, description, control, off, drawn: own !== undefined }
}

/**
 * The rows the feature manifests declare for a slot (D72): a tab of the strip,
 * or one of the main window's groups. A row placed in a header (`placement`)
 * stands in its parent's row instead (headerAside).
 */
function featureRows(slot: SettingsRowSlot, view: SettingsView): SettingsRow[] {
  const controls = view.controls
  const rowsByPref = rowsByPrefOf(slot)
  return settingsRowsOf(slot).filter(({ row }) => row.placement !== 'header').map(({ feature, row }) => {
    const { title, description, control, off, drawn } = featureRowParts(feature, row, view, rowsByPref)
    // A feature's own control (preview cards, a table) takes the line under the
    // row's text, or the whole row when it has none, under a parent row too.
    const node = row.parent === undefined || drawn
      ? controls.row(row.pref, title, description, control, {
        disabled: off,
        block: drawn,
        sub: row.parent !== undefined,
        experimental: row.experimental === true,
      })
      : controls.subRow(row.pref, title ?? '', description, control, !off, row.experimental === true)
    return { rank: row.rank, node }
  })
}

/**
 * The control a manifest row places in the header of the row for `parent`
 * (FeatureSettingsRow.placement), named by that row's title; null where no row
 * is placed there. The parent's tab hands the result to `row()` as `aside`. A
 * header carries one control.
 */
export function headerAside(parent: keyof Prefs, view: SettingsView): React.ReactElement | null {
  const entries = headerRowsOf(parent)
  if (entries.length === 0) return null
  if (entries.length > 1) throw new Error(`settings: ${entries.length} rows are placed in the header of "${parent}"; a header carries one control`)
  const { feature, row } = entries[0]
  const { title, control } = featureRowParts(feature, row, view, rowsByPrefOf(row.tab))
  if (title === null) throw new Error(`settings: the header row of "${row.pref}" has no title for its accessible name`)
  const named = React.isValidElement(control) && control.type === ClaudeStyleSwitch
    ? React.cloneElement(control as React.ReactElement<{ label?: string }>, { label: title })
    : control
  return React.createElement('div', { key: `aside-${row.pref}`, className: 'dsh-claude-settings-row-aside', role: 'group', 'aria-label': title }, named)
}

/** A row's description, with the line naming the plugin that manages it while one does. */
export function managedDesc(text: string, managed: boolean): React.ReactNode {
  return noteDesc(text, managed ? copy('chatUxManaged') : null)
}

/**
 * A row's description, with `note` added below in the accent colour, so a row
 * that refuses input says why where the eye already is.
 */
export function noteDesc(text: string, note: string | null): React.ReactNode {
  if (note === null) return text
  return [text, React.createElement('span', { key: 'note', className: 'dsh-claude-settings-row-note' }, note)]
}
/**
 * One segmented control on the page, carrying the shared sliding highlight
 * (packages/client/src/shared/sliding-pill.ts). The group is React's, so the pill is
 * placed from a layout effect after every render — before the frame is
 * painted — and taken off when the group unmounts. `role` defaults to a
 * plain group; the tab strip passes `tablist`.
 */
export function ClaudeStyleSegmentGroup(props: { role?: string, className?: string, children?: React.ReactNode }) {
  const group = React.useRef<HTMLDivElement>(null)
  useSlidingPill(group)
  const className = props.className ? `${SEGMENTS_CLASS} ${props.className}` : SEGMENTS_CLASS
  return React.createElement('div', { ref: group, className, role: props.role || 'group' }, props.children)
}

/**
 * The shared sliding highlight on a group React renders: the pill follows the
 * child carrying `data-active`, placed after every render and taken off when
 * the group unmounts.
 */
export function useSlidingPill(group: React.RefObject<HTMLElement | null>) {
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
}

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
  function segment<V extends string>(options: readonly SegmentOption<V>[], active: string, onPick: (value: V) => void, disabled?: boolean) {
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

  /** An on/off switch; `row()` names it after the row it lands in. */
  function toggle(on: boolean, onPick: (value: boolean) => void, disabled?: boolean) {
    return React.createElement(ClaudeStyleSwitch, { on, onPick, disabled })
  }

  /** A row's text half: the title over the description; a row whose control is the explanation (a preview card) carries no description. */
  function rowText(title: string, description: React.ReactNode, experimental?: boolean) {
    return React.createElement(
      'div',
      { className: 'dsh-claude-settings-row-text' },
      title === '' ? null : React.createElement(
        'div',
        { className: 'dsh-claude-settings-row-title', 'data-experimental': experimental === true ? '' : undefined },
        title,
        // The tag is the host's own control, the one its plugin page marks an experimental package with.
        experimental === true ? React.createElement(Tag, { tone: 'info', className: 'dsh-claude-settings-row-tag' }, sharedLine('experimental')) : null,
      ),
      description === null ? null : React.createElement('div', { className: 'dsh-claude-settings-row-desc' }, description),
    )
  }

  /**
   * One row: title and description on the left, the control on the right.
   * A block row stacks its control under the text across the row's full
   * width. A row carrying a segmented control is marked as such: that control
   * is wide, and the stylesheet keeps it on the right while it fits and gives it
   * the next line when it does not (settings.css). A disabled row is announced
   * as such; its control is built disabled by the caller and its description
   * says why.
   *
   * A row with no title is the option under the switch that turns it on (the
   * Motion tab's preview cards), whose own controls carry their accessible
   * names: with no description either it is the control alone, across the row,
   * and with a note it carries that line over the cards. `sub`
   * marks a titled row that belongs to the row above it the same way, so the
   * group keeps no hairline between its members. `mark` names the row on the
   * element for a stylesheet that has to single it out.
   *
   * `aside` is a control that stands in the title line, across from the text,
   * above the block's own content: the switch or choice that belongs to the
   * block under it. It belongs to a block row, whose content has no right-hand
   * slot of its own.
   */
  function row(key: string, title: string | null, description: React.ReactNode, control: React.ReactNode, options?: { block?: boolean, disabled?: boolean, sub?: boolean, experimental?: boolean, mark?: string, aside?: React.ReactElement | null }) {
    const classes = ['dsh-claude-settings-row']
    if (options?.block) classes.push('dsh-claude-settings-row-block')
    else if (React.isValidElement(control) && control.type === ClaudeStyleSegmentGroup) classes.push('dsh-claude-settings-row-segment')
    // A row with no title is the option that belongs to
    // the switch above it, and `sub` is the same belonging for a titled row
    // (the precise status line under that switch): the stylesheet keeps the
    // group's members together, with no hairline between them (settings.css).
    if (options?.sub === true || title === null) classes.push('dsh-claude-settings-row-sub')
    // The switch has no text of its own; its name is this row's title.
    const named = React.isValidElement(control) && control.type === ClaudeStyleSwitch
      ? React.cloneElement(control as React.ReactElement<{ label?: string }>, { label: title ?? '' })
      : control
    const disabled = options?.disabled === true
    const text = title === null && description === null ? null : rowText(title ?? '', description, options?.experimental)
    const aside = options?.aside ?? null
    if (aside !== null && options?.block !== true) throw new Error(`settings: the row "${key}" carries an aside without being a block row`)
    return React.createElement(
      'div',
      { className: classes.join(' '), key, 'aria-disabled': disabled ? 'true' : undefined, 'data-disabled': disabled ? '' : undefined, 'data-dsh-claude-settings-row': options?.mark },
      aside === null ? text : React.createElement('div', { className: 'dsh-claude-settings-row-head' }, text, aside),
      named,
    )
  }

  /**
   * A row that belongs to the row above it: indented under its parent, and
   * disabled while the parent is off. The control is built by the caller
   * with the same `disabled` flag, so it also refuses the keyboard.
   */
  function subRow(key: string, title: string, description: React.ReactNode, control: React.ReactNode, enabled: boolean, experimental?: boolean) {
    const named = React.isValidElement(control) && control.type === ClaudeStyleSwitch
      ? React.cloneElement(control as React.ReactElement<{ label?: string }>, { label: title })
      : control
    return React.createElement(
      'div',
      {
        className: 'dsh-claude-settings-row dsh-claude-settings-row-sub',
        key,
        'aria-disabled': enabled ? undefined : 'true',
        'data-disabled': enabled ? undefined : '',
      },
      rowText(title, description, experimental),
      named,
    )
  }

  return { segment, toggle, row, subRow }
}
