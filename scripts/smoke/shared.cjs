/**
 * What the smoke's parts share: the paths to the built plugin, the fixtures,
 * and `check`, which prints one result and counts the failures the runner
 * reads through `failures()`.
 */
'use strict'
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const CLIENT = path.join(ROOT, 'lib', 'client.js')
const HOST = path.join(ROOT, 'host', 'index.js')
const MARKUP = '<img src=x onerror="window.__pwned=(window.__pwned||0)+1">'
/** One transparent pixel: the launcher's avatar the HDSL case serves. */
const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
/**
 * A 64×64 skin atlas with three landmarks, so a wrong crop cannot pass: the
 * head's front face (8,8–16,16) is red, the hat layer (40,8–48,16) is clear
 * except two green pixels that land at the box's opposite corners, and the
 * rest of the atlas is grey. What the launcher serves is this sheet, not a
 * finished avatar.
 */
const SKIN_FIXTURE = path.join(__dirname, '..', 'fixtures', 'skin-64.png')
const SKIN_FACE = [255, 0, 0, 255]
const SKIN_HAT = [0, 255, 0, 255]
/**
 * The cases whose launcher serves that atlas. `hdsl-broken` deliberately does
 * not: its contract names a picture the player has already deleted, which the
 * picture route answers with a 404.
 */
const SKIN_CASES = ['hdsl']

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

let failed = 0
function check(label, ok, detail) {
  if (!ok) failed += 1
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok || detail === undefined ? '' : `  — ${detail}`}`)
}

/** How many checks have failed so far. */
const failures = () => failed

module.exports = { ROOT, CLIENT, HOST, MARKUP, PNG_1PX, SKIN_FIXTURE, SKIN_FACE, SKIN_HAT, SKIN_CASES, sleep, same, check, failures }
