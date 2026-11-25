/**
 * Process-body size subscriptions end when their group leaves the page.
 * @capability chat-follow
 * @features chat-follow, engine
 * @risk A mutation inside one group hides another group's removal in the same batch, retaining both resize subscriptions.
 */
import { afterEach, expect, test, vi } from 'vitest'
import { createChatProcessFollow } from '@dsh-claude-style/client/mechanisms'
import { adoptSkin } from '@dsh-claude-style/engine/skin'
import { PROCESS_BODY_SELECTOR, PROCESS_CONTENT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'
import { TEST_SKIN } from '../../fixtures/vocabulary'

adoptSkin(TEST_SKIN)
const cleanups: (() => void)[] = []
afterEach(() => {
  for (const stop of cleanups.splice(0).reverse()) stop()
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

function processGroup() {
  const body = hostElement(PROCESS_BODY_SELECTOR)
  const content = hostElement(PROCESS_CONTENT_SELECTOR)
  body.append(content)
  return { body, content }
}

for (const order of ['change-first', 'removal-first'] as const) {
  test(`a mixed batch releases both removed targets with ${order} records`, async () => {
    // cost: D40 — unobserve calls expose retained targets without replacing browser resize delivery.
    const unobserve = vi.spyOn(ResizeObserver.prototype, 'unobserve')
    const retained = processGroup()
    const removed = processGroup()
    document.body.append(retained.body, removed.body)
    cleanups.push(createChatProcessFollow())

    if (order === 'change-first') retained.content.append(document.createElement('span'))
    removed.body.remove()
    if (order === 'removal-first') retained.content.append(document.createElement('span'))

    await vi.waitFor(() => {
      const targets = unobserve.mock.calls.map(call => call[0])
      expect(targets).toEqual(expect.arrayContaining([removed.body, removed.content]))
    })
  })
}
