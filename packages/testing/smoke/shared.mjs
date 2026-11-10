/** Share smoke fixtures, result accounting, tier state and feature-case tables. */
import path from 'path'
import { readManifests } from '../../../scripts/shared/read-manifests.mjs'
import { featureCoverage } from '../../../scripts/shared/feature-coverage.mjs'
import { loadModule } from '../../../scripts/shared/ts-module.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const CLIENT = path.join(ROOT, 'lib', 'client.js')
// The host half as the package ships it (D73): the build writes it to lib/host.
const HOST = path.join(ROOT, 'lib', 'host', 'index.js')
const MARKUP = '<img src=x onerror="window.__pwned=(window.__pwned||0)+1">'
/** One transparent pixel: the launcher's avatar the HDSL case serves. */
const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
/** Use distinct face and hat pixels so an incorrect avatar crop fails. */
const SKIN_FIXTURE = path.join(import.meta.dirname, 'fixtures', 'skin-64.png')
const SKIN_FACE = [255, 0, 0, 255]
const SKIN_HAT = [0, 255, 0, 255]
/** `hdsl-broken` omits the atlas because its deleted picture must produce a 404. */
const SKIN_CASES = ['hdsl']

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** The runner sets the tier before the first case; quick omits motion observations. */
let tier = 'full'
const setTier = (value) => { tier = value }
const tierName = () => tier

/** Cases that observe frames are skipped whole by the quick tier. */
const TIMING_CASES = ['chat-follow', 'chat-fold', 'chat-reveal', 'chat-send', 'crab-states', 'deepy', 'whalegirl', 'popovers']

/** `--feature` refuses directories without their own cases rather than running unrelated ones (D72). */
const MANIFESTS = readManifests()
const FEATURE_CASES = Object.fromEntries(
    Object.entries(featureCoverage(MANIFESTS, [])).map(([dir, row]) => [dir, row.cases]),
)

/** Credit every deferred feature with loader cases so `--feature` reaches chunk delivery (D72). */
const DEFERRED_CASES = ['chunk-fault', 'chunk-late']
for (const manifest of MANIFESTS) {
    if (manifest.load !== 'deferred') continue
    const covered = FEATURE_CASES[manifest.dir]
    for (const name of DEFERRED_CASES) if (!covered.includes(name)) covered.push(name)
}

/** The features that arrive in chunks of their own (D72), by id. */
const DEFERRED_FEATURES = MANIFESTS.filter((manifest) => manifest.load === 'deferred').map((manifest) => manifest.id)

/** The preferences a page carries before a reader touches anything (packages/contracts/src/prefs.ts). */
const SHIPPED_PREFS = loadModule('packages/contracts/src/prefs.ts').PREF_DEFAULTS

/** Match manifest preference gates before expecting a deferred chunk. */
function deferredWanted(values) {
    return MANIFESTS.filter((manifest) => manifest.load === 'deferred')
        .filter((manifest) => manifest.pref === undefined
            || (manifest.prefValues === undefined
                ? values[manifest.pref] !== false
                : manifest.prefValues.includes(values[manifest.pref])))
        .map((manifest) => manifest.id)
}

/** Share compatible pages; header-band stays separate because it contests view-tabs' strip. */
const PAGES = {
    shell: ['brand', 'hero', 'view-tabs', 'composer', 'account', 'permissions', 'sidebar-layout'],
}

/** Keep shared pages first and preserve selection order for standalone cases. */
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

/** Count quick-tier timing checks as skips, not results. */
function check(label, ok, detail, kind) {
    if (kind === 'timing' && tier === 'quick') {
        skipped += 1
        console.log(`  skip ${label}`)
        return
    }
    if (!ok) failed += 1
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok || detail === undefined ? '' : `  — ${detail}`}`)
}

const failures = () => failed
const skips = () => skipped

export {
    ROOT, CLIENT, HOST, MARKUP, PNG_1PX, SKIN_FIXTURE, SKIN_FACE, SKIN_HAT, SKIN_CASES,
    sleep, same, check, failures, skips, setTier, tierName, TIMING_CASES, FEATURE_CASES, DEFERRED_FEATURES, SHIPPED_PREFS, deferredWanted, PAGES, pagesFor,
}
