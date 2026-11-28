import * as React from 'react'
import * as reactDom from 'react-dom/client'

/**
 * A body-mounted React root for a dialog built on the host's `Modal`, which
 * portals its mask and card into `<body>` (D43). The container stands in the
 * document so the root owns a real seat, and closing unmounts the root and
 * takes the container with it: the portal, its full-viewport mask and the root
 * itself are all released together. A root kept alive and only rendered to
 * `null` leaves its portal behind when the close is interrupted by another
 * dialog or a host re-render, stranding the mask over the page (#478).
 */
export interface DialogRoot {
  /** Draw the dialog, mounting a fresh seat on the first opening. */
  render(element: React.ReactElement): void
  /** Take the dialog down and release its seat; a no-op while it is down. */
  close(): void
  /** Release the seat with the feature, synchronously and repeatably (D12). */
  dispose(): void
}

export function createDialogRoot(): DialogRoot {
  let host: HTMLElement | null = null
  let root: reactDom.Root | null = null
  const pendingClose = new Set<{ closing: reactDom.Root, node: HTMLElement | null }>()

  /** Hand the seat out and forget it, so a close and a reopen never share a root. */
  function release() {
    if (root === null) return null
    const closing = root
    const node = host
    root = null
    host = null
    return { closing, node }
  }

  return {
    render(element) {
      // A close still waiting on its microtask owns the old seat; a reopen
      // takes a new one rather than rendering into a root on its way out.
      if (root === null) {
        host = document.createElement('div')
        host.className = 'dsh-claude-dialog-host'
        document.body.append(host)
        root = reactDom.createRoot(host)
      }
      root.render(element)
    },
    close() {
      const released = release()
      if (released === null) return
      pendingClose.add(released)
      // Unmounting synchronously during a React commit warns; defer a microtask.
      queueMicrotask(() => {
        if (!pendingClose.delete(released)) return
        released.closing.unmount()
        released.node?.remove()
      })
    },
    dispose() {
      for (const released of [...pendingClose]) {
        pendingClose.delete(released)
        released.closing.unmount()
        released.node?.remove()
      }
      const released = release()
      if (released === null) return
      released.closing.unmount()
      released.node?.remove()
    },
  }
}