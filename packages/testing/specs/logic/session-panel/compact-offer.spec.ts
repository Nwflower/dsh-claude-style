/**
 * The distance to automatic compaction and the control it draws in (D100): the host's
 * policy prices the threshold, and the section offers a manual request only near it.
 * @capability session-panel
 * @features session-panel
 * @risk A wrong threshold puts the manual request out of reach exactly when the
 *   session is about to be compacted by the host, or offers it for the whole life of
 *   the session and teaches the reader to ignore it.
 */
import { expect, test } from 'vitest'
import { compactionThreshold } from '@dsh-claude-style/contracts/compaction'
import { COMPACT_OFFER_SHARE, compactOffer } from '@dsh-claude-style/client/pure'
import type { PanelContext } from '@dsh-claude-style/contracts/session-panel'

test('the threshold is the window ratio, or the room left after the reservation and the headroom', () => {
  // 1M window at 80%: 800k, well under the 901,696 left after 32,768 output and 65,536 headroom.
  expect(compactionThreshold({ contextWindow: 1_000_000, policy: { thresholdRatio: 0.8, headroomTokens: 65_536 } })).toBe(800_000)
  // A 300k window at 80% would be 240k, but the reservation leaves only 201,696.
  expect(compactionThreshold({ contextWindow: 300_000, reservedOutput: 32_768, policy: { thresholdRatio: 0.8, headroomTokens: 65_536 } })).toBe(201_696)
  // The request's own reservation wins over the policy's default.
  expect(compactionThreshold({ contextWindow: 100_000, reservedOutput: 4_096, policy: { thresholdRatio: 0.9, headroomTokens: 20_000 } })).toBe(75_904)
})

test('no usable policy answers no threshold', () => {
  expect(compactionThreshold({ contextWindow: 1_000_000, policy: null })).toBeNull()
  expect(compactionThreshold({ contextWindow: 1_000_000, policy: {} })).toBeNull()
  expect(compactionThreshold({ policy: { thresholdRatio: 0.8 } })).toBeNull()
  expect(compactionThreshold({ contextWindow: 0, policy: { thresholdRatio: 0.8 } })).toBeNull()
  expect(compactionThreshold({ contextWindow: 1_000_000, policy: { thresholdRatio: 1.5 } })).toBeNull()
  // A reservation and headroom that leave nothing to compact with also answer nothing.
  expect(compactionThreshold({ contextWindow: 100_000, reservedOutput: 40_000, policy: { thresholdRatio: 0.8, headroomTokens: 60_000 } })).toBeNull()
})

const contextWith = (used: number, threshold?: number): PanelContext => ({
  used, window: 1_000_000, parts: [{ kind: 'user', tokens: used }],
  ...(threshold === undefined ? {} : { compaction: { thresholdTokens: threshold } }),
})

test('the control appears near the threshold and withdraws further away', () => {
  const overview = { used: 700_000, window: 1_000_000 }
  // 100k left of a 1M window is a tenth: inside the offer's share.
  expect(compactOffer(contextWith(700_000, 800_000), overview)).toEqual({ remaining: 100_000, threshold: 800_000 })
  // 300k left is further than a fifth of the window.
  expect(compactOffer(contextWith(500_000, 800_000), { used: 500_000, window: 1_000_000 })).toBeNull()
  expect(COMPACT_OFFER_SHARE).toBe(0.2)
})

test('a session past the threshold keeps the control, and a host without a policy offers nothing', () => {
  const passed = compactOffer(contextWith(850_000, 800_000), { used: 850_000, window: 1_000_000 })
  expect(passed).toEqual({ remaining: -50_000, threshold: 800_000 })
  expect(compactOffer(contextWith(850_000), { used: 850_000, window: 1_000_000 })).toBeNull()
  expect(compactOffer(null, { used: 850_000, window: 1_000_000 })).toBeNull()
  expect(compactOffer(contextWith(850_000, 0), { used: 850_000, window: 1_000_000 })).toBeNull()
})
