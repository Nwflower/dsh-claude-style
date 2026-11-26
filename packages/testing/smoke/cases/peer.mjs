import { MARKUP, same, check, contrast, basicChecks, commonChecks } from './_shared.mjs'

export default {
  // The other chat-behaviour plugin on the page: the ported features must hand
  // their behaviour over whole (packages/client/src/shared/peer-plugin.ts, D74).
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
    const tabs = settings.tabs || {}
    const page = (tab) => tabs[tab] || {}
    // The rows the ported features own, each on the tab its manifest registers it
    // on (D74, D76). The line's switch and the sent message's entrance carry
    // switches of their own beside the chat-area switch, so all five sit on the
    // Motion tab. headerBand carries a note of its own on a page that is not the
    // Windows desktop, so its note says nothing about the peer plugin.
    const ported = { motion: ['chatAnimations', 'chatWait', 'chatSend', 'caretMotion', 'chatReveal'] }
    const answers = (tab) => page(tab).answers || {}
    // The reader's own answer stays on show (the chat-area animations on, the
    // line's switch on, the sent message's entrance on, the caret's own choice,
    // the fade on) while the control refuses input and the accent line names the
    // plugin that owns the behaviour. The fade ships off, so the probe turns it
    // on before this walk: the row's answer is what that turn-on left, and the
    // reveal's own absence below is the hand-over.
    const showsOwnAnswer = {
      chatAnimations: (answer) => answer.on === true,
      chatWait: (answer) => answer.on === true,
      chatSend: (answer) => answer.on === true,
      caretMotion: (answer) => answer.option === 'typing',
      chatReveal: (answer) => answer.option === 'on',
    }
    const refusingIn = (tab) => page(tab).refusing || []
    const managedIn = (tab) => page(tab).managed || []
    const carried = (tab, key) => (page(tab).rows || []).includes(key)
    check('each ported control is registered on its own tab',
      settings.registered === true && Object.keys(ported).every(tab => ported[tab].every(key => carried(tab, key))),
      JSON.stringify(Object.keys(tabs).map(tab => `${tab}: ${(page(tab).rows || []).join(', ')}`)))
    check('the chat-area animation row is a switch, with no segmented control on it',
      (answers('motion').chatAnimations || {}).on === true && JSON.stringify((answers('motion').chatAnimations || {}).options) === '[]',
      JSON.stringify(answers('motion').chatAnimations))
    check('each ported control is greyed out and marked as managed by the other plugin',
      Object.keys(ported).every(tab => ported[tab].every(key => refusingIn(tab).includes(key) && managedIn(tab).includes(key))),
      JSON.stringify(Object.keys(ported).map(tab => `${tab} refusing=${refusingIn(tab).join(',')} managed=${managedIn(tab).join(',')}`)))
    check('each ported control keeps showing the reader\'s own answer',
      Object.keys(ported).every(tab => ported[tab].every(key => showsOwnAnswer[key](answers(tab)[key] || {}))),
      JSON.stringify({ chatAnimations: answers('motion').chatAnimations, chatWait: answers('motion').chatWait, chatSend: answers('motion').chatSend, caretMotion: answers('motion').caretMotion, chatReveal: answers('motion').chatReveal }))
    check('the accent line names dsh-chat-ux',
      (settings.texts || []).some(text => text.includes('dsh-chat-ux')), JSON.stringify(settings.texts))
    check('the rows the other plugin does not own keep answering',
      [['conversation', 'hideToolbarOutsideConversation'], ['conversation', 'viewTabs'], ['motion', 'motion']]
        .every(([tab, key]) => refusingIn(tab).includes(key) === false),
      JSON.stringify(Object.keys(ported).map(tab => `${tab} refusing=${refusingIn(tab).join(',')}`)))
    // dsh-rewind in the same boot list takes the four write actions and leaves
    // the message actions row its revision history, so the row keeps answering
    // and its accent line names what that plugin took (D111).
    check('with dsh-rewind on the page the message actions row keeps answering',
      carried('conversation', 'messageActions') && refusingIn('conversation').includes('messageActions') === false,
      JSON.stringify({ rows: page('conversation').rows, refusing: refusingIn('conversation') }))
    check('the message actions row names dsh-rewind in its accent line',
      managedIn('conversation').includes('messageActions') && (settings.texts || []).some(text => text.includes('dsh-rewind')),
      JSON.stringify({ managed: managedIn('conversation'), texts: settings.texts }))
    commonChecks(r)
  },
  // Another plugin owns the page from the first frame (packages/client/src/shared/visual-owner.ts,
  // D74): the theme paints nothing, keeps no page of its own, and takes the
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
    check('the settings page leaves with the theme',
      owner.settingsSeats === 0, JSON.stringify(owner.settingsSeats))
    check('yielding leaves no uncaught error behind',
      owner.uncaught === 0, JSON.stringify(owner.uncaught))
    check('the theme takes the page back when the skin leaves',
      owner.afterRelease && owner.afterRelease.sheet === true &&
        owner.afterRelease.live === true && owner.afterRelease.handoff === true &&
        owner.afterRelease.settingsSeats === 2,
      JSON.stringify(owner.afterRelease))
    check('and gives it back when a skin returns',
      owner.afterReturn && owner.afterReturn.sheet === false &&
        owner.afterReturn.live === false && owner.afterReturn.settingsSeats === 0,
      JSON.stringify(owner.afterReturn))
    // No commonChecks: the shared baseline asserts a page the theme owns, and
    // this case's page is the other owner's until the last check hands it back.
  },
  // A skin arriving after the theme took the page (packages/client/src/shared/visual-owner.ts,
  // D74): the theme stands down then, and takes the page back when it leaves.
  'skin-center-arrival'(r) {
    basicChecks(r)
    const arrival = r.arrival || {}
    check('the theme owns a page that booted with no skin on it',
      (arrival.before || {}).sheet === true && (arrival.before || {}).live === true && (arrival.before || {}).settingsSeats === 2,
      JSON.stringify(arrival.before))
    check('a skin arriving later takes the sheet and the body marks down',
      (arrival.yielded || {}).sheet === false && (arrival.yielded || {}).live === false && (arrival.yielded || {}).handoff === false,
      JSON.stringify(arrival.yielded))
    check('the settings page leaves through the late yield',
      (arrival.yielded || {}).settingsSeats === 0, JSON.stringify(arrival.yielded))
    check('the theme takes the page back when that skin leaves',
      (arrival.back || {}).sheet === true && (arrival.back || {}).live === true && (arrival.back || {}).settingsSeats === 2,
      JSON.stringify(arrival.back))
  },
}
