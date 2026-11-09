import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import * as React from 'react'
import { CHAT_DIFF_MAX_LINES, CHAT_FILE_ADD_CLASS, CHAT_FILE_BODY_CLASS, CHAT_FILE_CHEVRON_CLASS, CHAT_FILE_DEL_CLASS, CHAT_FILE_DIFF_CLASS, CHAT_FILE_HIDDEN_CLASS, CHAT_FILE_INSPECT_CLASS, CHAT_FILE_IO_CLASS, CHAT_FILE_IO_DIVIDER_CLASS, CHAT_FILE_IO_LABEL_CLASS, CHAT_FILE_IO_SECTION_CLASS, CHAT_FILE_IO_TEXT_CLASS, CHAT_FILE_LEADING_CLASS, CHAT_FILE_LINK_CLASS, CHAT_FILE_MERGED_COPY, CHAT_FILE_MERGE_ATTR, CHAT_FILE_MERGE_GONE, CHAT_FILE_MERGE_HEAD, CHAT_FILE_MERGE_MEMBER, CHAT_FILE_OP_ATTR, CHAT_FILE_OP_CLASS, CHAT_FILE_OP_IN_CLASS, CHAT_FILE_OP_OUT_CLASS, CHAT_FILE_OP_SWAPPING_CLASS, CHAT_FILE_READ_CLASS, CHAT_FILE_ROLL_CLASS, CHAT_FILE_ROLL_DIGIT_CLASS, CHAT_FILE_ROLL_IN_CLASS, CHAT_FILE_ROLL_MOVING_CLASS, CHAT_FILE_ROLL_OUT_CLASS, CHAT_FILE_ROW_CLASS, CHAT_FILE_ROW_LINE_CLASS, CHAT_FILE_SEAT, CHAT_FILE_SEP_CLASS, CHAT_FILE_STAT_CLASS, CHAT_FILE_SUFFIX_CLASS, CHAT_FILE_TITLE_CLASS, CHAT_FILE_TITLE_SLOT_CLASS, CHAT_READ_MAX_LINES, chatFileCallHead, chatFileCallId, chatFileDiffBlockLabels, chatFileDiffHunks, chatFileOperationTitle, chatFileReadBlockLabels, chatFileReadCard, chatFileRowModel, chatFileShortenPath, chatFileStateLabel, chatFileSummaryClassName } from './file-row-model'
import { createFileMerge, rowCarrier } from './file-row-merge'
import { copy } from './copy'
import { callArgsOf } from '../../shared/call-args'
import { motionReduced } from '../../core/prefs'
import { createStamp } from '@dsh-claude-style/engine/dom'
import { motionMs } from '../../shared/motion'
import { fileToolOperation } from '../../shared/file-tool'
import type { FileReadCard, FileRowState } from './file-row-model'
import type { FileToolOperation } from '../../shared/file-tool'
import type { HostContext, HostFiber, HostText } from '@dsh-claude-style/engine/host'
import type { HostChatBlock } from '@dsh-claude-style/contracts/services'
import type { FeatureUi } from '../../core/feature'
import type manifest from './chat-files.manifest'
import { hostSlots } from '@dsh-claude-style/engine/host'

/** The seat's owner payload for a file tool row, plus the seat's copy. */
interface ChatFileRowProps {
  t: HostText
  toolName: string
  block: HostChatBlock
  cwd?: string
  home?: string
  openFile: (path: string) => void
  inspect?: () => void
  useDisclosure: () => { expanded: boolean, toggle: () => void }
}

/** How long one figure's turn takes: the roll the stylesheet's own animations run (D9). */
const ROLL_MS = motionMs('--dsh-claude-duration-roll')

/** How long one operation swap takes: the shared swap the block's classes play (shared/motion.css, D9). */
const SWAP_MS = motionMs('--dsh-claude-duration-swap')

/**
 * Render host file rows for reads, edits and writes, rebuilding chrome from
 * shared primitives and merging one file's calls per process group. Three keyed
 * seats are claimed together at priority -1; dsh-chat-ux yields this feature.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const h = React.createElement

  /** The rows of one file read together; one install owns one registry */
  const fileMerge = createFileMerge()

  /** Roll only changed digits in place; reduced motion drops the outgoing digit (D40). */
  const RollingStat = (props: { className: string, text: string, running: boolean }) => {
    const [leaving, setLeaving] = React.useState<string | null>(null)
    const shown = React.useRef(props.text)
    React.useLayoutEffect(() => {
      const before = shown.current
      if (before === props.text) return
      shown.current = props.text
      setLeaving(motionReduced() ? null : before)
    }, [props.text])
    // Timer, not animationend: no event arrives when the animation does not run.
    React.useEffect(() => {
      if (leaving === null) return
      const timer = window.setTimeout(() => setLeaving(null), ROLL_MS)
      return () => window.clearTimeout(timer)
    }, [leaving])
    return h(primitives.TextShimmer, {
      className: props.className + ' ' + CHAT_FILE_ROLL_CLASS,
      active: props.running,
      children: [...props.text].map((char, at) => {
        // A character the reader has not seen yet arrives from below with no
        // digit leaving it; a character whose own digit changed swaps the two.
        const before = leaving === null ? char : leaving[at] ?? null
        const moving = before !== char
        return h('span', {
          key: `${at}:${char}`,
          className: CHAT_FILE_ROLL_DIGIT_CLASS + (moving ? ' ' + CHAT_FILE_ROLL_MOVING_CLASS : ''),
        }, [
          moving && before !== null ? h('span', {
            key: 'out',
            className: CHAT_FILE_ROLL_OUT_CLASS,
            'aria-hidden': true,
          }, before) : null,
          h('span', { key: 'in', className: CHAT_FILE_ROLL_IN_CLASS }, char),
        ])
      }),
    })
  }

  /**
   * One row's render.
   * @param props - the owner payload and the seat's copy seat.
   * @returns this row.
   */
  const ChatFileRow = (props: ChatFileRowProps) => {
    const { t, toolName, block, cwd, home, openFile, inspect, useDisclosure } = props
    const { expanded, toggle } = useDisclosure()
    const rootRef = React.useRef<HTMLDivElement | null>(null)
    const args = React.useMemo(() => {
      const head = chatFileCallHead(block)
      return head === null ? null : callArgsOf(head.argsRaw)
    }, [block])
    const model = React.useMemo(() => chatFileRowModel(toolName, block, args, cwd, home), [args, block, cwd, home, toolName])
    const hunks = React.useMemo(() => chatFileDiffHunks(block, args), [args, block])
    const read = React.useMemo(() => (model.operation === 'read' ? chatFileReadCard(block, model.filePath) : null), [block, model.filePath, model.operation])
    const labels = React.useMemo(() => chatFileDiffBlockLabels(t), [t])
    const readLabels = React.useMemo(() => chatFileReadBlockLabels(t), [t])
    // The view this row's file asks for: null while it is not registered,
    // and a group of one call draws exactly what it drew before merging existed.
    const merge = React.useSyncExternalStore(fileMerge.subscribe, () => fileMerge.viewFor(rootRef.current))
    const merged = merge !== null && merge.count > 1
    // Only the row that stands draws the whole file; a row it stands for keeps
    // its own tail and card, which the reader never sees.
    const shownHunks = merged && merge.head ? merge.hunks : hunks
    // A file whose calls changed nothing has no tail: an all-read group draws the
    // file's window instead of a `+0 -0` that says nothing
    const changedHunks = shownHunks === null || shownHunks.length === 0 ? null : shownHunks
    // The operation the row wears: the file's last call once its calls are read
    // together, its own call otherwise.
    const operation = merged ? merge.operation : model.operation
    const shownRead = merged ? merge.read : read
    const state: FileRowState = merged && merge.running ? 'running' : model.state
    const running = state === 'running'
    const totals = React.useMemo(() => (changedHunks === null ? null : primitives.diffTotals(changedHunks)), [changedHunks])
    const expandable = shownHunks !== null || shownRead !== null || model.output !== null || model.bodyRaw !== null
    const open = expanded && expandable
    const summaryText = model.errorSummary ?? model.summary
    const status = chatFileStateLabel(state, t)
    // A failed or interrupted row carries no path link: in those two states
    // the summary holds a verdict or a failure, and a link would read it as a
    // normal change.
    const linkAvailable = model.filePath !== undefined && state !== 'error' && state !== 'stopped'

    // The file's work moving on: the label leaving and the one taking its place,
    // in one grid cell so the path beside them does not move sideways
    // (transitions.dev's "Text states swap"; D40 for the animation choice).
    const [swapFrom, setSwapFrom] = React.useState<FileToolOperation | null>(null)
    const shownOperation = React.useRef(operation)
    const labelRef = React.useRef<HTMLSpanElement | null>(null)
    React.useLayoutEffect(() => {
      const before = shownOperation.current
      if (before === operation) return
      shownOperation.current = operation
      setSwapFrom(motionReduced() ? null : before)
    }, [operation])
    // The animation's own end clears the swap; this covers the case where the
    // stylesheet's animation never runs, which would leave the label that left
    // stacked behind the new one.
    React.useEffect(() => {
      if (swapFrom === null) return
      const timer = window.setTimeout(() => setSwapFrom(null), SWAP_MS)
      return () => window.clearTimeout(timer)
    }, [swapFrom])

    // What this row tells the registry: a call with no path, or one that failed
    // or was interrupted, stands alone; a read joins with no hunks of its own, so
    // it shapes the operation the row wears without touching the numbers.
    const own = React.useMemo(() => model.filePath === undefined || (model.state !== 'ok' && model.state !== 'running')
      ? null
      : { path: model.filePath, operation: model.operation, hunks: hunks ?? [], state: model.state, read },
      [hunks, model.filePath, model.operation, model.state, read])
    React.useLayoutEffect(() => {
      const element = rootRef.current
      if (element === null || own === null) return
      // The host's id for this call: a row element it keeps for the file's next
      // call adds that call to the file's tail rather than losing the one before
      // it
      return fileMerge.put({ element, callId: chatFileCallId(block), ...own })
    }, [block, own])

    // A row the head stands for takes its box off the page: the carrier is the
    // box the host gave this call in its list, so the spacing around it goes too.
    const hidden = merged && !merge.head
    const carrier = React.useMemo(() => createStamp(CHAT_FILE_MERGE_ATTR), [])
    React.useLayoutEffect(() => {
      const element = rootRef.current
      carrier.mark(element === null || !hidden ? null : rowCarrier(element), CHAT_FILE_MERGE_GONE)
      return () => carrier.release()
    }, [carrier, hidden])

    const openFileClick = React.useCallback((event: React.MouseEvent) => {
      event.stopPropagation()
      if (model.filePath === undefined) return
      openFile(model.filePath)
    }, [model.filePath, openFile])
    // The path link is a button inside the row, and the whole row is also the
    // open and close target: Enter and space have to land on this button
    // without bubbling into the row's keydown.
    const linkKeyDown = React.useCallback((event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
    }, [])

    // The operation block: the read family browses its file, the two mutations
    // edit it. The block swaps whole while the file's work moves on.
    const opBlockClass = CHAT_FILE_OP_CLASS + (swapFrom === null ? '' : ' ' + CHAT_FILE_OP_SWAPPING_CLASS)
    const opIcon = (kind: FileToolOperation) => (kind === 'read'
      ? h(primitives.IconBrowseOutlineRegular, { size: 14 })
      : h(primitives.IconEditOutlineRegular, { size: 14 }))
    const opLabel = (kind: FileToolOperation) => h(primitives.TextShimmer, { active: running, children: t(chatFileOperationTitle(kind)) })
    const operationIcon = swapFrom === null
      ? h('span', { className: opBlockClass }, opIcon(operation))
      : h('span', { className: opBlockClass },
          h('span', { className: CHAT_FILE_OP_OUT_CLASS, 'aria-hidden': true }, opIcon(swapFrom)),
          h('span', { className: CHAT_FILE_OP_IN_CLASS }, opIcon(operation)))
    const operationLabel = h('span', { key: 'op', ref: labelRef, className: CHAT_FILE_TITLE_CLASS + ' ' + opBlockClass },
      swapFrom === null ? null : h('span', { className: CHAT_FILE_OP_OUT_CLASS, 'aria-hidden': true }, opLabel(swapFrom)),
      h('span', { className: CHAT_FILE_OP_IN_CLASS, onAnimationEnd: () => setSwapFrom(null) }, opLabel(operation)))

    const collapsedContent = [
      operationLabel,
      summaryText === '' ? null : h('span', { key: 'sep', className: CHAT_FILE_SEP_CLASS, 'aria-hidden': true }),
      summaryText === '' ? null : linkAvailable
        ? h('button', { key: 'path', type: 'button', className: CHAT_FILE_LINK_CLASS, onClick: openFileClick, onKeyDown: linkKeyDown },
            h(primitives.TextShimmer, { active: running, children: summaryText }))
        : h('span', { key: 'path', className: chatFileSummaryClassName(state) },
            h(primitives.TextShimmer, { active: running, children: summaryText })),
      totals === null ? null : h('span', { key: 'totals', className: CHAT_FILE_SUFFIX_CLASS },
        h(RollingStat, { key: 'add', className: CHAT_FILE_STAT_CLASS + ' ' + CHAT_FILE_ADD_CLASS, text: '+' + totals.added, running }),
        h(RollingStat, { key: 'del', className: CHAT_FILE_STAT_CLASS + ' ' + CHAT_FILE_DEL_CLASS, text: '-' + totals.removed, running })),
    ]

    const inputSection = model.bodyRaw === null ? null : h('div', { className: CHAT_FILE_IO_SECTION_CLASS },
      h('span', { className: CHAT_FILE_IO_LABEL_CLASS }, t('row.input')),
      h('span', { className: CHAT_FILE_IO_TEXT_CLASS }, model.bodyRaw))
    const outputSection = model.output === null ? null : h('div', { className: CHAT_FILE_IO_SECTION_CLASS },
      h('span', { className: CHAT_FILE_IO_LABEL_CLASS }, t('row.output')),
      h('span', { className: CHAT_FILE_IO_TEXT_CLASS, 'data-error': state === 'error' || undefined }, model.output))
    // The body follows the file's own work: its changes while it has any, the
    // window it was last read at while it has none, and the call's own IN and
    // OUT where neither is available.
    const expandedContent = open ? h('div', { className: CHAT_FILE_BODY_CLASS },
      changedHunks !== null
        ? h(primitives.DiffBlock, { diffs: changedHunks, labels, maxLines: CHAT_DIFF_MAX_LINES, className: CHAT_FILE_DIFF_CLASS })
        : shownRead !== null
          ? h(primitives.ReadBlock, {
              label: chatFileShortenPath(shownRead.path, cwd, home),
              lines: shownRead.lines,
              labels: readLabels,
              totalLines: shownRead.totalLines,
              lang: shownRead.lang,
              maxLines: CHAT_READ_MAX_LINES,
              className: CHAT_FILE_READ_CLASS,
            })
          : h('div', { className: CHAT_FILE_IO_CLASS },
              inputSection,
              model.bodyRaw !== null && model.output !== null ? h('span', { className: CHAT_FILE_IO_DIVIDER_CLASS, 'aria-hidden': true }) : null,
              outputSection),
      inspect === undefined ? null : h('button', { type: 'button', className: CHAT_FILE_INSPECT_CLASS, onClick: inspect },
        h(primitives.IconInspectOutlineRegular, null),
        t('row.inspect'))) : undefined

    return h('div', {
      ref: rootRef,
      className: CHAT_FILE_ROW_CLASS,
      'data-variant': operation,
      'data-tool': operation,
      'data-state': state,
      [CHAT_FILE_OP_ATTR]: operation,
      [CHAT_FILE_MERGE_ATTR]: merged ? (merge.head ? CHAT_FILE_MERGE_HEAD : CHAT_FILE_MERGE_MEMBER) : undefined,
    },
      status !== null ? h('span', { className: CHAT_FILE_HIDDEN_CLASS }, status) : null,
      // The rows this one stands for leave the page whole, so their calls are
      // said here: a reader who cannot see four rows is told there were four.
      merged ? h('span', { className: CHAT_FILE_HIDDEN_CLASS },
        copy(CHAT_FILE_MERGED_COPY, { count: merge.count })) : null,
      h(primitives.DisclosureRow, {
        rowClassName: CHAT_FILE_ROW_LINE_CLASS,
        leadingClassName: CHAT_FILE_LEADING_CLASS,
        // The host's own title slot stays empty: the operation's label is drawn
        // in the collapsed content, where it can hold both states of a swap.
        titleClassName: CHAT_FILE_TITLE_SLOT_CLASS,
        chevronClassName: CHAT_FILE_CHEVRON_CLASS,
        icon: operationIcon,
        title: '',
        running,
        open,
        expandable,
        expandOnRowClick: true,
        keepContentWhenOpen: true,
        onToggle: toggle,
        collapsedContent,
      }, expandedContent))
  }

  let slotsFiber: HostFiber | null = null
  if (typeof ctx.inject === 'function') {
    slotsFiber = ctx.inject(['slots'], scope => {
      const slots = hostSlots(scope)
      if (slots === undefined || slots === null || typeof slots.inject !== 'function') return
      /** The three keys' registrations, or null while they are not claimed. */
      let seatStops: (() => void) | null = null
      const claimSeats = () => {
        if (seatStops !== null) return
        const seat = { name: CHAT_FILE_SEAT, priority: -1, locale: 'conversation' }
        const stopEdit = slots.register({ ...seat, key: 'edit' }, ChatFileRow)
        const stopWrite = slots.register({ ...seat, key: 'write' }, ChatFileRow)
        // A read of a file is the third thing that touches one, and the row that
        // stands for the file wears whichever of the three came last
        const stopRead = slots.register({ ...seat, key: 'read' }, ChatFileRow)
        let stopped = false
        seatStops = () => {
          if (stopped) return
          stopped = true
          stopEdit()
          stopWrite()
          stopRead()
        }
      }
      const releaseSeats = () => {
        if (seatStops === null) return
        seatStops()
        seatStops = null
      }
      scope.effect(() => {
        // The seat is the host's to declare, so the keys wait for it.
        const stopSeat = slots.inject(CHAT_FILE_SEAT, () => {
          claimSeats()
          return releaseSeats
        })
        return () => {
          releaseSeats()
          if (typeof stopSeat === 'function') stopSeat()
        }
      }, 'dsh-claude-style: file change row')
    })
  }
  return () => {
    if (slotsFiber === null) return
    if (typeof slotsFiber.dispose === 'function') slotsFiber.dispose()
    slotsFiber = null
  }
}
