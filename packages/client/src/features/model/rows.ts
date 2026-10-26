import { AUTO_POPOVER_ALL } from '../../constants'
import { MODEL_OFFICIAL_GROUP } from './model-labels'
import { readPrefs } from '../../core/prefs'
import { localized } from '../../core/i18n'
import { buildModelLabel, modelBrand } from './brand'
import { modelCopy, resolveModelCopy } from './model-copy'
import { releaseTag } from './release-tag'
import { buildElement, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { POPOVER_CHECK_SVG, buildPopoverItem } from '../../shared/popover'
import type { createHoverIntent } from '../../shared/popover'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostModelEntry, HostModelGroup } from '@dsh-claude-style/contracts/services'

/**
 * Model picker rows: the row/cell builders and the two level-1 list selectors,
 * the row half of the model picker feature. createModelRows reaches the
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

/**
 * The description line for one catalog model, in the shell's language, out of
 * the copy document the host half serves (D5). Resolution descends family rule →
 * tier rule → the catalog's own text; family rules are ordered and anchored, so
 * one product line's rule never claims another's model, and a model the table
 * has never seen answers with the catalog's own line: a name-only row beats an
 * invented one.
 *
 * The identity a rule reads is the model's id and then the display name beside
 * it (D79): a gateway's id is often an opaque alias while the name is the
 * model's own. resolveModelCopy (model-copy.ts) owns that order. It lives here
 * rather than beside the copy index because model-copy.ts is loaded by the
 * build in a Node sandbox, and this resolver reads the page's locale.
 *
 * `ctx` is the caller's context, used only to read the shell's locale.
 */
function modelDescription(ctx: HostContext, groupId: unknown, model: HostModelEntry): string {
  const pair = resolveModelCopy(modelCopy, groupId, model.id, model.name)
  const text = localized(pair, ctx, modelCopy === null ? undefined : modelCopy.fallback)
  if (text) return text
  return typeof model.description === 'string' ? model.description : ''
}

export function createModelRows(options: {
  ctx: HostContext
  pickModel: (provider: string, modelId: string) => void
  subHoverIntent: ReturnType<typeof createHoverIntent>
  isSubOpen: () => boolean
  closeSub: () => void
  /** @param focusField - whether the press is the reader asking to look a model up. */
  openSub: (focusField?: boolean) => void
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
  /** Every row still standing, with the provider and model it names. */
  const painted: { item: HTMLElement, provider: string, modelId: string }[] = []
  /** The wall-clock minute the standing rows' meters were drawn at, or -1 before a paint. */
  let paintedMinute = -1

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

  /**
   * One model row, the skeleton every level builds from: brand mark, name, an
   * optional description line, the peak rate meter and a check when the model is
   * in force. `onPick` is the whole difference between the rows — a list row
   * puts its model in force, the current seat's own row only folds the picker.
   *
   * Every row goes through here, the current seat's included: a row built
   * anywhere else is a row that can quietly lose whatever the others carry.
   */
  function buildModelRow(group: HostModelGroup, model: HostModelEntry, selected: boolean, withDescription: boolean, onPick: () => void) {
    // The shared row skeleton; the copy block keeps its own class, and
    // the vendor typography rides on the label inside it.
    const built = buildPopoverItem({ className: 'dsh-claude-model-option', role: 'menuitemradio', textClass: 'dsh-claude-model-copy', check: true })
    const item = built.row
    item.setAttribute('aria-checked', selected ? 'true' : 'false')
    const brand = modelBrand(model.id, model.name)
    // The brand id is the row's styling hook — it is what gives a vendor's rows
    // their own typography (see .dsh-claude-model-name in
    // features/model/model-picker.css). The vendor's mark rides inside the
    // label's lockup. The scheduler's attributeFilter
    // does not watch data-*, so this write cannot re-trigger a pass.
    if (brand) item.setAttribute('data-brand', brand)
    // The row joins the meter-refresh registry with its own identity: the rate
    // badge is the one minute-sensitive part of a row, and the open and the
    // minute rollover swap the meters in place rather than rebuilding every
    // row (model-picker.ts).
    painted.push({ item, provider: group.id, modelId: model.id })
    const copy = built.text
    // A model the host names with an empty string still reads as itself: the
    // row is picked by that id, so the label falls back to it.
    const line = buildElement('span', 'dsh-claude-model-line')
    line.appendChild(buildModelLabel(model.name || model.id, brand))
    const tag = releaseTag(group.id, model)
    if (tag !== null) line.appendChild(buildElement('span', 'dsh-claude-model-tag', tag))
    copy.appendChild(line)
    // The description belongs to level 1 only: that list is the official
    // catalog, short enough that the line is what tells the models apart,
    // while "More models" is every provider's full catalog and reads better
    // as names alone. One line, in the shell's language — the copy document is
    // localized rather than stacked, so a row never carries two languages. The
    // line has its own switch under the picker's settings row, and a row built
    // without it is the same row with the copy block left as the name alone.
    const desc = withDescription && readPrefs().modelDescriptions !== false ? modelDescription(ctx, group.id, model) : ''
    if (desc) copy.appendChild(buildElement('span', 'dsh-claude-model-desc', desc))
    // The peak rate meter rides in front of the check: the row is compared by
    // its rate before it is picked, and a model whose provider bills on no
    // clock carries no badge at all (packages/client/src/features/peakrate/).
    const meter = rate(group.id, model.id)
    if (meter !== null) item.insertBefore(meter, built.check)
    built.check!.innerHTML = selected ? POPOVER_CHECK_SVG : ''
    item.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation()
      onPick()
    })
    return item
  }

  /** One selectable model row: picking it puts that model in force. */
  function buildModelOption(group: HostModelGroup, model: HostModelEntry, selected: boolean, withDescription: boolean) {
    return buildModelRow(group, model, selected, withDescription, () => { pickModel(group.id, model.id) })
  }

  /**
   * The model in force, as a row of its own for the case where level 1 lists no
   * group carrying it: the same row with its check on, and picking it only folds
   * the picker, because that model is already in force.
   */
  function buildCurrentOption(group: HostModelGroup, model: HostModelEntry) {
    return buildModelRow(group, model, true, true, () => { closeSub() })
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
      else openSub(true)
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

  /**
   * Refresh every standing row's rate meter in place, dropping the meters of
   * rows whose build has left the document (a repaint elsewhere in the feature
   * rebuilt their card). Level 1 and level 2 build their rows through the same
   * builders, so one sweep covers both cards. A meter whose period and words
   * stand already is written by no one: the refresh runs on the scheduler's
   * own passes, and a settled page stays settled. The countdown and the period
   * switch read on the wall clock's minute, so the sweep asks for nothing
   * while the minute a paint drew at stands.
   */
  function refreshRates() {
    const minute = Math.floor(Date.now() / 60000)
    if (minute === paintedMinute || painted.length === 0) return
    let standing = 0
    for (let i = 0; i < painted.length; i++) {
      const row = painted[i]!
      if (!row.item.isConnected) continue
      painted[standing++] = row
      const meter = row.item.querySelector<HTMLElement>(':scope > .dsh-claude-peakrate')
      const next = rate(row.provider, row.modelId)
      if (next === null) {
        meter?.remove()
        continue
      }
      if (meter === null) {
        row.item.insertBefore(next, row.item.lastElementChild)
        continue
      }
      setAttributeIfChanged(meter, 'title', next.title)
      setAttributeIfChanged(meter, 'aria-label', next.getAttribute('aria-label') ?? '')
      if (meter.getAttribute('data-period') !== next.getAttribute('data-period')) {
        meter.setAttribute('data-period', next.getAttribute('data-period') ?? '')
        const icon = meter.querySelector('.dsh-claude-peakrate-icon')
        const iconNext = next.querySelector('.dsh-claude-peakrate-icon')
        if (icon !== null && iconNext !== null && icon.innerHTML !== iconNext.innerHTML) icon.innerHTML = iconNext.innerHTML
      }
      const value = next.querySelector('.dsh-claude-peakrate-value')
      const valueNow = meter.querySelector('.dsh-claude-peakrate-value')
      if (value !== null && valueNow !== null && valueNow.textContent !== value.textContent) valueNow.textContent = value.textContent
      const countdown = next.querySelector('.dsh-claude-peakrate-countdown')
      const countdownNow = meter.querySelector('.dsh-claude-peakrate-countdown')
      if (countdown === null) countdownNow?.remove()
      else if (countdownNow === null) meter.appendChild(countdown)
      else if (countdownNow.textContent !== countdown.textContent) countdownNow.textContent = countdown.textContent
    }
    painted.length = standing
    paintedMinute = minute
  }

  return {
    buildProviderRule,
    buildModelOption,
    buildCurrentOption,
    buildModelCell,
    levelOneSections,
    remainingGroups,
    refreshRates
  }
}
