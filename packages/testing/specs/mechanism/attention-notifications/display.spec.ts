/**
 * @capability attention-notifications
 * @features attention-notifications
 * @risk A blocked site appears authorized, a click leaves a notification active, or teardown leaves clickable notifications in the system tray.
 */
import { expect, test } from 'vitest'
import { cdp } from 'vitest/browser'
import { createNotificationDisplay, notificationPermission } from '@dsh-claude-style/client/pure'

test('site permission, notification clicks and cleanup use the browser Notification API', async () => {
  const session = cdp()
  // The browser-only TS project also compiles the client, so it does not load the
  // provider's Node-wide type augmentation. Check the actual provider capability.
  if (!('send' in session) || typeof session.send !== 'function') throw new Error('This test requires browser CDP access')
  const send = session.send.bind(session)
  const { targetInfo } = await send('Target.getTargetInfo')
  const origin = location.origin
  const browserContextId = targetInfo.browserContextId
  const display = createNotificationDisplay()
  const permit = (setting: 'prompt' | 'granted' | 'denied') => send('Browser.setPermission', {
    permission: { name: 'notifications' }, setting, origin, browserContextId,
  })
  try {
    await permit('prompt')
    expect(notificationPermission()).toBe('default')
    await permit('denied')
    expect(notificationPermission()).toBe('denied')
    await permit('granted')
    expect(notificationPermission()).toBe('granted')

    const prompt = display.show({ event: 'permission', sessionId: 'parent' })
    const finished = display.show({ event: 'finished', sessionId: 'other' })
    if (!prompt || !finished) throw new Error('Granted notifications should be created')
    expect(prompt).toBeInstanceOf(Notification)
    expect(prompt.body).not.toBe(finished.body)
    expect(prompt.tag).not.toBe(finished.tag)
    expect(prompt.silent).toBe(true)
    expect(typeof prompt.onclick).toBe('function')
    // Vitest runs this page inside a same-origin frame. Focus its parent first
    // so handling the browser notification's click must bring this window back.
    window.parent.focus()
    expect(document.hasFocus()).toBe(false)
    prompt.dispatchEvent(new Event('click'))
    expect(document.hasFocus()).toBe(true)
    expect(prompt.onclick).toBeNull()
    expect(typeof finished.onclick).toBe('function')
    display.clear()
    expect(finished.onclick).toBeNull()
    expect(finished.onerror).toBeNull()
    expect(finished.onclose).toBeNull()
  } finally {
    display.clear()
    await send('Browser.resetPermissions', { browserContextId })
  }
})
