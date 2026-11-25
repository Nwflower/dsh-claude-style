/**
 * The scheduler's compact hook index: events reach only live subscribers, and
 * a feature installed after the scheduler joins when the entry refreshes it.
 *
 * @capability page-observation
 * @features engine
 * @risk An event scans unrelated features, or a deferred feature never hears it.
 */
import { expect, test } from 'vitest'
import { installScheduler } from '@dsh-claude-style/engine/scheduler'
import type { SchedulerUi } from '@dsh-claude-style/engine/scheduler'
import type { HostContext } from '@dsh-claude-style/engine/host'

test('key events use the live hook index and refresh picks up a deferred handle', () => {
  const calls: string[] = []
  const ui: SchedulerUi<'first' | 'idle' | 'deferred'> = {
    retire() {},
    first: { onKey(event) { calls.push(`first:${event.key}`) } },
    idle: { sync() {} },
  }
  const stop = installScheduler({ get() { return undefined } } as unknown as HostContext, ui, ['first', 'idle', 'deferred'], {
    copyChange: [],
    refresh: [],
    start() {},
    systemMotionChanged() {},
  })
  try {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    expect(calls).toEqual(['first:a'])
    ui.deferred = { onKey(event) { calls.push(`deferred:${event.key}`) } }
    ui.refreshHooks?.()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))
    expect(calls).toEqual(['first:a', 'first:b', 'deferred:b'])
    delete ui.first
    ui.refreshHooks?.()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }))
    expect(calls).toEqual(['first:a', 'first:b', 'deferred:b', 'deferred:c'])
  } finally {
    stop()
  }
})
