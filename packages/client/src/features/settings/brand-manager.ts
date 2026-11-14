import * as React from 'react'
import { BRANDING_PRESET_LIMIT } from '@dsh-claude-style/contracts/branding-presets'
import type { BrandingAppearance, BrandingPreset } from '@dsh-claude-style/contracts/branding-presets'
import { readPrefs, savePrefs, subscribePrefs } from '../../core/prefs'
import { newBrandingPresetId, storeBrandingPresetPatch, storedBrandingPresets } from '../../shared/branding-presets'
import { brandingLabel, SeatArt, useBrandImages, usePageAppearance } from './brand-art'
import { brandingSet, BrandEditor } from './brand-editor'
import { createModalHost, SchemeItem, SchemeModal } from './scheme-modal'
import type { Prefs } from '../../constants'
import { copy } from './copy'

/**
 * The brand sets' manager in the frame the managers share (scheme-modal.ts):
 * its list holds the images kept outside any preset and every preset, and
 * makes a new preset; its editor is that set's (brand-editor.ts). It reads the
 * preferences and writes through the same store the settings page does, so
 * the page's brand cards and the manager stay in step.
 */

/** Where the manager opens: on the set the page paints, or on the one named (the empty id is the images kept outside any preset). */
export interface BrandManagerOpen {
  edit?: string
}

/** The set in hand and the side its editor arrives from. */
interface View {
  id: string
  enter: 'above' | 'below' | null
}

/** A list line's lead: the set's mark, small, in the appearance the page shows. */
function MarkLead(props: { prefs: Prefs, preset: BrandingPreset | undefined, mode: BrandingAppearance }) {
  const images = useBrandImages(props.preset, props.mode)
  return React.createElement('span', { className: 'dsh-claude-brand-lead', 'aria-hidden': 'true' }, React.createElement(SeatArt, { kind: 'mark', image: images.mark, prefs: props.prefs }))
}

function Manager(props: BrandManagerOpen & { close(): void }) {
  const prefs = React.useSyncExternalStore(subscribePrefs, readPrefs)
  const mode = usePageAppearance()
  const [view, setView] = React.useState<View>(() => ({ id: props.edit ?? prefs.brandingPreset, enter: null }))
  const presets = storedBrandingPresets(prefs)
  const ids = ['', ...presets.map(preset => preset.id)]
  // A set that left the records behind the manager's back gives the pane to the one the page paints.
  const current = brandingSet(prefs, view.id) === null ? prefs.brandingPreset : view.id
  const open = (id: string) => {
    const from = ids.indexOf(current)
    const to = ids.indexOf(id)
    setView({ id, enter: to !== -1 && to < from ? 'above' : 'below' })
  }
  const create = () => {
    const id = newBrandingPresetId(prefs)
    void savePrefs(storeBrandingPresetPatch(prefs, { id, name: copy('brandingPresetDefaultName') }, true)).then(() => open(id))
  }
  const sets: (BrandingPreset | undefined)[] = [undefined, ...presets]
  return React.createElement(SchemeModal, {
    title: copy('brandLockupTitle'),
    close: props.close,
    items: sets.map(preset => {
      const id = preset?.id ?? ''
      return React.createElement(SchemeItem, {
        key: id,
        id,
        lead: React.createElement(MarkLead, { prefs, preset, mode }),
        name: brandingLabel(preset),
        active: id === current,
        inUse: id === prefs.brandingPreset,
        pick: () => { if (id !== current) open(id) },
      })
    }),
    add: { label: copy('brandingPresetNew'), disabled: presets.length >= BRANDING_PRESET_LIMIT, run: create },
    foot: React.createElement('span', { className: 'dsh-claude-scheme-limit' }, copy('brandingPresetLimit', { count: String(BRANDING_PRESET_LIMIT) })),
    pane: React.createElement(BrandEditor, {
      key: current,
      prefs,
      id: current,
      enter: view.enter,
      open,
      leave: () => setView({ id: readPrefs().brandingPreset, enter: 'above' }),
    }),
  })
}

const manager = createModalHost<BrandManagerOpen>('brand-manager', Manager)

/** Open the manager over the page, replacing one that is already up. */
export function openBrandManager(first: BrandManagerOpen) {
  manager.open(first)
}

/** Close the manager, if one stands. */
export function closeBrandManager() {
  manager.close()
}
