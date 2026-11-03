import type { HostSlotsService } from '@dsh-claude-style/contracts/services'

/**
 * The model seat's key in the host's slot registry: the composer's named
 * model seat (ui-model-selection registers it; a plugin shadows it by
 * registering the same key at another priority).
 */
export const MODEL_SLOT_KEY = 'conversation.input.model'

/**
 * Whether a third-party entry holds the host's model seat. The ledger's
 * winner — for this single-kind slot, entriesOfSlot projects the one live
 * winner — is the host's own seat at the default priority 0 (ui-model-selection
 * registers with none, and the registry refuses a second registration at an
 * occupied cell's exact priority), so a winner standing at any other priority
 * is a plugin shadowing it and the skin yields the seat. An empty ledger — a
 * host that draws the seat without the registry — and a host without the
 * service at all keep the skin self-drawn.
 */
export function thirdPartyHoldsSeat(slots: HostSlotsService | null): boolean {
  if (slots === null) return false
  const winners = slots.entriesOfSlot(MODEL_SLOT_KEY)
  return winners.length > 0 && (winners[0].options.priority ?? 0) !== 0
}
