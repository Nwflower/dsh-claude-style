/**
 * The chat-wait case: the live turn's running row takes the skin's line — the
 * host's words, the turn's clock and, once the model is silent, the overtime
 * badge — and gives the host's words back when the choice is switched off.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var r = probe.report

  probe.step(async function () {
    // The host's running row (ui-chat ChatView's RunningStatus): its live
    // region, a divider, and a content span holding the whale and its words.
    // The fixture's running turn started 65 s ago and is still reasoning.
    await probe.onlyFor(['chat-wait'], async function () {
      // The running row stands in the host's conversation anchor, where the
      // skin reads its chat parts (D3). The content span carries the host's own
      // local class name, so the pass writes `running-content` onto it: that
      // part is what bounds the line to the row (chat-wait.css).
      var waitHolder = document.createElement('div')
      waitHolder.setAttribute('data-conversation-scroll', '')
      var waitSession = document.createElement('div')
      waitSession.setAttribute('data-conversation-session', 'smoke-session')
      waitSession.innerHTML = '<div data-chat-flow="">' +
        '<div data-chat-running="true" style="display:flex"><span role="status">Deep diving</span><span aria-hidden="true"></span>' +
        '<span class="_runningContent_c_1" style="display:flex;min-width:0"><span class="_runningIcon_c_1" aria-hidden="true">whale</span><span data-shimmer="true" id="debugRunningWords">Deep diving for 1m 5s ···</span></span></div>' +
        '</div>'
      waitHolder.appendChild(waitSession)
      document.body.appendChild(waitHolder)
      var row = waitSession.querySelector('[data-chat-running]')
      var words = document.getElementById('debugRunningWords')
      // The parts land on the pass after the subtree arrives (D3).
      var icons = await probe.until(function () { return row.querySelector('[data-dsh-claude-part~="running-icon"]') },
        function (found) { return found[found.length - 1] !== null }, 'the running icon part')
      var whale = icons[icons.length - 1]
      var foreignLine = document.createElement('div')
      foreignLine.textContent = 'Third-party status'
      words.parentElement.appendChild(foreignLine)
      // The paint one copy wears: the host's band (shared/sweep-band.ts) is a
      // child the copy carries, drawn only under the sweep, and its two halves
      // run one animation each; the wash rides the copy's pseudo-element.
      var paintOf = function (copy) {
        var band = copy.querySelector('.dsh-claude-sweep-band')
        if (band !== null && getComputedStyle(band).display !== 'none') {
          var held = getComputedStyle(band)
          var glyphs = getComputedStyle(band.firstElementChild)
          return { name: held.animationName + ', ' + glyphs.animationName, state: held.animationPlayState }
        }
        var paint = getComputedStyle(copy, '::before')
        return { name: paint.animationName, state: paint.animationPlayState }
      }
      var lineOf = function () {
        var line = row.querySelector('.dsh-claude-chat-wait')
        if (line === null) return null
        // The line's parts are read by their own names rather than by position:
        // the loader leads them, and where each of the rest sits is the
        // stylesheet's business (chat-wait.css).
        var loader = line.querySelector('.dsh-claude-chat-wait-loader')
        var label = line.querySelector('.dsh-claude-chat-wait-label')
        var clock = line.querySelector('.dsh-claude-chat-wait-clock')
        var badge = line.querySelector('.dsh-claude-chat-wait-badge')
        // The words swap over two copies (shared/swapping-text.ts): the one
        // leaving keeps the words it came with, the one arriving carries the
        // new ones, and the reading below is taken off whichever of them is
        // moving — the label itself only holds them.
        var copies = label.querySelectorAll('.dsh-claude-swap-copy')
        var leaving = label.querySelector('.dsh-claude-swap-copy.is-exit')
        var entering = label.querySelector('.dsh-claude-swap-copy.is-enter-start')
        // The copy the line is heading for: while a swap runs that is the one
        // arriving (its rest pose is the reading the entry is judged on), and
        // at rest it is the only copy there is.
        var moving = leaving !== null ? leaving : copies[copies.length - 1]
        var movingStyle = moving === undefined ? null : getComputedStyle(moving)
        // The words standing: the single copy once a swap has settled, the
        // label's own text before any swap, and the words being handed over to
        // (the helper's token) while one runs. The label's textContent joins
        // both copies mid-swap, so it is never the reading.
        var settled = copies.length === 1 && leaving === null && entering === null
        return {
          marked: row.hasAttribute('data-dsh-claude-wait'),
          besideWords: line.previousElementSibling === words,
          word: copies.length === 0 ? label.textContent : (settled ? copies[0].textContent : (label.dataset.text || '')),
          copies: copies.length,
          phase: leaving !== null ? 'exit' : (entering !== null ? 'enter' : null),
          displayed: moving === undefined ? null : moving.textContent,
          // The paint rides the copy showing the words — never the label, whose
          // box stands taller by the swap's travel — so the reading is taken
          // off the last copy (the one arriving while a swap runs). Which paint
          // that is comes from the Motion tab's choice, read here off the
          // document as well so a name and a choice that disagree are caught:
          // the band's two halves while the band is drawn, the wash's
          // pseudo-element otherwise.
          sweep: copies.length > 0 ? paintOf(copies[copies.length - 1]).name : 'none',
          // Whether that paint is running or held: the Reduced choice freezes
          // it, and a pressed animation left running would flicker.
          sweepState: copies.length > 0 ? paintOf(copies[copies.length - 1]).state : 'none',
          statusMotion: document.body.getAttribute('data-dsh-claude-status-motion'),
          sweepOnLabel: label.classList.contains('dsh-claude-swap-shimmer'),
          filter: movingStyle === null ? 'none' : movingStyle.filter,
          opacity: movingStyle === null ? '1' : movingStyle.opacity,
          clock: clock.hidden ? null : clock.textContent,
          badge: badge.hidden ? null : badge.textContent,
          // The loader the Claude brand leads the line with, and the host's own
          // whale tail it stands in for: three lanes of dots in the accent in
          // force, one lane for each motion, of which the lane in play is drawn
          // and the others wait out of the page
          // (features/chat-wait/wait-loader.ts). A change between the motions
          // hands each dot of one lane to a dot of the other at its own moment,
          // so both lanes are read whole — their opacities, the poses their
          // motions stand them at, where each dot stands in the loader's own
          // pixels, and their own starts — and the animation beside them is the
          // one the lane in play runs.
          loader: (function () {
            var lanes = Array.from(loader.children).map(function (lane) {
              var laneDots = Array.from(lane.children)
              return {
                name: lane.className,
                opacity: laneDots.map(function (one) { return Number(getComputedStyle(one).opacity) }),
                translate: laneDots.map(function (one) { return getComputedStyle(one).translate }),
                spots: laneDots.map(function (one) {
                  var moved = getComputedStyle(one).translate
                  var by = moved === 'none' ? [] : moved.split(' ').map(parseFloat)
                  return [one.offsetLeft + one.offsetWidth / 2 + (by[0] || 0), one.offsetTop + one.offsetHeight + (by[1] || 0)]
                }),
                scale: laneDots.map(function (one) { return getComputedStyle(one).scale }),
                delays: laneDots.map(function (one) { return getComputedStyle(one).animationDelay }),
                animation: laneDots.length === 0 ? null : getComputedStyle(laneDots[0]).animationName,
              }
            })
            var playing = loader.querySelector('.dsh-claude-chat-wait-lane.is-active')
            var playingDots = playing === null ? [] : Array.from(playing.children)
            var playingStyle = playingDots.length === 0 ? null : getComputedStyle(playingDots[0])
            return {
              shown: getComputedStyle(loader).display !== 'none',
              lanes: lanes,
              motion: playing === null ? null : playing.className,
              animation: playingStyle === null ? null : playingStyle.animationName,
              duration: playingStyle === null ? null : playingStyle.animationDuration,
              delay: playingDots.length < 3 ? null : getComputedStyle(playingDots[2]).animationDelay,
              background: playingStyle === null ? null : playingStyle.backgroundColor,
              shadow: playingStyle === null ? null : playingStyle.boxShadow,
              translate: playingStyle === null ? null : playingStyle.translate,
              scale: playingStyle === null ? null : playingStyle.scale,
              // Each dot's own start in its motion: the phase a dot stands at,
              // which is what tells two dots doing the same walk apart.
              delays: playingDots.map(function (one) { return getComputedStyle(one).animationDelay }),
            }
          })(),
          whaleShown: getComputedStyle(whale).display !== 'none',
          // The box the swap runs in, and where the clock beside it sits: the
          // hidden sizer holds the wider half while words change, so neither may
          // move during a swap, and comes down onto the words standing once they
          // settle — the clock then sits right after them (shared/swapping-text.ts).
          // Positions and widths share the browser's fractional coordinate space:
          // rounding them independently changes their relative displacement.
          box: {
            width: label.getBoundingClientRect().width,
            height: label.getBoundingClientRect().height,
            clockLeft: clock.getBoundingClientRect().left,
            // The clock's own right edge: the line gives way inside the row, and
            // the clock and the badge keep their places at its end (chat-wait.css).
            clockRight: clock.getBoundingClientRect().right,
            labelLeft: label.getBoundingClientRect().left,
            lineLeft: line.getBoundingClientRect().left,
            lineWidth: line.getBoundingClientRect().width,
            lineRight: line.getBoundingClientRect().right,
            rowRight: row.getBoundingClientRect().right,
            labelRight: label.getBoundingClientRect().right,
            // A wording longer than the label's box: the box clips it and the
            // copy draws an ellipsis (shared/swapping-text.css).
            clipped: (function () {
              var copy = label.querySelector('.dsh-claude-swap-copy')
              if (copy === null) return null
              return copy.scrollWidth > copy.clientWidth && getComputedStyle(copy).textOverflow === 'ellipsis'
            })(),
            sizer: (function () {
              var sizer = label.querySelector('.dsh-claude-swap-sizer')
              return sizer === null ? null : { text: sizer.textContent, width: sizer.getBoundingClientRect().width }
            })(),
            firstChildClass: label.firstElementChild === null ? null : label.firstElementChild.className,
          },
          wordsShown: getComputedStyle(words).display !== 'none',
          wordsMarked: words.hasAttribute('data-dsh-claude-wait-words'),
          foreignShown: getComputedStyle(foreignLine).display !== 'none',
        }
      }
      // A wording written stands a whole second (WORD_LOCK_MS), so a reading of
      // a state the fixture has just moved to is recorded on every frame until
      // the line reaches it: the lock, the swap after it and the state before it
      // all land at different moments. Every frame of the way is answered, so a
      // swap is read whole whenever it lands.
      var framesToWord = function (want, what) {
        return probe.until(lineOf, function (frames) {
          var reading = frames[frames.length - 1]
          return reading !== null && want(reading)
        }, what)
      }
      var awaitWord = async function (want, what) {
        var frames = await framesToWord(want, what || 'the line reaching its wording')
        return frames[frames.length - 1]
      }
      r.wait = { working: await awaitWord(function (reading) { return reading.word === 'Thinking…' && reading.copies === 1 }) }
      // The whale tail is DeepSeek's own character: under that brand the host's
      // icon comes back and the skin's dots stand down, and the Claude brand
      // takes them up again. The word the line waits on follows the brand too
      // (shared/turn-activity): the skin's own under Claude, and the host's own
      // — the one the host's own interface shows — under DeepSeek.
      window.__pushForm({ brand: 'deepseek' })
      r.wait.deepseek = await awaitWord(function (reading) { return reading.word === 'Deep diving' && reading.copies === 1 })
      window.__pushForm({ brand: 'claude' })
      r.wait.claudeAgain = await awaitWord(function (reading) { return reading.word === 'Thinking…' && reading.copies === 1 })
      foreignLine.remove()
      words.parentElement.appendChild(foreignLine)
      await probe.settle()
      r.wait.foreignAfter = lineOf()
      // One lane's motion read off the animation itself: a lane's dots run the
      // same clock, so stepping that clock through a whole turn — all of them
      // together, which keeps their own phases — reads the motion's own curve
      // rather than what the display happened to render, at even steps with no
      // frame timing in them. The lane is put in play for the reading (the
      // loader's own choice is put back afterwards, and the next rotation puts
      // every lane back in its place anyway).
      var watchLane = async function (laneName, rounds, step) {
        var line = row.querySelector('.dsh-claude-chat-wait')
        var loader = line === null ? null : line.querySelector('.dsh-claude-chat-wait-loader')
        var lane = loader === null ? null : loader.querySelector('.dsh-claude-chat-wait-lane.' + laneName)
        if (lane === null) return null
        var lanes = Array.prototype.slice.call(loader.children)
        var saved = lanes.map(function (one) { return one.className })
        lanes.forEach(function (one) { one.classList.remove('is-active', 'is-leaving', 'is-resting') })
        lane.classList.add('is-active')
        var dots = Array.prototype.slice.call(lane.children)
        var running = dots.map(function (dot) { return dot.getAnimations()[0] })
        var read = function () {
          return dots.map(function (dot) { return getComputedStyle(dot) })
        }
        if (running.some(function (animation) { return animation === undefined })) {
          lanes.forEach(function (one, at) { one.className = saved[at] })
          return null
        }
        var stood = running[0].currentTime
        var began = performance.now()
        var frames = []
        for (var round = 0; round < rounds; round += 1) {
          var at = round * step
          running.forEach(function (animation) { animation.currentTime = at })
          var styles = read()
          frames.push({
            at: at,
            translate: styles.map(function (style) { return style.translate }),
            scale: styles.map(function (style) { return style.scale }),
            opacity: styles.map(function (style) { return Number(style.opacity) }),
            delays: styles.map(function (style) { return style.animationDelay }),
            animation: styles[0].animationName,
            duration: styles[0].animationDuration,
          })
        }
        running.forEach(function (animation) { animation.currentTime = stood + (performance.now() - began) })
        lanes.forEach(function (one, at) { one.className = saved[at] })
        return { step: step, frames: frames }
      }
      // The rotation: the loader opens on one motion and takes up another every
      // ten seconds, never the one already standing. Its length is the
      // product's own (D87: a duration that is the behaviour), so every frame is
      // recorded with its moment until two changes have landed: the stretch one
      // motion stood and the hand-over between two of them are both read off it.
      // The lane arriving comes into play the moment a hand-over begins, so a
      // change is counted then.
      var watchRotation = function () {
        return probe.until(function () {
          var reading = lineOf()
          return { at: performance.now(), loader: reading === null ? null : reading.loader }
        }, function (frames) {
          var changes = 0
          var standing = null
          frames.forEach(function (frame) {
            if (frame.loader === null || frame.loader.motion === null) return
            if (standing !== null && standing !== frame.loader.motion) changes += 1
            standing = frame.loader.motion
          })
          return changes >= 2
        }, 'two changes of the loader rotation', 25000)
      }
      // A tool call in flight is a state of its own, with no block streaming.
      window.__dshSmokeHost.turnFixtureRunning.steps = [{ data: { get: function (kind) { return kind === 'assistant-step' ? { status: 'settled', step: 1, blocks: [{ kind: 'reasoning' }, { kind: 'tool-call' }] } : undefined } } }]
      var calls = window.__dshSmokeHost.turnFixtureCalls
      calls.push({ turn: 2 })
      r.wait.tools = await awaitWord(function (reading) { return reading.word === 'Running tools…' && reading.copies === 1 })
      // Each lane's own motion, one at a time: the hopping wave reads a whole
      // bounce, the walk a whole period, the corner swap a whole turn.
      r.wait.bounceLane = await watchLane('is-bounce', 40, 25)
      r.wait.lineLane = await watchLane('is-line', 50, 25)
      r.wait.orbitLane = await watchLane('is-orbit', 61, 40)
      // And the rotation itself: long enough for two changes to land, so the
      // stretch between two of them can be timed.
      r.wait.rotation = await watchRotation()
      // A call that has its arguments names the file it works on; one whose
      // arguments are still arriving names nothing yet.
      calls[0] = { turn: 2, phase: 'start', name: 'read', argsRaw: JSON.stringify({ file_path: 'C:\\work\\app.js' }) }
      r.wait.fileCall = await awaitWord(function (reading) { return reading.word === 'Reading app.js' && reading.copies === 1 })
      calls[0] = { turn: 2, phase: 'preparing', name: 'read', argsRaw: '{"file_path":"C:\\\\work\\\\app' }
      r.wait.arriving = await awaitWord(function (reading) { return reading.word === 'Running tools…' && reading.copies === 1 })
      // The model goes silent: the running turn has written nothing and no call
      // is in flight, so the line stands on the word its brand waits on — the
      // same word it says while the model is thinking. The two halves of the
      // swap that reaches it travel together: the old one leaves upward with a
      // blur while the new one stands parked below and is released one gap
      // later. Every frame from here until the swap has landed is recorded, the
      // line whole and the entering copy on its own (the one whose `data-text`
      // names the word), however long the lock written a moment ago holds it.
      var enterFrames = []
      calls.length = 0
      window.__dshSmokeHost.turnFixtureRunning.steps = []
      r.wait.silent = await framesToWord(function (reading) {
        var label = row.querySelector('.dsh-claude-chat-wait-label')
        var copy = label === null ? null : label.querySelector('.dsh-claude-swap-copy[data-text="Thinking…"]')
        if (copy !== null) {
          var style = getComputedStyle(copy)
          enterFrames.push({ opacity: Number(style.opacity), filter: style.filter, transform: style.transform })
        }
        return reading.word === 'Thinking…' && reading.copies === 1 && reading.phase === null
      }, 'the swap to the silent wording')
      // The box takes the arriving width after the words have landed, and the
      // clock slides with it: the frames run on until the page settles.
      r.wait.silent = r.wait.silent.concat(await probe.watch(lineOf))
      r.wait.enterFrames = enterFrames
      // The reasoning this case's turn streams, one wording at a time: the line
      // reads it off the session's snapshot (shared/turn-activity).
      var reason = function (text) {
        window.__dshSmokeHost.turnFixtureRunning.steps = [{ data: { get: function (kind) { return kind === 'assistant-step' ? { status: 'running', step: 2, blocks: [{ kind: 'reasoning', text: text }] } : undefined } } }]
      }
      // Reasoning the line can take words from: the model's own clause, the
      // participle first, up to the sentence's end.
      reason('Let me look. I am checking the file is true. ')
      r.wait.phrase = await awaitWord(function (reading) { return reading.word === 'Checking the file is true' && reading.copies === 1 })
      // A sentence carrying no clause of its own does not put the waiting word
      // back: the clause stands until the next intent arrives (wait-state.ts).
      reason('The user asked about the row. ')
      await probe.settle()
      r.wait.clauseHeld = lineOf()
      // The same kind of wording in a row with no room for it: the label gives
      // way and the words are clipped, so the clock keeps its place on the row.
      // The clause is carried whole — how much of it shows is the row's own
      // width (shared/activity-phrase) — so the reading is the whole clause with
      // the copy drawing its ellipsis.
      reason('I am checking whether the whole row model still reads the same arguments. ')
      waitSession.style.maxWidth = '240px'
      r.wait.narrow = await awaitWord(function (reading) { return reading.word === 'Checking whether the whole row model still reads the same arguments' && reading.copies === 1 })
      waitSession.style.maxWidth = ''
      // Where a sentence ends is the page's own sentence rules (shared/activity-phrase):
      // the dot inside a file name does not end one, so the clause carries the
      // whole name rather than the piece before its extension.
      reason('I am reading app.js now. ')
      r.wait.dotName = await awaitWord(function (reading) { return reading.word === 'Reading app.js now' && reading.copies === 1 })
      // The reader's animation choice: reduced writes the new wording at once.
      window.__pushForm({ motion: 'reduced' })
      await probe.settle()
      reason('I am checking the row now. ')
      r.wait.reduced = await awaitWord(function (reading) { return reading.word === 'Checking the row now' && reading.copies === 1 && reading.phase === null })
      // A sentence with no clause of its own leaves the one standing in place
      // under that choice too: what the line reads is what arrives, and nothing
      // arrives here (wait-state.ts).
      reason('先看清工作区。')
      await probe.settle()
      r.wait.reducedHeld = lineOf()
      // The dots under that choice: read on every frame until the page settles,
      // so a motion that never stops shows up as the first and last readings
      // differing.
      var stillFrames = await probe.watch(lineOf)
      r.wait.reducedStill = { first: stillFrames[0], second: stillFrames[stillFrames.length - 1] }
      window.__pushForm({ motion: 'system' })
      await probe.settle()
      // The Motion tab's second paint: the words take the colour wash and its
      // two loops instead of the band, and picking the band again hands them
      // back. The choice is one document attribute, so a reading once the page
      // has settled is the whole paint.
      window.__pushForm({ statusMotion: 'wash' })
      await probe.settle()
      r.wait.wash = lineOf()
      window.__pushForm({ statusMotion: 'sweep' })
      await probe.settle()
      r.wait.sweepAgain = lineOf()
      var previousWords = words
      words = document.createElement('span')
      words.setAttribute('data-shimmer', 'true')
      words.textContent = previousWords.textContent
      previousWords.replaceWith(words)
      await probe.settle()
      r.wait.replaced = {
        previousMarked: previousWords.hasAttribute('data-dsh-claude-wait-words'),
        current: lineOf(),
      }
      var ownership = function () {
        return {
          line: row.querySelector('.dsh-claude-chat-wait') !== null,
          marked: row.hasAttribute('data-dsh-claude-wait'),
          wordsMarked: words.hasAttribute('data-dsh-claude-wait-words'),
          externalHiding: words.style.display,
          foreignShown: foreignLine.checkVisibility(),
          follow: document.body.hasAttribute('data-dsh-claude-chat-follow'),
        }
      }
      // A change of owner that is only a style is read on the line's own
      // quarter-second tick (chat-wait.ts), so each reading waits for the line
      // to stand aside or come back, and a line that never does fails by name.
      var owned = async function (lineStands, what) {
        var seen = await probe.until(ownership, function (frames) {
          var last = frames[frames.length - 1]
          return last.line === lineStands && last.marked === lineStands
        }, what)
        return seen[seen.length - 1]
      }
      words.style.display = 'none'
      r.wait.takeover = await owned(false, 'the line standing aside for a visible replacement')
      foreignLine.hidden = true
      r.wait.hiddenReplacement = await owned(true, 'the line coming back once the replacement hides')
      foreignLine.hidden = false
      r.wait.visibleReplacement = await owned(false, 'the line standing aside for the replacement shown again')
      words.style.removeProperty('display')
      r.wait.hostRestored = await owned(true, 'the line coming back once the host words return')
      window.__pushForm({ chatWait: false })
      await probe.settle()
      words.style.display = 'none'
      window.__pushForm({ chatWait: true })
      r.wait.existingOwner = await owned(false, 'the line standing aside for an owner already there')
      foreignLine.remove()
      words.style.removeProperty('display')
      r.wait.ownerRemoved = await owned(true, 'the line coming back once the owner is gone')
      words.parentElement.appendChild(foreignLine)
      window.__pushForm({ chatWait: false })
      await probe.settle()
      r.wait.off = {
        line: row.querySelector('.dsh-claude-chat-wait') !== null,
        marked: row.hasAttribute('data-dsh-claude-wait'),
        wordsShown: getComputedStyle(words).display !== 'none',
        wordsMarked: words.hasAttribute('data-dsh-claude-wait-words'),
        foreignShown: getComputedStyle(foreignLine).display !== 'none',
      }
      window.__pushForm({ chatWait: true })
      await probe.settle()
      // The pin the waiting line stands on belongs to the chat area's follow
      // (features/chat-follow/): the rule that pins it waits for that feature's
      // mark on the body, so switching that animation off hands the row's place
      // back to the host. The fixture carries the host's own tail mark here,
      // which is the state a running turn leaves behind.
      var pinOf = function () {
        var paint = getComputedStyle(row)
        var after = getComputedStyle(row, '::after')
        return {
          follow: document.body.hasAttribute('data-dsh-claude-chat-follow'),
          pinned: paint.position === 'sticky',
          // The canvas the pinned row carries under itself, down to the
          // composer's top: the strip the host leaves unclipped under the row is
          // where a slid line would otherwise show (chat-wait.css).
          mask: after.content === 'none' ? null : {
            position: after.position,
            height: after.height,
            background: after.backgroundColor,
            ink: paint.backgroundColor,
          },
        }
      }
      waitSession.setAttribute('data-chat-following-tail', '')
      await probe.settle()
      r.wait.pin = { on: pinOf() }
      var unpinnedFor = async function (content, what) {
        await probe.until(pinOf, function (frames) {
          var last = frames[frames.length - 1]
          return last.pinned === false && last.mask === null
        }, what)
        var reading = pinOf()
        content.remove()
        await probe.until(pinOf, function (frames) {
          var last = frames[frames.length - 1]
          return last.pinned === true && last.mask !== null
        }, 'the tail pin returning after later content leaves')
        return reading
      }
      // A reader's message can follow the live row inside the flow slot. The
      // row then keeps its document place and paints no band over that message.
      var laterMessage = document.createElement('div')
      laterMessage.textContent = 'A later reader message'
      laterMessage.style.height = '80px'
      row.after(laterMessage)
      r.wait.pin.afterMessage = await unpinnedFor(laterMessage, 'the row standing down for a later reader message')
      // The question card travels into the column after the display-contents
      // flow slot, so the following-content walk has to cross that slot's edge.
      var flowSlot = document.createElement('div')
      flowSlot.setAttribute('data-slot', 'conversation.chat.flow')
      row.before(flowSlot)
      flowSlot.append(row)
      var question = document.createElement('div')
      question.style.height = '120px'
      flowSlot.after(question)
      r.wait.pin.afterQuestion = await unpinnedFor(question, 'the row standing down for a question after the flow slot')
      flowSlot.before(row)
      flowSlot.remove()
      await probe.settle()
      window.__pushForm({ chatAnimations: false })
      await probe.settle()
      r.wait.pin.off = pinOf()
      // The mark comes off while the follow is away: no guard of its own is
      // watching the fixture's tail go out. It goes back on once the follow is
      // installed again, which is what the rule is read against.
      waitSession.removeAttribute('data-chat-following-tail')
      window.__pushForm({ chatAnimations: true })
      await probe.settle()
      waitSession.setAttribute('data-chat-following-tail', '')
      await probe.settle()
      r.wait.pin.back = pinOf()
      // The host keeps the running row's slot after the turn stops, marked
      // `data-holding` and hidden, until the turn's actions row replaces it
      // (RunningStatus). That node still matches `[data-chat-running]` and still
      // holds its content span, so the line must not be drawn into it: two
      // lines beside each other are the same dots drawn twice.
      row.setAttribute('data-holding', '')
      await probe.settle()
      r.wait.holding = await owned(false, 'the line handing a holding row back')
      row.removeAttribute('data-holding')
      await probe.settle()
      r.wait.holdingReleased = await owned(true, 'the line coming back once the row is live again')
      waitSession.remove()
      await probe.settle()
      r.wait.removed = { wordsMarked: words.hasAttribute('data-dsh-claude-wait-words') }
    })
  })
})()
