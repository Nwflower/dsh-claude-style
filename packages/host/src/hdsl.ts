/**
 * The HDSL launcher's account contract, as this half forwards it.
 *
 * HDSL publishes who the player is through `HDSL_`-prefixed variables (its
 * plugin guide lives in the launcher's own repository). The browser half cannot
 * read a process environment, and the player's avatar is a PNG that only exists
 * under the launcher's data directory, so this module reads the contract out of
 * the launch environment and the routes in routes.js serve it.
 */

/** The contract version this half understands; any other value voids the whole group. */
const HDSL_CONTRACT = '1'
/**
 * The context slot the harness's boot fills with this launch's environment
 * snapshot (`@deepseek-ai/dsh-launch-environment` defines the same key, and its
 * `launchEnvironmentOf(ctx)` reads exactly this slot before falling back).
 */
const DSH_LAUNCH_ENVIRONMENT_KEY = 'launchEnvironment'
/**
 * The layers allowed to declare who the player is, in the launcher's own trust
 * order. A project directory's `.env` travels with a cloned repository, so it
 * has no standing to say who is signed in; the launcher's own two layers do.
 */
const HDSL_LAYERS = ['process', 'user-env']

/**
 * The HDSL account contract of this launch, read once.
 *
 * The contract is fixed for the process lifetime, so the answer is memoized and
 * every request re-serves it. `skinFile` is the player's avatar path: it stays
 * inside this half and is never serialized to the browser.
 *
 * The snapshot is read through the slot the harness itself fills
 * (`ctx.launchEnvironment` — the first thing `launchEnvironmentOf()` reads),
 * rather than by importing `@deepseek-ai/dsh-launch-environment`: importing a
 * harness-provided package fails outright for a `link:`-installed plugin (the
 * same resolution problem `resolveSchemaFactory` documents), and a host that
 * fills no slot simply has no contract to read.
 *
 * @param ctx - host plugin context.
 * @returns `{ read() }`, whose promise resolves to the contract or to
 *          `{ contract: false }` when HDSL did not launch this instance.
 */
export function createHdslAccount(ctx) {
  let reading = null
  const read = () => {
    if (reading !== null) return reading
    reading = Promise.resolve().then(() => {
      const env = ctx.get(DSH_LAUNCH_ENVIRONMENT_KEY)
      if (typeof env?.getFrom !== 'function') return { contract: false }
      const value = (name) => env.getFrom(name, HDSL_LAYERS)?.value
      if (value('HDSL_ACCOUNT_CONTRACT') !== HDSL_CONTRACT) return { contract: false }
      const skinFile = value('HDSL_ACCOUNT_SKIN_FILE')
      const hasSkinImage = typeof skinFile === 'string' && skinFile !== ''
      return {
        contract: true,
        name: value('HDSL_ACCOUNT_NAME') ?? null,
        vendor: value('HDSL_ACCOUNT_VENDOR') ?? null,
        kind: value('HDSL_ACCOUNT_KIND') ?? null,
        skin: value('HDSL_ACCOUNT_SKIN') ?? 'default',
        skinModel: value('HDSL_ACCOUNT_SKIN_MODEL') ?? 'default',
        hasSkinImage,
        skinFile: hasSkinImage ? skinFile : null,
      }
    })
    return reading
  }
  return { read }
}
