/**
 * The page the chat-reveal mechanism specs work on: a container carrying the
 * host's streaming mark, the records a change made inside it, and the scanner
 * with the paints it forces counted.
 */
import { STREAMING_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { createRevealScanner } from '@dsh-claude-style/client/mechanisms'
import type { RevealState } from '@dsh-claude-style/client/pure'

/** A container marked as streaming, holding `text`. */
export function streamingContainer(text: string) {
  const element = document.createElement('div')
  element.setAttribute(STREAMING_ATTRIBUTE, '')
  element.textContent = text
  document.body.append(element)
  return element
}

/** The records a change made, taken before the page can settle them. */
export function recordsOf(change: () => void) {
  const observer = new MutationObserver(() => {})
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  change()
  const records = observer.takeRecords()
  observer.disconnect()
  return records
}

/** The records of a change made inside one container, as the engine's route hands them over. */
export function changesOf(container: Element, records: MutationRecord[]) {
  return new Map<Element, MutationRecord[]>([[container, records]])
}

/** The scan, with the paints it forces counted. */
export function scannerFor(state: RevealState) {
  const paints: number[] = []
  const scan = createRevealScanner(state, {
    publishRunColor: () => {},
    paint: () => { paints.push(performance.now()) },
  })
  return { scan, paints }
}
