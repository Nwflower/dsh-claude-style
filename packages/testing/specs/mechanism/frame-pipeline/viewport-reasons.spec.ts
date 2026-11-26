/**
 * The scheduler's viewport frame (D40): scrolls and resizes coalesce into one
 * frame, and the frame says which of the two it was. A frame that only
 * scrolled is a scroll and carries the targets that scrolled; a frame with a
 * resize in it is a resize. Work that follows sizes reads the reason to skip
 * frames in which nothing changed size.
 *
 * @capability frame-pipeline
 * @features engine
 * @risk A sidebar title the host scrolls every frame, or a wheel over the session list, makes every size-following feature measure the page every frame.
 */
import { afterEach, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { installScheduler } from '@dsh-claude-style/engine/scheduler'
import type { RepositionReason, SchedulerUi, ViewportReason } from '@dsh-claude-style/engine/scheduler'

const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve))
const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
  document.body.replaceChildren()
})

interface Heard {
  measured: ViewportReason[]
  placed: { reason: RepositionReason, scrolled: readonly EventTarget[] }[]
}

/** The scheduler over one feature that records what its viewport hooks hear. */
function installed(): Heard {
  const heard: Heard = { measured: [], placed: [] }
  const ui: SchedulerUi<'probe'> = {
    retire(name) { throw new Error(`the scheduler switched "${name}" off`) },
    probe: {
      measureReposition(reason) { heard.measured.push(reason) },
      reposition(reason, scrolled) { heard.placed.push({ reason, scrolled }) },
    },
  }
  cleanups.push(installScheduler(undefined as never, ui, ['probe'], {
    copyChange: [],
    refresh: [],
    start() {},
    systemMotionChanged() {},
  }))
  return heard
}

/** A box that scrolls on its own, as a sidebar title or the session list does. */
function scroller() {
  const box = document.createElement('div')
  box.style.cssText = 'width:120px;height:40px;overflow:auto'
  const content = document.createElement('div')
  content.style.cssText = 'width:600px;height:400px'
  box.append(content)
  document.body.append(box)
  return box
}

/** Wait until the viewport frame has handed its write phase on. */
async function placed(heard: Heard, count: number) {
  for (let frame = 0; frame < 20 && heard.placed.length < count; frame += 1) await nextFrame()
  expect(heard.placed).toHaveLength(count)
}

test('a frame in which boxes only scrolled is a scroll and names every box that scrolled', async () => {
  const first = scroller()
  const second = scroller()
  const heard = installed()
  await nextFrame()

  first.scrollLeft = 40
  second.scrollTop = 60
  first.scrollLeft = 80
  await placed(heard, 1)

  expect(heard.measured).toEqual(['scroll'])
  expect(heard.placed[0].reason).toBe('scroll')
  expect([...heard.placed[0].scrolled]).toEqual(expect.arrayContaining([first, second]))
  expect(heard.placed[0].scrolled).toHaveLength(2)

  // The next frame starts empty: the targets were handed on with the last one.
  first.scrollLeft = 0
  await placed(heard, 2)
  expect(heard.placed[1].reason).toBe('scroll')
  expect([...heard.placed[1].scrolled]).toEqual([first])
})

test('a frame with a resize in it is a resize, and the next scroll-only frame is a scroll again', async () => {
  const box = scroller()
  const heard = installed()
  await nextFrame()

  await page.viewport(900, 700)
  box.scrollTop = 30
  await placed(heard, 1)
  expect(heard.measured[0]).toBe('resize')
  expect(heard.placed[0].reason).toBe('resize')

  box.scrollTop = 90
  await placed(heard, 2)
  expect(heard.measured[1]).toBe('scroll')
  expect(heard.placed[1].reason).toBe('scroll')
})
