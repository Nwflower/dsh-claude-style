import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import * as React from 'react'
import { CHAT_DIFF_MAX_LINES, CHAT_FILE_ADD_CLASS, CHAT_FILE_BODY_CLASS, CHAT_FILE_CHEVRON_CLASS, CHAT_FILE_DEL_CLASS, CHAT_FILE_DIFF_CLASS, CHAT_FILE_HIDDEN_CLASS, CHAT_FILE_INSPECT_CLASS, CHAT_FILE_IO_CLASS, CHAT_FILE_IO_DIVIDER_CLASS, CHAT_FILE_IO_LABEL_CLASS, CHAT_FILE_IO_SECTION_CLASS, CHAT_FILE_IO_TEXT_CLASS, CHAT_FILE_LEADING_CLASS, CHAT_FILE_LINK_CLASS, CHAT_FILE_ROW_CLASS, CHAT_FILE_ROW_LINE_CLASS, CHAT_FILE_SEAT, CHAT_FILE_SEP_CLASS, CHAT_FILE_STAT_CLASS, CHAT_FILE_SUFFIX_CLASS, CHAT_FILE_TITLE_CLASS, chatFileCallHead, chatFileDiffBlockLabels, chatFileDiffHunks, chatFileParseArgs, chatFileRowModel, chatFileStateLabel, chatFileSummaryClassName } from './file-row-model'
import type { HostContext, HostFiber, HostText, HostValue } from '../../core/host'
import type { Ui } from '../../core/scheduler'

/** The seat's owner payload for a file tool row, plus the seat's copy. */
interface ChatFileRowProps {
  t: HostText
  toolName: string
  block: HostValue
  cwd?: string
  home?: string
  openFile: (path: string) => void
  inspect?: () => void
  useDisclosure: () => { expanded: boolean, toggle: () => void }
}

/**
 * The file-change row: a write or edit call rendered as the host's own file
 * row, with the diff card the host draws for root calls only.
 *
 * The row takes the seat's owner payload and the seat's own `t` seat, and
 * renders collapsed as the title, the path and the `+n -m` tail, expanded as
 * the diff card. The host's own rows are the two keyed seats at the default
 * priority 0, and a keyed seat renders the lowest priority, so both are taken
 * over at priority -1; a second registration at one priority throws, so the
 * two keys are claimed together.
 *
 * The host's ToolRow component and its CSS Modules names are not part of the
 * frozen primitives table, so the chrome is redrawn here from the primitives
 * that are shared (DisclosureRow, TextShimmer, DiffBlock, diffTotals); the
 * row's own sizes and rhythm are in chat-files.css.
 *
 * dsh-chat-ux claims the same two keys on the same seat at the same priority,
 * and a second registration at one priority throws, so the entry keeps this
 * feature uninstalled while that plugin is on the page and installs it when
 * the plugin goes (the manifest).
 *
 * @param ctx - client context.
 * @param ui - shared handle table.
 * @returns teardown.
 */
export function install(ctx: HostContext, ui: Ui) {
  const h = React.createElement

  /**
   * One row's render.
   * @param props - the owner payload and the seat's copy seat.
   * @returns this row.
   */
  const ChatFileRow = (props: ChatFileRowProps) => {
    const { t, toolName, block, cwd, home, openFile, inspect, useDisclosure } = props
    const { expanded, toggle } = useDisclosure()
    const args = React.useMemo(() => {
      const head = chatFileCallHead(block)
      return head === null ? null : chatFileParseArgs(head.argsRaw)
    }, [block])
    const model = React.useMemo(() => chatFileRowModel(toolName, block, args, cwd, home), [args, block, cwd, home, toolName])
    const hunks = React.useMemo(() => chatFileDiffHunks(block, args), [args, block])
    const labels = React.useMemo(() => chatFileDiffBlockLabels(t), [t])
    const running = model.state === 'running'
    const totals = React.useMemo(() => (hunks === null ? null : primitives.diffTotals(hunks)), [hunks])
    const expandable = hunks !== null || model.output !== null || model.bodyRaw !== null
    const open = expanded && expandable
    const summaryText = model.errorSummary ?? model.summary
    const status = chatFileStateLabel(model.state, t)
    // A failed or interrupted row carries no path link: in those two states
    // the summary holds a verdict or a failure, and a link would read it as a
    // normal change.
    const linkAvailable = model.filePath !== undefined && model.state !== 'error' && model.state !== 'stopped'

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

    const collapsedContent = summaryText === '' ? null : [
      h('span', { key: 'sep', className: CHAT_FILE_SEP_CLASS, 'aria-hidden': true }),
      linkAvailable
        ? h('button', { key: 'path', type: 'button', className: CHAT_FILE_LINK_CLASS, onClick: openFileClick, onKeyDown: linkKeyDown },
            h(primitives.TextShimmer, { active: running, children: summaryText }))
        : h('span', { key: 'path', className: chatFileSummaryClassName(model.state) },
            h(primitives.TextShimmer, { active: running, children: summaryText })),
      totals === null ? null : h('span', { key: 'totals', className: CHAT_FILE_SUFFIX_CLASS },
        h(primitives.TextShimmer, { className: CHAT_FILE_STAT_CLASS + ' ' + CHAT_FILE_ADD_CLASS, active: running, children: '+' + totals.added }),
        h(primitives.TextShimmer, { className: CHAT_FILE_STAT_CLASS + ' ' + CHAT_FILE_DEL_CLASS, active: running, children: '-' + totals.removed })),
    ]

    const inputSection = model.bodyRaw === null ? null : h('div', { className: CHAT_FILE_IO_SECTION_CLASS },
      h('span', { className: CHAT_FILE_IO_LABEL_CLASS }, t('row.input')),
      h('span', { className: CHAT_FILE_IO_TEXT_CLASS }, model.bodyRaw))
    const outputSection = model.output === null ? null : h('div', { className: CHAT_FILE_IO_SECTION_CLASS },
      h('span', { className: CHAT_FILE_IO_LABEL_CLASS }, t('row.output')),
      h('span', { className: CHAT_FILE_IO_TEXT_CLASS, 'data-error': model.state === 'error' || undefined }, model.output))
    const expandedContent = open ? h('div', { className: CHAT_FILE_BODY_CLASS },
      hunks !== null
        ? h(primitives.DiffBlock, { diffs: hunks, labels, maxLines: CHAT_DIFF_MAX_LINES, className: CHAT_FILE_DIFF_CLASS })
        : h('div', { className: CHAT_FILE_IO_CLASS },
            inputSection,
            model.bodyRaw !== null && model.output !== null ? h('span', { className: CHAT_FILE_IO_DIVIDER_CLASS, 'aria-hidden': true }) : null,
            outputSection),
      inspect === undefined ? null : h('button', { type: 'button', className: CHAT_FILE_INSPECT_CLASS, onClick: inspect },
        h(primitives.IconInspectOutlineRegular, null),
        t('row.inspect'))) : undefined

    return h('div', { className: CHAT_FILE_ROW_CLASS, 'data-variant': model.variant, 'data-tool': toolName, 'data-state': model.state },
      status !== null ? h('span', { className: CHAT_FILE_HIDDEN_CLASS }, status) : null,
      h(primitives.DisclosureRow, {
        rowClassName: CHAT_FILE_ROW_LINE_CLASS,
        leadingClassName: CHAT_FILE_LEADING_CLASS,
        titleClassName: CHAT_FILE_TITLE_CLASS,
        chevronClassName: CHAT_FILE_CHEVRON_CLASS,
        icon: h(primitives.IconEditOutlineRegular, { size: 14 }),
        title: t(model.titleKey),
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
      const slots = scope.get('slots')
      if (slots === undefined || slots === null || typeof slots.inject !== 'function') return
      /** The two keys' registrations, or null while they are not claimed. */
      let seatStops: (() => void) | null = null
      const claimSeats = () => {
        if (seatStops !== null) return
        const seat = { name: CHAT_FILE_SEAT, priority: -1, locale: 'conversation' }
        const stopEdit = slots.register({ ...seat, key: 'edit' }, ChatFileRow)
        const stopWrite = slots.register({ ...seat, key: 'write' }, ChatFileRow)
        let stopped = false
        seatStops = () => {
          if (stopped) return
          stopped = true
          stopEdit()
          stopWrite()
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
