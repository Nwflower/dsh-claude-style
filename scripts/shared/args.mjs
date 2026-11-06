/**
 * args.mjs — one flag's value off a script's command line.
 *
 * Every tool here names its flags as `--name value` and repeats the three lines
 * that read one; two copies of them are what lint refuses. A flag whose value is
 * missing answers undefined, so the caller decides whether that is a misspelling
 * or the flag's absence rather than reading the next flag as a value.
 */
function argOf(flag, argv = process.argv.slice(2)) {
  const at = argv.indexOf(`--${flag}`)
  return at === -1 ? undefined : argv[at + 1]
}

export { argOf }
