import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import * as reactDom from 'react-dom/client'
import type { ReactNode } from 'react'

/** One blue action continuing the toast's sentence, as the host's Toast draws it. */
export interface HostToastAction {
  label: string
  prefix?: string
  onClick: () => void
}

/** What one notice says, and the shape it takes. */
export interface HostToastOptions {
  text: string
  icon?: ReactNode
  tone?: 'success'
  actions?: readonly HostToastAction[]
}

/** The notice channel is private, so render the host Toast directly; keys remount successive notices. */
export function createHostToast() {
  let root: reactDom.Root | null = null
  let seq = 0

  function show(options: HostToastOptions) {
    if (root === null) root = reactDom.createRoot(document.createElement('div'))
    seq++
    root.render(React.createElement(primitives.Toast, {
      ...options,
      key: `toast-${seq}`,
      onDone() { if (root !== null) root.render(null) },
    }))
  }

  return {
    show,
    /** Take the notice down before its hold ends, as an accepted action does. */
    hide() { if (root !== null) root.render(null) },
    /** Release the root with its feature. */
    dispose() {
      if (root !== null) root.unmount()
      root = null
    },
  }
}
