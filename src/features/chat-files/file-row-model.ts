import type { HostText } from '../../core/host'
import type { HostChatBlock } from '@dsh-claude-style/contracts/services'

/**
 * The file-change row's derivations, kept apart from its React component
 * (chat-files.ts): what a write or edit call is, which diff it shows, and how
 * a path or a failure reads.
 *
 * The host's own file row draws a diff card for a root call only — its
 * diff-card-model returns null the moment a block carries a parentCallId —
 * so the `+96 -0` tail appears on a directly called write or edit and not on
 * the sub-calls run_code dispatches. The skin wants exactly that other half,
 * so it derives the same model without that exclusion. The cost is stated
 * plainly: a sub-call persists no presentation metadata, so after it settles
 * there is nothing saying what was applied and only the arguments can speak —
 * a write's argument is the whole content (exact), an edit's is that pair of
 * replacements (which `replace_all`, or a write that failed, can put out of
 * step with what really happened).
 */

/** One change a file row draws: the file, the text replaced (null for a new file) and the text written. */
export interface FileHunk {
  path: string
  oldText: string | null
  newText: string
}

/** Where a file row's call stands. */
export type FileRowState = 'preparing' | 'running' | 'ok' | 'error' | 'stopped'

/** A call's parsed arguments. */
export type CallArgs = Record<string, unknown>

/** The row root. */
export const CHAT_FILE_ROW_CLASS = 'dsh-claude-file-root'
/** The disclosure row's own element: the hover highlight hangs here. */
export const CHAT_FILE_ROW_LINE_CLASS = 'dsh-claude-file-row'
/** The icon slot. */
export const CHAT_FILE_LEADING_CLASS = 'dsh-claude-file-leading'
/** The open and close chevron. */
export const CHAT_FILE_CHEVRON_CLASS = 'dsh-claude-file-chevron'
/** The title (edit or write). */
export const CHAT_FILE_TITLE_CLASS = 'dsh-claude-file-title'
/** The dot between the title and the summary. */
export const CHAT_FILE_SEP_CLASS = 'dsh-claude-file-sep'
/** The summary text. */
export const CHAT_FILE_SUMMARY_CLASS = 'dsh-claude-file-summary'
/** The failure colour on the summary. */
export const CHAT_FILE_ERROR_CLASS = 'dsh-claude-file-error'
/** The stopped colour on the summary. */
export const CHAT_FILE_STOPPED_CLASS = 'dsh-claude-file-stopped'
/** The clickable file path. */
export const CHAT_FILE_LINK_CLASS = 'dsh-claude-file-link'
/** The container of the small statistics tail. */
export const CHAT_FILE_SUFFIX_CLASS = 'dsh-claude-file-suffix'
/** The type size both statistics share. */
export const CHAT_FILE_STAT_CLASS = 'dsh-claude-file-stat'
/** The added count. */
export const CHAT_FILE_ADD_CLASS = 'dsh-claude-file-add'
/** The removed count. */
export const CHAT_FILE_DEL_CLASS = 'dsh-claude-file-del'
/** The expanded body. */
export const CHAT_FILE_BODY_CLASS = 'dsh-claude-file-body'
/** The diff card inside an expanded body. */
export const CHAT_FILE_DIFF_CLASS = 'dsh-claude-file-diff'
/** The IN/OUT card inside an expanded body. */
export const CHAT_FILE_IO_CLASS = 'dsh-claude-file-io'
/** One section of the IN/OUT card. */
export const CHAT_FILE_IO_SECTION_CLASS = 'dsh-claude-file-io-section'
/** The hairline between IN and OUT. */
export const CHAT_FILE_IO_DIVIDER_CLASS = 'dsh-claude-file-io-divider'
/** The IN and OUT side labels. */
export const CHAT_FILE_IO_LABEL_CLASS = 'dsh-claude-file-io-label'
/** The IN and OUT bodies. */
export const CHAT_FILE_IO_TEXT_CLASS = 'dsh-claude-file-io-text'
/** The trajectory entrance pill. */
export const CHAT_FILE_INSPECT_CLASS = 'dsh-claude-file-inspect'
/** The running state label only a screen reader reads. */
export const CHAT_FILE_HIDDEN_CLASS = 'dsh-claude-file-hidden'
/** The seat both file tools render through; the host's own rows sit at priority 0 and a keyed seat renders the lowest. */
export const CHAT_FILE_SEAT = 'tool.call.toolview'

/** A chat row shows this many lines before a diff card folds its middle; the host's own CHAT_DIFF_MAX_LINES. */
export const CHAT_DIFF_MAX_LINES = 9

/**
 * This row's call head: a settled call reads the one its result node brought
 * back, a running one its own arguments.
 */
export function chatFileCallHead(block: HostChatBlock): { name: string, argsRaw: string } | null {
  if ('kind' in block) return block.call ?? null
  if (block.phase !== 'start') return null
  return { name: block.name ?? '', argsRaw: block.argsRaw ?? '' }
}

/** Parse the raw argument JSON; null when it is cut off mid-stream or is not an object. */
export function chatFileParseArgs(argsRaw: string): CallArgs | null {
  let value: unknown
  try {
    value = JSON.parse(argsRaw)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as CallArgs
}

/** The first non-empty string field, in the order given. */
export function chatFilePickString(args: CallArgs, keys: string[]) {
  for (const key of keys) {
    const value = args[key]
    if (typeof value === 'string' && value !== '') return value
  }
  return undefined
}

/**
 * The optional sandbox escalation pair: a file-writing row draws its diff
 * only while the two are together and valid, and otherwise falls back to the
 * IN/OUT card — the host's own test.
 */
export function chatFileValidEscalation(args: CallArgs) {
  const permission = args.sandbox_permissions
  const justification = args.justification
  if (permission === undefined && justification === undefined) return true
  if (permission !== 'workspace-write' && permission !== 'danger-full-access') return false
  return typeof justification === 'string' && justification.trim() !== ''
}

/**
 * Shorten an absolute path into the shape a reader recognises: relative to
 * the session workspace first, then any leftover home prefix as `~`.
 */
export function chatFileShortenPath(path: string, cwd: string | undefined, home: string | undefined) {
  if (cwd !== undefined && cwd !== '' && path.startsWith(cwd)) {
    const rest = path.slice(cwd.length).replace(/^[\\/]+/, '')
    if (rest !== '') return rest
  }
  if (home !== undefined && home !== '' && path.startsWith(home)) {
    const rest = path.slice(home.length)
    if (rest === '' || rest.startsWith('/') || rest.startsWith('\\')) return '~' + rest.replace(/\\/g, '/')
  }
  return path
}

/** The first line of a piece of text. */
export function chatFileFirstLine(text: string) {
  const lineBreakAt = text.indexOf('\n')
  return lineBreakAt === -1 ? text : text.slice(0, lineBreakAt)
}

/**
 * Derive the change from the call's arguments: a write is the whole content,
 * an edit is that pair of replacements.
 */
export function chatFileIntendedHunks(name: string, args: CallArgs | null): FileHunk[] | null {
  if (args === null) return null
  const path = chatFilePickString(args, ['path', 'file_path'])
  if (path === undefined) return null
  if (!chatFileValidEscalation(args)) return null
  if (name === 'write') {
    const content = args.content
    return typeof content === 'string' ? [{ path, oldText: null, newText: content }] : null
  }
  if (name !== 'edit') return null
  const oldText = args.old_string
  const newText = args.new_string
  if (typeof oldText !== 'string' || typeof newText !== 'string') return null
  const replaceAll = args.replace_all
  if (replaceAll !== undefined && typeof replaceAll !== 'boolean') return null
  return [{ path, oldText: oldText === '' ? null : oldText, newText }]
}

/**
 * Read the hunks the result metadata says were really applied.
 * @returns the hunks, `empty` when the metadata says nothing changed, or null when it is unusable.
 */
export function chatFileAppliedHunks(meta: unknown): FileHunk[] | 'empty' | null {
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) return null
  // The tool's own metadata: it arrives as JSON, so every field is checked here.
  const diffs = (meta as { diffs?: unknown }).diffs
  if (!Array.isArray(diffs)) return null
  if (diffs.length === 0) return 'empty'
  const hunks: FileHunk[] = []
  for (const hunk of diffs) {
    if (typeof hunk !== 'object' || hunk === null) return null
    const { path, oldText, newText } = hunk as { path?: unknown, oldText?: unknown, newText?: unknown }
    if (typeof path !== 'string') return null
    if (oldText !== null && oldText !== undefined && typeof oldText !== 'string') return null
    if (typeof newText !== 'string') return null
    hunks.push({ path, oldText: oldText ?? null, newText })
  }
  return hunks
}

/**
 * Derive the change this row shows. One branch differs from the host's own
 * diff-card-model: sub-calls are not excluded. The rest keeps its order —
 * while a call is unsettled only its arguments are available, and once
 * settled the metadata's really-applied hunks win, with the arguments as the
 * fallback.
 * @returns the hunks to draw, or null when this row has none.
 */
export function chatFileDiffHunks(block: HostChatBlock, args: CallArgs | null) {
  if (!('kind' in block)) {
    if (block.phase === 'preparing') return null
    return chatFileIntendedHunks(block.name ?? '', args)
  }
  if (block.isError) return null
  const applied = chatFileAppliedHunks(block.meta)
  if (applied !== null && applied !== 'empty') return applied
  if (block.call === undefined || block.call === null) return null
  return chatFileIntendedHunks(block.call.name, args)
}

/**
 * Everything this row renders from.
 * @returns the row's model.
 */
export function chatFileRowModel(toolName: string, block: HostChatBlock, args: CallArgs | null, cwd: string | undefined, home: string | undefined) {
  const done = 'kind' in block
  const head = chatFileCallHead(block)
  const state: FileRowState = !done
    ? block.phase === 'preparing' ? 'preparing' : 'running'
    : block.error?.code === 'interrupted' ? 'stopped' : block.isError ? 'error' : 'ok'
  const path = args === null ? undefined : chatFilePickString(args, ['path', 'file_path'])
  const output = done ? chatFileResultText(block) || null : null
  return {
    titleKey: toolName === 'write' ? 'tool.title.write' : 'tool.title.edit',
    variant: toolName === 'write' ? 'write' : 'edit',
    summary: path === undefined ? '' : chatFileShortenPath(path, cwd, home),
    filePath: path,
    bodyRaw: head === null || head.argsRaw === '' ? null : head.argsRaw,
    output,
    errorSummary: state === 'error' && output !== null ? chatFileFirstLine(output) : null,
    state,
  }
}

/**
 * Flatten a settled result into display text: text blocks as they are, every
 * other block as JSON. A result with no content falls back to its error.
 */
export function chatFileResultText(node: HostChatBlock) {
  const parts: string[] = []
  for (const block of node.content ?? []) {
    if (block.type === 'text' && typeof block.text === 'string') {
      parts.push(block.text)
      continue
    }
    parts.push(JSON.stringify(block, null, 2))
  }
  if (parts.length === 0 && node.error !== undefined) parts.push(`${node.error.name ?? ''}: ${node.error.code ?? ''}`)
  return parts.join('\n')
}

/** The summary's class names: a failure and an interruption each carry their own state colour. */
export function chatFileSummaryClassName(state: FileRowState) {
  if (state === 'error') return CHAT_FILE_SUMMARY_CLASS + ' ' + CHAT_FILE_ERROR_CLASS
  if (state === 'stopped') return CHAT_FILE_SUMMARY_CLASS + ' ' + CHAT_FILE_STOPPED_CLASS
  return CHAT_FILE_SUMMARY_CLASS
}

/**
 * The state text for a screen reader: neither the icon nor the shimmer says
 * anything, so this sentence says it for them.
 * @returns the state text, or null when there is nothing to announce.
 */
export function chatFileStateLabel(state: FileRowState, t: HostText) {
  if (state === 'running') return t('row.running')
  if (state === 'error') return t('row.failed')
  if (state === 'stopped') return t('row.stopped')
  return null
}

/** Assemble the diff card's own chrome copy. */
export function chatFileDiffBlockLabels(t: HostText) {
  return {
    codeLabel: t('codeBlock.title'),
    wrapLabel: t('codeBlock.wrap'),
    unwrapLabel: t('codeBlock.unwrap'),
    copy: t('copy'),
    copied: t('copied'),
    collapseAria: t('diff.collapseAria'),
    expandAria: (hidden: number) => t('diff.expandAria', { count: hidden }),
    collapse: t('collapse'),
    expand: (hidden: number) => t('diff.expandRest', { count: hidden }),
  }
}
