/**
 * A docked conversation as the host mounts it (D77): a sidebar chat column
 * holding an embedded conversation, its composer card, and the host's dock line
 * after the card. A spec adds what its own feature reads — the model slot, the
 * access slot, the meter's trigger — through the host contracts it already
 * names, so no spec spells a host attribute of its own.
 *
 * The options are plain data: `card.parts` become children of the card (each
 * with `tag`, host `attributes`, inline `style`, `html` or `text`), and
 * `dock` becomes the line after the card. Positions are the spec's, since what
 * a panel or a seat does depends on where the two cards stand in the window.
 *
 * @param t - the behaviour spec's page.
 * @param options - the sidebar's style, the card's parts, and the dock line.
 */
async function mountDockedComposer(t, options = {}) {
  const { style = {}, cardStyle = {}, parts = [], dock = null, prepend = false, heroRoot = null } = options
  await t.page.evaluate((config) => {
    const set = (element, pairs) => {
      for (const [name, value] of pairs) element.setAttribute(name, value)
    }
    const build = (part) => {
      const element = document.createElement(part.tag)
      if (part.attributes) set(element, part.attributes)
      if (part.style) Object.assign(element.style, part.style)
      if (part.html !== undefined) element.innerHTML = part.html
      if (part.text !== undefined) element.textContent = part.text
      return element
    }
    const sidebar = document.createElement('div')
    set(sidebar, config.sidebar)
    Object.assign(sidebar.style, config.style)
    const conversation = document.createElement('div')
    set(conversation, config.session)
    if (config.heroRoot !== null && config.heroRoot.inside) set(conversation, config.heroRoot.attributes)
    const card = document.createElement('div')
    set(card, config.card)
    Object.assign(card.style, config.cardStyle)
    for (const part of config.parts) card.append(build(part))
    conversation.append(card)
    if (config.dock !== null) {
      const line = document.createElement('div')
      if (config.dock.attributes) set(line, config.dock.attributes)
      line.innerHTML = config.dock.html
      conversation.append(line)
    }
    sidebar.append(conversation)
    if (config.prepend) document.body.prepend(sidebar)
    else document.body.append(sidebar)
    if (config.heroRoot !== null && !config.heroRoot.inside) {
      const root = document.createElement('div')
      set(root, config.heroRoot.attributes)
      root.style.display = 'contents'
      document.body.append(root)
    }
  }, {
    sidebar: options.sidebar,
    session: options.session,
    card: options.card,
    style,
    cardStyle,
    parts,
    dock,
    prepend,
    heroRoot,
  })
}

/** The ring of circles the host draws in a meter's trigger, told from the pills beside it. */
const METER_TRIGGER_HTML = '<span><button type="button" aria-haspopup="dialog" aria-expanded="false" aria-label="Context used 42%">' +
  '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5.5"></circle><circle cx="7" cy="7" r="5.5" stroke-dasharray="14 8"></circle></svg>' +
  '<span>42%</span></button></span>'

/** The host's metering panel, as the stand-in's context-panel.js draws it: a dialog over its trigger. */
const METER_PANEL_HTML = '<div><span>上下文已用</span><span>42%</span></div>' +
  '<dl>' +
    '<div><dt>系统提示词</dt><dd>~1.5K</dd></div>' +
    '<div><dt>工具定义</dt><dd>~7.8K</dd></div>' +
    '<div><dt>对话消息</dt><dd>~18K</dd></div>' +
  '</dl>'

export { mountDockedComposer, METER_TRIGGER_HTML, METER_PANEL_HTML }
