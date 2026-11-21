/**
 * @capability header-visibility
 * @features header-visibility, view-tabs
 * @risk The session menu leaves the title, the toolbar hides over the sidebar or details rail that carry the caption's collapse control, or the native view tabs disappear with the tools while right alignment is disabled.
 */
import { HEADER_PARTS } from '@dsh-claude-style/engine/parts-table'
import { host, spec, surface } from '../../fixtures/behaviour.mjs'
import { partClass, localClass } from '../../fixtures/parts.mjs'

const MARK = surface.attribute('header-visibility.state')
const TAB_STRIP = surface.attribute('view-tabs.strip')
const PHASE = host('shell.phase')
const WINDOWS = host('shell.windows-titlebar')
const MAIN = host.attributes('chat.main-slot')
const HEADER_SLOT = host.attributes('shell.header-slot')
const CONTENT = host.attributes('chat.content')
const TABLIST = host.attributes('header.conversation-tabs')
const SIDEBAR_SLOT = host.attributes('shell.sidebar-slot')
const RIGHTBAR = host('shell.rightbar-column')
const RIGHTBAR_ATTRS = host.attributes('shell.rightbar-column')
const RAIL_CLASS = surface('sessionPanel.rail').slice(1)
const CLASSES = {
  header: partClass(HEADER_PARTS, 'conversation-header'),
  title: partClass(HEADER_PARTS, 'header-title'),
  tabs: partClass(HEADER_PARTS, 'view-tabs'),
  tablist: partClass(HEADER_PARTS, 'view-tabs-list'),
  utilities: partClass(HEADER_PARTS, 'header-utilities'),
  corner: partClass(HEADER_PARTS, 'header-corner'),
}

async function mount(t) {
  await t.page.evaluate(({ phase, windows, main, headerSlot, content, tablist, classes, rootClass, sidebarSlot, rightbarAttrs, railClass }) => {
    document.documentElement.setAttribute(windows, '')
    const captionHeight = 40
    const windowButtons = 140
    Object.defineProperty(navigator, 'windowControlsOverlay', {
      configurable: true,
      value: Object.assign(new EventTarget(), {
        visible: true,
        getTitlebarAreaRect: () => new DOMRect(0, 0, innerWidth - windowButtons, captionHeight),
      }),
    })

    const box = (tag, attributes, style) => {
      const element = document.createElement(tag)
      for (const [name, value] of attributes) element.setAttribute(name, value)
      element.style.cssText = style
      return element
    }
    const shell = box('div', [], 'position:fixed;inset:0;background:white;z-index:9')
    // The sidebar slot's root child carries the sidebar-root part the walk assigns.
    const sidebarSlotEl = box('div', sidebarSlot, 'position:absolute;inset:0 auto 0 0;width:16%')
    const sidebarRoot = box('div', [['class', rootClass]], 'width:100%;height:100%')
    const sidebar = box('button', [], 'width:100%;height:100%')
    sidebar.textContent = 'Sessions'
    sidebarRoot.append(sidebar)
    sidebarSlotEl.append(sidebarRoot)
    const outlet = box('div', main, 'display:contents')
    const frame = box('div', [[phase, 'active']], `position:absolute;inset:${captionHeight}px 16% 0;display:flex;flex-direction:column`)
    const slot = box('div', headerSlot, 'display:contents')
    const headerHeight = 36
    const header = box('header', [['class', classes.header]], `display:flex;align-items:center;justify-content:space-between;position:relative;padding:0;height:${headerHeight}px;min-height:0`)
    const title = box('span', [['class', classes.title]], '')
    title.textContent = 'Session title'
    const controls = [
      [classes.tabs, 'View tab'], [classes.utilities, 'Header action'], [classes.corner, 'Right panel'],
    ].map(([className, label]) => {
      const group = box('div', [['class', className]], 'margin:0;width:auto;min-height:0')
      const button = box('button', [], '')
      button.textContent = label
      group.append(button)
      return group
    })
    const viewList = box('div', [...tablist, ['class', classes.tablist], ['role', 'tablist']], '')
    viewList.append(controls[0].firstElementChild)
    const moreViews = box('button', [['aria-label', 'More views'], ['aria-haspopup', 'menu']], '')
    controls[0].append(viewList, moreViews)
    const utilities = controls[1]
    const utilitySlot = box('div', [], 'display:contents')
    utilitySlot.append(utilities.firstElementChild)
    const sessionMenu = box('button', [['aria-label', 'More actions'], ['aria-haspopup', 'menu']], '')
    sessionMenu.innerHTML = '<span><svg width="16" height="16"><circle cx="8" cy="8" r="2"/></svg></span>'
    utilities.append(utilitySlot, sessionMenu)
    const chat = box('section', content, 'flex:1;position:relative')
    chat.setAttribute('aria-label', 'Conversation')
    const rail = box('aside', [['class', railClass]], `position:absolute;inset:${captionHeight + headerHeight}px 16% 0 auto;width:20%;background:white`)
    rail.setAttribute('aria-label', 'Details')
    const rightbar = box('div', [...rightbarAttrs, ['aria-label', 'Host right panel']], 'position:absolute;inset:0 0 0 auto;width:16%;background:white')
    header.append(title, ...controls)
    slot.append(header)
    frame.append(slot, chat)
    outlet.append(frame)
    shell.append(sidebarSlotEl, outlet, rail, rightbar)
    document.body.prepend(shell)
  }, { phase: PHASE, windows: WINDOWS, main: MAIN, headerSlot: HEADER_SLOT, content: CONTENT, tablist: TABLIST, classes: CLASSES, rootClass: localClass('root'), sidebarSlot: SIDEBAR_SLOT, rightbarAttrs: RIGHTBAR_ATTRS, railClass: RAIL_CLASS })
}

export default spec({ page: 'desktop' }, ({ test }) => {
  test('the title and its menu stay visible while the tabs and tools follow the pointer', async (t) => {
    const { page } = t
    await t.prefs({ motion: 'full' })
    await mount(t)
    const header = page.locator(`[${MARK}]`)
    const chat = page.getByRole('region', { name: 'Conversation' })
    const sidebar = page.getByRole('button', { name: 'Sessions', exact: true })
    const rail = page.getByRole('complementary', { name: 'Details' })
    const rightbar = page.locator(RIGHTBAR)
    const title = header.getByText('Session title', { exact: true })
    const tab = header.getByRole('button', { name: 'View tab' })
    const moreViews = header.getByRole('button', { name: 'More views' })
    const action = header.getByRole('button', { name: 'Header action' })
    const corner = header.getByRole('button', { name: 'Right panel' })
    const sessionMenu = header.getByRole('button', { name: 'More actions' })
    const visibility = async () => {
      await header.evaluate(async element => {
        const fades = element.getAnimations({ subtree: true }).filter(animation =>
          animation instanceof CSSTransition && animation.transitionProperty === 'opacity')
        await Promise.all(fades.map(animation => animation.finished))
      })
      return Promise.all([title, sessionMenu, tab, moreViews, action, corner].map(locator =>
        locator.evaluate(element => element.checkVisibility({ opacityProperty: true }))))
    }
    const shown = [true, true, true, true, true, true]
    const titleOnly = [true, true, false, false, false, false]
    await header.waitFor()
    const toolbarTabs = header.locator(`[${TAB_STRIP}]`)
    await toolbarTabs.waitFor()
    t.expectThat.equal(await visibility(), titleOnly, 'the title and its menu are painted at rest')
    const menuFollowsTitle = async () => {
      const [text, menu] = await Promise.all([title.boundingBox(), sessionMenu.boundingBox()])
      return menu.x === text.x + text.width && menu.y + menu.height / 2 === text.y + text.height / 2
    }
    t.expectThat.equal(await menuFollowsTitle(), true, 'the menu touches the title in the conversation header')
    const menuIcon = await sessionMenu.evaluate(element => ({
      svgMask: getComputedStyle(element, '::before').maskImage.includes('data:image/svg+xml'),
      original: getComputedStyle(element.querySelector('svg')).visibility,
    }))
    t.expectThat.equal(menuIcon, { svgMask: true, original: 'hidden' }, 'the visible button uses the replacement SVG')
    const chatBox = await chat.boundingBox()
    await header.evaluate(element => {
      element.fadeSamples = []
      element.addEventListener('transitionrun', (event) => {
        if (event.propertyName !== 'opacity') return
        const fade = event.target.getAnimations().find(animation =>
          animation instanceof CSSTransition && animation.transitionProperty === event.propertyName)
        if (fade === undefined) return
        const [from, to] = fade.effect.getKeyframes().map(frame => Number(frame.opacity))
        // Read the midpoint on the animation timeline, independently of runner frame time (D92).
        fade.currentTime = Number(fade.effect.getTiming().duration) / 2
        const middle = Number(getComputedStyle(event.target).opacity)
        element.fadeSamples.push({ from, middle, to })
      })
    })

    await chat.hover({ position: { x: chatBox.width / 4, y: chatBox.height / 2 } })
    t.expectThat.equal(await visibility(), shown, 'the conversation shows the controls')
    // The caption carries the sidebar's collapse control, so the sidebar and the
    // details rail keep the header buttons up; only the host right panel hides them.
    await rail.hover()
    t.expectThat.equal(await visibility(), shown, 'the details rail keeps the controls up')
    await sidebar.hover()
    t.expectThat.equal(await visibility(), shown, 'the sidebar keeps the controls up')
    await rightbar.hover()
    t.expectThat.equal(await visibility(), titleOnly, 'the host right panel hides the controls')
    const samples = await header.evaluate(element => element.fadeSamples)
    t.expectThat.equal(samples.some(({ from, middle, to }) => from === 1 && from > middle && middle > to && to === 0), true,
      'leaving interpolates opacity from one to zero')
    await chat.hover({ position: { x: chatBox.width / 4, y: chatBox.height / 2 } })
    t.expectThat.equal(await visibility(), shown, 'returning to the conversation shows the controls')
    const entering = await header.evaluate(element => element.fadeSamples)
    t.expectThat.equal(entering.some(({ from, middle, to }) => from === 0 && from < middle && middle < to && to === 1), true,
      'entering interpolates opacity from zero to one')
    await action.hover()
    t.expectThat.equal(await visibility(), shown, 'a tool responds as a hover target while hidden')

    const headerBox = await header.boundingBox()
    const blankCaption = { x: headerBox.x + headerBox.width / 2, y: headerBox.y / 2 }
    await page.mouse.move(blankCaption.x, blankCaption.y)
    t.expectThat.equal(await visibility(), shown, 'the blank Windows caption space reveals the controls')
    // The native drag region hands the pointer off with no relatedTarget; the
    // blank band must keep the controls up rather than read as a window exit.
    await page.evaluate(point => {
      const target = document.elementFromPoint(point.x, point.y) || document.body
      target.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', clientX: point.x, clientY: point.y, relatedTarget: null }))
    }, blankCaption)
    t.expectThat.equal(await visibility(), shown, 'a handoff into blank caption space keeps the controls up')
    // Leaving the window from the caption direction raises pointerleave on the
    // document; the toolbar hides even though the exit sits inside the band.
    await page.evaluate(point => {
      document.documentElement.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse', clientX: point.x, clientY: 0 }))
    }, blankCaption)
    t.expectThat.equal(await visibility(), titleOnly, 'leaving the window from the caption hides the controls')
    await sidebar.hover()
    await sidebar.focus()
    await page.keyboard.press('Tab')
    t.expectThat.equal(await tab.evaluate(element => element === document.activeElement), true, 'the hidden tab is keyboard reachable')
    t.expectThat.equal(await visibility(), shown, 'keyboard focus shows the controls')
    t.expectThat.equal(await chat.boundingBox(), chatBox, 'the conversation keeps its box as the controls toggle')
    await t.prefs({ motion: 'reduced' })
    await sidebar.focus()
    const tabGroupTransition = await toolbarTabs.evaluate(element => getComputedStyle(element).transitionProperty)
    t.expectThat.equal(tabGroupTransition, 'none', 'reduced motion applies opacity directly')
    await t.prefs({ headerBand: false })
    await title.evaluate(element => { element.style.width = '110px' })
    t.expectThat.equal(await menuFollowsTitle(), true, 'the menu follows the title after resizing with the caption lift disabled')
    await t.prefs({ hideToolbarOutsideConversation: false })
    await rightbar.hover()
    await header.and(page.locator(`[${MARK}="shown"]`)).waitFor()
    t.expectThat.equal(await visibility(), shown, 'turning off automatic hiding keeps the tools visible over the right panel')
    t.expectThat.equal(await menuFollowsTitle(), true, 'the session menu keeps its place with automatic hiding disabled')
    await t.prefs({ hideToolbarOutsideConversation: true })
    await header.and(page.locator(`[${MARK}="hidden"]`)).waitFor()
    t.expectThat.equal(await visibility(), titleOnly, 'turning automatic hiding back on applies at the current pointer')
    await t.prefs({ viewTabs: false })
    await toolbarTabs.waitFor({ state: 'detached' })
    t.expectThat.equal(await visibility(), [true, true, true, true, false, false], 'the native tabs stay visible while the right-hand tools hide')
  })
})
