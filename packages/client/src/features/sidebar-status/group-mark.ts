import { WORKSPACE_RUNNING_ATTR } from '../../constants'

/** The seat that holds the mark: the session row's trailing column, 14 by 16. */
const SEAT_CLASS = 'dsh-claude-sidebar-group-seat'
/** The shared ongoing mark (theme/sidebar.css), whose look the reader chooses. */
const MARK_CLASS = 'dsh-claude-ongoing-mark'

/**
 * The running mark one workspace row carries while its workspace stands closed
 * and a session under it runs: the row's own attribute for the stylesheet, and
 * the dot or ring at the side the reader chose. The mark is the shared ongoing
 * element, so breathing, ring, reduced motion and forced colours are answered
 * by the rules the session rows already use.
 */
export class WorkspaceRunningMark {
  private seat: HTMLElement | null = null
  private mark: HTMLElement | null = null
  /** The look written on the mark element; '' until one is written. */
  private look = ''

  constructor(readonly row: HTMLElement) {}

  /**
   * @param running - whether the row's workspace holds a running session.
   * @param look - the reader's running style; the seat stays for the shimmer,
   *   whose stylesheet hides it while the title animates.
   */
  update(running: boolean, look: string) {
    this.row.toggleAttribute(WORKSPACE_RUNNING_ATTR, running)
    if (!running) {
      this.release()
      return
    }
    if (this.seat === null || this.seat.parentElement !== this.row) {
      const seat = document.createElement('span')
      seat.className = SEAT_CLASS
      seat.setAttribute('aria-hidden', 'true')
      const mark = document.createElement('span')
      mark.className = MARK_CLASS
      seat.append(mark)
      this.row.append(seat)
      this.seat = seat
      this.mark = mark
      this.look = ''
    }
    if (this.look !== look && this.mark !== null) {
      this.mark.setAttribute('data-look', look)
      this.look = look
    }
  }

  private release() {
    this.seat?.remove()
    this.seat = null
    this.mark = null
    this.look = ''
  }

  dispose() {
    this.update(false, '')
  }
}
