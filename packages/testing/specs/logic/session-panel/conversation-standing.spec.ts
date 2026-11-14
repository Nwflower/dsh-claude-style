/**
 * The details rail keeps standing while one conversation replaces another (D94).
 * @capability session-panel
 * @features session-panel
 * @risk A session switch takes the rail away for the frames before the next
 *   transcript mounts, so the chat's edge travels out and back on every switch;
 *   or the rail stands beside a new session's hero page, a hidden conversation,
 *   or a transcript that lost its rows.
 */
import { expect, test } from 'vitest'
import { NO_CONVERSATION, conversationStanding } from '@dsh-claude-style/client/pure'
import type { ConversationSight, ConversationStanding } from '@dsh-claude-style/client/pure'

/** The standing after each sight in turn. */
function after(...sights: ConversationSight[]) {
  let standing: ConversationStanding = NO_CONVERSATION
  for (const sight of sights) standing = conversationStanding(standing, sight)
  return standing
}

const withRows = (id: string): ConversationSight => ({ id, shown: true, rows: true })
const withoutRows = (id: string): ConversationSight => ({ id, shown: true, rows: false })
const hidden = (id: string): ConversationSight => ({ id, shown: false, rows: false })
const hero: ConversationSight = { id: null, shown: false, rows: false }

test('a conversation with a row is one the rail stands beside', () => {
  expect(after(withRows('a'))).toEqual({ id: 'a', live: true, arriving: false })
})

test('a session named before its first row waits for that row', () => {
  expect(after(withoutRows('a')).live).toBe(false)
  expect(after(hero, withoutRows('a')).live).toBe(false)
  expect(after(hero, withoutRows('a'), withRows('a')).live).toBe(true)
})

test('the session that replaces a standing conversation keeps the rail until its rows mount', () => {
  const arriving = after(withRows('a'), withoutRows('b'))
  expect(arriving).toEqual({ id: 'b', live: true, arriving: true })
  expect(conversationStanding(arriving, withoutRows('b'))).toBe(arriving)
  expect(conversationStanding(arriving, withRows('b'))).toEqual({ id: 'b', live: true, arriving: false })
})

test('a second switch before the first one mounted still keeps the rail', () => {
  expect(after(withRows('a'), withoutRows('b'), withoutRows('c'))).toEqual({ id: 'c', live: true, arriving: true })
})

test('the hero page takes the rail away, and the session after it waits for its own row', () => {
  expect(after(withRows('a'), hero)).toEqual({ id: null, live: false, arriving: false })
  expect(after(withRows('a'), hero, withoutRows('b')).live).toBe(false)
})

test('a conversation that is not shown has no rail, arriving or not', () => {
  expect(after(withRows('a'), hidden('a')).live).toBe(false)
  expect(after(withRows('a'), hidden('b')).live).toBe(false)
  expect(after(withRows('a'), withoutRows('b'), hidden('b'))).toEqual({ id: 'b', live: false, arriving: false })
  expect(after(withRows('a'), withoutRows('b'), hidden('b'), withoutRows('b')).live).toBe(false)
})

test('a transcript that loses its rows within one session gives the rail up', () => {
  expect(after(withRows('a'), withoutRows('a'))).toEqual({ id: 'a', live: false, arriving: false })
})

test('a reading that changes nothing hands the same standing back', () => {
  const standing = after(withRows('a'))
  expect(conversationStanding(standing, withRows('a'))).toBe(standing)
  expect(conversationStanding(NO_CONVERSATION, hero)).toBe(NO_CONVERSATION)
})
