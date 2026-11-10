import parser from 'postcss-selector-parser'

/**
 * Host markup built from the host contract (D3, D92): a spec names the
 * contract's selector and gets an element carrying exactly what it reads, so a
 * host rename stays in packages/contracts/src/dom.ts. Only a compound selector
 * names one element; a combinator, pseudo-class or list is refused.
 */
export function hostElement<T extends HTMLElement = HTMLElement>(selector: string, value?: string): T {
  const root = parser().astSync(selector)
  if (root.nodes.length !== 1) throw new Error(`hostElement: "${selector}" is a list, not one element`)
  let tag = 'div'
  const classes: string[] = []
  const attributes: [string, string][] = []
  for (const node of root.nodes[0].nodes) {
    if (node.type === 'tag') tag = node.value
    else if (node.type === 'class') classes.push(node.value)
    else if (node.type === 'attribute' && (node.operator === undefined || node.operator === '=' || node.operator === '~=')) {
      attributes.push([node.attribute, node.value ?? value ?? ''])
    } else throw new Error(`hostElement: "${selector}" holds ${node.type} "${String(node)}", which names no single element`)
  }
  const element = document.createElement(tag) as T
  if (classes.length > 0) element.className = classes.join(' ')
  for (const [name, written] of attributes) element.setAttribute(name, written)
  return element
}

/** The one attribute a `[name]` contract selector reads. */
export function hostAttribute(selector: string): string {
  const root = parser().astSync(selector)
  const only = root.nodes[0]?.nodes
  if (root.nodes.length !== 1 || only?.length !== 1 || only[0].type !== 'attribute') {
    throw new Error(`hostAttribute: "${selector}" is not one attribute`)
  }
  return only[0].attribute
}

/** An element built from a contract selector, attached to the page and given its children. */
export function attach<T extends HTMLElement = HTMLElement>(parent: Element, selector: string, value?: string): T {
  const element = hostElement<T>(selector, value)
  parent.append(element)
  return element
}
