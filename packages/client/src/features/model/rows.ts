import { AUTO_POPOVER_ALL } from '../../constants'
import { levelOneSections as selectLevelOneSections } from './level-one'
import { readPrefs } from '../../core/prefs'
import { localized } from '../../core/i18n'
import { buildModelLabel, modelBrand } from './brand'
import { modelCopy, resolveModelCopy } from './model-copy'
import { releaseTag } from './release-tag'
import { buildElement, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { POPOVER_CHECK_SVG, buildPopoverItem } from '../../shared/popover'
import { hostTooltip } from '../../shared/host-tooltip'
import { travelCardHeight } from '../../shared/card-resize'
import type { HostTooltip } from '../../shared/host-tooltip'
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
  /**
   * Place the open cards again from their own size. A card anchored above its
   * trigger is laid out from its height, so the travel a fold starts has to be
   * followed frame by frame or the card grows down from a stale top.
   */
  reposition?: () => void
}) {
  const ctx = options.ctx
  const pickModel = options.pickModel
  const subHoverIntent = options.subHoverIntent
  const isSubOpen = options.isSubOpen
  const closeSub = options.closeSub
  const openSub = options.openSub
  const rate = options.rate
  /**
   * One painted row and the meter this half placed on it. The row keeps both the
   * badge and its shell: the host tooltip draws the badge through React, and a
   * re-render (its label changes every minute) leaves the shell without that
   * child for a frame. Reading the meter back out of the row in that frame
   * answered "no meter" and placed a second one.
   */
  interface PaintedRate {
    item: HTMLElement
    provider: string
    modelId: string
    /** The shell carrying the badge, or null while the row has no meter. */
    anchor: HTMLElement | null
    /** The badge that shell carries. */
    badge: HTMLElement | null
  }

  /** Every row still standing, with the provider and model it names. */
  const painted: PaintedRate[] = []
  /** The wall-clock minute the standing rows' meters were drawn at, or -1 before a paint. */
  let paintedMinute = -1
  /** The rate badge's tooltip anchor in a row: the badge rides inside the host's bubble anchor. */
  const RATE_ANCHOR_ATTRIBUTE = 'data-dsh-claude-rate-badge'
  /** The standing badges' tooltips, by the anchor that carries them. */
  const rateTips = new Map<HTMLElement, HostTooltip>()

  /**
   * Put one row's rate badge in, wearing the host's own tooltip: the row's words
   * are the whole judgement, which a browser tooltip would draw in its own style.
   */
  function placeRateBadge(item: HTMLElement, badge: HTMLElement, before: Element | null) {
    const tip = hostTooltip(badge, badge.getAttribute('aria-label') ?? '', { side: 'bottom' })
    tip.node.setAttribute(RATE_ANCHOR_ATTRIBUTE, '')
    rateTips.set(tip.node, tip)
    item.insertBefore(tip.node, before)
    return { anchor: tip.node, badge }
  }

  /** Take one row's meter off: shell, tooltip and badge together. */
  function dropRateBadge(row: PaintedRate) {
    const anchor = row.anchor
    if (anchor !== null) {
      rateTips.get(anchor)?.release()
      rateTips.delete(anchor)
      anchor.remove()
      // The release hands the badge back into the row, which is what it exists
      // for; a dropped meter takes that badge with it.
      row.badge?.remove()
    }
    row.anchor = null
    row.badge = null
  }

  /** Release the tooltips of badges whose card has left the page (a rebuild elsewhere). */
  function pruneRateBadges() {
    for (const [anchor, tip] of rateTips) {
      if (anchor.isConnected) continue
      tip.release()
      rateTips.delete(anchor)
    }
  }

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

  /** Each group's controlled content gets an id unique within this picker's rows. */
  let providerGroupSerial = 0

  /** The caret after a provider's name: two strokes, down while open and right once folded. */
  const PROVIDER_CARET_SVG = '<svg viewBox="0 0 8 8" width="8" height="8" aria-hidden="true" focusable="false"><path d="M2 3l2 2 2-2" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>'

  /**
   * One provider's heading, its fold control and its models. The heading is the
   * rule the list already had — the name first, the divider running to the
   * right edge — with the caret after the name in the name's own ink. The fold
   * is the open card's own state: nothing is stored, so reopening the picker or
   * reloading the page finds every group open again.
   */
  function buildProviderGroup(group: HostModelGroup, models: HostModelEntry[], name: string, current: { group: HostModelGroup, model: HostModelEntry } | null, withDescription: boolean) {
    const section = buildElement('div', 'dsh-claude-model-group-section')
    const rule = buildElement('div', 'dsh-claude-model-rule')
    const content = buildElement('div', 'dsh-claude-model-group-models')
    content.id = `dsh-claude-model-provider-${providerGroupSerial++}`
    // A provider that needs no naming (the official source) keeps the bare
    // rule: there is no word for the reader to press.
    if (name !== '') {
      const toggle = buildElement('button', 'dsh-claude-model-group-toggle')
      toggle.type = 'button'
      toggle.setAttribute('aria-expanded', 'true')
      toggle.setAttribute('aria-controls', content.id)
      toggle.appendChild(buildElement('span', 'dsh-claude-model-rule-name', name))
      const caret = buildElement('span', 'dsh-claude-model-group-caret')
      caret.innerHTML = PROVIDER_CARET_SVG
      toggle.appendChild(caret)
      toggle.addEventListener('click', (event) => {
        event.stopPropagation()
        // Folding is this list's own state: the rows below hide under the
        // heading without the picker repainting, and nothing is stored. The
        // card takes the new height over transitions.dev's "Card resize".
        const card = section.closest<HTMLElement>('.dsh-claude-model-popover')
        const before = card === null ? 0 : card.getBoundingClientRect().height
        const shown = toggle.getAttribute('aria-expanded') !== 'true'
        toggle.setAttribute('aria-expanded', String(shown))
        content.hidden = !shown
        if (card !== null) travelCardHeight(card, before, options.reposition)
      })
      rule.appendChild(toggle)
    }
    section.appendChild(rule)
    for (const model of models) {
      const selected = current !== null && current.group.id === group.id && current.model.id === model.id
      content.appendChild(buildModelOption(group, model, selected, withDescription))
    }
    section.appendChild(content)
    return section
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
    const row: PaintedRate = { item, provider: group.id, modelId: model.id, anchor: null, badge: null }
    painted.push(row)
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
    if (desc) {
      item.classList.add('dsh-claude-model-described')
      copy.appendChild(buildElement('span', 'dsh-claude-model-desc', desc))
    }
    // The peak rate meter rides in front of the check: the row is compared by
    // its rate before it is picked, and a model whose provider bills on no
    // clock carries no badge at all (packages/client/src/features/peakrate/).
    const meter = rate(group.id, model.id)
    if (meter !== null) {
      const placed = placeRateBadge(item, meter, built.check)
      row.anchor = placed.anchor
      row.badge = placed.badge
    }
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

  /** The providers level 1 lists (level-one.ts): the lead group, then the chosen quick providers. */
  function levelOneSections(groups: HostModelGroup[]) {
    return selectLevelOneSections(groups, readPrefs().quickProviders)
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
   *
   * What a row carries is the row's own record (placeRateBadge's answer), not
   * what its document happens to hold: the badge is drawn through React and
   * leaves its shell for a frame on every label change, which the document reads
   * as a row without a meter.
   */
  function refreshRates() {
    pruneRateBadges()
    const minute = Math.floor(Date.now() / 60000)
    // A meter that is still missing is placed whatever the minute: a catalog
    // arriving after the rows were painted is what fills an empty seat, and
    // waiting for the clock would leave it empty until the next minute.
    const missing = painted.some((row) => row.item.isConnected &&
      (row.badge === null || !row.badge.isConnected))
    if (painted.length === 0 || (minute === paintedMinute && !missing)) return
    let standing = 0
    for (let i = 0; i < painted.length; i++) {
      const row = painted[i]!
      if (!row.item.isConnected) continue
      painted[standing++] = row
      const next = rate(row.provider, row.modelId)
      if (next === null) {
        dropRateBadge(row)
        continue
      }
      if (row.badge === null || row.anchor === null || !row.badge.isConnected || !row.anchor.isConnected) {
        dropRateBadge(row)
        const placed = placeRateBadge(row.item, next, row.item.lastElementChild)
        row.anchor = placed.anchor
        row.badge = placed.badge
        continue
      }
      const meter = row.badge
      const anchor = row.anchor
      const detail = next.getAttribute('aria-label') ?? ''
      if (meter.getAttribute('aria-label') !== detail) {
        meter.setAttribute('aria-label', detail)
        rateTips.get(anchor)?.setLabel(detail)
      }
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
    buildProviderGroup,
    buildModelOption,
    buildCurrentOption,
    buildModelCell,
    levelOneSections,
    remainingGroups,
    refreshRates
  }
}
