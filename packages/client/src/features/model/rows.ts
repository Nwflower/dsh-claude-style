import { AUTO_POPOVER_ALL } from '../../constants'
import { MODEL_OFFICIAL_GROUP } from './copy-fallbacks'
import { readPrefs } from '../../core/prefs'
import { buildModelLabel, modelBrand } from './brand'
import { modelDescription } from './copy-lookup'
import { buildElement } from '../../shared/dom'
import { POPOVER_CHECK_SVG, buildPopoverItem } from '../../shared/popover'
import type { createHoverIntent } from '../../shared/popover'
import type { HostContext } from '../../core/host'
import type { HostModelEntry, HostModelGroup } from '@dsh-claude-style/contracts/services'

/**
 * Model picker rows: the row/cell builders and the two level-1 list
 * selectors.
 *
 * Split out of the model picker's install (packages/client/src/features/model/model-picker.ts); this
 * fragment is the row half of that feature. createModelRows reaches the
 * feature's closure only through its options: ctx (the copy lookup),
 * pickModel(provider, modelId) (commit a row), subHoverIntent (the
 * More-models dwell/grace), and isSubOpen() / closeSub() / openSub() (the
 * second level's state). The two SVG strings and byModelId are pure and
 * stay at the fragment's top level.
 */
export const MODEL_CHEVRON_SVG = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/></svg>'

/** Catalog order is whatever the provider happened to send; id order is scannable. */
export function byModelId(a: HostModelEntry, b: HostModelEntry) {
  const left = String(a.id)
  const right = String(b.id)
  return left < right ? -1 : left > right ? 1 : 0
}

export function createModelRows(options: {
  ctx: HostContext
  pickModel: (provider: string, modelId: string) => void
  subHoverIntent: ReturnType<typeof createHoverIntent>
  isSubOpen: () => boolean
  closeSub: () => void
  openSub: () => void
  /** The peak rate meter's badge for one row, or null (features/peakrate). */
  rate: (provider: string, modelId: string) => HTMLElement | null
}) {
  const ctx = options.ctx
  const pickModel = options.pickModel
  const subHoverIntent = options.subHoverIntent
  const isSubOpen = options.isSubOpen
  const closeSub = options.closeSub
  const openSub = options.openSub
  const rate = options.rate

  /**
   * The rule that separates one provider's models from the next. The provider
   * name rides the rule itself rather than trailing the model in parentheses:
   * one quiet line above the group says who serves it, and the model names
   * stay clean.
   */
  function buildProviderRule(name: string) {
    const rule = buildElement('div', 'dsh-claude-model-rule')
    if (name) rule.appendChild(buildElement('span', 'dsh-claude-model-rule-name', name))
    return rule
  }

  /** One selectable model row: brand mark, name, optional description line and a check when current. */
  function buildModelOption(group: HostModelGroup, model: HostModelEntry, selected: boolean, withDescription: boolean) {
    // The shared row skeleton; the copy block keeps its own class, and
    // the vendor typography rides on the label inside it.
    const built = buildPopoverItem({ className: 'dsh-claude-model-option', role: 'menuitemradio', textClass: 'dsh-claude-model-copy', check: true })
    const item = built.row
    item.setAttribute('aria-checked', selected ? 'true' : 'false')
    const brand = modelBrand(model.id)
    // The brand id is the row's styling hook — it is what gives a vendor's rows
    // their own typography (see .dsh-claude-model-name in
    // features/model/model-picker.css). The vendor's mark is no longer drawn
    // here: it rides inside the label's lockup. The scheduler's attributeFilter
    // does not watch data-*, so this write cannot re-trigger a pass.
    if (brand) item.setAttribute('data-brand', brand)
    const copy = built.text
    copy.appendChild(buildModelLabel(model.name, brand))
    // The description belongs to level 1 only: that list is the official
    // catalog, short enough that the line is what tells the models apart,
    // while "More models" is every provider's full catalog and reads better
    // as names alone. One line, in the shell's language — the copy document is
    // localized rather than stacked, so a row never carries two languages.
    const desc = withDescription ? modelDescription(ctx, group.id, model) : ''
    if (desc) copy.appendChild(buildElement('span', 'dsh-claude-model-desc', desc))
    // The peak rate meter rides in front of the check: the row is compared by
    // its rate before it is picked, and a model whose provider bills on no
    // clock carries no badge at all (packages/client/src/features/peakrate/, D54).
    const meter = rate(group.id, model.id)
    if (meter !== null) item.insertBefore(meter, built.check)
    built.check!.innerHTML = selected ? POPOVER_CHECK_SVG : ''
    item.addEventListener('click', ((g: string, m: string) => (e: MouseEvent) => {
      e.stopPropagation()
      pickModel(g, m)
    })(group.id, model.id))
    return item
  }

  /** The More-models row: label + chevron, hover opens the second level. */
  function buildModelCell(label: string) {
    const cell = buildElement('button', 'dsh-claude-model-cell')
    cell.type = 'button'
    cell.setAttribute('role', 'menuitem')
    cell.appendChild(buildElement('span', 'dsh-claude-model-cell-label', label))
    const chevron = buildElement('span', 'dsh-claude-model-cell-chevron')
    chevron.innerHTML = MODEL_CHEVRON_SVG
    cell.appendChild(chevron)
    cell.addEventListener('mouseenter', () => {
      if (readPrefs().autoPopover === AUTO_POPOVER_ALL) subHoverIntent.scheduleOpen()
    })
    cell.addEventListener('mouseleave', () => {
      // A pointer that only crossed the cell must not drill in behind it.
      subHoverIntent.cancel()
    })
    cell.addEventListener('click', e => {
      e.stopPropagation()
      if (isSubOpen()) closeSub()
      else openSub()
    })
    return cell
  }

  /**
   * The providers level 1 lists: the official service first, then the quick
   * providers the settings page picked. Only when the catalog has no
   * (non-empty) official service at all does the list fall back to the
   * picked providers, and with none picked to every provider.
   */
  function levelOneSections(groups: HostModelGroup[]) {
    const sections: HostModelGroup[] = []
    const chosen = readPrefs().quickProviders
    for (let g0 = 0; g0 < groups.length; g0++) {
      if (groups[g0].id === MODEL_OFFICIAL_GROUP && groups[g0].models.length > 0) {
        sections.push(groups[g0])
        break
      }
    }
    for (let g2 = 0; g2 < groups.length; g2++) {
      if (!chosen.includes(groups[g2].id) || groups[g2].id === MODEL_OFFICIAL_GROUP || groups[g2].models.length === 0) continue
      sections.push(groups[g2])
    }
    if (sections.length === 0) {
      for (let g4 = 0; g4 < groups.length; g4++) {
        if (groups[g4].models.length > 0) sections.push(groups[g4])
      }
    }
    return sections
  }

  /**
   * The provider groups level 1 does NOT show — which is exactly what level 2
   * is for. Repeating a provider across the two cards made the same models
   * appear twice, one card apart.
   *
   * Only a GROUP counts as shown. The seat level 1 surfaces as a row of its
   * own does not: that row carries one model, not the provider, so hiding the
   * provider's remaining models behind it would strand them.
   */
  function remainingGroups(groups: HostModelGroup[], sections: HostModelGroup[]) {
    const shown: Record<string, boolean> = {}
    for (let i = 0; i < sections.length; i++) shown[sections[i].id] = true
    const out: HostModelGroup[] = []
    for (let g = 0; g < groups.length; g++) {
      if (groups[g].models.length === 0 || shown[groups[g].id] === true) continue
      out.push(groups[g])
    }
    return out
  }

  return {
    buildProviderRule,
    buildModelOption,
    buildModelCell,
    levelOneSections,
    remainingGroups
  }
}
