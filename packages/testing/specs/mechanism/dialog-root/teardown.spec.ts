/**
 * A dialog built on `createDialogRoot` mounts its React root on a body-owned
 * seat, and closing unmounts that root and takes the seat and any portalled
 * mask down on the next microtask (#478). Reopening while a close is still
 * queued mounts a fresh seat rather than rendering into the closing root.
 *
 * @capability dialog-root
 * @features shared
 * @risk Closing a Modal-backed dialog leaves its full-viewport mask stranded over the page, blocking clicks until reload.
 */
import { afterEach, expect, test } from 'vitest'
import { createDialogRoot } from '@dsh-claude-style/client/mechanisms'
import { React, createPortal } from '../../fixtures/react'
import { surfaceSelector } from '../../fixtures/surface'

const HOST = surfaceSelector('shared.dialog-host')
const MASK_ATTR = 'data-test-dialog-mask'

const committed = () => new Promise<void>(resolve => setTimeout(resolve, 20))

function SampleModal({ label }: { label: string }) {
  return createPortal(
    React.createElement('div', { [MASK_ATTR]: label }),
    document.body,
  )
}

const roots: ReturnType<typeof createDialogRoot>[] = []
afterEach(() => {
  for (const dialog of roots.splice(0)) dialog.dispose()
  document.body.replaceChildren()
})

test('render mounts a body seat and close unmounts the root, seat, and portal', async () => {
  const dialog = createDialogRoot()
  roots.push(dialog)

  dialog.render(React.createElement(SampleModal, { label: 'first' }))
  await committed()

  const seats = document.querySelectorAll(HOST)
  expect(seats.length).toBe(1)
  expect(seats[0]?.parentElement).toBe(document.body)
  expect(document.querySelectorAll(`[${MASK_ATTR}="first"]`).length).toBe(1)

  dialog.close()
  await committed()

  expect(document.querySelectorAll(HOST).length).toBe(0)
  expect(document.querySelectorAll(`[${MASK_ATTR}]`).length).toBe(0)
})

test('reopening before the close microtask flushes mounts a fresh seat and retires the old one', async () => {
  const dialog = createDialogRoot()
  roots.push(dialog)

  dialog.render(React.createElement(SampleModal, { label: 'first' }))
  await committed()
  const firstSeat = document.querySelector(HOST)
  expect(firstSeat).not.toBeNull()

  dialog.close()
  dialog.render(React.createElement(SampleModal, { label: 'second' }))
  const bothSeats = document.querySelectorAll(HOST)
  expect(bothSeats.length).toBe(2)
  expect(bothSeats[1]).not.toBe(firstSeat)

  await committed()
  expect(firstSeat?.isConnected).toBe(false)
  expect(document.querySelectorAll(HOST).length).toBe(1)
  expect(document.querySelectorAll(`[${MASK_ATTR}="first"]`).length).toBe(0)
  expect(document.querySelectorAll(`[${MASK_ATTR}="second"]`).length).toBe(1)

  dialog.dispose()
  expect(document.querySelectorAll(HOST).length).toBe(0)
  expect(document.querySelectorAll(`[${MASK_ATTR}]`).length).toBe(0)
})
