/**
 * The standing rows keep the meter's visible words, tooltip and accessible name
 * together as the billing clock advances, in both levels of the model picker.
 *
 * @capability model-picker
 * @features model, peakrate
 * @risk A refreshed rate or countdown disagrees with the tooltip and the screen reader while the model rows remain on the page.
 */
import { spec } from '../../fixtures/behaviour.mjs'

/** Open the built picker on a controlled billing minute. */
async function openAt(t) {
  await t.page.clock.install({ time: new Date('2026-10-26T03:58:00Z') })
  await t.page.reload({ waitUntil: 'domcontentloaded' })
  await t.page.waitForFunction(() => window.__smoke !== undefined)
  await t.settle()
  await t.page.locator(t.surface('model.trigger')).click()
  await t.settle()
}

/** A host page mutation asks the scheduler for a full pass. */
async function refresh(t) {
  await t.page.evaluate(() => document.body.appendChild(document.createElement('hr')))
  await t.settle()
}

/** Read one retained meter's visible and accessible judgement. */
function readJudgement(meter) {
  return meter.evaluate((element) => ({
    connected: element.isConnected,
    title: element.getAttribute('title'),
    name: element.getAttribute('aria-label'),
    text: element.textContent,
  }))
}

export default spec({ page: 'model-meter' }, ({ test }) => {
  test('both cards refresh the rate judgement without replacing their rows or rewriting unchanged names', async (t) => {
    await openAt(t)
    await t.page.getByRole('menuitem', { name: 'More models' }).click()
    await t.settle()

    const meters = []
    for (const name of ['V4.1 Flash', 'Gateway Flash']) {
      const row = t.page.getByRole('menuitemradio').filter({ hasText: name })
      meters.push(await row.getByRole('img').elementHandle())
    }

    const judgement = async (expected, visible) => {
      for (const meter of meters) {
        const reading = await readJudgement(meter)
        t.expectThat.equal(reading, { connected: true, title: expected, name: expected, text: visible }, 'the standing meter shows and announces the current judgement')
      }
    }

    await judgement('Now Peak rate 2× · in 2m → Off-peak rate 1×', '2×· 2m')
    await t.page.clock.fastForward(60000)
    await t.settle()
    await judgement('Now Peak rate 2× · in 1m → Off-peak rate 1×', '2×· 1m')

    await t.page.clock.fastForward(60000)
    await t.settle()
    await judgement('Now Off-peak rate 1× · in 21h → Peak rate 2×', '1×· 21h')

    const steady = await t.page.getByRole('img', { name: 'Now Promotion 0.5×', exact: true }).elementHandles()
    t.expectThat.equal(steady.length, 2, 'both levels carry the unchanged promotion')
    for (const meter of steady) {
      await meter.evaluate((element) => {
        element.__nameWrites = []
        element.__nameObserver = new MutationObserver((records) => element.__nameWrites.push(...records.map((record) => record.attributeName)))
        element.__nameObserver.observe(element, { attributes: true, attributeFilter: ['title', 'aria-label'] })
      })
    }
    await t.page.clock.fastForward(60000)
    await t.settle()
    await judgement('Now Off-peak rate 1× · in 20h 59m → Peak rate 2×', '1×· 20h 59m')
    for (const meter of steady) {
      const writes = await meter.evaluate((element) => {
        element.__nameObserver.disconnect()
        return element.__nameWrites
      })
      t.expectThat.equal(writes, [], 'a settled judgement does not rewrite its tooltip or accessible name')
      t.expectThat.equal(await readJudgement(meter), { connected: true, title: 'Now Promotion 0.5×', name: 'Now Promotion 0.5×', text: '0.5×' }, 'the unchanged promotion stays on the page')
    }
  })

  test('painting the second card in a new minute leaves the first card due for refresh', async (t) => {
    await openAt(t)
    const first = await t.page.getByRole('menuitemradio').filter({ hasText: 'V4.1 Flash' }).getByRole('img').elementHandle()
    await t.page.clock.setSystemTime('2026-10-26T03:59:00Z')
    await t.page.getByRole('menuitem', { name: 'More models' }).click()
    await t.settle()
    await refresh(t)
    const reading = await readJudgement(first)
    t.expectThat.equal(reading, {
      connected: true,
      title: 'Now Peak rate 2× · in 1m → Off-peak rate 1×',
      name: 'Now Peak rate 2× · in 1m → Off-peak rate 1×',
      text: '2×· 1m',
    }, 'new rows do not mark the older rows as already refreshed')
  })
})
