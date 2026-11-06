/**
 * appearance.mjs — the appearance layer: what each page state's parts compute
 * to on the real host, against the committed snapshot (D86).
 *
 * A behaviour check asks whether a thing works; this asks what it looks like.
 * The importance walk (importance.mjs) is the lane's tour of every page state on
 * a scratch host, and before it audits a state it lands every animation and
 * reads here, with the skin's own sheet in place, every part in the vocabulary
 * the stylesheets may read (packages/engine/src/parts-table.ts, listed in
 * appearance-parts.json). Each part gives the properties a sheet writes and a
 * machine cannot change: colours, borders, radii, shadows, placement and
 * overflow. The resolved family and size of the font are left out on purpose:
 * both answer for the faces the machine has installed.
 *
 * The reading is compared with packages/testing/data/appearance.json: a part missing
 * from a state, one whose property changed, and one the snapshot holds and the
 * state no longer draws are each named with the values on both sides. The
 * snapshot is written by a run, never by hand —
 * `DSH_APPEARANCE=write node packages/testing/e2e.mjs --scenario importance` —
 * and scripts/ci-scope.mjs refuses one that moves without the client sources
 * that draw the pages.
 */
import fs from 'node:fs'
import path from 'node:path'

const SNAPSHOT = path.join(import.meta.dirname, 'data', 'appearance.json')
const PARTS = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'data', 'appearance-parts.json'), 'utf8')).parts
/**
 * The states whose readings belong to what the host version and the walk's own
 * sign-in show, and so cannot be compared across two runs: the controls found
 * inside the host's own menus, and the account card, which is only on the page
 * when the scripted platform signed the walk in. They are walked — the
 * `!important` verdicts and the unreachable register are read off them — and left
 * out of the snapshot; `importance.mjs` reads the same pattern, and one a
 * snapshot from an earlier walk still carries is ignored here.
 */
const HOST_DEPENDENT_STATES = /^(hero )?host surface |^account card$/
const PROPS = [
  'background-color',
  'color',
  'border-top-color',
  'border-top-width',
  'border-top-style',
  'border-top-left-radius',
  'box-shadow',
  'opacity',
  'display',
  'visibility',
  'position',
  'z-index',
  'font-weight',
  'overflow-x',
  'overflow-y',
]

/** One page state's reading; runs inside the page. A part the state does not draw is absent. */
function readInPage({ parts, props }) {
  const reading = {}
  for (const name of parts) {
    const element = document.querySelector(`[data-dsh-claude-part~="${name}"]`)
    if (element === null) continue
    const style = getComputedStyle(element)
    const values = {}
    for (const prop of props) values[prop] = style.getPropertyValue(prop)
    reading[name] = values
  }
  return reading
}

/**
 * Read one page state.
 * @param page - the Playwright page, settled and with the skin's own sheet in place.
 */
function readAppearance(page) {
  return page.evaluate(readInPage, { parts: PARTS, props: PROPS })
}

/** Every difference between a walk's readings, by state, and the committed snapshot. */
function compareAppearance(readings) {
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')).states
  const problems = []
  // The parts at least one state draws. The walk reads the skin on the host
  // version it runs against, and a state whose own page shows the host's menus
  // or a brand the host only paints on one of them draws fewer parts there: a
  // part absent from a few states is that host's own shape, where a part no
  // state draws at all is drift the snapshot has to answer for.
  const drawn = new Set()
  for (const recorded of Object.values(readings)) for (const part of Object.keys(recorded)) drawn.add(part)
  for (const [state, recorded] of Object.entries(readings)) {
    const known = snapshot[state]
    if (known === undefined) {
      problems.push(`${state}: no snapshot for this page state`)
      continue
    }
    for (const [part, values] of Object.entries(recorded)) {
      const before = known[part]
      if (before === undefined) {
        problems.push(`${state} ${part}: the state draws this part and the snapshot has no reading for it`)
        continue
      }
      for (const [property, value] of Object.entries(values)) {
        if (before[property] !== value) problems.push(`${state} ${part} ${property}: ${JSON.stringify(before[property])} became ${JSON.stringify(value)}`)
      }
    }
    for (const part of Object.keys(known)) {
      if (recorded[part] === undefined && drawn.has(part)) problems.push(`${state} ${part}: the snapshot holds a reading and the state no longer draws this part`)
    }
  }
  for (const state of Object.keys(snapshot)) {
    if (HOST_DEPENDENT_STATES.test(state)) continue
    if (readings[state] === undefined) problems.push(`${state}: the snapshot holds this page state and the walk read nothing for it`)
  }
  return problems
}

/** Rewrite the snapshot from a walk's readings. */
function writeAppearance(readings) {
  const states = {}
  for (const name of Object.keys(readings).sort()) states[name] = readings[name]
  fs.writeFileSync(SNAPSHOT, `${JSON.stringify({
    note: 'The appearance layer\'s snapshot: what each page state\'s parts compute to on the real host, read by the importance walk through packages/testing/appearance.mjs (D86). Regenerate with DSH_APPEARANCE=write node packages/testing/e2e.mjs --scenario importance; a change here without a change under packages/client/src fails scripts/ci-scope.mjs.',
    states,
  }, null, 2)}\n`)
}

export { readAppearance, compareAppearance, writeAppearance, HOST_DEPENDENT_STATES }
