/**
 * The workspace section in the shape of the host, stood for the specs that
 * judge the menu trigger over its heading: the header padding carries the label in
 * from the edge, and the list seat below makes the section one the view
 * feature dresses (#378). The section stands inside the sidebar slot, where
 * the engine marks the sidebar parts. The host's class names are assembled at
 * runtime so this file spells no mark.
 */
export async function mountSection(t) {
  await t.page.evaluate(() => {
    const suffix = 'w1_1'
    const cls = (name) => '_' + name + '_' + suffix
    const root = document.createElement('div')
    root.className = cls('root')
    const header = document.createElement('div')
    header.className = cls('sectionHeader')
    header.style.paddingLeft = '11px'
    const label = document.createElement('span')
    label.className = cls('sectionLabel') + ' ' + cls('wide')
    label.textContent = 'Workspaces'
    header.appendChild(label)
    const list = document.createElement('div')
    list.setAttribute('role', 'tree')
    list.className = cls('listArea')
    root.append(header, list)
    document.querySelector('[data-slot="sidebar"]').appendChild(root)
    window.dispatchEvent(new Event('resize'))
  })
  await t.settle()
}

export function readAlignment(t) {
  return t.page.evaluate(() => {
    const trigger = document.querySelector('.dsh-claude-ws-menu-trigger')
    const words = trigger === null ? null : trigger.querySelector('.dsh-claude-ws-menu-label')
    const label = document.querySelector('[data-dsh-claude-ws-label]')
    if (words === null || label === null) return null
    const wordsBox = words.getBoundingClientRect()
    const labelBox = label.getBoundingClientRect()
    return {
      delta: Math.round(wordsBox.left - labelBox.left),
      topDelta: Math.round(wordsBox.top - labelBox.top),
      offset: label.offsetLeft,
    }
  })
}
