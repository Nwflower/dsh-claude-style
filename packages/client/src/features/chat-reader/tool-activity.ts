import type { ToolArgs, ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { DiffHunk } from '@deepseek-ai/dsh-client-ui-primitives'
import { PartialArguments } from '@deepseek-ai/dsh-util-values'
import { readerCopy } from '../../core/i18n'

/**
 * What the reading view knows about one tool call (D57), ported from
 * dsh-better-display's tool-activity (MIT). Every argument is read through a
 * total reader over arguments that may still be streaming (callArgs), so
 * nothing here parses JSON.
 */

/** One root call in the reading flow, at the position its node holds. */
export interface ToolActivityEntry {
  kind: 'tool'
  key: string
  callId: string
  step: number
  order: number
  block: ToolCallBlock
}

export type ToolPhase = 'preparing' | 'running' | 'returned' | 'succeeded' | 'failed' | 'interrupted'
export type ToolCategory = 'write' | 'read' | 'terminal' | 'search' | 'web' | 'code' | 'other'

/** Argument fields that name the file a call works on. */
const PATH_FIELDS = ['file_path', 'path', 'filePath', 'filename']
/** Argument fields that carry the text a call is about to write. */
const NEW_TEXT_FIELDS = ['content', 'new_string', 'new_str', 'newText', 'file_text']
/** Argument fields that carry the text a call is about to replace. */
const OLD_TEXT_FIELDS = ['old_string', 'old_str', 'oldText']
/**
 * Only these tools change a file through their arguments. Several unrelated
 * tools take a `content` field (a memory note, a typed message), and reading it
 * as a file body would count lines for a call that changed nothing.
 */
const MUTATION_TOOLS = new Set(['write', 'edit', 'str_replace_editor'])

/** Readers built from a block's raw argument text, kept per block. */
const rawReaders = new WeakMap<ToolCallBlock, ToolArgs>()

/**
 * A call's arguments as a total reader. The 0.2.1 host hands one on the block
 * (`args`); the 0.2.0 line the desktop ships keeps only the raw text
 * (`call.argsRaw` on a result, `argsRaw` once a call started), which the
 * host's own reader views the same way.
 */
export function callArgs(block: ToolCallBlock): ToolArgs {
  // Typed as always present by the pinned host; absent on the 0.2.0 line.
  const given = block.args as ToolArgs | undefined
  if (given !== undefined) return given
  const known = rawReaders.get(block)
  if (known !== undefined) return known
  const raw = 'kind' in block ? block.call?.argsRaw : block.phase === 'start' ? block.argsRaw : undefined
  const reader = raw === undefined || raw === '' ? PartialArguments.EMPTY : PartialArguments.fromText(raw)
  rawReaders.set(block, reader)
  return reader
}

/** The first non-empty string among the fields, in the order given. */
export function argText(args: ToolArgs, fields: readonly string[]): string | undefined {
  for (const field of fields) {
    const value = args.text(field)
    if (value !== undefined && value !== '') return value
  }
  return undefined
}

/** A plain object, or null for anything else. */
export function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
}

/** The wire tool name; empty when the paired call left the loaded window. */
export function toolName(block: ToolCallBlock): string {
  return block.name || ('kind' in block ? block.call?.name ?? '' : '')
}

/** Exit code and signal of a finished terminal call, from its metadata or the host's result trailer. */
export function executionFacts(block: ToolCallBlock): { exitCode?: number, signal?: string } {
  if (!('kind' in block)) return {}
  const meta = objectValue(block.meta)
  const code = meta?.exitCode ?? meta?.exit_code
  const only = block.content.length === 1 ? block.content[0] : undefined
  const text = only !== undefined && only.type === 'text' ? only.text : ''
  const exit = /\n\[exit code: (\d+)\]$/.exec(text)
  const signal = /\n\[killed by signal: ([^\]\n]+)\]$/.exec(text)
  return {
    exitCode: typeof code === 'number' && Number.isFinite(code) ? code : exit === null ? undefined : Number(exit[1]),
    signal: typeof meta?.signal === 'string' && meta.signal !== '' ? meta.signal : signal?.[1],
  }
}

/** Where a call stands; an unfinished call of a closed turn was interrupted. */
export function activityPhase(block: ToolCallBlock, turnClosed = false): ToolPhase {
  if (!('kind' in block)) {
    if (turnClosed) return 'interrupted'
    return block.phase === 'preparing' ? 'preparing' : 'running'
  }
  if (block.error?.code === 'ABORTED' || block.error?.code === 'interrupted') return 'interrupted'
  const facts = executionFacts(block)
  const failed = block.isError || facts.signal !== undefined || (facts.exitCode !== undefined && facts.exitCode !== 0)
  if (failed || block.subCalls.some(child => activityPhase(child, turnClosed) === 'failed')) return 'failed'
  return facts.exitCode === 0 ? 'succeeded' : 'returned'
}

/** Lines of one side of a diff; a trailing newline does not start a line. */
function lineCount(text: string | null): number {
  if (text === null) return 0
  const body = text.endsWith('\n') ? text.slice(0, -1) : text
  return body === '' ? 0 : body.split('\n').length
}

/**
 * The files a call changed. The result's `meta.diffs` wins when the host
 * attached it; otherwise a mutation tool's own arguments say what it is about
 * to write. A parent call owns what its children changed, so nested calls add
 * their own hunks.
 */
export function callDiffHunks(block: ToolCallBlock): DiffHunk[] {
  const nested = block.subCalls.flatMap(callDiffHunks)
  const diffs = 'kind' in block ? objectValue(block.meta)?.diffs : undefined
  if (Array.isArray(diffs)) {
    const hunks: DiffHunk[] = []
    for (const raw of diffs) {
      const entry = objectValue(raw)
      if (entry === null) continue
      const oldText = typeof entry.oldText === 'string' ? entry.oldText : null
      const newText = typeof entry.newText === 'string' ? entry.newText : ''
      if (lineCount(newText) === 0 && lineCount(oldText) === 0) continue
      const path = PATH_FIELDS.map(field => entry[field]).find(value => typeof value === 'string' && value !== '')
      hunks.push({ path: typeof path === 'string' ? path : '', oldText, newText })
    }
    if (hunks.length > 0) return [...hunks, ...nested]
  }
  if (!MUTATION_TOOLS.has(toolName(block))) return nested
  const args = callArgs(block)
  const path = argText(args, PATH_FIELDS)
  if (path === undefined) return nested
  const oldText = argText(args, OLD_TEXT_FIELDS) ?? null
  const newText = argText(args, NEW_TEXT_FIELDS) ?? ''
  if (lineCount(newText) === 0 && lineCount(oldText) === 0) return nested
  return [{ path, oldText, newText }, ...nested]
}

/** The category a tool name falls in, which picks its title and its icon. */
export function toolCategory(name: string): ToolCategory {
  if (/^(write|edit|apply_patch|patch|str_replace_editor)$/.test(name)) return 'write'
  if (/^(read|read_file)$/.test(name)) return 'read'
  if (/^(bash|shell|terminal|terminal_send|exec_command|pwsh)$/.test(name)) return 'terminal'
  if (/^(grep|glob|find|search)$/.test(name)) return 'search'
  if (/^(web_search|web_fetch|web_open)$/.test(name)) return 'web'
  // A code interpreter runs a program: no file, no shell, no query.
  if (/^(run_code|execute_code|code_interpreter|python|node|eval|repl)$/.test(name)) return 'code'
  return 'other'
}

/** The last segment of a path. */
export function baseName(path: string): string {
  return path.split(/[/\\]/).at(-1) ?? path
}

/** What one call is about, read from its arguments as far as they have arrived. */
export function activitySummary(block: ToolCallBlock) {
  const name = toolName(block)
  const args = callArgs(block)
  const category = toolCategory(name)
  const target = argText(args, PATH_FIELDS)
  const command = argText(args, ['command', 'cmd', 'script'])
  const description = argText(args, ['description'])
  const file = target === undefined ? undefined : baseName(target)
  return {
    name,
    category,
    title: activityTitle(name, category, file, description),
    target: target ?? command ?? argText(args, ['query', 'pattern', 'url']),
    command,
    description,
    cwd: argText(args, ['workdir', 'cwd']),
  }
}

/** The row's title: what the call does, in the reader's language. */
function activityTitle(name: string, category: ToolCategory, file: string | undefined, description: string | undefined): string {
  switch (category) {
    case 'write':
      if (file !== undefined) return name === 'write' ? readerCopy('toolWriteFile', 'Write {file}', { file }) : readerCopy('toolEditFile', 'Edit {file}', { file })
      return name === 'apply_patch' ? readerCopy('toolPatch', 'Apply a patch') : readerCopy('toolEditAny', 'Edit a file')
    case 'read':
      return file === undefined ? readerCopy('toolReadAny', 'Read a file') : readerCopy('toolReadFile', 'Read {file}', { file })
    case 'terminal':
      return description ?? readerCopy('toolRunCommand', 'Run a command')
    case 'search':
      return name === 'glob' ? readerCopy('toolFindFiles', 'Find files') : readerCopy('toolSearchContent', 'Search content')
    case 'web':
      return name === 'web_search' ? readerCopy('toolSearchWeb', 'Search the web') : readerCopy('toolReadWeb', 'Read a web page')
    case 'code':
      return description ?? readerCopy('toolRunCode', 'Run code')
    case 'other':
      return name === '' ? readerCopy('toolUnnamed', 'Tool call') : name
  }
}

/** The label a call shows while its arguments are still arriving. */
export function preparingLabel(name: string): string {
  if (/^(write|edit|apply_patch)$/.test(name)) return readerCopy('toolPreparingFile', 'Writing the file content')
  if (/^(bash|shell|exec_command|pwsh)$/.test(name)) return readerCopy('toolPreparingCommand', 'Preparing the command')
  return readerCopy('toolPreparingInput', 'Preparing the tool input')
}

/**
 * Where a running call's clock counts from. The host stamps a running call's
 * head with the instant it began and a settled one with its call's time; a
 * result whose call left the loaded window carries no start.
 */
export function callStartTime(block: ToolCallBlock): number | null {
  return 'kind' in block ? block.callTime : block.time
}
