/** Host pixel lengths must be divided by page scale once, including sidebar width and handle offset (D43, D81).
 * Tracks containing `fr` or keywords stay under CSS sizing; only measured pixel lengths are converted.
 */
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { cacheFirstMatch } from '@dsh-claude-style/engine/host'
import { ROOT_SLOT_SELECTOR, SIDEBAR_DRAWER_ATTRIBUTE, SIDEBAR_HANDLE_SELECTOR, SIDEBAR_ROOT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { subscribePrefs } from '../core/prefs'

/** One length in the host's written column list, and the bracket group a length
 * may stand inside (`minmax(0px, 0px)`). */
const LENGTH = /^(\d+(?:\.\d+)?)px$/
const GROUP = /^(minmax|clamp|min|max)\((.*)\)$/

/** One written track, in the page's pixels; null when it holds a `fr` or a
 * keyword the page resolves against the track it is given, never a measurement. */
function trackInPage(track: string, scale: number) {
  const length = LENGTH.exec(track)
  if (length !== null) return `${Math.round(Number(length[1]) / scale * 100) / 100}px`
  const group = GROUP.exec(track)
  if (group === null) return null
  const inner: string[] = []
  for (const part of group[2].split(',')) {
    const trimmed = part.trim()
    inner.push(LENGTH.test(trimmed) ? trackInPage(trimmed, scale)! : trimmed)
  }
  return `${group[1]}(${inner.join(', ')})`
}

/** The written tracks, with a bracket group kept whole (`minmax(0px, 1fr)`). */
function tracks(written: string) {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const character of written.trim()) {
    if (character === '(') depth += 1
    if (character === ')') depth -= 1
    if (depth === 0 && /\s/.test(character)) {
      if (current !== '') parts.push(current)
      current = ''
      continue
    }
    current += character
  }
  if (current !== '') parts.push(current)
  return parts
}

/** Null preserves CSS-resolved tracks and the unscaled page. */
export function inPageColumns(written: string, scale: number) {
  if (!(scale > 0) || scale === 1 || written.trim() === '') return null
  const inPage: string[] = []
  for (const part of tracks(written)) {
    const converted = trackInPage(part, scale)
    if (converted === null) return null
    inPage.push(converted)
  }
  return inPage.join(' ')
}

/**
 * One pixel length the host wrote, in the page's pixels.
 *
 * @returns the length to write instead, or null when the page is at its own
 *     scale or the value is not a pixel length.
 */
export function inPageLength(written: string, scale: number) {
  const trimmed = written.trim()
  if (!(scale > 0) || scale === 1 || !LENGTH.test(trimmed)) return null
  return trackInPage(trimmed, scale)
}

/** What this rule needs from the skin it serves (D73). */
export interface FrameColumnsVocabulary {
  /** The scale the page is drawn at right now: 1 while the page is not scaled. */
  scale(): number
}

/** The one inline declaration of a host box this rule carries, and how it is read into the page's pixels. */
interface Declaration {
  property: string
  inPage(written: string, scale: number): string | null
}

const FRAME_COLUMNS: Declaration = { property: 'grid-template-columns', inPage: inPageColumns }
const SIDEBAR_WIDTH: Declaration = { property: 'width', inPage: inPageLength }
const SIDEBAR_HANDLE_LEFT: Declaration = { property: 'left', inPage: inPageLength }

/** One write this rule made: the number the host wrote, and the number it drew. */
interface Carry {
  /** The value the host itself wrote, which this rule has already read. */
  from: string
  /** The value read from it, which this rule left in place. */
  to: string
  /** The page's scale when the read happened: a different scale asks for the read again. */
  scale: number
}

/**
 * The shell's frame. It is marked only while it carries a host class the parts
 * table reads; a shell whose class names the table has not been taught leaves
 * it unmarked, and the frame is then the root slot's own child (D3).
 */
export const FRAME_SELECTOR = '[data-dsh-claude-part~="layout-frame"]'

/** Keep carry state on the element so overlapping hot-reload generations never divide a converted value again. */
const CARRY_ATTRIBUTE = 'data-dsh-claude-frame-columns'

function seenOn(box: HTMLElement): Carry | null {
  const raw = box.getAttribute(CARRY_ATTRIBUTE)
  if (raw === null) return null
  const [scale, from, to] = raw.split('\u0000')
  if (scale === undefined || from === undefined || to === undefined) return null
  return { from, to, scale: Number(scale) }
}

function markOn(box: HTMLElement, carry: Carry) {
  box.setAttribute(CARRY_ATTRIBUTE, `${carry.scale}\u0000${carry.from}\u0000${carry.to}`)
}

function forgetOn(box: HTMLElement) {
  box.removeAttribute(CARRY_ATTRIBUTE)
}

/**
 * Lay the host frame's columns, the sidebar's own width and the sidebar
 * handle's place out in the page's own pixels.
 *
 * @returns settle: read every box again, for a host write or a scale that
 *     changed under it; stop: give every box back.
 */
export function installFrameColumns(vocabulary: FrameColumnsVocabulary) {
  const carry = (box: HTMLElement, declaration: Declaration) => {
    const { property } = declaration
    const value = box.style.getPropertyValue(property)
    const seen = seenOn(box)
    // A frame drawing the sidebar as a drawer is outside the three-track grid
    // this rule converts: the sidebar's column is lifted out of the flow and
    // placed over the page, so the tracks no longer describe the page the
    // reader sees. The host's own declaration stands there, and a carried
    // number is handed back rather than divided again.
    if (declaration === FRAME_COLUMNS && box.hasAttribute(SIDEBAR_DRAWER_ATTRIBUTE)) {
      if (seen !== null) {
        forgetOn(box)
        box.style.setProperty(property, seen.from)
      }
      return
    }
    if (value === '') {
      // The host took its declaration away — the sidebar drops its width once it
      // is collapsed — so the next number it writes is a fresh one, even when it
      // is the number this record holds.
      if (seen !== null) forgetOn(box)
      return
    }
    const scale = vocabulary.scale()
    // A second pass reads this rule's own number back as the host's write; it is
    // the one kept from the last read, and dividing it again would shrink the
    // box on every pass. A different scale is a different answer, though: the
    // held number is the host's own, and it is carried again from there.
    if (seen !== null && value === seen.to && seen.scale !== scale) {
      const converted = declaration.inPage(seen.from, scale)
      if (converted === null) {
        forgetOn(box)
        box.style.setProperty(property, seen.from)
        return
      }
      markOn(box, { from: seen.from, to: converted, scale })
      box.style.setProperty(property, converted)
      return
    }
    if (seen !== null && (value === seen.from || value === seen.to)) return
    const inPage = declaration.inPage(value, scale)
    if (inPage === null) {
      // The page is at its own scale again, or the write holds a value this rule
      // does not read: the host's own numbers are the ones that stand.
      if (seen !== null) {
        forgetOn(box)
        box.style.setProperty(property, seen.from)
      }
      return
    }
    markOn(box, { from: value, to: inPage, scale })
    box.style.setProperty(property, inPage)
  }

  /** The boxes being heard, each with its declaration and the subscription that hears the host's write. */
  const heard = new Map<HTMLElement, { declaration: Declaration, off: () => void }>()
  // Each box is remounted with the shell: the bus's registry follows it (D40),
  // and the host's own write lands on the box, which this hears.
  const seats = observeMatches<HTMLElement>(FRAME_SELECTOR, () => sync())
  const sidebars = observeMatches<HTMLElement>(SIDEBAR_ROOT_SELECTOR, () => sync())
  const handles = observeMatches<HTMLElement>(SIDEBAR_HANDLE_SELECTOR, () => sync())
  // The root slot is read through the engine's kept match (D40), never walked.
  const rootSlot = cacheFirstMatch<HTMLElement>(ROOT_SLOT_SELECTOR)

  /** Every frame standing in the shell: the marked one, or the root slot's own child. */
  const framesInShell = () => {
    const marked = seats.all()
    if (marked.length > 0) return marked
    const slot = rootSlot()
    const child = slot === null ? null : slot.firstElementChild
    return child instanceof HTMLElement ? [child] : []
  }

  /** Every box the page draws, with the declaration this rule carries on it. */
  const standing = (): [HTMLElement, Declaration][] => [
    ...framesInShell().map((frame): [HTMLElement, Declaration] => [frame, FRAME_COLUMNS]),
    ...sidebars.all().map((sidebar): [HTMLElement, Declaration] => [sidebar, SIDEBAR_WIDTH]),
    ...handles.all().map((handle): [HTMLElement, Declaration] => [handle, SIDEBAR_HANDLE_LEFT]),
  ]

  /** Hear every box the page draws, and drop the ones that left. */
  const sync = () => {
    const present = new Set<HTMLElement>()
    for (const [box, declaration] of standing()) {
      present.add(box)
      if (!heard.has(box)) {
        // The host's next grid/frame paint reads this declaration. A heavy
        // batch must not leave the unscaled value standing until a later task.
        // The drawer mark arrives on the frame itself, and it decides whether the
        // three tracks this rule converts are still the page's own geometry.
        heard.set(box, { declaration, off: subscribeMutations(box, { attributes: true, attributeFilter: ['style', SIDEBAR_DRAWER_ATTRIBUTE], beforePaint: true }, () => carry(box, declaration)) })
      }
      carry(box, declaration)
    }
    for (const [box, { off }] of [...heard]) {
      if (present.has(box)) continue
      heard.delete(box)
      off()
      forgetOn(box)
    }
  }

  const offPrefs = subscribePrefs(sync)
  sync()

  return {
    settle: sync,
    stop() {
      seats.release()
      sidebars.release()
      handles.release()
      offPrefs()
      for (const [box, { declaration, off }] of heard) {
        off()
        const seen = seenOn(box)
        if (seen !== null) box.style.setProperty(declaration.property, seen.from)
        forgetOn(box)
      }
      heard.clear()
    },
  }
}
