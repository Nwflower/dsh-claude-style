/**
 * contract-probe.cjs — the host contract table (packages/contracts/src/table.ts)
 * checked entry by entry on the lane's real page, for the `contract` scenario
 * (D44, D45).
 */
'use strict'
const { loadModule } = require('../../scripts/shared/ts-module.cjs')

/**
 * Run the probes of the given states and keep the results under
 * `context.notes.contract`, where the report and the scenario's checks read them.
 */
async function recordProbes(context, states, windowMs = 0) {
  const list = Array.isArray(states) ? states : [states]
  const results = await probeContract(context.page, list, windowMs)
  for (const result of results) context.notes.contract.push(result)
}

/**
 * Check the entries of the host contract table that belong to the given page
 * states (D44) — the same lists the build holds the skin to, read through the
 * same loader, so a selector cannot pass the build and go unchecked here.
 *
 * The momentary states (`sending`, `streaming`) are read in one window: the
 * checks repeat until every entry has passed once or the window closes, and a
 * pass from an earlier tick is kept, because those states come and go.
 *
 * @returns one result per entry: `{ id, state, ok, observed }`.
 */
async function probeContract(page, states, windowMs = 0) {
  const { HOST_DOM } = loadModule('packages/contracts/src/table.ts')
  const entries = HOST_DOM.filter((entry) => states.includes(entry.probe.state))
  const frames = windowMs === 0 ? 0 : Math.round(windowMs / 16)
  const deadline = Date.now() + windowMs
  let results = await page.evaluate(runProbes, { table: HOST_DOM, entries, frames })
  while (frames > 0 && results.some((result) => !result.ok) && Date.now() < deadline) {
    await page.waitForTimeout(200)
    const watch = await page.evaluate(() => ({ results: window.__contractWatch.results, done: window.__contractWatch.done }))
    results = watch.results
    if (watch.done) break
  }
  return results
}

/**
 * The probe checks, in the page. `kind` is the table's own vocabulary; an
 * unknown kind throws so a new one cannot pass unnoticed.
 *
 * `frames` arms a per-frame watcher instead of checking once: a state that
 * lasts a moment (the submission echo is on the page for about three frames)
 * is only visible to a `requestAnimationFrame` loop. The watcher keeps the first
 * passing observation of each entry and stops when every entry has one or the
 * frames run out; `probeContract` reads it back.
 */
function runProbes({ table, entries, frames = 0 }) {
  // Attribute values are read once per tick rather than once per entry: the
  // momentary states arrive while the watcher runs, so the set has to be fresh.
  let values = new Set()
  const collectValues = () => {
    const found = new Set()
    for (const element of document.querySelectorAll('*')) {
      for (const attribute of element.attributes) found.add(attribute.value)
    }
    return found
  }
  values = collectValues()
  const byId = new Map(table.map((entry) => [entry.id, entry]))
  const path_ = (expression) => expression.split('.').reduce((value, key) => value === undefined || value === null ? undefined : value[key], window)
  const railGeometry = () => {
    const within = byId.get(entries.find((entry) => entry.probe.kind === 'rail-geometry').probe.within ?? 'turn.rail').value
    const rail = document.querySelector(within)
    const scroller = rail === null ? null : rail.querySelector(byId.get('turn.rail-scroller').value)
    if (scroller === null) return 'no rail scroller'
    const marks = rail.querySelectorAll(byId.get('turn.rail-mark').value).length
    const pitch = Number(byId.get('turn.rail-pitch').value)
    const inset = Number(byId.get('turn.rail-inset').value)
    const expected = marks * pitch + 2 * (inset - pitch / 2)
    return Math.abs(scroller.scrollHeight - expected) <= 1 ? null : `${marks} marks, scroller ${scroller.scrollHeight}px, expected ${expected}px`
  }
  const checkEntry = (entry) => {
    const probe = entry.probe
    const root = probe.within === undefined ? document : document.querySelector(byId.get(probe.within).value)
    if (probe.kind === 'selector') {
      const matches = root === null ? 0 : root.querySelectorAll(entry.value).length
      return { ok: matches >= (probe.min ?? 1), observed: `${matches} match${matches === 1 ? '' : 'es'}` }
    }
    if (probe.kind === 'attribute') {
      const matches = document.querySelectorAll(`[${entry.value}]`).length
      return { ok: matches > 0, observed: `${matches} element${matches === 1 ? '' : 's'}` }
    }
    if (probe.kind === 'property') {
      const resolved = getComputedStyle(document.documentElement).getPropertyValue(entry.value).trim()
      return { ok: resolved !== '', observed: resolved === '' ? 'not resolved' : `"${resolved}"` }
    }
    if (probe.kind === 'global') {
      const resolved = path_(entry.value)
      return { ok: resolved !== undefined, observed: typeof resolved }
    }
    if (probe.kind === 'value') {
      const present = values.has(entry.value)
      return { ok: present, observed: present ? 'present as an attribute value' : 'nowhere in the attributes' }
    }
    if (probe.kind === 'rail-geometry') {
      const failure = railGeometry()
      return { ok: failure === null, observed: failure ?? 'marks and scroller agree' }
    }
    if (probe.kind === 'none') {
      // No page form: the behaviour scenarios and the unit tests hold it.
      return { ok: true, observed: 'reported, not checked here' }
    }
    throw new Error(`contract: unknown probe kind "${probe.kind}" on "${entry.id}" (state ${probe.state})`)
  }
  const results = () => entries.map((entry) => ({ id: entry.id, state: entry.probe.state, ...checkEntry(entry) }))
  if (frames === 0) return results()
  const watch = { results: results(), done: false }
  window.__contractWatch = watch
  let at = 0
  const tick = () => {
    at += 1
    values = collectValues()
    watch.results = watch.results.map((result, index) => (result.ok ? result : { ...result, ...checkEntry(entries[index]) }))
    watch.done = watch.results.every((result) => result.ok) || at >= frames
    if (!watch.done) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  return watch.results
}

module.exports = { recordProbes }
