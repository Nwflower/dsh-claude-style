import { MODEL_OFFICIAL_GROUP } from './model-labels'
import { modelGroupName } from './provider-name'
import { activeLocale } from '../../core/i18n'
import { ensureSeatPart } from './seat-box'
import type { SeatPart } from './seat-box'
import { readPrefs } from '../../core/prefs'
import { withSlots } from '@dsh-claude-style/engine/host'
import { createModelCatalog } from './catalog'
import { createModelSubMenu } from './sub-menu'
import { createModelRows, modelComparator } from './rows'
import { buildElement, closestFrom } from '@dsh-claude-style/engine/dom'
import { dropHostRejection } from '../../shared/host-rejection'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { COMPOSER_INPUT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import type { HostModelDirectory, HostModelGroup, HostSlotsService } from '@dsh-claude-style/contracts/services'
import type { CloseReason, FeatureHandle } from '@dsh-claude-style/engine/scheduler'
import type { FeatureUi } from '../../core/feature'
import type manifest from './model-picker.manifest'
import type { CatalogProvider, ModelCatalog } from './catalog'
import { copy } from './copy'
import { createModelCards } from './model-cards'
import { createModelFooter } from './model-footer'
import { createSeatLabels } from './seat-labels'

/** What the effort picker and the settings page read off the model picker (ui.model). */
export interface ModelHandle extends FeatureHandle {
  /** The provider the shown session routes to, or null before the catalog answers. */
  provider(): string | null
  /** The scheduler's own dismiss route; the effort picker calls it with no reason. */
  close(reason?: CloseReason): void
  /** The skin's seat box: the model's text and the effort level's share it (seat-box.ts). */
  seatBox(): HTMLElement | null
  /** One decision's own part of that box, with its own hover plate. */
  seatPart(part: SeatPart): HTMLElement | null
  /** The skin's model trigger while it is in the document. */
  trigger(): HTMLButtonElement | null
  effort(): ReturnType<ModelCatalog['effort']>
  named(): boolean
  pickEffort(effort: string | undefined): void
  providers(): CatalogProvider[]
  onProviders(listener: (providers: CatalogProvider[]) => void): () => void
  teardown(): void
}

export interface ModelPickerMount {
  slot?: HTMLElement
  directory?: HostModelDirectory
  popoverKey?: string
  owner?: string
  disabled?: boolean
}

export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>, mount: ModelPickerMount = {}) {
  /**
   * The host's model seat is a click-triggered two-pane menu (Model /
   * Effort rows drilling into their own lists). The skin replaces it with
   * a Claude-style picker: hovering the trigger opens the first level —
   * the DeepSeek official provider's models, a divider, then the
   * reasoning-effort row (when the current model offers one) and a More
   * models row; both open their second level BESIDE the first level.
   *
   * Data and submission ride the host's own per-session ModelDirectory
   * (`ctx.modelDirectories`), the same store the host's menu and the
   * /model command read — so the current selection, catalog and errors
   * stay in sync without scraping the DOM. The host's seat is hidden and
   * marked; a React swap re-marks it on the next pass. The two cards'
   * open, close, dwell and placement are the cards module's
   * (features/model/model-cards.ts).
   */
  /**
   * The slot registry the yield decision reads, from the scope that injected
   * it: the plugin's own context hands no registry out (D75), so the seat's
   * ledger is read from the injected scope alone. Null while the host serves
   * no registry — the seat then keeps the skin self-drawn.
   */
  let slots: HostSlotsService | null = null
  const slotsFiber = withSlots(ctx, (served, scope) => {
    slots = served
    scope.effect(() => () => { slots = null }, 'dsh-claude-style: model seat registry')
    // Rows already hidden by a winner that arrived before this scope did wait
    // on the pass this arrival asks for.
    ui.schedule?.()
  })
  let modelBodySig = ''
  /**
   * The catalog half of the picker (packages/client/src/features/model/catalog.ts):
   * directory, snapshot, warm-up and the provider listeners. `schedule` is
   * the scheduler wake-up the directory's store subscription calls.
   */
  const modelCatalog = createModelCatalog({
      ctx,
      directory: mount.directory,
      schedule() { if (ui.schedule) ui.schedule() }
  })

  /**
   * Hand one selection to the session's directory: the store the seat, the
   * rows and the effort slider all read, so nothing is written locally.
   * @returns whether a directory was there to take the selection.
   */
  function commitSelection(selection: { provider: string, model: string, reasoningEffort?: string }) {
    const dir = modelCatalog.directory()
    if (dir === null) return false
    dropHostRejection(dir.select(selection))
    return true
  }

  /** Commit one model seat, then fold both cards. */
  function pickModel(provider: string, modelId: string) {
    if (!commitSelection({ provider, model: modelId })) return
    cards.closeAll()
  }

  /** Commit one reasoning level. The slider stays open for the next nudge. */
  function pickEffort(effort: string | undefined) {
    const snap = modelCatalog.snapshot()
    if (snap === null || snap.current === null) return
    const selection: { provider: string, model: string, reasoningEffort?: string } = { provider: snap.current.provider, model: snap.current.model }
    if (effort !== undefined) selection.reasoningEffort = effort
    commitSelection(selection)
  }

  /**
   * The cards half of the picker (features/model/model-cards.ts): the two
   * popovers' open, close, dwell and placement. `onOpen` loads the catalog
   * and repaints level 1 from scratch; `createSub` builds level 2's content
   * when its card is first built.
   */
  const cards = createModelCards({
    popoverKey: mount.popoverKey,
    owner: mount.owner,
    onOpen() {
      const dir = modelCatalog.directory()
      if (dir && typeof dir.load === 'function') dropHostRejection(dir.load())
      // Repaint rows only when the catalog signature changes so large catalogs
      // open without rebuilding unchanged DOM nodes; rate badges refresh in place.
      renderModelBody()
    },
    createSub() {
      return createModelSubMenu({
        rows: modelRows,
        snapshot() { return modelCatalog.snapshot() },
        current() { return modelCatalog.current(modelCatalog.snapshot()) },
        signature: subSignature,
      })
    },
    anchor() { return labels.seatBox() ?? labels.trigger() },
    trigger() { return labels.trigger() },
  })

  /**
   * The row half of the picker (packages/client/src/features/model/rows.ts): the level-1
   * and level-2 builders. `pickModel` is this closure's own commit function
   * (a hoisted declaration); the rest is the second level's state.
   */
  const modelRows = createModelRows({
      ctx,
      pickModel,
      subHoverIntent: cards.subIntent,
      isSubOpen: cards.subOpen,
      closeSub: cards.closeAll,
      openSub: cards.openSub,
      /**
       * The peak rate meter is its own feature (packages/client/src/features/peakrate/):
       * it answers with a badge for the row, and with nothing at all for a
       * model whose provider bills on no clock.
       */
      rate(provider: string, modelId: string) {
        const peakrate = ui.peakrate
        if (peakrate === undefined) return null
        return peakrate.badge(provider, modelId)
      },
      /** Both cards hang above the seat: a fold's new height moves their top. */
      reposition: () => cards.position(),
  })

  /**
   * Level 1's pinned footer (features/model/model-footer.ts): the divider, the
   * More-models row, the Agent Teams switch and the rows other plugins hand to
   * the host's model menu. Rebuilt only when its row set changes.
   */
  const modelFooter = createModelFooter({
    ctx,
    footer: () => cards.footer(),
    moreCell: () => modelRows.buildModelCell(copy('moreLabel')),
    slots: () => slots,
    schedule() { if (ui.schedule) ui.schedule() },
    dismiss() { cards.closeAll() },
    restoreFocus() { labels.trigger()?.focus() },
    locked() { return modelCatalog.inFlight() },
  })

  /**
   * What a group's rows read as, in one string the render signatures carry: a
   * row's name is what its label draws, so a rename in the settings page has to
   * reach the card (D79), and a vendor's rule reads it too. The string is
   * linear in the whole catalog, so it is keyed on the groups' identity: the
   * store hands out a fresh snapshot per publish, and a scheduler pass that
   * finds the same snapshot again reads the memo instead of rebuilding a
   * four-digit-model string.
   */
  let rowsSignatureGroups: HostModelGroup[] | null = null
  let rowsSignatureText = ''
  function rowsSignature(groups: HostModelGroup[]) {
    if (groups !== rowsSignatureGroups) {
      let sig = ''
      for (let g = 0; g < groups.length; g++) {
        sig += `;${groups[g].id}:`
        for (let m = 0; m < groups[g].models.length; m++) sig += `${m === 0 ? '' : ','}${groups[g].models[m].id}=${groups[g].models[m].name}`
      }
      rowsSignatureGroups = groups
      rowsSignatureText = sig
    }
    return rowsSignatureText
  }

  /**
   * Level 1: the provider sections, the divider, More models. Answers whether
   * it painted: an unchanged signature keeps the painted rows standing, and
   * the pass refreshes their rate badges in place instead — the one
   * minute-sensitive part of a row (rows.ts's refreshRates). A badge whose
   * words stand is written by no one, so a settled page stays settled.
   */
  function renderModelBody(): boolean {
    const modelBody = cards.body()
    if (!modelBody) return false
    const snap = modelCatalog.snapshot()
    const status = snap ? snap.status : 'idle'
    const groups = (snap && snap.groups) || []
    const current = modelCatalog.current(snap)
    const prefs = readPrefs()
    let sig = [status, activeLocale(), modelFooter.signature(), current ? `${current.group.id}/${current.model.id}` : '', prefs.quickProviders.join(','), prefs.modelOrder, prefs.modelOrderRows.join(','), prefs.modelDescriptions !== false].join('|')
    sig += rowsSignature(groups)
    if (sig === modelBodySig) {
      modelRows.refreshRates()
      return false
    }
    modelBodySig = sig
    while (modelBody.firstChild) modelBody.removeChild(modelBody.firstChild)

    // A seat whose data is still in flight must not blank a picker that
    // already has a list. The host marks the directory `selecting` for the
    // WHOLE selectModel round-trip, and that round-trip runs for seconds on
    // providers whose adapters resolve over the network. Only a directory with
    // nothing to show yet falls back to the loading line.
    const seated = groups.length > 0 && current !== null
    if (!seated && modelCatalog.inFlight()) {
      modelBody.appendChild(buildElement('div', 'dsh-claude-popover-status', copy('loading')))
      modelFooter.layout(false)
      return true
    } else {
      const sections = modelRows.levelOneSections(groups)
      if (sections.length === 0) {
        modelBody.appendChild(buildElement('div', 'dsh-claude-popover-status', copy('empty')))
      } else {
        for (let s = 0; s < sections.length; s++) {
          const section = sections[s]
          // The official source needs no naming, and the first section needs
          // no rule: a bare line above the list would be one line too many.
          const sectionLabel = section.id === MODEL_OFFICIAL_GROUP ? '' : modelGroupName(section.id, section.name)
          const sectionModels = section.models.slice().sort(modelComparator(prefs.modelOrder, section.id, prefs.modelOrderRows))
          if (s === 0 && sectionLabel === '') {
            for (const model of sectionModels) {
              const selected = current !== null && current.group.id === section.id && current.model.id === model.id
              modelBody.appendChild(modelRows.buildModelOption(section, model, selected, true))
            }
            continue
          }
          modelBody.appendChild(modelRows.buildProviderGroup(section, sectionModels, sectionLabel, current, true))
        }
      }
      // The current seat is surfaced under the list when none of the sections
      // above already carries it, so the row the seat is read from is always
      // on screen. Its provider rides a rule of its own rather than trailing
      // the model in parentheses — the same idiom the sections use. It stays
      // above the divider: the divider closes the model list, so anything
      // that belongs to the list has to sit on its side of it.
      let currentListed = false
      for (let c = 0; c < sections.length; c++) {
        if (current !== null && sections[c].id === current.group.id) currentListed = true
      }
      if (current !== null && !currentListed) {
        // The divider above already draws a line, so a provider that needs no
        // naming (the official source) adds nothing here.
        const currentRuleName = current.group.id === MODEL_OFFICIAL_GROUP ? '' : modelGroupName(current.group.id, current.group.name)
        if (currentRuleName !== '') modelBody.appendChild(modelRows.buildProviderRule(currentRuleName))
        // Through the same row builder as every other row, so this one carries
        // the same brand hook, description and peak rate meter.
        modelBody.appendChild(modelRows.buildCurrentOption(current.group, current.model))
      }
      // The divider closes the model list and the More-models row follows it;
      // both live in the footer, OUTSIDE the scroll area — the list above
      // scrolls under them while the row stays reachable. The effort slider
      // is not here any more: it has its own trigger and card.
      if (cards.footer()) {
        // "More models" carries what level 1 does not. A first level that
        // already lists every provider leaves it nothing to carry, so the row
        // goes away with the last remaining provider: the search
        // field is still reached by typing a key on level 1 (onKey below), and
        // the second level lists the whole catalog once it is opened that way.
        const showMore = modelRows.remainingGroups(groups, sections).length > 0
        // The divider exists to close the list off from what follows it. With
        // no More-models row there is nothing left to close off, and a bare
        // line under the list reads as a stray rule. The footer module owns
        // that judgement.
        modelFooter.layout(showMore)
      }
    }
    return true
  }

  /**
   * What level 2's rows read as, in one string the card's own paint compares:
   * the providers level 1 lists (this card carries the rest), the rows' rates
   * and the model in force.
   */
  function subSignature() {
    const snap = modelCatalog.snapshot()
    const groups = (snap && snap.groups) || []
    const current = modelCatalog.current(snap)
    const sections = modelRows.levelOneSections(groups)
    const listed: string[] = []
    for (let s = 0; s < sections.length; s++) listed.push(sections[s].id)
    const prefs = readPrefs()
    let sig = `more|${prefs.modelOrder}|${prefs.modelOrderRows.join(',')}|${listed.join(',')}`
    sig += rowsSignature(groups)
    if (current) sig += `#${current.group.id}/${current.model.id}`
    return sig
  }

  /**
   * The seat half (features/model/seat-labels.ts): the trigger, its label and
   * the model mark. Read from the cards' callbacks and the handle below, all of
   * which run after this assignment.
   */
  const labels = createSeatLabels({ mount, ui, cards, modelCatalog, slots: () => slots })

  /**
   * The pass's write: the seat first, then level 1's paint from the same
   * reading. A seat handed back took the body its rows were built into, and
   * chrome built new holds none, so either one rebuilds the rows on the next
   * paint.
   */
  function syncModelPicker() {
    const seat = labels.sync()
    if (seat === 'handedBack' || seat === 'drawnInNewChrome') modelBodySig = ''
    if (seat === 'handedBack' || seat === 'noSlot') return
    renderModelBody()
    modelFooter.refresh()
    if (cards.subOpen()) {
      const modelSub = cards.sub()
      if (modelSub !== null) modelSub.render()
      cards.position()
    } else if (cards.mainOpen()) {
      cards.position()
    }
  }

  /**
   * The ledger's own change signal (the host's slots/changed event): a plugin
   * registering or handing back re-renders the seat inside the conversation
   * column, whose mutation batches skip this feature (skipOnContentOnly), so
   * the pass that re-reads the winner rides this event. It names no key filter:
   * slot changes are rare, and the pass the wake buys is the same one the
   * ledger's read needs. A host without the event answers the swap's other
   * wakes (a seat resize) a frame later instead.
   */
  if (typeof ctx.on === 'function') {
    ctx.effect(() => ctx.on!('slots/changed', () => { ui.schedule?.() }), 'dsh-claude-style: model seat ledger')
  }

  // One sweep of this generation's strays, before the first pass: a document
  // walk belongs here rather than on the pass, which runs every frame.
  cards.sweep()

  ui.model = {
    sync: syncModelPicker,
    // Who the session routes to: the statistics read it to tell the platform's
    // own billing from a provider that settles elsewhere.
    provider() {
      return modelCatalog.snapshot()?.current?.provider ?? null
    },
    // The seat sits on the composer, outside the column a streaming batch
    // touches, so such a batch skips this pass (D40).
    skipOnContentOnly: true,
    /**
     * Close both levels of the picker. The Escape key first takes a query in
     * level 2's field back — the card the reader typed into stays up until a
     * second Escape — while a press outside and a focus that left for the
     * composer fold both levels.
     */
    close(reason) {
      const modelSub = cards.sub()
      if (reason === 'escape' && modelSub !== null && modelSub.hasQuery()) {
        modelSub.clearQuery()
        return
      }
      cards.closeAll()
    },
    /**
     * A printable key while the first level is up opens the second one and
     * starts the query: the reader looks a model up by typing, and the search
     * field needs no detour through the More-models row to be reached.
     */
    onKey(event: KeyboardEvent) {
      if (!cards.mainOpen()) return
      if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return
      // The field the reader is typing in keeps every key: the composer's own
      // field holds the message under the picker, and the search field holds
      // the query the reader is typing.
      if (closestFrom(event.target, COMPOSER_INPUT_SELECTOR) !== null) return
      const modelSub = cards.sub()
      if (modelSub !== null && modelSub.focused()) return
      event.preventDefault()
      cards.openSub(true)
      const open = cards.sub()
      if (open !== null) open.type(event.key)
    },
    /**
     * What the effort picker (a separate fragment that owns the level's
     * trigger and card) reads from this one: the seat box it appends its button
     * to, the effort descriptor and the commit call. `effort()` re-reads the
     * catalog every call, so a level the host echoes back lands on the knob
     * without either fragment pushing it.
     */
    seatBox: labels.seatBox,
    seatPart(part) {
      const box = labels.seatBox()
      return box === null ? null : ensureSeatPart(box, part)
    },
    /** The skin's model trigger while it is in the document, else null. */
    trigger: labels.trigger,
    effort() { return modelCatalog.effort(modelCatalog.snapshot()) },
    /**
     * Whether the catalog can match the current selection to a group and
     * model. FALSE is "cannot name the seat" (the snapshot is still arriving,
     * or the provider group is not in it), which is not the same as "the seat
     * has no levels".
     */
    named() { return modelCatalog.current(modelCatalog.snapshot()) !== null },
    pickEffort,
    owns(target: Node) {
      if (!target) return false
      const trigger = labels.trigger()
      return (trigger !== null && trigger.contains(target)) ||
             (cards.popover() !== null && cards.popover()!.contains(target)) ||
             (cards.subPopover() !== null && cards.subPopover()!.contains(target))
    },
    /**
     * A viewport change moves the trigger the open card is anchored to. A card
     * that is shut has no anchor to re-read, so the scroll or resize costs it
     * nothing.
     */
    reposition() {
      if (!cards.mainOpen()) return
      cards.position()
    },
    providers: modelCatalog.providers,
    onProviders: modelCatalog.onProviders,
    /**
     * A copy source changed: drop the render signatures so the next pass
     * repaints the rows in the new language.
     */
    onCopyChange() {
      modelBodySig = ''
      cards.sub()?.reset()
    },
    // Removes the skin's DOM too: a feature switched off mid-session (see
    // packages/client/src/entry.ts) keeps the stylesheet around it, so the seat has to be
    // handed back here rather than by the stylesheet going away.
    teardown() {
      labels.drop()
      modelBodySig = ''
      modelCatalog.resetWarm()
      cards.dispose()
      modelFooter.dispose()
      if (slotsFiber !== null) slotsFiber.dispose()
    }
  }

  return ui.model.teardown
}
