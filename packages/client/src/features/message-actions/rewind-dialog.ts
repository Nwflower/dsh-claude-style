/** Host-modal confirmation and logical-revision history. */
import * as React from 'react'
import * as reactDom from 'react-dom/client'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ConversationRevision, LogicalConversation, RewindAction, RewindFile, RewindPlan } from '@dsh-claude-style/contracts/session-rewind'
import { copy } from './message-actions-copy'

/** Every open dialog's close. */
const openDialogs = new Set<() => void>()
/** Each open confirmation's dismissal, which answers it as cancelled. */
const openConfirmations = new Set<() => void>()

export function closeRewindDialogs(): void {
  dismissRewindConfirmations()
  for (const close of [...openDialogs]) close()
}

/** Close the open confirmations as cancelled, leaving revision history open: it writes nothing (D111). */
export function dismissRewindConfirmations(): void {
  for (const dismiss of [...openConfirmations]) dismiss()
}

function mount(render: (close: () => void) => React.ReactElement): () => void {
  const host = document.createElement('div')
  host.className = 'dsh-claude-rewind-host'
  document.body.append(host)
  const root = reactDom.createRoot(host)
  let released = false
  const close = () => {
    if (released) return
    released = true
    openDialogs.delete(close)
    queueMicrotask(() => {
      root.unmount()
      host.remove()
    })
  }
  openDialogs.add(close)
  root.render(render(close))
  return close
}

function actionName(action: ConversationRevision['action']): string {
  if (action === 'origin') return copy('originVersion')
  return copy(action)
}

function confirmationTitle(action: RewindAction): string {
  if (action === 'retract') return copy('retractConfirm')
  if (action === 'edit') return copy('editConfirm')
  if (action === 'rerun') return copy('rerunConfirm')
  return copy('deleteConfirm')
}

function fileStatus(status: RewindFile['status']): string {
  if (status === 'added') return copy('file-added')
  if (status === 'deleted') return copy('file-deleted')
  if (status === 'modified') return copy('file-modified')
  return copy('file-captured')
}

function formatRewindReason(reason: string): string {
  if (reason === 'missing-target') return copy('reasonMissingTarget')
  if (reason === 'incomplete-later') return copy('reasonIncompleteLater')
  if (reason === 'unrestorable-files') return copy('reasonUnrestorableFiles')
  if (reason === 'workspace-moved') return copy('reasonWorkspaceMoved')
  if (reason.startsWith('dirty-files-exceeded:')) {
    const [, count = '', limit = ''] = reason.split(':')
    return copy('reasonDirtyFilesExceeded', { count, limit })
  }
  if (reason.startsWith('snapshot-size-exceeded:')) {
    const [, limit = ''] = reason.split(':')
    return copy('reasonSnapshotSizeExceeded', { limit })
  }
  return reason
}

function RewindConfirmation(props: { plan: RewindPlan, action: RewindAction, close(choice: { restore: boolean } | null): void }) {
  const [restore, setRestore] = React.useState(props.plan.restoreAvailable && props.plan.files.length > 0)
  const turnCount = props.plan.laterTurns + 1
  const fileCount = props.plan.files.length
  const footer = React.createElement(React.Fragment, null,
    React.createElement('button', {
      type: 'button', className: 'dsh-claude-rewind-button', onClick: () => props.close(null), 'data-modal-autofocus': true,
    }, copy('cancel')),
    React.createElement('button', {
      type: 'button', className: 'dsh-claude-rewind-button dsh-claude-rewind-primary',
      onClick: () => props.close({ restore: restore && props.plan.restoreAvailable }),
    }, copy('confirmRewind')),
  )
  return React.createElement(Modal, {
    open: true,
    title: confirmationTitle(props.action),
    closeLabel: copy('close'),
    description: copy(turnCount === 1 ? 'rewindDescriptionOne' : 'rewindDescription', { count: turnCount }),
    onClose: () => props.close(null),
    className: 'dsh-claude-rewind-modal',
    contentClassName: 'dsh-claude-rewind-content',
    footer,
  },
    fileCount === 0 ? null : React.createElement('label', { className: 'dsh-claude-rewind-restore' },
      React.createElement('input', {
        type: 'checkbox', checked: restore, disabled: !props.plan.restoreAvailable,
        onChange: event => { setRestore(event.currentTarget.checked) },
      }),
      React.createElement('span', null, copy(fileCount === 1 ? 'restoreFilesOne' : 'restoreFiles', { count: fileCount })),
    ),
    !props.plan.restoreAvailable && props.plan.reason !== ''
      ? React.createElement('p', { className: 'dsh-claude-rewind-reason' }, copy('checkpointUnavailable', { reason: formatRewindReason(props.plan.reason) }))
      : null,
    props.plan.files.length === 0 ? null : React.createElement('ul', { className: 'dsh-claude-rewind-files' },
      props.plan.files.map(file => React.createElement('li', { key: file.status + ':' + file.path },
        React.createElement('span', { className: 'dsh-claude-rewind-file-status' }, fileStatus(file.status)),
        React.createElement('span', { className: 'dsh-claude-rewind-file-path' }, file.path),
      )),
    ),
    React.createElement('p', { className: 'dsh-claude-rewind-note' }, copy('rewindSideEffects')),
  )
}

export function confirmRewind(plan: RewindPlan, action: RewindAction): Promise<{ restore: boolean } | null> {
  return new Promise(resolve => {
    let settled = false
    const settle = (choice: { restore: boolean } | null) => {
      if (settled) return
      settled = true
      openConfirmations.delete(dismiss)
      resolve(choice)
    }
    const close = mount(closeDialog => React.createElement(RewindConfirmation, {
      plan,
      action,
      close(choice) {
        settle(choice)
        closeDialog()
      },
    }))
    const dismiss = () => {
      settle(null)
      close()
    }
    openConfirmations.add(dismiss)
  })
}

function RevisionHistory(props: { conversation: LogicalConversation, open(sessionId: string): void, close(): void }) {
  const revisions = props.conversation.revisions
    .map((revision, index) => ({ revision, index }))
    .sort((left, right) => right.revision.createdAt - left.revision.createdAt || right.index - left.index)
    .map(entry => entry.revision)
  return React.createElement(Modal, {
    open: true,
    title: copy('historyTitle'),
    closeLabel: copy('close'),
    description: copy('historyDescription'),
    onClose: props.close,
    className: 'dsh-claude-rewind-modal dsh-claude-history-modal',
    contentClassName: 'dsh-claude-rewind-content',
  }, React.createElement('ul', { className: 'dsh-claude-history-list' }, revisions.map(revision =>
    React.createElement('li', { key: revision.sessionId, className: 'dsh-claude-history-item' },
      React.createElement('div', { className: 'dsh-claude-history-copy' },
        React.createElement('strong', null, actionName(revision.action)),
        React.createElement('span', null, new Date(revision.createdAt).toLocaleString()),
        React.createElement('small', null, revision.sessionId),
      ),
      revision.sessionId === props.conversation.activeSessionId
        ? React.createElement('span', { className: 'dsh-claude-history-current' }, copy('currentVersion'))
        : React.createElement('button', {
            type: 'button', className: 'dsh-claude-rewind-button', disabled: revision.status === 'failed' || revision.missing === true,
            onClick: () => { props.open(revision.sessionId); props.close() },
          }, copy(revision.archived === true ? 'unarchiveOpen' : 'openVersion')),
    ),
  )))
}

export function openRevisionHistory(conversation: LogicalConversation, open: (sessionId: string) => void): void {
  mount(close => React.createElement(RevisionHistory, { conversation, open, close }))
}
