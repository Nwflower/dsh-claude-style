/**
 * The chat fixture the turn-status case reads: one bound session whose snapshot
 * has a failed first turn and a running second one, the wording the host's own
 * pills use, and the command log the permission control's pick is read from.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE

  // Host API drift at sync time: a session list that throws, which the
  // permission control and the model picker read on every pass. The auto mode cases carry a real
  // session instead: the control reads the running preset from its projection
  // and switches through the host permission command; the case asserts both.
  var permissionCommands = []
  /** The cases that carry the turn-status chat fixture: the turn-status case, the waiting line's case, and the two feature-switch cases. */
  var turnFixtureCase = CASE === 'turn-status' || CASE === 'chat-wait' || CASE === 'switches' || CASE === 'switches-off'
  // The turn-status case: one bound session whose chat snapshot (ui-chat's
  // `chat` target of uiConversation) has a failed first turn that ran 12s and
  // reported 300 output tokens, then a running turn — a settled first step
  // that reported its usage, and a second step streaming its reasoning — and
  // the host's chat wording (English).
  var turnStatusChat = turnFixtureCase ? (function () {
    function stepData(value) { return { get: function (kind) { return kind === 'assistant-step' ? value : undefined } } }
    var failed = {
      turn: 1,
      status: 'closed',
      start: { time: 1000 },
      end: { time: 13000, data: { reason: { kind: 'error' } } },
      steps: [
        { step: 1, data: stepData({ status: 'settled', step: 1, blocks: [{ kind: 'text' }], usage: { outputTokens: 300 } }) },
      ],
    }
    var running = {
      turn: 2,
      status: 'open',
      start: { time: Date.now() - 65000 },
      steps: [
        { step: 1, data: stepData({ status: 'settled', step: 1, blocks: [{ kind: 'reasoning' }, { kind: 'tool-call' }], usage: { outputTokens: 1200 } }) },
        { step: 2, data: stepData({ status: 'running', step: 2, blocks: [{ kind: 'reasoning' }] }) },
      ],
    }
    var runningCalls = []
    var snapshot = { timeline: { turns: new Map([[1, failed], [2, running]]) }, legacy: { runningCalls: runningCalls } }
    // The waiting line's case drives the running turn: it empties the steps to
    // make the model silent, and puts a call in flight to make the turn tooling.
    host.turnFixtureRunning = running
    host.turnFixtureCalls = runningCalls
    return {
      binding: function () { return { target: function () { return { getSnapshot: function () { return snapshot } } } } },
    }
  })() : undefined
  host.permissionCommands = permissionCommands
  host.turnFixtureCase = turnFixtureCase
  host.turnStatusChat = turnStatusChat
})()
