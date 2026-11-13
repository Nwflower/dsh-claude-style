import * as React from 'react'
import * as reactDom from 'react-dom/client'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { buildElement, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { currentSessionId, hostRemoteAgentTeams, hostSessions } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostAgentTeamProjection, HostModelSelectionProjection, HostSnapshotSource } from '@dsh-claude-style/contracts/services'
import { createHostToast } from '../../shared/host-toast'
import { hostTooltip } from '../../shared/host-tooltip'
import { sessionProjectionFaces } from '../../shared/session-projections'
import { copy } from './copy'

const INFO_SVG = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.2"/><path d="M8 7.2v3.6"/><circle cx="8" cy="5.1" r="0.3" fill="currentColor"/></svg>'

/** The attribute the host's modal focuses on open: the safe answer takes the focus. */
const MODAL_AUTOFOCUS = { 'data-modal-autofocus': '' }

/** The projections one Team row reads: the saved selection, and whether the session has sent a model request yet. */
const PROJECTION_KEYS = ['agentTeam', 'modelSelection'] as const

/**
 * The Agent Teams switch the host draws in its model menu
 * (`conversation.input.model.options`, a session-scoped React slot). The
 * skin's picker replaces that menu, so the switch is drawn here and reads and
 * writes through the same two seats the host's own row uses: the session's
 * `agentTeam` and `modelSelection` projections, and `remote.agentTeams`.
 *
 * Like the host's row, it stands only for a root session whose projection the
 * host serves, and turning the team off after the session has sent a model
 * request asks first, because the change moves the tool set and the cache.
 */
export function createTeamMode(options: {
  ctx: HostContext
  /** The scheduler wake-up a projection frame asks for. */
  schedule(): void
  /** Close the picker's cards before the confirmation dialog opens. */
  dismiss(): void
  /** Hand the focus back to the picker's trigger once the dialog is gone. */
  restoreFocus(): void
  /** Whether the seat refuses selection changes right now (a model selection is in flight). */
  locked(): boolean
}) {
  const { ctx } = options
  const toast = createHostToast()
  let row: HTMLElement | null = null
  let switchEl: HTMLButtonElement | null = null
  let infoEl: HTMLButtonElement | null = null
  let infoTip: ReturnType<typeof hostTooltip> | null = null
  let dialogRoot: reactDom.Root | null = null
  let pending = false
  /** The session whose projections the row follows, and the undo of that subscription. */
  let followed: string | null = null
  let unfollow: Array<() => void> = []

  function faces(sessionId: string) {
    return sessionProjectionFaces(ctx, sessionId, PROJECTION_KEYS)
  }

  /** A child session keeps subagent navigation without a Team switch, as the host's row does. */
  function isChild(sessionId: string): boolean {
    const list = hostSessions(ctx)?.list.getSnapshot()
    return list?.byId[sessionId]?.origin === 'subagent'
  }

  /** The session and its saved selection, or null while the row has nothing to say. */
  function read(): { sessionId: string, enabled: boolean, started: boolean, ready: boolean } | null {
    const sessionId = currentSessionId(ctx)
    if (sessionId === null || isChild(sessionId)) return null
    const served = faces(sessionId)
    if (served === null) return null
    const team = served.agentTeam?.getSnapshot() as HostAgentTeamProjection | undefined
    if (team === undefined || team === null) return null
    const selection = served.modelSelection?.getSnapshot() as HostModelSelectionProjection | undefined
    return {
      sessionId,
      enabled: team.enabled === true,
      started: selection !== undefined && selection !== null && selection.lastUsed !== null,
      ready: selection !== undefined && selection !== null,
    }
  }

  /** Follow the shown session's two projections; a session switch moves the subscriptions with it. */
  function follow(sessionId: string | null) {
    if (sessionId === followed) return
    for (const undo of unfollow) undo()
    unfollow = []
    followed = sessionId
    if (sessionId === null) return
    const served = faces(sessionId)
    if (served === null) return
    for (const key of PROJECTION_KEYS) {
      const face: HostSnapshotSource<unknown> | undefined = served[key]
      if (face !== undefined) unfollow.push(face.subscribe(() => options.schedule()))
    }
  }

  function save(sessionId: string, enabled: boolean): Promise<string | null> {
    const teams = hostRemoteAgentTeams(ctx)
    if (teams === null) return Promise.resolve(copy('teamFailed', { message: 'agentTeams' }))
    return teams.setEnabled(sessionId, enabled).then(answer => answer.ok ? null : answer.error.message)
  }

  function change(sessionId: string, enabled: boolean, started: boolean) {
    if (!enabled && started) {
      options.dismiss()
      openDisableDialog(sessionId)
      return
    }
    pending = true
    refresh()
    save(sessionId, enabled).then(failure => {
      if (failure !== null) toast.show({ text: copy('teamFailed', { message: failure }) })
    }, (error: unknown) => {
      toast.show({ text: copy('teamFailed', { message: error instanceof Error ? error.message : String(error) }) })
    }).finally(() => {
      pending = false
      refresh()
    })
  }

  /** One confirmation keeps its failure visible until retry or cancellation. */
  function DisableDialog(props: { sessionId: string }) {
    const [state, setState] = React.useState<{ kind: 'ready' } | { kind: 'saving' } | { kind: 'failed', message: string }>({ kind: 'ready' })
    const saving = state.kind === 'saving'
    function cancel() {
      if (!saving) closeDisableDialog()
    }
    function confirm() {
      if (saving) return
      setState({ kind: 'saving' })
      save(props.sessionId, false).then(failure => {
        if (failure === null) closeDisableDialog()
        else setState({ kind: 'failed', message: failure })
      }, (error: unknown) => {
        setState({ kind: 'failed', message: error instanceof Error ? error.message : String(error) })
      })
    }
    return React.createElement(primitives.Modal, {
      open: true,
      title: copy('teamDisableTitle'),
      closeLabel: copy('teamDisableClose'),
      onClose: cancel,
      footer: React.createElement(
        React.Fragment,
        null,
        React.createElement(primitives.Button, { variant: 'outline', disabled: saving, ...MODAL_AUTOFOCUS, onClick: cancel }, copy('teamDisableCancel')),
        React.createElement(primitives.Button, { variant: 'primary', disabled: saving, onClick: confirm }, copy('teamDisableConfirm')),
      ),
    }, React.createElement(
      'div',
      null,
      React.createElement('p', null, copy('teamDisableDescription')),
      React.createElement('p', null, copy('teamDisableWarning')),
      state.kind === 'failed' ? React.createElement('p', { role: 'alert' }, copy('teamFailed', { message: state.message })) : null,
    ))
  }

  function openDisableDialog(sessionId: string) {
    if (dialogRoot === null) dialogRoot = reactDom.createRoot(document.createElement('div'))
    dialogRoot.render(React.createElement(DisableDialog, { sessionId, key: sessionId }))
  }

  function closeDisableDialog() {
    if (dialogRoot !== null) dialogRoot.render(null)
    options.restoreFocus()
  }

  function buildRow(): HTMLElement {
    const built = buildElement('div', 'dsh-claude-model-team')
    built.setAttribute('role', 'group')
    const label = buildElement('span', 'dsh-claude-model-team-label')
    label.appendChild(buildElement('span', 'dsh-claude-model-team-name'))
    const info = buildElement('button', 'dsh-claude-model-team-info')
    info.type = 'button'
    info.innerHTML = INFO_SVG
    info.addEventListener('click', event => { event.stopPropagation() })
    infoEl = info
    // The explanation stays on the host's own tooltip, so its words, delay and
    // placement are the ones the host's row has.
    infoTip = hostTooltip(info, '', { side: 'top', delayMs: 300 })
    label.appendChild(infoTip.node)
    built.appendChild(label)
    const toggle = buildElement('button', 'dsh-claude-model-team-switch')
    toggle.type = 'button'
    toggle.setAttribute('role', 'switch')
    toggle.appendChild(buildElement('span', 'dsh-claude-model-team-knob'))
    built.appendChild(toggle)
    switchEl = toggle
    // The whole row answers a press, the way the host's row does; the switch's
    // own press bubbles here, so one handler serves the keyboard and the pointer.
    built.addEventListener('click', event => {
      event.stopPropagation()
      const state = read()
      if (state === null || toggle.disabled) return
      change(state.sessionId, !state.enabled, state.started)
    })
    return built
  }

  /** Paint the row from the projections; it writes only what changed (D40). */
  function refresh() {
    const state = read()
    follow(state === null ? null : state.sessionId)
    if (row === null || switchEl === null || state === null) return
    const name = row.querySelector('.dsh-claude-model-team-name')
    if (name !== null && name.textContent !== copy('teamLabel')) name.textContent = copy('teamLabel')
    if (infoEl !== null) setAttributeIfChanged(infoEl, 'aria-label', copy('teamInfoLabel'))
    infoTip?.setLabel(copy('teamDescription'))
    setAttributeIfChanged(switchEl, 'aria-label', copy('teamLabel'))
    setAttributeIfChanged(switchEl, 'aria-checked', state.enabled ? 'true' : 'false')
    const disabled = options.locked() || pending || !state.ready
    if (switchEl.disabled !== disabled) switchEl.disabled = disabled
    row.toggleAttribute('data-on', state.enabled)
    row.toggleAttribute('data-disabled', disabled)
  }

  return {
    /** Whether the host serves a Team selection for the shown session. */
    available(): boolean {
      return read() !== null
    },
    /** The row for the picker's footer; one element serves every open. */
    row(): HTMLElement {
      if (row === null) row = buildRow()
      refresh()
      return row
    },
    refresh,
    dispose() {
      for (const undo of unfollow) undo()
      unfollow = []
      followed = null
      infoTip?.release()
      infoTip = null
      row?.remove()
      row = null
      switchEl = null
      infoEl = null
      toast.dispose()
      if (dialogRoot !== null) {
        dialogRoot.unmount()
        dialogRoot = null
      }
    },
  }
}
