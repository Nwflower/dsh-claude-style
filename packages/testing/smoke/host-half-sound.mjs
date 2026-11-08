/**
 * The smoke's sound route, in Node: the capability read, the fence in front of
 * it, and the body and whitelist refusals. No player is started, so the run
 * stays silent.
 */
import { same, check } from './shared.mjs'

/**
 * Run the sound route's checks.
 *
 * @param options.host - the applied host half, with its registered routes.
 * @param options.request - one request through a registered route (host-half.mjs).
 * @param options.browser - the headers of a same-origin loopback page.
 * @param options.crossSite - the headers of a page from another origin.
 */
async function hostSound({ host, request, browser, crossSite }) {
  console.log('\nhost half — sound route: capability, fence and whitelist')
  const SOUND = '/dsh-claude-style/sound'
  check('the sound route is registered', host.routes[SOUND] !== undefined)
  const sound = await request(host, SOUND, 'GET', '', browser)
  const capability = JSON.parse(sound.body)
  const expectedSounds = capability.playback === 'system' ? ['pop', 'tink'] : []
  check('the browser reads the sound capability',
    sound.status === 200 && capability.ok === true && (capability.playback === 'system' || capability.playback === 'browser') &&
      same(capability.sounds, expectedSounds), JSON.stringify(capability))
  const refused = await request(host, SOUND, 'GET', '', crossSite)
  check('cross-site page: sound read refused', refused.status === 401 || refused.status === 403, `HTTP ${refused.status}`)
  const unknown = await request(host, SOUND, 'POST', JSON.stringify({ name: 'nope', volume: 0.35 }), { ...browser, 'content-type': 'application/json' })
  check('a cue the whitelist does not carry is refused', unknown.status === 400, `HTTP ${unknown.status}`)
  const malformed = await request(host, SOUND, 'POST', '{', { ...browser, 'content-type': 'application/json' })
  check('a malformed play request is refused', malformed.status === 400, `HTTP ${malformed.status}`)
}

export { hostSound }
