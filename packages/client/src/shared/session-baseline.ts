import { requestFrame } from '@dsh-claude-style/engine/frame'
import { observeSession } from '@dsh-claude-style/engine/host'

/**
 * Take what a session switch mounts as the conversation as it was saved (D91).
 *
 * A switch replaces the whole transcript in the frame it lands in. An engine
 * that plays arrivals holds still from the broadcast until that frame's write
 * phase, where it takes everything standing on the page as already arrived.
 *
 * @param hold - told at the broadcast: what mounts from here on is history.
 * @param baseline - told once in the switch's frame: take the page as arrived
 *        and let arrivals play again.
 * @returns the teardown: the broadcast is no longer heard and a frame in flight
 *          is dropped.
 */
export function baselineOnSessionSwitch(hold: () => void, baseline: () => void): () => void {
  let cancelFrame: (() => void) | null = null
  const stopSession = observeSession(() => {
    hold()
    if (cancelFrame !== null) return
    cancelFrame = requestFrame({
      write() {
        cancelFrame = null
        baseline()
      },
    })
  })
  return () => {
    if (cancelFrame !== null) cancelFrame()
    cancelFrame = null
    stopSession()
  }
}
