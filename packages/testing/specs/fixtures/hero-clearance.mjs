/**
 * The hero context row above the composer card, in the shape of the host: the
 * stack carries the hero part, the row spans it, and a control at the far end
 * stands where the git branch and the worktree picker stand (#378). The host's
 * class names are assembled at runtime so this file spells no mark.
 */
export async function mountRowControl(t) {
  await t.page.evaluate(() => {
    const suffix = 'x_1'
    const cls = (name) => '_' + name + '_' + suffix
    const card = document.querySelector('[data-composer-card]')
    const stack = card.parentElement
    stack.classList.add(cls('composerHero'))
    const row = document.createElement('div')
    row.className = cls('heroWorkspaceRow')
    row.style.display = 'flex'
    row.style.gap = '8px'
    const probe = document.createElement('button')
    probe.textContent = 'master'
    probe.style.marginLeft = 'auto'
    probe.setAttribute('data-clearance-probe', '')
    row.appendChild(probe)
    stack.insertBefore(row, card)
    window.__pushForm({ homeLayout: 'studio', mascot: 'crab' })
    window.dispatchEvent(new Event('resize'))
  })
  await t.settle()
}

export function readClearance(t) {
  return t.page.evaluate(() => {
    const row = document.querySelector('[data-dsh-claude-part~="hero-workspace-row"]')
    const probe = document.querySelector('[data-clearance-probe]')
    const mascot = document.querySelector('.dsh-claude-crab, .dsh-claude-deepy, .dsh-claude-whalegirl')
    const stack = row === null ? null : row.closest('[data-dsh-claude-part~="composer-hero"]')
    if (row === null || probe === null || mascot === null || stack === null) return null
    return {
      standing: stack.hasAttribute('data-dsh-claude-mascot-standing'),
      pad: parseFloat(getComputedStyle(row).paddingRight),
      clear: probe.getBoundingClientRect().right <= mascot.getBoundingClientRect().left,
    }
  })
}
