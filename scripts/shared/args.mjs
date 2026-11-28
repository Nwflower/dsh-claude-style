/** args.mjs — read a `--name value` flag without consuming the next flag as its value. */
function argOf(flag, argv = process.argv.slice(2)) {
  const at = argv.indexOf(`--${flag}`)
  if (at === -1) return undefined
  const value = argv[at + 1]
  return value === undefined || value.startsWith('--') ? undefined : value
}

export { argOf }
