import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ChatViewInjected } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'
import type { FeatureUi } from '../../core/feature'
import type { HostContext } from '../../core/host'
import type manifest from './chat-reader.manifest'
import { CHAT_VIEW_ID, READER_PRIORITY, hostChatEntry, syncShadowedTab } from './chat-tab'
import { installOfficialSlots, officialChildren } from './official-slots'
import type { CompositionRegistry } from './official-slots'
import { bumpCopyRevision, clearChoices } from './reader-state'
import { ReaderView } from './reader-view'
import type { ReaderInjected } from './reader-view'

/** dsh-better-display's view id in the same list. */
const PEER_VIEW_ID = 'reader'

/**
 * The reading view's installer (D57): the redraw tier's own conversation view,
 * in the place of the host's Chat view (chat-tab.ts).
 *
 * The view stands only over the host's own Chat registration, whose name and
 * callbacks it takes: at boot the plugins load in batches and Chat can
 * register after this one. dsh-better-display's reading view (id `reader`)
 * takes precedence: while it is on the page this one stays unregistered, so
 * two reading views never stand together. Its official seats mirror the
 * host's controls.
 *
 * @param ctx - client context.
 * @param ui - shared handle table; the view's handle hears copy changes and marks the tabs.
 * @returns teardown.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  // A host without late services has no slot registry to show a view in (D12).
  if (typeof ctx.inject !== 'function') return () => {}
  /** The registry while the view stands in Chat's place. */
  let standing: CompositionRegistry | null = null
  const fiber = ctx.inject(['slots'], scope => {
    const slots = scope.get('slots') as CompositionRegistry
    const register = (host: StoredEntry) => {
      const stops = [
        slots.register({
          name: 'conversation.view',
          id: CHAT_VIEW_ID,
          priority: READER_PRIORITY,
          order: host.options.order,
          label: host.options.label,
          locale: 'chat',
          children: officialChildren(slots),
          inject: (sessionId: SessionId): ReaderInjected => {
            // Files, skills, forks, history and images behave exactly as in Chat, whose callbacks these are.
            const chat = hostChatEntry(slots)?.inject
            if (chat === undefined) throw new Error('dsh-claude-style: the reading view needs the host\'s Chat view')
            const injected = (chat as unknown as (sessionId: SessionId) => ChatViewInjected)(sessionId)
            return {
              openFile: injected.openFile,
              openSkill: injected.openSkill,
              loadOlder: injected.loadOlder,
              loadImage: injected.loadImage,
              forkAt: injected.forkAt,
              fileMentions: injected.fileMentions,
              home: () => ctx.get('remote')?.$host?.home,
            }
          },
        }, ReaderView),
        installOfficialSlots(slots),
      ]
      standing = slots
      return () => {
        standing = null
        for (const stop of stops.reverse()) stop()
      }
    }
    scope.effect(() => slots.inject('conversation.view', () => {
      let stopView: (() => void) | null = null
      let reconciling = false
      const reconcile = () => {
        // Registering notifies the list again; that notice is this call's own.
        if (reconciling) return
        reconciling = true
        const host = hostChatEntry(slots)
        const peer = slots.entriesOfSlot('conversation.view').some(entry => entry.options.id === PEER_VIEW_ID)
        if ((host === undefined || peer) && stopView !== null) {
          stopView()
          stopView = null
        }
        if (host !== undefined && !peer && stopView === null) stopView = register(host)
        reconciling = false
      }
      const unsubscribe = slots.subscribe('conversation.view', reconcile)
      reconcile()
      return () => {
        unsubscribe()
        stopView?.()
        stopView = null
      }
    }), 'dsh-claude-style: reading view')
  })
  ui.chatReader = {
    onCopyChange: bumpCopyRevision,
    sync: () => syncShadowedTab(standing),
  }
  return () => {
    delete ui.chatReader
    fiber.dispose()
    syncShadowedTab(null)
    clearChoices()
  }
}
