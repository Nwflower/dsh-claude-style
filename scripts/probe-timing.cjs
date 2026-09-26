#!/usr/bin/env node
/**
 * probe-timing.cjs — where the model picker's wall-clock time actually goes.
 *
 * probe.cjs asserts the composer's invariants; this one measures. It drives a
 * headless Chrome over CDP against a running DSH web GUI and reports:
 *
 *   1. startup   — long tasks and the resource timings of everything the plugin
 *                  itself loads (the copy document, the woff2 faces);
 *   2. catalog   — when the composer's model label stops being the fallback, which
 *                  is the observable end of the host's `modelCatalog` RPC;
 *   3. open      — click the trigger, time until the rows are painted;
 *   4. rows      — how many rows there are, how many carry a wordmark, how many
 *                  wear the vendor face;
 *   5. markup    — the isolated cost of the wordmark markup the row builder
 *                  assigns with `innerHTML` (the part a DOM stub cannot measure);
 *   6. memory    — JS heap before and after opening the picker.
 *
 * Usage:
 *   node scripts/probe-timing.cjs --token <launch-token> [--url http://127.0.0.1:3080]
 *
 * The launch token comes from the GUI URL (`/?token=…`) of the running DSH
 * instance; it may also be passed via the DSH_WEB_TOKEN env var.
 */
const { findChrome, launchChrome, connectTab } = require('./chrome.cjs')

const args = process.argv.slice(2)
const argOf = (name) => {
  const i = args.indexOf('--' + name)
  return i === -1 ? undefined : args[i + 1]
}
const TOKEN = argOf('token') || process.env.DSH_WEB_TOKEN
const BASE = (argOf('url') || 'http://127.0.0.1:3080').replace(/\/+$/, '')

if (!TOKEN) {
  console.error('usage: node scripts/probe-timing.cjs --token <launch-token> [--url <base>]')
  process.exit(2)
}

const browser = findChrome()
if (!browser) {
  console.error('probe-timing: no Chrome/Edge found; set CHROME_PATH')
  process.exit(2)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const chrome = await launchChrome(browser, { name: 'timing', width: 1440, height: 900 })
  try {
    await measure(chrome.port)
  } finally {
    await chrome.close()
  }
}

/** Take every measurement in a fresh tab and print it. */
async function measure(port) {
  const { send, evalJs } = await connectTab(port)

  await send('Page.enable')
  await send('Runtime.enable')

  // Instrument before the app boots: long tasks are only observable live, and the
  // label timeline needs a clock that starts at navigation.
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__timing = { longtasks: [], label: [] }
      try {
        new PerformanceObserver(function (list) {
          var es = list.getEntries()
          for (var i = 0; i < es.length; i++) {
            window.__timing.longtasks.push({ start: Math.round(es[i].startTime), dur: Math.round(es[i].duration) })
          }
        }).observe({ entryTypes: ['longtask'] })
      } catch (e) {}
      window.__timing.probeLabel = function () {
        var el = document.querySelector('.dsh-claude-model-btn-label')
        window.__timing.label.push({ t: Math.round(performance.now()), text: el ? (el.textContent || '') : null })
      }
      setInterval(window.__timing.probeLabel, 250)
    `,
  })

  const navigatedAt = Date.now()
  await send('Page.navigate', { url: `${BASE}/?token=${TOKEN}` })

  // Wait for the skin, then for the composer seat the picker replaces. `body` is
  // null until the parser gets there, so the first polls must not assume it.
  for (let i = 0; i < 120; i++) {
    if (await evalJs(`!!(document.body && document.body.hasAttribute('data-dsh-claude-style'))`)) break
    await sleep(250)
  }
  const skinAt = Date.now() - navigatedAt
  for (let i = 0; i < 120; i++) {
    if (await evalJs(`!!document.querySelector('.dsh-claude-model-btn')`)) break
    await sleep(250)
  }
  const triggerAt = Date.now() - navigatedAt

  console.log('=== startup ===')
  console.log(`  skin applied:            ${skinAt} ms after navigation`)
  console.log(`  model trigger in DOM:    ${triggerAt} ms after navigation`)

  const longtasks = await evalJs(`(window.__timing && window.__timing.longtasks) || []`)
  const blocking = (longtasks || []).reduce((sum, t) => sum + t.dur, 0)
  console.log(`  long tasks:              ${(longtasks || []).length} (${blocking} ms total blocking)`)
  for (const t of (longtasks || []).slice(0, 8)) console.log(`    at ${t.start} ms: ${t.dur} ms`)

  // Everything the plugin itself pulls over the wire, with the browser's own
  // timings: the copy document and the woff2 faces are the skin's only fetches.
  const resources = await evalJs(`
    performance.getEntriesByType('resource')
      .filter(function (e) { return /dsh-claude-style|woff2|model-descriptions/.test(e.name) })
      .map(function (e) { return { name: e.name.replace(location.origin, ''), start: Math.round(e.startTime), dur: Math.round(e.duration), size: e.transferSize || 0 } })
  `)
  console.log('  plugin resources:')
  for (const r of resources || []) console.log(`    ${String(r.start).padStart(6)} ms  ${String(r.dur).padStart(5)} ms  ${String(r.size).padStart(7)} B  ${r.name}`)

  console.log('\n=== the model label (the catalog RPC’s observable end) ===')
  const label = await evalJs(`(window.__timing && window.__timing.label) || []`)
  let firstChange = null
  const first = label && label[0] ? label[0].text : null
  for (const entry of label || []) {
    if (entry.text !== first) { firstChange = entry; break }
  }
  if (firstChange) console.log(`  label left its first value ("${first}") at ${firstChange.t} ms → "${firstChange.text}"`)
  else console.log(`  label never changed within the sample window (still "${first}")`)
  console.log(`  samples: ${(label || []).map((e) => `${e.t}:${JSON.stringify(e.text)}`).slice(0, 12).join(' ')}`)

  console.log('\n=== opening the picker ===')
  const heapBefore = await evalJs(`performance.memory ? performance.memory.usedJSHeapSize : null`)
  await evalJs(`(() => {
    const btn = document.querySelector('.dsh-claude-model-btn')
    if (!btn) return false
    btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    btn.click()
    return true
  })()`)
  const openStart = Date.now()
  let rows = 0
  for (let i = 0; i < 200; i++) {
    rows = await evalJs(`document.querySelectorAll('.dsh-claude-model-option').length`)
    if (rows > 0) break
    await sleep(50)
  }
  const openMs = Date.now() - openStart
  const heapAfter = await evalJs(`performance.memory ? performance.memory.usedJSHeapSize : null`)
  console.log(`  rows painted:            ${rows} in ${openMs} ms (poll granularity 50 ms)`)
  if (heapBefore !== null && heapAfter !== null) {
    console.log(`  JS heap:                 ${(heapBefore / 1048576).toFixed(1)} MB → ${(heapAfter / 1048576).toFixed(1)} MB`)
  }

  const composition = await evalJs(`(() => {
    const rows = document.querySelectorAll('.dsh-claude-model-option')
    let wordmarks = 0, faces = 0, marks = 0
    for (const row of rows) {
      if (row.querySelector('.dsh-claude-model-wordmark')) wordmarks++
      if (row.getAttribute('data-brand') === 'gemini') faces++
      if (row.querySelector('.dsh-claude-model-brand svg, .dsh-claude-model-brand img')) marks++
    }
    return { rows: rows.length, wordmarks, faces, marks }
  })()`)
  console.log(`  composition:             ${JSON.stringify(composition)}`)

  // The wordmark markup the row builder assigns with innerHTML: a DOM stub cannot
  // measure the parse, this can. Timed on the live markup, then per row.
  const markupCost = await evalJs(`(() => {
    const box = document.querySelector('.dsh-claude-model-wordmark')
    if (!box) return null
    const markup = box.innerHTML
    const host = document.createElement('div')
    const n = 2000
    // warm
    for (let i = 0; i < 50; i++) host.innerHTML = markup
    const t0 = performance.now()
    for (let i = 0; i < n; i++) host.innerHTML = markup
    const per = (performance.now() - t0) / n
    return { bytes: markup.length, perParseMs: per }
  })()`)
  if (markupCost) {
    console.log(`  wordmark innerHTML:      ${markupCost.bytes} B parsed in ${markupCost.perParseMs.toFixed(4)} ms`)
    const rowsWith = composition && composition.wordmarks ? composition.wordmarks : 0
    console.log(`  → all ${rowsWith} wordmark rows:  ${(markupCost.perParseMs * rowsWith).toFixed(2)} ms of the open`)
  }

  // The same measurement for a plain label, as the floor the feature sits on.
  const plainCost = await evalJs(`(() => {
    const host = document.createElement('div')
    const n = 20000
    for (let i = 0; i < 200; i++) { host.innerHTML = ''; host.textContent = 'Claude Sonnet 4.5' }
    const t0 = performance.now()
    for (let i = 0; i < n; i++) { host.innerHTML = ''; host.textContent = 'Claude Sonnet 4.5' }
    return { perRowMs: (performance.now() - t0) / n }
  })()`)
  if (plainCost) console.log(`  plain label textContent: ${plainCost.perRowMs.toFixed(4)} ms/row (floor)`)

  // The control: reload the page (fresh client, so the catalog cache is empty)
  // and open the picker again. The host has answered once already, so if this is
  // just as slow, the cost is per call on the host side rather than cold start-up.
  console.log('\n=== control: a second page load against the same host ===')
  const reloadAt = Date.now()
  await send('Page.navigate', { url: `${BASE}/?token=${TOKEN}` })
  for (let i = 0; i < 200; i++) {
    if (await evalJs(`!!document.querySelector('.dsh-claude-model-btn')`)) break
    await sleep(250)
  }
  const trigger2At = Date.now() - reloadAt
  await evalJs(`(() => {
    const btn = document.querySelector('.dsh-claude-model-btn')
    if (!btn) return false
    btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    btn.click()
    return true
  })()`)
  const open2Start = Date.now()
  let rows2 = 0
  for (let i = 0; i < 300; i++) {
    rows2 = await evalJs(`document.querySelectorAll('.dsh-claude-model-option').length`)
    if (rows2 > 0) break
    await sleep(50)
  }
  const open2Ms = Date.now() - open2Start
  console.log(`  trigger in DOM:            ${trigger2At} ms after the reload`)
  console.log(`  rows painted:              ${rows2} in ${open2Ms} ms`)
  console.log(`  first open was ${openMs} ms, second page ${open2Ms} ms`)
  console.log('  → comparable numbers mean the cost is paid once per page load rather')
  console.log('    than once per process. It does NOT yet separate the host\'s catalog')
  console.log('    build from the client-side work: both start empty on a reload. To')
  console.log('    attribute it, time the modelCatalog frames themselves (CDP Network).')
}

main().catch((error) => { console.error('probe-timing failed:', error.message); process.exitCode = 1 })
