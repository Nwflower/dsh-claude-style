import * as React from 'react'
import * as reactDom from 'react-dom/client'
import { CHAT_ANSWER_ROW_SELECTOR, FLOW_KIND_ATTRIBUTE, INHERITED_HISTORY_ROW_SELECTOR, MESSAGE_ACTION_ROW_ATTRIBUTE, ROW_PHASE_ATTRIBUTE, SESSION_ROW_SELECTOR, TURN_TAIL_SELECTOR, USER_ROW_KIND } from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { hostUiWorkspace, hostWorkspaces, findChatTarget } from '@dsh-claude-style/engine/host'
import type { HostUiWorkspaceService } from '@dsh-claude-style/contracts/services'
import type { RewindAction } from '@dsh-claude-style/contracts/session-rewind'
import type { FeatureUi } from '../../core/feature'
import { createHostToast } from '../../shared/host-toast'
import { ACTION_BUTTON_ATTRIBUTE, BUTTONS_SEAT_ATTRIBUTE, BUTTONS_SEAT_CLASS, MessageActionButtons } from './message-action-buttons'
import { copy } from './message-actions-copy'
import type manifest from './message-actions.manifest'
import { answerPromptOf, answerRowOf, readerMessageOf } from './message-cut'
import type { ReaderMessage } from './message-cut'
import { executeRewind, prepareRewind } from './rewind-client'
import { closeRewindDialogs, confirmRewind, openRevisionHistory } from './rewind-dialog'
import { applyForkArtifactVisibility, applyRevisionVisibility, clearRevisionVisibility, conversationFor, refreshConversations, rowSession, REVISIONS_CHANGED_EVENT } from './revision-history'

/**
 * 一条读者发出的消息：它下面那行控件补上「撤回」和「编辑」，与 Claude Code
 * 一致，这行控件只在指针落到消息上时显现。
 *
 * 这行控件是宿主自己画的（时钟与复制按钮），皮肤不另画一份：宿主在
 * `[data-clock]` 上标出控件行，在 `data-chat-flow-kind="user"` 上标出读者
 * 消息，样式表按这两个标记让每一行读者消息都只在悬停或聚焦时显现（宿主自己
 * 只对后面还跟着消息的那种行这样做）。撤回、编辑与版本历史按钮插进同一行，因此
 * 跟着一起显现，复制与时间也是同一个行为。
 *
 * 动作按钮画成宿主自己的按钮：标签走宿主的 Tooltip，与复制按钮是同一个组件，
 * 悬停时出来的提示因此同形同色（message-action-buttons.ts）。
 *
 * 四个动作共用确认计划（rewind-client.ts）：DSH 仍从消息前 fork，插件恢复
 * 目标检查点并把新旧 Session 收进同一条逻辑对话。侧边栏只显示活动版本，
 * 原 Session 一个事件都不动，可从版本历史打开（D105）。
 */

/** 读者消息的那一行（宿主标出的 kind）。 */
const USER_ROW_SELECTOR = `[${FLOW_KIND_ATTRIBUTE}="${USER_ROW_KIND}"]`
/** 控件行：宿主画在这一行里的时钟与复制按钮。 */
const ACTION_SEAT_SELECTOR = `${USER_ROW_SELECTOR} [${MESSAGE_ACTION_ROW_ATTRIBUTE}]`
const ANSWER_SEAT_SELECTOR = `${TURN_TAIL_SELECTOR} [${MESSAGE_ACTION_ROW_ATTRIBUTE}]`
const MESSAGE_SEATS_SELECTOR = `${ACTION_SEAT_SELECTOR}, ${ANSWER_SEAT_SELECTOR}`
/** 打开编辑框的那一行：样式表靠它藏起原来的气泡。 */
const EDITING_ATTRIBUTE = 'data-dsh-claude-message-editing'
const EDITOR_CLASS = 'dsh-claude-message-editor'
const EDITOR_INPUT_CLASS = 'dsh-claude-message-editor-input'
const EDITOR_ROW_CLASS = 'dsh-claude-message-editor-row'
const EDITOR_CANCEL_CLASS = 'dsh-claude-message-editor-cancel'
const EDITOR_SAVE_CLASS = 'dsh-claude-message-editor-save'

/** 一个控件行上我们插进去的按钮座：它的盒子与 React 根。 */
interface Seat {
  box: HTMLElement
  root: reactDom.Root
}

/** 正在编辑的那一行：它的根、它的输入框，以及它写回哪一行。 */
interface Editing {
  row: HTMLElement
  root: HTMLElement
  input: HTMLTextAreaElement
  cancel: HTMLButtonElement
  save: HTMLButtonElement
}

export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const toast = createHostToast()
  const seats = new Map<HTMLElement, Seat>()
  let editing: Editing | null = null
  let cancelFrame: (() => void) | null = null
  let released = false
  let pendingAction = false

  /** 一次写入等下一帧：宿主一批挂进来的是一整棵子树，逐条写会把那批拆碎。 */
  function queue(write: () => void) {
    if (released || cancelFrame !== null) return
    cancelFrame = requestFrame({
      write() {
        cancelFrame = null
        if (released) return
        write()
      },
    })
  }

  function closeEditor() {
    if (editing === null) return
    editing.row.removeAttribute(EDITING_ATTRIBUTE)
    editing.root.remove()
    editing = null
  }

  function dropSeat(actions: HTMLElement) {
    const seat = seats.get(actions)
    if (seat === undefined) return
    seat.root.unmount()
    seat.box.remove()
    seats.delete(actions)
  }

  /**
   * 一次动作的收尾：失败用宿主的提示告诉读者，就地停下。
   *
   * 这里没有别的上报通道 —— 分岔失败时页面什么也不会变，读者需要一个说法；
   * 提示只带走一句通用的话，具体原因留在控制台。
   */
  const report = (error: unknown) => {
    console.error('[dsh-claude-style] message-actions failed:', error)
    toast.show({ text: copy('failed') })
  }

  function run(action: () => unknown) {
    if (pendingAction) return
    try {
      const answer = action()
      if (answer instanceof Promise) {
        pendingAction = true
        answer.catch(report).finally(() => { pendingAction = false })
      }
    } catch (error) {
      report(error)
    }
  }

  /** 打开编辑框：同一时刻只开一个，另一行开着就先收回去。 */
  function openEditor(row: HTMLElement, line: HTMLElement) {
    const message = readerMessageOf(ctx, row)
    if (message === null) throw new Error('message-actions: the row no longer resolves to a message')
    if (message.open) {
      toast.show({ text: copy('running') })
      return
    }
    const host = line.parentElement
    if (host === null) throw new Error('message-actions: the action row stands without a message row')
    closeEditor()
    const root = buildElement('div', EDITOR_CLASS)
    const input = document.createElement('textarea')
    input.className = EDITOR_INPUT_CLASS
    input.value = message.text
    input.rows = Math.min(10, Math.max(2, message.text.split('\n').length))
    input.setAttribute('aria-label', copy('edit'))
    const buttons = buildElement('div', EDITOR_ROW_CLASS)
    const cancel = buildElement('button', EDITOR_CANCEL_CLASS, copy('cancel'))
    cancel.type = 'button'
    const save = buildElement('button', EDITOR_SAVE_CLASS, copy('save'))
    save.type = 'button'
    // 编辑的意思是把这条消息再发一次：文字清空了就没有可发的，读者得先写点什么。
    save.disabled = input.value.trim() === ''
    buttons.append(cancel, save)
    root.append(input, buttons)
    host.insertBefore(root, line)
    row.setAttribute(EDITING_ATTRIBUTE, '')
    editing = { row, root, input, cancel, save }
    input.addEventListener('input', () => {
      save.disabled = input.value.trim() === ''
    })
    cancel.addEventListener('click', (event) => {
      event.stopPropagation()
      closeEditor()
    })
    save.addEventListener('click', (event) => {
      event.stopPropagation()
      run(commitEditor)
    })
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeEditor()
        return
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        run(commitEditor)
      }
    })
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  }

  /** One confirmed plan drives all four actions; cancelling leaves the current Session and editor untouched. */
  async function confirmedRewind(message: ReaderMessage, text: string, send: boolean, action: RewindAction, success: string): Promise<boolean> {
    const plan = await prepareRewind(message)
    const choice = await confirmRewind(plan, action)
    if (choice === null) return false
    await executeRewind(ctx, message, plan, text, send, action, choice.restore)
    toast.show({ text: success })
    return true
  }

  /** 保存编辑：确认后在原消息位置继续；取消或失败时编辑框和文字都保留。 */
  async function commitEditor() {
    const current = editing
    if (current === null) return
    const text = current.input.value
    if (text.trim() === '') return
    const message = readerMessageOf(ctx, current.row)
    if (message === null) throw new Error('message-actions: the row no longer resolves to a message')
    if (await confirmedRewind(message, text, true, 'edit', copy('sent'))) closeEditor()
  }

  async function retractMessage(row: HTMLElement) {
    const message = readerMessageOf(ctx, row)
    if (message === null) throw new Error('message-actions: the row no longer resolves to a message')
    if (message.open) {
      toast.show({ text: copy('running') })
      return
    }
    if (await confirmedRewind(message, message.text, false, 'retract', copy('rewound'))) closeEditor()
  }

  /** An answer's prompt must still resolve to a settled turn when the press lands. */
  function actionableAnswer(row: HTMLElement) {
    const message = answerPromptOf(ctx, row)
    if (message === null) throw new Error('message-actions: the answer no longer resolves to its prompt')
    if (message.open) {
      toast.show({ text: copy('running') })
      return null
    }
    return message
  }

  async function rerunAnswer(row: HTMLElement) {
    const message = actionableAnswer(row)
    if (message === null || message.attachments) return
    if (await confirmedRewind(message, message.text, true, 'rerun', copy('reran'))) closeEditor()
  }

  async function deleteAnswer(row: HTMLElement) {
    const message = actionableAnswer(row)
    if (message === null) return
    if (await confirmedRewind(message, '', false, 'delete', copy('deleted'))) closeEditor()
  }

  /** 各按钮的动作：宿主重画一行时按钮跟着重画，动作本身读的是当时那一行。 */
  function handlersFor(row: HTMLElement, line: HTMLElement) {
    if (row.matches(CHAT_ANSWER_ROW_SELECTOR)) {
      const attachments = answerPromptOf(ctx, row)?.attachments === true
      return {
        ...(attachments ? {} : { rerun() { run(() => rerunAnswer(row)) } }),
        delete() { run(() => deleteAnswer(row)) },
      }
    }
    const message = readerMessageOf(ctx, row)
    const history = message === null ? undefined : conversationFor(message.sessionId)
    return {
      retract() {
        run(() => retractMessage(row))
      },
      edit() {
        run(() => openEditor(row, line))
      },
      ...(history === undefined || history.revisions.length < 2 ? {} : {
        history() {
          // Reading revisions is safe while the previous submission settles; it never forks or writes.
          try {
            openRevisionHistory(history, sessionId => {
              const archives = hostWorkspaces(ctx)
              const workspace = hostUiWorkspace(ctx) as HostUiWorkspaceService | null
              if (archives === null) throw new Error('message-actions: host workspaces service is unavailable')
              if (workspace === null || typeof workspace.openSession !== 'function') throw new Error('message-actions: host uiWorkspace.openSession is unavailable')
              // The dialog closes immediately; navigation errors surface through the same toast as every other action.
              void archives.unarchiveSession(sessionId).then(() => { workspace.openSession(sessionId) }).catch(report)
            })
          } catch (error) {
            report(error)
          }
        },
      }),
    }
  }

  function draw(seat: Seat, row: HTMLElement, line: HTMLElement) {
    const handlers = handlersFor(row, line)
    seat.root.render(React.createElement(MessageActionButtons, {
      labels: { retract: copy('retract'), edit: copy('edit'), rerun: copy('rerun'), delete: copy('delete'), history: copy('history') },
      handlers,
    }))
  }

  /** 给一个控件行补上动作按钮；已经有就不再写第二遍。 */
  function decorate(line: HTMLElement) {
    if (line.querySelector(`[${BUTTONS_SEAT_ATTRIBUTE}]`) !== null) return
    const answer = answerRowOf(line)
    const row = line.closest<HTMLElement>(USER_ROW_SELECTOR) ?? answer
    if (row === null) return
    if (answer !== null) {
      const message = answerPromptOf(ctx, answer)
      if (message === null || message.open) return
    } else {
      // 附件是浏览器为一次发送上传的草稿，撤回或编辑会丢掉它们。
      const message = readerMessageOf(ctx, row)
      if (message !== null && (message.text === '' || message.attachments)) return
    }
    const box = buildElement('span', BUTTONS_SEAT_CLASS)
    box.setAttribute(BUTTONS_SEAT_ATTRIBUTE, '')
    // 宿主在这一行里先画时间与复制；回答行的行尾是它的用量与时间。动作按钮排在
    // 那组信息之前，跟宿主的动作按钮同处一簇，数字与时间仍留在行尾。
    if (answer === null || line.lastElementChild === null) line.append(box)
    else line.insertBefore(box, line.lastElementChild)
    const seat: Seat = { box, root: reactDom.createRoot(box) }
    seats.set(line, seat)
    draw(seat, row, line)
  }

  /** 语言切换：按钮的提示与编辑框的文字跟着换。 */
  function relabel() {
    for (const line of seats.keys()) {
      const seat = seats.get(line)
      const row = line.closest<HTMLElement>(USER_ROW_SELECTOR)
      if (seat === undefined || row === null) continue
      draw(seat, row, line)
    }
    if (editing !== null) {
      editing.input.setAttribute('aria-label', copy('edit'))
      editing.cancel.textContent = copy('cancel')
      editing.save.textContent = copy('save')
    }
  }

  const seatsOnPage = observeMatches<HTMLElement>(MESSAGE_SEATS_SELECTOR, () => queue(sync))
  const sessionRows = observeMatches<HTMLElement>(SESSION_ROW_SELECTOR, () => queue(sync))
  const inheritedRows = observeMatches<HTMLElement>(INHERITED_HISTORY_ROW_SELECTOR, () => queue(sync))
  const turnTailRows = observeMatches<HTMLElement>(TURN_TAIL_SELECTOR, () => queue(sync))

  /**
   * 收尾行所属会话的快照订阅（D105）：分岔的收尾行先挂上页面，timeline 的
   * forked 结束晚一步才发布出来，隐藏判定在行挂载那一帧读到的还是空结束。
   * 宿主每发布一次快照就重新判定一次；行离开页面或换了会话，订阅随之摘下。
   * 按行: 订阅随行元素脱离文档丢弃，换会话时旧订阅先停下。
   */
  const snapshotFollows = new Map<HTMLElement, { sessionId: string, stop: () => void }>()

  function followTailSnapshot(row: HTMLElement) {
    const sessionId = rowSession(ctx, row)
    const target = sessionId === null ? null : findChatTarget(ctx, sessionId)
    const followed = snapshotFollows.get(row)
    if (sessionId === null || target === null || typeof target.subscribe !== 'function') {
      if (followed !== undefined) {
        followed.stop()
        snapshotFollows.delete(row)
      }
      return
    }
    if (followed !== undefined && followed.sessionId === sessionId) return
    followed?.stop()
    snapshotFollows.set(row, { sessionId, stop: target.subscribe(() => queue(sync)) })
  }

  function sync() {
    applyRevisionVisibility(sessionRows.all())
    const tails = turnTailRows.all()
    for (const row of tails) followTailSnapshot(row)
    for (const [row, followed] of snapshotFollows) {
      if (!row.isConnected) {
        followed.stop()
        snapshotFollows.delete(row)
      }
    }
    applyForkArtifactVisibility(ctx, inheritedRows.all(), tails)
    for (const line of seats.keys()) if (!line.isConnected) dropSeat(line)
    if (editing !== null && !editing.root.isConnected) {
      // 宿主重画了这一行，把编辑框一起换掉了：状态收回来，不留半开的行。
      editing.row.removeAttribute(EDITING_ATTRIBUTE)
      editing = null
    }
    for (const line of seatsOnPage.all()) {
      if (line.isConnected) decorate(line)
    }
  }

  /**
   * 宿主重画一行时可能只换掉我们的按钮而留下控件行，那种批次不会给匹配表带来
   * 新节点，所以另外看一层：收走的批次里出现我们的按钮，就再对齐一次。
   */
  const stopRemovals = subscribeMutations(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: [ROW_PHASE_ATTRIBUTE] }, (records) => {
    for (const record of records) {
      if (record.type === 'attributes') {
        queue(sync)
        continue
      }
      for (const node of record.removedNodes) {
        if (!(node instanceof Element)) continue
        if (node.matches(`[${BUTTONS_SEAT_ATTRIBUTE}]`) || node.querySelector(`[${ACTION_BUTTON_ATTRIBUTE}]`) !== null) {
          queue(sync)
          return
        }
      }
    }
  })

  function redrawHistoryButtons() {
    for (const [line, seat] of seats) {
      const answer = answerRowOf(line)
      const row = line.closest<HTMLElement>(USER_ROW_SELECTOR) ?? answer
      if (row !== null) draw(seat, row, line)
    }
    queue(sync)
  }
  const revisionsChanged = () => { queue(redrawHistoryButtons) }
  document.addEventListener(REVISIONS_CHANGED_EVENT, revisionsChanged)
  // Background metadata loading is isolated from installation; a failure is reported without uninstalling the row controls.
  void refreshConversations().catch(report)

  ui.messageActions = { onCopyChange: relabel }
  queue(sync)

  return () => {
    released = true
    delete ui.messageActions
    stopRemovals()
    document.removeEventListener(REVISIONS_CHANGED_EVENT, revisionsChanged)
    seatsOnPage.release()
    clearRevisionVisibility(sessionRows.all())
    clearRevisionVisibility(inheritedRows.all())
    clearRevisionVisibility(turnTailRows.all())
    for (const followed of snapshotFollows.values()) followed.stop()
    snapshotFollows.clear()
    inheritedRows.release()
    turnTailRows.release()
    sessionRows.release()
    closeRewindDialogs()
    if (cancelFrame !== null) cancelFrame()
    cancelFrame = null
    closeEditor()
    for (const line of [...seats.keys()]) dropSeat(line)
    toast.dispose()
  }
}
