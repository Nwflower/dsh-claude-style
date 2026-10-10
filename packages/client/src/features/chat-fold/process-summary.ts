import { QUIET_ATTR } from '../../constants'
import { observeSize, subscribeMutations } from '../../core/bus'
import { requestFrame } from '../../core/frame'
import { copyLabel } from '../../core/i18n'
import { motionReduced } from '../../core/prefs'
import { buildElement } from '../../shared/dom'
import { ASSISTANT_STEP_KIND, CHAT_GROUP_PART_ATTRIBUTE, CHAT_GROUP_PART_REASONING, FLOW_KIND_ATTRIBUTE, PROCESS_ACTIVITY_SELECTOR, PROCESS_CONTENT_SELECTOR, PROCESS_GROUP_SELECTOR, SHIMMER_ATTRIBUTE, SHIMMER_LEGACY_ATTRIBUTE, SHIMMER_SELECTOR, TOOL_CALL_KIND } from '@dsh-claude-style/contracts/dom'

/**
 * A process group's header names what the group holds — 「执行 2 次思考，调用 1 次
 * 工具」 — in place of the host's list of activities (「执行了命令，已读取文件，
 * 已调用工具等」), each number rolling as the work grows. A header without the
 * room for the sentence falls back to the compact figures (`思考×2 · 工具×1`),
 * the wording dsh-better-display's fold summary uses (MIT).
 *
 * The host keeps its header and its words: the summary is a span of the skin's
 * own at the end of the control, marked quiet so writing it wakes no pass, and
 * the stylesheet hides the host's words while it stands (fold.css). The header's
 * accessible name is the sentence, since the summary itself is hidden from the
 * accessibility tree and the host's words are hidden from view.
 */

/** The four figures, in the order the summary reads them. */
export type ProcessFigure = 'thinking' | 'output' | 'tool' | 'record'
export type ProcessCounts = Record<ProcessFigure, number>
/** The two wordings: the sentence, and the compact one a narrow header falls back to. */
export type SummaryForm = 'full' | 'compact'

const FIGURES: readonly ProcessFigure[] = ['thinking', 'output', 'tool', 'record']

/** One copied string: the document's key and the English the bundle carries when it cannot be read. */
interface CopyText { key: string, fallback: string }

/**
 * Each figure's words. The sentence names the act and its count, and English
 * spells one and several differently — the host's own dictionaries carry the
 * same `.one` / `.other` pair (message.turnProcess.toolCalls).
 */
const FIGURE_COPY: Record<ProcessFigure, { full: { one: CopyText, other: CopyText }, compact: CopyText }> = {
  thinking: {
    full: {
      one: { key: 'processSummaryFullThoughtOne', fallback: '{count} thought' },
      other: { key: 'processSummaryFullThoughtOther', fallback: '{count} thoughts' },
    },
    compact: { key: 'processSummaryThinking', fallback: 'Thinking×{count}' },
  },
  output: {
    full: {
      one: { key: 'processSummaryFullOutputOne', fallback: '{count} output' },
      other: { key: 'processSummaryFullOutputOther', fallback: '{count} outputs' },
    },
    compact: { key: 'processSummaryOutput', fallback: 'Output×{count}' },
  },
  tool: {
    full: {
      one: { key: 'processSummaryFullToolOne', fallback: '{count} tool call' },
      other: { key: 'processSummaryFullToolOther', fallback: '{count} tool calls' },
    },
    compact: { key: 'processSummaryTool', fallback: 'Tools×{count}' },
  },
  record: {
    full: {
      one: { key: 'processSummaryFullRecordOne', fallback: '{count} record' },
      other: { key: 'processSummaryFullRecordOther', fallback: '{count} records' },
    },
    compact: { key: 'processSummaryRecord', fallback: 'Records×{count}' },
  },
}

/** The sentence's separator; the compact figures keep the host's own (message.turnProcess.separator). */
const FULL_SEPARATOR = () => copyLabel('processSummaryFullSeparator', ', ')
const COMPACT_SEPARATOR = ' · '
/** On a group root while its header shows the summary; the stylesheet hides the host's words under it. */
export const PROCESS_SUMMARY_ATTR = 'data-dsh-claude-summary'
/** On the summary while the group's section still runs: the stylesheet sweeps it the way the host sweeps its words. */
export const PROCESS_SUMMARY_RUNNING_ATTR = 'data-dsh-claude-summary-running'
/** On the summary: the wording it stands in. */
export const PROCESS_SUMMARY_FORM_ATTR = 'data-dsh-claude-summary-form'
/** On a rolling digit: `enter` rises into place, `exit` leaves upward, `settled` stands. */
const ROLL_ATTR = 'data-dsh-claude-roll'
/** How long a digit takes to roll, as the stylesheet's animations run it. */
const ROLL_MS = 160
const SUMMARY_CLASS = 'dsh-claude-process-summary'
/** The hidden span holding the sentence, whose natural width tells whether the header has room for it. */
const FIT_CLASS = 'dsh-claude-process-summary-fit'

/**
 * What one group holds: its body's own rows, a thought or an output by the step
 * part they carry, a tool call, and anything else (a command, a record). A tool
 * row's inner calls are its own business and are not rows of the body.
 */
export function countProcessItems(content: Element): ProcessCounts {
  const counts: ProcessCounts = { thinking: 0, output: 0, tool: 0, record: 0 }
  for (const row of content.children) {
    const kind = row.getAttribute(FLOW_KIND_ATTRIBUTE)
    if (kind === null) continue
    if (kind === ASSISTANT_STEP_KIND) {
      if (row.getAttribute(CHAT_GROUP_PART_ATTRIBUTE) === CHAT_GROUP_PART_REASONING) counts.thinking += 1
      else counts.output += 1
    } else if (kind === TOOL_CALL_KIND) counts.tool += 1
    else counts.record += 1
  }
  return counts
}

/** One figure's words in one form, the count standing where `{count}` is. */
export function figureWords(figure: ProcessFigure, form: SummaryForm, count: number) {
  const copy = FIGURE_COPY[figure]
  if (form === 'compact') return copyLabel(copy.compact.key, copy.compact.fallback)
  const chosen = count === 1 ? copy.full.one : copy.full.other
  return copyLabel(chosen.key, chosen.fallback)
}

/** The separator between two figures of one form. */
export function summarySeparator(form: SummaryForm) {
  return form === 'full' ? FULL_SEPARATOR() : COMPACT_SEPARATOR
}

/**
 * Which wording fits: the sentence while its natural width is within what the
 * header has for it, the compact figures otherwise.
 */
export function summaryForm(naturalWidth: number, availableWidth: number): SummaryForm {
  return naturalWidth <= availableWidth ? 'full' : 'compact'
}

/** One figure of the summary: the words around its count. */
export interface SummaryPart {
  figure: ProcessFigure
  before: string
  count: number
  after: string
}

/** The figures a group shows, the empty ones left out; none for a group with nothing counted. */
export function summaryParts(counts: ProcessCounts, form: SummaryForm): SummaryPart[] {
  const parts: SummaryPart[] = []
  for (const figure of FIGURES) {
    if (counts[figure] === 0) continue
    const template = figureWords(figure, form, counts[figure])
    const at = template.indexOf('{count}')
    parts.push(at < 0
      ? { figure, before: template, count: counts[figure], after: '' }
      : { figure, before: template.slice(0, at), count: counts[figure], after: template.slice(at + '{count}'.length) })
  }
  return parts
}

/** One form's line of text, for the header's name and the fit measurement. */
export function summaryText(parts: readonly SummaryPart[], form: SummaryForm) {
  const separator = summarySeparator(form)
  let text = ''
  parts.forEach((part, at) => {
    text += `${at === 0 ? '' : separator}${part.before}${part.count}${part.after}`
  })
  return text
}

/** What one group says: the figures in both wordings, and the sentence for the name. */
interface SummaryReading {
  full: SummaryPart[]
  compact: SummaryPart[]
  name: string
}

/**
 * Watch every process group on the page and keep its header's summary in step
 * with what the group holds, in the wording the header has room for.
 *
 * @returns teardown: the summaries, the marks and the names go, and the host's words come back.
 */
export function createProcessSummary() {
  /** Each summarised header: the name written there, and the size watch on its summary. */
  const named = new Map<HTMLElement, { name: string, unwatch: () => void }>()
  /** The digits still leaving, so a teardown or a quick second change can finish them. */
  const leaving = new Map<HTMLElement, number>()
  /** The groups waiting for the next frame. */
  const pending = new Set<Element>()
  let queued = false

  /** One figure's count, rolled from the one it showed. */
  function setCount(roll: HTMLElement, count: number) {
    const text = String(count)
    const current = roll.querySelector<HTMLElement>(`[${ROLL_ATTR}]:not([${ROLL_ATTR}="exit"])`)
    if (current !== null && current.textContent === text) return
    const sizer = roll.firstElementChild as HTMLElement
    sizer.textContent = text
    const animate = current !== null && !motionReduced()
    if (current !== null) {
      if (animate) {
        current.setAttribute(ROLL_ATTR, 'exit')
        leaving.set(current, window.setTimeout(() => {
          leaving.delete(current)
          current.remove()
        }, ROLL_MS))
      } else current.remove()
    }
    const digit = buildElement('span', 'dsh-claude-process-summary-digit', text)
    digit.setAttribute(ROLL_ATTR, animate ? 'enter' : 'settled')
    roll.appendChild(digit)
  }

  /** The summary span of one header, its hidden measurement standing inside it. */
  function summaryOf(header: HTMLElement) {
    const existing = header.querySelector<HTMLElement>(`:scope > .${SUMMARY_CLASS}`)
    if (existing !== null) return existing
    const summary = buildElement('span', SUMMARY_CLASS)
    summary.setAttribute(QUIET_ATTR, '')
    summary.setAttribute('aria-hidden', 'true')
    summary.appendChild(buildElement('span', FIT_CLASS))
    header.appendChild(summary)
    return summary
  }

  /** The hidden span holding the sentence, laid out without taking room. */
  function fitOf(summary: HTMLElement) {
    return summary.firstElementChild as HTMLElement
  }

  /**
   * What the header may spend on its summary: the room its containing block
   * gives it, less its own edges, every other child and the gaps between them.
   * The header's own box cannot answer this — the host's control is sized to
   * its content, so its current width follows the wording it is already
   * showing and the check would agree with itself.
   */
  function availableWidth(header: HTMLElement, summary: HTMLElement) {
    const style = getComputedStyle(header)
    const parent = header.parentElement
    const parentStyle = parent === null ? null : getComputedStyle(parent)
    const limit = parent === null || parentStyle === null
      ? header.clientWidth
      : parent.clientWidth - (parseFloat(parentStyle.paddingLeft) || 0) - (parseFloat(parentStyle.paddingRight) || 0)
    const gap = parseFloat(style.columnGap) || 0
    let room = limit
      - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0)
      - (parseFloat(style.borderLeftWidth) || 0) - (parseFloat(style.borderRightWidth) || 0)
    for (const child of header.children) {
      if (child === summary) continue
      const width = child.getBoundingClientRect().width
      if (width > 0) room -= width + gap
    }
    return Math.max(0, room)
  }

  /**
   * The wording this header has room for. The hidden span holds the sentence,
   * which is what the header shows while there is room for it; a header inside
   * a folded turn measures nothing and keeps the sentence until it is opened.
   */
  function formOf(header: HTMLElement, summary: HTMLElement, sentence: string): SummaryForm {
    const fit = fitOf(summary)
    if (fit.textContent !== sentence) fit.textContent = sentence
    return summaryForm(fit.getBoundingClientRect().width, availableWidth(header, summary))
  }

  /** What the group holds, or null for a group with nothing counted. */
  function readingOf(group: Element): SummaryReading | null {
    const content = group.querySelector(PROCESS_CONTENT_SELECTOR)
    if (content === null) return null
    const counts = countProcessItems(content)
    const full = summaryParts(counts, 'full')
    if (full.length === 0) return null
    return { full, compact: summaryParts(counts, 'compact'), name: summaryText(full, 'full') }
  }

  /** Draw one header's summary part by part, so each count rolls in place. */
  function render(summary: HTMLElement, parts: readonly SummaryPart[], form: SummaryForm, running: boolean) {
    summary.setAttribute(PROCESS_SUMMARY_FORM_ATTR, form)
    summary.toggleAttribute(PROCESS_SUMMARY_RUNNING_ATTR, running)
    const separator = summarySeparator(form)
    const kept = new Set(parts.map(part => part.figure))
    for (const stale of [...summary.children]) {
      if (stale === fitOf(summary)) continue
      if (!kept.has((stale as HTMLElement).dataset.figure as ProcessFigure)) stale.remove()
    }
    let previous: Element | null = null
    for (const part of parts) {
      let element = summary.querySelector<HTMLElement>(`:scope > [data-figure="${part.figure}"]`)
      if (element === null) {
        element = buildElement('span', 'dsh-claude-process-summary-part')
        element.dataset.figure = part.figure
        element.append(buildElement('span', 'dsh-claude-process-summary-words'), buildElement('span', 'dsh-claude-process-summary-roll'), buildElement('span', 'dsh-claude-process-summary-words'))
        element.children[1].appendChild(buildElement('span', 'dsh-claude-process-summary-sizer'))
      }
      // Parts keep the figure order: a figure that appears later slots in behind its predecessor.
      const place: Element | null = previous === null ? fitOf(summary).nextElementSibling : previous.nextElementSibling
      if (place !== element) summary.insertBefore(element, place)
      const [before, roll, after] = element.children as HTMLCollectionOf<HTMLElement>
      const lead = previous === null ? part.before : separator + part.before
      if (before.textContent !== lead) before.textContent = lead
      if (after.textContent !== part.after) after.textContent = part.after
      setCount(roll, part.count)
      previous = element
    }
  }

  /** Take one header's summary down and give the host's words back. */
  function release(header: HTMLElement) {
    const kept = named.get(header)
    kept?.unwatch()
    header.querySelector(`:scope > .${SUMMARY_CLASS}`)?.remove()
    if (kept !== undefined && header.getAttribute('aria-label') === kept.name) header.removeAttribute('aria-label')
    named.delete(header)
    header.closest(PROCESS_GROUP_SELECTOR)?.removeAttribute(PROCESS_SUMMARY_ATTR)
  }

  /**
   * Write what each group asks for: the wording that fits, and the name — which
   * is the sentence either way, since the drawn wording answers the room this
   * header has and the name says what the group holds.
   */
  function flush(groups: readonly Element[], forms: Map<HTMLElement, SummaryForm>) {
    for (const group of groups) {
      if (!group.isConnected) continue
      const header = group.querySelector<HTMLElement>(PROCESS_ACTIVITY_SELECTOR)
      if (header === null) continue
      const reading = readingOf(group)
      if (reading === null) {
        if (named.has(header)) release(header)
        continue
      }
      const summary = summaryOf(header)
      const form = forms.get(header) ?? formOf(header, summary, summaryText(reading.full, 'full'))
      render(summary, form === 'full' ? reading.full : reading.compact, form, header.querySelector(SHIMMER_SELECTOR) !== null)
      if (header.getAttribute('aria-label') !== reading.name) header.setAttribute('aria-label', reading.name)
      const known = named.get(header)
      if (known === undefined) {
        // A header only ever shrinks with its row, so its own size is what to watch.
        named.set(header, { name: reading.name, unwatch: observeSize(summary, () => queue(group)) })
      } else known.name = reading.name
      if (!group.hasAttribute(PROCESS_SUMMARY_ATTR)) group.setAttribute(PROCESS_SUMMARY_ATTR, '')
    }
    // A header the host replaced or unmounted takes nothing more from this module.
    for (const header of [...named.keys()]) {
      if (!header.isConnected) release(header)
    }
  }

  function queue(group: Element) {
    pending.add(group)
    if (queued) return
    queued = true
    const forms = new Map<HTMLElement, SummaryForm>()
    requestFrame({
      read() {
        // The measurement the write needs, taken before this frame's writes.
        for (const candidate of pending) {
          const header = candidate.querySelector<HTMLElement>(PROCESS_ACTIVITY_SELECTOR)
          const reading = readingOf(candidate)
          if (header === null || reading === null) continue
          const summary = summaryOf(header)
          forms.set(header, formOf(header, summary, summaryText(reading.full, 'full')))
        }
      },
      write() {
        queued = false
        const groups = [...pending]
        pending.clear()
        flush(groups, forms)
      },
    })
  }

  const stopMutations = subscribeMutations(document.body, {
    subtree: true,
    childList: true,
    attributeFilter: [SHIMMER_ATTRIBUTE, SHIMMER_LEGACY_ATTRIBUTE],
    skipQuiet: true,
  }, records => {
    for (const record of records) {
      const target = record.target instanceof Element ? record.target : record.target.parentElement
      const group = target?.closest(PROCESS_GROUP_SELECTOR) ?? null
      if (group !== null) queue(group)
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue
        if (node.matches(PROCESS_GROUP_SELECTOR)) queue(node)
        for (const found of node.querySelectorAll(PROCESS_GROUP_SELECTOR)) queue(found)
      }
    }
  })
  for (const group of document.querySelectorAll(PROCESS_GROUP_SELECTOR)) queue(group)

  return {
    /** The shell language changed: every summary is written again in it. */
    rewrite() {
      for (const group of document.querySelectorAll(PROCESS_GROUP_SELECTOR)) queue(group)
    },
    stop() {
      stopMutations()
      for (const [digit, timer] of leaving) {
        window.clearTimeout(timer)
        digit.remove()
      }
      leaving.clear()
      for (const header of [...named.keys()]) release(header)
      for (const group of document.querySelectorAll(`[${PROCESS_SUMMARY_ATTR}]`)) group.removeAttribute(PROCESS_SUMMARY_ATTR)
    },
  }
}
