import { basicChecks, check } from './_shared.mjs'
import { bound } from '../../bounds.mjs'

/**
 * The answer's first line (packages/client/src/features/chat-anchor/, D84): the
 * switch ships off and the answer's own start moves nobody; on, a reader at the
 * tail is taken to the first line and a reader higher up stays where he is.
 */
export default {
  'chat-anchor'(r) {
    basicChecks(r)
    const anchor = r.chatAnchor || {}
    const off = anchor.off || {}
    const anchored = anchor.anchored || {}
    const away = anchor.away || {}
    const growing = anchor.growing || {}
    check('with the switch off an answer starting moves the position not at all',
      off.before?.top === off.after?.top && off.before?.gap === 0, JSON.stringify(off))
    // The answer's first line comes to the top and the position leaves the end:
    // the anchor's own write, measured against the row it belongs to
    // (chat-anchor.ts, owner jump then hold).
    check('the answer\'s first line comes to the top of the conversation and the position leaves the end',
      anchored.before === 0 && Number.isFinite(anchored.top) && Math.abs(anchored.top) <= bound('answerAnchorTopPx') &&
        anchored.gap >= bound('answerAnchorGapPx'),
      JSON.stringify(anchored))
    // A reader away from the tail is reading where he chose: the answer starting
    // is no reason to move him.
    check('a reader reading higher up is not moved by an answer starting',
      away.before?.gap >= bound('answerAnchorAwayPx') &&
        Math.abs((away.after?.top ?? 0) - (away.before?.top ?? 0)) <= bound('answerAnchorSlackPx'),
      JSON.stringify(away))
    // An answer shorter than the window has nowhere to put its first line: the
    // write stays at the end, and the anchor asks again on every growth, so the
    // line reaches the top once the row outgrows the window (chat-anchor.ts, grow).
    check('an answer that starts shorter than the window takes the top as it grows',
      growing.before?.gap === 0 && Math.abs(growing.after?.top ?? 999) <= bound('answerAnchorTopPx') &&
        (growing.after?.gap ?? 0) >= bound('answerAnchorGapPx'),
      JSON.stringify(growing))
  },
}
