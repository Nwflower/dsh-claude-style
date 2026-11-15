import * as React from 'react'
import { BRAND_IMAGE_MAX_BYTES, BRAND_IMAGE_TYPES } from '@dsh-claude-style/contracts/brand'
import type { BrandImageKind } from '@dsh-claude-style/contracts/brand'
import { brandingSlot, brandingVendorOf, withBrandingAsset } from '@dsh-claude-style/contracts/branding-presets'
import type { BrandingAppearance, BrandingPreset } from '@dsh-claude-style/contracts/branding-presets'
import { BRAND_CLAUDE, BRAND_NAME_MAX } from '../../constants'
import { removeBrandingPresetAsset, uploadBrandingPresetAsset } from '../../shared/custom-brand'
import type { BrandImage } from '../../shared/custom-brand'
import { readPrefs, savePrefs } from '../../core/prefs'
import { brandingInkOf, brandingRecord, storeBrandingPresetPatch } from '../../shared/branding-presets'
import { SeatArt, useBrandImages, WordArt, wordModeOf } from './brand-art'
import type { Prefs } from '../../constants'
import { copy } from './copy'

/**
 * The brand area as the brand editor's own drawn lockup (D97): the mark and the
 * word in the seats the sidebar paints them into, for the set the editor holds
 * in one appearance. The seats write the same preferences and the same host
 * routes the sidebar reads: `brandName` for the typed name, the preset's
 * managed assets for the mark and the wordmark. The theme style's own art and
 * the built-in presets hold images no seat replaces (a fixed set); the theme
 * style's word seat still takes the typed name.
 *
 * The lockup is drawn here rather than moved from the sidebar: the sidebar's
 * identity is the host's own markup, painted by the theme's attribute
 * selectors, so this page draws a second copy from the same art and the same
 * stored values (theme/sidebar.css, shared/masked.css, brand-art.ts).
 */

/** Pause after the last keystroke before a typed name is written to the settings store. */
const NAME_SAVE_DEBOUNCE_MS = 600

/** One image seat: file validation, upload, removal, and the last refusal. */
function useBrandSeat(kind: BrandImageKind, image: BrandImage | null, preset: BrandingPreset | undefined, mode: BrandingAppearance) {
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const picker = React.useRef<HTMLInputElement>(null)
  const run = (pending: Promise<void>) => {
    setBusy(true)
    setError(null)
    // A refusal from the host half is said under the lockup; the stored image stays (D12).
    pending.then(() => setBusy(false), (reason: { message?: string }) => {
      setBusy(false)
      setError(copy('brandImageFailed', { detail: reason?.message ?? String(reason) }))
    })
  }
  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) return
    if (BRAND_IMAGE_TYPES[file.type] === undefined) {
      setError(copy('brandImageType'))
      return
    }
    if (file.size > BRAND_IMAGE_MAX_BYTES) {
      setError(copy('brandImageSize'))
      return
    }
    if (preset === undefined) throw new Error('dsh-claude-style: a fixed brand set takes no image')
    run((async () => {
      const ref = await uploadBrandingPresetAsset(preset.id, brandingSlot(kind, mode), file)
      await savePrefs(storeBrandingPresetPatch(readPrefs(), withBrandingAsset(preset, kind, mode, ref)))
    })())
  }
  const remove = () => {
    if (preset === undefined) throw new Error('dsh-claude-style: a fixed brand set takes no image')
    run((async () => {
      await savePrefs(storeBrandingPresetPatch(readPrefs(), withBrandingAsset(preset, kind, mode, null)))
      await removeBrandingPresetAsset(preset.id, brandingSlot(kind, mode))
    })())
  }
  return {
    image,
    busy,
    error,
    picker,
    pick,
    open: () => picker.current?.click(),
    remove,
  }
}

type Seat = ReturnType<typeof useBrandSeat>

/** The hidden file input a seat opens. */
function SeatPicker(props: { seat: Seat }) {
  return React.createElement('input', {
    ref: props.seat.picker,
    type: 'file',
    accept: Object.keys(BRAND_IMAGE_TYPES).join(','),
    hidden: true,
    onChange: props.seat.pick,
  })
}

/** The icon a seat draws over itself while the pointer is on it. */
const ICONS = {
  upload: ['M8 10.6V3.4', 'M5.1 6.3 8 3.4l2.9 2.9', 'M3.3 10.4v1.4c0 .5.4.9.9.9h7.6c.5 0 .9-.4.9-.9v-1.4'],
  pencil: ['M11.1 2.9l2 2-7.4 7.4-2.6.6.6-2.6 7.4-7.4Z'],
}

/** One icon drawn in the seats' line. */
function Icon(props: { icon: keyof typeof ICONS }) {
  return React.createElement(
    'svg',
    { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
    ICONS[props.icon].map((d, at) => React.createElement('path', { key: at, d })),
  )
}

/** The plate a seat draws over itself: a circle of the panel's fill, a hairline and the icon in the accent. */
function SeatPlate(props: { icon: keyof typeof ICONS }) {
  return React.createElement('span', { className: 'dsh-claude-brand-plate dsh-claude-brand-seat-plate', 'aria-hidden': 'true' }, React.createElement(Icon, { icon: props.icon }))
}

/** The button that offers the name seat a wordmark image, in the seats' own plate. */
function ImageButton(props: { seat: Seat }) {
  return React.createElement(
    'button',
    {
      type: 'button',
      className: 'dsh-claude-brand-plate dsh-claude-brand-image-button',
      disabled: props.seat.busy,
      'aria-label': copy('brandWordmarkPick'),
      onClick: props.seat.open,
    },
    React.createElement(Icon, { icon: 'upload' }),
  )
}

/** The name seat's field: the typed name in the word's own place, in the word's own face and size. */
function NameField(props: { value: string, onChange: (value: string) => void, onDone: () => void, onCancel: () => void }) {
  return React.createElement('input', {
    type: 'text',
    className: 'dsh-claude-brand-name',
    value: props.value,
    maxLength: BRAND_NAME_MAX,
    placeholder: copy('brandNamePlaceholder'),
    spellCheck: false,
    autoComplete: 'off',
    'aria-label': copy('brandNameTitle'),
    autoFocus: true,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.onChange(event.target.value),
    onBlur: props.onDone,
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        props.onDone()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        props.onCancel()
      }
    },
  })
}

/**
 * The lockup: the mark seat and the name seat with its image button on one
 * plate, for the set `id` names in the appearance `mode`. A set with no
 * pictures shows the brand's own art, which is what the sidebar shows; a seat
 * holding the reader's own picture offers its removal in the corner the action
 * plate leaves free.
 */
export function BrandLockup(props: { prefs: Prefs, id: string, mode: BrandingAppearance }) {
  const { prefs, id, mode } = props
  // The theme style's art and the built-in presets are fixed sets: their images come with them.
  const preset = brandingVendorOf(id) === undefined ? brandingRecord(prefs, id) : undefined
  const ink = brandingInkOf(prefs, id)
  const images = useBrandImages(prefs, id, mode)
  const mark = useBrandSeat('mark', images.mark, preset, mode)
  const word = useBrandSeat('wordmark', images.wordmark, preset, mode)
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(prefs.brandName)
  const timer = React.useRef<number | null>(null)
  const busy = mark.busy || word.busy

  React.useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current) }, [])

  const save = (value: string) => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (value !== readPrefs().brandName) void savePrefs({ brandName: value })
  }
  const change = (value: string) => {
    setDraft(value)
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => save(value.trim().slice(0, BRAND_NAME_MAX)), NAME_SAVE_DEBOUNCE_MS)
  }
  const done = () => {
    setEditing(false)
    save(draft.trim().slice(0, BRAND_NAME_MAX))
  }
  const cancel = () => {
    setEditing(false)
    setDraft(prefs.brandName)
  }

  const wordMode = wordModeOf(images, prefs)
  const fixed = preset === undefined
  // The theme style's own art stands in an empty seat, and a reader's set shows it as the place to put one; a built-in drawing no mark leaves the seat out.
  const absent = fixed && id !== '' ? 'none' : 'brand'
  /** A fixed seat: the art alone, which no click replaces. */
  const still = (art: React.ReactElement) => React.createElement('span', { className: 'dsh-claude-brand-seat' }, art)
  const remove = (seat: Seat, className: string) => fixed || seat.image === null ? null : React.createElement(
    'button',
    {
      type: 'button',
      className: `dsh-claude-brand-clear ${className}`,
      disabled: busy,
      'aria-label': copy('brandImageRemove'),
      onClick: seat.remove,
    },
    React.createElement('span', { 'aria-hidden': 'true' }, '×'),
  )
  const problem = mark.error ?? word.error ?? images.problems.mark ?? images.problems.wordmark ?? null

  return React.createElement(
    'div',
    { className: 'dsh-claude-brand-lockup', 'data-brand': prefs.brand === BRAND_CLAUDE ? 'claude' : 'deepseek' },
    fixed ? null : SeatPicker({ seat: mark }),
    fixed ? null : SeatPicker({ seat: word }),
    React.createElement(
      'div',
      { className: 'dsh-claude-brand-zone dsh-claude-brand-zone-mark' },
      fixed ? still(React.createElement(SeatArt, { kind: 'mark', image: mark.image, prefs, ink, absent })) : React.createElement(
        'button',
        {
          type: 'button',
          className: 'dsh-claude-brand-seat',
          disabled: busy,
          'aria-label': mark.image === null ? copy('brandMarkUpload') : copy('brandMarkReplace'),
          onClick: mark.open,
        },
        React.createElement(SeatArt, { kind: 'mark', image: mark.image, prefs, ink, absent }),
        React.createElement(SeatPlate, { icon: 'upload' }),
      ),
      remove(mark, 'dsh-claude-brand-clear-mark'),
    ),
    React.createElement(
      'div',
      { className: 'dsh-claude-brand-zone dsh-claude-brand-zone-word' },
      editing
        ? NameField({ value: draft, onChange: change, onDone: done, onCancel: cancel })
        : fixed && wordMode === 'image' ? still(React.createElement(WordArt, { images, prefs, ink })) : React.createElement(
          'button',
          {
            type: 'button',
            className: 'dsh-claude-brand-seat',
            disabled: busy,
            'aria-label': wordMode === 'image' ? copy('brandWordmarkReplace') : copy('brandNameEdit'),
            onClick: wordMode === 'image' ? word.open : () => { setDraft(prefs.brandName); setEditing(true) },
          },
          React.createElement(WordArt, { images, prefs, ink }),
          React.createElement(SeatPlate, { icon: wordMode === 'image' ? 'upload' : 'pencil' }),
        ),
      editing || fixed ? null : ImageButton({ seat: word }),
      remove(word, 'dsh-claude-brand-clear-word'),
    ),
    problem === null ? null : React.createElement('div', { className: 'dsh-claude-brand-error', role: 'alert' }, problem),
  )
}
