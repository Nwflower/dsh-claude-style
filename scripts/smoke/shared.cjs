/**
 * What the smoke's parts share: the paths to the built plugin, the fixtures,
 * `check` with the run's tier, and the two tables the runner reads — which cases
 * watch motion (the quick tier leaves them out) and which cases cover which
 * feature directory under packages/client/src/features/.
 */
'use strict'
const path = require('path')
const { featureCases, readManifests } = require('../shared/read-manifests.cjs')

const ROOT = path.resolve(__dirname, '..', '..')
const CLIENT = path.join(ROOT, 'lib', 'client.js')
// The host half as the package ships it (D46): the build writes it to lib/host.
const HOST = path.join(ROOT, 'lib', 'host', 'index.js')
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
const SKIN_FIXTURE = path.join(__dirname, 'fixtures', 'skin-64.png')
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

/**
 * The two tiers. `full` runs every case and every check; `quick` leaves out the
 * work that watches motion — the cases below, the checks marked `timing`, and
 * the second the probe spends watching for scheduler passes once the page has
 * settled. The runner sets this once, before the first case.
 */
let tier = 'full'
const setTier = (value) => { tier = value }
const tierName = () => tier

/**
 * The cases built around watching frames: their collection and their assertions
 * follow an animation, a glide or a dwell over time. The quick tier skips them
 * whole, and says so in its log.
 */
const TIMING_CASES = ['chat-follow', 'chat-fold', 'chat-reveal', 'chat-send', 'crab-states', 'deepy', 'popovers']

/**
 * Which cases cover which directory under `packages/client/src/features/`, gathered from the
 * feature manifests (D42). A directory with an empty list has no case of its
 * own, and `--feature` refuses it rather than running something unrelated;
 * the runner refuses a case name the case table lacks.
 */
const MANIFESTS = readManifests()
const FEATURE_CASES = featureCases(MANIFESTS)

/**
 * The cases that cover arriving in a chunk (D39): they exercise the loader and
 * the entries it takes, not one feature's own behaviour, so a deferred
 * feature's manifest names none of them itself. Every deferred directory is
 * credited with them here, or `--feature` cannot reach the run that covers how
 * its feature arrives.
 */
const DEFERRED_CASES = ['chunk-fault', 'chunk-late']
for (const manifest of MANIFESTS) {
    if (manifest.load !== 'deferred') continue
    const covered = FEATURE_CASES[manifest.dir]
    for (const name of DEFERRED_CASES) if (!covered.includes(name)) covered.push(name)
}

/** The features that arrive in chunks of their own (D39), by id. */
const DEFERRED_FEATURES = MANIFESTS.filter((manifest) => manifest.load === 'deferred').map((manifest) => manifest.id)

/**
 * The deferred features a page wants, by id: a feature gated on a preference
 * installs only under the values its manifest names, so a page sitting on
 * another value never sends for that feature's chunk and never reports it.
 * @param values - the page's preference values, by preference name.
 */
function deferredWanted(values) {
    return MANIFESTS.filter((manifest) => manifest.load === 'deferred')
        .filter((manifest) => manifest.pref === undefined || manifest.prefValues === undefined || manifest.prefValues.includes(values[manifest.pref]))
        .map((manifest) => manifest.id)
}

/**
 * The browser pages, and the cases each one serves. A page is loaded once and
 * runs every selected case it carries, so cases that read the same stand-in
 * configuration and the same markup cost one page load between them instead of
 * one each. A case named in no page here is a page of its own.
 */
const PAGES = {
    shell: ['brand', 'hero', 'view-tabs', 'composer', 'search', 'account', 'permissions', 'header-band'],
}

/**
 * The pages a run needs, each with the selected cases it serves: the table's
 * pages first, then every selected case the table does not carry, in the order
 * the selection gave them.
 */
function pagesFor(selected) {
    const pages = []
    const taken = new Set()
    for (const [page, cases] of Object.entries(PAGES)) {
        const wanted = cases.filter((name) => selected.includes(name))
        if (wanted.length === 0) continue
        for (const name of wanted) taken.add(name)
        pages.push({ page, cases: wanted })
    }
    for (const name of selected) {
        if (!taken.has(name)) pages.push({ page: name, cases: [name] })
    }
    return pages
}

let failed = 0
let skipped = 0

/**
 * Print one check's result. A check marked `timing` watches motion and is left
 * out of the quick tier, counted as a skip instead of a result.
 */
function check(label, ok, detail, kind) {
    if (kind === 'timing' && tier === 'quick') {
        skipped += 1
        console.log(`  skip ${label}`)
        return
    }
    if (!ok) failed += 1
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok || detail === undefined ? '' : `  — ${detail}`}`)
}

/** How many checks have failed so far. */
const failures = () => failed
/** How many checks the quick tier left out. */
const skips = () => skipped

module.exports = {
    ROOT, CLIENT, HOST, MARKUP, PNG_1PX, SKIN_FIXTURE, SKIN_FACE, SKIN_HAT, SKIN_CASES,
    sleep, same, check, failures, skips, setTier, tierName, TIMING_CASES, FEATURE_CASES, DEFERRED_FEATURES, deferredWanted, PAGES, pagesFor,
}
