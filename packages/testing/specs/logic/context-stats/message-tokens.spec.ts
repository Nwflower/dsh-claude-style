/**
 * What one message, one tool definition and one picture cost: the shared yardstick the
 * host prices every context part with (D99).
 * @capability context-stats
 * @features session-panel
 * @risk A part priced on a different yardstick than its neighbours puts the wrong
 *   share of the provider's occupancy on every row, and a picture priced by its bytes
 *   or its reference alone disappears from the conversation's share.
 */
import { expect, test } from 'vitest'
import { imageTokens } from '@dsh-claude-style/contracts/image-tokens'
import { messageTokens, textTokens, toolSchemaTokens } from '@dsh-claude-style/contracts/tokens'

test('a message is its text priced by run shape, plus the block and role framing', () => {
  expect(messageTokens({ content: [{ type: 'text', text: 'hello world' }] }))
    .toBe(Math.round(textTokens(['hello world']) + 4 + 4))
})

test('a message with nothing to send costs nothing', () => {
  expect(messageTokens(null)).toBe(0)
  expect(messageTokens({})).toBe(0)
  expect(messageTokens({ content: [] })).toBe(0)
})

test('a tool call is priced by its name and the arguments it carries', () => {
  const short = messageTokens({ content: [{ type: 'tool-call', name: 'read', arguments: '{"path":"a"}' }] })
  const long = messageTokens({ content: [{ type: 'tool-call', name: 'read', arguments: `{"path":"${'a'.repeat(4000)}"}` }] })
  expect(short).toBeGreaterThan(4)
  expect(long).toBeGreaterThan(short + 500)
})

test('a picture is priced by the pixels it covers, and two pictures of one size cost the same', () => {
  const small = messageTokens({ content: [{ type: 'image', attachment: { attachmentId: 'a', bytes: 10, width: 220, height: 220 } }] })
  const large = messageTokens({ content: [{ type: 'image', attachment: { attachmentId: 'b', bytes: 900_000, width: 1600, height: 1200 } }] })
  const sameSize = messageTokens({ content: [{ type: 'image', attachment: { attachmentId: 'c', bytes: 10, width: 1600, height: 1200 } }] })
  expect(large).toBeGreaterThan(small)
  expect(sameSize).toBe(large)
})

test('a picture larger than the cap is priced at the cap, never above it', () => {
  expect(imageTokens(7680, 4320)).toBeLessThanOrEqual(1024)
  expect(imageTokens(7680, 4320)).toBeGreaterThan(900)
  expect(imageTokens(40, 900)).toBeGreaterThan(0)
  expect(imageTokens(900, 40)).toBeGreaterThan(0)
})

test('a picture whose reference carries no size keeps the structural price of the reference', () => {
  const block = { type: 'image', attachment: { attachmentId: 'unsized' } }
  expect(messageTokens({ content: [block] })).toBe(Math.round(textTokens([JSON.stringify(block)]) + 4 + 4))
})

test('a tool definition is priced by the schema it declares', () => {
  const brief = toolSchemaTokens({ name: 'read', description: 'Read a file', inputSchema: { type: 'object' } })
  const detailed = toolSchemaTokens({
    name: 'read',
    description: `Read a file ${'with a long description '.repeat(40)}`,
    inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
  })
  expect(detailed).toBeGreaterThan(brief)
})
