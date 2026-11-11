/**
 * @capability sidebar-status
 * @features sidebar-status
 * @risk Title shimmer reveals text hidden by a plugin's generated title and overlaps its visible replacement, or removes the running fallback.
 */
import { afterEach, expect, test } from 'vitest'
import { DARK_THEME_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { surfaceAttribute } from '../../fixtures/surface'
import { CHANNEL_ATTRIBUTE, CHANNEL_TEXT_ATTRIBUTE, installChannelTitleSheet } from '../../fixtures/channel-title'
import { bodyAttribute, mount, painted, removeAfterTest, STATUS } from './fixture'

const RUNNING_TITLE = surfaceAttribute('sidebar-status.running-title')
const cleanups: (() => void)[] = []
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup() })

function expectTitleShimmer(view: ReturnType<typeof mount>) {
  expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(true)
  expect(view.title.getAnimations().length).toBeGreaterThan(0)
  expect(painted(view.dot as Element)).toBe(false)
}

for (const scheme of ['light', 'dark']) {
  test.each(['before', 'after'])(`${scheme} channel title taken over %s shimmer keeps one title and a native running marker`, timing => {
    bodyAttribute(DARK_THEME_ATTRIBUTE, scheme === 'dark' ? '' : null)
    bodyAttribute(surfaceAttribute('skin.ongoing-indicator'), 'shimmer')
    bodyAttribute(surfaceAttribute('skin.motion'), 'full')
    cleanups.push(installChannelTitleSheet())
    const view = mount('ongoing')
    view.row.setAttribute('aria-selected', 'false')
    view.title.textContent = '飞书 · 配置书'
    const titleNodes = [...view.title.childNodes]
    const rowNodes = [...view.row.childNodes]
    if (timing === 'after') {
      view.sync()
      expect(view.title.getAnimations().length).toBeGreaterThan(0)
    }
    view.title.setAttribute(CHANNEL_ATTRIBUTE, 'feishu')
    view.title.setAttribute(CHANNEL_TEXT_ATTRIBUTE, '配置书')
    view.sync()
    expect(view.row.getAttribute(STATUS)).toBe('active')
    expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(false)
    expect(getComputedStyle(view.title).backgroundImage).toBe('none')
    expect(getComputedStyle(view.title).backgroundClip).toBe('border-box')
    expect(getComputedStyle(view.title).webkitTextFillColor).toBe('rgba(0, 0, 0, 0)')
    expect(view.title.getAnimations()).toEqual([])
    expect(getComputedStyle(view.title, '::after').content).toContain('配置书')
    expect(getComputedStyle(view.title, '::after').webkitTextFillColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(painted(view.dot as Element)).toBe(true)
    expect((view.dot as Element).getAnimations().length).toBeGreaterThan(0)
    expect(view.title.textContent).toBe('飞书 · 配置书')
    expect(view.title.getAttribute(CHANNEL_ATTRIBUTE)).toBe('feishu')
    expect(view.title.getAttribute(CHANNEL_TEXT_ATTRIBUTE)).toBe('配置书')
    expect([...view.title.childNodes]).toEqual(titleNodes)
    expect([...view.row.childNodes]).toEqual(rowNodes)
    view.sync()
    expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(false)

    bodyAttribute(surfaceAttribute('skin.motion'), 'reduced')
    view.sync()
    expect(view.title.getAnimations()).toEqual([])
    expect(painted(view.dot as Element)).toBe(true)
    expect((view.dot as Element).getAnimations()).toEqual([])
    bodyAttribute(surfaceAttribute('skin.motion'), 'full')
    view.title.removeAttribute(CHANNEL_ATTRIBUTE)
    view.title.removeAttribute(CHANNEL_TEXT_ATTRIBUTE)
    view.sync()
    expectTitleShimmer(view)
    view.sync()
    expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(true)
  })
}

test.each(['::before', '::after'])('%s generated content keeps the native marker and absent content restores stable shimmer', pseudo => {
  bodyAttribute(surfaceAttribute('skin.ongoing-indicator'), 'shimmer')
  bodyAttribute(surfaceAttribute('skin.motion'), 'full')
  const view = mount('ongoing')
  view.title.classList.add('external-title')
  const sheet = document.createElement('style')
  document.head.append(sheet)
  removeAfterTest(sheet)
  for (const content of ['""', '"External title"']) {
    sheet.textContent = `.external-title${pseudo} { content: ${content}; }`
    view.sync()
    expect(view.row.hasAttribute(RUNNING_TITLE)).toBe(false)
    expect(view.title.getAnimations()).toEqual([])
    expect(painted(view.dot as Element)).toBe(true)
  }
  for (const content of ['none', 'normal']) {
    sheet.textContent = `.external-title${pseudo} { content: ${content}; }`
    view.sync()
    view.sync()
    expectTitleShimmer(view)
  }
})
