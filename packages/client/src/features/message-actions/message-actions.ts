import * as React from 'react'
import * as reactDom from 'react-dom/client'
import { CHAT_ANSWER_ROW_SELECTOR, FLOW_KIND_ATTRIBUTE, MESSAGE_ACTION_ROW_ATTRIBUTE, ROW_PHASE_ATTRIBUTE, TURN_TAIL_SELECTOR, USER_ROW_KIND } from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { createCopy } from '../../core/i18n'
import type { FeatureUi } from '../../core/feature'
import { createHostToast } from '../../shared/host-toast'
import { ACTION_BUTTON_ATTRIBUTE, BUTTONS_SEAT_ATTRIBUTE, BUTTONS_SEAT_CLASS, MessageActionButtons } from './message-action-buttons'
import COPY from './message-actions.copy.json'
import type manifest from './message-actions.manifest'
import { answerPromptOf, answerRowOf, readerMessageOf, rewindTo } from './message-cut'

const copy = createCopy(COPY)

/**
 * 一条读者发出的消息：它下面那行控件补上「撤回」和「编辑」，与 Claude Code
 * 一致，这行控件只在指针落到消息上时显现。
 *
 * 这行控件是宿主自己画的（时钟与复制按钮），皮肤不另画一份：宿主在
 * `[data-clock]` 上标出控件行，在 `data-chat-flow-kind="user"` 上标出读者
 * 消息，样式表按这两个标记让每一行读者消息都只在悬停或聚焦时显现（宿主自己
 * 只对后面还跟着消息的那种行这样做）。撤回与编辑这两个按钮插进同一行，因此
 * 跟着一起显现，复制与时间也是同一个行为。
 *
 * 两个按钮画成宿主自己的按钮：标签走宿主的 Tooltip，与复制按钮是同一个组件，
 * 悬停时出来的提示因此同形同色（message-action-buttons.ts）。
 *
 * 两个动作都走分岔（message-cut.ts）：宿主没有原地截断会话的接口，所以消息
 * 前一个事件处复制成新会话。撤回把原文放回新会话的输入框，等读者自己再发；
 * 编辑把改过的文字直接在里面发出去。原会话一个事件都不动，读者想回去看随时
 * 能回去。正式回答行的「重跑」与「删除此轮」也从那一轮的用户提问前分岔：
 * 重跑在新会话里提交原提问，删除只留下该轮之前的会话前缀。
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
  function run(action: () => unknown) {
    if (pendingAction) return
    const report = (error: unknown) => {
      console.error('[dsh-claude-style] message-actions failed:', error)
      toast.show({ text: copy('failed') })
    }
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

  /** 保存编辑：分岔到这条消息之前，把改过的文字在新会话里直接发出。 */
  async function commitEditor() {
    const current = editing
    if (current === null) return
    const text = current.input.value
    // 空文字不发：编辑框留着，读者补上内容再按一次。
    if (text.trim() === '') return
    const message = readerMessageOf(ctx, current.row)
    closeEditor()
    if (message === null) throw new Error('message-actions: the row no longer resolves to a message')
    await rewindTo(ctx, message, text, true)
    toast.show({ text: copy('sent') })
  }

  /** 撤回：分岔到这条消息之前，把原文放回新会话的输入框，等读者自己再发。 */
  async function retractMessage(row: HTMLElement) {
    const message = readerMessageOf(ctx, row)
    if (message === null) throw new Error('message-actions: the row no longer resolves to a message')
    if (message.open) {
      toast.show({ text: copy('running') })
      return
    }
    closeEditor()
    await rewindTo(ctx, message, message.text, false)
    toast.show({ text: copy('rewound') })
  }

  /** An answer's prompt must still resolve to a settled turn when the press lands. */
  function actionableAnswer(row: HTMLElement) {
    const message = answerPromptOf(ctx, row)
    if (message === null) throw new Error('message-actions: the answer no longer resolves to its prompt')
    if (message.open) {
      toast.show({ text: copy('running') })
      return null
    }
    closeEditor()
    return message
  }

  async function rerunAnswer(row: HTMLElement) {
    const message = actionableAnswer(row)
    if (message === null || message.attachments) return
    await rewindTo(ctx, message, message.text, true)
    toast.show({ text: copy('reran') })
  }

  async function deleteAnswer(row: HTMLElement) {
    const message = actionableAnswer(row)
    if (message === null) return
    await rewindTo(ctx, message, '', false)
    toast.show({ text: copy('deleted') })
  }

  /** 两个按钮的动作：宿主重画一行时按钮跟着重画，动作本身读的是当时那一行。 */
  function handlersFor(row: HTMLElement, line: HTMLElement) {
    if (row.matches(CHAT_ANSWER_ROW_SELECTOR)) {
      const attachments = answerPromptOf(ctx, row)?.attachments === true
      return {
        ...(attachments ? {} : { rerun() { run(() => rerunAnswer(row)) } }),
        delete() { run(() => deleteAnswer(row)) },
      }
    }
    return {
      retract() {
        run(() => retractMessage(row))
      },
      edit() {
        run(() => openEditor(row, line))
      },
    }
  }

  function draw(seat: Seat, row: HTMLElement, line: HTMLElement) {
    const handlers = handlersFor(row, line)
    seat.root.render(React.createElement(MessageActionButtons, {
      labels: { retract: copy('retract'), edit: copy('edit'), rerun: copy('rerun'), delete: copy('delete') },
      handlers,
    }))
  }

  /** 给一个控件行补上两个按钮；已经有就不再写第二遍。 */
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
    // 宿主在这一行里先画时间与复制；回答行的行尾是它的用量与时间。两个按钮排在
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

  function sync() {
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

  ui.messageActions = { onCopyChange: relabel }
  queue(sync)

  return () => {
    released = true
    delete ui.messageActions
    stopRemovals()
    seatsOnPage.release()
    if (cancelFrame !== null) cancelFrame()
    cancelFrame = null
    closeEditor()
    for (const line of [...seats.keys()]) dropSeat(line)
    toast.dispose()
  }
}
