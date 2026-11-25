/**
 * The Edit sidebar dialog mounts its React root on a seat that stands in the
 * document, and closing unmounts that root and takes the seat with it. The
 * host's Modal portals its mask onto <body>; a root kept alive and only rendered
 * to null strands that mask over the page when the close is interrupted, so the
 * teardown must release the root itself, and a reopen must take a fresh seat
 * rather than render into one on its way out (issue #478).
 *
 * @capability sidebar-entries
 * @features sidebar-entries
 * @risk Closing the dialog leaves its full-viewport mask over the page, so the sidebar search, the More menu and the account menu stop answering clicks until a reload.
 */
import { spec, surface } from '../../fixtures/behaviour.mjs'

/** The body-mounted seat the dialog renders from, as the surface table names it. */
const HOST = surface('shared.dialog-host')

/** The entries the dialog lists, as the More menu hands them over. */
const ENTRIES = [
  { id: 'panel-a', label: 'Panel A', pinned: true, active: false },
  { id: 'panel-b', label: 'Panel B', pinned: false, active: false },
]

export default spec({ page: 'search' }, ({ test }) => {
  test('the dialog root stands on a seat in the document and is unmounted with its seat on close', async (t) => {
    const opened = await t.page.evaluate(([entries, host]) => {
      const row = window.__slotComponents['claude-style-edit-sidebar']
      row({ entries, onDismiss() {}, onPinnedChange() {} }).props.onSelect()
      const roots = window.__roots.filter((root) => root.element.className === host.slice(1))
      const root = roots[roots.length - 1]
      return { connected: root.element.isConnected, onBody: root.element.parentElement === document.body, unmounted: root.unmounted, renders: root.renders }
    }, [ENTRIES, HOST])
    t.expectThat.equal(opened.connected, true, 'the dialog root seat stands in the document')
    t.expectThat.equal(opened.onBody, true, 'the seat is mounted on the body the Modal portals into')
    t.expectThat.equal(opened.unmounted, false, 'the root is live while the dialog is open')
    t.expectThat.equal(opened.renders >= 1, true, 'the dialog was rendered onto the seat')

    const closed = await t.page.evaluate(async (host) => {
      const root = window.__roots.filter((r) => r.element.className === host.slice(1)).find((r) => !r.unmounted)
      // The dialog component renders the host Modal whose onClose is the skin's close path.
      root.tree.type(root.tree.props).props.onClose()
      await new Promise((resolve) => setTimeout(resolve, 0))
      return { unmounted: root.unmounted, connected: root.element.isConnected, seatsLeft: document.querySelectorAll(host).length }
    }, HOST)
    t.expectThat.equal(closed.unmounted, true, 'closing unmounts the root rather than only rendering it to null')
    t.expectThat.equal(closed.connected, false, 'the seat leaves the document with the root')
    t.expectThat.equal(closed.seatsLeft, 0, 'no dialog seat is left behind on the body')
  })

  test('a reopen after a close takes a fresh seat and both roots end unmounted', async (t) => {
    const cycle = await t.page.evaluate(async ([entries, host]) => {
      const row = window.__slotComponents['claude-style-edit-sidebar']
      const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
      const live = () => window.__roots.filter((r) => r.element.className === host.slice(1) && !r.unmounted)
      const open = () => row({ entries, onDismiss() {}, onPinnedChange() {} }).props.onSelect()
      const close = () => { const root = live()[0]; root.tree.type(root.tree.props).props.onClose() }
      open()
      const first = live()[0]
      close(); await flush()
      open()
      const second = live()[0]
      const fresh = second !== first && second.element !== first.element
      close(); await flush()
      return {
        fresh,
        firstUnmounted: first.unmounted,
        secondUnmounted: second.unmounted,
        seatsLeft: document.querySelectorAll(host).length,
      }
    }, [ENTRIES, HOST])
    t.expectThat.equal(cycle.fresh, true, 'the reopen mounts a new seat instead of reusing the one closing')
    t.expectThat.equal(cycle.firstUnmounted, true, 'the first root is unmounted')
    t.expectThat.equal(cycle.secondUnmounted, true, 'the second root is unmounted')
    t.expectThat.equal(cycle.seatsLeft, 0, 'no dialog seat survives the cycle')
  })
})