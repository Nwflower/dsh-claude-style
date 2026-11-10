/**
 * The smoke’s browser-half assertions: what each case’s report must show
 * (the report is the object the scripts under packages/testing/smoke/probe/ build in the page).
 *
 * The cases live in cases/, one module per subject; this file keeps the table
 * the runner reads (D92).
 */
import shell from './cases/shell.mjs'
import stats from './cases/stats.mjs'
import settings from './cases/settings.mjs'
import agent from './cases/agent.mjs'
import chat from './cases/chat.mjs'
import anchor from './cases/anchor.mjs'
import mascot from './cases/mascot.mjs'
import model from './cases/model.mjs'
import peer from './cases/peer.mjs'

const CASES = { ...shell, ...stats, ...settings, ...agent, ...chat, ...anchor, ...mascot, ...model, ...peer }

export { CASES }
