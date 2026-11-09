/** args.mjs — read a `--name value` flag without consuming the next flag as its value. */
function argOf(flag, argv = process.argv.slice(2)) {
  const at = argv.indexOf(`--${flag}`)
  return at === -1 ? undefined : argv[at + 1]
}

export { argOf }
