import { buildElement } from '@dsh-claude-style/engine/dom'
import { copy } from './copy'
import { modelGroupName } from './provider-name'
import { byModelId } from './rows'
import { motionEaseAt, motionMs, motionValue } from '../../shared/motion'
import { motionReduced } from '../../core/prefs'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { CARET_FIELD_ATTR } from '../../constants'
import type { createModelRows } from './rows'
import type { HostModelCatalogSnapshot, HostModelEntry, HostModelGroup } from '@dsh-claude-style/contracts/services'

/**
 * The model picker's second level: the search field at the top of the card and
 * the list under it. The card's placement, its opening and closing stay with
 * the picker; what lives here is its content.
 *
 * The field clears the way transitions.dev's "Input clear with dissolve" (MIT)
 * does: the words leaving fly down through a blur, the placeholder falls in
 * from above, and a streak ignites under each word. The streak's envelope
 * cannot be a keyframe, so the clear runs per frame (D40), and its times,
 * distances and curve are read from the token table (D9).
 */

/** The field's own state: the mirror draws the words, so the field draws none. */
const FILLED_ATTR = 'data-dsh-claude-field-filled'
/** The field's own state: a clear is running, and the words and placeholder are mid-flight. */
const CLEARING_ATTR = 'data-dsh-claude-field-clearing'

/** The clear control's mark. */
const CLEAR_SVG = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>'

/**
 * The streak's four washes per word, after the recipe: each centre as a share
 * of the word's own half width, its two radii, and the share of ink it carries.
 */
const GLOW_LAYERS = [[0, 0.8, 7, 0.22], [0.45, 0.55, 8, 0.18], [-0.4, 0.65, 6, 0.16], [0.15, 0.9, 5, 0.14]] as const
/** How far past a word's half width its streak reaches. */
const GLOW_SPREAD = 1.5
/** Where the envelope peaks inside the clear, as a share of its length. */
const GLOW_PEAK_AT = 0.15
/** The streak's own strength on the field: the sheet holds the two palettes' values. */
const GLOW_STRENGTH_PROPERTY = '--dsh-claude-clear-glow-opacity'

export interface ModelSubMenuOptions {
  /** The row builders the two levels share. */
  rows: ReturnType<typeof createModelRows>
  /** The catalog's snapshot, read on every paint. */
  snapshot(): HostModelCatalogSnapshot | null
  /** The model in force, or null while the catalog is still arriving. */
  current(): { group: HostModelGroup, model: HostModelEntry } | null
  /** What the rows depend on besides the query and the language. */
  signature(): string
}

/**
 * The second card's content.
 *
 * @returns `{ head, body }` for the card to carry, `render` for a repaint (the
 *     signature and the query decide whether it draws), `reset` to force the
 *     next one, `clearQuery` for the Escape route, `forget` for a fold and
 *     `release` for the feature's teardown.
 */
export function createModelSubMenu(options: ModelSubMenuOptions) {
  const rows = options.rows

  const head = buildElement('div', 'dsh-claude-model-search')
  const box = buildElement('div', 'dsh-claude-model-search-field')
  const field = buildElement('input', 'dsh-claude-model-search-input')
  field.type = 'text'
  field.spellcheck = false
  field.setAttribute('autocomplete', 'off')
  // The mark the caret feature knows a field of the skin's own by
  // (packages/client/src/features/caret/caret.ts).
  field.setAttribute(CARET_FIELD_ATTR, '')
  // The words sit in the mirror so they can fly off it; the field keeps its own
  // glyphs transparent while it has any (the sheet).
  const mirror = buildElement('div', 'dsh-claude-model-search-mirror')
  mirror.setAttribute('aria-hidden', 'true')
  // The mirror is not inside the field, so the offset the field scrolls its text
  // by is written across to it: a long query stays under its own caret.
  const travel = buildElement('span', 'dsh-claude-model-search-travel')
  mirror.appendChild(travel)
  const placeholder = buildElement('div', 'dsh-claude-model-search-placeholder')
  placeholder.setAttribute('aria-hidden', 'true')
  const glow = buildElement('div', 'dsh-claude-model-search-glow')
  glow.setAttribute('aria-hidden', 'true')
  const clear = buildElement('button', 'dsh-claude-model-search-clear')
  clear.type = 'button'
  clear.innerHTML = CLEAR_SVG
  box.appendChild(field)
  box.appendChild(mirror)
  box.appendChild(placeholder)
  box.appendChild(glow)
  box.appendChild(clear)
  head.appendChild(box)
  const body = buildElement('div', 'dsh-claude-popover-body dsh-claude-model-sub-body')

  /** What the list on screen was drawn from: the signature and the query. */
  let painted = ''
  /** The query the last paint was drawn from, which is what a resize answers. */
  let lastQuery = ''
  /** The canvas the streak's word widths are measured on, made on the first clear. */
  let measure: CanvasRenderingContext2D | null = null
  /** The frame the clear's next step runs in; null between steps. */
  let frame: (() => void) | null = null

  /** Write the field's own words and names in the shell's language. */
  function relabel() {
    const hint = copy('searchPlaceholder')
    if (placeholder.textContent !== hint) placeholder.textContent = hint
    if (field.getAttribute('aria-label') !== hint) field.setAttribute('aria-label', hint)
    const name = copy('searchClear')
    if (clear.getAttribute('aria-label') !== name) clear.setAttribute('aria-label', name)
  }

  /** Whether a model answers the query by its name, its id or its provider's name. */
  function admits(group: HostModelGroup, model: HostModelEntry, query: string) {
    if (query === '') return true
    return `${model.name || model.id} ${model.id} ${group.name || group.id}`.toLowerCase().includes(query)
  }

  /**
   * Draw the list the query and the catalog call for.
   *
   * A query that leaves a different list takes the card's height with it over
   * transitions.dev's "Card resize" (MIT): the height is pinned where the old
   * list left it, the new list is drawn, and the height travels to the measured
   * one — the transition between the two is the sheet's. The card opening, and
   * any repaint the query did not cause, takes the new height outright.
   */
  function render() {
    const snap = options.snapshot()
    const groups = (snap && snap.groups) || []
    const current = options.current()
    const query = field.value.trim().toLowerCase()
    const at = `${options.signature()}\u0000${query}`
    if (at === painted) return
    const searched = query !== lastQuery
    lastQuery = query
    painted = at
    relabel()
    // The card the list sits in, which is the box whose height changes.
    const card = head.parentElement
    const before = searched && card !== null && card.isConnected ? card.getBoundingClientRect().height : 0
    while (body.firstChild) body.removeChild(body.firstChild)

    // With no query the card carries what level 1 does not, the way it always
    // had. A query searches the whole catalog: the field is how a reader looks a
    // model up by name, and one level 1 already lists is still a model.
    const remaining = rows.remainingGroups(groups, rows.levelOneSections(groups))
    // A catalog whose every provider is already on level 1 leaves this card
    // nothing to carry, and the card would open on an empty list. It carries
    // the whole catalog then, and the search field above it stays a way in.
    const sections = query === '' ? (remaining.length > 0 ? remaining : groups) : groups
    let listed = 0
    for (let g = 0; g < sections.length; g++) {
      const group = sections[g]
      const found = group.models.slice().sort(byModelId).filter(model => admits(group, model, query))
      if (found.length === 0) continue
      const section = buildElement('div', 'dsh-claude-model-group-section')
      const groupRow = buildElement('div', 'dsh-claude-model-group-row')
      const groupLabel = buildElement('div', 'dsh-claude-model-group')
      // The group label is the provider's name alone: a mark there would repeat
      // what the rows below already carry inside their lockups.
      groupLabel.appendChild(buildElement('span', 'dsh-claude-model-group-name', modelGroupName(group.id, group.name)))
      groupRow.appendChild(groupLabel)
      section.appendChild(groupRow)
      for (let m = 0; m < found.length; m++) {
        const selected = current !== null && current.group.id === group.id && current.model.id === found[m].id
        section.appendChild(rows.buildModelOption(group, found[m], selected, false))
        listed += 1
      }
      body.appendChild(section)
    }
    if (listed === 0) {
      body.appendChild(buildElement('div', 'dsh-claude-popover-status', query === '' ? copy('empty') : copy('searchEmpty')))
    }
    if (card !== null && before > 0) resizeThrough(card, before)
  }

  /**
   * Take the card from the height it had to the height its new list gives it.
   *
   * A height cannot be interpolated into `auto`, so the travel needs both ends
   * as lengths: the old height is written first (the number the box already
   * had, so nothing moves), the new list is measured while the height is
   * released, and that measured height is written on the next frame for the
   * sheet's transition to carry. The height returns to the content once the
   * travel lands, so a later list is never held at this one's size.
   */
  function resizeThrough(card: HTMLElement, before: number) {
    releaseHeight()
    card.style.height = ''
    const after = card.getBoundingClientRect().height
    // A list that leaves the card the size it already was needs no travel.
    if (Math.abs(after - before) < 1) return
    card.style.height = `${before}px`
    // Read once, so the browser holds the old height as the travel's start.
    void card.getBoundingClientRect().height
    resized = card
    settleTimer = window.setTimeout(releaseHeight, motionMs('--dsh-claude-duration-resize') + 40)
    requestFrame({
      write() {
        if (resized === card) card.style.height = `${after}px`
      },
    })
  }

  /** The card mid-travel, and the timer that hands its height back to the content. */
  let resized: HTMLElement | null = null
  let settleTimer: number | null = null

  /** Hand the card's height back to its content: the state it rests in. */
  function releaseHeight() {
    if (settleTimer !== null) {
      clearTimeout(settleTimer)
      settleTimer = null
    }
    if (resized === null) return
    resized.style.height = ''
    resized = null
  }

  /** Write the field's own state onto its box, and keep the mirror in step with the field's scroll. */
  function syncField() {
    const filled = field.value !== ''
    box.toggleAttribute(FILLED_ATTR, filled)
    travel.textContent = filled ? field.value : ''
    travel.style.transform = filled && field.scrollLeft !== 0 ? `translateX(${-field.scrollLeft}px)` : ''
  }

  /**
   * The streak under the words leaving: one radial stack whose every wash sits
   * on a word, so the ignition follows the words rather than the field.
   */
  function buildGlow(text: string) {
    if (measure === null) measure = document.createElement('canvas').getContext('2d')
    if (measure === null) return ''
    const style = getComputedStyle(field)
    measure.font = style.font
    const width = box.clientWidth
    if (width === 0) return ''
    const padLeft = Number.parseFloat(style.paddingLeft) || 0
    const layers: string[] = []
    let left = 0
    const segments = text.split(/(\s+)/)
    for (let s = 0; s < segments.length; s++) {
      const segment = segments[s]
      const segmentWidth = measure.measureText(segment).width
      if (segment.trim() !== '') {
        const centre = padLeft + left + segmentWidth / 2
        const half = Math.max(segmentWidth * 0.45, 8) * GLOW_SPREAD
        for (let l = 0; l < GLOW_LAYERS.length; l++) {
          const offset = GLOW_LAYERS[l][0]
          const radiusShare = GLOW_LAYERS[l][1]
          const radius = GLOW_LAYERS[l][2]
          const alpha = Math.round(GLOW_LAYERS[l][3] * 100)
          const at = (((centre + offset * half) / width) * 100).toFixed(2)
          const size = `${Math.max(half * radiusShare, 2).toFixed(1)}px ${radius}px`
          layers.push(`radial-gradient(ellipse ${size} at ${at}% 100%, color-mix(in srgb, currentColor ${alpha}%, transparent), transparent)`)
        }
      }
      left += segmentWidth
    }
    return layers.join(', ')
  }

  /**
   * Take the clear off: every inline style the flight wrote, the mirror's words,
   * and the list the emptied field now calls for.
   */
  function settle() {
    if (frame !== null) frame()
    frame = null
    box.removeAttribute(CLEARING_ATTR)
    mirror.style.transform = ''
    mirror.style.opacity = ''
    mirror.style.filter = ''
    placeholder.style.transform = ''
    placeholder.style.opacity = ''
    placeholder.style.filter = ''
    glow.style.opacity = '0'
    glow.style.background = ''
    travel.textContent = ''
    syncField()
    // The rows follow the field's words: the list the whole catalog calls for
    // is drawn once the words are really gone, not under them on their way out.
    render()
  }

  /** One frame of the clear: the words leaving, the placeholder arriving, the streak's envelope. */
  function step(started: number, strength: number) {
    const total = motionMs('--dsh-claude-duration-clear')
    const half = motionMs('--dsh-claude-duration-clear-text')
    const delay = motionMs('--dsh-claude-duration-clear-delay')
    const fly = Number.parseFloat(motionValue('--dsh-claude-distance-rise'))
    const blur = Number.parseFloat(motionValue('--dsh-claude-blur-soft'))
    frame = requestFrame({
      write(now) {
        frame = null
        const elapsed = now - started
        const out = motionEaseAt('--dsh-claude-ease-settle', Math.min(1, elapsed / half))
        mirror.style.transform = `translateY(${(out * fly).toFixed(1)}px)`
        mirror.style.opacity = (1 - out).toFixed(3)
        mirror.style.filter = `blur(${(out * blur).toFixed(1)}px)`
        placeholder.style.transform = `translateY(${(-fly + out * fly).toFixed(1)}px)`
        placeholder.style.opacity = (0.9 + out * 0.1).toFixed(3)
        placeholder.style.filter = `blur(${(blur - out * blur).toFixed(1)}px)`
        let envelope = 0
        if (elapsed > delay) {
          const through = Math.min(1, (elapsed - delay) / Math.max(1, total - delay))
          envelope = through < GLOW_PEAK_AT ? through / GLOW_PEAK_AT : 1 - (through - GLOW_PEAK_AT) / (1 - GLOW_PEAK_AT)
        }
        glow.style.opacity = (envelope * strength).toFixed(3)
        if (elapsed < total) step(started, strength)
        else settle()
      },
    })
  }

  /**
   * Empty the field and put the insertion point back at its start.
   *
   * A value written by hand leaves the selection where the old words ended, and
   * the drawn caret follows the selection: without this it stands over the
   * placeholder's middle with nothing before it. The write announces itself as
   * an input, which is what the caret measures again on — a programmatic write
   * fires no selectionchange.
   */
  function emptyField() {
    field.value = ''
    field.setSelectionRange(0, 0)
    field.dispatchEvent(new Event('input', { bubbles: true }))
  }

  /**
   * Empty the field, through the dissolve when the reader asked for motion.
   * @returns whether there was a query to clear.
   */
  function clearQuery() {
    const text = field.value
    if (text === '') return false
    const strength = Number.parseFloat(getComputedStyle(box).getPropertyValue(GLOW_STRENGTH_PROPERTY)) || 0
    if (motionReduced() || strength === 0) {
      emptyField()
      settle()
      return true
    }
    box.setAttribute(CLEARING_ATTR, '')
    box.removeAttribute(FILLED_ATTR)
    // The words fly off the mirror, so it keeps them while the field is already
    // empty; the streak is measured from the same words.
    travel.textContent = text
    travel.style.transform = ''
    emptyField()
    glow.style.background = buildGlow(text)
    glow.style.opacity = '0'
    placeholder.style.transform = `translateY(${-Number.parseFloat(motionValue('--dsh-claude-distance-rise'))}px)`
    placeholder.style.opacity = '0.9'
    placeholder.style.filter = `blur(${Number.parseFloat(motionValue('--dsh-claude-blur-soft'))}px)`
    step(performance.now(), strength)
    return true
  }

  /**
   * Take a key the reader pressed into the field, as their own typing does.
   *
   * The write announces itself as an input, which is what the caret measures
   * again on (see emptyField), and the list under the field follows the words.
   */
  function type(text: string) {
    field.value += text
    field.setSelectionRange(field.value.length, field.value.length)
    field.dispatchEvent(new Event('input', { bubbles: true }))
  }

  field.addEventListener('input', () => {
    // A clear owns the mirror while its flight runs: the words leaving are still
    // on it, and syncing the field's own (now empty) words would wipe them.
    if (box.hasAttribute(CLEARING_ATTR)) return
    // Words typed into a field that is still clearing take it back: the flight
    // has nothing to land on once there are new words.
    if (field.value !== '') settle()
    else syncField()
    render()
  })
  field.addEventListener('scroll', () => {
    if (field.value === '') return
    travel.style.transform = field.scrollLeft === 0 ? '' : `translateX(${-field.scrollLeft}px)`
  })
  // The press must not take the focus off the field: the reader clears to type
  // again, and a refocus after the flight would restart the drawn caret.
  const keepFocus = (event: Event) => {
    if (document.activeElement === field) event.preventDefault()
  }
  clear.addEventListener('pointerdown', keepFocus)
  clear.addEventListener('mousedown', keepFocus)
  clear.addEventListener('click', (event) => {
    event.stopPropagation()
    clearQuery()
  })

  return {
    head,
    body,
    render,
    /** Repaint on the next call, whatever the signature says: an opening card, a new language. */
    reset() { painted = '' },
    /** Whether the field holds a query, which the first Escape takes back. */
    hasQuery() { return field.value !== '' },
    /** Whether the field holds the reader's focus, which keeps the card up. */
    focused() { return document.activeElement === field },
    /** Hand the field the reader's focus: a press on the More-models cell asks for it. */
    focus() { field.focus({ preventScroll: true }) },
    /** Take a key the reader pressed into the field, as their own typing does. */
    type,
    clearQuery,
    /** Fold the card's own state away: a query does not outlive the card that held it. */
    forget() {
      emptyField()
      settle()
      releaseHeight()
      // The field's words went with the fold, so the next paint is not a search.
      lastQuery = ''
      painted = ''
    },
    /** Drop the flight with the card: the feature is leaving the page. */
    release() {
      emptyField()
      settle()
      releaseHeight()
      lastQuery = ''
      painted = ''
    },
  }
}
