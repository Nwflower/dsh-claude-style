/**
 * Skin-side section folding for the host's session panel, with automatic
 * rollback when the host's section contract changes (D113).
 *
 * The host renders every section as `<section data-session-panel-section="<id>">`
 * with two children: a title row containing a direct `<h2>` and a body wrapper
 * containing `[data-slot]`. While that contract holds on every section in the
 * panel, the skin marks each title row as a toggle, hides folded bodies by CSS
 * (leaving `[data-slot]` populated so the host's empty-section rule never fires)
 * and persists the reader's choices. The moment any section diverges — native
 * folding attributes, a `<details>` element, a native header control outside
 * `section.actions`, or a different child layout — the skin strips its marks
 * and yields the panel back to the host.
 */
import * as React from 'react'
import {
  SESSION_PANEL_ACTIONS_SLOT_SELECTOR,
  SESSION_PANEL_SECTION_ATTRIBUTE,
  SESSION_PANEL_SECTION_SELECTOR,
  SESSION_PANEL_SELECTOR,
  SLOT_ANCHOR_SELECTOR,
} from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import {
  SESSION_PANEL_FOLDABLE_ATTR,
  SESSION_PANEL_FOLDED_ATTR,
  SESSION_PANEL_FOLD_HEAD_ATTR,
} from '../../constants'

const INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, summary, [role="button"]'
const NATIVE_CONTROL_SELECTOR = 'button, summary, [aria-expanded]'
const NATIVE_FOLD_ATTRS = [
  'open',
  'aria-expanded',
  'data-expanded',
  'data-collapsed',
  'data-folded',
  'data-open',
  'data-session-panel-folded',
] as const

export const SECTION_FOLD_STORAGE_KEY = 'dsh-claude-style.sessionPanelFolded'
const STORAGE_KEY = SECTION_FOLD_STORAGE_KEY
const DEFAULT_FOLDED = new Set(['claude-style-stats', 'claude-style-tokens'])

let foldActive = true
let activeStored: Record<string, boolean> = {}
const listeners = new Set<() => void>()

function notifyListeners() {
  for (const listener of listeners) listener()
}

function setFoldActive(next: boolean) {
  if (foldActive === next) return
  foldActive = next
  notifyListeners()
}

function subscribeFoldState(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Whether the skin's section folding is currently active rather than yielded to the host. */
export function isSectionFoldActive() {
  return foldActive
}

/** React subscription to the active/yielded state, read by `section.actions` summary readings. */
export function useSectionFoldActive() {
  return React.useSyncExternalStore(subscribeFoldState, () => foldActive, () => foldActive)
}

/** Whether section `id` is currently folded under active skin folding (D113). */
export function useSectionFolded(id: string) {
  const snapshot = () => foldActive && isFolded(id, activeStored)
  return React.useSyncExternalStore(subscribeFoldState, snapshot, snapshot)
}

function readStoredFolded(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null || raw === '') return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const result: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'boolean') result[key] = value
    }
    return result
  } catch {
    // Corrupted or restricted storage falls back to defaults without breaking the panel (D12).
    return {}
  }
}

function writeStoredFolded(map: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Restricted storage keeps in-memory folding working without throwing on click (D12).
  }
}

function isFolded(id: string, stored: Record<string, boolean>) {
  if (Object.prototype.hasOwnProperty.call(stored, id)) return stored[id] === true
  return DEFAULT_FOLDED.has(id)
}

/**
 * Verify that `section` still matches the host's two-child head/body contract
 * and has no native folding controls or attributes (D113).
 */
export function probeSectionContract(section: Element): boolean {
  if (section.tagName !== 'SECTION') return false
  for (const attr of NATIVE_FOLD_ATTRS) {
    if (section.hasAttribute(attr)) return false
  }
  if (section.children.length !== 2) return false
  const head = section.children[0]
  const body = section.children[1]
  if (head === undefined || body === undefined) return false
  if (head.tagName === 'BUTTON' || head.tagName === 'SUMMARY') return false
  if (head.hasAttribute('aria-expanded') && !head.hasAttribute(SESSION_PANEL_FOLD_HEAD_ATTR)) return false
  let hasHeading = false
  for (const child of head.children) {
    if (child.tagName === 'H2') {
      hasHeading = true
      break
    }
  }
  if (!hasHeading) return false
  for (const control of head.querySelectorAll(NATIVE_CONTROL_SELECTOR)) {
    if (control.closest(SESSION_PANEL_ACTIONS_SLOT_SELECTOR) === null) return false
  }
  if (body.querySelector(SLOT_ANCHOR_SELECTOR) === null) return false
  return true
}

function stripSection(section: Element) {
  section.removeAttribute(SESSION_PANEL_FOLDABLE_ATTR)
  section.removeAttribute(SESSION_PANEL_FOLDED_ATTR)
  const head = section.firstElementChild
  if (head !== null && head.hasAttribute(SESSION_PANEL_FOLD_HEAD_ATTR)) {
    head.removeAttribute(SESSION_PANEL_FOLD_HEAD_ATTR)
    head.removeAttribute('role')
    head.removeAttribute('tabindex')
    head.removeAttribute('aria-expanded')
  }
}

function stripPanel(panel: Element) {
  for (const section of panel.querySelectorAll(SESSION_PANEL_SECTION_SELECTOR)) stripSection(section)
}

function applySection(section: Element, folded: boolean) {
  setAttributeIfChanged(section, SESSION_PANEL_FOLDABLE_ATTR, '')
  if (folded) setAttributeIfChanged(section, SESSION_PANEL_FOLDED_ATTR, '')
  else section.removeAttribute(SESSION_PANEL_FOLDED_ATTR)
  const head = section.firstElementChild
  if (head === null) return
  setAttributeIfChanged(head, SESSION_PANEL_FOLD_HEAD_ATTR, '')
  setAttributeIfChanged(head, 'role', 'button')
  setAttributeIfChanged(head, 'tabindex', '0')
  setAttributeIfChanged(head, 'aria-expanded', folded ? 'false' : 'true')
}

/**
 * Attach section-fold observation and interaction to all mounted host session
 * panels. Returns a disposer that removes all listeners and marks.
 */
export function installSectionFold() {
  const stored = readStoredFolded()
  activeStored = stored
  notifyListeners()

  let watchedPanels: HTMLElement[] = []
  let stopPanelWatches: (() => void)[] = []

  function clearPanelWatches() {
    for (const stop of stopPanelWatches) stop()
    stopPanelWatches = []
    watchedPanels = []
  }

  /** Skip batches consisting solely of the skin's own `aria-expanded` writes on marked fold headers. */
  function isSelfToggleBatch(records: MutationRecord[]) {
    for (const record of records) {
      if (record.type !== 'attributes' || record.attributeName !== 'aria-expanded') return false
      const target = record.target
      if (!(target instanceof Element) || !target.hasAttribute(SESSION_PANEL_FOLD_HEAD_ATTR)) return false
      const section = target.parentElement
      const id = section?.getAttribute(SESSION_PANEL_SECTION_ATTRIBUTE) ?? ''
      if (id === '') return false
      const expected = isFolded(id, stored) ? 'false' : 'true'
      if (target.getAttribute('aria-expanded') !== expected) return false
    }
    return true
  }

  function syncPanels() {
    const allPanels = panels.all()
    const changed = allPanels.length !== watchedPanels.length || allPanels.some((panel, at) => panel !== watchedPanels[at])
    if (changed) {
      clearPanelWatches()
      watchedPanels = [...allPanels]
      // Scope mutation observation strictly to mounted panels so chat-stream
      // mutations across document.body never wake section folding (D40).
      stopPanelWatches = watchedPanels.map(panel => subscribeMutations(panel, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [...NATIVE_FOLD_ATTRS, SESSION_PANEL_SECTION_ATTRIBUTE],
        skipQuiet: true,
      }, records => {
        if (!isSelfToggleBatch(records)) syncPanels()
      }))
    }
    if (allPanels.length === 0) return
    const sectionsByPanel: Element[][] = []
    for (const panel of allPanels) {
      const sections = [...panel.querySelectorAll(SESSION_PANEL_SECTION_SELECTOR)]
      if (sections.length === 0) continue
      if (sections.some(section => !probeSectionContract(section))) {
        for (const each of allPanels) stripPanel(each)
        setFoldActive(false)
        return
      }
      sectionsByPanel.push(sections)
    }
    setFoldActive(true)
    for (const sections of sectionsByPanel) {
      for (const section of sections) {
        const id = section.getAttribute(SESSION_PANEL_SECTION_ATTRIBUTE)
        if (id === null || id === '') continue
        applySection(section, isFolded(id, stored))
      }
    }
  }

  function toggleFromTarget(target: EventTarget | null) {
    if (!foldActive || !(target instanceof Element)) return false
    const panel = target.closest(SESSION_PANEL_SELECTOR)
    if (panel === null) return false
    const section = target.closest(SESSION_PANEL_SECTION_SELECTOR)
    if (section === null || !panel.contains(section)) return false
    const head = section.firstElementChild
    if (head === null || !head.hasAttribute(SESSION_PANEL_FOLD_HEAD_ATTR) || !head.contains(target)) return false
    const interactive = target.closest(INTERACTIVE_SELECTOR)
    if (interactive !== null && interactive !== head && head.contains(interactive)) return false
    const id = section.getAttribute(SESSION_PANEL_SECTION_ATTRIBUTE)
    if (id === null || id === '') return false
    const next = !isFolded(id, stored)
    stored[id] = next
    writeStoredFolded(stored)
    applySection(section, next)
    notifyListeners()
    return true
  }

  function onClick(event: MouseEvent) {
    if (event.button !== 0 || event.defaultPrevented) return
    toggleFromTarget(event.target)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.defaultPrevented) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (toggleFromTarget(event.target)) event.preventDefault()
  }

  const panels = observeMatches<HTMLElement>(SESSION_PANEL_SELECTOR, syncPanels)
  document.addEventListener('click', onClick)
  document.addEventListener('keydown', onKeyDown)
  syncPanels()

  return () => {
    document.removeEventListener('click', onClick)
    document.removeEventListener('keydown', onKeyDown)
    clearPanelWatches()
    for (const panel of panels.all()) stripPanel(panel)
    panels.release()
    activeStored = {}
    setFoldActive(true)
    notifyListeners()
  }
}
