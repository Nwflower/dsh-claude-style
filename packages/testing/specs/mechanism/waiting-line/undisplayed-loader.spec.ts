/**
 * A waiting loader the page does not display runs no CSS motion, so it takes
 * its lane in place: it reads no dot's clock and lays no fade or hand-over on
 * its dots until its row renders again.
 *
 * @capability waiting-line
 * @features chat-wait
 * @risk A running row under an undisplayed ancestor throws from every hand-over, and the console fills with errors while the turn streams.
 */
import { expect, test } from 'vitest'
import { buildWaitLoader, releaseWaitLoader, startWaitLoader } from '@dsh-claude-style/client/mechanisms'
import { cleanupWith } from '../../fixtures/teardown'

test('a loader under an undisplayed ancestor starts without reading or laying any motion', () => {
  const parent = document.createElement('div')
  parent.style.display = 'none'
  const loader = buildWaitLoader()
  parent.append(loader)
  document.body.append(parent)
  cleanupWith(() => {
    releaseWaitLoader(loader)
    parent.remove()
  })
  expect(() => startWaitLoader(loader)).not.toThrow()
  const dots = Array.from(loader.querySelectorAll('*')).filter((element) => element.childElementCount === 0)
  expect(dots.length).toBeGreaterThan(0)
  for (const dot of dots) expect(dot.getAnimations()).toEqual([])
})
