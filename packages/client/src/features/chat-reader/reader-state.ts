import { useCallback, useSyncExternalStore } from 'react'
import { motionReduced, subscribePrefs } from '../../core/prefs'
import { readStepDisplayMode, subscribeStepDisplay } from '../../core/step-display'
import type { StepDisplayMode } from '../../core/step-display'

/**
 * State the reading view keeps beside the host's (D57): whether it may move,
 * how much of a turn's work the host's work-details row asks for, and the
 * reader's own open or closed choices, per session so that switching tabs and
 * back keeps them.
 */

/** Whether the view animates: the plugin's Animation setting resolved against the system's (D26). */
export function useMotion(): boolean {
  return useSyncExternalStore(subscribePrefs, () => !motionReduced())
}

/** The host's work-details mode (core/step-display.ts): the shape every turn's process is drawn in. */
export function useStepDisplay(): StepDisplayMode {
  return useSyncExternalStore(subscribeStepDisplay, readStepDisplayMode)
}

/** session id → choice key → open. */
const choices = new Map<string, Readonly<Record<string, boolean>>>()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The reader's choice for one disclosure of a session, and its setter; undefined until they made one. */
export function useChoice(sessionId: string, key: string): [boolean | undefined, (open: boolean) => void] {
  const value = useSyncExternalStore(subscribe, () => choices.get(sessionId)?.[key])
  const set = useCallback((open: boolean) => {
    choices.set(sessionId, { ...choices.get(sessionId), [key]: open })
    for (const listener of listeners) listener()
  }, [sessionId, key])
  return [value, set]
}

/**
 * Counts the copy changes the scheduler announces (the copy document arriving,
 * the locale or the preferences changing). Memoized parts of the view read it,
 * so text computed before the change is computed again.
 */
let copyRevision = 0
const copyListeners = new Set<() => void>()

export function bumpCopyRevision() {
  copyRevision += 1
  for (const listener of copyListeners) listener()
}

export function useCopyRevision(): number {
  return useSyncExternalStore(subscribeCopy, () => copyRevision)
}

function subscribeCopy(listener: () => void) {
  copyListeners.add(listener)
  return () => {
    copyListeners.delete(listener)
  }
}

/** Forget every choice: the view is leaving the page. */
export function clearChoices() {
  choices.clear()
  for (const listener of listeners) listener()
}
