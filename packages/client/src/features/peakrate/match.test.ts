import { expect, test } from 'vitest'
import { matchProfile } from './match'
import type { RateProfile } from '@dsh-claude-style/contracts/peakrate'

/** Which billing profile claims a provider and model (docs/decisions D54). */

function profile(id: string, provider: string): RateProfile {
  return {
    id,
    provider,
    model: id,
    schedule: { timeZone: 'UTC', peakDays: [1], peakWindows: [{ start: '01:00', end: '02:00' }] },
    peakBadge: '2×',
    offPeakBadge: '1×',
  }
}

const CATALOG: RateProfile[] = [
  profile('deepseek-v4', 'DeepSeek'),
  profile('zai-glm-5-3', 'Z.ai'),
  profile('zai-glm-5-3-flash', 'Z.ai'),
  profile('qoder-qwen3-8-max', 'Qoder'),
]

test('a provider id is translated to the catalog\'s provider name', () => {
  expect(matchProfile('deepseek-official', 'deepseek-v4-flash', CATALOG)?.id).toBe('deepseek-v4')
  // A gateway that resells the vendor inherits that vendor's clock.
  expect(matchProfile('opencode-go', 'deepseek-v4-pro', CATALOG)?.id).toBe('deepseek-v4')
})

test('the longer model pattern wins, so flash is not swallowed by its family', () => {
  expect(matchProfile('zai', 'glm-5.3-flash', CATALOG)?.id).toBe('zai-glm-5-3-flash')
  expect(matchProfile('zai', 'glm-5.3', CATALOG)?.id).toBe('zai-glm-5-3')
})

test('a version suffix on the model id does not stop the match', () => {
  expect(matchProfile('deepseek-official', 'deepseek-v4-flash:0731', CATALOG)?.id).toBe('deepseek-v4')
})

test('an unknown provider, and a model no pattern claims, carry no rate', () => {
  expect(matchProfile('some-other-provider', 'deepseek-v4-flash', CATALOG)).toBeUndefined()
  expect(matchProfile('qoder', 'qwen3.9-unknown', CATALOG)).toBeUndefined()
  expect(matchProfile('deepseek-official', 'kimi-k3', CATALOG)).toBeUndefined()
})

test('a provider id the catalog already uses matches without an alias entry', () => {
  expect(matchProfile('DeepSeek', 'deepseek-v4-flash', CATALOG)?.id).toBe('deepseek-v4')
})
