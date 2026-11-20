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
    if (readings[at] !== readings[at - 1] && readings[at] > endPx && readings[at] < from) steps.push({ at, gap: readings[at - 1] - readings[at] })
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
    // walk checks below is that the position got there by walking. The two walks
    // are the page's own recordings of their frames (smoke/probe/chat-follow.js).
    const AT_END_PX = bound('followAtEndPx')
    // A position above the end is where the reader reads: the host restores a
    // saved position inside the last screen when the reader returns to a
    // conversation, and the hand-back stands the follow up only from the end
    // (scroll-owner.ts's handBackFollow, D40, D95).
    check('a structural moment leaves a position above the end where the reader left it',
      follow.before === 60 && follow.after === 60,
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
    // writes stands, and the column slides the growth to rest (chat-follow.ts, D95).
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
    // The slide runs for its own 240ms; how many of its positions the probe can
    // read follows the machine's frame cadence, and a loaded one leaves two
    // sampled steps. What a jump would leave is one step covering the whole
    // carried stretch, so the check asks for at least two steps and no step
    // near the whole distance.
    check('a burst is slid from the stretch a slide carries instead of jumping whole',
      burst.length >= bound('followSlideMinFrames') && burst[0] > bound('followSlideStartPx') &&
        burst.every((offset, at) => at === 0 || offset <= burst[at - 1]) && burst[burst.length - 1] <= AT_END_PX &&
        // A jump leaves no distinct intermediate reading and covers the whole
        // distance in one step; a slide leaves one and never covers it whole.
        burstSteps.length >= 1 && Math.max(...burstSteps.map((step) => step.gap)) < burst[0] * 9 / 10,
      JSON.stringify({ readings: burst.length, start: burst[0], end: burst[burst.length - 1], steps: burstSteps.map((step) => step.gap) }))
    // The slide restarts from where the frame before it stood, and one growth is
    // all the distance it may be left carrying, the tail of the slide still
    // running when the next piece lands aside: a run of small growths, each
    // arriving before the slide has landed, stays inside the growth it just took
    // — the offset the column is drawn at, not the scroller's own gap, which the
    // host's pin keeps at zero either way — and the run is never left standing
    // once it stops (chat-follow.ts's slideDuration, D95).
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
    check('the summary hides the host\'s extra tool status and keeps the assistant answer visible',
      summary.toolStatusShown === false && summary.answerShown === true, JSON.stringify(summary))
    check('the summary sweeps while the section runs: the host\'s band crosses a copy of its figures',
      summary.running === true && summary.band?.animation === BAND_ANIMATION &&
        summary.band?.text === summary.text && summary.band?.rolling === false,
      JSON.stringify(summary))
    check('scroll hit testing over the summary returns the clickable header and skips its decoration',
      fold.summaryHit?.header === true && fold.summaryHit?.decoration === false, JSON.stringify(fold.summaryHit))
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
    check('a reasoning shorter than the cap stands in a window exactly as tall as the text, its newest line rising through the bottom fade',
      grow.length === 4 &&
        grow.slice(0, 2).every((frame) => frame.on === true && frame.capped === false && frame.offset === 0 && frame.mask.startsWith('linear-gradient') && frame.slotHeight === frame.textHeight && frame.textHeight < 400) &&
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
    // The switch covers the door and the entrance fade as well (D76/D74).
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
    const shipped = reveal.shipped || []
    const opening = reveal.opening || []
    const grown = reveal.grown || []
    const settled = reveal.settled || {}
    const off = reveal.off || {}
    const back = reveal.back || {}
    const reduced = reveal.reduced || {}
    check('the fade ships on: a streaming container carries the mark and its characters are registered as step highlights before the choice is touched',
      shipped.some((frame) => frame.mark === true && frame.total > 0 && frame.steps > 0), JSON.stringify(shipped.slice(0, 4)))
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
