/**
 * The background opacity as the page shows it: below 100 the Claude palette's
 * canvas mixes toward transparent; at 100 nothing changes. Shared popovers keep
 * their paint, in both schemes.
 *
 * @capability background-opacity
 * @features core, settings
 * @risk A stored 50 leaves the sidebar or conversation opaque, 100 changes the existing page, or a hand-edited value draws a state the field cannot show.
 */
import { FRAME_PARTS } from '@dsh-claude-style/engine/parts-table'
const BACKGROUND_OPACITY_VAR = surface.property('skin.background-opacity')
import { host, spec, surface } from '../../fixtures/behaviour.mjs'

const OPACITY_ATTR = surface.attribute('skin.background-opacity')
const DARK_ATTR = host('shell.dark-theme')
const PHASE_ATTR = host('shell.phase')
const SEAT_ATTR = host.attribute('composer.seat')

function partClass(part) {
  const stem = Object.keys(FRAME_PARTS).find(candidate => FRAME_PARTS[candidate] === part)
  if (stem === undefined) throw new Error('no frame class names ' + part)
  return '_' + stem + '_spec'
}

async function buildShell(t) {
  await t.page.evaluate(([rootSelector, sidebarClass, conversationClass, popoverSelector]) => {
    if (document.getElementById('debugShell') !== null) return
    const frame = document.createElement('div')
    frame.id = 'debugShell'
    frame.style.cssText = 'position:absolute;left:-10000px;top:-10000px;display:flex;width:400px;height:200px'
    const side = document.createElement('div')
    side.id = 'debugSidebar'
    side.className = sidebarClass
    side.style.cssText = 'flex:none;width:120px;height:200px'
    const center = document.createElement('div')
    center.id = 'debugConversation'
    center.className = conversationClass
    center.style.cssText = 'flex:1;height:200px'
    frame.append(side, center)
    ;(document.querySelector(rootSelector) ?? document.body).appendChild(frame)
    const popover = document.createElement('div')
    popover.id = 'debugPopover'
    popover.className = popoverSelector.slice(1)
    document.body.appendChild(popover)
  }, [host('shell.root-slot'), partClass('sidebar-column'), partClass('center-column'), surface('popover.card')])
}

function read(t) {
  return t.page.evaluate(([attribute, property]) => {
    const background = (selector) => {
      const element = document.querySelector(selector)
      return element === null ? null : getComputedStyle(element).backgroundColor
    }
    return {
      attribute: document.body.getAttribute(attribute),
      property: document.body.style.getPropertyValue(property),
      body: background('body'),
      html: background('html'),
      sidebar: background('#debugSidebar'),
      conversation: background('#debugConversation'),
      popover: background('#debugPopover'),
    }
  }, [OPACITY_ATTR, BACKGROUND_OPACITY_VAR])
}

function setDark(t, on) {
  return t.page.evaluate(([attribute, enabled]) => {
    document.body.toggleAttribute(attribute, enabled)
  }, [DARK_ATTR, on])
}

export default spec({ page: 'desktop', bands: ['wide'] }, ({ test }) => {
  test('at 100 the page keeps its existing opaque fills without a mark', async (t) => {
    await buildShell(t)
    const page = await read(t)
    t.expectThat.equal(page.attribute, null, 'no opacity mark at the default')
    t.expectThat.equal(page.property, '', 'no opacity property at the default')
    t.expectThat.equal(page.body, 'rgb(255, 255, 255)', 'the body keeps its white canvas')
    t.expectThat.equal(page.sidebar, 'rgb(250, 250, 250)', 'the sidebar keeps its plate')
    t.expectThat.equal(page.conversation, 'rgb(255, 255, 255)', 'the conversation keeps its canvas')
    t.expectThat.equal(page.html, 'rgb(255, 255, 255)', 'the document keeps its canvas')
  })

  test('at 50 the canvas and both columns mix toward transparent', async (t) => {
    await buildShell(t)
    await t.prefs({ backgroundOpacity: '50' })
    const page = await read(t)
    t.expectThat.equal(page.attribute, '50', 'the percentage reaches the body')
    t.expectThat.equal(page.property, '0.5', 'the percentage projects into the property')
    t.expectThat.equal(page.body, 'color(srgb 1 1 1 / 0.5)', 'the body is half transparent')
    t.expectThat.equal(page.sidebar, 'color(srgb 0.980392 0.980392 0.980392 / 0.5)', 'the sidebar is half transparent')
    t.expectThat.equal(page.conversation, 'color(srgb 1 1 1 / 0.5)', 'the conversation is half transparent')
    t.expectThat.equal(page.html, 'rgba(0, 0, 0, 0)', 'the document lets the window through')
  })

  test('at 0 the canvas is clear and the shared popover keeps its paint', async (t) => {
    await buildShell(t)
    const before = await read(t)
    t.expectThat.equal(before.popover, 'rgb(255, 255, 255)', 'the popover starts opaque')
    await t.prefs({ backgroundOpacity: '0' })
    const page = await read(t)
    t.expectThat.equal(page.attribute, '0', 'zero reaches the body')
    t.expectThat.equal(page.property, '0', 'zero reaches the property')
    t.expectThat.equal(/^color\(srgb [0-9.]+ [0-9.]+ [0-9.]+ \/ 0\)$/.test(page.body), true, 'the canvas alpha is zero: ' + page.body)
    t.expectThat.equal(page.popover, before.popover, 'the popover fill is unchanged')
  })

  test('writing 100 removes the override and restores the default', async (t) => {
    await buildShell(t)
    await t.prefs({ backgroundOpacity: '50' })
    await t.prefs({ backgroundOpacity: '100' })
    const page = await read(t)
    t.expectThat.equal(page.attribute, null, '100 removes the mark')
    t.expectThat.equal(page.property, '', '100 removes the property')
    t.expectThat.equal(page.body, 'rgb(255, 255, 255)', 'the canvas is opaque again')
  })

  test('out-of-range and unreadable values follow the row semantics', async (t) => {
    await t.prefs({ backgroundOpacity: '400' })
    t.expectThat.equal((await read(t)).attribute, null, '400 clamps to 100')
    await t.prefs({ backgroundOpacity: '-40' })
    t.expectThat.equal((await read(t)).attribute, '0', '-40 clamps to 0')
    await t.prefs({ backgroundOpacity: 'big' })
    const page = await read(t)
    t.expectThat.equal(page.attribute, null, 'an unreadable value reads as 100')
    t.expectThat.equal(page.body, 'rgb(255, 255, 255)', 'the page stays opaque')
  })

  test('the dark canvas and sidebar mix at the same share', async (t) => {
    await buildShell(t)
    await setDark(t, true)
    await t.prefs({ backgroundOpacity: '50' })
    const page = await read(t)
    t.expectThat.equal(page.body, 'color(srgb 0.0980392 0.0980392 0.0980392 / 0.5)', 'the dark body is half transparent')
    t.expectThat.equal(page.sidebar, 'color(srgb 0.121569 0.121569 0.121569 / 0.5)', 'the dark sidebar is half transparent')
    await setDark(t, false)
    t.expectThat.equal((await read(t)).attribute, '50', 'the preference survives the scheme switch')
  })
})
