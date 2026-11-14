import { motionReduced, subscribePrefs } from '../core/prefs'

/**
 * Run one motion engine while the page may animate, and only then (D40).
 *
 * The engine is made when the choice allows animation and taken down when it
 * does not; the body attribute it hangs its stylesheet off goes with it, so a
 * page held still carries neither the engine nor the rules that would replay
 * what it draws. A preference change is the one signal: nothing here reloads the
 * page or paints a pass of its own.
 *
 * @param attribute - the body attribute the feature's rules are gated on.
 * @param create - makes the engine, or answers null where the browser cannot
 *        draw it at all; the attribute is written only for an engine that runs.
 * @returns the teardown: the choice is no longer followed and the engine is gone.
 */
export function keepMotionEngine(attribute: string, create: () => (() => void) | null): () => void {
  let engine: (() => void) | null = null

  const apply = () => {
    if (!motionReduced()) {
      if (engine !== null) return
      engine = create()
      if (engine !== null) document.body.setAttribute(attribute, '')
      return
    }
    document.body.removeAttribute(attribute)
    if (engine === null) return
    engine()
    engine = null
  }

  apply()
  const stopPrefs = subscribePrefs(apply)
  return () => {
    stopPrefs()
    document.body.removeAttribute(attribute)
    if (engine === null) return
    engine()
    engine = null
  }
}
