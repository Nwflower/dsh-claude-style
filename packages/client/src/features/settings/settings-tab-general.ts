import * as React from 'react'
import { AUTO_POPOVER_ACCOUNT, AUTO_POPOVER_ALL, AUTO_POPOVER_OFF, BRAND_CLAUDE, BRAND_DEEPSEEK, PAGE_ZOOM_MAX, PAGE_ZOOM_MIN, PAGE_ZOOM_SYSTEM, PALETTE_COLORING_BRAND, PALETTE_COLORING_CUSTOM, USERNAME_MAX } from '../../constants'
import { COMBINE_SVGS } from 'virtual:dsh-claude-style/generated'
import { createHostToast } from '../../shared/host-toast'
import { pageZoomPercent } from '../../shared/page-zoom'
import { PreviewCards } from '../../shared/preview-cards'
import type { Prefs } from '../../constants'
import type { PreviewOption } from '../../shared/preview-cards'
import type { SegmentOption, SettingsTab, SettingsView } from './settings-controls'
import { copy } from './copy'

/**
 * The zoom row's control: the five presets, the percentage box and the seekbar
 * the box opens on hover or focus.
 *
 * The box keeps the text typed so far, so a half-typed number survives the
 * preference echoing back; a commit writes a whole percentage and leaves the box
 * on what the row now holds, which also covers a number the range closes onto
 * one end. The seekbar writes once per gesture — the native `change`, which
 * lands on release and after each key step — because every write is a host
 * settings save and a page-wide preference pass.
 */
function ZoomControl(props: {
  presets: React.ReactNode
  percent: number
  onPick: (percent: number) => void
}) {
  const [text, setText] = React.useState(String(props.percent))
  const [open, setOpen] = React.useState(false)
  const capsule = React.useRef<HTMLDivElement>(null)
  const range = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => { setText(String(props.percent)) }, [props.percent])

  /** Write one percentage, held to the row's range, and leave the box on what it lands on. */
  function write(percent: number) {
    const clamped = Math.min(PAGE_ZOOM_MAX, Math.max(PAGE_ZOOM_MIN, percent))
    setText(String(clamped))
    if (clamped !== props.percent) props.onPick(clamped)
  }

  /** The box's text as a whole percentage; unreadable text is the preference on hand. */
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

  // The seekbar's commit is attached once, so it reads this render's `write`
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

  /** Close the seekbar unless the focus it serves is still inside the capsule. */
  function release() {
    if (capsule.current?.contains(document.activeElement)) return
    setOpen(false)
  }

  /** Where the seekbar's filled part ends, as the share of the range it covers. */
  const share = (Math.min(PAGE_ZOOM_MAX, Math.max(PAGE_ZOOM_MIN, typedPercent())) - PAGE_ZOOM_MIN) / (PAGE_ZOOM_MAX - PAGE_ZOOM_MIN)
  return React.createElement(
    'div',
    {
      ref: capsule,
      className: 'dsh-claude-settings-zoom',
      onPointerLeave: release,
      onBlurCapture: (event: React.FocusEvent<HTMLDivElement>) => {
        if (!capsule.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
      },
    },
    props.presets,
    React.createElement(
      'label',
      {
        className: 'dsh-claude-settings-zoom-field',
        onPointerEnter: () => setOpen(true),
        onFocus: () => setOpen(true),
      },
      React.createElement('input', {
        className: 'dsh-claude-settings-zoom-input',
        type: 'number',
        min: PAGE_ZOOM_MIN,
        max: PAGE_ZOOM_MAX,
        step: 1,
        value: text,
        'aria-label': copy('pageZoomCustomLabel'),
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
        min: PAGE_ZOOM_MIN,
        max: PAGE_ZOOM_MAX,
        step: 1,
        value: typedPercent(),
        'aria-label': copy('pageZoomTrackLabel'),
        style: { '--dsh-claude-zoom-share': `${Math.round(share * 100)}%` } as React.CSSProperties,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => { setText(event.target.value) },
      }),
    ),
  )
}

/**
 * The settings page's General tab: the theme style, the username, the page's
 * own scale and the hover-open popovers; the rendering engine is the sodium
 * feature's own row, placed here by its manifest (D76).
 *
 * Each tab is a `{ id, label, rows(view) }` record: `rows` runs on every
 * render of the page (packages/client/src/features/settings/settings.ts) with the page's
 * view — the preferences, the write path, the controls and the username
 * field's state.
 */
export function createSettingsGeneralTab(): SettingsTab {
  const toast = createHostToast()

  /** The name of the colour card that is keeping the page's colours fixed. */
  function paletteName(colouring: Prefs['paletteColors']) {
    if (colouring === PALETTE_COLORING_CUSTOM) return copy('paletteCustom')
    return colouring === BRAND_DEEPSEEK ? copy('brandDeepseek') : copy('brandClaude')
  }

  /**
   * The theme style renders as a grid of large cards, each carrying the
   * brand's own mark: brands are presets, not sibling tiers of one setting.
   * The stylesheet picks the mark off the logo's data-brand, so a new brand
   * is one option here plus one rule in settings-cards.css.
   */
  function themePicker(prefs: Prefs, write: SettingsView['write']) {
    const options: PreviewOption<Prefs['brand']>[] = [
      // DeepSeek's lockup is one piece of art that already draws the mark with
      // its word; Claude's card carries the mark and the word as two pieces.
      {
        value: BRAND_DEEPSEEK,
        label: copy('brandDeepseek'),
        attributes: { 'data-brand': BRAND_DEEPSEEK },
        content: React.createElement('span', {
          className: 'dsh-claude-brand-card-lockup',
          'aria-hidden': 'true',
          dangerouslySetInnerHTML: { __html: COMBINE_SVGS.deepseek },
        }),
      },
      {
        value: BRAND_CLAUDE,
        label: copy('brandClaude'),
        attributes: { 'data-brand': BRAND_CLAUDE },
        content: [
          React.createElement('span', { key: 'mark', className: 'dsh-claude-brand-card-logo', 'data-brand': BRAND_CLAUDE, 'aria-hidden': 'true' }),
          React.createElement('span', { key: 'word', className: 'dsh-claude-brand-card-word dsh-claude-masked-word', 'aria-hidden': 'true' }),
        ],
      },
    ]
    return React.createElement(PreviewCards<Prefs['brand']>, {
      cardClass: 'dsh-claude-brand-card',
      options,
      value: prefs.brand,
      write: (value: Prefs['brand']) => write({ brand: value }),
      // The card names its own brand: the two cards draw their art differently
      // (Claude's mark beside its word, DeepSeek's lockup as one piece), so the
      // card, not the art inside it, is what a reader and the lane press.
      press: (option) => {
        write({ brand: option.value })
        if (prefs.paletteColors === PALETTE_COLORING_BRAND) return
        toast.show({
          text: copy('paletteFixed', { name: paletteName(prefs.paletteColors) }),
          actions: [{
            label: copy('paletteFollowBrand'),
            onClick: () => {
              write({ paletteColors: PALETTE_COLORING_BRAND })
              toast.hide()
            },
          }],
        })
      },
    })
  }

  function rows(view: SettingsView) {
    const prefs = view.prefs
    const write = view.write
    const controls = view.controls
    const autoPopoverOptions: SegmentOption<Prefs['autoPopover']>[] = [
      { value: AUTO_POPOVER_OFF, label: copy('autoPopoverOff') },
      { value: AUTO_POPOVER_ACCOUNT, label: copy('autoPopoverAccount') },
      { value: AUTO_POPOVER_ALL, label: copy('autoPopoverAll') },
    ]
    const username = view.username
    return [
      {
        rank: 10,
        node: controls.row(
          'brand',
          copy('brandTitle'),
          copy('brandDesc'),
          themePicker(prefs, write),
          { block: true },
        ),
      },
      {
        rank: 20,
        node: controls.row(
          'username',
          copy('usernameTitle'),
          copy('usernameDesc'),
          React.createElement('input', {
            type: 'text',
            className: 'dsh-claude-settings-input',
            value: username.value,
            maxLength: USERNAME_MAX,
            placeholder: copy('usernamePlaceholder'),
            spellCheck: false,
            autoComplete: 'off',
            onChange: username.onChange,
            onBlur: username.onBlur,
            onKeyDown: username.onKeyDown,
          }),
        ),
      },
      {
        rank: 30,
        node: controls.row(
          'pageZoom',
          copy('pageZoomTitle'),
          copy('pageZoomDesc'),
          React.createElement(ZoomControl, {
            presets: controls.segment(
              [
                { value: PAGE_ZOOM_SYSTEM, label: copy('pageZoomSystem') },
                { value: '80', label: copy('pageZoom08') },
                { value: '100', label: copy('pageZoom1') },
                { value: '125', label: copy('pageZoom125') },
                { value: '150', label: copy('pageZoom15') },
              ],
              prefs.pageZoom,
              value => { write({ pageZoom: value }) },
            ),
            percent: pageZoomPercent(prefs.pageZoom),
            onPick: percent => { write({ pageZoom: String(percent) }) },
          }),
          { experimental: true },
        ),
      },
      {
        rank: 40,
        node: controls.row(
          'autoPopover',
          copy('autoPopoverTitle'),
          copy('autoPopoverDesc'),
          controls.segment(autoPopoverOptions, prefs.autoPopover, value => { write({ autoPopover: value }) }),
        ),
      },
    ]
  }
  return { id: 'general', label: () => copy('tabGeneral'), rows }
}
