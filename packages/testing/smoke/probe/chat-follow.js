/**
 * The capped body's catch-up and the stream glide (packages/client/src/features/chat-follow/):
 * the capped body walks to its end, and the growth a fast answer brings is slid
 * to rest instead of jumping a frame (D95).
 */
(function () {
  var probe = window.__dshSmokeProbe
  var r = probe.report

  probe.step(async function () {
    // The chat area's own message of this page load: a step of its own, so the
    // chat-send probe's step — registered after this one and clearing the
    // composer's text on its first press, which a submission with no words is
    // no submission at all — has run by the time the slide below reads it.
    await probe.onlyFor(['chat-follow'], async function () {
      var chatFlow = document.querySelector('[data-chat-flow]')
      var chatScroller = document.querySelector('[data-conversation-scroll]')
      var chatRunning = document.querySelector('[data-chat-running]')
      var chatEchoOf = function () { return document.querySelector('[data-echo-holder]') }
      var userRow = document.createElement('div')
      userRow.setAttribute('data-chat-flow-key', 'sent')
      userRow.setAttribute('data-chat-flow-kind', 'user')
      userRow.style.height = '300px'
      var slidesOf = function () { return chatFlow.getAnimations().length }
      // A message the reader has just sent is not streaming content: the host's
      // jump to it stands, and the slide stands down around it. The streaming
      // mark is still on the page here, so without the stand-down this growth
      // would slide like any other. The stand-down is the send feature's own
      // state (ui.chatSend), and the sequence is the page's: Enter in the
      // editor, the echo the host mounts in answer, the row that takes its place.
      var editor = document.querySelector('[data-composer-input]')
      if (editor !== null) {
        editor.focus()
        editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      }
      chatEchoOf().innerHTML = '<div data-submission-echo></div>'
      chatScroller.scrollTop = chatScroller.scrollHeight
      var echo = await probe.watch(slidesOf)
      chatEchoOf().innerHTML = ''
      chatFlow.insertBefore(userRow, chatRunning)
      chatScroller.scrollTop = chatScroller.scrollHeight
      var row = await probe.watch(slidesOf)
      userRow.remove()
      await probe.settle()
      // The other entrance (constants.ts MESSAGE_ENTER_MODES, send-grow.ts): the
      // message grows where it lands, and its row is the one the host's jump is
      // for. The stand-down covers that row's own growth too, so the slide is
      // still nothing while it plays.
      window.__pushForm({ messageEnter: 'grow' })
      await probe.settle()
      if (editor !== null) {
        editor.focus()
        editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      }
      var growEcho = document.createElement('div')
      growEcho.setAttribute('data-submission-echo', '')
      growEcho.style.height = '300px'
      chatEchoOf().appendChild(growEcho)
      chatScroller.scrollTop = chatScroller.scrollHeight
      var growWaiting = await probe.watch(slidesOf)
      var growRow = document.createElement('div')
      growRow.setAttribute('data-chat-flow-key', 'grown')
      growRow.setAttribute('data-chat-flow-kind', 'user')
      growRow.style.height = '300px'
      chatFlow.insertBefore(growRow, chatRunning)
      growEcho.remove()
      chatScroller.scrollTop = chatScroller.scrollHeight
      var growPlaying = await probe.watch(slidesOf)
      r.chatFollowSubmit = { echo: echo, row: row, growWaiting: growWaiting, growPlaying: growPlaying }
      growRow.remove()
      window.__pushForm({ messageEnter: 'flight' })
      await probe.settle()
    })
    // The ported chat-follow feature (packages/client/src/features/chat-follow/):
    // the capped body's catch-up and the stream slide.
    await probe.onlyFor(['chat-follow'], async function () {
      var followScroller = document.querySelector('[data-conversation-scroll]')
      var followColumn = document.querySelector('[data-chat-flow]')
      var cappedBody = document.querySelector('[data-step-process]:not([data-group-expanded-mode]) [data-step-process-body]')
      var expandedBody = document.querySelector('[data-step-process][data-group-expanded-mode] [data-step-process-body]')
      var endGap = function () {
        return Math.round(followScroller.scrollHeight - followScroller.clientHeight - followScroller.scrollTop)
      }
      /** What "at rest" means for a position, as the cases read it (bounds.json's followAtEndPx). */
      var AT_END_PX = 6
      // One walk, as the browser draws it: the first reading is taken where the
      // walk starts, the rest on the frames that follow, and the recording stops
      // on a run of frames that read the same position. D92's 动效的断言 reads
      // this sequence — monotone, at least two different values between the two
      // ends, the end equal to the target — so that the shape of the curve is
      // settled in the unit lane and this lane only asks whether it was walked.
      //
      // A walk out of a growth begins on the frame the content is laid out in,
      // when the size subscription armed after the host's own starts it — so the
      // recording waits for the frame `held` says it began on. Started in the
      // writing turn, it reads the state before the walk and never sees it.
      var recordWalk = function (gap, held) {
        return new Promise(function (resolve) {
          var readings = []
          var quiet = 0
          var frames = 0
          var started = false
          var read = function () {
            frames += 1
            if (!started) {
              started = held()
              if (!started) {
                if (frames >= 96) { resolve([]); return }
                requestAnimationFrame(read)
                return
              }
            }
            var value = gap()
            readings.push(value)
            if (readings.length > 1 && value === readings[readings.length - 2]) quiet += 1
            else quiet = 0
            // The quiet run is what ends a walk: a fixed wait would either cut a
            // slow runner's walk short or spend a second on a fast one.
            if (quiet >= 8 || readings.length >= 120) { resolve(readings); return }
            requestAnimationFrame(read)
          }
          requestAnimationFrame(read)
        })
      }
      /** Whether the capped body has left its end, which is where its catch-up walk starts. */
      var bodyWalking = function () {
        return cappedBody !== null && cappedBody.scrollHeight - cappedBody.clientHeight - cappedBody.scrollTop > 6
      }
      r.chatFollow = {
        marked: document.body.hasAttribute('data-dsh-claude-chat-follow'),
        overflowX: cappedBody === null ? null : getComputedStyle(cappedBody).overflowX,
        expandedOverflowX: expandedBody === null ? null : getComputedStyle(expandedBody).overflowX,
      }
      // The capped body's catch-up is walked in on a curve, not written in one
      // frame (scroll-ease.ts): grow the content well past the catch-up
      // threshold and record every frame of the walk out of it.
      if (cappedBody !== null) {
        var cappedContent = cappedBody.querySelector('[data-step-process-content]')
        var bodyGap = function () {
          return Math.round(cappedBody.scrollHeight - cappedBody.clientHeight - cappedBody.scrollTop)
        }
        cappedBody.scrollTop = 0
        await probe.settle()
        if (cappedContent !== null) cappedContent.style.height = '900px'
        r.chatFollow.catchUp = await recordWalk(bodyGap, bodyWalking)
      }
      // The stream slide (chat-follow.ts, D95): with the host's own streaming mark
      // on the page and its follow on, the growth the host's pin pushed up is put
      // back down by the column's own offset and slid to rest, while the position
      // stays at the end. The live turn's row, the flow's last, stands still.
      followScroller.scrollTop = followScroller.scrollHeight
      await probe.settle()
      // The host's own mark that its follow is on, which it writes on the
      // column's wrapper; the slide only moves a growth the host has pinned.
      followColumn.parentElement.setAttribute('data-chat-following-tail', '')
      var streamingMark = document.createElement('div')
      streamingMark.setAttribute('data-streaming', '')
      followColumn.appendChild(streamingMark)
      var runningRow = document.createElement('div')
      runningRow.setAttribute('data-chat-running', '')
      runningRow.style.height = '24px'
      followColumn.appendChild(runningRow)
      followScroller.scrollTop = followScroller.scrollHeight
      await probe.settle()
      var slideBlock = document.createElement('div')
      slideBlock.style.height = '300px'
      followColumn.insertBefore(slideBlock, runningRow)
      /** The column's offset as it renders, with the end gap and the running row's top on the same frame. */
      var slideFrames = []
      var slideOffset = function () {
        slideFrames.push({ gap: endGap(), row: runningRow.getBoundingClientRect().top })
        return Math.round(new DOMMatrix(getComputedStyle(followColumn).transform).m42 * 10) / 10
      }
      var columnOffset = function () {
        return Math.round(new DOMMatrix(getComputedStyle(followColumn).transform).m42 * 10) / 10
      }
      /**
       * Walk a slide the page has started across its own clock (D92). The slide
       * is a fixed-duration animation the display may render in only a frame or
       * two on a slow runner, so stepping the animation's currentTime reads the
       * whole sequence its own keyframes carry — the start, the intermediate
       * frames and the rest — instead of the handful of frames the display
       * happened to paint. The column and the counter-slid live row are stepped
       * together, so the row stands still over the pin across the whole walk.
       */
      var sampleSlide = function (read) {
        var all = followColumn.getAnimations().concat(runningRow.getAnimations())
        var span = 0
        all.forEach(function (animation) {
          var timing = animation.effect === null ? null : animation.effect.getTiming()
          if (timing !== null && typeof timing.duration === 'number') span = Math.max(span, timing.duration)
        })
        if (span <= 0) return []
        // Freeze and step the page's own animations, then put them back on the
        // clock they were on: the sampling is synchronous, so nothing paints and
        // the product's slide keeps running exactly as it would have.
        var saved = all.map(function (animation) { return { animation: animation, time: animation.currentTime, playing: animation.playState === 'running' } })
        all.forEach(function (animation) { animation.pause() })
        var readings = []
        // The walk across the slide, then a quiet run at its rest: the case reads
        // the last frames as the rest the walk arrived at (followQuietFrames).
        var STEPS = 12
        var QUIET = 8
        for (var at = 0; at < STEPS + QUIET - 1; at += 1) {
          var time = at < STEPS ? span * at / (STEPS - 1) : span
          all.forEach(function (animation) { animation.currentTime = time })
          readings.push(read())
        }
        saved.forEach(function (one) { one.animation.currentTime = one.time; if (one.playing) one.animation.play() })
        return readings
      }
      var slideStarts = function () { return followColumn.getAnimations().length }
      // The pin the host's own follow writes; the slide starts in the frame it
      // is laid out in. Wait for the slide the page's own clock started, then walk it.
      followScroller.scrollTop = followScroller.scrollHeight
      await probe.until(slideStarts, function (reads) { return reads[reads.length - 1] > 0 }, 'the stream slide to start', 4000)
      r.chatFollow.slide = sampleSlide(slideOffset)
      r.chatFollow.slideFrames = slideFrames
      r.chatFollow.slideDiag = {
        motion: document.body.getAttribute('data-dsh-claude-motion'),
        streamMark: document.querySelector('[data-streaming]') !== null,
        rolling: document.querySelector('[data-dsh-claude-rolling]') !== null,
        followAttr: document.querySelector('[data-chat-following-tail]') !== null,
      }
      // A burst: one growth past the longest stretch a slide carries is slid
      // too, from as much of it as a slide carries (chat-follow.ts), where a
      // growth that size used to read as a replaced column and jumped whole.
      // The lag recorded is the growth still to be put down: the column's
      // offset while its slide runs, which stepping its clock reads from the
      // whole carried stretch down to rest.
      var burstBlock = document.createElement('div')
      burstBlock.style.height = '2000px'
      followColumn.insertBefore(burstBlock, runningRow)
      followScroller.scrollTop = followScroller.scrollHeight
      await probe.until(slideStarts, function (reads) { return reads[reads.length - 1] > 0 }, 'the burst slide to start', 4000)
      r.chatFollow.burst = sampleSlide(columnOffset)
      burstBlock.remove()
      await probe.settle()
      // The slide restarts from where the frame before it stood, not from the
      // linear share of its clock, and one growth is all the distance it may be
      // left carrying: a run at thirty milliseconds a growth measures the offset
      // the slide is drawn at on the frame after each landing, and the position
      // the scroller shows there. A slow display can merge two scripted steps
      // into one larger growth, so each sampled frame carries the growth it
      // actually took (the most recent one for a frame that took none), which is
      // what the offset is bounded by (D92).
      var paceFrames = []
      var paced = document.createElement('div')
      paced.style.height = '20px'
      // Read the column before the block lands, so the block's own insertion
      // counts as the first growth the slide carries, not as a distance with no
      // growth behind it.
      var pacedHeight = followColumn.offsetHeight
      followColumn.insertBefore(paced, runningRow)
      followScroller.scrollTop = followScroller.scrollHeight
      var lastGrow = 0
      for (var step = 0; step < 8; step += 1) {
        await probe.sleep(30)
        paced.style.height = (24 + step * 20) + 'px'
        followScroller.scrollTop = followScroller.scrollHeight
        await probe.frame()
        var nowHeight = followColumn.offsetHeight
        var grew = nowHeight - pacedHeight
        pacedHeight = nowHeight
        if (grew > 0) lastGrow = grew
        paceFrames.push({ gap: endGap(), offset: columnOffset(), grow: lastGrow })
      }
      await probe.sleep(600)
      r.chatFollow.pace = { frames: paceFrames, growth: 20, settled: endGap(), animations: followColumn.getAnimations().length }
      paced.remove()
      await probe.settle()
      // A structural shrink (a reasoning row leaving at the stream's end) takes
      // the running offset off with it. The host's own pin moves with the new
      // height; keeping the old offset would push the whole column down once.
      var shrinking = document.createElement('div')
      shrinking.style.height = '120px'
      followColumn.insertBefore(shrinking, runningRow)
      followScroller.scrollTop = followScroller.scrollHeight
      await probe.frame()
      var shrinkBefore = followColumn.getBoundingClientRect().top
      // The block leaves by the height a reasoning row does, not by enough to
      // end the scroll itself: with the column still overflowing, the host's
      // pin keeps the end standing and the reading position is comparable.
      shrinking.style.height = '100px'
      followScroller.scrollTop = followScroller.scrollHeight
      // The running offset is taken off on the resize callback, which lands
      // after the frame that painted the new height: read the column once the
      // slide is gone, or the figure still carries it.
      for (var shrinkFrames = 0; shrinkFrames < 12 && followColumn.getAnimations().length > 0; shrinkFrames++) await probe.frame()
      await probe.frame()
      r.chatFollow.shrink = {
        before: shrinkBefore,
        after: followColumn.getBoundingClientRect().top,
        animations: followColumn.getAnimations().length,
      }
      shrinking.remove()
      await probe.settle()
      // A reader holding the conversation himself (#230). The host's own follow
      // pins the end on every growth while its mark stands, and a finger that is
      // pressed on the screen sends no scroll of its own for the host to stand
      // down on: the growth the pin pushes up is given back to him where he
      // holds it, and nothing slides. The shape is the case's: the finger
      // arrives, the content grows, the host pins.
      var touchAt = function (type, y) {
        var contact = new Touch({ identifier: 5, target: followColumn, clientX: 5, clientY: y })
        followColumn.dispatchEvent(new TouchEvent(type, {
          bubbles: true, cancelable: true, composed: true,
          touches: type === 'touchend' ? [] : [contact],
          targetTouches: type === 'touchend' ? [] : [contact],
          changedTouches: [contact],
        }))
      }
      var holdBlock = document.createElement('div')
      holdBlock.style.height = '120px'
      touchAt('touchstart', 300)
      followColumn.insertBefore(holdBlock, runningRow)
      followScroller.scrollTop = followScroller.scrollHeight
      await probe.frame()
      await probe.frame()
      r.chatFollow.hold = { gap: endGap(), slides: followColumn.getAnimations().length }
      // His own way back: a drag toward the end, lifted there, hands the follow
      // back without another gesture (scroll-owner.ts, releaseAtTail).
      touchAt('touchmove', 260)
      followScroller.scrollTop = followScroller.scrollHeight
      touchAt('touchend', 260)
      await probe.settle()
      holdBlock.remove()
      await probe.settle()
      streamingMark.remove()
      slideBlock.remove()
      runningRow.remove()
      followColumn.parentElement.removeAttribute('data-chat-following-tail')
      await probe.settle()
      followScroller.scrollTop = followScroller.scrollHeight
      await probe.settle()
    })
  })
})()
