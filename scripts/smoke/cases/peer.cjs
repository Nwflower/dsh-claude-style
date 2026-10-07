'use strict'
const { MARKUP, SKIN_FACE, SKIN_HAT, same, check, contrast, basicChecks, commonChecks } = require('./_shared.cjs')

module.exports = {
  // The other chat-behaviour plugin on the page: the ported features must hand
  // their behaviour over whole (packages/client/src/shared/peer-plugin.ts, D32).
  'peer-chat-ux'(r) {
    basicChecks(r)
    const peer = r.peer || {}
    const marks = peer.marks || {}
    check('a streaming chat area gets none of the ported chat effects',
      marks.follow === false && marks.fold === false && marks.reveal === false, JSON.stringify(marks))
    check('a focused composer gets no drawn caret',
      marks.caretLayer === false && marks.caretMark === false, JSON.stringify(marks))
    check('no character is registered as a step highlight', peer.highlights === 0, JSON.stringify(peer.highlights))
    check('the file change rows leave the host its two seat keys',
      peer.seats === 0, JSON.stringify(peer.seats))
    check('a running thinking row is left as the host rendered it', peer.thinkExpanded === false, JSON.stringify(peer.thinkExpanded))
    check('a running process group is left as the host rendered it', peer.groupOpen === false, JSON.stringify(peer.groupOpen))
    const settings = peer.settings || {}
    const taken = ['chatAnimations', 'caretMotion']
    const answers = settings.answers || {}
    // The reader's own answer stays on show (these defaults are on, the caret
    // sits on Every move) while the control refuses input and the accent line
    // names the plugin that owns the behaviour.
    const showsOwnAnswer = (key) => {
      const answer = answers[key]
      return !!answer && (answer.on === true || answer.option === 'typing')
    }
    check('the Conversation tab carries both ported controls',
      settings.registered === true && taken.every(key => (settings.rows || []).includes(key)),
      JSON.stringify(settings.rows))
    check('both controls are greyed out and marked as managed by the other plugin',
      taken.every(key => (settings.refusing || []).includes(key)) &&
        taken.every(key => (settings.managed || []).includes(key)),
      JSON.stringify({ refusing: settings.refusing, managed: settings.managed }))
    check('each control keeps showing the reader\'s own answer', taken.every(showsOwnAnswer), JSON.stringify(answers))
    check('the accent line names dsh-chat-ux',
      (settings.texts || []).some(text => text.includes('dsh-chat-ux')), JSON.stringify(settings.texts))
    check('the rows the other plugin does not own keep answering',
      (settings.refusing || []).includes('turnStatus') === false && (settings.refusing || []).includes('viewTabs') === false,
      JSON.stringify(settings.refusing))
    commonChecks(r)
  },
  // Another plugin owns the page from the first frame (packages/client/src/shared/visual-owner.ts,
  // D49): the theme paints nothing, keeps its settings section, and takes the
  // page back the moment the owner leaves.
  'skin-center-handoff'(r) {
    basicChecks(r)
    const owner = r.owner || {}
    const bodyAttrs = owner.bodyAttrs || []
    check('a skin on the page keeps the theme sheet unmounted',
      owner.sheet === false, JSON.stringify(owner.sheet))
    check('the theme claims no body attribute while yielded',
      owner.live === false && owner.handoff === false &&
        !bodyAttrs.some(name => name.indexOf('data-dsh-claude') === 0),
      JSON.stringify(bodyAttrs))
    check('the settings section stays registered through the yield',
      owner.settingsRegistered === true, JSON.stringify(owner.settingsRegistered))
    check('yielding leaves no uncaught error behind',
      owner.uncaught === 0, JSON.stringify(owner.uncaught))
    check('the theme takes the page back when the skin leaves',
      owner.afterRelease && owner.afterRelease.sheet === true &&
        owner.afterRelease.live === true && owner.afterRelease.handoff === true,
      JSON.stringify(owner.afterRelease))
    check('and gives it back when a skin returns',
      owner.afterReturn && owner.afterReturn.sheet === false &&
        owner.afterReturn.live === false, JSON.stringify(owner.afterReturn))
    // No commonChecks: the shared baseline asserts a page the theme owns, and
    // this case's page is the other owner's until the last check hands it back.
  },
  // A skin arriving after the theme took the page (packages/client/src/shared/visual-owner.ts,
  // D49): the theme stands down then, and takes the page back when it leaves.
  'skin-center-arrival'(r) {
    basicChecks(r)
    const arrival = r.arrival || {}
    check('the theme owns a page that booted with no skin on it',
      (arrival.before || {}).sheet === true && (arrival.before || {}).live === true, JSON.stringify(arrival.before))
    check('a skin arriving later takes the sheet and the body marks down',
      (arrival.yielded || {}).sheet === false && (arrival.yielded || {}).live === false && (arrival.yielded || {}).handoff === false,
      JSON.stringify(arrival.yielded))
    check('the settings section stays through the late yield',
      (arrival.yielded || {}).settingsRegistered === true, JSON.stringify(arrival.yielded))
    check('the theme takes the page back when that skin leaves',
      (arrival.back || {}).sheet === true && (arrival.back || {}).live === true, JSON.stringify(arrival.back))
  },
}
