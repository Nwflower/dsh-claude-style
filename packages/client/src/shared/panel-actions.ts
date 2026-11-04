const panelOpenActions = new Map<string, () => void>()

/** A panel-list entry whose action does not select the host's main panel. */
export function registerPanelOpenAction(id: string, open: () => void) {
  if (panelOpenActions.has(id)) throw new Error(`duplicate panel open action: ${id}`)
  panelOpenActions.set(id, open)
  return () => {
    if (panelOpenActions.get(id) === open) panelOpenActions.delete(id)
  }
}

/** Run a registered action; false asks the caller to use the host's navigation. */
export function openPanelFromAction(id: string) {
  const open = panelOpenActions.get(id)
  if (open === undefined) return false
  open()
  return true
}
