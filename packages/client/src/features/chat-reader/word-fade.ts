import { requestFrame } from '../../core/frame'
import { fadeProgress, WordTimeline } from './word-timeline'
import type { FadingRun } from './word-timeline'

/**
 * The word-by-word fade over text the host's Markdown renderer drew (D57). The
 * DOM stays the host's: words are painted through CSS custom highlights, one
 * named highlight per fade level, from transparent to the word's own colour.
 * A highlight pseudo-element resolves `currentColor` to its own colour, not the
 * element's, so each faded word's element carries its computed colour inline
 * as `--dsh-claude-reader-ink`; the host's Markdown elements carry no `style`
 * prop, so React never rewrites it.
 */

/** Fade levels; chat-reader.css colours `::highlight(dsh-claude-reader-fade-<level>)` for each. */
export const FADE_LEVELS = 8
const HIGHLIGHT_PREFIX = 'dsh-claude-reader-fade-'
const INK_PROPERTY = '--dsh-claude-reader-ink'

/** The reference's curve, `cubic-bezier(.22,1,.36,1)`: easeOutQuint in closed form. */
const easeOutQuint = (t: number) => 1 - (1 - t) ** 5

/** A rendered text node and where its text starts in the container's text. */
interface TextSpan {
  node: Text
  start: number
}

/** The container's text nodes in document order, and their text joined. */
function readText(root: HTMLElement): { spans: TextSpan[], text: string } {
  const spans: TextSpan[] = []
  let text = ''
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const value = (node as Text).data
    if (value === '') continue
    spans.push({ node: node as Text, start: text.length })
    text += value
  }
  return { spans, text }
}

/** The span holding a text offset: the last whose start is at or before it. */
function spanAt(spans: readonly TextSpan[], offset: number): number {
  let low = 0
  let high = spans.length - 1
  while (low < high) {
    const middle = (low + high + 1) >>> 1
    if (spans[middle]!.start <= offset) low = middle
    else high = middle - 1
  }
  return low
}

/** One container's fade: its timeline and the ranges it paints this frame. */
export class WordFade {
  private readonly timeline = new WordTimeline()
  /** Ranges by level, as of the last read. */
  ranges: Range[][] = []
  /** Elements whose ink the next write sets. */
  inks: { element: HTMLElement, color: string }[] = []
  private enabled = false

  constructor(private readonly root: HTMLElement) {
    fades.add(this)
  }

  /** Take the container's text after a render; `enabled` is false for history, reduced motion and a hidden page. */
  observe(enabled: boolean) {
    this.enabled = enabled
    schedule()
  }

  /** Read phase: the text as rendered now, its fading runs and their ranges. */
  read(now: number): boolean {
    const { spans, text } = readText(this.root)
    this.timeline.update(text, this.enabled, now)
    const runs = this.timeline.fading(now)
    this.ranges = Array.from({ length: FADE_LEVELS }, () => [])
    this.inks = []
    if (runs.length === 0 || spans.length === 0) return false
    for (const run of runs) this.paint(run, spans, now)
    return true
  }

  private paint(run: FadingRun, spans: readonly TextSpan[], now: number) {
    const first = spanAt(spans, run.start)
    const last = spanAt(spans, Math.max(run.start, run.end - 1))
    const range = new Range()
    range.setStart(spans[first]!.node, run.start - spans[first]!.start)
    range.setEnd(spans[last]!.node, run.end - spans[last]!.start)
    const level = Math.min(FADE_LEVELS - 1, Math.floor(easeOutQuint(fadeProgress(run.born!, now)) * FADE_LEVELS))
    this.ranges[level]!.push(range)
    for (let index = first; index <= last; index += 1) {
      const element = spans[index]!.node.parentElement
      if (element !== null && !inked.has(element)) this.inks.push({ element, color: getComputedStyle(element).color })
    }
  }

  dispose() {
    fades.delete(this)
    schedule()
  }
}

/** Every container fading on the page; one frame task paints them all. */
const fades = new Set<WordFade>()
/** Elements whose ink is set; React rebuilds an element rather than recolouring it. */
const inked = new WeakSet<HTMLElement>()
let cancel: (() => void) | null = null

function schedule() {
  if (cancel !== null) return
  let animating = false
  cancel = requestFrame({
    read(now) {
      animating = false
      for (const fade of fades) if (fade.read(now)) animating = true
    },
    write() {
      cancel = null
      for (let level = 0; level < FADE_LEVELS; level += 1) {
        const ranges = [...fades].flatMap(fade => fade.ranges[level] ?? [])
        if (ranges.length === 0) CSS.highlights.delete(`${HIGHLIGHT_PREFIX}${level}`)
        else CSS.highlights.set(`${HIGHLIGHT_PREFIX}${level}`, new Highlight(...ranges))
      }
      for (const fade of fades) {
        for (const { element, color } of fade.inks) {
          element.style.setProperty(INK_PROPERTY, color)
          inked.add(element)
        }
      }
      if (animating) schedule()
    },
  })
}
