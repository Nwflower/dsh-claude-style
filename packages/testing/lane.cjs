/**
 * lane.cjs — what the end-to-end lane's runner and its scenarios read off the
 * page alike: the host's markers, the skin's own marks, the settled flow, and
 * the shape of one assertion (D45).
 */
'use strict'

/**
 * The host's page markers this lane reads. Each one is a D44 entry in
 * `packages/contracts/src/dom.ts`, which the skin reads for the same reason; a marker
 * that changes breaks both, and the contract test names it there.
 */
const HOST = {
  composer: '[data-composer-input]', // COMPOSER_INPUT_SELECTOR
  composerCard: '[data-composer-card]', // COMPOSER_CARD_SELECTOR
  userRow: '[data-chat-flow-kind="user"]', // FLOW_KIND_ATTRIBUTE with the host's user kind
  flow: '[data-chat-flow]', // CHAT_FLOW_SELECTOR
  streaming: '[data-streaming]', // STREAMING_SELECTOR
  turnProcess: 'button[data-turn-process]', // TURN_PROCESS_SELECTOR
  scroller: '[data-conversation-scroll]', // CONVERSATION_SCROLL_SELECTOR
  followingTail: '[data-chat-following-tail]', // FOLLOWING_TAIL_SELECTOR
  echo: '[data-submission-echo]', // SUBMISSION_ECHO_SELECTOR
  running: '[data-chat-running]', // CHAT_RUNNING_SELECTOR
  accountTrigger: '[aria-haspopup="menu"][data-signed-out]', // ACCOUNT_TRIGGER_SELECTOR
}

/**
 * The skin's own marks (packages/client/src/constants.ts): the stand-in the composer leaves
 * behind for the send flight, and the attribute it puts on the real row while
 * that stand-in flies, which the flight stylesheet hides.
 */
const SKIN = {
  sendGhost: '[data-dsh-claude-send-ghost]', // CHAT_SEND_GHOST_ATTR
  flyingMark: 'data-dsh-claude-send-flight', // CHAT_FLYING_ATTR
  echoAttribute: 'data-submission-echo', // SUBMISSION_ECHO_SELECTOR without its brackets
  // The other mark the pin reads while the glide holds a position (FOLLOW_HOLD_ATTR).
  hold: '[data-dsh-claude-follow-hold]', // FOLLOW_HOLD_ATTR
}

/** Both tables, for the sampler that runs inside the page. */
const MARKS = { ...HOST, ...SKIN }

/** What the page shows once a turn has settled. */
async function readFlow(page) {
  return page.evaluate((host) => {
    const flow = document.querySelector(host.flow)
    const kinds = [...document.querySelectorAll('[data-chat-flow-kind]')].map((el) => el.getAttribute('data-chat-flow-kind'))
    return {
      kinds,
      text: (flow?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      userRows: kinds.filter((kind) => kind === 'user').length,
      toolRows: kinds.filter((kind) => kind === 'tool-call').length,
      processGroups: document.querySelectorAll(host.turnProcess).length,
      streaming: document.querySelectorAll(host.streaming).length,
      callIds: [...document.querySelectorAll('[data-chat-call-id]')].map((el) => el.getAttribute('data-chat-call-id')),
    }
  }, HOST)
}

/** One assertion with the evidence behind it. */
function check(name, ok, detail) {
  return { name, ok: ok === true, detail: detail === undefined ? '' : String(detail) }
}

module.exports = { HOST, SKIN, MARKS, readFlow, check }
