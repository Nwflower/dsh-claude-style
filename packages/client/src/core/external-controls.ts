/** Controls add their mount option shapes here through declaration merging. */
export interface ClaudeControlMountMap {}

export type ClaudeControlId = Extract<keyof ClaudeControlMountMap, string>
export type ClaudeControlMounters = {
  readonly [Id in ClaudeControlId]: (options: ClaudeControlMountMap[Id]) => () => void
}

export interface ClaudeControlsApi {
  has(id: string): id is ClaudeControlId
  mount<Id extends ClaudeControlId>(id: Id, options: ClaudeControlMountMap[Id]): () => void
}

export function installExternalControls(controls: ClaudeControlMounters): () => void {
  const previous = window.__DSH_CLAUDE_STYLE_CONTROLS__
  const active = new Set<() => void>()
  const has = (id: string): id is ClaudeControlId => Object.prototype.hasOwnProperty.call(controls, id)
  const api: ClaudeControlsApi = {
    has,
    mount(id, options) {
      if (!has(id)) throw new Error(`dsh-claude-style: unknown external control "${id}"`)
      const mount = controls[id] as (options: ClaudeControlMountMap[ClaudeControlId]) => () => void
      const stop = mount(options)
      let disposed = false
      const teardown = () => {
        if (disposed) return
        disposed = true
        active.delete(teardown)
        stop()
      }
      active.add(teardown)
      return teardown
    },
  }
  window.__DSH_CLAUDE_STYLE_CONTROLS__ = api
  return () => {
    for (const teardown of [...active]) teardown()
    if (window.__DSH_CLAUDE_STYLE_CONTROLS__ !== api) return
    if (previous === undefined) delete window.__DSH_CLAUDE_STYLE_CONTROLS__
    else window.__DSH_CLAUDE_STYLE_CONTROLS__ = previous
  }
}
