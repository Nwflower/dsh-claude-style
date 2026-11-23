/**
 * Render the settings section's stand-in React tree on one tab and evaluate
 * `inspect(tree, helpers)` inside the page (D92).
 */
export async function inspectSettingsTab(t, tab, inspect, arg) {
  return t.page.evaluate(({ tabName, fnSource, payload }) => {
    const Section = window.__slotComponents?.['claude-style']
    if (Section === undefined) throw new Error('the Claude Style settings section is not registered')
    const react = window.__react
    react.rendering = true
    react.states = { general: tabName }
    const tree = Section({})
    react.rendering = false
    react.states = null
    const walk = (node, visit) => {
      if (node === null || node === undefined || typeof node !== 'object') return
      if (Array.isArray(node)) { node.forEach(child => walk(child, visit)); return }
      visit(node)
      walk(node.props?.children, visit)
    }
    const textOf = (node) => {
      if (typeof node === 'string' || typeof node === 'number') return String(node)
      if (Array.isArray(node)) return node.map(textOf).join('')
      if (node !== null && typeof node === 'object') return textOf(node.props?.children)
      return ''
    }
    const has = (node, name) => (` ${node.props?.className ?? ''} `).includes(` ${name} `)
    const fn = new Function('tree', 'helpers', 'arg', `return (${fnSource})(tree, helpers, arg)`)
    return fn(tree, { walk, textOf, has }, payload)
  }, { tabName: tab, fnSource: inspect.toString(), payload: arg })
}
