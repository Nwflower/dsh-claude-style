#!/usr/bin/env node
/**
 * fetch-peakrate-catalog.mjs — refresh the peak rate catalog the package ships (D54).
 *
 * Run by hand when the data source publishes new schedules; like
 * `scripts/fetch-lobe-combines.py`, it is the only kind of script here that
 * reaches the network, and nothing runs it automatically. The document is
 * stored as the source serves it, because the host half's parser — not this
 * script — decides what is usable.
 *
 *   node scripts/fetch-peakrate-catalog.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { PEAKRATE_CATALOG, validatePeakCatalog } from './peakrate-catalog.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const URL_SOURCE = 'https://offpeakclock.com/pricing.json'
const TARGET = path.join(ROOT, 'packages', 'host', 'data', PEAKRATE_CATALOG)

const response = await fetch(URL_SOURCE, { headers: { accept: 'application/json' } })
if (!response.ok) throw new Error(`fetch-peakrate-catalog: ${URL_SOURCE} answered ${response.status}`)
const text = await response.text()
const doc = JSON.parse(text)
const profiles = validatePeakCatalog(doc, TARGET)

const before = fs.existsSync(TARGET) ? fs.statSync(TARGET).size : 0
fs.writeFileSync(TARGET, text.endsWith('\n') ? text : `${text}\n`, 'utf8')
console.log(`wrote packages/host/data/${PEAKRATE_CATALOG} (${profiles} usable profiles, updatedAt ${doc.updatedAt ?? 'unknown'}, ${before} → ${Buffer.byteLength(text)} bytes)`)
if (profiles < 10) throw new Error('fetch-peakrate-catalog: the document yields suspiciously few profiles; check the source before committing')
