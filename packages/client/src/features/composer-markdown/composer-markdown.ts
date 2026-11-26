/**
 * The draft renders in place (D115): each Markdown block the selection does
 * not touch is drawn rendered over its own source, and the block under the
 * caret shows its source. Nothing is written into the host's editor: a
 * generated sheet hides and sizes the source lines by position, and each
 * rendered block follows the first line of its source through a CSS anchor.
 */
import { COMPOSER_CARD_SELECTOR, COMPOSER_COMPOSING_ATTRIBUTE, COMPOSER_INPUT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeSizeGroup, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { findComposerInput, observeComposerCards } from '@dsh-claude-style/engine/host'
import { mountStylesheet, rewriteStylesheet } from '@dsh-claude-style/engine/stylesheet'
import { COMPOSER_LIVE_ATTR, COMPOSER_LIVE_PLUGIN_CSS, COMPOSER_LIVE_STYLE_ID, PACKAGE_NAME } from '../../constants'
import { renderBlock, splitBlocks } from './blocks'
import { lineAt, readDraftLines } from './lines'
import type { DraftLine } from './lines'

const LAYER_CLASS = 'dsh-claude-composer-live'
const BLOCK_CLASS = 'dsh-claude-composer-live-block'
const LAYER_SELECTOR = '.' + LAYER_CLASS

/** One rendered block, kept while a block with the same source stands in the draft. */
interface BlockView {
  element: HTMLElement
  /** The rendered height the source's first line is sized to; null until measured. */
  height: number | null
}

/** Where one rendered block sits in the source, as the generated rules select it. */
interface PlacedBlock {
  view: BlockView
  anchor: string
  /** The first source line, which keeps its box and carries the anchor. */
  first: string
  /** The rest of the block's source, taken out of the layout. */
  hidden: string[]
}

interface CardState {
  id: number
  layer: HTMLElement
  /** The input whose size is watched for this card, while it stands in the card. */
  input: HTMLElement | null
  /** Per card: views by source and occurrence, replaced on every render of this card. */
  views: Map<string, BlockView>
  /** Serialized reference-link definitions at the last render; a change invalidates cached views. */
  links: string
  placed: PlacedBlock[]
}

/** What one frame read of a card, for its write. */
interface DraftRead {
  input: HTMLElement
  lines: DraftLine[]
  composing: boolean
  /** The selected line range while the input has focus, or null. */
  active: [number, number] | null
  /** The input's own font, which the field sets apart from the layer around it. */
  font: string
}

function readDraft(input: HTMLElement): DraftRead {
  const lines = readDraftLines(input)
  let active: [number, number] | null = null
  const selection = document.getSelection()
  if (input.contains(document.activeElement) && selection !== null && selection.anchorNode !== null && selection.focusNode !== null) {
    const anchor = lineAt(input, lines, selection.anchorNode, selection.anchorOffset)
    const focus = lineAt(input, lines, selection.focusNode, selection.focusOffset)
    if (anchor !== null && focus !== null) active = [Math.min(anchor, focus), Math.max(anchor, focus)]
  }
  return { input, lines, composing: input.hasAttribute(COMPOSER_COMPOSING_ATTRIBUTE), active, font: getComputedStyle(input).font }
}

/** The selector for one child of one paragraph of this card's input. */
function childSelector(card: number, paragraph: number, position: number) {
  return `[${COMPOSER_LIVE_ATTR}="${card}"] ${COMPOSER_INPUT_SELECTOR} > :nth-child(${paragraph}) > :nth-child(${position})`
}

/** The rules for every card, from the blocks placed at the last render and the heights measured since. */
function sheetText(states: Iterable<CardState>) {
  const rules: string[] = []
  for (const state of states) {
    for (const block of state.placed) {
      const height = block.view.height === null ? '' : ` block-size: ${block.view.height}px;`
      // The first line keeps one box the size of the rendering, so the caret
      // and the click that reveal the source land on it.
      rules.push(`${block.first} { display: inline-block; inline-size: 100%;${height} vertical-align: top; overflow: hidden; color: transparent; anchor-name: ${block.anchor}; }`)
      rules.push(`${block.first}::spelling-error, ${block.first}::grammar-error { text-decoration-line: none; }`)
      if (block.hidden.length > 0) rules.push(`${block.hidden.join(', ')} { display: none; }`)
    }
  }
  return rules.join('\n')
}

/** Render each composer card's draft in place. */
export function install() {
  let stopped = false
  let nextCard = 0
  /** Per interface: each card's state lives until that card leaves or this feature is torn down. */
  const states = new Map<HTMLElement, CardState>()
  /** Per interface: cards coalesced into the next frame, emptied by its write or by teardown. */
  const pending = new Set<HTMLElement>()
  /** Per interface: drafts read for the next frame, emptied by its write or by teardown. */
  const reads = new Map<HTMLElement, DraftRead>()
  /** Per interface: each rendered element's view, kept while the view stands in its card. */
  const viewsByElement = new Map<Element, BlockView>()
  let cancelFrame: (() => void) | null = null
  let cancelSheetFrame: (() => void) | null = null
  let sheet = ''

  // Plain generated text, read by no part vocabulary: the engine mounts it as it is.
  const stopSheet = mountStylesheet({ id: COMPOSER_LIVE_STYLE_ID, text: sheet, packageName: PACKAGE_NAME, pluginCss: COMPOSER_LIVE_PLUGIN_CSS })
  const writeSheet = () => {
    const next = sheetText(states.values())
    if (next === sheet) return
    if (!rewriteStylesheet(COMPOSER_LIVE_STYLE_ID, sheet, next)) throw new Error('composer-markdown: the line sheet left the page')
    sheet = next
  }
  const scheduleSheet = () => {
    if (stopped || cancelSheetFrame !== null) return
    cancelSheetFrame = requestFrame({
      write() {
        cancelSheetFrame = null
        writeSheet()
      },
    })
  }

  // Defer the sheet update to the frame write phase: writing inside a
  // ResizeObserver callback resizes the shallower input while inputSizes and
  // the caret also observe it, producing an undelivered-notification error.
  const sizes = observeSizeGroup(entries => {
    let changed = false
    for (const entry of entries) {
      const view = viewsByElement.get(entry.target)
      const box = entry.borderBoxSize[0]
      if (view === undefined || box === undefined) continue
      const height = Math.ceil(box.blockSize)
      if (view.height === height) continue
      view.height = height
      changed = true
    }
    if (changed) scheduleSheet()
  })

  // A field that changes size without an edit (a new font scale, a narrower
  // column) may have changed the font the layer copies.
  const inputSizes = observeSizeGroup(entries => {
    for (const entry of entries) {
      const card = entry.target.closest(COMPOSER_CARD_SELECTOR)
      if (card instanceof HTMLElement) schedule(card)
    }
  })

  const dropView = (view: BlockView) => {
    sizes.delete(view.element)
    viewsByElement.delete(view.element)
    view.element.remove()
  }

  const remove = (card: HTMLElement) => {
    const state = states.get(card)
    if (state === undefined) return
    for (const view of state.views.values()) dropView(view)
    state.layer.remove()
    if (state.input !== null) inputSizes.delete(state.input)
    card.removeAttribute(COMPOSER_LIVE_ATTR)
    states.delete(card)
  }

  const mount = (card: HTMLElement) => {
    const layer = document.createElement('div')
    layer.className = LAYER_CLASS
    layer.setAttribute('aria-hidden', 'true')
    const state: CardState = { id: ++nextCard, layer, input: null, views: new Map(), links: '', placed: [] }
    states.set(card, state)
    card.setAttribute(COMPOSER_LIVE_ATTR, String(state.id))
    return state
  }

  const render = (card: HTMLElement, read: DraftRead) => {
    const grow = read.input.parentElement
    if (!cards.all().includes(card) || !card.contains(read.input) || grow === null) {
      remove(card)
      return
    }
    // A composition in flight keeps every block as it stands: moving the
    // input's layout under it would drop the letters not yet committed.
    if (read.composing) return
    const state = states.get(card) ?? mount(card)
    if (state.layer.parentElement !== grow || grow.lastElementChild !== state.layer) grow.append(state.layer)
    if (state.input !== read.input) {
      if (state.input !== null) inputSizes.delete(state.input)
      state.input = read.input
      inputSizes.add(read.input)
    }
    if (state.layer.style.font !== read.font) state.layer.style.font = read.font

    const { lines } = read
    const { blocks, links } = splitBlocks(lines.map(line => line.text))
    const linksKey = Object.keys(links).length === 0 ? '' : JSON.stringify(links)
    const reuseViews = linksKey === state.links
    const views = new Map<string, BlockView>()
    const placed: PlacedBlock[] = []
    const seen = new Map<string, number>()
    for (const block of blocks) {
      const own = lines.slice(block.first, block.last + 1)
      const head = own[0]
      if (head === undefined || head.items.length !== 1 || !own.every(line => line.plain)) continue
      if (read.active !== null && read.active[0] <= block.last && read.active[1] >= block.first) continue
      const occurrence = seen.get(block.token.raw) ?? 0
      seen.set(block.token.raw, occurrence + 1)
      const key = occurrence + '\u0000' + block.token.raw
      let view = reuseViews ? state.views.get(key) : undefined
      if (view === undefined) {
        const content = renderBlock(block.token, links)
        if (content === null) continue
        const element = document.createElement('div')
        element.className = BLOCK_CLASS
        element.append(content)
        view = { element, height: null }
        viewsByElement.set(element, view)
        sizes.add(element)
      }
      state.views.delete(key)
      views.set(key, view)
      const anchor = `--dsh-claude-live-${state.id}-${placed.length}`
      view.element.style.setProperty('position-anchor', anchor)
      const hidden: string[] = []
      own.forEach((line, index) => {
        if (index > 0) for (const item of line.items) hidden.push(childSelector(state.id, line.paragraph, item))
        if (index < own.length - 1 && line.terminator !== null) hidden.push(childSelector(state.id, line.paragraph, line.terminator))
      })
      placed.push({ view, anchor, first: childSelector(state.id, head.paragraph, head.items[0]!), hidden })
    }
    for (const view of state.views.values()) dropView(view)
    state.views = views
    state.links = linksKey
    state.placed = placed
    const order = placed.map(block => block.view.element)
    if (order.some((element, index) => state.layer.children[index] !== element) || state.layer.children.length !== order.length) state.layer.replaceChildren(...order)
  }

  const schedule = (card: HTMLElement) => {
    if (stopped) return
    pending.add(card)
    if (cancelFrame !== null) return
    cancelFrame = requestFrame({
      read() {
        for (const card of pending) {
          const input = findComposerInput(card)
          if (input !== null) reads.set(card, readDraft(input))
        }
      },
      write() {
        cancelFrame = null
        const batch = [...pending]
        pending.clear()
        for (const card of batch) {
          const read = reads.get(card)
          if (read === undefined) remove(card)
          else render(card, read)
        }
        reads.clear()
        writeSheet()
      },
    })
  }

  const scheduleAll = () => {
    for (const card of cards.all()) schedule(card)
    for (const card of states.keys()) schedule(card)
  }

  const cards = observeComposerCards(scheduleAll)
  const stopMutations = subscribeMutations(document.body, { childList: true, subtree: true, characterData: true }, records => {
    for (const record of records) {
      const target = record.target instanceof Element ? record.target : record.target.parentElement
      if (target === null || target.closest(LAYER_SELECTOR) !== null) continue
      const card = target.closest(COMPOSER_CARD_SELECTOR)
      if (card instanceof HTMLElement) schedule(card)
    }
  })
  const onEdit = (event: Event) => {
    if (!(event.target instanceof Element)) return
    const card = event.target.closest(COMPOSER_INPUT_SELECTOR)?.closest(COMPOSER_CARD_SELECTOR)
    if (card instanceof HTMLElement) schedule(card)
  }
  // The caret moving between blocks and focus leaving the input change which
  // blocks show their source without any edit to the draft.
  document.addEventListener('selectionchange', scheduleAll)
  document.addEventListener('focusin', onEdit, true)
  document.addEventListener('focusout', onEdit, true)
  document.addEventListener('input', onEdit, true)
  document.addEventListener('compositionend', onEdit, true)
  scheduleAll()

  return () => {
    stopped = true
    if (cancelFrame !== null) cancelFrame()
    if (cancelSheetFrame !== null) cancelSheetFrame()
    stopMutations()
    cards.release()
    document.removeEventListener('selectionchange', scheduleAll)
    document.removeEventListener('focusin', onEdit, true)
    document.removeEventListener('focusout', onEdit, true)
    document.removeEventListener('input', onEdit, true)
    document.removeEventListener('compositionend', onEdit, true)
    for (const card of [...states.keys()]) remove(card)
    sizes.stop()
    inputSizes.stop()
    stopSheet()
    pending.clear()
    reads.clear()
  }
}
