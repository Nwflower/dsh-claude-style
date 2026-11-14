import * as React from 'react'
import { BRAND_IMAGE_MAX_BYTES, BRAND_IMAGE_TYPES } from '@dsh-claude-style/contracts/brand'
import type { BrandImageKind } from '@dsh-claude-style/contracts/brand'
import { brandingSlot, withBrandingAsset } from '@dsh-claude-style/contracts/branding-presets'
import type { BrandingAppearance, BrandingPreset } from '@dsh-claude-style/contracts/branding-presets'
import { BRAND_CLAUDE, BRAND_INK_ORIGINAL, BRAND_NAME_MAX } from '../../constants'
import { loadBrandImages, loadBrandingPresetImages, readBrandImages, removeBrandImage, removeBrandingPresetAsset, subscribeBrandImages, uploadBrandImage, uploadBrandingPresetAsset } from '../../shared/custom-brand'
import type { BrandImage, BrandImages } from '../../shared/custom-brand'
import { selectedBrandingPreset, storeBrandingPresetPatch } from '../../shared/branding-presets'
import { PresetBar } from './settings-brand-presets'
import type { Prefs } from '../../constants'
import type { SettingsView } from './settings-controls'
import { copy } from './copy'
import { savePrefs } from '../../core/prefs'

/**
 * The brand area as the settings page's own drawn lockup (D30): the mark and
 * the word in the seats the sidebar paints them into, whichever brand is
 * chosen and whatever the reader has supplied. The seats write the same
 * preferences and the same host routes the rows they replace wrote, so a
 * reader's name and images carry over untouched: `brandName` for the typed
 * name, the image routes for the mark and the wordmark, `brandInk` for the ink
 * the brand's own art and the images take.
 *
 * The lockup is drawn here rather than moved from the sidebar: the sidebar's
 * identity is the host's own markup, painted by the theme's attribute
 * selectors, so this page draws a second copy from the same art and the same
 * stored values (theme/sidebar.css, shared/masked.css).
 */

/** Pause after the last keystroke before a typed name is written to the settings store. */
const NAME_SAVE_DEBOUNCE_MS = 600

/**
 * The art each brand draws when the reader supplied no picture, and the
 * proportions of the brand's own word. Each word is an asset whose box is the
 * drawing's own, so `wordRatio` is that box's width over its height and
 * `wordHeight` is how tall the box stands against the cap height: Claude's
 * wordmark is drawn at the cap height itself, while the host draws DeepSeek's
 * word in a 24-unit box beside an 18px whale (theme/sidebar.css).
 */
const BRAND_ART = {
  claude: {
    mark: 'var(--dsh-claude-image-claude-mark)',
    word: 'var(--dsh-claude-image-claude-word)',
    markRatio: 1,
    wordRatio: 512.22 / 121.54,
    wordHeight: 1,
  },
  deepseek: {
    mark: 'var(--dsh-claude-image-deepseek-mark)',
    word: 'var(--dsh-claude-image-deepseek-word)',
    markRatio: 23.16 / 17.04,
    wordRatio: 96 / 24,
    wordHeight: 24 / 18,
  },
}

const blankImages = (): BrandImages => ({ mark: null, wordmark: null, problems: {} })

/** Read the active legacy images or one preset's variant, independently for the editor. */
function useBrandImages(preset: BrandingPreset | undefined, mode: BrandingAppearance) {
  const [images, setImages] = React.useState<BrandImages>(preset === undefined ? readBrandImages() : blankImages())
  const signature = JSON.stringify(preset)
  React.useEffect(() => {
    if (preset === undefined) {
      const off = subscribeBrandImages(setImages)
      void loadBrandImages()
      setImages(readBrandImages())
      return off
    }
    let live = true
    setImages(blankImages())
    void loadBrandingPresetImages(preset, mode).then(value => { if (live) setImages(value) })
    return () => { live = false }
  }, [signature, mode])
  const reload = async (next: BrandingPreset | undefined) => {
    if (next === undefined) {
      await loadBrandImages()
      setImages(readBrandImages())
      return
    }
    setImages(await loadBrandingPresetImages(next, mode))
  }
  return { images, reload }
}

/** One image seat: file validation, upload, removal, and the last refusal. */
function useBrandSeat(kind: BrandImageKind, prefs: Prefs, write: SettingsView['write'], mode: BrandingAppearance) {
  const preset = selectedBrandingPreset(prefs)
  const { images, reload } = useBrandImages(preset, mode)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const picker = React.useRef<HTMLInputElement>(null)
  const run = (pending: Promise<void>) => {
    setBusy(true)
    setError(null)
    // A refusal from the host half is said on the row; the stored image stays (D12).
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
    if (preset === undefined) {
      run(uploadBrandImage(kind, file))
      return
    }
    run((async () => {
      const ref = await uploadBrandingPresetAsset(preset.id, brandingSlot(kind, mode), file)
      const next = withBrandingAsset(preset, kind, mode, ref)
      write(storeBrandingPresetPatch(prefs, next, true))
      await reload(next)
    })())
  }
  const remove = () => {
    if (preset === undefined) {
      run(removeBrandImage(kind))
      return
    }
    run((async () => {
      const next = withBrandingAsset(preset, kind, mode, null)
      await savePrefs(storeBrandingPresetPatch(prefs, next, true))
      await removeBrandingPresetAsset(preset.id, brandingSlot(kind, mode))
      await reload(next)
    })())
  }
  return {
    image: images[kind],
    problem: images.problems[kind],
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

/** The plate one icon button is: a circle of the panel's fill, a hairline and the icon in the accent. */
function Plate(props: { icon: keyof typeof ICONS, className?: string }) {
  return React.createElement(
    'span',
    { className: ['dsh-claude-brand-plate', props.className ?? ''].join(' ').trim(), 'aria-hidden': 'true' },
    React.createElement(
      'svg',
      { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' },
      ICONS[props.icon].map((d, at) => React.createElement('path', { key: at, d })),
    ),
  )
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
    React.createElement(
      'svg',
      { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
      ICONS.upload.map((d, at) => React.createElement('path', { key: at, d })),
    ),
  )
}

/**
 * One seat's art: the reader's picture when there is one, the brand's own art
 * otherwise. A shape is a mask over the brand's ink, which is how the sidebar
 * paints every seat — DeepSeek's whale and word alike take the ink the
 * image-colour choice names (theme/sidebar.css), so a whale drawn as a picture
 * would show a colour the sidebar never puts there. The reader's picture in its
 * own colours is a picture too, and wears that ink once the choice names one.
 */
function SeatArt(props: { kind: 'mark' | 'word', image: BrandImage | null, claude: boolean, inked: boolean }) {
  const art = BRAND_ART[props.claude ? 'claude' : 'deepseek']
  const own = props.image
  const image = own === null ? (props.kind === 'mark' ? art.mark : art.word) : `url("${own.url}")`
  const ratio = own === null ? (props.kind === 'mark' ? art.markRatio : art.wordRatio) : own.ratio
  const height = own === null && props.kind === 'word' ? art.wordHeight : 1
  const shape = own === null || props.inked ? 'mask' : 'picture'
  return React.createElement('span', {
    className: `dsh-claude-brand-art dsh-claude-brand-art-${props.kind}`,
    'data-shape': shape,
    style: {
      '--dsh-claude-brand-art': image,
      '--dsh-claude-brand-ratio': String(ratio),
      '--dsh-claude-brand-height': String(height),
    } as React.CSSProperties,
  })
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
 * The lockup: the mark seat, the name seat and the image button on one plate.
 * A reader who supplied nothing sees the brand's own art, which is what the
 * sidebar shows them; a seat holding the reader's own picture offers its
 * removal in the corner the action plate leaves free.
 */
export function BrandLockup(props: { prefs: Prefs, write: SettingsView['write'], disabled?: boolean }) {
  const [mode, setMode] = React.useState<BrandingAppearance>(document.body.hasAttribute('data-ds-dark-theme') ? 'dark' : 'light')
  const [managerBusy, setManagerBusy] = React.useState(false)
  const [managerError, setManagerError] = React.useState<string | null>(null)
  const mark = useBrandSeat('mark', props.prefs, props.write, mode)
  const word = useBrandSeat('wordmark', props.prefs, props.write, mode)
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(props.prefs.brandName)
  const timer = React.useRef<number | null>(null)
  const claude = props.prefs.brand === BRAND_CLAUDE
  const inked = props.prefs.brandInk !== BRAND_INK_ORIGINAL
  const busy = mark.busy || word.busy || managerBusy

  React.useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current) }, [])

  const save = (value: string) => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (value !== props.prefs.brandName) props.write({ brandName: value })
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
    setDraft(props.prefs.brandName)
  }

  // The word seat holds the reader's wordmark image first, then the name they
  // typed, then the brand's own word where an empty name would be — the
  // precedence the shell paints (features/brand/brand.ts).
  const wordMode = word.image !== null ? 'image' : props.prefs.brandName === '' ? 'brand' : 'name'
  const remove = (seat: Seat, className: string) => seat.image === null ? null : React.createElement(
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

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(PresetBar, { prefs: props.prefs, write: props.write, mode, setMode, busy: managerBusy, setBusy: setManagerBusy, setError: setManagerError }),
    React.createElement(
    'div',
    {
      className: 'dsh-claude-brand-lockup',
      'data-brand': claude ? 'claude' : 'deepseek',
      'data-disabled': props.disabled === true ? '' : undefined,
    },
    SeatPicker({ seat: mark }),
    SeatPicker({ seat: word }),
    React.createElement(
      'div',
      { className: 'dsh-claude-brand-zone dsh-claude-brand-zone-mark' },
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'dsh-claude-brand-seat',
          disabled: busy,
          'aria-label': mark.image === null ? copy('brandMarkUpload') : copy('brandMarkReplace'),
          onClick: mark.open,
        },
        SeatArt({ kind: 'mark', image: mark.image, claude, inked }),
        Plate({ icon: 'upload', className: 'dsh-claude-brand-seat-plate' }),
      ),
      remove(mark, 'dsh-claude-brand-clear-mark'),
    ),
    React.createElement(
      'div',
      { className: 'dsh-claude-brand-zone dsh-claude-brand-zone-word' },
      editing
        ? NameField({ value: draft, onChange: change, onDone: done, onCancel: cancel })
        : React.createElement(
          'button',
          {
            type: 'button',
            className: 'dsh-claude-brand-seat',
            disabled: busy,
            'aria-label': wordMode === 'image' ? copy('brandWordmarkReplace') : copy('brandNameEdit'),
            onClick: wordMode === 'image' ? word.open : () => { setDraft(props.prefs.brandName); setEditing(true) },
          },
          wordMode === 'name'
            ? React.createElement('span', { className: 'dsh-claude-brand-typed' }, props.prefs.brandName)
            : SeatArt({ kind: 'word', image: word.image, claude, inked }),
          Plate({ icon: wordMode === 'image' ? 'upload' : 'pencil', className: 'dsh-claude-brand-seat-plate' }),
        ),
      editing ? null : ImageButton({ seat: word }),
      remove(word, 'dsh-claude-brand-clear-word'),
    ),
    mark.error === null && word.error === null && mark.problem === undefined && word.problem === undefined && managerError === null
      ? null
      : React.createElement('div', { className: 'dsh-claude-brand-error', role: 'alert' }, mark.error ?? word.error ?? managerError ?? mark.problem ?? word.problem),
    ),
  )
}
