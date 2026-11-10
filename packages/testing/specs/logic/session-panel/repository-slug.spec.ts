/**
 * The repository a Git remote names, as the session overview panel's
 * Environment section prints it: the code host's own `owner/name` pair out of
 * the scp-like and scheme forms Git reports, and no pair out of a filesystem
 * path remote or a name with fewer than two segments. The panel only ever shows
 * this slug beside the checkout it read it from, so a path remote has to fall
 * back to the directory name rather than print a path as a repository.
 *
 * @capability session-panel
 * @features contracts, session-panel
 * @risk A remote that is not a code host prints its own path as a repository,
 *   an HTTPS or SSH clone loses the owner, a nested group on the host loses the
 *   repository name, a trailing `.git` stays in the printed slug, or a checkout
 *   without an origin prints nothing where the directory name should stand.
 */
import { expect, test } from 'vitest'
import { repositorySlug } from '@dsh-claude-style/contracts/session-panel'

test('the scp-like form Git prints for a checkout gives its owner and repository', () => {
  expect(repositorySlug('git@github.com:LyaQanYi/dsh-claude.git')).toBe('LyaQanYi/dsh-claude')
  expect(repositorySlug('git@github.com:LyaQanYi/dsh-claude')).toBe('LyaQanYi/dsh-claude')
})

test('either scheme URL gives the same pair', () => {
  expect(repositorySlug('https://github.com/LyaQanYi/dsh-claude.git')).toBe('LyaQanYi/dsh-claude')
  expect(repositorySlug('ssh://git@github.com/LyaQanYi/dsh-claude.git')).toBe('LyaQanYi/dsh-claude')
  expect(repositorySlug('https://github.com/LyaQanYi/dsh-claude/')).toBe('LyaQanYi/dsh-claude')
})

test('a nested group keeps the repository name and its immediate owner', () => {
  expect(repositorySlug('git@gitlab.com:team/subteam/project.git')).toBe('subteam/project')
})

test('a local path remote names no code host repository', () => {
  expect(repositorySlug('/Users/reader/repositories/dsh-claude.git')).toBeNull()
  expect(repositorySlug('/srv/git/project')).toBeNull()
  expect(repositorySlug('file:///srv/git/project.git')).toBeNull()
})

test('a URL or a name with no pair to read answers nothing', () => {
  expect(repositorySlug(null)).toBeNull()
  expect(repositorySlug('')).toBeNull()
  expect(repositorySlug('   ')).toBeNull()
  expect(repositorySlug('https://github.com/only-one-segment')).toBeNull()
  expect(repositorySlug('git@github.com:only-one-segment.git')).toBeNull()
})
