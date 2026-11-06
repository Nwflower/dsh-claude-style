/**
 * @capability manual-unread
 * @features manual-unread
 * @risk Marking unread replaces native row controls, consumes foreign accessibility descriptions, or draws a marker over the row's trailing menu in either reading direction.
 */
import { afterEach, beforeEach, expect, test } from 'vitest'
import { MANUAL_UNREAD_SHEET, UnreadRowMark, unreadRowSessionId } from '@dsh-claude-style/client/pure'
import { DARK_THEME_ATTRIBUTE, SESSION_ROW_KEY_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { literalThemeSheet } from '../../fixtures/theme-tokens'
import { surfaceAttribute, surfaceSelector } from '../../fixtures/surface'

const ROOT = surfaceAttribute('skin.root')
const PART = surfaceAttribute('skin.part')
const ROW = `[${surfaceAttribute('manual-unread.row')}]`
const MARKER = surfaceSelector('manual-unread.marker')
const DESCRIPTION = 'unread-description'
const LABEL_COLOR = 'rgb(37, 49, 61)'
const BRAND_COLOR = 'rgb(194, 87, 56)'
const cleanups: (() => void)[] = []
let originalRoot: string | null = null

/** The host supplies layout, native state and its drop indicator at the boundary. */
const HOST_SHEET = `
.host-unread-row {
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 280px;
  height: 40px;
  padding: 4px 8px;
  gap: 8px;
}
.host-unread-row [role="heading"] { flex: 1; font-weight: 400; }
.host-unread-row [role="status"] { width: 8px; height: 8px; background: rgb(43, 145, 87); }
.host-unread-row button { width: 24px; height: 24px; padding: 0; }
.host-unread-row.host-drop-before::before {
  content: "";
  position: absolute;
  inset: 2px;
  border: 1px dashed rgb(19, 97, 173);
  pointer-events: none;
}
`

function mountSheet(text: string): void {
  const sheet = document.createElement('style')
  sheet.textContent = text
  document.head.append(sheet)
  cleanups.push(() => sheet.remove())
}

beforeEach(() => {
  originalRoot = document.body.getAttribute(ROOT)
  document.body.setAttribute(ROOT, '')
  mountSheet(HOST_SHEET)
  mountSheet(literalThemeSheet(`body[${ROOT}]`, DARK_THEME_ATTRIBUTE))
  mountSheet(MANUAL_UNREAD_SHEET)
})

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
  if (originalRoot === null) document.body.removeAttribute(ROOT)
  else document.body.setAttribute(ROOT, originalRoot)
})

function hostRow(direction: 'ltr' | 'rtl' = 'ltr') {
  const row = document.createElement('div')
  row.className = 'host-unread-row'
  row.setAttribute(PART, 'session-row')
  row.dir = direction
  row.dataset.nativeState = 'running'
  row.classList.add('host-drop-before')
  row.setAttribute(SESSION_ROW_KEY_ATTRIBUTE, 'session:opaque:session/path with space')
  row.style.setProperty('--dsw-alias-label-primary', LABEL_COLOR)
  row.style.setProperty('--dsw-alias-brand-primary', BRAND_COLOR)
  const title = document.createElement('span')
  title.setAttribute(PART, 'row-title')
  title.setAttribute('role', 'heading')
  title.textContent = 'Native conversation'
  const status = document.createElement('span')
  status.setAttribute('role', 'status')
  status.setAttribute('aria-label', 'Running')
  const menu = document.createElement('button')
  menu.textContent = '⋯'
  menu.type = 'button'
  row.append(title, status, menu)
  document.body.append(row)
  const mark = new UnreadRowMark(row, DESCRIPTION)
  cleanups.push(() => { mark.dispose(); row.remove() })
  return { row, title, status, menu, mark, native: [title, status, menu] }
}

function markerOf(row: HTMLElement): HTMLElement {
  const marker = row.querySelector<HTMLElement>(MARKER)
  if (marker === null) throw new Error('Unread marker is missing')
  return marker
}

function tokens(row: HTMLElement): string[] {
  return (row.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
}

function mutations(row: HTMLElement, action: () => void): MutationRecord[] {
  const observer = new MutationObserver(() => {})
  observer.observe(row, { subtree: true, childList: true, attributes: true, characterData: true })
  try {
    action()
    return observer.takeRecords()
  } finally {
    observer.disconnect()
  }
}

function nativeAppearance(row: HTMLElement, status: HTMLElement) {
  const drop = getComputedStyle(row, '::before')
  return {
    content: drop.content,
    inset: drop.inset,
    border: drop.border,
    position: drop.position,
    pointerEvents: drop.pointerEvents,
    statusColor: getComputedStyle(status).backgroundColor,
    state: row.dataset.nativeState,
    drop: row.classList.contains('host-drop-before'),
  }
}

test('session identities preserve the complete opaque tail without trimming or decoding', () => {
  const row = document.createElement('div')
  for (const id of ['opaque:tail/path with space', ' ', '%61', 'a:b:c', '/path/', ' Mixed Case ']) {
    row.setAttribute(SESSION_ROW_KEY_ATTRIBUTE, `session:${id}`)
    expect(unreadRowSessionId(row)).toBe(id)
  }
})

test('missing, empty and non-session keys do not identify conversations', () => {
  const row = document.createElement('div')
  expect(unreadRowSessionId(row)).toBeNull()
  for (const key of ['', 'session:', 'workspace:opaque', 'result:opaque', 'Session:opaque', 'session']) {
    row.setAttribute(SESSION_ROW_KEY_ATTRIBUTE, key)
    expect(unreadRowSessionId(row)).toBeNull()
  }
})

test('native title, status and menu keep their identities, order and event listeners', () => {
  const { row, mark, native } = hostRow()
  const clicked: number[] = []
  native.forEach((node, index) => node.addEventListener('click', () => clicked.push(index)))
  for (const unread of [true, false, true]) {
    const changes = mutations(row, () => mark.update(unread))
    for (const change of changes) {
      for (const node of [...change.addedNodes, ...change.removedNodes]) expect(native).not.toContain(node)
    }
    native.forEach((node, index) => {
      expect(row.children[index]).toBe(node)
      expect(node.parentElement).toBe(row)
      node.click()
    })
  }
  mark.dispose()
  expect(Array.from(row.children)).toEqual(native)
  expect(clicked).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2])
})

test('the single owned marker is a hidden span distinct from native controls', () => {
  const { row, mark, native } = hostRow()
  mark.update(true)
  const marker = markerOf(row)
  expect(row.matches(ROW)).toBe(true)
  expect(row.querySelectorAll(MARKER)).toHaveLength(1)
  expect(marker.tagName).toBe('SPAN')
  expect(marker.parentElement).toBe(row)
  expect(marker.getAttribute('aria-hidden')).toBe('true')
  expect(native).not.toContain(marker)
  expect(tokens(row)).toEqual([DESCRIPTION])
})

test('repeated unread updates preserve marker identity without any DOM mutation', () => {
  const { row, mark } = hostRow()
  mark.update(true)
  const marker = markerOf(row)
  const changes = mutations(row, () => {
    mark.update(true)
    mark.update(true)
  })
  expect(changes).toEqual([])
  expect(row.querySelectorAll(MARKER)).toHaveLength(1)
  expect(markerOf(row)).toBe(marker)
})

test('native hover may replace description tokens and clearing removes only the owned token', () => {
  const { row, mark } = hostRow()
  row.setAttribute('aria-describedby', 'native-title native-status')
  mark.update(true)
  expect(tokens(row)).toEqual(['native-title', 'native-status', DESCRIPTION])
  row.setAttribute('aria-describedby', `native-hover ${DESCRIPTION} native-live ${DESCRIPTION}`)
  mark.update(true)
  expect(tokens(row)).toEqual(['native-hover', 'native-live', DESCRIPTION])
  row.setAttribute('aria-describedby', `native-fresh ${DESCRIPTION} native-status`)
  mark.dispose()
  expect(tokens(row)).toEqual(['native-fresh', 'native-status'])
  expect(row.matches(ROW)).toBe(false)
  expect(row.querySelector(MARKER)).toBeNull()
  expect(mutations(row, () => { mark.dispose(); mark.dispose() })).toEqual([])
  expect(tokens(row)).toEqual(['native-fresh', 'native-status'])
})

test('clearing and repeated disposal remove an owned-only description without an empty attribute', () => {
  const { row, mark } = hostRow()
  mark.update(true)
  mark.update(false)
  expect(row.getAttribute('aria-describedby')).toBeNull()
  expect(row.querySelector(MARKER)).toBeNull()
  expect(mutations(row, () => { mark.dispose(); mark.dispose(); mark.update(false) })).toEqual([])
  expect(row.matches(ROW)).toBe(false)
})

test('the actual stylesheet emphasizes the native title and reads the supplied theme colors', () => {
  const { row, title, mark } = hostRow()
  expect(getComputedStyle(title).fontWeight).toBe('400')
  mark.update(true)
  const marker = markerOf(row)
  const appearance = getComputedStyle(marker)
  expect(getComputedStyle(title).fontWeight).toBe('600')
  expect(getComputedStyle(title).color).toBe(LABEL_COLOR)
  expect(appearance.backgroundColor).toBe('rgb(42, 120, 214)')
  expect(appearance.backgroundColor).not.toBe(BRAND_COLOR)
  expect(appearance.pointerEvents).toBe('none')
  expect(appearance.borderRadius).toBe('50%')
  mark.update(false)
  expect(getComputedStyle(title).fontWeight).toBe('400')
})

test.each(['ltr', 'rtl'] as const)('the %s marker occupies inline-end padding outside native controls', direction => {
  const { row, mark, native } = hostRow(direction)
  mark.update(true)
  const box = row.getBoundingClientRect()
  const marker = markerOf(row).getBoundingClientRect()
  const content = native.map(node => node.getBoundingClientRect())
  const padding = Number.parseFloat(getComputedStyle(row).paddingInlineEnd)
  expect(marker.width).toBeGreaterThan(0)
  expect(marker.height).toBe(marker.width)
  expect(padding).toBeGreaterThanOrEqual(marker.width)
  if (direction === 'ltr') {
    expect(marker.left).toBeGreaterThan(box.left + box.width / 2)
    expect(marker.right).toBeLessThanOrEqual(box.right)
    expect(box.right - marker.left).toBeLessThanOrEqual(padding)
    expect(Math.max(...content.map(rect => rect.right))).toBeLessThanOrEqual(marker.left)
  } else {
    expect(marker.right).toBeLessThan(box.left + box.width / 2)
    expect(marker.left).toBeGreaterThanOrEqual(box.left)
    expect(marker.right - box.left).toBeLessThanOrEqual(padding)
    expect(Math.min(...content.map(rect => rect.left))).toBeGreaterThanOrEqual(marker.right)
  }
})

test('an active native status has visual priority without deleting the persisted reminder', () => {
  const { row, title, status, mark } = hostRow()
  const native = nativeAppearance(row, status)
  const statusAttribute = surfaceAttribute('sidebar-status.row')
  mark.update(true)
  const marker = markerOf(row)
  row.setAttribute(statusAttribute, 'active')
  expect(getComputedStyle(marker).display).toBe('none')
  expect(row.matches(ROW)).toBe(true)
  expect(tokens(row)).toEqual([DESCRIPTION])
  expect(getComputedStyle(title).fontWeight).toBe('600')
  expect(nativeAppearance(row, status)).toEqual(native)
  row.setAttribute(statusAttribute, 'empty')
  expect(getComputedStyle(marker).display).not.toBe('none')
  expect(markerOf(row)).toBe(marker)
  mark.dispose()
  expect(row.getAttribute(statusAttribute)).toBe('empty')
  expect(nativeAppearance(row, status)).toEqual(native)
})

test('opening the native row menu yields the dot position without deleting its reminder', () => {
  const { row, title, status, menu, mark } = hostRow()
  const initial = nativeAppearance(row, status)
  row.setAttribute(surfaceAttribute('sidebar-status.row'), 'empty')
  mark.update(true)
  const marker = markerOf(row)
  expect(getComputedStyle(marker).display).not.toBe('none')
  row.setAttribute(PART, 'session-row row-menu-open')
  expect(marker.checkVisibility({ visibilityProperty: true })).toBe(false)
  expect(row.matches(ROW)).toBe(true)
  expect(tokens(row)).toEqual([DESCRIPTION])
  expect(getComputedStyle(title).fontWeight).toBe('600')
  expect(menu.isConnected).toBe(true)
  expect(nativeAppearance(row, status)).toEqual(initial)
  row.setAttribute(PART, 'session-row')
  expect(marker.checkVisibility({ visibilityProperty: true })).toBe(true)
  expect(markerOf(row)).toBe(marker)
})

test('native running state and drop pseudo-element retain their data and appearance', () => {
  const { row, status, mark } = hostRow()
  const initial = nativeAppearance(row, status)
  expect(initial.content).toBe('""')
  expect(initial.state).toBe('running')
  expect(initial.drop).toBe(true)
  mark.update(true)
  expect(nativeAppearance(row, status)).toEqual(initial)
  mark.update(false)
  mark.dispose()
  expect(nativeAppearance(row, status)).toEqual(initial)
  expect(status.getAttribute('aria-label')).toBe('Running')
})
