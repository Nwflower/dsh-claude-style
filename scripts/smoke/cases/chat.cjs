'use strict'
const { MARKUP, SKIN_FACE, SKIN_HAT, same, check, contrast, basicChecks, commonChecks } = require('./_shared.cjs')

module.exports = {
  'chat-follow'(r) {
    basicChecks(r)
    const follow = r.chatFollow || {}
    check('the follow feature marks the document, and only a capped process body is clipped to one axis',
      follow.marked === true && follow.overflowX === 'hidden' && follow.expandedOverflowX === 'auto',
      JSON.stringify(follow))
    // A browser clamps a scroll position a few pixels inside
    // `scrollHeight - clientHeight` when a child's own overflow or a scrollbar
    // rounds it, so "at the end" means "inside that clamp", and the point of the
    // check is that it got there by walking.
    const AT_END_PX = 6
    check('a structural moment hands the scroll back: the position was 60px off the end and lands at it',
      follow.before === 60 && follow.after <= AT_END_PX && follow.after < follow.before,
      JSON.stringify({ before: follow.before, after: follow.after }))
    check('a reader who scrolled away himself is left where he is',
      follow.readerBefore === 60 && follow.readerAfter === 60,
      JSON.stringify({ before: follow.readerBefore, after: follow.readerAfter }))
    check('the capped body walks to its end instead of jumping: short a frame later, still moving at a tenth of a second, at the end afterwards',
      follow.catchUpEarly > 200 && follow.catchUpMid < follow.catchUpEarly && follow.catchUpMid > AT_END_PX &&
        follow.catchUpDone <= AT_END_PX && follow.catchUpLate <= AT_END_PX,
      JSON.stringify({
        early: follow.catchUpEarly, mid: follow.catchUpMid,
        done: follow.catchUpDone, late: follow.catchUpLate,
      }))
    // While the host's streaming mark is on the page, the end its own follow
    // writes is taken back before the frame paints and the spring walks the
    // distance (chat-follow.ts, scroll-ease.ts).
    check('the stream glide takes the host\'s own pin back and walks it: well short a frame later, still walking, at the end afterwards',
      follow.glideEarly > 100 && follow.glideMid < follow.glideEarly && follow.glideMid > AT_END_PX &&
        follow.glideDone <= AT_END_PX,
      JSON.stringify({
        early: follow.glideEarly, mid: follow.glideMid, done: follow.glideDone,
        diag: follow.glideDiag,
      }))
    check('a message the reader just sent is not taken back: the host\'s jump to it stands',
      follow.submitGap <= AT_END_PX && follow.submitGapLate <= AT_END_PX,
      JSON.stringify({ gap: follow.submitGap, late: follow.submitGapLate }))
    check('the host\'s own back-to-the-end button is kept out of sight while the glide follows, and shows again after',
      follow.glideButtonMarked === true && follow.glideButtonBack === true,
      JSON.stringify({ marked: follow.glideButtonMarked, back: follow.glideButtonBack }))
  },
  caret(r) {
    basicChecks(r)
    const caret = r.caret || {}
    const on = caret.on || {}
    const off = caret.off || {}
    const back = caret.back || {}
    check('the focused composer surface gets a drawn caret and the native one gives way',
      on.layer === true && on.visible === true && on.marked === true && on.nativeHidden === true,
      JSON.stringify(on))
    check('the drawn caret is placed with a transform',
      typeof on.transform === 'string' && on.transform.indexOf('translate(') === 0, JSON.stringify(on.transform))
    check('off takes the drawn caret and the mark away and gives the native caret back',
      off.layer === false && off.marked === false && off.nativeHidden === false, JSON.stringify(off))
    check('switching it back draws it again', back.layer === true && back.marked === true, JSON.stringify(back))
    const plain = caret.plain || {}
    check('a textarea under the composer seat is taken over the same way',
      plain.layer === true && plain.marked === true && plain.visible === true && plain.nativeHidden === true,
      JSON.stringify(plain))
    const caretReduced = caret.reduced || {}
    check('the animation choice stills the drawn caret without taking it away (D26)',
      caretReduced.layer === true &&
        String(caretReduced.transition).split(',').every(value => value.trim() === '0s') &&
        caretReduced.animation === 'none',
      JSON.stringify(caretReduced), 'timing')
  },
  'chat-fold'(r) {
    basicChecks(r)
    const fold = r.fold || {}
    check('a running thinking row and a running process group are opened',
      fold.thinkOpen === true && fold.groupOpen === true, JSON.stringify(fold))
    check('the opened group carries its mark, its live detail and the label half\'s width',
      fold.openMark === true && fold.liveDetail === true && fold.spread === '56px', JSON.stringify(fold))
    check('the opened group reads Working on its label and on its name',
      fold.label === 'Working' && fold.labelName === 'Working', JSON.stringify(fold))
    check('a tier that does not cap its body is never pressed',
      fold.expandedUntouched === true && (fold.clicks || {}).expanded === 0, JSON.stringify(fold.clicks))
    const after = fold.after || {}
    check('the thinking row folds back when the reasoning stops', after.thinkOpen === false, JSON.stringify(after))
    check('the process group folds back when the section ends, its mark and live detail with it',
      after.groupOpen === false && after.openMark === false && after.liveDetail === false, JSON.stringify(after))
    check('a group the reader opened himself in that phase stays open', fold.readerOpen === true, JSON.stringify(fold.readerOpen))
    const glide = fold.glide || {}
    const glideAfter = glide.after || {}
    check('a press on a folding row is intercepted and handed to the real element when the door lands',
      glide.clicksDuringRoll === 0 && glideAfter.clicks === 1, JSON.stringify(glide))
    check('the folding row carries the door over a clipped body',
      glide.rolling === true && glide.clipped === true, JSON.stringify(glide))
    check('when the door lands the body is gone and nothing is rolling',
      glideAfter.bodyGone === true && glideAfter.rollingAnywhere === false, JSON.stringify(glideAfter))
    const glideOpen = glide.open || {}
    const glideOpenAfter = glide.openAfter || {}
    check('the opening direction rolls the body the host inserts',
      glideOpen.inserted === true && glideOpen.rolling === true, JSON.stringify(glideOpen))
    check('when the door lands the inserted body stays and nothing rolls',
      glideOpenAfter.present === true && glideOpenAfter.rolling === false, JSON.stringify(glideOpenAfter))
    // The switch covers the door and the entrance fade as well (D29/D32).
    const animationsOff = fold.animationsOff || {}
    check('with Automatic folding on, the entrance fade runs',
      fold.entranceOn === '0.12s, 0.12s', JSON.stringify(fold.entranceOn))
    check('switching it off takes the mark and the fade, and lets the press land at once with nothing rolling',
      animationsOff.mark === false && animationsOff.entrance === '0s' &&
        animationsOff.immediateClicks === 1 && animationsOff.rolling === false, JSON.stringify(animationsOff))
    check('switching it back brings the fold mark back',
      (fold.animationsBack || {}).mark === true, JSON.stringify(fold.animationsBack))
    check('the Redraw choice takes the fold mark down with it',
      (fold.animationsRedraw || {}).mark === false, JSON.stringify(fold.animationsRedraw))
  },
  'chat-reveal'(r) {
    basicChecks(r)
    const reveal = r.reveal || {}
    const opening = reveal.opening || {}
    const grown = reveal.grown || {}
    const settled = reveal.settled || {}
    const off = reveal.off || {}
    const back = reveal.back || {}
    const reduced = reveal.reduced || {}
    check('characters arriving in a streaming container are registered as step highlights from the faintest step',
      opening.mark === true && opening.total > 0 && opening.steps > 0, JSON.stringify(opening))
    check('more characters arriving join them', grown.total > 0 && grown.steps >= 1, JSON.stringify(grown))
    check('once faded they leave the registry', settled.total === 0, JSON.stringify(settled))
    check('the preference withdraws the engine whole, and switching it back installs it again',
      off.total === 0 && off.mark === false && back.mark === true, JSON.stringify({ off: off, back: back }))
    check('the animation choice reaches it too: Reduced withdraws the engine, not the system query (D26)',
      reduced.total === 0 && reduced.mark === false, JSON.stringify(reduced))
    const flip = reveal.systemFlip || {}
    check('the system setting flipping under "follow the system" takes the running engine with it, and brings it back',
      (flip.reduced || {}).total === 0 && (flip.reduced || {}).mark === false && (flip.back || {}).mark === true,
      JSON.stringify(flip))
  },
  'chat-files'(r) {
    basicChecks(r)
    const files = r.files || {}
    const seats = files.seats || []
    const collapsed = files.collapsed || {}
    const expanded = files.expanded || {}
    const failed = files.failed || {}
    const running = files.running || {}
    const escalated = files.escalated || {}
    check('both file tools are claimed from the tool view seat',
      seats.length === 2, JSON.stringify(seats))
    check('the edit seat comes first, at priority -1', (seats[0] || {}).seat === 'edit' && (seats[0] || {}).priority === -1, JSON.stringify(seats[0]))
    check('the write seat follows', (seats[1] || {}).seat === 'write', JSON.stringify(seats[1]))
    check('a settled edit reads as a row of the edit variant in the ok state',
      (collapsed.root || {}).variant === 'edit' && (collapsed.root || {}).state === 'ok', JSON.stringify(collapsed.root))
    check('the settled row names the shortened path and the +n -m tail',
      collapsed.texts.includes('app.js') && collapsed.texts.includes('+1') && collapsed.texts.includes('-1'),
      JSON.stringify(collapsed.texts))
    check('the settled row\'s summary carries the file link',
      typeof collapsed.summary === 'string' && collapsed.summary.includes('dsh-claude-file-link'),
      JSON.stringify(collapsed.summary))
    check('the row\'s title comes from the seat copy',
      (collapsed.disclosure || {}).title === 't:tool.title.edit', JSON.stringify(collapsed.disclosure))
    check('the row itself opens and closes, keeping its content while open',
      (collapsed.disclosure || {}).expandOnRowClick === true && (collapsed.disclosure || {}).keepContentWhenOpen === true,
      JSON.stringify(collapsed.disclosure))
    check('expanded, the hunks the result metadata reported go into the diff card',
      ((expanded.diff || {}).diffs || []).length === 1, JSON.stringify(expanded.diff))
    check('the diff card is capped at the chat line count and carries the skin\'s class',
      (expanded.diff || {}).maxLines === 9 && (expanded.diff || {}).className === 'dsh-claude-file-diff',
      JSON.stringify(expanded.diff))
    check('the expanded row carries the inspect label', expanded.texts.includes('t:row.inspect'), JSON.stringify(expanded.texts))
    check('a failed call reads as an error row', (failed.root || {}).state === 'error', JSON.stringify(failed.root))
    check('a failed call draws no diff', failed.diff === null, JSON.stringify(failed.diff))
    check('the failed call\'s verdict colours the summary and hides the failed label',
      typeof failed.summary === 'string' && failed.summary.includes('dsh-claude-file-error') &&
        failed.hiddenText === 't:row.failed',
      JSON.stringify({ summary: failed.summary, hidden: failed.hiddenText }))
    check('the failed call shows the tool\'s own error',
      failed.texts.includes('ToolError: permission_denied'), JSON.stringify(failed.texts))
    check('a write that is still running shows the change its arguments describe',
      (running.diff || {}).className === 'dsh-claude-file-diff', JSON.stringify(running.diff))
    check('the running write announces the running state', running.hiddenText === 't:row.running', JSON.stringify(running.hiddenText))
    check('a call whose change cannot be derived draws no diff card', escalated.diff === null, JSON.stringify(escalated.diff))
    check('it keeps the host\'s IN/OUT card, with no output row',
      escalated.io !== null && escalated.texts.indexOf('t:row.output') === -1, JSON.stringify(escalated.texts))
    check('it keeps the input row', escalated.texts.includes('t:row.input'), JSON.stringify(escalated.texts))
    check('switching the file rows off hands both seat keys back', files.offSeats === 0, JSON.stringify(files.offSeats))
    check('switching them back takes both again, without a reload', files.backSeats === 2, JSON.stringify(files.backSeats))
    check('the Redraw choice hands both seat keys back as well', files.redrawSeats === 0, JSON.stringify(files.redrawSeats))
    // The other plugin coming and going mid-session (packages/client/src/shared/peer-plugin.ts):
    // the decision is re-taken, not frozen at install.
    const peerOn = files.peerOn || {}
    const peerOff = files.peerOff || {}
    check('the other plugin arriving mid-session takes the seat keys down',
      peerOn.seats === 0, JSON.stringify(peerOn))
    check('it takes the ported fold and reveal marks down with them',
      peerOn.foldMark === false && peerOn.revealMark === false, JSON.stringify(peerOn))
    check('the other plugin leaving hands the seat keys back', peerOff.seats === 2, JSON.stringify(peerOff))
    check('leaving brings the fold mark back', peerOff.foldMark === true, JSON.stringify(peerOff))
  },
  'chat-send'(r) {
    basicChecks(r)
    const send = r.send || {}
    const flying = send.flying || {}
    const landed = send.landed || {}
    check('a submission finds the composer input', send.inputFound === true, JSON.stringify(send.inputFound))
    check('a submission lifts a stand-in off the composer card',
      flying.ghost === true && flying.clone === true, JSON.stringify(flying))
    check('the real row is hidden while the stand-in flies',
      flying.hidden === true && flying.visibility === 'hidden', JSON.stringify(flying))
    check('the flight plays an animation', flying.animations > 0, JSON.stringify(flying.animations))
    check('when the flight lands the stand-in is gone', landed.ghost === false, JSON.stringify(landed))
    check('the row is visible again when the flight lands',
      landed.hidden === false && landed.visibility === 'visible', JSON.stringify(landed))
    // The plate the flight is drawn on (send-morph.ts): the bubble's own fill,
    // on the shape, from the first frame — with nothing light left over the
    // destination once it gets there.
    const plate = send.plate || {}
    check('the stand-in is drawn in the destination bubble\'s own colour from the first frame',
      plate.frames > 5 && plate.wrong === 0 && plate.light === 0, JSON.stringify(plate))
    // The hand-over (send-flight.ts's land): with the echo taken away and no row
    // mounted, the stand-in holds instead of fading into the page.
    const hold = send.hold || {}
    const handed = send.handed || {}
    check('the stand-in holds while no row is on the page to land on',
      hold.ghost === true && hold.opacity === 1, JSON.stringify(hold))
    check('a row mounting later takes the hand-over',
      handed.ghost === false && handed.hidden === false && handed.visibility === 'visible', JSON.stringify(handed))
    const sendReduced = send.reduced || {}
    check('the animation choice reaches it too: Reduced flies nothing and leaves the row visible (D26)',
      sendReduced.ghost === false && sendReduced.hidden === false && sendReduced.visibility === 'visible',
      JSON.stringify(sendReduced))
    // The chat-area animation choice is three-way: the send flight is the one
    // member of the Redraw set wired so far.
    const sendRedraw = send.redraw || {}
    check('the Redraw choice still lifts the stand-in and hides the echo while it flies',
      sendRedraw.ghost === true && sendRedraw.hidden === true && sendRedraw.visibility === 'hidden',
      JSON.stringify(sendRedraw))
  },
  'chat-process'(r) {
    basicChecks(r)
    const process = r.process || {}
    const glide = { start: process.glideStart || {}, moved: process.glideMoved || {}, handed: process.glideHanded || {} }
    const reopened = process.reopened || {}
    const readerClosed = process.readerClosed || {}
    check('the redraw tier installs the lane and its mark',
      process.marked === true, JSON.stringify(process.marked))
    check('the whole-turn control carries the turn\'s figures after the host\'s own label',
      process.counts === ' · 思考×3 · 工具×2 · 记录×1' && process.label.indexOf('已完成，用时') === 0,
      JSON.stringify({ counts: process.counts, label: process.label }))
    check('the work before the intermediate output folds into one summary with its own figures',
      process.summaries === 1 && process.figures === '思考×1 · 工具×1' && process.rolls === 2,
      JSON.stringify({ summaries: process.summaries, figures: process.figures, rolls: process.rolls }))
    check('the folded work is off the page while the output and the work after it stand',
      process.foldedWork === true && process.noteShown === true && process.laterShown === true && process.laterHidden === true,
      JSON.stringify(process))
    check('the running thinking row is driven through a track of the lane\'s own',
      glide.start.wrapped === true, JSON.stringify(glide.start))
    check('the track walks after the text at a reading pace',
      typeof glide.moved.top === 'number' && glide.moved.top < -40, JSON.stringify(glide.moved))
    check('the thinking row runs in the reference\'s transform mode, and its edges follow what is left',
      glide.start.mode === 'transform' && glide.start.edges === 'bottom' && glide.moved.edges === 'top'
        && glide.moved.preview === 56,
      JSON.stringify({ start: glide.start, moved: glide.moved }))
    check('the reader\'s own wheel hands the row back to native scrolling',
      glide.handed.wrapped === false && glide.handed.mode === 'manual' && glide.handed.overflow === 'auto'
        && glide.handed.scrollTop > 0,
      JSON.stringify(glide.handed))
    check('a block arriving in the answer fades in on the reference\'s clock',
      (process.reveal || {}).marked === true && (process.reveal || {}).duration === 350
        && String((process.reveal || {}).easing).indexOf('0.22, 1, 0.36, 1') >= 0,
      JSON.stringify(process.reveal))
    check('the entrance is over when its animation ends, and the block stands opaque',
      (process.revealDone || {}).marked === false && (process.revealDone || {}).opacity === '1',
      JSON.stringify(process.revealDone))
    check('a status line whose copy changed leaves before the next one rises',
      (process.statusOut || {}).phase === 'out' && (process.statusOut || {}).transform !== 'none',
      JSON.stringify(process.statusOut))
    check('the swap settles with no phase left and the line back at rest',
      (process.statusSettled || {}).phase === null && (process.statusSettled || {}).transform === 'none',
      JSON.stringify(process.statusSettled))
    check('the tier walks to new content instead of jumping to it',
      (process.follow || {}).midWalk > 1 && (process.follow || {}).endGap <= 6,
      JSON.stringify(process.follow))
    const live = process.live || {}
    const readerFolded = process.readerFolded || {}
    check('a running thinking row is opened by the lane, so the reasoning stands instead of one folded line',
      live.opened === true && live.bodyShown === true && live.clicks === 1,
      JSON.stringify(live))
    check('the running line carries the turn\'s figures while the turn is still on',
      live.counts === ' · 思考×3 · 工具×2 · 记录×1' && live.after === '" · 思考×3 · 工具×2 · 记录×1"',
      JSON.stringify(live))
    check('the running line stands in the reference\'s status language, all on one line',
      (live.style || {}).direction === 'row' && (live.style || {}).wrap === 'wrap' && (live.style || {}).sameLine === true
        && (live.style || {}).size === '14px' && (live.style || {}).lineHeight === '24px'
        && (live.style || {}).dividerFull === '100%',
      JSON.stringify(live.style))
    check('the label carries the reference\'s own sweep, and its icon is left as the host drew it',
      (live.style || {}).labelClip === 'text' && (live.style || {}).labelAnimation === 'dsh-claude-status-shimmer'
        && (live.style || {}).labelFill === 'rgba(0, 0, 0, 0)' && (live.style || {}).iconFill !== 'rgba(0, 0, 0, 0)',
      JSON.stringify(live.style))
    check('a thinking row the reader folded himself stays folded while that phase lasts',
      readerFolded.opened === false && readerFolded.bodyShown === false
        && readerFolded.clicks === readerFolded.clicksBefore + 1,
      JSON.stringify(readerFolded))
    const rows = process.rows || {}
    check('a running call gets the reference\'s living edge: a 6 px dot breathing on a 1.4 s halo',
      (rows.running || {}).animation === 'dsh-claude-running-glow' && (rows.running || {}).duration === '1.4s'
        && (rows.running || {}).dot === '6px/6px',
      JSON.stringify(rows.running))
    check('a compaction divider sweeps in, and its dial turns once after a beat',
      (rows.compaction || {}).animation === 'dsh-claude-compaction-line' && (rows.compaction || {}).duration === '0.52s'
        && (rows.dial || {}).animation === 'dsh-claude-compaction-dial' && (rows.dial || {}).delay === '0.2s',
      JSON.stringify({ line: rows.compaction, dial: rows.dial }))
    check('the running status line carries the two-second highlight sweep',
      (rows.status || {}).animation === 'dsh-claude-status-shimmer' && (rows.status || {}).duration === '2s',
      JSON.stringify(rows.status))
    check('a figure opens its own line from nothing when it first appears',
      (rows.partStart || {}).rows === '0fr' && (rows.partStart || {}).opacity === '0'
        && (rows.partOpen || {}).marked === true && (rows.partOpen || {}).opacity === '1',
      JSON.stringify({ start: rows.partStart, open: rows.partOpen }))
    check('a press on a summary opens that segment alone, and its figures stay',
      reopened.folds === 0 && reopened.expanded === 'true' && reopened.workShown === true,
      JSON.stringify(reopened))
    check('a group the reader closed himself stays closed and keeps its header',
      readerClosed.bodyAOpen === false && readerClosed.headA === false
        && readerClosed.clicks === readerClosed.clicksBefore + 1,
      JSON.stringify(readerClosed))
    const closing = process.closing || {}
    const closed = process.closed || {}
    check('the closing turn holds its boxes while the segments come off',
      closing.held > 0 && closing.summaries === 0, JSON.stringify(closing))
    check('once closed the lane holds nothing and leaves no fold behind',
      closed.held === 0 && closed.summaries === 0 && closed.folds === 0 && closed.counts === process.counts,
      JSON.stringify(closed))
    const again = process.openedAgain || {}
    check('opening it again brings the segment and its figures back',
      again.summaries === 1 && again.figures === '思考×1 · 工具×1' && again.folds === 2 && again.held === 0,
      JSON.stringify(again))
  },
}
