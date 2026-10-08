/**
 * The ported chat behaviours that watch a page over time: the follow hand-back
 * and the stream glide, the drawn caret, the automatic folding, and the token
 * reveal engine with the settings that withdraw it.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
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
      var structuralMoment = async function () {
        var node = document.createElement('div')
        node.setAttribute('data-chat-flow-key', 'probe')
        node.style.display = 'none'
        followColumn.appendChild(node)
        await sleep(250)
        followColumn.removeChild(node)
        await sleep(50)
      }
      r.chatFollow = {
        marked: document.body.hasAttribute('data-dsh-claude-chat-follow'),
        overflowX: cappedBody === null ? null : getComputedStyle(cappedBody).overflowX,
        expandedOverflowX: expandedBody === null ? null : getComputedStyle(expandedBody).overflowX,
      }
      // At the end, so any reader-took-over the guard is holding is dropped.
      followScroller.scrollTop = followScroller.scrollHeight
      await sleep(80)
      await structuralMoment()
      // 60px off the end, the way a structural moment leaves it.
      followScroller.scrollTop = Math.max(0, followScroller.scrollHeight - followScroller.clientHeight - 60)
      await sleep(30)
      r.chatFollow.before = endGap()
      await structuralMoment()
      r.chatFollow.after = endGap()
      // A wheel of the reader's own: the hand-back stops until he returns.
      followScroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
      followScroller.scrollTop = Math.max(0, followScroller.scrollHeight - followScroller.clientHeight - 60)
      await sleep(30)
      r.chatFollow.readerBefore = endGap()
      await structuralMoment()
      r.chatFollow.readerAfter = endGap()
      // The capped body's catch-up is walked in on a curve, not written in one
      // frame (scroll-ease.ts): grow the content well past the catch-up
      // threshold and sample what is left to go at three moments.
      if (cappedBody !== null) {
        var cappedContent = cappedBody.querySelector('[data-step-process-content]')
        var bodyGap = function () {
          return Math.round(cappedBody.scrollHeight - cappedBody.clientHeight - cappedBody.scrollTop)
        }
        cappedBody.scrollTop = 0
        await sleep(80)
        if (cappedContent !== null) cappedContent.style.height = '900px'
        await sleep(25)
        r.chatFollow.catchUpEarly = bodyGap()
        await sleep(110)
        r.chatFollow.catchUpMid = bodyGap()
        // A burst this size glides at the capped speed, so it takes about half a
        // second to arrive; the quiet stretch between bursts is what that fits in.
        await sleep(900)
        r.chatFollow.catchUpDone = bodyGap()
        await sleep(600)
        // Held at the end: the ease ended there rather than being left running.
        r.chatFollow.catchUpLate = bodyGap()
      }
      // The stream glide (chat-follow.ts): with the host's own streaming mark on
      // the page, the end the host's follow pins the position to is taken back
      // before the frame paints and handed to the spring, so the text walks there
      // instead of jumping. The mark is the host's; the pin is what its follow
      // does on every content change.
      followScroller.scrollTop = followScroller.scrollHeight
      await sleep(100)
      var streamingMark = document.createElement('div')
      streamingMark.setAttribute('data-streaming', '')
      followColumn.appendChild(streamingMark)
      var glideBlock = document.createElement('div')
      glideBlock.style.height = '300px'
      followColumn.appendChild(glideBlock)
      followScroller.scrollTop = followScroller.scrollHeight
      await sleep(30)
      r.chatFollow.glideEarly = endGap()
      r.chatFollow.glideDiag = {
        motion: document.body.getAttribute('data-dsh-claude-motion'),
        streamMark: document.querySelector('[data-streaming]') !== null,
        rolling: document.querySelector('[data-dsh-claude-rolling]') !== null,
        buttonMarked: document.querySelector('[data-dsh-claude-stream-glide]') !== null,
        followAttr: document.querySelector('[data-chat-following-tail]') !== null,
      }
      await sleep(120)
      r.chatFollow.glideMid = endGap()
      await sleep(900)
      r.chatFollow.glideDone = endGap()
      // The host's own button is kept out of sight while the glide follows: a
      // position held off the end reads to the host as a reader who left.
      r.chatFollow.glideButtonMarked = document.querySelector('[data-dsh-claude-stream-glide]') !== null
      // A message the reader has just sent is not streaming content: the host's
      // jump to it stands, and the glide stands down around it. The streaming
      // mark is still on the page here, so without the stand-down the glide
      // would take this jump back like any other.
      var userRow = document.createElement('div')
      userRow.setAttribute('data-chat-flow-key', 'sent')
      userRow.setAttribute('data-chat-flow-kind', 'user')
      userRow.style.height = '300px'
      followColumn.appendChild(userRow)
      followScroller.scrollTop = followScroller.scrollHeight
      await sleep(60)
      r.chatFollow.submitGap = endGap()
      await sleep(200)
      r.chatFollow.submitGapLate = endGap()
      userRow.remove()
      await sleep(60)
      streamingMark.remove()
      glideBlock.remove()
      await sleep(120)
      followScroller.scrollTop = followScroller.scrollHeight
      await sleep(200)
      r.chatFollow.glideButtonBack = document.querySelector('[data-dsh-claude-stream-glide]') === null
    })
    // The ported caret motion (packages/client/src/features/caret/): the focused composer
    // surface gets a drawn caret and the native one gives way; switching the
    // feature off takes both away and gives the native one back.
    await probe.onlyFor(['caret'], async function () {
      var caretEditor = document.querySelector('[data-composer-input]')
      var caretOf = function () {
        var layer = document.querySelector('[data-dsh-claude-caret-layer]')
        return {
          layer: layer !== null,
          visible: layer !== null && layer.hasAttribute('data-dsh-claude-caret-visible'),
          transform: layer === null ? null : layer.style.transform,
          marked: caretEditor.hasAttribute('data-dsh-claude-caret'),
          nativeHidden: getComputedStyle(caretEditor).caretColor === 'rgba(0, 0, 0, 0)',
        }
      }
      var caretSelect = function () {
        caretEditor.focus()
        var text = caretEditor.firstChild
        if (text !== null && text.nodeType === 3) {
          var selection = document.getSelection()
          selection.removeAllRanges()
          var range = document.createRange()
          range.setStart(text, text.data.length)
          range.collapse(true)
          selection.addRange(range)
        }
        document.dispatchEvent(new Event('selectionchange'))
      }
      caretSelect()
      await sleep(250)
      r.caret = { on: caretOf() }
      // The plain surface: a textarea under the seat is measured through the
      // hidden mirror, and taken over the same way.
      var answer = document.getElementById('debugAnswer')
      if (answer !== null) {
        answer.focus()
        answer.selectionStart = answer.value.length
        answer.selectionEnd = answer.value.length
        document.dispatchEvent(new Event('selectionchange'))
        await sleep(250)
        var answerLayer = answer.parentElement.querySelector('[data-dsh-claude-caret-layer]')
        r.caret.plain = {
          layer: answerLayer !== null,
          marked: answer.hasAttribute('data-dsh-claude-caret'),
          visible: answerLayer !== null && answerLayer.hasAttribute('data-dsh-claude-caret-visible'),
          nativeHidden: getComputedStyle(answer).caretColor === 'rgba(0, 0, 0, 0)',
        }
        caretSelect()
        await sleep(250)
      }
      window.__pushForm({ caretMotion: 'off' })
      await sleep(250)
      r.caret.off = caretOf()
      window.__pushForm({ caretMotion: 'typing' })
      await sleep(250)
      r.caret.back = caretOf()
      // The animation choice stills the drawn caret through its own stylesheet
      // rule (caret.css), which is what D26's resolved attribute is for.
      window.__pushForm({ motion: 'reduced' })
      await sleep(250)
      var reducedLayer = document.querySelector('[data-dsh-claude-caret-layer]')
      r.caret.reduced = reducedLayer === null ? null : {
        layer: true,
        transition: getComputedStyle(reducedLayer).transitionDuration,
        animation: getComputedStyle(reducedLayer).animationName,
      }
      window.__pushForm({ motion: 'system' })
      await sleep(250)
    })
    // The ported automatic folding (packages/client/src/features/chat-fold/): a running thinking
    // row and a running process group are opened at install, both fold back when
    // their section ends, a tier that does not cap its body is never pressed, and
    // a group the reader opened himself in that phase stays open.
    await probe.onlyFor(['chat-fold'], async function () {
      var foldThink = document.getElementById('debugThink')
      var foldGroup = document.getElementById('debugGroup')
      var foldHeader = document.getElementById('debugGroupHeader')
      var foldBody = document.getElementById('debugGroupBody')
      var foldExpandedBody = document.getElementById('debugExpandedBody')
      await sleep(350)
      r.fold = {
        thinkOpen: foldThink.hasAttribute('data-expanded'),
        groupOpen: !foldBody.hasAttribute('hidden'),
        openMark: foldGroup.hasAttribute('data-dsh-claude-open'),
        liveDetail: foldGroup.hasAttribute('data-dsh-claude-live-detail'),
        label: foldHeader.getAttribute('data-dsh-claude-label'),
        labelName: foldHeader.getAttribute('aria-label'),
        spread: foldHeader.style.getPropertyValue('--dsh-claude-label-spread'),
        expandedUntouched: !foldExpandedBody.hasAttribute('hidden'),
        clicks: Object.assign({}, window.__foldClicks),
      }
      // The reasoning stops and the process section ends: both fold back.
      foldThink.setAttribute('data-state', 'ok')
      var foldShimmer = foldHeader.querySelector('[data-shimmer]')
      if (foldShimmer !== null) foldShimmer.parentNode.removeChild(foldShimmer)
      // The host drops the live detail with the shimmer: what is left is the label
      // alone, with no separator in it.
      var foldText = foldHeader.textContent
      var foldCut = foldText.indexOf(' · ')
      if (foldCut >= 0) foldHeader.textContent = foldText.slice(0, foldCut)
      await sleep(450)
      r.fold.after = {
        thinkOpen: foldThink.hasAttribute('data-expanded'),
        groupOpen: !foldBody.hasAttribute('hidden'),
        openMark: foldGroup.hasAttribute('data-dsh-claude-open'),
        liveDetail: foldGroup.hasAttribute('data-dsh-claude-live-detail'),
        clicks: Object.assign({}, window.__foldClicks),
      }
      // The fold glide on the reader's own press: the click is intercepted, the
      // real element is pressed with the door marked, and the click is handed back
      // afterwards so the host collapses it.
      var disclosure = document.getElementById('debugDisclosure')
      var disclosureBody = function () { return document.getElementById('debugDisclosureBody') }
      var disclosureBefore = window.__disclosureClicks
      disclosure.click()
      await sleep(60)
      var rollingBody = disclosureBody()
      r.fold.glide = {
        rolling: rollingBody !== null && rollingBody.hasAttribute('data-dsh-claude-rolling'),
        clipped: rollingBody !== null && rollingBody.style.overflow === 'hidden',
        clicksDuringRoll: window.__disclosureClicks - disclosureBefore,
      }
      await sleep(500)
      r.fold.glide.after = {
        bodyGone: disclosureBody() === null,
        rollingAnywhere: document.querySelector('[data-dsh-claude-rolling]') !== null,
        clicks: window.__disclosureClicks - disclosureBefore,
      }
      // The opening direction: the press is remembered as an intent, the host
      // inserts the body, and the door rolls it open.
      disclosure.click()
      await sleep(80)
      var openingBody = disclosureBody()
      r.fold.glide.open = {
        inserted: openingBody !== null,
        rolling: openingBody !== null && openingBody.hasAttribute('data-dsh-claude-rolling'),
      }
      await sleep(450)
      var settledBody = disclosureBody()
      r.fold.glide.openAfter = {
        present: settledBody !== null,
        rolling: settledBody !== null && settledBody.hasAttribute('data-dsh-claude-rolling'),
      }
      // The reader's own press in this phase: the module leaves it alone.
      foldHeader.click()
      await sleep(350)
      r.fold.readerOpen = !foldBody.hasAttribute('hidden')
      // The switch covers the door and the entrance fade as well as the automatic
      // folding: off, a press reaches the host's own handler in the same turn and
      // an inserted body carries no transition (fold-motion.css rides
      // data-dsh-claude-chat-fold).
      var foldFlow = document.getElementById('debugFlow')
      var entranceOf = function () {
        var row = document.createElement('button')
        row.setAttribute('type', 'button')
        row.setAttribute('data-disclosure-row', '')
        var body = document.createElement('div')
        body.textContent = 'probe body'
        foldFlow.appendChild(row)
        foldFlow.appendChild(body)
        var value = getComputedStyle(body).transitionDuration
        row.remove()
        body.remove()
        return value
      }
      r.fold.entranceOn = entranceOf()
      window.__pushForm({ chatAnimations: false })
      await sleep(200)
      var offBefore = window.__disclosureClicks
      disclosure.click()
      var offImmediate = window.__disclosureClicks - offBefore
      await sleep(300)
      r.fold.animationsOff = {
        mark: document.body.hasAttribute('data-dsh-claude-chat-fold'),
        entrance: entranceOf(),
        immediateClicks: offImmediate,
        rolling: document.querySelector('[data-dsh-claude-rolling]') !== null,
      }
      window.__pushForm({ chatAnimations: true })
      await sleep(200)
      r.fold.animationsBack = { mark: document.body.hasAttribute('data-dsh-claude-chat-fold') }
      // The Redraw choice runs the other effect set, which the fold is not part
      // of: its mark goes the same way Off takes it.
      window.__pushForm({ chatAnimations: 'redraw' })
      await sleep(200)
      r.fold.animationsRedraw = { mark: document.body.hasAttribute('data-dsh-claude-chat-fold') }
      window.__pushForm({ chatAnimations: 'enhanced' })
      await sleep(200)
    })
    // The ported token reveal (packages/client/src/features/chat-reveal/): characters arriving in
    // a streaming container are registered as named highlights from the faintest
    // step, they are gone once faded, and the preference withdraws the engine
    // whole.
    await probe.onlyFor(['chat-reveal'], async function () {
      var revealPeek = function () {
        var registry = window.CSS ? window.CSS.highlights : null
        var total = 0
        var steps = 0
        if (registry) {
          for (var step = 0; step < 24; step += 1) {
            var found = registry.get('dsh-claude-tok-' + step)
            var size = found ? found.size : 0
            total += size
            if (size > 0) steps += 1
          }
        }
        return { total: total, steps: steps, mark: document.body.hasAttribute('data-dsh-claude-chat-reveal') }
      }
      var revealContainer = document.createElement('div')
      revealContainer.setAttribute('data-streaming', '')
      revealContainer.textContent = 'Hello there'
      document.body.appendChild(revealContainer)
      await sleep(80)
      var revealOpening = revealPeek()
      revealContainer.firstChild.data = 'Hello there, more'
      await sleep(80)
      var revealGrown = revealPeek()
      await sleep(450)
      var revealSettled = revealPeek()
      window.__pushForm({ chatAnimations: false })
      await sleep(150)
      var revealOff = revealPeek()
      window.__pushForm({ chatAnimations: true })
      await sleep(150)
      var revealBack = revealPeek()
      // The animation choice: "reduced" withdraws the engine the same way the
      // preference does (D26 — the resolved choice, not the system query).
      window.__pushForm({ motion: 'reduced' })
      await sleep(150)
      var revealReduced = revealPeek()
      window.__pushForm({ motion: 'system' })
      await sleep(150)
      // And the system setting flipping underneath "follow the system": the
      // resolved attribute moves, the preference stream is re-run and a running
      // engine goes with it (packages/client/src/core/prefs.ts, refreshMotionAttribute).
      window.__setSystemReduced(true)
      await sleep(250)
      var revealFlipReduced = revealPeek()
      window.__setSystemReduced(false)
      await sleep(250)
      var revealFlipBack = revealPeek()
      revealContainer.remove()
      r.reveal = {
        opening: revealOpening, grown: revealGrown, settled: revealSettled, off: revealOff, back: revealBack,
        reduced: revealReduced, systemFlip: { reduced: revealFlipReduced, back: revealFlipBack },
      }
    })
  })
})()
