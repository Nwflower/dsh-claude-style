import { conversationSessionId, findConversationSession } from '../../core/host'
import { createContextStatsBinding } from './stats-binding'
import { createStatsBlock } from './stats-block'
import { CONTEXT_PANEL_ATTR, CONTEXT_STATS_ATTR, clearStrayContextNodes, contextPanel, findContextMeter } from './stats-panel'
import type { HostContext, HostText } from '../../core/host'
import type { HostSnapshotSource } from '@dsh-claude-style/contracts/services'

/**
 * The session's numbers, read from the host's own projections and shown in
 * the context popover.
 *
 * The composer's stats row is hidden (features/composer/inline-bar.css) and
 * the numbers move into the popover the context meter owns, which opens on
 * hover. They are read as DATA: the host computes `sessionStats` and
 * `tokenUsage` as durable whole-log session projections, and the session
 * face carries their key-addressed read faces (`session.projections.faceOf`)
 * — the same seat the host's own `useProjection` resolves. The host's two
 * stat dialogs are never opened, so nothing is rendered twice, and the block
 * is filled the moment the popover appears (and again on every projection
 * frame while it is open).
 *
 * The WORDS come from the host's own `chat` locale namespace, the one its
 * pills read, so the two surfaces agree letter for letter and follow the
 * shell language together; the formatting rules the host applies before it
 * paints are mirrored in stats-format.ts.
 *
 * The projections are followed here, the rows and sections are built in
 * stats-model.ts, the host's panel and its marks are read in stats-panel.ts,
 * the block and its skeleton are written in stats-block.ts, and the hover
 * path and the alignment reading are in stats-binding.ts.
 *
 * @param ctx - client context: the session binding and the locale seat.
 * @returns { sync, close, reposition, teardown }.
 */
export function createSessionStats(ctx: HostContext) {
  /** The projections the block reads, in the order its sections appear. */
  const STATS_KEYS = ['sessionStats', 'tokenUsage']

  /** The projection keys this page is following, and how to stop. */
  let watch: { sessionId: string, faces: Record<string, HostSnapshotSource<unknown>>, off: (() => void)[] } | null = null

  /**
   * The shown conversation's host session id.
   *
   * Read off the active conversation's own column (features/turn-status
   * does the same): the id names the conversation on screen, which is the
   * composer whose meter opened the popover.
   */
  function shownSessionId() {
    const id = conversationSessionId(findConversationSession())
    return id === null ? '' : id
  }

  /**
   * The host's key-addressed read faces for one session, or null while the
   * session or its projections cannot be reached.
   */
  function statsFaces(sessionId: string) {
    const sessions = ctx.get('sessions')
    const binding = typeof sessions?.binding === 'function' ? sessions.binding(sessionId) : undefined
    const projections = binding?.session?.projections
    if (typeof projections?.faceOf !== 'function') return null
    const faces: Record<string, HostSnapshotSource<unknown>> = {}
    for (let i = 0; i < STATS_KEYS.length; i++) faces[STATS_KEYS[i]] = projections.faceOf(STATS_KEYS[i])
    return faces
  }

  /** One projection's current whole value, or undefined while it is absent. */
  function statsValue<Value>(key: string): Value | undefined {
    const face = watch === null ? undefined : watch.faces[key]
    return typeof face?.getSnapshot === 'function' ? face.getSnapshot() as Value : undefined
  }

  /** The host's `chat` namespace translate seat, or null when it is absent. */
  function chatText(): HostText | null {
    const locale = ctx.get('locale')
    return typeof locale?.bind === 'function' ? locale.bind('chat') : null
  }

  const block = createStatsBlock(statsValue, chatText)
  const binding = createContextStatsBinding()

  /** Stop following the projections (a different session, or the teardown). */
  function releaseWatch() {
    if (watch === null) return
    for (let i = 0; i < watch.off.length; i++) watch.off[i]()
    watch = null
    block.stopSkeleton()
  }

  /**
   * A projection frame landed. The block is the skin's own node inside the
   * host's panel, so it is rewritten here rather than through a pass.
   */
  function onStatsFrame() {
    block.render()
  }

  /**
   * Follow the shown conversation's projections, one subscription per
   * session: a switch releases the old faces and binds the new ones.
   */
  function syncWatch() {
    const sessionId = shownSessionId()
    if (watch !== null && watch.sessionId === sessionId) return
    releaseWatch()
    block.resetContent()
    if (sessionId === '') return
    const faces = statsFaces(sessionId)
    if (faces === null) return
    const off: (() => void)[] = []
    for (let i = 0; i < STATS_KEYS.length; i++) {
      const face = faces[STATS_KEYS[i]]
      if (typeof face?.subscribe === 'function') off.push(face.subscribe(onStatsFrame))
    }
    watch = { sessionId, faces, off }
  }

  /**
   * A pass over the context popover: follow the shown conversation's
   * projections, then keep the panel's block current while it is open.
   */
  function syncContextPopover() {
    syncWatch()
    const meter = findContextMeter()
    if (meter !== null) binding.bindMeter(meter)
    const panel = contextPanel()
    if (panel === null) return
    binding.bindPanel(panel)
    block.render()
  }

  clearStrayContextNodes()

  return {
    /** One pass: keep the panel filled while it is open. */
    sync() {
      syncContextPopover()
    },
    /** Composer focus closes the panel the host's trigger opened. */
    close() {
      binding.close()
    },
    /**
     * The viewport moved under the panel: the host re-places it from its
     * anchor, so the skin's own reading of where its right edge belongs
     * is taken again in the same frame.
     */
    reposition(reason: 'viewport' | 'composer') {
      if (reason !== 'viewport') return
      const panel = contextPanel()
      if (panel !== null) binding.align(panel)
    },
    /** Drop the appends, the projection subscriptions and the hover timers. */
    teardown() {
      binding.cancelHover()
      releaseWatch()
      binding.releaseSize()
      const blocks = document.querySelectorAll(`[${CONTEXT_STATS_ATTR}]`)
      for (let i = 0; i < blocks.length; i++) {
        blocks[i].remove()
      }
      const panels = document.querySelectorAll(`[${CONTEXT_PANEL_ATTR}]`)
      for (let i = 0; i < panels.length; i++) panels[i].removeAttribute(CONTEXT_PANEL_ATTR)
      block.resetContent()
    }
  }
}
