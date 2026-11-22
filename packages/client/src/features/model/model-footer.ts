import { buildElement } from '@dsh-claude-style/engine/dom'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { createTeamMode } from './team-mode'

/**
 * Level 1's pinned footer: the divider, the More-models row and the Agent Teams
 * switch (team-mode.ts). The list above scrolls under it.
 */
export function createModelFooter(options: {
  ctx: HostContext
  /** The footer node of the current chrome, or null before the cards build it. */
  footer(): HTMLElement | null
  /** The More-models row, built by the row half (rows.ts). */
  moreCell(): HTMLElement
  /** The scheduler wake-up a projection frame asks for. */
  schedule(): void
  /** Close the picker's cards. */
  dismiss(): void
  /** Hand the focus back to the picker's trigger once a dialog is gone. */
  restoreFocus(): void
  /** Whether the seat refuses selection changes right now (a model selection is in flight). */
  locked(): boolean
}) {
  const teamMode = createTeamMode({
    ctx: options.ctx,
    schedule: options.schedule,
    dismiss: options.dismiss,
    restoreFocus: options.restoreFocus,
    locked: options.locked,
  })

  return {
    /** What the footer's rows depend on, for the level-1 render signature. */
    signature(): string {
      return `${teamMode.available()}`
    },
    /**
     * Rebuild the footer's rows. The divider exists to close the list off from
     * what follows it, so with no row after it, it is a stray line and is not
     * drawn either.
     */
    layout(showMore: boolean) {
      const footer = options.footer()
      if (!footer) return
      const stale: ChildNode[] = []
      for (let child = footer.firstChild; child !== null; child = child.nextSibling) stale.push(child)
      for (let i = 0; i < stale.length; i++) footer.removeChild(stale[i])
      const showTeam = teamMode.available()
      if (!showMore && !showTeam) return
      // The role is what the shared separator rule reads (shared/popover.css), so
      // this line is the same line as every separator the host draws in a card.
      const divider = buildElement('div', 'dsh-claude-model-divider')
      divider.setAttribute('role', 'separator')
      footer.appendChild(divider)
      if (showMore) footer.appendChild(options.moreCell())
      if (showTeam) footer.appendChild(teamMode.row())
    },
    refresh() {
      teamMode.refresh()
    },
    dispose() {
      teamMode.dispose()
    },
  }
}