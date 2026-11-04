import { COMPOSER_CARD_SELECTOR, PERMISSION_TRIGGER_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { PERMISSIONS_ATTR } from '../../constants'
import { closestConversationSession, conversationSessionId, currentPreset, currentSession, sessionById } from '@dsh-claude-style/engine/host'
import { buildElement, closestFrom, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { SEGMENTS_CLASS, SEGMENT_CLASS } from '../../shared/segment-control'
import { removeStrayNodes } from '../../shared/popover'
import { createSlidingPill } from '../../shared/sliding-pill'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostSession } from '@dsh-claude-style/contracts/services'
import type { FeatureUi } from '../../core/feature'
import type manifest from './permissions.manifest'
import { copy } from './copy'
import { createStrayScan } from './stray-nodes'
import { createPermissionCatalog } from './permission-catalog'
import { createPermissionCard, PERMISSION_OWNER_ATTR } from './permission-tier-card'

/**
 * The permission control in the composer's access slot: the segment group the
 * classic hero draws and, everywhere else, the trigger with the tier card
 * (permission-tier-card.ts) — both fed by the host's permission catalog
 * (permission-catalog.ts). The pass keeps one control per composer card and
 * mirrors the running preset of the session that card shows; a pick goes
 * through that session's `/permission` command, so the sidebar's composer
 * switches its own subagent rather than the main conversation.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  let segments: HTMLElement | null = null
  /** The segment group's sliding highlight (packages/client/src/shared/sliding-pill.ts). */
  const segmentPill = createSlidingPill('[data-active]')
  /** Whether the last pass drew the segments on the cold start screen. */
  let coldStartShown = false
  /** The segment signature the pass last rendered, so a change rebuilds the group. */
  let renderedSegments = ''

  const catalog = createPermissionCatalog(ctx, () => ui.schedule!())

  /** One control per composer card's access slot, kept across passes. */
  interface PermissionSlot {
    key: string
    host: HTMLElement
    card: ReturnType<typeof createPermissionCard>
  }

  const slots = new Map<HTMLElement, PermissionSlot>()
  const usedKeys = new Set<string>()
  let keySeq = 0

  function mintKey() {
    let key: string
    do {
      keySeq += 1
      key = `permission-${keySeq}`
    } while (usedKeys.has(key))
    usedKeys.add(key)
    return key
  }

  function claimKey(raw: string | null) {
    if (raw !== null && raw.length > 0 && !usedKeys.has(raw)) {
      usedKeys.add(raw)
      return raw
    }
    return mintKey()
  }

  /** The access trigger inside one composer card, if that card carries a permission slot. */
  function accessTriggerIn(card: Element) {
    return card.querySelector<HTMLButtonElement>(PERMISSION_TRIGGER_SELECTOR)
  }

  /** The session whose conversation contains this permission slot. */
  function sessionFor(node: Element): HostSession | null {
    const id = conversationSessionId(closestConversationSession(node))
    if (id === null) return currentSession(ctx)
    return sessionById(ctx, id)
  }

  /**
   * Build the segment group from the resolved slots. `specs` is what the
   * catalog's resolvedSegments() returned, so a slot the host cannot serve is
   * simply absent instead of drawn dead.
   */
  function buildSegments(onPick: (preset: string | null) => void, specs: { label: string, preset: string }[]) {
    const group = buildElement('div', SEGMENTS_CLASS)
    group.setAttribute('role', 'radiogroup')
    group.setAttribute('aria-label', copy('permissionGroupLabel'))
    group.setAttribute('data-composer-segments', '')
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i]
      const item = document.createElement('button')
      item.type = 'button'
      item.className = SEGMENT_CLASS
      item.setAttribute('role', 'radio')
      item.setAttribute('data-preset', spec.preset)
      item.textContent = spec.label
      group.appendChild(item)
    }
    group.addEventListener('click', event => {
      const item = closestFrom(event.target, `.${SEGMENT_CLASS}`)
      if (item === null || !group.contains(item)) return
      onPick(item.getAttribute('data-preset'))
    })
    return group
  }

  /**
   * The first failed switch request, thrown on the next sync so the feature
   * retires the way a failed catalog read does (D12): a control that cannot
   * switch must hand the shipped access button back, and the refusal must
   * not pass silently.
   */
  let submitError: Error | null = null

  /**
   * Request the preset switch through the host's `/permission` command —
   * the same write the shipped picker's confirmation dialog ends in, minus
   * the dialog. The command validates the preset against the host's own
   * catalog, writes the sandbox mode and the approval policy, and appends
   * the preset event, so the next sync re-renders the control from the
   * projection alone.
   */
  function submitPreset(preset: string, session: HostSession) {
    const settled = session.command(`/permission ${preset}`)
    if (settled === undefined || settled === null) return
    settled.then((result) => {
      if (result === null || typeof result !== 'object' || result.ok !== true) {
        submitError = new Error(`permission: the /permission ${preset} command was refused`)
      } else if (result.value === null || typeof result.value !== 'object' || result.value.matched !== true) {
        submitError = new Error('permission: the host offers no /permission command')
      } else {
        submitError = null
      }
      ui.schedule!()
    }, () => {
      submitError = new Error(`permission: the /permission ${preset} command failed`)
      ui.schedule!()
    })
  }

  /**
   * Request the switch for every row, gated presets included. A same-value
   * pick writes nothing.
   */
  function pick(preset: string | null, session: HostSession | null) {
    if (session === null || preset === null) return
    if (preset === currentPreset(session)) return
    submitPreset(preset, session)
  }

  const strayScan = createStrayScan()

  /** Take one slot down with its container, popover and registry entry. */
  function dropSlot(slot: PermissionSlot) {
    const container = slot.card.container()
    slot.card.clear()
    slot.card.dispose()
    if (container !== null && container.parentElement !== null) container.remove()
    usedKeys.delete(slot.key)
  }

  /** The slot for one host, adopting the container a reload left behind. */
  function ensureSlot(host: HTMLElement, strays: ReturnType<ReturnType<typeof createStrayScan>['existing']>) {
    const held = slots.get(host)
    if (held !== undefined) return held
    const adopted = host.querySelector<HTMLElement>('.dsh-claude-perm-container')
    const rawKey = adopted?.getAttribute(PERMISSION_OWNER_ATTR) ?? null
    const key = claimKey(rawKey)
    const controller = createPermissionCard(catalog, key)
    const slot = { key, host, card: controller }
    slots.set(host, slot)
    if (adopted !== null) {
      let strayPopover: HTMLElement | null = null
      for (let i = 0; i < strays.popovers.length; i++) {
        if (strays.popovers[i].getAttribute(PERMISSION_OWNER_ATTR) === rawKey) {
          strayPopover = strays.popovers[i]
          break
        }
      }
      if (strayPopover === null && strays.popovers.length === 1) strayPopover = strays.popovers[0]
      controller.adopt(
        adopted,
        adopted.querySelector<HTMLButtonElement>('.dsh-claude-perm-btn'),
        adopted.querySelector<HTMLElement>('.dsh-claude-perm-label'),
        strayPopover,
      )
    }
    return slot
  }

  /** Mount the slot's trigger container in its host, reusing a live one. */
  function mountSlot(slot: PermissionSlot, onPick: (preset: string | null) => void) {
    let held = slot.card.container()
    if (held === null) {
      const res = slot.card.build(onPick)
      slot.host.insertBefore(res.container, slot.host.firstChild)
      held = res.container
    } else if (held.parentElement !== slot.host) {
      slot.host.insertBefore(held, slot.host.firstChild)
    }
    const containers = slot.host.querySelectorAll<HTMLElement>('.dsh-claude-perm-container')
    for (let i = 0; i < containers.length; i++) {
      if (containers[i] !== held) containers[i].remove()
    }
    return held
  }

  /** The cold start screen's mode strip, inside the single-line composer card. */
  function findModesStrip() {
    return document.querySelector<HTMLElement>(COMPOSER_CARD_SELECTOR + '[data-dsh-claude-part~="card-workspace-trigger"] [data-dsh-claude-part~="modes"]')
  }

  /** Keep the card's trigger in the slot the host renders, adopting a reload's orphans. */
  function syncCardSlot(cardEl: HTMLElement, trigger: HTMLButtonElement, strays: ReturnType<ReturnType<typeof createStrayScan>['existing']>) {
    const host = trigger.parentElement
    if (host === null) return null
    const slot = ensureSlot(host, strays)
    mountSlot(slot, preset => pick(preset, sessionFor(cardEl)))
    const session = sessionFor(cardEl)
    slot.card.update(session === null ? null : currentPreset(session), false)
    return host
  }

  /**
   * The cold start screen's single-line composer draws no access slot, so the
   * classic skin's own disabled tier card takes its mode strip: it shows the
   * preset a new session starts in and takes no input, letting a press fall
   * through to the card's workspace pick.
   */
  function syncInertSlot(host: HTMLElement, strays: ReturnType<ReturnType<typeof createStrayScan>['existing']>) {
    const slot = ensureSlot(host, strays)
    mountSlot(slot, () => {})
    slot.card.update(catalog.coldStartPreset(), true)
    return host
  }

  /**
   * The classic hero's segment group. It stands in the same slot the host's
   * access button would, and a pick switches the main session; the sidebar's
   * composers keep their own tier cards beside it.
   */
  function syncHeroSegments(host: HTMLElement, coldStart: boolean, heroCard: HTMLElement | null, strays: ReturnType<ReturnType<typeof createStrayScan>['existing']>) {
    const heldSlot = slots.get(host)
    if (heldSlot !== undefined) {
      dropSlot(heldSlot)
      slots.delete(host)
    }
    const containers = host.querySelectorAll<HTMLElement>('.dsh-claude-perm-container')
    for (let c = 0; c < containers.length; c++) containers[c].remove()

    const candidates: HTMLElement[] = []
    for (let i = 0; i < strays.segments.length; i++) {
      if (strays.segments[i].isConnected) candidates.push(strays.segments[i])
    }
    if (segments !== null && segments.isConnected && !candidates.includes(segments)) candidates.push(segments)

    // The slots follow the host's catalog: the deployment's own auto tier
    // takes the Auto slot when it is offered, and a slot with no offered
    // preset is not drawn. Rebuild when the binding changed; the shipped
    // group is reused otherwise, so a pass leaves the DOM alone.
    const segmentSpecs = catalog.resolvedSegments()
    const segmentSignature = segmentSpecs.map(spec => `${spec.label}=${spec.preset}`).join('|')
    let group: HTMLElement | null = null
    for (let g = 0; g < candidates.length; g++) {
      if (host.contains(candidates[g])) {
        group = candidates[g]
        break
      }
    }
    for (let extra = 0; extra < candidates.length; extra++) {
      if (candidates[extra] !== group) candidates[extra].remove()
    }
    if (segmentSignature === renderedSegments && group !== null) {
      // Reuse the group standing in this host.
    } else {
      if (group !== null) group.remove()
      renderedSegments = segmentSignature
      group = buildSegments(preset => pick(preset, coldStart ? null : (heroCard === null ? currentSession(ctx) : sessionFor(heroCard))), segmentSpecs)
      host.insertBefore(group, host.firstChild)
    }
    segments = group

    const heroSession = heroCard === null ? null : sessionFor(heroCard)
    const preset = coldStart ? catalog.coldStartPreset() : heroSession === null ? null : currentPreset(heroSession)
    for (let j = 0; j < group.children.length; j++) {
      // buildSegments fills the group with buttons alone.
      const item = group.children[j] as HTMLButtonElement
      if (item.disabled !== coldStart) item.disabled = coldStart
      const isCurrent = item.getAttribute('data-preset') === preset
      item.toggleAttribute('data-active', isCurrent)
      setAttributeIfChanged(item, 'aria-checked', String(isCurrent))
    }
    segmentPill.sync(group)
  }

  // Re-insert when a re-render swapped the host row, then mirror the running preset.
  function syncSegments() {
    // The composer feature leaves the page while its scope preference is off.
    const isHero = ui.composer?.isHero() ?? false
    const composerOn = ui.composer?.isActive() ?? false
    const strays = strayScan.existing()

    if (!composerOn) {
      for (const slot of slots.values()) dropSlot(slot)
      slots.clear()
      usedKeys.clear()
      if (segments !== null) segments.remove()
      segments = null
      segmentPill.sync(null)
      coldStartShown = false
      renderedSegments = ''
      strayScan.settle()
      return
    }

    const composerCards = ui.composer?.cards() ?? []
    const session = currentSession(ctx)
    const heroCard = ui.composer?.heroCard() ?? composerCards[0] ?? null
    const heroTrigger = heroCard === null ? null : accessTriggerIn(heroCard)
    // The cold start screen (no session yet) renders no access button: the
    // host leaves the card's mode strip empty and turns the whole card into
    // the workspace pick target. The skin's own control takes that strip and
    // shows the preset the new session will start in; it takes no input there,
    // so a press falls through to the card and opens the workspace picker like
    // every other control on it.
    const coldStart = heroTrigger === null && isHero && session === null
    const segmentsHere = isHero && !(ui.composer?.isStudioHome() ?? false)
    let heroHost: HTMLElement | null = null

    if (segmentsHere) {
      // The default can change in Settings without a catalog event, so each
      // return to the cold start screen reads it again.
      if (coldStart && !coldStartShown && catalog.hasCatalog()) catalog.probe()
      coldStartShown = coldStart
      heroHost = coldStart ? findModesStrip() : heroTrigger?.parentElement ?? null
      if (heroHost !== null) syncHeroSegments(heroHost, coldStart, heroCard, strays)
    } else {
      coldStartShown = false
      for (let s = 0; s < strays.segments.length; s++) strays.segments[s].remove()
      if (segments !== null) segments.remove()
      segments = null
      segmentPill.sync(null)
      // The studio home's single-line hero has no access slot either. Keep the
      // disabled tier card the classic skin draws in its mode strip, now per
      // card, instead of dropping the control with the segments.
      if (coldStart) {
        const modesHost = findModesStrip()
        if (modesHost !== null) heroHost = syncInertSlot(modesHost, strays)
      }
    }

    const seenHosts = new Set<HTMLElement>()
    // The hero branch's host (a segment row or the inert cold-start card) has
    // no card of its own to revisit below; keep its slot from the cleanup.
    if (heroHost !== null) seenHosts.add(heroHost)
    for (let i = 0; i < composerCards.length; i++) {
      const cardEl = composerCards[i]
      if (heroHost !== null && cardEl === heroCard) continue
      const trigger = accessTriggerIn(cardEl)
      if (trigger === null) continue
      const host = syncCardSlot(cardEl, trigger, strays)
      if (host !== null) seenHosts.add(host)
    }
    for (const [host, slot] of [...slots]) {
      if (seenHosts.has(host) && host.isConnected) continue
      dropSlot(slot)
      slots.delete(host)
    }

    // A client reload leaves the previous generation's nodes behind: take down
    // the ones no slot adopted now, while the first pass still sees them.
    const liveContainers = new Set<HTMLElement>()
    const livePopovers = new Set<HTMLElement>()
    for (const slot of slots.values()) {
      const container = slot.card.container()
      const popover = slot.card.popover()
      if (container !== null) liveContainers.add(container)
      if (popover !== null) livePopovers.add(popover)
    }
    for (let c = 0; c < strays.containers.length; c++) {
      if (!liveContainers.has(strays.containers[c])) strays.containers[c].remove()
    }
    for (let p = 0; p < strays.popovers.length; p++) {
      if (!livePopovers.has(strays.popovers[p])) strays.popovers[p].remove()
    }
    if (heroHost !== null || seenHosts.size > 0) strayScan.settle()
  }

  ui.permissions = {
    /**
     * The pass's read phase: the segment control's own box, taken before this
     * frame's writes. A pass that builds the segments measures them in the
     * write phase instead (sliding-pill).
     */
    measure() {
      if (segments !== null && segments.isConnected) segmentPill.measure(segments)
    },
    sync() {
      if (catalog.error() !== null) throw catalog.error()
      if (submitError !== null) throw submitError
      syncSegments()
      // The tier cards are fixed under their triggers and nothing else places
      // them again: a column that moved under an open card (the sidebar
      // opening, the window narrowing) would otherwise leave it hanging where
      // the trigger used to be.
      for (const slot of slots.values()) slot.card.placeOpen()
    },
    /**
     * Esc and composer focus close the menu. There is deliberately no
     * 'outside' route — each card runs its own document pointerdown listener
     * (permission-tier-card.ts).
     */
    close() {
      for (const slot of slots.values()) slot.card.close()
    },
    /** A viewport or composer-card change moves the anchor: place every open card in the same frame. */
    reposition() {
      for (const slot of slots.values()) slot.card.placeOpen()
    },
  }

  // The composer restyle hides the host's access button only while this
  // says its replacement is installed.
  document.body.setAttribute(PERMISSIONS_ATTR, '')
  catalog.start()

  return () => {
    for (const slot of slots.values()) dropSlot(slot)
    slots.clear()
    usedKeys.clear()
    catalog.dispose()
    segmentPill.release()
    // One sweep for every node the feature draws: the segment groups and the
    // tier card's trigger container and popover (permission-tier-card.ts).
    removeStrayNodes(document, `.${SEGMENTS_CLASS}[data-composer-segments], .dsh-claude-perm-container, .dsh-claude-perm-popover`, [])
    segments = null
    document.body.removeAttribute(PERMISSIONS_ATTR)
  }
}
