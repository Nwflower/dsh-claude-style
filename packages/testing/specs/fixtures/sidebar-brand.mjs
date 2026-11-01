/** The sidebar brand shapes ui-sidebar renders on macOS desktop and on the web. */
async function mountSidebarBrand(t, tag) {
  await t.page.evaluate(({ attributes, tag }) => {
    const sidebar = document.createElement('div')
    for (const [name, value] of attributes) sidebar.setAttribute(name, value)
    sidebar.setAttribute('data-test-brand-sidebar', '')
    sidebar.style.cssText = 'position:fixed;left:24px;top:24px;padding:24px;z-index:1'
    const root = document.createElement('div')
    root.className = '_root_brand_1'
    const row = document.createElement('div')
    row.className = '_logoRow_brand_1'
    const brand = document.createElement(tag)
    brand.className = '_brand_brand_1 _wide_brand_1'
    if (tag === 'button') brand.type = 'button'
    const identity = document.createElement('span')
    identity.className = '_brandIdentity_brand_1'
    for (const [part, label] of [['Mark', ''], ['Name', 'DeepSeek']]) {
      const element = document.createElement('span')
      element.className = `_brand${part}_brand_1`
      element.setAttribute('data-test-brand-art', part)
      const original = document.createElement('span')
      original.textContent = label
      element.append(original)
      identity.append(element)
    }
    brand.append(identity)
    row.append(brand)
    root.append(row)
    sidebar.append(root)
    document.body.append(sidebar)
  }, { attributes: t.host.attributes('shell.sidebar-slot'), tag })
  await t.page.waitForSelector(t.host('shell.sidebar-brand'))
  await t.settle()
}

/** Resolve the chosen logo ink through the browser and read both visible masks. */
async function readSidebarBrandInk(t) {
  return t.page.evaluate(() => {
    const swatch = document.createElement('span')
    swatch.style.color = 'var(--dsh-claude-logo-ink)'
    document.body.append(swatch)
    const expected = getComputedStyle(swatch).color
    swatch.remove()
    const art = [...document.querySelectorAll('[data-test-brand-art]')].map((element) => {
      const style = getComputedStyle(element, '::before')
      return { part: element.getAttribute('data-test-brand-art'), fill: style.backgroundColor, mask: style.maskImage }
    })
    return { expected, art }
  })
}

export { mountSidebarBrand, readSidebarBrandInk }
