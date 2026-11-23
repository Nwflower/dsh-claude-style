/**
 * The session overview inside the host's session panel (D112).
 *
 * The host owns the panel — where it docks, when it opens, its toggle and its
 * order — and the skin hands it four sections and two Environment rows. The
 * data comes from the host half's own route
 * (packages/host/src/session-panel.ts) and the statistics feature's live
 * reading; this module holds the registrations and the page mark the header and
 * the composer's statistics line follow while the panel shows.
 */
import { SESSION_PANEL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMatches } from '@dsh-claude-style/engine/bus'
import { registerSlotEntries } from '@dsh-claude-style/engine/host'
import type { HostContext, SlotEntry } from '@dsh-claude-style/engine/host'
import { setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { SESSION_PANEL_ATTR } from '../../constants'
import { copy } from './copy'
import type { CopyKey } from './copy'
import { clearPanelContext, setPanelContext } from './session-panel-host'
import { clearPanelUi, setPanelUi } from './session-panel-live'
import { ContextSection } from './context-section'
import { StatsSection, TokensSection } from './figures-sections'
import { OutputsSection } from './outputs-section'
import { ComputerRow, PresetRow } from './environment-rows'
import { ContextReading, OutputsReading, StatsReading, TokensReading } from './section-readings'
import { installSectionFold } from './section-fold'
import type { FeatureUi } from '../../core/feature'
import type manifest from './session-panel.manifest'

/** The panel's section list, trailing section readings and Environment section's rows. */
const SECTION_SLOT = 'conversation.session.panel.section'
const SECTION_ACTIONS_SLOT = 'conversation.session.panel.section.actions'
const ENVIRONMENT_ROW_SLOT = 'conversation.session.panel.environment.row'

/**
 * One section. The id is also the key the host stores the reader's section
 * order under, so it never changes once shipped (D112).
 */
function section(id: string, order: number, title: CopyKey, component: unknown): SlotEntry {
  return { options: { name: SECTION_SLOT, id, order, label() { return copy(title) } }, component }
}

/** One section's trailing summary reading, shown while that section is folded (D113). */
function reading(key: string, component: unknown): SlotEntry {
  return { options: { name: SECTION_ACTIONS_SLOT, key }, component }
}

/**
 * The entries in the panel's order: Environment is the host's (0) and change
 * requests the first of its own after it (100); the skin's sections stand
 * between them. In Environment the host's working folder row is `order: 0` and
 * its forge rows — the checkout, local changes and the connection — run from 20
 * to 40, so the machine comes before them all and the preset closes the section.
 */
const ENTRIES: readonly SlotEntry[] = [
  section('claude-style-context', 10, 'context', ContextSection),
  section('claude-style-stats', 20, 'sessionStats', StatsSection),
  section('claude-style-tokens', 30, 'tokenUsage', TokensSection),
  section('claude-style-outputs', 40, 'outputs', OutputsSection),
  reading('claude-style-context', ContextReading),
  reading('claude-style-stats', StatsReading),
  reading('claude-style-tokens', TokensReading),
  reading('claude-style-outputs', OutputsReading),
  { options: { name: ENVIRONMENT_ROW_SLOT, id: 'claude-style-computer', order: -10 }, component: ComputerRow },
  { options: { name: ENVIRONMENT_ROW_SLOT, id: 'claude-style-preset', order: 50 }, component: PresetRow },
]

export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  setPanelContext(ctx)
  // The figures' live reading belongs to the statistics feature, installed under
  // its own switch: the registry is held for this generation, and a handle that
  // arrives or leaves hands the tables back to the route's folded numbers.
  setPanelUi(ui)
  const fiber = registerSlotEntries(ctx, ENTRIES, 'dsh-claude-style: session panel sections')
  const stopFold = installSectionFold()
  // The panel element stands only while the panel shows: the body carries that
  // as the skin's own mark, so the header's preset label and its work chips step
  // aside with one attribute (D112).
  function markShown() {
    if (panels.all().length > 0) setAttributeIfChanged(document.body, SESSION_PANEL_ATTR, '')
    else document.body.removeAttribute(SESSION_PANEL_ATTR)
  }
  const panels = observeMatches<HTMLElement>(SESSION_PANEL_SELECTOR, markShown)
  markShown()
  return () => {
    stopFold()
    panels.release()
    document.body.removeAttribute(SESSION_PANEL_ATTR)
    clearPanelContext(ctx)
    clearPanelUi(ui)
    if (fiber !== null && fiber !== undefined && typeof fiber.dispose === 'function') fiber.dispose()
  }
}
