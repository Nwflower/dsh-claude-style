import { COMPOSER_HINT, HOME_LAYOUT_STUDIO, pickHeroGreeting, pickStudioGreeting } from '../../constants'
import { findComposerCards, findComposerInput, findComposerPlaceholder, findComposerPlaceholders, getUsername } from '../../core/host'
import { readPrefs } from '../../core/prefs'
import { removeStrayNodes } from '../../shared/popover'
import type { HostContext } from '../../core/host'
import type { Ui } from '../../core/scheduler'

export function install(ctx: HostContext, ui: Ui) {
  /** Shipped idle composer hints (zh / en, hero / default) this skin replaces. */
  const HINT_SOURCES = [
    '描述你想要构建的内容',
    '发消息或创建任务',
    'Describe what you want to build',
    'Message or run a task',
    'How can I help you today?',
    'Type / for commands',
  ]

  /** Whether a placeholder's text is one of the hints this skin replaces. */
  function isShippedHint(text: string) {
    for (let j = 0; j < HINT_SOURCES.length; j++) {
      if (text.indexOf(HINT_SOURCES[j]) === 0) return true
    }
    return false
  }

  /** The classic welcome's draw, renewed each time the page comes back to the hero. */
  let greetingDraw = Math.random()
  let wasHero = false

  function rewriteHeadline() {
    const hero = ui.composer!.isHero()
    if (hero && !wasHero) greetingDraw = Math.random()
    wasHero = hero
    // The studio dashboard shows one fixed line; the classic hero draws from
    // the clock slot's welcomes.
    const greeting = readPrefs().homeLayout === HOME_LAYOUT_STUDIO
      ? pickStudioGreeting(getUsername())
      : pickHeroGreeting(getUsername(), greetingDraw)
    const groups = document.querySelectorAll('[class*="titleGroup"]')
    for (let i = 0; i < groups.length; i++) {
      const spans = groups[i].children
      for (let j = 0; j < spans.length; j++) {
        const span = spans[j]
        const cls = span.getAttribute('class') || ''
        if (cls.includes('previewBadge')) continue
        if (span.textContent !== greeting) span.textContent = greeting
        break
      }
    }
  }

  function rewriteHint() {
    if (!ui.composer!.isActive()) return
    const targetHint = ui.composer!.isHero() ? COMPOSER_HINT : 'Type / for commands'
    const hints = findComposerPlaceholders()
    for (let i = 0; i < hints.length; i++) {
      const node = hints[i]
      const text = node.textContent || ''
      if (isShippedHint(text) && text !== targetHint) node.textContent = targetHint
    }
  }

  function syncAttachmentPlaceholder() {
    if (!ui.composer!.isActive()) {
      removeStrayNodes(document, '[data-dsh-synthetic-placeholder]', [])
      return
    }
    const targetHint = ui.composer!.isHero() ? COMPOSER_HINT : 'Type / for commands'
    const cards = findComposerCards()
    for (let ci = 0; ci < cards.length; ci++) {
      const card = cards[ci]
      const input = findComposerInput(card)
      if (!input) continue
      const text = (input.textContent || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim()
      const isEmpty = text.length === 0
      let placeholder = findComposerPlaceholder(card)
      const grow = input.closest ? input.closest('[class*="_grow"]') : input.parentElement

      if (isEmpty) {
        if (!placeholder && grow) {
          placeholder = document.createElement('div')
          placeholder.setAttribute('data-composer-placeholder', '')
          placeholder.setAttribute('data-dsh-synthetic-placeholder', 'true')
          placeholder.textContent = targetHint
          grow.appendChild(placeholder)
        } else if (placeholder) {
          if (placeholder.style.display === 'none') placeholder.style.display = ''
          const curText = placeholder.textContent || ''
          if (isShippedHint(curText) && curText !== targetHint) placeholder.textContent = targetHint
        }
      } else {
        if (placeholder && placeholder.hasAttribute('data-dsh-synthetic-placeholder')) {
          if (placeholder.parentElement) placeholder.parentElement.removeChild(placeholder)
        }
      }
    }
  }

  ui.copy = {
    sync() {
      rewriteHeadline()
      rewriteHint()
      // Every pass, the restyle on or off: its off branch is what takes the
      // skin's placeholders away again.
      syncAttachmentPlaceholder()
    },
    /** A composer input/compositionend event: refresh the placeholder. The
     * scheduler owns the [data-composer-input] filter. */
    onInput() { syncAttachmentPlaceholder() }
  }

  return () => {
    // The placeholders the skin added stand in for the host's own, so they
    // leave with it.
    removeStrayNodes(document, '[data-dsh-synthetic-placeholder]', [])
  }
}
