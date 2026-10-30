import { SLOT_NODE_ATTR } from '../../constants'
import { MODEL_OFFICIAL_GROUP } from './model-labels'
import { modelGroupName } from './provider-name'
import { activeLocale } from '../../core/i18n'
import { ensureSeatBox, ensureSeatPart } from './seat-box'
import type { SeatPart } from './seat-box'
import { loadModelCopy } from './model-copy'
import { readPrefs } from '../../core/prefs'
import { findModelSlot } from '@dsh-claude-style/engine/host'
import { createModelCatalog } from './catalog'
import { createModelSubMenu } from './sub-menu'
import { byModelId, createModelRows } from './rows'
import { releaseTag } from './release-tag'
import { buildElement, closestFrom, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { removeStrayNodes, pressKeepsPopoverOpen } from '../../shared/popover'
import { releaseSwappingText, setSwappingText } from '../../shared/swapping-text'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { COMPOSER_INPUT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import type { HostModelGroup } from '@dsh-claude-style/contracts/services'
import type { CloseReason, FeatureHandle } from '@dsh-claude-style/engine/scheduler'
import type { FeatureUi } from '../../core/feature'
import type manifest from './model-picker.manifest'
import type { CatalogProvider, ModelCatalog } from './catalog'
import { copy } from './copy'
import { createModelCards } from './model-cards'

/** What the effort picker and the settings page read off the model picker (ui.model). */
export interface ModelHandle extends FeatureHandle {
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

export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
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
  let modelBtn: HTMLButtonElement | null = null
  /** The box the model's text and the effort level's share inside the host slot (seat-box.ts). */
  let seatBox: HTMLElement | null = null
  /** The host slot the seat lives in; the effort picker anchors there too. */
  let modelSlot: HTMLElement | null = null
  let modelBodySig = ''
  /**
   * The catalog half of the picker (packages/client/src/features/model/catalog.ts):
   * directory, snapshot, warm-up and the provider listeners. `schedule` is
   * the scheduler wake-up the directory's store subscription calls.
   */
  const modelCatalog = createModelCatalog({
      ctx,
      schedule() { if (ui.schedule) ui.schedule() }
  })

  function pickModel(provider: string, modelId: string) {
    const dir = modelCatalog.directory()
    if (dir === null) return
    // select() is async and rejects on a failed selection, which the host's
    // toast reports; the rejection is dropped the way the host's own seat
    // wrapper drops it.
    const pending = dir.select({ provider, model: modelId })
    if (pending && typeof pending.catch === 'function') pending.catch(() => {})
    cards.closeAll()
  }

  /** Commit one reasoning level. The slider stays open for the next nudge. */
  function pickEffort(effort: string | undefined) {
    const dir = modelCatalog.directory()
    const snap = modelCatalog.snapshot()
    if (dir === null || !snap || snap.current === null) return
    const selection: { provider: string, model: string, reasoningEffort?: string } = { provider: snap.current.provider, model: snap.current.model }
    if (effort !== undefined) selection.reasoningEffort = effort
    // A rejected selection is reported by the host's toast (see pickModel).
    const pending = dir.select(selection)
    if (pending && typeof pending.catch === 'function') pending.catch(() => {})
  }

  /**
   * The cards half of the picker (features/model/model-cards.ts): the two
   * popovers' open, close, dwell and placement. `onOpen` loads the catalog
   * and repaints level 1 from scratch; `createSub` builds level 2's content
   * when its card is first built.
   */
  const cards = createModelCards({
    onOpen() {
      const dir = modelCatalog.directory()
      // load() is async — the host itself guards with .catch(() => {}); a bare
      // try/catch cannot see its rejection.
      if (dir && typeof dir.load === 'function') {
        const pending = dir.load()
        if (pending && typeof pending.catch === 'function') {
          pending.catch(() => { /* the store's error surface covers a failure */ })
        }
      }
      // The body's own signature decides whether the rows repaint: with the
      // catalog unchanged the open shows the painted rows and the rate badges
      // refresh in place. Rebuilding every row on every open was the
      // four-digit-catalog open lag (issue #151's own experiment C: the cost
      // tracks the catalog's size).
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
    anchor() { return seatBox ?? modelBtn },
    trigger() { return modelBtn },
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
      }
  })

  /**
   * The footer holds the divider and the More-models row, and nothing else.
   * Rebuilt only when the row set changes — the divider exists to close the
   * list off from what follows it, so with no More-models row it is a stray
   * line and is not drawn either.
   */
  function layoutModelFooter(showMore: boolean) {
    const modelFooter = cards.footer()
    if (!modelFooter) return
    const stale: ChildNode[] = []
    for (let child = modelFooter.firstChild; child !== null; child = child.nextSibling) stale.push(child)
    for (let i = 0; i < stale.length; i++) modelFooter.removeChild(stale[i])
    if (!showMore) return
    // The role is what the shared separator rule reads (shared/popover.css), so
    // this line is the same line as every separator the host draws in a card.
    const divider = buildElement('div', 'dsh-claude-model-divider')
    divider.setAttribute('role', 'separator')
    modelFooter.appendChild(divider)
    modelFooter.appendChild(modelRows.buildModelCell(copy('moreLabel')))
  }

  /**
   * What the rows' rates depend on, in one value the render signatures carry.
   * The catalog is the meter feature's (its generation moves when one arrives).
   * The minute is not part of it: a closed card is not repainted by the clock,
   * and the minute reaches the rows through refreshRateBadges instead.
   */
  function rateSignature() {
    const peakrate = ui.peakrate
    if (peakrate === undefined) return ''
    return `${peakrate.epoch()}`
  }

  /**
   * Swap both cards' rate meters for the current ones (rows.ts owns the rows
   * and their identity). The badge is the one minute-sensitive part of a row
   * (the countdown to the rate switch), and the card open and the minute
   * rollover call this instead of the full paint: with a four-digit catalog
   * the full paint is the open lag the feature cannot afford on every open.
   */
  function refreshRateBadges() {
    modelRows.refreshRates()
  }

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
    let sig = [status, activeLocale(), current ? `${current.group.id}/${current.model.id}` : '', readPrefs().quickProviders.join(','), readPrefs().modelDescriptions !== false, rateSignature()].join('|')
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
      layoutModelFooter(false)
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
          if (sectionLabel !== '' || s > 0) modelBody.appendChild(modelRows.buildProviderRule(sectionLabel))
          const sectionModels = section.models.slice().sort(byModelId)
          for (let m = 0; m < sectionModels.length; m++) {
            const selected = current !== null && current.group.id === section.id && current.model.id === sectionModels[m].id
            modelBody.appendChild(modelRows.buildModelOption(section, sectionModels[m], selected, true))
          }
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
        // "More models" carries what level 1 does not. A catalog with more than
        // one provider carries the whole of it and the search field above it: a
        // first level that lists every provider would otherwise leave the reader
        // no way to look a model up.
        const showMore = modelRows.remainingGroups(groups, sections).length > 0 || groups.length > 1
        // The divider exists to close the list off from what follows it. With
        // no More-models row there is nothing left to close off, and a bare
        // line under the list reads as a stray rule. layoutModelFooter owns
        // that judgement.
        layoutModelFooter(showMore)
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
    let sig = `more|${listed.join(',')}|${rateSignature()}`
    sig += rowsSignature(groups)
    if (current) sig += `#${current.group.id}/${current.model.id}`
    return sig
  }

  /**
   * Let a label's swap go before its node leaves the page. The swap keeps a
   * frame, a timer and a size subscription of its own (shared/swapping-text.ts);
   * none of them follows the node out, and the size registry holds them by
   * strong reference, so a trigger rebuilt or dropped without this leaves its
   * sizer and its subscription behind for the page's lifetime.
   */
  function releaseModelLabels(scope: ParentNode = document) {
    const labels = scope.querySelectorAll<HTMLElement>('.dsh-claude-model-btn-label')
    for (let i = 0; i < labels.length; i++) releaseSwappingText(labels[i])
  }

  /**
   * Hand the host's own model seat and menu back: unmark the seat, remove the
   * skin's trigger and popovers, drop the catalog subscription.
   */
  function dropModelControl() {
    const allHosts = document.querySelectorAll('[data-dsh-claude-model-host]')
    for (let h = 0; h < allHosts.length; h++) {
      allHosts[h].removeAttribute('data-dsh-claude-model-host')
    }
    releaseModelLabels()
    removeStrayNodes(document, '.dsh-claude-model-seat', [])
    seatBox = null
    removeStrayNodes(document, '.dsh-claude-model-btn', [])
    modelBtn = null
    cards.dropNodes()
    modelBodySig = ''
    modelCatalog.reset()
  }

  /** Build/refresh the trigger, its label and the popover rows. */
  function syncModelControl() {
    // The picker's own switch tears this feature down, so the composer restyle
    // is the one way left to be off the page: it hands the host's own model
    // seat and menu back through the same sweep.
    if (ui.composer?.isActive() !== true) {
      dropModelControl()
      return
    }

    // The copy document is fetched on first paint of the picker rather than
    // at install, so a session that never opens it never pays for it.
    loadModelCopy()
    modelCatalog.directory()
    modelCatalog.warm()
    const slot = findModelSlot()
    modelSlot = slot
    if (slot === null) return
    // Hide the host's own seat (React owns the node; re-mark on swap).
    // Idempotent against a torn-down-less reload, like the account footer:
    // client HMR drops the old fiber's disposals, so a previous generation's
    // trigger and popovers are still in the DOM while this fresh scope starts
    // from null. Sweep the strays, or the seat renders twice.
    removeStrayNodes(slot, '.dsh-claude-model-seat', [seatBox])
    removeStrayNodes(slot, '.dsh-claude-model-btn', [modelBtn])
    removeStrayNodes(document, 'body > .dsh-claude-model-popover', [cards.popover(), cards.subPopover()])
    // The host's own seat root, not the nodes the skin appended beside it: a
    // swap can put React's node after ours, and the effort level and the
    // context meter's ring stand in the same slot. It is hidden only while the
    // skin draws the effort slider: with that switch off the host's own seat —
    // and any third-party effort control mounted in this slot — stays visible
    // and reachable (issue #183).
    const hostRoot = slot.querySelector(`:scope > :not([${SLOT_NODE_ATTR}])`)
    if (hostRoot !== null) hostRoot.toggleAttribute('data-dsh-claude-model-host', readPrefs().effortSlider === true)
    seatBox = ensureSeatBox(slot, seatBox)
    const modelPart = ensureSeatPart(seatBox, 'model')
    if (modelBtn === null || modelBtn.parentElement !== modelPart) {
      // The old trigger carries the old label: its swap goes before the node does.
      if (modelBtn !== null) releaseModelLabels(modelBtn)
      if (modelBtn !== null && modelBtn.parentElement !== null) modelBtn.parentElement.removeChild(modelBtn)
      modelBtn = document.createElement('button')
      modelBtn.type = 'button'
      modelBtn.className = 'dsh-claude-model-btn'
      modelBtn.setAttribute('aria-haspopup', 'menu')
      modelBtn.innerHTML = '<span class="dsh-claude-model-btn-label"></span>'
      // Same contract as the account trigger: hover under the "All" scope,
      // click-only otherwise.
      modelBtn.addEventListener('mouseenter', () => {
        if (cards.hoverOn()) cards.scheduleOpenMain()
      })
      modelBtn.addEventListener('mouseleave', () => {
        if (cards.hoverOn()) cards.scheduleClose()
      })
      modelBtn.addEventListener('click', e => {
        e.stopPropagation()
        // Is the card up because the dwell opened it, with the pointer still
        // on this trigger? Then the press keeps it up
        // (shared/popover.ts::pressKeepsPopoverOpen) and the leave closes it.
        const open = cards.mainOpen()
        if (pressKeepsPopoverOpen(cards.hoverOn(), open)) return
        if (open) cards.closeAll()
        else cards.openMain()
      })
      // First part of the box: the model's name; the effort picker appends its
      // own button into the second part.
      modelPart.appendChild(modelBtn)
    }
    // Fresh chrome is empty chrome: the body the last paint built is gone, so
    // the next paint rebuilds the rows into the new one.
    if (cards.ensureChrome() === true) modelBodySig = ''

    const snap = modelCatalog.snapshot()
    const current = modelCatalog.current(snap)
    const label = current ? current.model.name : copy('fallbackLabel')
    const labelEl = modelBtn.querySelector('.dsh-claude-model-btn-label')
    if (labelEl) {
      // The name swaps in place on the way from one model to the next, the way
      // the wait line's own words do (shared/swapping-text.ts): the copy leaving
      // rises through a blur while the arriving copy comes up from below. The
      // helper writes nothing when the words stand already, so a pass costs no
      // mutation — which is what keeps the scheduler's observer quiet.
      setSwappingText(labelEl as HTMLElement, label)
      // The dimmed tone means "no seat to name yet". A re-enumeration no longer
      // counts: the catalogue stands on the last seat it named (catalog.ts), so
      // the words in the box are the seat in force and keep the normal tone.
      labelEl.classList.toggle('dsh-claude-model-btn-loading', current === null)
    }
    // The official Flash model's release tag rides beside the seat's name, the
    // way the host's own label draws it (release-tag.ts). The label's swap
    // touches the label element alone, so the tag stands beside it and follows
    // the model in force.
    const seatTag = current === null ? null : releaseTag(current.group.id, current.model)
    let seatTagEl = modelBtn.querySelector<HTMLElement>('.dsh-claude-model-tag')
    if (seatTag === null) {
      seatTagEl?.remove()
    } else {
      if (seatTagEl === null) {
        seatTagEl = buildElement('span', 'dsh-claude-model-tag')
        modelBtn.appendChild(seatTagEl)
      }
      if (seatTagEl.textContent !== seatTag) seatTagEl.textContent = seatTag
    }
    // The level is NOT part of this trigger any more: it has its own button
    // beside it (packages/client/src/features/effort/effort-picker.ts). A stale "· High" span from
    // an older generation is swept rather than reused.
    const staleEffortEl = modelBtn.querySelector('.dsh-claude-model-btn-effort')
    if (staleEffortEl !== null) staleEffortEl.remove()
    // The tag is part of the model's name for a screen reader too, the way the
    // host's own label reads the badge beside the words.
    const triggerAria = copy('triggerLabel', { model: label }) + (seatTag === null ? '' : ` ${seatTag}`)
    setAttributeIfChanged(modelBtn, 'aria-label', triggerAria)
    modelBtn.disabled = false

    renderModelBody()
    if (cards.subOpen()) {
      const modelSub = cards.sub()
      if (modelSub !== null) modelSub.render()
      cards.position()
    } else if (cards.mainOpen()) {
      cards.position()
    }
  }

  ui.model = {
    sync: syncModelControl,
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
    seatBox() { return seatBox !== null && seatBox.isConnected ? seatBox : null },
    seatPart(part) {
      if (seatBox === null || !seatBox.isConnected) return null
      return ensureSeatPart(seatBox, part)
    },
    /** The skin's model trigger while it is in the document, else null. */
    trigger() { return modelBtn !== null && modelBtn.isConnected ? modelBtn : null },
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
      return (modelBtn !== null && modelBtn.contains(target)) ||
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
      dropModelControl()
      modelCatalog.resetWarm()
      modelSlot = null
      seatBox = null
      cards.dispose()
    }
  }

  return ui.model.teardown
}
