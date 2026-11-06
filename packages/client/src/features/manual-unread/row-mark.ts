import { SESSION_ROW_KEY_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'

const MARK = 'data-dsh-claude-manual-unread'
const MARKER_CLASS = 'dsh-claude-manual-unread-marker'

/** Workspace and result rows are separate identities; session ids keep their opaque tail. */
export function unreadRowSessionId(row: Element): string | null {
  const key = row.getAttribute(SESSION_ROW_KEY_ATTRIBUTE)
  if (key === null || key.startsWith('session:') === false) return null
  const id = key.slice('session:'.length)
  return id.length > 0 ? id : null
}

/** Own one marker and description token; native status dots and drop pseudo-elements stay intact. */
export class UnreadRowMark {
  private readonly marker = document.createElement('span')

  constructor(readonly row: HTMLElement, private readonly descriptionId: string) {
    this.marker.className = MARKER_CLASS
    this.marker.setAttribute('aria-hidden', 'true')
  }

  update(unread: boolean) {
    this.row.toggleAttribute(MARK, unread)
    if (unread) {
      if (this.marker.parentNode !== this.row) this.row.append(this.marker)
    } else this.marker.remove()
    const foreign = (this.row.getAttribute('aria-describedby') ?? '').split(/\s+/)
      .filter(id => id.length > 0 && id !== this.descriptionId)
    if (unread) foreign.push(this.descriptionId)
    const next = foreign.join(' ')
    if (next.length > 0) {
      if (this.row.getAttribute('aria-describedby') === next) return
      this.row.setAttribute('aria-describedby', next)
    } else if (this.row.hasAttribute('aria-describedby')) this.row.removeAttribute('aria-describedby')
  }

  dispose() { this.update(false) }
}
