import { QUIET_ATTR } from '../../constants'
import { observeSize, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { copy } from './copy'
import type { CopyKey } from './copy'
import { motionReduced } from '../../core/prefs'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { motionMs } from '../../shared/motion'
import { inPagePixels } from '../../shared/page-zoom'
import { SWEEP_BAND_CLASS, buildSweepBand } from '../../shared/sweep-band'
import { ASSISTANT_STEP_KIND, CHAT_GROUP_PART_ATTRIBUTE, CHAT_GROUP_PART_REASONING, FLOW_KIND_ATTRIBUTE, PROCESS_ACTIVITY_SELECTOR, PROCESS_CONTENT_SELECTOR, PROCESS_GROUP_SELECTOR, PROCESS_HEADER_LABEL_SELECTOR, SHIMMER_ATTRIBUTE, SHIMMER_SELECTOR, TOOL_CALL_KIND } from '@dsh-claude-style/contracts/dom'

/* The visible summary is aria-hidden and quiet; the header carries the full sentence as its
   accessible name. Narrow headers use compact figures. */

/** The four figures, in the order the summary reads them. */
export type ProcessFigure = 'thinking' | 'output' | 'tool' | 'record'
export type ProcessCounts = Record<ProcessFigure, number>
/** The two wordings: the sentence, and the compact one a narrow header falls back to. */
export type SummaryForm = 'full' | 'compact'

const FIGURES: readonly ProcessFigure[] = ['thinking', 'output', 'tool', 'record']

/** This figure's words, by the key they stand under in the feature's own copy. */
type CopyText = CopyKey

/** English singular/plural keys mirror the host's message.turnProcess dictionaries. */
const FIGURE_COPY: Record<ProcessFigure, { full: { one: CopyText, other: CopyText }, compact: CopyText }> = {
  thinking: {
    full: {
      one: 'processSummaryFullThoughtOne',
      other: 'processSummaryFullThoughtOther',
    },
    compact: 'processSummaryThinking',
  },
  output: {
    full: {
      one: 'processSummaryFullOutputOne',
      other: 'processSummaryFullOutputOther',
    },
    compact: 'processSummaryOutput',
  },
  tool: {
    full: {
      one: 'processSummaryFullToolOne',
      other: 'processSummaryFullToolOther',
    },
    compact: 'processSummaryTool',
  },
  record: {
    full: {
      one: 'processSummaryFullRecordOne',
      other: 'processSummaryFullRecordOther',
    },
    compact: 'processSummaryRecord',
  },
}

/** The sentence's separator; the compact figures keep the host's own (message.turnProcess.separator). */
const FULL_SEPARATOR = () => copy('processSummaryFullSeparator')
const COMPACT_SEPARATOR = ' · '
/** On a group root while its header shows the summary; the stylesheet hides the host's words under it. */
export const PROCESS_SUMMARY_ATTR = 'data-dsh-claude-summary'
/** On host header copy the summary stands in for; the stylesheet hides every marked element. */
const PROCESS_SUMMARY_REPLACED_ATTR = 'data-dsh-claude-summary-replaced'
/** On the summary while the group's section still runs, which is while its band stands (syncBand). */
export const PROCESS_SUMMARY_RUNNING_ATTR = 'data-dsh-claude-summary-running'
/** On the summary: the wording it stands in. */
export const PROCESS_SUMMARY_FORM_ATTR = 'data-dsh-claude-summary-form'
/** On a rolling digit: `enter` rises into place, `exit` leaves upward, `settled` stands. */
const ROLL_ATTR = 'data-dsh-claude-roll'
/** How long a digit takes to roll, as the stylesheet's animations run it (D9). */
const ROLL_MS = motionMs('--dsh-claude-duration-roll')
const SUMMARY_CLASS = 'dsh-claude-process-summary'
/** The hidden span holding the sentence, whose natural width tells whether the header has room for it. */
const FIT_CLASS = 'dsh-claude-process-summary-fit'
/** On the band's copy of the figures, which lays them out the way the summary does (fold.css). */
const GLYPHS_CLASS = 'dsh-claude-process-summary-glyphs'
/** What a header has to be for its wording to be measured: rendered, and in a row content-visibility does not skip. */
const RENDERED: CheckVisibilityOptions = { contentVisibilityAuto: true }

/** Count direct body rows only; calls nested inside a tool row are not separate group items. */
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
  const words = FIGURE_COPY[figure]
  if (form === 'compact') return copy(words.compact)
  return copy(count === 1 ? words.full.one : words.full.other)
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


export function createProcessSummary() {
  /** Each summarised header: the name written there, and the summary element it carries. */
  const named = new Map<HTMLElement, { name: string, summary: HTMLElement }>()
  /** The summaries one size subscription watches, and how to take it down (D40). */
  let watchedSummaries: HTMLElement[] = []
  let stopSummarySizes: (() => void) | null = null
  /** The digits still leaving, so a teardown or a quick second change can finish them. */
  const leaving = new Map<HTMLElement, number>()
  /** The groups waiting for the next frame. */
  const pending = new Set<Element>()
  let queued = false
  /** Set by the teardown: nothing more is queued, and the frame in flight is cancelled. */
  let stopped = false
  /** Cancels the frame the pending groups wait on. */
  let cancelFrame: (() => void) | null = null

  /** Cache natural widths by wording and font face to avoid repeated layout (D9). */
  const fitWidths = new Map<string, number>()
  /** Bound cached count-specific wordings; clearing only forces fresh measurements. */
  const FIT_WIDTH_LIMIT = 512
  /** Cache font signatures until fonts load or zoom changes to avoid recalculation per group. */
  const faceSignatures = new WeakMap<HTMLElement, { epoch: number, signature: string }>()
  /** Moves when a face arrives, so every kept signature is read again. */
  let faceEpoch = 0
  /** What each running summary's band copy says, so a pass that changes nothing writes nothing. */
  const bandSentences = new WeakMap<HTMLElement, string>()
  /**
   * Headers a pass left unmeasured because the page does not render them: a
   * folded turn's, or one in a row content-visibility skips. A style or layout
   * read inside such a subtree lays that subtree out on its own, every time it
   * is read, and a folded transcript holds dozens of them. Their size observer
   * hears them show and measures them in that report, before the frame paints.
   * Per row: a header leaves when it is measured, released, or found detached.
   */
  const unseen = new Set<HTMLElement>()
  let watchedUnseen: HTMLElement[] = []
  let stopUnseenSizes: (() => void) | null = null

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

  /** Measure against the containing block: the content-sized header would otherwise validate its current wording. */
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
      // The child's box in the pixels the styles around it are given in
      // (shared/page-zoom.ts).
      const width = inPagePixels(child.getBoundingClientRect().width)
      if (width > 0) room -= width + gap
    }
    return Math.max(0, room)
  }

  /** Font signature completes the width cache key and is cached per faceEpoch. */
  function faceSignature(fit: HTMLElement): string {
    const kept = faceSignatures.get(fit)
    if (kept !== undefined && kept.epoch === faceEpoch) return kept.signature
    const style = getComputedStyle(fit)
    const signature = `${style.fontSize}\u0000${style.fontFamily}\u0000${style.fontWeight}\u0000${style.letterSpacing}`
    faceSignatures.set(fit, { epoch: faceEpoch, signature })
    return signature
  }

  /** The key one sentence's measured width is kept under, for the face it is set in. */
  function fitKey(fit: HTMLElement, sentence: string) {
    return `${sentence}\u0000${faceSignature(fit)}`
  }

  /** Reuse measurements for repeated sentences under the same font face. */
  function fitWidthOf(fit: HTMLElement, sentence: string): number {
    const key = fitKey(fit, sentence)
    const known = fitWidths.get(key)
    if (known !== undefined) return known
    if (fit.textContent !== sentence) fit.textContent = sentence
    const width = inPagePixels(fit.getBoundingClientRect().width)
    if (fitWidths.size >= FIT_WIDTH_LIMIT) fitWidths.clear()
    fitWidths.set(key, width)
    return width
  }

  /** The wording a rendered header has room for. */
  function formOf(header: HTMLElement, summary: HTMLElement, sentence: string): SummaryForm {
    return summaryForm(fitWidthOf(fitOf(summary), sentence), availableWidth(header, summary))
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

  /** Rewrite the sweep copy only when its sentence changes; cloned digits use their settled state. */
  function syncBand(summary: HTMLElement, running: boolean, sentence: string) {
    const standing = summary.querySelector<HTMLElement>(`:scope > .${SWEEP_BAND_CLASS}`)
    if (!running) {
      standing?.remove()
      bandSentences.delete(summary)
      return
    }
    if (standing !== null && bandSentences.get(summary) === sentence) return
    let target = standing === null ? null : standing.firstElementChild
    if (target === null) {
      const built = buildSweepBand(null)
      built.glyphs.classList.add(GLYPHS_CLASS)
      summary.appendChild(built.band)
      target = built.glyphs
    }
    const copies: Node[] = []
    for (const part of summary.querySelectorAll(':scope > [data-figure]')) {
      const copy = part.cloneNode(true) as HTMLElement
      for (const digit of copy.querySelectorAll(`[${ROLL_ATTR}="exit"]`)) digit.remove()
      for (const digit of copy.querySelectorAll(`[${ROLL_ATTR}]`)) digit.setAttribute(ROLL_ATTR, 'settled')
      copies.push(copy)
    }
    target.replaceChildren(...copies)
    bandSentences.set(summary, sentence)
  }

  /** Draw one header's summary part by part, so each count rolls in place. */
  function render(summary: HTMLElement, parts: readonly SummaryPart[], form: SummaryForm, running: boolean) {
    summary.setAttribute(PROCESS_SUMMARY_FORM_ATTR, form)
    summary.toggleAttribute(PROCESS_SUMMARY_RUNNING_ATTR, running)
    const separator = summarySeparator(form)
    const kept = new Set(parts.map(part => part.figure))
    for (const stale of [...summary.children]) {
      if (stale === fitOf(summary) || stale.classList.contains(SWEEP_BAND_CLASS)) continue
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
    syncBand(summary, running, summaryText(parts, form))
  }

  /** Take one header's summary down and give the host's words back. */
  function release(header: HTMLElement) {
    const kept = named.get(header)
    header.querySelector(`:scope > .${SUMMARY_CLASS}`)?.remove()
    for (const label of header.querySelectorAll(`:scope > [${PROCESS_SUMMARY_REPLACED_ATTR}]`)) label.removeAttribute(PROCESS_SUMMARY_REPLACED_ATTR)
    if (kept !== undefined && header.getAttribute('aria-label') === kept.name) header.removeAttribute('aria-label')
    named.delete(header)
    unseen.delete(header)
    header.closest(PROCESS_GROUP_SELECTOR)?.removeAttribute(PROCESS_SUMMARY_ATTR)
  }

  /** Share one size subscription across summaries (D40). */
  function watchSummaries(summaries: HTMLElement[]) {
    if (sameSummaries(summaries)) return
    if (stopSummarySizes !== null) stopSummarySizes()
    watchedSummaries = summaries
    stopSummarySizes = summaries.length === 0 ? null : observeSize(summaries, entries => {
      for (const entry of entries) {
        const group = entry.target.closest(PROCESS_GROUP_SELECTOR)
        if (group !== null) queue(group)
      }
    })
  }

  /** Whether two lists hold the same elements, in the same order. */
  function sameElements(next: readonly HTMLElement[], watched: readonly HTMLElement[]) {
    if (next.length !== watched.length) return false
    for (let index = 0; index < next.length; index += 1) {
      if (next[index] !== watched[index]) return false
    }
    return true
  }

  /** Whether the same summaries are watched, in the same order. */
  function sameSummaries(summaries: readonly HTMLElement[]) {
    return sameElements(summaries, watchedSummaries)
  }

  /** Watch the unmeasured headers with one size subscription (D40); the first report of a hidden one says nothing. */
  function watchUnseen() {
    for (const header of unseen) if (!header.isConnected) unseen.delete(header)
    const headers = [...unseen]
    if (sameElements(headers, watchedUnseen)) return
    if (stopUnseenSizes !== null) stopUnseenSizes()
    watchedUnseen = headers
    stopUnseenSizes = headers.length === 0 ? null : observeSize(headers, entries => {
      const shown: Element[] = []
      for (const entry of entries) {
        const header = entry.target as HTMLElement
        if (!unseen.has(header) || !header.checkVisibility(RENDERED)) continue
        const group = header.closest(PROCESS_GROUP_SELECTOR)
        if (group !== null) shown.push(group)
      }
      if (shown.length === 0) return
      // The report comes once the frame has laid the header out: measured and
      // written here, the summary is drawn with the frame that shows it.
      const pass = createPass()
      readForms(shown, pass)
      for (const candidate of writeForms(shown, pass)) queue(candidate)
    })
  }

  /** Keep the accessible name as the full sentence even when the visible wording is compact. */
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
      const form = forms.get(header)
      // A group whose summary or sentence was written this frame waits for the next one (queue).
      if (form === undefined) continue
      const summary = summaryOf(header)
      render(summary, form === 'full' ? reading.full : reading.compact, form, header.querySelector(SHIMMER_SELECTOR) !== null)
      if (header.getAttribute('aria-label') !== reading.name) header.setAttribute('aria-label', reading.name)
      const known = named.get(header)
      if (known === undefined) {
        // A header only ever shrinks with its row, so its own size is what to watch.
        named.set(header, { name: reading.name, summary })
      } else {
        known.name = reading.name
        known.summary = summary
      }
      if (!group.hasAttribute(PROCESS_SUMMARY_ATTR)) group.setAttribute(PROCESS_SUMMARY_ATTR, '')
      // The host can place a tool status beside the count sentence. Hide every
      // non-flow header copy; flow rows and extension slots keep their own content visible.
      for (const label of header.querySelectorAll(PROCESS_HEADER_LABEL_SELECTOR)) {
        if (label.hasAttribute(FLOW_KIND_ATTRIBUTE) || label.hasAttribute('data-slot')) label.removeAttribute(PROCESS_SUMMARY_REPLACED_ATTR)
        else label.setAttribute(PROCESS_SUMMARY_REPLACED_ATTR, '')
      }
    }
    // A header the host replaced or unmounted takes nothing more from this module.
    for (const header of [...named.keys()]) {
      if (!header.isConnected) release(header)
    }
    watchSummaries([...named.values()].map(entry => entry.summary))
  }

  /**
   * What one pass carries from its read half to its write half: the wording
   * each measured header takes, and the groups whose summary or measuring text
   * it has to write, with the sentence to put there. Per pass: dropped once
   * the write half has run.
   */
  function createPass() {
    return { forms: new Map<HTMLElement, SummaryForm>(), deferred: new Map<Element, string>() }
  }

  /**
   * The read half of a pass: the wording each group's header has room for.
   * Missing measuring content is built by the write half and measured by the
   * next pass (D40); a header the page does not render waits in `unseen`.
   */
  function readForms(candidates: Iterable<Element>, { forms, deferred }: ReturnType<typeof createPass>) {
    for (const candidate of candidates) {
      if (!candidate.isConnected) continue
      const header = candidate.querySelector<HTMLElement>(PROCESS_ACTIVITY_SELECTOR)
      const reading = readingOf(candidate)
      if (header === null || reading === null) continue
      const sentence = summaryText(reading.full, 'full')
      const summary = header.querySelector<HTMLElement>(`:scope > .${SUMMARY_CLASS}`)
      if (summary === null || fitOf(summary).textContent !== sentence) {
        deferred.set(candidate, sentence)
        continue
      }
      if (!header.checkVisibility(RENDERED)) {
        unseen.add(header)
        continue
      }
      unseen.delete(header)
      forms.set(header, formOf(header, summary, sentence))
    }
  }

  /**
   * The write half of a pass.
   * @returns the groups whose measuring text it wrote, for the next pass to measure.
   */
  function writeForms(groups: readonly Element[], { forms, deferred }: ReturnType<typeof createPass>) {
    // Every write first: the next frame's reads then pay one layout for the
    // whole batch, where a write between two reads paid one per group.
    const measureNext: Element[] = []
    for (const [candidate, sentence] of deferred) {
      if (!candidate.isConnected) continue
      const header = candidate.querySelector<HTMLElement>(PROCESS_ACTIVITY_SELECTOR)
      if (header === null) continue
      const fit = fitOf(summaryOf(header))
      if (fit.textContent !== sentence) fit.textContent = sentence
      measureNext.push(candidate)
    }
    flush(groups, forms)
    watchUnseen()
    return measureNext
  }

  function queue(group: Element) {
    if (stopped) return
    pending.add(group)
    if (queued) return
    queued = true
    const pass = createPass()
    cancelFrame = requestFrame({
      read() {
        readForms(pending, pass)
      },
      write() {
        cancelFrame = null
        queued = false
        const groups = [...pending]
        pending.clear()
        for (const candidate of writeForms(groups, pass)) queue(candidate)
      },
    })
  }

  const stopMutations = subscribeMutations(document.body, {
    subtree: true,
    childList: true,
    attributeFilter: [SHIMMER_ATTRIBUTE],
    skipQuiet: true,
  }, records => {
    let removed = false
    for (const record of records) {
      if (record.removedNodes.length > 0) removed = true
      const target = record.target instanceof Element ? record.target : record.target.parentElement
      const group = target?.closest(PROCESS_GROUP_SELECTOR) ?? null
      if (group !== null) queue(group)
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue
        if (node.matches(PROCESS_GROUP_SELECTOR)) queue(node)
        for (const found of node.querySelectorAll(PROCESS_GROUP_SELECTOR)) queue(found)
      }
    }
    // A header the host unmounted takes its summary and its size subscription
    // with it now: the next transcript may hold no group at all, and the flush
    // that would have swept it never comes.
    if (removed) {
      for (const header of [...named.keys()]) if (!header.isConnected) release(header)
      watchSummaries([...named.values()].map(entry => entry.summary))
    }
  })
  for (const group of document.querySelectorAll(PROCESS_GROUP_SELECTOR)) queue(group)

  // A face arriving changes what a wording measures: nothing measured under the
  // faces of the first frame stands past them.
  const onFacesLoaded = () => {
    faceEpoch += 1
    fitWidths.clear()
  }
  document.fonts.addEventListener('loadingdone', onFacesLoaded)

  return {
    /** The shell language changed: every summary is written again in it. */
    rewrite() {
      for (const group of document.querySelectorAll(PROCESS_GROUP_SELECTOR)) queue(group)
    },
    stop() {
      // First: a frame still waiting would otherwise write the summaries again
      // after this teardown and subscribe their sizes with nothing left to
      // unsubscribe them (D12 — the feature stays off for the generation).
      stopped = true
      if (cancelFrame !== null) cancelFrame()
      cancelFrame = null
      queued = false
      pending.clear()
      stopMutations()
      document.fonts.removeEventListener('loadingdone', onFacesLoaded)
      fitWidths.clear()
      for (const [digit, timer] of leaving) {
        window.clearTimeout(timer)
        digit.remove()
      }
      leaving.clear()
      for (const header of [...named.keys()]) release(header)
      if (stopSummarySizes !== null) stopSummarySizes()
      stopSummarySizes = null
      watchedSummaries = []
      if (stopUnseenSizes !== null) stopUnseenSizes()
      stopUnseenSizes = null
      watchedUnseen = []
      unseen.clear()
      for (const group of document.querySelectorAll(`[${PROCESS_SUMMARY_ATTR}]`)) group.removeAttribute(PROCESS_SUMMARY_ATTR)
    },
  }
}
