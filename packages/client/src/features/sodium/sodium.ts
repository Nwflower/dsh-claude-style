import { SODIUM_ON, SODIUM_UNDECIDED } from '../../constants'
import { prefsFromForm, readPrefs, savePrefs, subscribePrefs } from '../../core/prefs'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { createSodiumEngine } from './sodium-engine'

/**
 * The sodium rewrite (D114): the host's costly style rules, rewritten in place
 * to read attributes this skin keeps, while the reader has the switch on.
 *
 * The feature is installed whatever the switch says, because the switch starts
 * undecided: while it is, every look at the page is a probe, and the first one
 * that finds a listed rule turns the switch on for the reader. From the first
 * time the reader flips it, the switch holds a decided value the probe leaves
 * alone. `<head>` is watched for the sheets coming and going: a sheet injected
 * again is a new object carrying none of the rewrite.
 */
export function install(ctx: HostContext) {
  const engine = createSodiumEngine()
  let disposed = false
  /** A probe's write is on its way: the next look waits for the form to answer. */
  let probing = false

  function probe() {
    if (probing || !prefsFromForm() || readPrefs().sodium !== SODIUM_UNDECIDED) return
    probing = true
    const count = engine.survey()
    const write = disposed || count === 0 || readPrefs().sodium !== SODIUM_UNDECIDED ? Promise.resolve(null) : savePrefs({ sodium: SODIUM_ON })
    void write.finally(() => { probing = false })
  }

  function follow() {
    if (readPrefs().sodium === SODIUM_ON) engine.start()
    else engine.stop()
    probe()
  }

  const stopPrefs = subscribePrefs(follow)
  const stopHead = subscribeMutations(document.head, { childList: true, subtree: true }, () => {
    engine.refresh()
    probe()
  })
  follow()

  return () => {
    disposed = true
    stopPrefs()
    stopHead()
    engine.stop()
  }
}
