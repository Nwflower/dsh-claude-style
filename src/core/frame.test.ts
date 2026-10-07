import { expect, test } from 'vitest'
import { requestFrame } from './frame'

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
