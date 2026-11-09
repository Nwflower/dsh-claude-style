/**
 * The HDSL launcher's account contract, as this half forwards it.
 *
 * HDSL publishes who the player is through `HDSL_`-prefixed variables. The
 * browser half cannot read a process environment, and the player's avatar is a
 * PNG that only exists under the launcher's data directory, so the contract is
 * read here and the routes in routes.ts serve it.
 */
import type { DshContext } from '@dsh-claude-style/engine/node/dsh'

/** The contract version this half understands; any other value voids the whole group. */
const HDSL_CONTRACT = '1'
/**
 * The context slot the harness's boot fills with this launch's environment
 * snapshot (`@deepseek-ai/dsh-launch-environment` defines the same key).
 */
const DSH_LAUNCH_ENVIRONMENT_KEY = 'launchEnvironment'
/**
 * The layers allowed to declare who the player is, in the launcher's trust
 * order: a project directory's `.env` travels with a cloned repository, so it
 * has no standing to say who is signed in.
 */
const HDSL_LAYERS = ['process', 'user-env']

/** What one HDSL launch reports: whether it launched this instance, and its account. */
export interface HdslReading {
  contract: boolean
  name?: string | null
  avatar?: string | null
  [field: string]: unknown
}

/**
 * Read this launch's HDSL account contract, once: the contract is fixed for the
 * process lifetime, so the answer is memoized and every request re-serves it.
 * `skinFile` is the player's avatar path, which stays inside this half and is
 * never serialized to the browser.
 *
 * The snapshot comes through the slot the harness fills itself
 * (`ctx.launchEnvironment`) rather than an import of
 * `@deepseek-ai/dsh-launch-environment`: importing a harness-provided package
 * fails outright for a `link:`-installed plugin, and a host that fills no slot
 * simply has no contract to read.
 *
 * @param ctx - host plugin context.
 * @returns `{ read() }`, whose promise resolves to the contract or to
 *          `{ contract: false }` when HDSL did not launch this instance.
 */
export function createHdslAccount(ctx: DshContext) {
  let reading: Promise<HdslReading> | null = null
  const read = () => {
    if (reading !== null) return reading
    reading = Promise.resolve().then(() => {
      const env = ctx.get(DSH_LAUNCH_ENVIRONMENT_KEY)
      if (typeof env?.getFrom !== 'function') return { contract: false }
      const value = (name: string) => env.getFrom(name, HDSL_LAYERS)?.value
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
