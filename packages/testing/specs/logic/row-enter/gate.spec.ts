/**
 * Which process rows play an entrance: the ones the turn under way writes, and
 * none of the conversation as it was saved.
 *
 * @capability row-enter
 * @features chat-row-enter
 * @risk Opening or switching to a session replays the entrance on every row of its transcript, an older page loading above the reader animates in, or a live turn's rows arrive with no entrance at all.
 */
import { expect, test } from 'vitest'
import fc from 'fast-check'
import { rowPlays, rowTurn } from '@dsh-claude-style/client/pure'

test('a row the live turn writes plays', () => {
  expect(rowPlays({ baselining: false, live: true, turn: 4, newestTurn: 4 })).toBe(true)
  expect(rowPlays({ baselining: false, live: true, turn: 5, newestTurn: 4 })).toBe(true)
  expect(rowPlays({ baselining: false, live: true, turn: 0, newestTurn: null })).toBe(true)
})

test('the rows a session opens onto are history, whatever else holds', () => {
  fc.assert(fc.property(fc.boolean(), fc.option(fc.nat()), fc.option(fc.nat()), (live, turn, newestTurn) => {
    expect(rowPlays({ baselining: true, live, turn, newestTurn })).toBe(false)
  }))
})

test('a row mounted while no turn is under way does not play', () => {
  fc.assert(fc.property(fc.option(fc.nat()), fc.option(fc.nat()), (turn, newestTurn) => {
    expect(rowPlays({ baselining: false, live: false, turn, newestTurn })).toBe(false)
  }))
})

test('an older page of the transcript loading during a live turn does not play', () => {
  fc.assert(fc.property(fc.nat(), fc.integer({ min: 1, max: 1000 }), (turn, ahead) => {
    expect(rowPlays({ baselining: false, live: true, turn, newestTurn: turn + ahead })).toBe(false)
  }))
})

test('a row the host names no turn for is judged by the live turn alone', () => {
  expect(rowPlays({ baselining: false, live: true, turn: null, newestTurn: 9 })).toBe(true)
  expect(rowTurn(null)).toBe(null)
  expect(rowTurn('')).toBe(null)
  expect(rowTurn('turn')).toBe(null)
  expect(rowTurn('12')).toBe(12)
})
