/**
 * The follow hand-back and the stream glide (packages/client/src/features/chat-follow/):
 * a structural moment hands the host’s follow back, a reader who took the scroll
 * over himself is left where he is, and the growth a fast answer brings is slid to
 * rest instead of jumping a frame (D71).
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
    // The ported chat-follow feature (packages/client/src/features/chat-follow/): a structural
    // moment hands the host's follow back, and a reader who took the scroll
    // over himself is left where he is.
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
      // on a run of frames that read the same position. D77's 动效的断言 reads
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
      var structuralMoment = async function () {
        var node = document.createElement('div')
        node.setAttribute('data-chat-flow-key', 'probe')
        node.style.display = 'none'
        followColumn.appendChild(node)
        // Two hand-backs never land closer than the follow's own interval
        // (FOLLOW_MIN_INTERVAL_MS, a fifth of a second): the moment is held past
        // it, which is the product's clock, before it is taken away again.
        await probe.sleep(250)
        followColumn.removeChild(node)
        await probe.settle()
      }
      r.chatFollow = {
        marked: document.body.hasAttribute('data-dsh-claude-chat-follow'),
        overflowX: cappedBody === null ? null : getComputedStyle(cappedBody).overflowX,
        expandedOverflowX: expandedBody === null ? null : getComputedStyle(expandedBody).overflowX,
      }
      // At the end, so any reader-took-over the guard is holding is dropped.
      followScroller.scrollTop = followScroller.scrollHeight
      await probe.settle()
      await structuralMoment()
      // 60px off the end, the way a structural moment leaves it.
      followScroller.scrollTop = Math.max(0, followScroller.scrollHeight - followScroller.clientHeight - 60)
      await probe.settle()
      r.chatFollow.before = endGap()
      await structuralMoment()
      r.chatFollow.after = endGap()
      // A wheel of the reader's own: the hand-back stops until he returns.
      followScroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
      followScroller.scrollTop = Math.max(0, followScroller.scrollHeight - followScroller.clientHeight - 60)
      await probe.settle()
      r.chatFollow.readerBefore = endGap()
      await structuralMoment()
      r.chatFollow.readerAfter = endGap()
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
      // The stream slide (chat-follow.ts, D71): with the host's own streaming mark
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
      var sliding = function () {
        return followColumn.getAnimations().length > 0
      }
      // The pin the host's own follow writes; the slide starts in the frame it
      // is laid out in, and is recorded from there the same way as the catch-up.
      followScroller.scrollTop = followScroller.scrollHeight
      r.chatFollow.slide = await recordWalk(slideOffset, sliding)
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
      // offset while its slide runs, and the whole gap the scroller shows once
      // the slide has ended with that distance never written.
      var lagOf = function () {
        var slide = followColumn.getAnimations()
        if (slide.length > 0) return Math.round(new DOMMatrix(getComputedStyle(followColumn).transform).m42 * 10) / 10
        return endGap()
      }
      var burstBlock = document.createElement('div')
      burstBlock.style.height = '2000px'
      followColumn.insertBefore(burstBlock, runningRow)
      followScroller.scrollTop = followScroller.scrollHeight
      r.chatFollow.burst = await recordWalk(lagOf, function () { return followColumn.getAnimations().length > 0 || endGap() > AT_END_PX })
      burstBlock.remove()
      await probe.settle()
      // The slide restarts from where the frame before it stood, not from the
      // linear share of its clock: a growth thirty milliseconds apart each time
      // keeps the lag rising only while the growth outruns the slide, which it
      // does not at this pace. What the run leaves standing is measured on the
      // gap the scroller shows on the frame after each growth, and again once
      // the slide has had its time to land: a recorder that captured no slide
      // at all leaves the whole growth standing, and reads it in both.
      var paceFrames = []
      var paced = document.createElement('div')
      paced.style.height = '20px'
      followColumn.insertBefore(paced, runningRow)
      followScroller.scrollTop = followScroller.scrollHeight
      var nextFrame = probe.frame
      for (var step = 0; step < 8; step += 1) {
        await probe.sleep(30)
        paced.style.height = (24 + step * 20) + 'px'
        followScroller.scrollTop = followScroller.scrollHeight
        await nextFrame()
        paceFrames.push(endGap())
      }
      await probe.sleep(600)
      r.chatFollow.pace = { frames: paceFrames, growth: 20, settled: endGap(), animations: followColumn.getAnimations().length }
      paced.remove()
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
