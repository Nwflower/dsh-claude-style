/**
 * Which workspace rows carry a running conversation's mark: only the closed
 * groups whose own sessions run, every ancestor under the workspace tree, and
 * the ungrouped bucket for a session no workspace accounts. The rows are not on
 * the page while a group stands closed, so the answer is the list's alone.
 *
 * @capability sidebar-status
 * @features sidebar-status
 * @risk A collapsed workspace with a running conversation shows no mark, an unrelated workspace gains one, or a nested workspace marks a sibling instead of its parent.
 */
import { expect, test } from 'vitest'
import { runningWorkspaces } from '@dsh-claude-style/client/pure'

const workspaces = [
  { workspaceId: 'root', path: 'C:/work', sessionIds: ['root-session'] },
  { workspaceId: 'app', path: 'C:/work/app', sessionIds: ['app-session'] },
  { workspaceId: 'tools', path: 'C:/work/app/tool', sessionIds: ['tool-session'] },
  { workspaceId: 'other', path: 'C:/elsewhere', sessionIds: ['other-session'] },
]

test('a running session marks the workspace that accounts for it and nothing else', () => {
  expect([...runningWorkspaces(workspaces, new Set(['app-session']), false)]).toEqual(['app'])
})

test('a running session no workspace accounts for marks the ungrouped bucket', () => {
  expect([...runningWorkspaces(workspaces, new Set(['stray']), false)]).toEqual([''])
  expect([...runningWorkspaces(workspaces, new Set(['stray', 'other-session']), false)].sort()).toEqual(['', 'other'])
})

test('the workspace tree marks every ancestor whose row would hide the running session', () => {
  expect([...runningWorkspaces(workspaces, new Set(['tool-session']), true)].sort()).toEqual(['app', 'root', 'tools'])
  expect([...runningWorkspaces(workspaces, new Set(['app-session']), true)].sort()).toEqual(['app', 'root'])
  expect([...runningWorkspaces(workspaces, new Set(['other-session']), true)]).toEqual(['other'])
})

test('the tree compares directories on their boundaries, not their text', () => {
  const siblings = [
    { workspaceId: 'a', path: 'C:/work/a', sessionIds: ['in-a'] },
    { workspaceId: 'ab', path: 'C:/work/ab', sessionIds: ['in-ab'] },
  ]
  expect([...runningWorkspaces(siblings, new Set(['in-ab']), true)]).toEqual(['ab'])
})

test('Windows spellings and trailing separators name the same directory', () => {
  const mixed = [
    { workspaceId: 'root', path: 'C:\\work\\', sessionIds: [] },
    { workspaceId: 'app', path: 'C:/work/app', sessionIds: ['session'] },
  ]
  expect([...runningWorkspaces(mixed, new Set(['session']), true)].sort()).toEqual(['app', 'root'])
})

test('no running session marks nothing, and a stopped session keeps its workspace unmarked', () => {
  expect(runningWorkspaces(workspaces, new Set(), true).size).toBe(0)
  expect(runningWorkspaces(workspaces, new Set(['app-session']), false).has('root')).toBe(false)
})
