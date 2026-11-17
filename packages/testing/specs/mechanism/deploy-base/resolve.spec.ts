/**
 * The plugin's routes and assets resolve against the page's own directory, so a
 * prefix-stripping reverse proxy reaches the host's origin-root routes under the
 * mount (D73). The host half in Node keeps the origin root.
 *
 * @capability deploy-base
 * @features contracts
 * @risk Behind a path-prefix proxy every host call and asset lands outside the mount and fails, leaving the session overview, usage, search and brand images unavailable while a root-path visit looks fine.
 */
import { expect, test } from 'vitest'
import { ROUTE_ROOT, assetUrlUnder, deployRootOf, routePrefixUnder } from '@dsh-claude-style/contracts/routes'

test('the document directory drops a served index.html', () => {
  expect(deployRootOf('https://host/ui/index.html')).toBe('https://host/ui/')
  expect(deployRootOf('https://host/ui/')).toBe('https://host/ui/')
  expect(deployRootOf('https://host/')).toBe('https://host/')
})

test('with no deployment root the prefix stays the origin root', () => {
  expect(routePrefixUnder(null)).toBe(ROUTE_ROOT)
})

test('a root-path page keeps the origin-root prefix', () => {
  expect(routePrefixUnder('https://host/')).toBe(ROUTE_ROOT)
})

test('a mounted page carries the mount before the prefix', () => {
  expect(routePrefixUnder('https://host/ui/')).toBe('/ui' + ROUTE_ROOT)
  expect(routePrefixUnder('https://host/tools/dsh/')).toBe('/tools/dsh' + ROUTE_ROOT)
})

test('a baked asset address resolves under the mount', () => {
  const baked = ROUTE_ROOT + '/assets/idle.svg'
  expect(assetUrlUnder(baked, null)).toBe(baked)
  expect(assetUrlUnder(baked, 'https://host/')).toBe('https://host' + baked)
  expect(assetUrlUnder(baked, 'https://host/ui/')).toBe('https://host/ui' + baked)
})
