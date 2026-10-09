import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'
import { VIEW_TABLIST_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { createStamp } from '../../shared/dom'
import type { CompositionRegistry } from './official-slots'

/**
 * The reading view in the host Chat view's place (D57). The view registers
 * under Chat's own id at a lower priority, which the registry's shadowing
 * renders in place of the host's entry; the host's entry stays registered
 * beneath it, and comes back by itself the moment the view leaves or crashes.
 *
 * The host draws its view tabs from every registration in the list, the
 * shadowed one included, so the strip would show Chat twice, both tabs
 * selecting the same id. The host's own tab is marked and hidden, and a strip
 * left with a single tab is hidden as the host hides a strip of one.
 */

export const CHAT_VIEW_ID = 'chat'
/** Below the host's default of 0: the lowest priority in a cell renders. */
export const READER_PRIORITY = -1
/** The view the host lists only while its developer tools are on. */
const DEVELOPER_VIEW_ID = 'trajectory'

const shadowedTab = createStamp<HTMLElement>('data-dsh-claude-reader-shadowed-tab')
const loneStrip = createStamp<HTMLElement>('data-dsh-claude-reader-lone-tab')

/** The host's own Chat registration, beneath the reading view's. */
export function hostChatEntry(slots: CompositionRegistry): StoredEntry | undefined {
  return slots.entries('conversation.view').find(entry => entry.options.id === CHAT_VIEW_ID && (entry.options.priority ?? 0) !== READER_PRIORITY)
}

/**
 * Mark the host's Chat tab while the view stands in its place; `null` takes
 * the marks off. The strip lists the registrations in the registry's order,
 * without the developer view while the developer tools are off.
 */
export function syncShadowedTab(slots: CompositionRegistry | null): void {
  const strip = slots === null ? null : document.querySelector<HTMLElement>(VIEW_TABLIST_SELECTOR)
  if (slots === null || strip === null) {
    shadowedTab.release()
    loneStrip.release()
    return
  }
  const views = slots.entries('conversation.view').filter(entry => entry.options.id !== undefined)
  const tabs = strip.querySelectorAll<HTMLElement>(':scope > [role="tab"]')
  const listed = tabs.length === views.length ? views : views.filter(entry => entry.options.id !== DEVELOPER_VIEW_ID)
  // The strip renders after the registry notifies; until then it still lists the previous views.
  if (listed.length !== tabs.length) return
  const host = hostChatEntry(slots)
  const index = host === undefined ? -1 : listed.indexOf(host)
  shadowedTab.mark(index === -1 ? null : tabs[index]!)
  loneStrip.mark(tabs.length - (index === -1 ? 0 : 1) <= 1 ? strip : null)
}
