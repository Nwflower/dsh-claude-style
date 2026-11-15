/**
 * Below the host's auto-collapse width the frame gives the sidebar no track while
 * it stands outside the grid — closed, or riding as a drawer — and the reader's
 * reopen takes the host's own in-grid track back. The skin restates the empty
 * track so a stale mark cannot leave the column standing, and this reads the
 * three states at the bands under that width.
 *
 * @capability page-scale
 * @features core
 * @risk Below 768px a sidebar the reader has reopened keeps the empty track a closed one is given, so the column draws nothing and the toggle reads as dead.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'
import { localClass } from '../../fixtures/parts.mjs'

const PART = surface.attribute('skin.part')
const ROOT_SLOT = host('shell.root-slot')
const COLLAPSED = host('shell.sidebar-collapsed')
const DRAWER = host('shell.sidebar-drawer')
const RIGHTBAR = host('shell.rightbar-collapsed')
const UNDER_768 = surface.attribute('skin.page-under-768')
/** The class whose local name makes one child of the root slot the shell's frame. */
const FRAME_CLASS = localClass('frame')
/** The sidebar track the shell writes into the frame's own columns. */
const SIDEBAR = 280
const ID = 'specFrameTracks'

/**
 * Mount the frame the shell draws — the right panel's collapsed mark, the three
 * tracks the host writes inline, and one column per track.
 */
async function mount(t) {
  await t.page.evaluate(([id, root, frameClass, rightbar, sidebar]) => {
    const slot = document.querySelector(root)
    if (slot === null) throw new Error('the stand-in page mounts no root slot')
    const box = document.createElement('div')
    box.id = id
    box.className = frameClass
    box.setAttribute(rightbar, '')
    // The host's own inline columns: the sidebar's width, the centre column, and
    // no track for a closed right panel.
    box.style.cssText = 'display: grid; width: 100%; grid-template-columns: '
      + sidebar + 'px minmax(0px, 1fr) minmax(0px, 0px)'
    // One column per track: the sidebar's, the centre's, and the right panel's.
    for (let track = 0; track < 3; track++) box.append(document.createElement('div'))
    slot.append(box)
  }, [ID, ROOT_SLOT, FRAME_CLASS, RIGHTBAR, SIDEBAR])
  await t.settle()
}

/** Put the sidebar in one of the states the frame's own marks name. */
async function sidebar(t, marks) {
  await t.page.evaluate(([id, collapsed, drawer, state]) => {
    const box = document.getElementById(id)
    box.toggleAttribute(collapsed, state === 'collapsed')
    box.toggleAttribute(drawer, state === 'drawer')
  }, [ID, COLLAPSED, DRAWER, marks])
  await t.settle()
}

/** What the reader sees: the page's own width mark, and each column's drawn width. */
const read = (t) => t.page.evaluate(([id, under]) => {
  const box = document.getElementById(id)
  const width = (track) => Math.round(box.children[track].getBoundingClientRect().width)
  return {
    under: document.body.hasAttribute(under),
    sidebar: width(0),
    center: width(1),
    right: width(2),
  }
}, [ID, UNDER_768])

export default spec({ page: 'desktop', bands: ['compact', 'phone'] }, ({ test }) => {
  test('a reopened sidebar keeps the host track, and a closed or drawer one takes none', async (t) => {
    await mount(t)
    t.expectThat.equal((await read(t)).under, true, 'the page stands under 768px')
    // The frame is the root slot's child carrying the host's own class, which is
    // what the sheet reads for the frame rather than the mark this asserts.
    t.expectThat.equal(await t.read.attribute('#' + ID, PART), 'layout-frame', 'the parts walk reads the frame')

    const expanded = await read(t)
    t.expectThat.equal(expanded.sidebar, SIDEBAR, 'the reopened sidebar takes the width the host wrote for it')
    t.expectThat.equal(expanded.center >= 1, true, 'the centre column keeps a track beside it')
    t.expectThat.equal(expanded.right, 0, 'the closed right panel takes no track')

    for (const state of ['collapsed', 'drawer']) {
      await sidebar(t, state)
      const closed = await read(t)
      t.expectThat.equal(closed.sidebar, 0, `the ${state} sidebar takes no track`)
      t.expectThat.equal(closed.center >= 1, true, `the centre column keeps a track beside the ${state} sidebar`)
    }

    await sidebar(t, 'expanded')
    const reopened = await read(t)
    t.expectThat.equal(reopened.sidebar, SIDEBAR, 'the reopen takes the host track again')
    t.expectThat.equal(reopened.center, expanded.center, 'the centre column stands where it stood before the two closes')
  })
})
