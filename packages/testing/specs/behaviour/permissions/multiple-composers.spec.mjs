/**
 * A subagent's composer carries the same permission control as the main
 * conversation, and its choice is written to the session that composer shows.
 *
 * @capability permissions
 * @features composer, permissions
 * @risk The subagent cannot change its permission tier, or its pick silently changes the main session instead.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'
import { mountDockedComposer } from '../../fixtures/docked-composer.mjs'

const SUBAGENT_SESSION = 'subagent-session'
const SIDEBAR_CHAT = host('sidebar.chat')
const COMPOSER_CARD = host('composer.card')
const PERMISSION_CONTAINER = surface('permissions.container')
const PERMISSION_TRIGGER = surface('permissions.trigger')
const PERMISSION_POPOVER = surface('permissions.popover')
const PERMISSION_CONTROL = surface.attribute('permissions.control')
const POPOVER_OPEN = surface.attribute('popover.open')

async function mountSubagent(t) {
  // The session binding answers before the card is mounted: the skin binds the
  // trigger as soon as the card lands, and the patch must be in place by then.
  await t.page.evaluate((config) => {
    const sessions = window.__ctx.get('sessions')
    const main = sessions.binding('smoke-session')
    const commands = []
    sessions.binding = (id) => id === config.sessionId ? {
      session: {
        projections: { faceOf: () => ({ getSnapshot: () => ({ currentValue: 'workspace-write' }) }) },
        command(line) { commands.push(line); return undefined },
      },
    } : main
    window.__subagentPermissionCommands = commands
  }, { sessionId: SUBAGENT_SESSION })
  await mountDockedComposer(t, {
    sidebar: host.attributes('sidebar.chat'),
    session: [[host('conversation.session-attribute'), SUBAGENT_SESSION]],
    card: host.attributes('composer.card'),
    parts: [{
      attributes: host.attributes('composer.access-slot'),
      html: '<button type="button" aria-label="Access mode, current: Edit">Edit</button>',
    }],
  })
  await t.page.locator(SIDEBAR_CHAT + ' ' + PERMISSION_TRIGGER).waitFor({ state: 'visible' })
}
export default spec({ page: 'automode' }, ({ test }) => {
  test('each composer switches the permission tier of its own session', async (t) => {
    await mountSubagent(t)
    t.expectThat.equal(await t.page.locator(PERMISSION_CONTAINER).count(), 2, 'both composers carry the Claude permission control')
    t.expectThat.equal(await t.page.locator(PERMISSION_POPOVER).count(), 2, 'each permission control keeps its own popover')
    t.expectThat.equal(await t.page.locator(COMPOSER_CARD + ' button[' + PERMISSION_CONTROL + '="access"]').count(), 2, 'both host access triggers are marked')

    const mainTrigger = t.page.locator(COMPOSER_CARD).first().locator(PERMISSION_TRIGGER)
    await mainTrigger.click()
    await t.page.locator(PERMISSION_POPOVER + '[' + POPOVER_OPEN + '="true"]').waitFor({ state: 'visible' })
    const subagentTrigger = t.page.locator(SIDEBAR_CHAT + ' ' + PERMISSION_TRIGGER)
    await subagentTrigger.click()
    const openPopover = t.page.locator(PERMISSION_POPOVER + '[' + POPOVER_OPEN + '="true"]')
    await openPopover.waitFor({ state: 'visible' })
    await openPopover.locator(surface('permissions.auto-mode')).click()

    t.expectThat.equal(await t.page.evaluate(() => window.__subagentPermissionCommands), ['/permission auto-mode'], 'the subagent session receives its own permission command')
    t.expectThat.equal(await t.page.evaluate(() => window.__permissionCommands), [], 'the main session receives no subagent permission command')
  })
})