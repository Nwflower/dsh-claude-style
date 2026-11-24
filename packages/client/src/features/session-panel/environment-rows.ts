import * as React from 'react'
import { observeMarker, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { PART_ATTR } from '../../constants'
import { copy } from './copy'
import { Row, detailsCard, panelEntry } from './panel-rows'
import { ComputerMark, PresetMark } from './session-panel-marks'

const h = React.createElement

/** The header's preset label, as the part walk marks it; the skin's own part, not a host selector. */
const PRESET = `[${PART_ATTR}~="header-label"]`

/**
 * The machine the session runs on (D113): the row before the host's working
 * folder, written on the first frame because nothing has to be asked for it.
 */
export function ComputerRow() {
  return h(Row, { mark: h(ComputerMark), title: copy('thisComputer') })
}

/** The preset's own words and its description, as the header's label carries them (D113). */
function usePresetLabel() {
  const [preset, setPreset] = React.useState({ label: '', hint: '' })
  React.useEffect(() => {
    let target: HTMLElement | null = null
    let stopTarget: (() => void) | null = null
    const read = () => {
      const label = (target?.textContent ?? '').trim()
      const hint = (target?.getAttribute('title') ?? '').trim()
      setPreset(previous => (previous.label === label && previous.hint === hint ? previous : { label, hint }))
    }
    // Watch text and title mutations only on the marked header-label element
    // itself rather than observing characterData across document.body (D40).
    const syncTarget = () => {
      const next = presets.all()[0] ?? null
      if (next !== target) {
        stopTarget?.()
        target = next
        stopTarget = target === null
          ? null
          : subscribeMutations(target, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title'] }, read)
      }
      read()
    }
    const presets = observeMarker<HTMLElement>(PRESET, syncTarget)
    syncTarget()
    return () => {
      stopTarget?.()
      presets.release()
    }
  }, [])
  return preset
}

/**
 * The preset closes the Environment section (D113): the header's own label
 * steps aside while the panel shows, so this row is where its words are read,
 * and its hover card carries the preset's own description.
 */
export const PresetRow = panelEntry(function PresetBody({ factories }) {
  const preset = usePresetLabel()
  if (preset.label === '') return null
  return h(Row, {
    mark: h(PresetMark),
    title: preset.label,
    card: preset.hint === '' ? undefined : detailsCard(factories, { title: preset.label, lines: [preset.hint] }),
  })
})
