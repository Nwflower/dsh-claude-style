/* Programmatic clicks use the reader's capture path; this depth lets intent guards distinguish them. */

export let chatFoldToggleDepth = 0

/** Captured in the read phase because presses run after other writes (D40). */
export interface FoldPressReading {
  atBottom: boolean
  heights: ReadonlyMap<Element, number>
}

let pressReading: FoldPressReading | null = null

/** Mark one of this feature's own fold toggles, so the reader-intent guards ignore it. */
export function beginChatFoldToggle(reading: FoldPressReading | null = null) {
  chatFoldToggleDepth += 1
  if (reading !== null) pressReading = reading
}

/** One of this feature's own fold toggles is over. */
export function endChatFoldToggle() {
  chatFoldToggleDepth = Math.max(0, chatFoldToggleDepth - 1)
  if (chatFoldToggleDepth === 0) pressReading = null
}

/** Whether one of this feature's own fold toggles is in flight right now. */
export function isChatFoldToggle() {
  return chatFoldToggleDepth > 0
}

/** Keep every automatic press inside the same reader-intent fence, including failures. */
export function pressChatFoldToggle(control: HTMLElement, reading: FoldPressReading | null = null) {
  beginChatFoldToggle(reading)
  try {
    control.click()
  } finally {
    endChatFoldToggle()
  }
}

/** The reading the press in flight was made with, or null when none was taken. */
export function chatFoldPressReading() {
  return chatFoldToggleDepth > 0 ? pressReading : null
}

interface FoldReaderSubscriber {
  onInteract(event: Event): void
  onCompositionEnd(): void
}

const foldSubscribers = new Set<FoldReaderSubscriber>()

function routeFoldInteract(event: Event) {
  for (const subscriber of foldSubscribers) subscriber.onInteract(event)
}

function routeFoldCompositionEnd() {
  for (const subscriber of foldSubscribers) subscriber.onCompositionEnd()
}

/** Share one capture-phase click/keydown/compositionend hub across fold modules. */
export function subscribeFoldReaderEvents(
  onInteract: (event: Event) => void,
  onCompositionEnd: () => void,
) {
  const entry: FoldReaderSubscriber = { onInteract, onCompositionEnd }
  if (foldSubscribers.size === 0) {
    document.addEventListener('click', routeFoldInteract, true)
    document.addEventListener('keydown', routeFoldInteract, true)
    document.addEventListener('compositionend', routeFoldCompositionEnd, true)
  }
  foldSubscribers.add(entry)
  return () => {
    if (!foldSubscribers.delete(entry) || foldSubscribers.size > 0) return
    document.removeEventListener('click', routeFoldInteract, true)
    document.removeEventListener('keydown', routeFoldInteract, true)
    document.removeEventListener('compositionend', routeFoldCompositionEnd, true)
  }
}
