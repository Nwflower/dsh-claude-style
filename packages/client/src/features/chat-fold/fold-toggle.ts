/**
 * The bookkeeping for fold toggles this feature presses itself.
 *
 * The automatic collapse of a thinking row and the automatic open and close
 * of a process group both dispatch real clicks: HTMLElement.click() takes
 * the same capture path as the reader's own press, so each module's
 * "the reader touched it, he wins" guard cannot tell the two apart. Silencing
 * it would cut the reader's streaming text off mid-word, so it is declared
 * here instead and read by both fold modules and the follow guard.
 */
/** How deep this feature's own fold presses are nested. */
export let chatFoldToggleDepth = 0

/** Mark one of this feature's own fold toggles, so the reader-intent guards ignore it. */
export function beginChatFoldToggle() {
  chatFoldToggleDepth += 1
}

/** One of this feature's own fold toggles is over. */
export function endChatFoldToggle() {
  chatFoldToggleDepth = Math.max(0, chatFoldToggleDepth - 1)
}

/** Whether one of this feature's own fold toggles is in flight right now. */
export function isChatFoldToggle() {
  return chatFoldToggleDepth > 0
}
