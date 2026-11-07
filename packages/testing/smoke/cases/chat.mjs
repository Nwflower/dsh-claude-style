import { MARKUP, SKIN_FACE, SKIN_HAT, BAND_ANIMATION, same, check, contrast, basicChecks, commonChecks } from './_shared.mjs'
import { bound } from '../../bounds.mjs'

/**
 * The readings between the two ends of a recorded walk, each with the frame it
 * was taken on: what a walk shows that a jump does not.
 */
const walkedSteps = (readings, endPx) => {
  const from = readings[0]
  const steps = []
  for (let at = 1; at < readings.length; at += 1) {
    if (readings[at] !== readings[at - 1] && readings[at] > endPx && readings[at] < from) steps.push({ at, gap: readings[at] })
  }
  return steps
}

/**
 * Whether the frames a recorded walk ended on all read the end: the walk arrived
 * and its ease stopped there, rather than the recording being cut while it still
 * had ground to cover.
 */
const walkHeldAtEnd = (readings, endPx, frames) => readings.length >= frames &&
  readings.slice(-frames).every((gap) => gap <= endPx)

export default {
  'chat-follow'(r) {
    basicChecks(r)
    const follow = r.chatFollow || {}
    check('the follow feature marks the document, and only a capped process body is clipped to one axis',
      follow.marked === true && follow.overflowX === 'hidden' && follow.expandedOverflowX === 'auto',
      JSON.stringify(follow))
    // A browser clamps a scroll position a few pixels inside
    // `scrollHeight - clientHeight` when a child's own overflow or a scrollbar
    // rounds it, so "at the end" means "inside that clamp", and the point of the
    // checks below is that the position got there by walking. The two walks are
    // the page's own recordings of their frames (smoke/probe/chat-motion.js).
    const AT_END_PX = bound('followAtEndPx')
    check('a structural moment hands the scroll back: the position was 60px off the end and lands at it',
      follow.before === 60 && follow.after <= AT_END_PX && follow.after < follow.before,
      JSON.stringify({ before: follow.before, after: follow.after }))
    check('a reader who scrolled away himself is left where he is',
      follow.readerBefore === 60 && follow.readerAfter === 60,
      JSON.stringify({ before: follow.readerBefore, after: follow.readerAfter }))
    const catchUp = follow.catchUp || []
    const catchUpSteps = walkedSteps(catchUp, AT_END_PX)
    check('the capped body walks to its end instead of jumping: the recording starts far off, every frame closes on it, and the last one is at the end',
      catchUp.length >= bound('followCatchUpMinFrames') && catchUp[0] > bound('followCatchUpStartPx') &&
        catchUp.every((gap, at) => at === 0 || gap <= catchUp[at - 1]) &&
        catchUp[catchUp.length - 1] <= AT_END_PX &&
        catchUpSteps.length >= bound('followWalkDistinctValues'),
      JSON.stringify({ readings: catchUp.length, start: catchUp[0], end: catchUp[catchUp.length - 1], steps: catchUpSteps.map((step) => step.gap) }))
    check('the capped body is left at its end: the frames the recording ended on all read it',
      walkHeldAtEnd(catchUp, AT_END_PX, bound('followQuietFrames')), JSON.stringify(catchUp.slice(-bound('followQuietFrames'))))
    // While the host's streaming mark is on the page, the end its own follow
    // writes stands, and the column slides the growth to rest (chat-follow.ts, D85).
    const slide = follow.slide || []
    const slideSteps = walkedSteps(slide, AT_END_PX)
    check('the stream slide puts the growth the host\'s pin pushed up back down and slides it to rest: the recording starts well above rest, every frame closes on it, and the last one is at rest',
      slide.length >= bound('followSlideMinFrames') && slide[0] > bound('followSlideStartPx') &&
        slide.every((offset, at) => at === 0 || offset <= slide[at - 1]) &&
        slide[slide.length - 1] <= AT_END_PX &&
        slideSteps.length >= bound('followWalkDistinctValues'),
      JSON.stringify({
        readings: slide.length, start: slide[0], end: slide[slide.length - 1],
        steps: slideSteps.map((step) => step.gap), diag: follow.slideDiag,
      }))
    check('the slide is left at rest: the frames the recording ended on all read it',
      walkHeldAtEnd(slide, AT_END_PX, bound('followQuietFrames')), JSON.stringify(slide.slice(-bound('followQuietFrames'))))
    const slideFrames = follow.slideFrames || []
    const rowTops = slideFrames.map((frame) => frame.row)
    check('the slide writes no position: the host\'s pin stands at the end on every frame, and the live turn\'s row stands still over it',
      slideFrames.length > 0 && slideFrames.every((frame) => frame.gap <= AT_END_PX) &&
        Math.max(...rowTops) - Math.min(...rowTops) <= bound('followSlideRowDriftPx'),
      JSON.stringify(slideFrames))
    const submitted = r.chatFollowSubmit || {}
    check('a message the reader just sent does not slide: the host\'s jump to it stands',
      Array.isArray(submitted.echo) && Array.isArray(submitted.row) &&
        submitted.echo.concat(submitted.row).filter((count) => count !== 0).length === 0,
      JSON.stringify({ echo: submitted.echo, row: submitted.row }))
    check('the same message growing into its row does not slide either: both entrances stand the slide down',
      Array.isArray(submitted.growWaiting) && Array.isArray(submitted.growPlaying) &&
        submitted.growWaiting.concat(submitted.growPlaying).filter((count) => count !== 0).length === 0,
      JSON.stringify({ waiting: submitted.growWaiting, playing: submitted.growPlaying }))
    // A growth wider than a slide carries is a burst, not a replaced column:
    // it is slid from the stretch a slide carries rather than jumped whole
    // (chat-follow.ts's startSlide).
    const burst = follow.burst || []
    const burstSteps = walkedSteps(burst, AT_END_PX)
    check('a burst is slid from the stretch a slide carries instead of jumping whole',
      burst.length >= bound('followSlideMinFrames') && burst[0] > bound('followSlideStartPx') &&
        burst.every((offset, at) => at === 0 || offset <= burst[at - 1]) && burst[burst.length - 1] <= AT_END_PX &&
        burstSteps.length >= bound('followWalkDistinctValues'),
      JSON.stringify({ readings: burst.length, start: burst[0], end: burst[burst.length - 1], steps: burstSteps.map((step) => step.gap) }))
    // The slide restarts from where the frame before it stood, and one growth is
    // all the distance it may be left carrying, the tail of the slide still
    // running when the next piece lands aside: a run of small growths, each
    // arriving before the slide has landed, stays inside the growth it just took
    // — the offset the column is drawn at, not the scroller's own gap, which the
    // host's pin keeps at zero either way — and the run is never left standing
    // once it stops (chat-follow.ts's slideDuration, D85).
    const pace = follow.pace || {}
    const paceFrames = pace.frames || []
    const carried = paceFrames.map((frame) => frame.offset)
    check('a run of small growths leaves the sliding column no further off the pin than the growth just taken',
      paceFrames.length > 4 && paceFrames.every((frame) => Number.isFinite(frame.gap) && frame.gap <= pace.growth + bound('followSlideRowDriftPx')
        && Number.isFinite(frame.offset) && frame.offset <= pace.growth + bound('streamSlideCarryTailPx')) &&
        (pace.settled ?? 1) <= AT_END_PX,
      JSON.stringify({ ...pace, offsets: carried }))
    const shrink = follow.shrink || {}
    check('a structural shrink ends the running offset instead of pushing the column down once',
      Number.isFinite(shrink.before) && Number.isFinite(shrink.after) && shrink.animations === 0 &&
        shrink.after <= shrink.before + bound('followSlideRowDriftPx'),
      JSON.stringify(shrink))
    // A reader holding the conversation keeps the position the host's own pin
    // would take from him: the growth is given back and nothing slides
    // (chat-follow.ts's holdGrowth).
    const hold = follow.hold || {}
    check('a reader holding the conversation keeps the growth the host\'s pin pushed up, and nothing slides',
      Number.isFinite(hold.gap) && hold.gap >= bound('followHoldGrowthPx') && hold.slides === 0,
      JSON.stringify(hold))
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
    check('the animation choice stills the drawn caret without taking it away (D40)',
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
    const summary = fold.summary || {}
    check('the group\'s header says what it holds in place of the host\'s words, and names itself with the sentence',
      summary.marked === true && summary.text === '1 thought, 1 tool call' && summary.form === 'full' &&
        summary.name === '1 thought, 1 tool call' && summary.wordsShown === false && summary.summaryShown === true,
      JSON.stringify(summary))
    check('the summary sweeps while the section runs: the host\'s band crosses a copy of its figures',
      summary.running === true && summary.band?.animation === BAND_ANIMATION &&
        summary.band?.text === summary.text && summary.band?.rolling === false,
      JSON.stringify(summary))
    const grown = fold.grown || {}
    check('a call arriving rolls its figure to the new count, and the band\'s copy stands on that count at once',
      grown.text === '1 thought, 2 tool calls' && grown.name === '1 thought, 2 tool calls' && grown.rolling === true &&
        grown.band?.text === grown.text && grown.band?.rolling === false,
      JSON.stringify(grown))
    const narrow = fold.narrow || {}
    const wide = fold.wide || {}
    check('a header without the room for the sentence falls back to the compact figures, and takes it back when the room returns',
      narrow.form === 'compact' && narrow.text === 'Thinking×1 · Tools×2' && narrow.name === '1 thought, 2 tool calls' &&
        wide.form === 'full' && wide.text === '1 thought, 2 tool calls',
      JSON.stringify({ narrow, wide }))
    check('a tier that does not cap its body is never pressed',
      fold.expandedUntouched === true && (fold.clicks || {}).expanded === 0, JSON.stringify(fold.clicks))
    const after = fold.after || {}
    check('the thinking row folds back when the reasoning stops', after.thinkOpen === false, JSON.stringify(after))
    check('the process group folds back when the section ends, and its summary stops sweeping',
      after.groupOpen === false && (after.summary || {}).running === false && (after.summary || {}).band === null, JSON.stringify(after))
    check('a group the host folds when its turn is stopped opens again, so a stopped turn keeps its work on the page',
      fold.turnGroups?.answeredOpen === false && fold.turnGroups?.stoppedOpen === true, JSON.stringify(fold.turnGroups))
    check('a stopped turn that later carries an answer row closes like any answered one',
      fold.stoppedLateAnswer?.open === false, JSON.stringify(fold.stoppedLateAnswer))
    check('a group the reader opened himself in that phase stays open', fold.readerOpen === true, JSON.stringify(fold.readerOpen))
    const message = fold.message || {}
    const messageOpen = fold.messageOpen || {}
    const messageShort = fold.messageShort || {}
    check('a message that lands before its words do stands whole until its own box moves',
      messageShort.marked === null && messageShort.toggle === null, JSON.stringify(messageShort))
    check('a message the reader sent that overflows the cap is clamped once its words land, with the cut softened at its lower edge',
      message.marked === 'collapsed' && message.full > message.cap && message.capped === message.cap &&
        typeof message.mask === 'string' && message.mask.startsWith('linear-gradient'),
      JSON.stringify(message))
    check('the control the skin draws under it names what pressing it does, and hands the whole message back',
      message.toggle === 'Show the whole message' && messageOpen.marked === null &&
        messageOpen.toggle === 'Show less' && messageOpen.capped > message.capped && messageOpen.mask === 'none',
      JSON.stringify({ message, open: messageOpen }))
    // The reasoning's streamed window: transitions.dev's "Reasoning stream",
    // adapted to live text — a window that grows with the reasoning up to the cap
    // it may reach, where it holds still and the text steps on the snippet's clock.
    // The probe grows the first row across the cap and reads the second, which
    // stands over it from the start.
    const grow = fold.reasonWindow || []
    const run = fold.reasonGrow || []
    const offsetsOf = (frame) => {
      const match = /matrix\(1, 0, 0, 1, 0, (-?[\d.]+)\)/.exec((frame || {}).transform || '')
      return match === null ? 0 : -Number(match[1])
    }
    const step = 24 * 2
    const offsets = run.map(offsetsOf)
    const reachable = run.length > 0 ? (run[0].textHeight - run[0].slotHeight) : 0
    check('a reasoning shorter than the cap stands in a window exactly as tall as the text, with nothing faded',
      grow.length === 4 &&
        grow.slice(0, 2).every((frame) => frame.on === true && frame.capped === false && frame.offset === 0 && frame.mask === 'none' && frame.slotHeight === frame.textHeight && frame.textHeight < 400) &&
        grow.slice(2).every((frame) => frame.capped === true && frame.slotHeight === 400 && frame.mask.startsWith('linear-gradient') && frame.textHeight > 400) &&
        grow[3].textHeight > grow[0].textHeight,
      JSON.stringify(grow))
    check('a reasoning over the cap holds the window at the height it may reach, masked at both edges',
      run.length > 0 &&
        run.every((frame) => frame.on === true && frame.capped === true &&
          frame.slotHeight === 400 && frame.mask.startsWith('linear-gradient') && frame.textHeight > 400),
      JSON.stringify(run))
    check('the window holds a transition for its step, on the snippet\'s own clock',
      run.every((frame) => frame.transition === 'transform 0.5s') && grow.every((frame) => frame.transition === 'transform 0.5s'),
      JSON.stringify([...run, ...grow].map((frame) => frame.transition)))
    check('the text steps up towards the newest line and stops there, never past it',
      offsets.every((offset) => offset <= reachable + 0.5) && Math.max(...offsets) === reachable,
      JSON.stringify({ offsets, reachable, step }))
    const reopened = fold.reasonOpen || {}
    check('once the reasoning stops the window is off and the text stands at the host\'s own height',
      reopened.on === false && offsetsOf(reopened) === 0 && reopened.mask === 'none' &&
        reopened.slotHeight === 400 && reopened.textHeight > 400,
      JSON.stringify(reopened))
    const closed = fold.reasonClosed || {}
    check('the window comes off the row without the row changing height',
      closed.on === false && closed.capped === false && offsetsOf(closed) === 0 && closed.mask === 'none' &&
        closed.slotHeight === run[run.length - 1].slotHeight && closed.bodyHeight === run[run.length - 1].bodyHeight,
      JSON.stringify({ closed, during: run[run.length - 1] }))
    const grewClosed = fold.reasonGrewClosed || {}
    check('the window a reasoning outgrew comes off with the row unchanged as well',
      grewClosed.on === false && grewClosed.capped === false && offsetsOf(grewClosed) === 0 && grewClosed.mask === 'none' &&
        grewClosed.slotHeight === grow[grow.length - 1].slotHeight && grewClosed.bodyHeight === grow[grow.length - 1].bodyHeight,
      JSON.stringify({ grewClosed, during: grow[grow.length - 1] }))
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
    // A row the host wraps in a header: the body stands beside the wrapper, and
    // the accessory beside the row is not the door's target.
    const wrapped = fold.wrappedRolled || {}
    check('a press on a row the host wraps in a header rolls that row\'s own body',
      wrapped.rolling === true && wrapped.clipped === true && wrapped.accessoryRolled === false,
      JSON.stringify(wrapped))
    check('the wrapped row\'s door is handed back when it lands',
      wrapped.clicksDuringRoll === 0 && wrapped.clicks === 1 &&
        wrapped.bodyGone === true && wrapped.folded === true, JSON.stringify(wrapped))
    // The switch covers the door and the entrance fade as well (D72/D74).
    const animationsOff = fold.animationsOff || {}
    const wrappedEntrance = fold.entranceWrapped || {}
    const wrappedOff = animationsOff.wrappedEntrance || {}
    check('with Automatic folding on, the entrance fade runs, and only the body takes it',
      fold.entranceOn === '0.12s, 0.12s' &&
        wrappedEntrance.body === '0.12s, 0.12s' && wrappedEntrance.accessory === wrappedEntrance.page,
      JSON.stringify({ plain: fold.entranceOn, wrapped: wrappedEntrance }))
    check('switching it off takes the mark and the fade, and lets the press land at once with nothing rolling',
      animationsOff.mark === false && animationsOff.entrance === '0s' && wrappedOff.body === '0s' &&
        animationsOff.immediateClicks === 1 && animationsOff.rolling === false,
      JSON.stringify(animationsOff))
    check('switching it back brings the fold mark back',
      (fold.animationsBack || {}).mark === true, JSON.stringify(fold.animationsBack))
  },
  'chat-reveal'(r) {
    basicChecks(r)
    const reveal = r.reveal || {}
    const shipped = reveal.shipped || {}
    const opening = reveal.opening || []
    const grown = reveal.grown || []
    const settled = reveal.settled || {}
    const off = reveal.off || {}
    const back = reveal.back || {}
    const reduced = reveal.reduced || {}
    check('the fade ships off: a streaming container gets no step highlights and no mark until the choice is turned on',
      shipped.total === 0 && shipped.mark === false, JSON.stringify(shipped))
    check('characters arriving in a streaming container are registered as step highlights from the faintest step',
      opening.some((frame) => frame.mark === true && frame.total > 0 && frame.steps > 0), JSON.stringify(opening.slice(0, 4)))
    check('more characters arriving join them', grown.some((frame) => frame.total > 0 && frame.steps >= 1), JSON.stringify(grown.slice(0, 4)))
    check('once faded they leave the registry', settled.total === 0, JSON.stringify(settled))
    check('the preference withdraws the engine whole, and switching it back installs it again',
      off.total === 0 && off.mark === false && back.mark === true, JSON.stringify({ off: off, back: back }))
    check('the animation choice reaches it too: Reduced withdraws the engine, not the system query (D40)',
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
    const readRow = files.read || {}
    const reading = files.reading || {}
    check('the three file operations are claimed from the tool view seat',
      seats.length === 3, JSON.stringify(seats))
    check('the edit seat comes first, at priority -1', (seats[0] || {}).seat === 'edit' && (seats[0] || {}).priority === -1, JSON.stringify(seats[0]))
    check('the write seat follows', (seats[1] || {}).seat === 'write', JSON.stringify(seats[1]))
    check('the read seat follows, at the same priority', (seats[2] || {}).seat === 'read' && (seats[2] || {}).priority === -1, JSON.stringify(seats[2]))
    check('a settled edit reads as a row of the edit variant in the ok state',
      (collapsed.root || {}).variant === 'edit' && (collapsed.root || {}).state === 'ok', JSON.stringify(collapsed.root))
    check('the settled row names the shortened path and the +n -m tail',
      collapsed.texts.includes('app.js') && (collapsed.figures || []).join(' ') === '+1 -1',
      JSON.stringify({ figures: collapsed.figures, texts: collapsed.texts }))
    check('the settled row\'s summary carries the file link',
      typeof collapsed.summary === 'string' && collapsed.summary.includes('dsh-claude-file-link'),
      JSON.stringify(collapsed.summary))
    check('the row\'s title comes from the seat copy and stands in the collapsed content',
      (collapsed.disclosure || {}).title === '' && collapsed.texts.includes('t:tool.title.edit'),
      JSON.stringify({ title: (collapsed.disclosure || {}).title, texts: collapsed.texts }))
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
    check('a file touched once draws no merge mark: its own row stands alone',
      (collapsed.root || {}).merge === null && (running.root || {}).merge === null,
      JSON.stringify({ collapsed: (collapsed.root || {}).merge, running: (running.root || {}).merge }))
    check('a read reads as a row of the read variant with the host\'s own title',
      (readRow.root || {}).variant === 'read' && (readRow.root || {}).tool === 'read' &&
        readRow.texts.includes('t:tool.title.read') && readRow.texts.includes('app.js'),
      JSON.stringify({ root: readRow.root, texts: readRow.texts }))
    check('a read draws no +n -m tail: it changed nothing',
      (readRow.figures || []).length === 0, JSON.stringify(readRow.figures))
    check('expanded, a read shows the file\'s own window, read back out of its result',
      ((readRow.read || {}).lines || []).length === 2 && (readRow.read || {}).totalLines === 2 &&
        (readRow.read || {}).className === 'dsh-claude-file-read',
      JSON.stringify(readRow.read))
    check('a read that is still running shows the call alone and no window',
      (reading.root || {}).state === 'running' && reading.read === null && reading.texts.includes('t:row.running'),
      JSON.stringify({ root: reading.root, read: reading.read }))
    check('switching the file rows off hands all three seat keys back', files.offSeats === 0, JSON.stringify(files.offSeats))
    check('switching them back takes all three again, without a reload', files.backSeats === 3, JSON.stringify(files.backSeats))
    // The other plugin coming and going mid-session (packages/client/src/shared/peer-plugin.ts):
    // the decision is re-taken, not frozen at install.
    const peerOn = files.peerOn || {}
    const peerOff = files.peerOff || {}
    check('the other plugin arriving mid-session takes the seat keys down',
      peerOn.seats === 0, JSON.stringify(peerOn))
    check('it takes the ported fold and reveal marks down with them',
      peerOn.revealBeforePeer === true && peerOn.foldMark === false && peerOn.revealMark === false, JSON.stringify(peerOn))
    check('the other plugin leaving hands the seat keys back', peerOff.seats === 3, JSON.stringify(peerOff))
    check('leaving brings the fold mark back', peerOff.foldMark === true, JSON.stringify(peerOff))
  },
  'chat-wait'(r) {
    basicChecks(r)
    const wait = r.wait || {}
    const working = wait.working || {}
    check('the running row takes the skin\'s line beside the host\'s words, which step aside',
      working.marked === true && working.besideWords === true && working.wordsShown === false, JSON.stringify(working))
    const loader = working.loader || {}
    const laneOf = (reading, name) => (reading.lanes || []).find((lane) => String(lane.name).includes(name)) || {}
    const numbers = (text) => (String(text).match(/-?[\d.]+/g) || []).map(Number)
    const LANE_DOTS = [['is-bounce', 3], ['is-line', 3], ['is-orbit', 4]]
    const OPENINGS = ['dsh-claude-wait-dot', 'dsh-claude-wait-dot-line', 'dsh-claude-wait-dot-orbit-1']
    // 三条轨道都在页面上、各带自己的球数（3 / 3 / 4），其中一条在用；开哪一条是随机的，
    // 所以这里只认「用的是三条之一」。
    check('加载点把三条轨道都建好了——三颗跳球、三颗走路、四颗交换四角——其中一条在用，主机的鲸鱼尾让位',
      loader.shown === true && (loader.lanes || []).length === 3 &&
        LANE_DOTS.every(([name, count]) => (laneOf(loader, name).opacity || []).length === count) &&
        LANE_DOTS.some(([name]) => String(loader.motion).includes(name)) &&
        OPENINGS.includes(String(loader.animation)) && loader.background === 'rgb(217, 119, 87)' &&
        loader.shadow === 'none' && working.whaleShown === false,
      JSON.stringify({ loader, whaleShown: working.whaleShown }))
    // 每条轨道自己的动作：探针把它临时放到「在用」的位置、用它自己的时钟走完一圈，
    // 所以读的是样式表写下的曲线，与此刻轮到谁无关。
    const bounceFrames = (wait.bounceLane || { frames: [] }).frames || []
    const bounceY = bounceFrames.map((frame) => numbers(frame.translate[0])[1]).filter((one) => Number.isFinite(one))
    check('跳球那条：一颗球从地面弹起 8px 再落回，三颗各错开一个相位',
      bounceFrames.length >= 40 && bounceFrames[0].animation === 'dsh-claude-wait-dot' &&
        bounceFrames[0].duration === '0.5s' && (bounceFrames[0].delays || []).join(',') === '-0.5s,-0.3s,-0.2s' &&
        Math.min(...bounceY) <= -7.5 && Math.max(...bounceY) >= -0.5,
      JSON.stringify({ readings: bounceFrames.length, low: Math.min(...bounceY), high: Math.max(...bounceY), head: bounceFrames[0] }))
    // 走路那条：一端走到另一端各占半个周期，所以过半个周期球落在中点另一侧、离中点的距离与
    // 大小都一样；三颗各错开三分之一个周期（相差半个周期就是把同一个动作镜像过去），
    // 而且两端最多就是球本来的大小。简谐运动在两端慢、中间快：离中点超过四分之三幅度的
    // 时间约占一周的 46%，匀速往返只占 25%，读的就是这一项。
    const lineFrames = (wait.lineLane || { frames: [] }).frames || []
    const lineY = lineFrames.map((frame) => numbers(frame.translate[0])[1])
    const lineScale = lineFrames.map((frame) => Number(String(frame.scale[0]).split(' ')[0]))
    const trace = lineY.filter((one) => Number.isFinite(one))
    const sizes = lineScale.filter((one) => Number.isFinite(one))
    const lowest = trace.length === 0 ? 0 : Math.min(...trace)
    const highest = trace.length === 0 ? 0 : Math.max(...trace)
    const middle = (lowest + highest) / 2
    const half = Math.floor(trace.length / 2)
    const place = trace.slice(0, half).map((one, at) => Math.abs(one + trace[at + half] - 2 * middle))
    const size = sizes.slice(0, half).map((one, at) => Math.abs(one - sizes[at + half]))
    const drift = place.length === 0 ? Infinity : Math.max(...place)
    const sizeDrift = size.length === 0 ? Infinity : Math.max(...size)
    const reach = (highest - lowest) / 2
    const dwell = trace.length === 0 ? 0 : trace.filter((one) => Math.abs(one - middle) > reach * 0.75).length / trace.length
    const phaseOf = (delay) => {
      const seconds = Number(String(delay).replace('s', ''))
      return ((-seconds % 1.25) + 1.25) % 1.25 / 1.25
    }
    const phases = (lineFrames[0] === undefined ? [] : lineFrames[0].delays || []).map(phaseOf)
    const clash = phases.some((one, at) => phases.some((two, other) => other > at &&
      (Math.abs(one - two) < 0.02 || Math.abs(Math.abs(one - two) - 0.5) < 0.02)))
    check('走路那条：三颗各沿自己的线走简谐、两端停得比中间久、相位各错三分之一，去程与回程是同一条曲线，最长的一帧也不比跳球大',
      lineFrames.length >= 45 && lineFrames[0].animation === 'dsh-claude-wait-dot-line' &&
        lineFrames[0].duration === '1.25s' && phases.length === 3 && !clash &&
        highest - lowest >= 7 && Math.max(...sizes) <= 1.001 && drift <= 0.5 && sizeDrift <= 0.05 && dwell >= 0.38,
      JSON.stringify({
        readings: lineFrames.length,
        phases,
        travel: Number((highest - lowest).toFixed(2)),
        drift: Number(drift.toFixed(2)),
        sizeDrift: Number(sizeDrift.toFixed(3)),
        dwell: Number(dwell.toFixed(2)),
      }))
    // 交换四角那条：四颗球站成 45 : 55 的矩形；一圈四个四分之一圈——A 段一对对角换位、
    // B 段另一对，再各换回来，所以整圈走完每颗球回到原处。每颗球走的是一段椭圆弧：
    // 弧的中点离「起点到终点那条直线」有明显距离，不是被直线搬过去。
    const orbitFrames = (wait.orbitLane || { frames: [] }).frames || []
    const spot = (frame, dot) => ({ x: numbers(frame.translate[dot])[0], y: numbers(frame.translate[dot])[1] })
    const near = (one, two, allowance) => one !== undefined && two !== undefined &&
      Math.abs(one.x - two.x) <= allowance && Math.abs(one.y - two.y) <= allowance
    const shape = orbitFrames.length === 0 ? { width: 0, height: 0 } : (() => {
      const xs = [0, 1, 2, 3].map((dot) => spot(orbitFrames[0], dot).x)
      const ys = [0, 1, 2, 3].map((dot) => spot(orbitFrames[0], dot).y)
      return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
    })()
    const bow = orbitFrames.length < 11 ? 0 : (() => {
      const from = spot(orbitFrames[0], 0)
      const to = spot(orbitFrames[10], 0)
      const mid = spot(orbitFrames[5], 0)
      const length = Math.hypot(to.x - from.x, to.y - from.y)
      return length === 0 ? 0 : Math.abs((to.x - from.x) * (from.y - mid.y) - (from.x - mid.x) * (to.y - from.y)) / length
    })()
    const closes = orbitFrames.length > 60 &&
      [0, 1, 2, 3].every((dot) => near(spot(orbitFrames[60], dot), spot(orbitFrames[0], dot), 0.05))
    // 每段 400ms 走弧、随后 200ms 停住（= 0.5 倍那段用时），所以「刚走完」与「停顿结束」
    // 读出来是同一个位置。
    const dwells = [[10, 15], [25, 30], [40, 45], [55, 60]].every(([just, later]) =>
      [0, 1, 2, 3].every((dot) => near(spot(orbitFrames[just], dot), spot(orbitFrames[later], dot), 0.05)))
    check('交换四角那条：四颗球站成 45 : 55 的矩形，一圈里 A 段换一对对角、B 段换另一对、再各换回来，每颗走的是弧、走完停半段',
      orbitFrames.length > 60 && shape.height > 0 && Math.abs(shape.width / shape.height - 45 / 55) <= 0.06 &&
        near(spot(orbitFrames[10], 0), spot(orbitFrames[0], 2), 0.6) && near(spot(orbitFrames[10], 2), spot(orbitFrames[0], 0), 0.6) &&
        near(spot(orbitFrames[10], 1), spot(orbitFrames[0], 1), 0.05) && near(spot(orbitFrames[10], 3), spot(orbitFrames[0], 3), 0.05) &&
        near(spot(orbitFrames[25], 1), spot(orbitFrames[10], 3), 0.6) && near(spot(orbitFrames[25], 3), spot(orbitFrames[10], 1), 0.6) &&
        near(spot(orbitFrames[25], 0), spot(orbitFrames[10], 0), 0.05) && dwells && closes && bow >= 1,
      JSON.stringify({ readings: orbitFrames.length, shape, bow: Number(bow.toFixed(2)), closes, dwells }))
    // 轮换：一个动作站满 10 秒才换，换的是另一条轨道（不会换到自己）；交接一开始新的那条
    // 就在场，所以从那一帧算换。
    const rotation = (wait.rotation || []).filter((frame) => frame !== null && frame.loader !== null && frame.loader.motion !== null)
    const seen = rotation.map((frame) => ({ at: frame.at, motion: String(frame.loader.motion), loader: frame.loader }))
    const starts = seen.length === 0 ? [] : [0]
    for (let at = 1; at < seen.length; at += 1) if (seen[at].motion !== seen[at - 1].motion) starts.push(at)
    const motionOf = (at) => (String(seen[at].motion).match(/is-(bounce|line|orbit)/) || [])[1]
    const changes = starts.slice(1)
    // 换与换之间隔多久：只看相邻两次换之间的那一段，采样起点不算一次变化。
    const gaps = changes.slice(1).map((at, index) => seen[at].at - seen[changes[index]].at)
    const rotated = changes.map((at, index) => motionOf(at) !== motionOf(starts[index]))
    check('加载点每 10 秒换一条轨道，换的不会是正站着的那一条',
      changes.length >= 2 &&
        gaps.every((one) => one >= bound('loaderRotateGapMinMs') && one <= bound('loaderRotateGapMaxMs')) &&
        rotated.every((one) => one === true),
      JSON.stringify({ changes: changes.length, gaps: gaps.map((one) => Math.round(one)), motions: starts.map((at) => motionOf(at)) }))
    // 交接读第一次换到第二次换之间的那些帧，从换之前的最后一帧起：旧轨道的每颗球在自己
    // 静止的那一刻把位置交给新轨道里配对的那颗，新的那颗从原地出发走进自己的轨迹。所以框里
    // 每一帧都有三到四颗球，每颗刚露面的球都站在上一帧某颗球的位置上，交接完只剩新的那条。
    const laneShows = (frame, name, test) => {
      const opacity = laneOf(frame.loader, name).opacity || []
      return opacity.length > 0 && opacity.every(test)
    }
    const shown = (lane, dot) => (lane.opacity || [])[dot] > 0.5
    const inView = (frame) => (frame.loader.lanes || []).flatMap((lane) => (lane.spots || []).filter((_, dot) => shown(lane, dot)))
    const before = changes.length === 0 ? null : seen[changes[0] - 1]
    const comeLane = changes.length === 0 ? null : ['is-bounce', 'is-line', 'is-orbit'].find((name) => name === `is-${motionOf(changes[0])}`) ?? null
    const goneLane = before === null ? null : ['is-bounce', 'is-line', 'is-orbit'].find((name) => laneShows(before, name, (one) => one > 0.9)) ?? null
    const handing = changes.length < 2 ? [] : seen.slice(changes[0] - 1, changes[1])
    const settled = goneLane === null || comeLane === null ? null
      : handing.find((frame) => laneShows(frame, goneLane, (one) => one < 0.1) && laneShows(frame, comeLane, (one) => one > 0.9)) ?? null
    const counts = handing.map((frame) => inView(frame).length)
    const jumps = []
    for (let at = 1; at < handing.length; at += 1) {
      const earlier = inView(handing[at - 1])
      const lanesBefore = handing[at - 1].loader.lanes || []
      ;(handing[at].loader.lanes || []).forEach((lane, which) => {
        (lane.spots || []).forEach((spot, dot) => {
          if (!shown(lane, dot) || shown(lanesBefore[which] || {}, dot)) return
          const gap = Math.min(...earlier.map((one) => Math.hypot(one[0] - spot[0], one[1] - spot[1])))
          if (!(gap <= bound('loaderHandOverStepPx'))) jumps.push({ lane: lane.name, dot, gap: Number(gap.toFixed(2)) })
        })
      })
    }
    check('换轨道是一次形变：每颗新出现的球都从旧轨道某颗球所在的位置出发，框里每一帧都有三到四颗球，交接完只剩新的那条',
      goneLane !== null && comeLane !== null && goneLane !== comeLane && settled !== null && String(settled.motion).includes(comeLane) &&
        counts.length > 0 && counts.every((one) => one >= 3 && one <= 4) && jumps.length === 0,
      JSON.stringify({ gone: goneLane, come: comeLane, settled: settled === null ? null : settled.motion, fewest: Math.min(...counts), most: Math.max(...counts), jumps }))
    check('the DeepSeek brand keeps the host\'s whale tail, stands the skin\'s dots down and waits on the host\'s own word',
      wait.deepseek?.loader?.shown === false && wait.deepseek?.whaleShown === true && wait.deepseek?.word === 'Deep diving',
      JSON.stringify(wait.deepseek))
    check('the Claude brand takes the dots back and waits on the skin\'s own word',
      wait.claudeAgain?.loader?.shown === true && wait.claudeAgain?.whaleShown === false && wait.claudeAgain?.word === 'Thinking…',
      JSON.stringify(wait.claudeAgain))
    check('only the host words are marked and a third-party line stays visible before or after the waiting line mounts',
      working.wordsMarked === true && working.foreignShown === true && wait.foreignAfter?.foreignShown === true,
      JSON.stringify({ working, after: wait.foreignAfter }))
    check('the line says what the turn is doing, sweeping, with the turn\'s clock in the host\'s units',
      working.word === 'Thinking…' && working.sweep === BAND_ANIMATION && working.statusMotion === 'sweep' && /^1m [5-9]s$/.test(working.clock || ''),
      JSON.stringify(working))
    check('the band rides the copy holding the words, never the label (a first write and a reduced-motion one alike)',
      working.sweepOnLabel === false && wait.reduced?.sweepOnLabel === false,
      JSON.stringify({ working: working.sweepOnLabel, reduced: wait.reduced?.sweepOnLabel }))
    check('the Motion tab\'s other paint takes the line\'s words over: the copy runs the wash and its two loops, and the band returns when it is picked again',
      wait.wash?.statusMotion === 'wash' && wait.wash?.sweep === 'dsh-claude-wash-hue, dsh-claude-wash-drift' &&
        wait.sweepAgain?.statusMotion === 'sweep' && wait.sweepAgain?.sweep === BAND_ANIMATION,
      JSON.stringify({ wash: wait.wash, sweepAgain: wait.sweepAgain }))
    check('a model at work shows no overtime badge', working.badge === null, JSON.stringify(working))
    const silent = wait.silent || []
    const blurOf = (frame) => Number((/blur\(([\d.]+)px\)/.exec(frame.filter || '') || [])[1] || 0)
    const leaving = silent.filter((frame) => frame.phase === 'exit')
    const last = silent[silent.length - 1] || {}
    check('the old wording leaves upward with a blur: the leave pose is set, its opacity falls and its glyphs blur',
      leaving.length > 2 && leaving.every((frame) => frame.displayed === 'Running tools…') &&
        Number(leaving[0].opacity) > 0.5 && Number(leaving[leaving.length - 1].opacity) < 0.1 &&
        leaving.some((frame) => blurOf(frame) > 0.5),
      JSON.stringify({ frames: silent.length, leaving: leaving.map((frame) => [frame.opacity, frame.filter]) }))
    // Every frame holding both copies is a frame the leaving one is still in the
    // box for: while it fades it is the copy the reading is taken off, so a swap
    // that only starts the arriving copy once the leaving one has gone shows the
    // leave's own frames alone and never both at a readable opacity.
    const overlap = silent.filter((frame) => frame.copies > 1)
    check('the two halves overlap: both copies stand in the box across the leaving one\'s whole fade, and the band keeps sweeping throughout',
      overlap.length > 2 && overlap.some((frame) => Number(frame.opacity) > 0.3) && overlap.some((frame) => Number(frame.opacity) < 0.3) &&
        silent.every((frame) => frame.sweep === BAND_ANIMATION),
      JSON.stringify({ overlapping: overlap.length, opacities: overlap.map((frame) => frame.opacity), sweepOff: silent.filter((frame) => frame.sweep !== BAND_ANIMATION).length }))
    const enter = wait.enterFrames || []
    check('the wording arriving rises from below through a blur, its opacity climbing to rest',
      enter.some((frame) => frame.opacity > 0.05 && frame.opacity < 0.95) && enter[0].opacity < 0.5 && blurOf(enter[0]) > 0.5 &&
        Number(enter[enter.length - 1].opacity) > 0.9 && blurOf(enter[enter.length - 1]) < 0.5 &&
        enter.every((frame, at) => at === 0 || frame.opacity >= enter[at - 1].opacity - 0.01),
      JSON.stringify(enter))
    const boxes = silent.map((frame) => frame.box)
    // The wording this swap reaches is the shorter of the two, so the box comes
    // down where the other swap of this case went up: what is asserted is the
    // one move and the direction it holds, not the sign of it.
    const travelled = boxes[boxes.length - 1].width - boxes[0].width
    const toward = travelled < 0 ? -1 : 1
    // A sizer's subpixel measurement can move the box by 1/64px before the
    // real travel. That is not a direction change; the total displacement and
    // every visible step still have to go the wording's way.
    const MEASURE_EPSILON_PX = 1 / 64
    check('the box the swap runs in never reads as empty, holds its height, and moves the clock only where the words themselves changed',
      boxes.length > 4 &&
        boxes.every((box) => box.width > 0 && box.height === boxes[0].height) &&
        boxes.every((box, at) => at === 0 || (toward * (box.width - boxes[at - 1].width) >= -MEASURE_EPSILON_PX && toward * (box.clockLeft - boxes[at - 1].clockLeft) >= -MEASURE_EPSILON_PX)) &&
        boxes[boxes.length - 1].clockLeft - boxes[0].clockLeft === travelled,
      JSON.stringify({ first: boxes[0], last: boxes[boxes.length - 1], widths: boxes.map((box) => box.width), heights: boxes.map((box) => box.height), clockLefts: boxes.map((box) => box.clockLeft) }))
    // The width is travelled rather than written (shared/swapping-text.ts pins
    // the box and writes the width it heads for): on this 25 ms grid the clock's
    // displacement comes in many small steps, where a width written in one task
    // moves it the whole way inside one frame.
    const steps = boxes.map((box, at) => at === 0 ? 0 : toward * (box.width - boxes[at - 1].width)).filter((step) => step > 0)
    check('the box takes its new width in one move, so the clock slides with it instead of jumping',
      Math.abs(travelled) > 4 && steps.length >= 3 && Math.max(...steps) < Math.abs(travelled) / 2,
      JSON.stringify({ steps: steps.length, largest: steps.length === 0 ? 0 : Math.max(...steps), travelled }))
    check('the new wording is the one left standing once the copy that left is taken down',
      silent[0].displayed === 'Running tools…' && silent[0].copies === 1 && silent[0].phase === null &&
        Number(last.opacity) === 1 && last.copies === 1 && last.word === 'Thinking…',
      JSON.stringify({ first: [silent[0].displayed, silent[0].copies, silent[0].phase], rest: [last.opacity, last.filter, last.copies, last.word] }))
    check('a wait nothing can be read from stands on the word the brand says while the model thinks, not a second word of its own',
      last.word === working.word, JSON.stringify({ silent: last.word, working: working.word }))
    check('a model silent past ten seconds shows the overtime badge', last.badge === 'No response yet', JSON.stringify(last))
    const tools = wait.tools || {}
    check('a tool call in flight is named as such',
      tools.word === 'Running tools…' && tools.badge === null, JSON.stringify(tools))
    const fileCall = wait.fileCall || {}
    check('a call that has its arguments names the file it works on',
      fileCall.word === 'Reading app.js', JSON.stringify(fileCall))
    const arriving = wait.arriving || {}
    check('a call whose arguments are still arriving keeps the plain tool state',
      arriving.word === 'Running tools…', JSON.stringify(arriving))
    const phrase = wait.phrase || {}
    check('reasoning the line can take words from says the model\'s own clause',
      phrase.word === 'Checking the file is true' && phrase.copies === 1, JSON.stringify(phrase))
    const clauseHeld = wait.clauseHeld || {}
    check('从句在下一次意图到达之前一直站着，中间不退回等待词',
      clauseHeld.word === 'Checking the file is true', JSON.stringify(clauseHeld))
    const narrow = wait.narrow || {}
    check('a wording with no room is carried whole and clipped where the row ends, and the clock stays on the row',
      narrow.box?.clipped === true && narrow.box.labelRight <= narrow.box.lineRight + 1 &&
        narrow.box.clockLeft < narrow.box.rowRight && narrow.box.clockRight <= narrow.box.rowRight + 1 &&
        narrow.word === 'Checking whether the whole row model still reads the same arguments',
      JSON.stringify({ word: narrow.word, box: narrow.box }))
    const dotName = wait.dotName || {}
    check('the dot inside a file name does not end the sentence: the clause carries the whole name',
      dotName.word === 'Reading app.js now', JSON.stringify(dotName))
    const reduced = wait.reduced || {}
    check('with the animation choice set to Reduced the new wording is written at once, with no swap',
      reduced.word === 'Checking the row now' && reduced.phase === null && reduced.copies === 1 && reduced.displayed === 'Checking the row now',
      JSON.stringify(reduced))
    const reducedHeld = wait.reducedHeld || {}
    check('句子不带自己的从句时，站着的那句在该选择下也留在原处',
      reducedHeld.word === 'Checking the row now' && reducedHeld.copies === 1, JSON.stringify(reducedHeld))
    // Reduced presses every skin animation to a hundredth of a millisecond but
    // leaves its iteration count alone, so an animation left running strobes
    // instead of settling: the loader's dots have to be held, and the words'
    // own paint is already either left out under the choice or held by
    // shared/motion.css. Two readings a tenth of a second apart say so.
    const still = wait.reducedStill || {}
    const held = (reading) => reading !== null && reading !== undefined && reading.loader !== undefined &&
      (reading.sweep === 'none' || reading.sweepState === 'paused')
    const stillSame = (one, two) => one !== undefined && one !== null && two !== undefined && two !== null &&
      one.loader !== undefined && two.loader !== undefined &&
      one.loader.translate === two.loader.translate && one.loader.scale === two.loader.scale &&
      held(one) && held(two)
    check('「减弱」时加载点的球停在一个帧上、字上的画法也停住：相隔十分之一秒的两次读数一致',
      stillSame(still.first, still.second),
      JSON.stringify({ first: { loader: still.first?.loader, sweep: still.first?.sweep, sweepState: still.first?.sweepState }, second: { loader: still.second?.loader, sweep: still.second?.sweep, sweepState: still.second?.sweepState } }))
    check('words that settle shorter take the box down with them, so the clock sits right after them',
      reduced.box?.sizer?.text === reduced.word && reduced.box.width === reduced.box.sizer.width &&
        reduced.box.clockLeft - reduced.box.labelLeft - reduced.box.width <= 10,
      JSON.stringify({ word: reduced.word, box: reduced.box }))
    const off = wait.off || {}
    check('a holding row — the slot the host keeps after the turn stops — takes the line back, and a live row gets it again',
      wait.holding.line === false && wait.holding.marked === false &&
        wait.holdingReleased.line === true && wait.holdingReleased.marked === true,
      JSON.stringify({ holding: wait.holding, released: wait.holdingReleased }))
    check('switching the chat-area animations off takes the line down and gives the host\'s words back',
      off.line === false && off.marked === false && off.wordsShown === true && off.wordsMarked === false && off.foreignShown === true,
      JSON.stringify(off))
    // 钉住状态行的是聊天区跟随自己的规则：跟随关掉后宿主自己管位置，这一行留在
    // 文档里随内容走，再打开又钉回输入框上方。
    const pin = wait.pin || {}
    check('状态行的钉住随聊天区跟随的开关：跟随关掉后行留在文档里，再打开又钉回去',
      pin.on?.follow === true && pin.on?.pinned === true &&
        pin.off?.follow === false && pin.off?.pinned === false &&
        pin.back?.follow === true && pin.back?.pinned === true,
      JSON.stringify(pin))
    check('后排入的用户消息或提问卡让状态行回到文档流，行下遮罩同时退场',
      pin.afterMessage?.pinned === false && pin.afterMessage?.mask === null &&
        pin.afterQuestion?.pinned === false && pin.afterQuestion?.mask === null,
      JSON.stringify(pin))
    // 钉住的行把脚下的画布一直铺到输入框顶，宿主在行下沿留出的那条缝里
    // 就不会露出滑动中的正文（chat-wait.css）。
    check('状态行钉住时行下的画布铺到输入框顶，跟随关掉后这块画布随之退场',
      pin.on?.mask?.position === 'absolute' && pin.on.mask.background === pin.on.mask.ink &&
        Number.parseFloat(pin.on.mask.height) >= 17 &&
        pin.off?.mask === null &&
        pin.back?.mask?.position === 'absolute' && pin.back.mask.background === pin.back.mask.ink,
      JSON.stringify(pin))
    const replaced = wait.replaced || {}
    check('replacing the host words transfers their hiding marker without hiding the third-party line',
      replaced.previousMarked === false && replaced.current?.wordsMarked === true && replaced.current?.wordsShown === false &&
        replaced.current?.foreignShown === true, JSON.stringify(replaced))
    check('a running row leaving removes its host words marker', wait.removed?.wordsMarked === false, JSON.stringify(wait.removed))
    for (const name of ['takeover', 'visibleReplacement', 'existingOwner']) {
      const owner = wait[name] || {}
      check(`a visible replacement owns the waiting words (${name}) without disabling the other chat animations`,
        owner.line === false && owner.marked === false && owner.wordsMarked === false &&
          owner.externalHiding === 'none' && owner.foreignShown === true && owner.follow === true,
        JSON.stringify(owner))
    }
    for (const name of ['hiddenReplacement', 'hostRestored', 'ownerRemoved']) {
      const owner = wait[name] || {}
      check(`the waiting line returns when the replacement stops owning the words (${name})`,
        owner.line === true && owner.marked === true && owner.wordsMarked === true, JSON.stringify(owner))
    }
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
    // The plate the flight is drawn on (send-morph.ts): the bubble's own fill as
    // the screen paints it, on the shape, from the first frame — with nothing
    // light left over the destination once it gets there.
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
    check('the animation choice reaches it too: Reduced flies nothing and leaves the row visible (D40)',
      sendReduced.ghost === false && sendReduced.hidden === false && sendReduced.visibility === 'visible',
      JSON.stringify(sendReduced))
    // The row's own entrance (send-grow.ts, the Motion tab's other card): the
    // echo waits hidden, no stand-in goes up, and the row that takes the echo's
    // place is marked with the growth the stylesheet hangs off it.
    const grow = send.grow || {}
    check('the other entrance flies nothing: the echo waits hidden and no stand-in goes up',
      grow.waiting === true && grow.ghost === false, JSON.stringify(grow))
    check('the row that takes the echo\'s place grows about its own bottom-right corner, and can be seen from the first frame',
      grow.marked === true && grow.animation === 'dsh-claude-enter-grow' && grow.duration !== '0s' && grow.visibility === 'visible' &&
        grow.grownLeft > 2 && grow.grownLeft + grow.grownTop > 4 * (grow.grownRight + grow.grownBottom),
      JSON.stringify(grow))
  },
}
