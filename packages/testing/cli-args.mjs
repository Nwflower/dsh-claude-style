/**
 * cli-args.mjs — the command line the tools here share: the value after a
 * `--name` flag, undefined when the flag is absent.
 */

const args = process.argv.slice(2)

/** The value after `--name`, undefined when the flag is absent. */
const argOf = (name) => {
  const at = args.indexOf(`--${name}`)
  return at === -1 ? undefined : args[at + 1]
}

export { argOf }
