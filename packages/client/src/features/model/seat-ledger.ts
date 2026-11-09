import type { HostSlotsService } from '@dsh-claude-style/contracts/services'

/** Host slot registered by ui-model-selection. */
export const MODEL_SLOT_KEY = 'conversation.input.model'

/** The host seat uses priority 0; another priority means a plugin shadows it. Missing or empty registries keep the skin's seat. */
export function thirdPartyHoldsSeat(slots: HostSlotsService | null): boolean {
  if (slots === null) return false
  const winners = slots.entriesOfSlot(MODEL_SLOT_KEY)
  return winners.length > 0 && (winners[0].options.priority ?? 0) !== 0
}
