/**
 * The session broadcast (D91): the page says which session it shows by the id
 * the host keeps on the conversation column, and a change of that id is heard
 * once — a change of anything else under it is not, and a session leaving the
 * page is heard as none.
 *
 * @capability page-observation
 * @features engine
 * @risk A feature keeps the previous session's state because the switch was never heard, or releases it on every unrelated attribute write and loses what the reader was looking at.
 */
import { afterEach, expect, test } from 'vitest'
import { conversationSession, observeSession } from '@dsh-claude-style/engine/host'
import { CONVERSATION_SESSION_ATTRIBUTE, PHASE_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  document.body.replaceChildren()
})

/** The phase root and the column it holds, named the way the host names them. */
function mountSession(id: string) {
  const root = document.createElement('div')
  root.setAttribute(PHASE_ATTRIBUTE, 'active')
  const column = document.createElement('div')
  column.setAttribute(CONVERSATION_SESSION_ATTRIBUTE, id)
  root.append(column)
  document.body.append(root)
  return { root, column }
}

test('the page names the session it shows', () => {
  const { column } = mountSession('a')
  expect(conversationSession()).toBe('a')
  column.setAttribute(CONVERSATION_SESSION_ATTRIBUTE, 'b')
  expect(conversationSession()).toBe('b')
})

test('a switch is heard once, and an unrelated write is not', async () => {
  const { root, column } = mountSession('a')
  const heard: (string | null)[] = []
  cleanups.push(observeSession((id) => heard.push(id)))
  column.setAttribute('class', 'probe')
  root.setAttribute(PHASE_ATTRIBUTE, 'active')
  await settle()
  expect(heard).toEqual([])
  column.setAttribute(CONVERSATION_SESSION_ATTRIBUTE, 'b')
  await settle()
  expect(heard).toEqual(['b'])
})

test('the session leaving the page is heard as none', async () => {
  const { root } = mountSession('a')
  const heard: (string | null)[] = []
  cleanups.push(observeSession((id) => heard.push(id)))
  root.remove()
  await settle()
  expect(heard).toEqual([null])
})

test('a released subscription hears nothing more', async () => {
  const { column } = mountSession('a')
  const heard: (string | null)[] = []
  const stop = observeSession((id) => heard.push(id))
  stop()
  column.setAttribute(CONVERSATION_SESSION_ATTRIBUTE, 'b')
  await settle()
  expect(heard).toEqual([])
})
