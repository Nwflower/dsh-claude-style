/**
 * The smoke’s browser-half assertions: what each case’s report must show
 * (the report is the object scripts/smoke/probe.js builds in the page).
 *
 * The cases live in cases/, one module per subject; this file keeps the table
 * the runner reads (D45).
 */
'use strict'
const shell = require('./cases/shell.cjs')
const agent = require('./cases/agent.cjs')
const chat = require('./cases/chat.cjs')
const mascot = require('./cases/mascot.cjs')
const peer = require('./cases/peer.cjs')

const CASES = { ...shell, ...agent, ...chat, ...mascot, ...peer }

module.exports = { CASES }
