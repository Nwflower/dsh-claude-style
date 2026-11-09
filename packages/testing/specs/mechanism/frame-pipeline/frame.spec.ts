/**
 * The frame pipeline every per-frame write goes through (D40): all reads of a
 * frame before all writes, the scroll owner's position writes between them, each
 * phase in request order; a task requested during a frame belongs to the next
 * one, a cancelled task never runs, and a throw costs only its own task.
 *
 * @capability frame-pipeline
 * @features engine
 * @risk The page thrashes layout (a read after a write in one frame) and stutters on a long conversation, or one feature's error freezes every animation on the page.
 */
import { expect, test } from 'vitest'
import { requestFrame } from '@dsh-claude-style/engine/frame'

const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve))

test('every read of a frame runs before every write, each phase in request order', async () => {
  const calls: string[] = []
  requestFrame({ read: () => calls.push('read a'), write: () => calls.push('write a') })
  requestFrame({ write: () => calls.push('write b') })
  requestFrame({ read: () => calls.push('read c'), write: () => calls.push('write c') })
  await nextFrame()
  await nextFrame()
  expect(calls).toEqual(['read a', 'read c', 'write a', 'write b', 'write c'])
})

test('every scroll of a frame runs after every read and before every write', async () => {
  const calls: string[] = []
  requestFrame({ write: () => calls.push('write a') })
  requestFrame({ read: () => calls.push('read b'), scroll: () => calls.push('scroll b') })
  requestFrame({ scroll: () => calls.push('scroll c'), write: () => calls.push('write c') })
  await nextFrame()
  await nextFrame()
  expect(calls).toEqual(['read b', 'scroll b', 'scroll c', 'write a', 'write c'])
})

test('a task requested while a frame runs belongs to the next frame', async () => {
  const frames: number[] = []
  const loop = {
    write(now: number) {
      frames.push(now)
      if (frames.length < 3) requestFrame(loop)
    },
  }
  requestFrame(loop)
  for (let i = 0; i < 5; i++) await nextFrame()
  expect(frames).toHaveLength(3)
  expect(new Set(frames).size).toBe(3)
})

test('a cancelled task does not run, and cancelling in the read phase skips its write', async () => {
  const calls: string[] = []
  const cancelFirst = requestFrame({ write: () => calls.push('first') })
  cancelFirst()
  let cancelLater = () => {}
  requestFrame({ read: () => cancelLater() })
  cancelLater = requestFrame({ read: () => calls.push('later read'), write: () => calls.push('later write') })
  await nextFrame()
  await nextFrame()
  expect(calls).toEqual([])
})

test('a task that throws is reported and the rest of the frame runs', async () => {
  const reported: unknown[] = []
  const onError = (event: ErrorEvent) => {
    reported.push(event.error)
    event.preventDefault()
  }
  window.addEventListener('error', onError)
  const calls: string[] = []
  requestFrame({ write: () => { throw new Error('boom') } })
  requestFrame({ write: () => calls.push('after') })
  await nextFrame()
  await nextFrame()
  window.removeEventListener('error', onError)
  expect(calls).toEqual(['after'])
  expect(reported).toHaveLength(1)
})

test('requesting a task that is already waiting throws', () => {
  const task = { write() {} }
  const cancel = requestFrame(task)
  expect(() => requestFrame(task)).toThrow()
  cancel()
})
