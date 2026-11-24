/**
 * @capability header-visibility
 * @features header-band, header-visibility, view-tabs
 * @risk The session menu leaves the title, the toolbar hides over the conversation or host right panel or across the lifted caption's 8px control gaps and lower margin, stays stuck visible after leaving through the Windows caption drag strip or top edge, fails to hide over the sidebar, or hides the native view tabs while right alignment is disabled.
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
const RIGHTBAR_HANDLE = host('shell.rightbar-handle')
const RIGHTBAR_HANDLE_ATTRS = host.attributes('shell.rightbar-handle')
const SESSION_PANEL = host.attributes('conversation.session-panel')
const CLASSES = {
  header: partClass(HEADER_PARTS, 'conversation-header'),
  titleRow: partClass(HEADER_PARTS, 'title-row'),
  title: partClass(HEADER_PARTS, 'header-title'),
  tabs: partClass(HEADER_PARTS, 'view-tabs'),
  tablist: partClass(HEADER_PARTS, 'view-tabs-list'),
  more: partClass(HEADER_PARTS, 'view-tabs-more'),
  utilities: partClass(HEADER_PARTS, 'header-utilities'),
  corner: partClass(HEADER_PARTS, 'header-corner'),
}

async function mount(t) {
  await t.page.evaluate(({ phase, windows, main, headerSlot, content, tablist, classes, rootClass, sidebarSlot, rightbarAttrs, rightbarHandleAttrs, sessionPanel }) => {
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
    const sidebarSlotEl = box('div', sidebarSlot, `position:absolute;inset:${captionHeight}px auto 0 0;width:16%`)
    const sidebarRoot = box('div', [['class', rootClass]], 'width:100%;height:100%')
    const sidebar = box('button', [], 'width:100%;height:100%')
    sidebar.textContent = 'Sessions'
    sidebarRoot.append(sidebar)
    sidebarSlotEl.append(sidebarRoot)
    const outlet = box('div', main, 'display:contents')
    const frame = box('div', [[phase, 'active']], `position:absolute;inset:${captionHeight}px 16% 0;display:flex;flex-direction:column`)
    const slot = box('div', headerSlot, 'display:contents')
    const headerHeight = 36
    const header = box('header', [['class', classes.header]], `display:grid;position:relative;padding:0;min-height:${headerHeight}px`)
    const titleRow = box('div', [['class', classes.titleRow]], `display:flex;align-items:center;justify-content:space-between;height:${headerHeight}px;min-height:0`)
    const title = box('span', [['class', classes.title]], 'display:inline-block;width:120px;height:20px')
    title.textContent = 'Session title'
    const controls = [
      [classes.tabs, 'View tab'], [classes.utilities, 'Header action'], [classes.corner, 'Right panel'],
    ].map(([className, label]) => {
      const group = box('div', [['class', className]], 'display:inline-flex;align-items:center;margin:0;width:auto;min-height:0')
      const button = box('button', [], 'width:28px;height:28px;padding:0')
      button.textContent = label
      group.append(button)
      return group
    })
    const viewList = box('div', [...tablist, ['class', classes.tablist], ['role', 'tablist']], '')
    viewList.append(controls[0].firstElementChild)
    const moreViews = box('button', [['class', classes.more], ['aria-label', 'More views'], ['aria-haspopup', 'menu'], ['aria-expanded', 'false']], 'width:28px;height:28px;padding:0')
    controls[0].append(viewList, moreViews)
    const utilities = controls[1]
    const utilitySlot = box('div', [], 'display:contents')
    utilitySlot.append(utilities.firstElementChild)
    const sessionMenu = box('button', [['aria-label', 'More actions'], ['aria-haspopup', 'menu'], ['aria-expanded', 'false']], 'width:28px;height:28px;padding:0')
    sessionMenu.innerHTML = '<span><svg width="16" height="16"><circle cx="8" cy="8" r="2"/></svg></span>'
    utilities.append(utilitySlot, sessionMenu)
    const chat = box('section', content, 'flex:1;position:relative')
    chat.setAttribute('aria-label', 'Conversation')
    const panel = box('aside', sessionPanel, 'position:absolute;inset:12px 8px auto auto;width:30%;height:50%;background:white')
    panel.setAttribute('aria-label', 'Session panel')
    chat.append(panel)
    const rightbar = box('div', [...rightbarAttrs, ['aria-label', 'Host right panel']], `position:absolute;inset:${captionHeight}px 0 0 auto;width:16%;background:white`)
    const rightbarHandle = box('div', rightbarHandleAttrs, `position:absolute;inset:${captionHeight}px calc(16% - 4px) 0 auto;width:8px;z-index:2`)
    titleRow.append(title, utilities, controls[2])
    header.append(titleRow, controls[0])
    slot.append(header)
    frame.append(slot, chat)
    outlet.append(frame)
    shell.append(sidebarSlotEl, outlet, rightbar, rightbarHandle)
    document.body.prepend(shell)
  }, { phase: PHASE, windows: WINDOWS, main: MAIN, headerSlot: HEADER_SLOT, content: CONTENT, tablist: TABLIST, classes: CLASSES, rootClass: localClass('root'), sidebarSlot: SIDEBAR_SLOT, rightbarAttrs: RIGHTBAR_ATTRS, rightbarHandleAttrs: RIGHTBAR_HANDLE_ATTRS, sessionPanel: SESSION_PANEL })
}

export default spec({ page: 'desktop' }, ({ test }) => {
  test('the title and its menu stay visible while the tabs and tools follow the pointer', async (t) => {
    const { page } = t
    await t.prefs({ motion: 'full' })
    await mount(t)
    const header = page.locator(`[${MARK}]`)
    const chat = page.getByRole('region', { name: 'Conversation' })
    const sidebar = page.getByRole('button', { name: 'Sessions', exact: true })
    const sessionPanel = page.getByRole('complementary', { name: 'Session panel' })
    const rightbar = page.locator(RIGHTBAR)
    const rightbarHandle = page.locator(RIGHTBAR_HANDLE)
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
    t.expectThat.equal(await menuFollowsTitle(), true, 'the menu touches the title in the caption')
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
    await sessionPanel.hover()
    t.expectThat.equal(await visibility(), shown, 'the session panel keeps the controls up')
    await rightbar.hover()
    t.expectThat.equal(await visibility(), shown, 'the host right panel keeps the controls up')
    await rightbarHandle.hover()
    t.expectThat.equal(await visibility(), shown, 'the right panel resize handle keeps the controls up')
    await sidebar.hover()
    t.expectThat.equal(await visibility(), titleOnly, 'the left sidebar hides the controls')
    const samples = await header.evaluate(element => element.fadeSamples)
    t.expectThat.equal(samples.some(({ from, middle, to }) => from === 1 && from > middle && middle > to && to === 0), true,
      'leaving interpolates opacity from one to zero')
    await chat.hover({ position: { x: chatBox.width / 4, y: chatBox.height / 2 } })
    t.expectThat.equal(await visibility(), shown, 'returning to the conversation shows the controls')
    const entering = await header.evaluate(element => element.fadeSamples)
    t.expectThat.equal(entering.some(({ from, middle, to }) => from === 0 && from < middle && middle < to && to === 1), true,
      'entering interpolates opacity from zero to one')
    await sidebar.hover()
    t.expectThat.equal(await visibility(), titleOnly, 'the sidebar hides the controls again')
    await action.hover()
    t.expectThat.equal(await visibility(), shown, 'a tool responds as a hover target while hidden')

    // The lifted caption controls bridge their 8px horizontal gaps and lower
    // margin down to y = 40 without claiming the top 6px edge or blank drag space.
    const [tabBox, moreBox, actionBox, cornerBox, menuBox] = await Promise.all([
      tab.boundingBox(), moreViews.boundingBox(), action.boundingBox(), corner.boundingBox(), sessionMenu.boundingBox(),
    ])
    const bandMiddle = actionBox.y + actionBox.height / 2
    await page.mouse.move((tabBox.x + tabBox.width + moreBox.x) / 2, bandMiddle)
    t.expectThat.equal(await visibility(), shown, 'the gap between the tablist and More views keeps the controls up')
    await page.mouse.move((moreBox.x + moreBox.width + actionBox.x) / 2, bandMiddle)
    t.expectThat.equal(await visibility(), shown, 'the gap between More views and the utilities keeps the controls up')
    await page.mouse.move((actionBox.x + actionBox.width + cornerBox.x) / 2, bandMiddle)
    t.expectThat.equal(await visibility(), shown, 'the gap between the utilities and the corner keeps the controls up')
    await page.mouse.move(actionBox.x + actionBox.width / 2, actionBox.y + actionBox.height + 3)
    t.expectThat.equal(await visibility(), shown, 'the lower caption margin between the buttons and the column keeps the controls up')

    // Entering the blank caption drag space or sliding out across the top 6px
    // edge hides the toolbar instead of leaving it stuck shown outside the window.
    const blankDrag = { x: (menuBox.x + menuBox.width + tabBox.x) / 2, y: bandMiddle }
    await page.mouse.move(blankDrag.x, blankDrag.y)
    t.expectThat.equal(await visibility(), titleOnly, 'the blank caption drag space hides the controls')
    await action.hover()
    t.expectThat.equal(await visibility(), shown, 'hovering a caption tool reveals the controls again')
    await action.evaluate((button, at) => {
      button.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', clientX: at.x, clientY: at.y, relatedTarget: null }))
      document.documentElement.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false, pointerType: 'mouse', clientX: at.x, clientY: at.y, relatedTarget: null }))
    }, { x: actionBox.x + actionBox.width / 2, y: 3 })
    t.expectThat.equal(await visibility(), titleOnly, 'sliding upward out of the caption across the top edge hides the controls')

    // Opening a portaled menu from the header keeps the toolbar visible while
    // the pointer moves outside the conversation and right panel.
    await moreViews.evaluate(element => element.setAttribute('aria-expanded', 'true'))
    await sidebar.hover()
    t.expectThat.equal(await visibility(), shown, 'an open header menu keeps the controls up')
    await moreViews.evaluate(element => element.setAttribute('aria-expanded', 'false'))
    t.expectThat.equal(await visibility(), titleOnly, 'closing the header menu applies the current pointer position')

    await sidebar.focus()
    await page.keyboard.press('Tab')
    t.expectThat.equal(await action.evaluate(element => element === document.activeElement), true, 'the hidden tool is keyboard reachable')
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
    await sidebar.hover()
    await header.and(page.locator(`[${MARK}="shown"]`)).waitFor()
    t.expectThat.equal(await visibility(), shown, 'turning off automatic hiding keeps the tools visible over the sidebar')
    t.expectThat.equal(await menuFollowsTitle(), true, 'the session menu keeps its place with automatic hiding disabled')
    await t.prefs({ hideToolbarOutsideConversation: true })
    await header.and(page.locator(`[${MARK}="hidden"]`)).waitFor()
    t.expectThat.equal(await visibility(), titleOnly, 'turning automatic hiding back on applies at the current pointer')
    await t.prefs({ viewTabs: false })
    await toolbarTabs.waitFor({ state: 'detached' })
    t.expectThat.equal(await visibility(), [true, true, true, true, false, false], 'the native tabs stay visible while the right-hand tools hide')
  })
})
