#!/usr/bin/env node
/** temporary.mjs — manage owned scratch directories, preserving failure evidence and collecting expired sessions. */
import path from 'node:path'
import { spawn } from 'node:child_process'
import { parseArgs } from 'node:util'
import { createTemporaryFiles } from '../shared/temporary-files.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..')

function help() {
  console.log(`temporary: session scratch under .debug/tmp

  new <label> [--pid <owner-pid>]   print a new directory
  path <id|path> [--pid <owner-pid>] refresh activity and print the directory
  run <label> -- <command> [args]  set DSH_TMP_DIR; clean up after success
  list [--json]                   list sessions and their owner processes
  close <id|path>                 explicitly remove one session directory
  gc [--yes]                      preview or remove expired, inactive sessions
  check                          check session ownership records

Direct commands default to their parent process as owner. With npm run tmp,
use --pid for a persistent owner, or run to own the command until it exits.`)
}

async function run(files, label, command) {
  if (command.length === 0) throw new Error('temporary: run needs -- <command> [args]')
  const directory = files.create(label, process.pid)
  console.error(`temporary: ${directory}`)
  const child = spawn(command[0], command.slice(1), {
    stdio: 'inherit',
    env: { ...process.env, DSH_TMP_DIR: directory },
  })
  const signals = ['SIGINT', 'SIGTERM']
  const stop = (signal) => { child.kill(signal) }
  const handlers = signals.map(signal => {
    const handler = () => stop(signal)
    process.on(signal, handler)
    return [signal, handler]
  })
  try {
    let code
    try {
      code = await new Promise((resolve, reject) => {
        child.once('error', reject)
        child.once('exit', (code) => resolve(code ?? 1))
        if (child.pid !== undefined) files.directory(directory, child.pid)
      })
    } catch (error) {
      // The command never started, so the directory holds no evidence worth keeping.
      files.close(directory)
      throw error
    }
    if (code === 0) files.close(directory)
    else console.error(`temporary: command failed; evidence kept in ${directory}`)
    process.exitCode = code
  } finally {
    for (const [signal, handler] of handlers) process.off(signal, handler)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const separator = args.indexOf('--')
  const { values, positionals } = parseArgs({
    args: separator === -1 ? args : args.slice(0, separator),
    allowPositionals: true,
    options: { pid: { type: 'string' }, yes: { type: 'boolean' }, json: { type: 'boolean' } },
  })
  const [command = 'help', target] = positionals
  const files = createTemporaryFiles(ROOT)
  const pid = values.pid === undefined ? process.ppid : Number(values.pid)
  if (command === 'help') return help()
  if (command === 'new') return console.log(files.create(target, pid))
  if (command === 'run') return run(files, target, separator === -1 ? [] : args.slice(separator + 1))
  if (command === 'list') {
    const sessions = files.inspect()
    if (values.json) console.log(JSON.stringify(sessions, null, 2))
    else for (const session of sessions) console.log(`${session.id}: ${session.problem ?? (session.active ? 'active' : session.expired ? 'expired' : 'retained')}`)
    return
  }
  if (command === 'gc') {
    const removed = files.collect(values.yes === true)
    for (const directory of removed) console.log(`temporary: ${values.yes ? 'removed' : 'would remove'} ${directory}`)
    console.log(`temporary: ${removed.length} ${values.yes ? 'removed' : 'eligible'} session(s)${values.yes ? '' : '; pass --yes to remove'}`)
    return
  }
  if (command === 'check') {
    const result = files.check()
    for (const warning of result.warnings) console.warn(warning)
    for (const problem of result.problems) console.error(problem)
    process.exitCode = result.problems.length > 0 ? 1 : 0
    return
  }
  if (typeof target !== 'string') throw new Error(`temporary: ${command} needs a session id or path`)
  if (command === 'path') return console.log(files.directory(target, pid))
  if (command === 'close') {
    files.close(target)
    return console.log(`temporary: closed ${path.basename(target)}`)
  }
  throw new Error(`temporary: unknown command ${command}`)
}

await main()
