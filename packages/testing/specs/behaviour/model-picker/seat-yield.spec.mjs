/**
 * A third-party plugin holding the host's model seat (issue #218): the Codex
 * subscription registers its own seat — the speed menu among its entries —
 * into the host's model slot at a shadowing priority, and the skin's picker
 * must get out of the way. The skin's trigger, its cards and the reasoning
 * level's button come down; the node the host renders for the winning entry
 * stands unmarked and reachable, its own menu opening on a press; and the
 * skin's picker returns on the pass the entry is handed back. The host's own
 * registration — the seat at the default priority 0 — and a page whose ledger
 * stands empty keep the skin self-drawn.
 *
 * @capability model-picker
 * @features model
 * @risk A plugin's speed menu mounted in the model seat stays hidden under the skin's own trigger, or the seat stays yielded after the plugin leaves.
 */
import { spec } from '../../fixtures/behaviour.mjs'

/** The fixture the spec mounts in the winner's place uses its own element ids, the one channel a fixture's own markup may use. */
const PEER_TRIGGER = '#peer-trigger'
const PEER_FAST_ROW = '#peer-fast'

/**
 * Register a winner for the model seat and model the host's renderer for it:
 * the winner's component stands in the slot in the host seat's place, the way
 * the host swaps the seat's own root for the entry it renders. At the default
 * priority 0 that is the host's own seat and nothing is swapped; at any other
 * priority the entry shadows it. The slot is the seat box's parent, and the
 * host's own seat root is the part the parts walk marks.
 */
function holdSeat(t, priority) {
  const hostMark = t.surface.attribute('model.host-root')
  return t.page.evaluate(({ priority, hostMark, seatSelector }) => {
    const registry = window.__dshSmokeHost.slotRegistry
    const slot = document.querySelector(seatSelector).parentElement
    const hostSeat = slot.querySelector(':scope > [' + hostMark + ']')
    let restore = null
    if (priority !== 0 && hostSeat !== null) {
      window.__hostSeat = hostSeat
      slot.removeChild(hostSeat)
      const seat = document.createElement('div')
      seat.id = 'peer-seat'
      seat.innerHTML =
        '<button type="button" id="peer-trigger" aria-haspopup="menu">GPT-6.1 Sol · Standard</button>' +
        '<div id="peer-menu" role="menu" hidden>' +
        '<div role="menuitem">Standard speed</div>' +
        '<div id="peer-fast" role="menuitem">Fast — 1.5x speed / more usage</div>' +
        '</div>'
      const trigger = seat.querySelector('[id="peer-trigger"]')
      const menu = seat.querySelector('[id="peer-menu"]')
      trigger.addEventListener('click', () => { menu.hidden = !menu.hidden })
      slot.insertBefore(seat, slot.firstChild)
      restore = () => {
        seat.remove()
        slot.appendChild(hostSeat)
      }
    }
    const dispose = registry.register({ name: 'conversation.input.model', priority }, function PeerSeat() {})
    window.__seatHeld = () => {
      dispose()
      if (restore !== null) restore()
    }
  }, { priority, hostMark, seatSelector: t.surface('model.seat') })
}

/** Hand the seat back: the registration goes and the host's own seat returns to the slot. */
function releaseSeat(t) {
  return t.page.evaluate(() => { window.__seatHeld() })
}

/**
 * Read something off the host's own model seat root, in one page pass: the
 * model slot is the seat box's parent while the skin draws and the meter
 * ring's parent while the seat is yielded (the ring stands in the slot
 * throughout), and the seat root is the part the parts walk marks inside it.
 */
function readHostSeat(t, read) {
  const hostMark = t.surface.attribute('model.host-root')
  return t.page.evaluate(([hostMark, read]) => {
    const hostSeat = window.__hostSeat ?? document.querySelector('[' + hostMark + ']')
    if (read === 'present') return hostSeat !== null && hostSeat.isConnected
    return hostSeat === null || hostSeat === undefined ? null : hostSeat.getAttribute(hostMark)
  }, [hostMark, read])
}

export default spec({ page: 'effort' }, ({ test }) => {
  test('seat yield — an empty ledger keeps the skin drawing the seat', async (t) => {
    t.expectThat.visible(await t.read.box(t.surface('model.trigger')), 'the skin\'s model trigger stands in the seat')
    t.expectThat.visible(await t.read.box(t.surface('effort.trigger')), 'the reasoning level\'s button stands beside it')
    t.expectThat.equal(await readHostSeat(t, t.surface.attribute('model.host-root')), '', 'the host\'s own seat is marked hidden while the skin draws')
  })

  test('seat yield — the host\'s own registration at the default priority keeps the skin drawing', async (t) => {
    await holdSeat(t, 0)
    await t.settle()
    t.expectThat.visible(await t.read.box(t.surface('model.trigger')), 'the skin\'s model trigger keeps standing in the seat')
    t.expectThat.equal(await readHostSeat(t, t.surface.attribute('model.host-root')), '', 'the host\'s own seat stays marked hidden')
    t.expectThat.absent(await t.read.count(PEER_TRIGGER), 'no third-party node stands in the seat')
  })

  test('seat yield — a shadowing winner takes the seat and its own menu stays reachable', async (t) => {
    await holdSeat(t, -10)
    await t.settle()
    t.expectThat.absent(await t.read.count(t.surface('model.trigger')), 'the skin\'s model trigger is down')
    t.expectThat.absent(await t.read.count(t.surface('effort.trigger')), 'the reasoning level\'s button is down with the seat')
    t.expectThat.absent(await t.read.count(t.surface('model.seat')), 'the skin\'s seat box is out of the slot')
    t.expectThat.equal(await readHostSeat(t, 'present'), false, 'the host\'s own seat gave the slot to the winner')
    const peerBox = await t.read.box(PEER_TRIGGER)
    t.expectThat.visible(peerBox, 'the winner\'s trigger stands in the seat, visible')
    t.expectThat.equal(await t.read.computed(PEER_TRIGGER, 'display'), 'inline-block', 'the winner\'s trigger is not hidden')
    await t.page.click(PEER_TRIGGER)
    await t.settle()
    const menuBox = await t.read.box(PEER_FAST_ROW)
    t.expectThat.visible(menuBox, 'the speed menu\'s Fast row opens on a press — the entry the seat was taken for is reachable')
  })

  test('seat yield — handing the seat back restores the skin\'s picker on the next pass', async (t) => {
    await holdSeat(t, -10)
    await t.settle()
    t.expectThat.absent(await t.read.count(t.surface('model.trigger')), 'the seat stood yielded')
    await releaseSeat(t)
    await t.settle()
    t.expectThat.visible(await t.read.box(t.surface('model.trigger')), 'the skin\'s model trigger stands again')
    t.expectThat.visible(await t.read.box(t.surface('effort.trigger')), 'the reasoning level\'s button stands beside it again')
    t.expectThat.equal(await readHostSeat(t, t.surface.attribute('model.host-root')), '', 'the host\'s own seat is marked hidden again')
    t.expectThat.absent(await t.read.count(PEER_TRIGGER), 'the winner\'s node left the slot')
  })
})
