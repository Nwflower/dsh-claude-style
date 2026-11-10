/**
 * A plugin's footer widget reaches the account surface through a copy the
 * takeover rebuilds from the plugin's node. The copy was laid out in the
 * footer's content box, and the account row is narrower than that box whenever
 * the update indicator shares the row's line. The account card takes the
 * footer's width, so the copy keeps the proportions it has in the footer and a
 * row with a label, an amount, a percentage and a bar stays on one line.
 *
 * @capability account-menu
 * @features account
 * @risk A plugin with a wide two-line footer card has its copy's label folded onto a second line in the account card, which grows taller than the footer it mirrors and looks broken.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'

/** The attribute the skin writes its part marks into. */
const PART = surface.attribute('skin.part')
/** The live copy the account surface stands in place of a plugin's footer widget. */
const EMBED = surface('account.embed')
/** The card the host portals as the account menu. */
const MENU = surface('account.menu')
/** The host's account trigger: the button the host marks as a menu anchor. */
const ACCOUNT_TRIGGER = host('shell.account-trigger')

/**
 * A quota widget shaped like the usage plugins' wide footer card: a header with
 * the service name and a badge, then one row per window with a label, an amount,
 * a percentage and a progress bar. It is one button, as the plugins ship it,
 * standing in the host's action slot. The stylesheet stands in for the plugin's
 * own, which the stand-in page does not carry.
 */
const mountWideWidget = (t) => t.page.evaluate(({ part }) => {
  const actions = document.querySelector(`[${part}~="footer-actions"]`)
  if (actions === null) throw new Error('the stand-in action slot is missing')
  const style = document.createElement('style')
  style.textContent = `
    .probe-wide-widget { display: flex; flex-direction: column; gap: 6px; width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #888; font: inherit; }
    .probe-wide-widget .probe-head { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 13px; line-height: 20px; }
    .probe-wide-widget .probe-name { white-space: nowrap; text-overflow: ellipsis; overflow: hidden; min-width: 0; font-weight: 500; }
    .probe-wide-widget .probe-spacer { flex: 1; }
    .probe-wide-widget .probe-badge { white-space: nowrap; border-radius: 999px; padding: 1px 8px; font-size: 12px; line-height: 17px; }
    .probe-wide-widget .probe-row { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .probe-wide-widget .probe-line { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
    .probe-wide-widget .probe-label { flex: 1; font-size: 12px; line-height: 16px; }
    .probe-wide-widget .probe-amount { flex: none; white-space: nowrap; font-size: 12px; line-height: 16px; }
    .probe-wide-widget .probe-pct { flex: none; width: 34px; text-align: right; font-size: 12px; line-height: 16px; }
    .probe-wide-widget .probe-bar { height: 5px; border-radius: 999px; overflow: hidden; background: #ddd; }
    .probe-wide-widget .probe-fill { height: 100%; background: #c60; }
  `
  document.head.appendChild(style)
  const card = document.createElement('button')
  card.type = 'button'
  card.className = 'probe-wide-widget'
  card.setAttribute('aria-label', 'Command Code · Go · 5 小时 $1.23 (42%) · 每周 $8.76 (18%)')
  const head = document.createElement('div')
  head.className = 'probe-head'
  const name = document.createElement('span')
  name.className = 'probe-name'
  name.textContent = 'Command Code'
  const headSpacer = document.createElement('span')
  headSpacer.className = 'probe-spacer'
  const badge = document.createElement('span')
  badge.className = 'probe-badge'
  badge.textContent = 'Pro'
  head.append(name, headSpacer, badge)
  card.appendChild(head)
  for (const window of [
    { label: '5 小时', amount: '$1.23', pct: '42%', fill: '42%' },
    { label: '每周', amount: '$8.76', pct: '18%', fill: '18%' },
  ]) {
    const row = document.createElement('div')
    row.className = 'probe-row'
    const line = document.createElement('div')
    line.className = 'probe-line'
    const label = document.createElement('span')
    label.className = 'probe-label'
    label.textContent = window.label
    const spacer = document.createElement('span')
    spacer.className = 'probe-spacer'
    const amount = document.createElement('span')
    amount.className = 'probe-amount'
    amount.textContent = window.amount
    const pct = document.createElement('span')
    pct.className = 'probe-pct'
    pct.textContent = window.pct
    line.append(label, spacer, amount, pct)
    const bar = document.createElement('div')
    bar.className = 'probe-bar'
    const fill = document.createElement('div')
    fill.className = 'probe-fill'
    fill.style.width = window.fill
    bar.appendChild(fill)
    row.append(line, bar)
    card.appendChild(row)
  }
  actions.appendChild(card)
}, { part: PART })

/** The copy's geometry inside the open account surface. */
const copyGeometry = (t) => t.page.evaluate(({ embedSelector, menuSelector, part }) => {
  const embed = Array.from(document.querySelectorAll(embedSelector))
    .find(el => el.querySelector('.probe-wide-widget') !== null)
  if (embed === undefined) throw new Error('the widget was not gathered into the account surface')
  const card = embed.querySelector('.probe-wide-widget')
  const labels = Array.from(card.querySelectorAll('.probe-label'))
  const name = card.querySelector('.probe-name')
  const menu = document.querySelector(menuSelector)
  if (menu === null) throw new Error('the account menu is not open')
  const foot = document.querySelector(`[${part}~="foot-area"]`)
  if (foot === null) throw new Error('the stand-in footer is missing')
  const footStyle = getComputedStyle(foot)
  const footerWidth = Math.round(foot.clientWidth - parseFloat(footStyle.paddingLeft) - parseFloat(footStyle.paddingRight))
  return {
    footerWidth,
    cardWidth: Math.round(card.getBoundingClientRect().width),
    labelHeights: labels.map(el => Math.round(el.getBoundingClientRect().height)),
    labelClipped: labels.map(el => el.scrollWidth > el.clientWidth + 1),
    nameClipped: name.scrollWidth > name.clientWidth + 1,
    menuOverflow: menu.scrollWidth > menu.clientWidth + 1,
  }
}, { embedSelector: EMBED, menuSelector: MENU, part: PART })

export default spec({ page: 'desktop' }, ({ test }) => {
  test('a wide footer widget keeps its row on one line inside the account card', async (t) => {
    await mountWideWidget(t)
    await t.page.evaluate((selector) => document.querySelector(selector)?.click(), ACCOUNT_TRIGGER)
    await t.settle()

    const geometry = await copyGeometry(t)
    t.expectThat.equal(geometry.footerWidth > 0, true, 'the footer has a content width to carry')
    const footerWidth = geometry.footerWidth
    t.expectThat.equal(Math.abs(geometry.cardWidth - footerWidth) <= 6, true,
      `the copy keeps the footer's width (${geometry.cardWidth} against ${footerWidth})`)
    t.expectThat.equal(geometry.labelHeights, [16, 16],
      'each quota label stays on its row\'s single line')
    t.expectThat.equal(geometry.labelClipped, [false, false],
      'each quota label fits its row without truncation')
    t.expectThat.equal(geometry.nameClipped, false,
      'the service name fits the card\'s header')
    t.expectThat.equal(geometry.menuOverflow, false,
      'the account card stays within its own width')
  })
})
