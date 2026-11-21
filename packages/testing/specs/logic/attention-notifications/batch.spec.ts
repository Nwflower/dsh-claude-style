/**
 * @capability attention-notifications
 * @features attention-notifications
 * @risk The foreground gets interrupted, prompts are lost to completion notices, or a canceled batch surfaces after focus returns.
 */
import { expect, test } from 'vitest'
import { createNotificationBatch, notificationPermission, notificationsInBackground } from '@dsh-claude-style/client/pure'
import type { AttentionEvent } from '@dsh-claude-style/client/pure'

test('a browser without the notification API reports that notifications are unavailable', () => {
  expect(notificationPermission({})).toBe('unsupported')
})

test('only a visible, focused page suppresses notifications', () => {
  expect(notificationsInBackground(false, true)).toBe(false)
  expect(notificationsInBackground(false, false)).toBe(true)
  expect(notificationsInBackground(true, true)).toBe(true)
  expect(notificationsInBackground(true, false)).toBe(true)
})

test('each window delivers one event and keeps the first waiting session ahead of any finish', async () => {
  type Change = { event: AttentionEvent, sessionId: string }
  const delivered: Change[] = []
  const batch = createNotificationBatch(change => { delivered.push(change) })
  try {
    const prompt = { event: 'permission', sessionId: 'waiting' } as const
    const finish = { event: 'finished', sessionId: 'ended' } as const
    batch.add(finish)
    batch.add(prompt)
    batch.add(finish)
    batch.add({ ...prompt, sessionId: 'also-waiting' })
    expect(delivered).toEqual([])
    await expect.poll(() => delivered.slice()).toEqual([prompt])
    batch.add(prompt)
    batch.clear()
    batch.add(finish)
    await expect.poll(() => delivered.slice()).toEqual([prompt, finish])
  } finally { batch.clear() }
})
