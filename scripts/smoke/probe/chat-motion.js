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
      // The header's counted summary: the skin's span after the host's words,
      // which step aside, the wording the header has room for, and the sentence
      // as the header's name. The width check's own numbers come along, so a
      // failing case carries them.
      var foldWords = document.getElementById('debugGroupWords')
      var summaryOf = function () {
        var summary = foldHeader.querySelector('.dsh-claude-process-summary')
        if (summary === null) return null
        var fit = summary.querySelector('.dsh-claude-process-summary-fit')
        var style = getComputedStyle(foldHeader)
        var parentStyle = getComputedStyle(foldGroup)
        var gap = parseFloat(style.columnGap) || 0
        // The room the control may spend, measured the way the module measures it.
        var room = foldGroup.clientWidth - (parseFloat(parentStyle.paddingLeft) || 0) - (parseFloat(parentStyle.paddingRight) || 0)
          - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0)
          - (parseFloat(style.borderLeftWidth) || 0) - (parseFloat(style.borderRightWidth) || 0)
        for (var i = 0; i < foldHeader.children.length; i++) {
          var child = foldHeader.children[i]
          if (child === summary) continue
          var width = child.getBoundingClientRect().width
          if (width > 0) room -= width + gap
        }
        return {
          marked: foldGroup.hasAttribute('data-dsh-claude-summary'),
          name: foldHeader.getAttribute('aria-label'),
          form: summary.getAttribute('data-dsh-claude-summary-form'),
          text: Array.prototype.map.call(summary.querySelectorAll('.dsh-claude-process-summary-part'), function (part) {
            var words = part.querySelectorAll('.dsh-claude-process-summary-words')
            var digit = part.querySelector('.dsh-claude-process-summary-roll [data-dsh-claude-roll]:not([data-dsh-claude-roll="exit"])')
            return words[0].textContent + (digit === null ? '' : digit.textContent) + words[1].textContent
          }).join(''),
          sentence: fit === null ? null : Math.round(fit.getBoundingClientRect().width),
          room: Math.round(room),
          headerWidth: foldHeader.clientWidth,
          running: summary.hasAttribute('data-dsh-claude-summary-running'),
          rolling: summary.querySelector('[data-dsh-claude-roll="enter"]') !== null,
          wordsShown: getComputedStyle(foldWords).display !== 'none',
          summaryShown: getComputedStyle(summary).display !== 'none',
        }
      }
      // The wording answers the room the header has, a frame or two behind a
      // change: a reading is taken once it has stopped moving.
      var settledSummary = async function () {
        var last = null
        for (var round = 0; round < 20; round += 1) {
          await sleep(50)
          var now = summaryOf()
          if (last !== null && last.form === now.form && last.text === now.text) return now
          last = now
        }
        return last
      }
      r.fold = {
        thinkOpen: foldThink.hasAttribute('data-expanded'),
        groupOpen: !foldBody.hasAttribute('hidden'),
        summary: await settledSummary(),
        expandedUntouched: !foldExpandedBody.hasAttribute('hidden'),
        clicks: Object.assign({}, window.__foldClicks),
      }
      // Another call arrives in the group: its figure rolls to the new count.
      var moreCall = document.createElement('div')
      moreCall.setAttribute('data-chat-flow-kind', 'tool-call')
      moreCall.textContent = 'another call'
      document.getElementById('debugGroupContent').appendChild(moreCall)
      r.fold.grown = await settledSummary()
      // A header too narrow for the sentence falls back to the compact figures,
      // and takes the sentence back when the room returns.
      foldGroup.style.width = '120px'
      r.fold.narrow = await settledSummary()
      foldGroup.style.width = ''
      r.fold.wide = await settledSummary()
      // The reasoning stops and the process section ends: both fold back, and
      // the host's words stop sweeping.
      foldThink.setAttribute('data-state', 'ok')
      foldWords.removeAttribute('data-shimmer')
      foldWords.textContent = 'Worked'
      await sleep(450)
      r.fold.after = {
        thinkOpen: foldThink.hasAttribute('data-expanded'),
        groupOpen: !foldBody.hasAttribute('hidden'),
        summary: summaryOf(),
        clicks: Object.assign({}, window.__foldClicks),
      }
      // The reasoning's streamed window (reasoning-stream.ts, transitions.dev's
      // "Reasoning stream"): the window takes the text's own height up to the cap
      // reasoning may reach, and only at that cap does the text step up on the
      // snippet's clock behind a mask. The first row is grown three lines between
      // waits, so the window is read while it grows and again once it is held at
      // the cap; the second stands over the cap from the start.
      var growBody = document.getElementById('debugThinkBody')
      var growText = document.getElementById('debugThinkText')
      var reasonBody = document.getElementById('debugGrowBody')
      var reasonText = document.getElementById('debugGrowText')
      var windowOf = function (body, text) {
        var style = getComputedStyle(body)
        var textStyle = getComputedStyle(text)
        var matrix = /matrix\(1, 0, 0, 1, 0, (-?[\d.]+)\)/.exec(textStyle.transform)
        return {
          on: body.hasAttribute('data-dsh-claude-reason-window'),
          capped: body.hasAttribute('data-dsh-claude-reason-capped'),
          slotHeight: Math.round(body.getBoundingClientRect().height),
          bodyHeight: Math.round(body.closest('[data-variant="think"]').getBoundingClientRect().height),
          maxHeight: style.maxHeight,
          mask: (style.maskImage === 'none' ? style.webkitMaskImage : style.maskImage).slice(0, 44),
          textHeight: Math.round(text.getBoundingClientRect().height),
          offset: matrix === null ? 0 : -Number(matrix[1]),
          transform: textStyle.transform,
          transition: textStyle.getPropertyValue('transition-property') + ' ' + textStyle.getPropertyValue('transition-duration'),
        }
      }
      // The row reopens for the reasoning: the fold closes it when the phase
      // turns ok, and the window's own reading is of a running, open row.
      foldThink.setAttribute('data-state', 'running')
      await sleep(300)
      r.fold.reasonWindow = [windowOf(growBody, growText)]
      r.fold.reasonGrow = [windowOf(reasonBody, reasonText)]
      var growLine = 3
      var growMore = async function () {
        for (var added = 0; added < 3; added += 1) {
          growLine += 1
          growText.appendChild(document.createElement('br'))
          growText.appendChild(document.createTextNode('接着想第 ' + growLine + ' 行。'))
        }
        // The fold's observer queues a row for an attribute change, which is how
        // a live stream reaches the window between steps.
        document.getElementById('debugThink').setAttribute('data-state', 'ok')
        document.getElementById('debugThink').setAttribute('data-state', 'running')
        await sleep(1100)
      }
      for (var growRound = 0; growRound < 3; growRound += 1) {
        await growMore()
        r.fold.reasonWindow.push(windowOf(growBody, growText))
      }
      for (var wait = 0; wait < 3; wait += 1) {
        await sleep(1100)
        r.fold.reasonGrow.push(windowOf(reasonBody, reasonText))
      }
      // The reasoning stops and the reader opens the row: the window is off and
      // the whole text stands in the host's own body again. The capped row's own
      // phase end goes with it, so the window's exit is read as well.
      r.fold.reasonStopped = windowOf(reasonBody, reasonText)
      document.getElementById('debugGrow').setAttribute('data-state', 'ok')
      document.getElementById('debugThink').setAttribute('data-state', 'ok')
      await sleep(1400)
      r.fold.reasonClosed = windowOf(reasonBody, reasonText)
      r.fold.reasonGrewClosed = windowOf(growBody, growText)
      await sleep(200)
      document.getElementById('debugThinkRow').click()
      await sleep(200)
      r.fold.reasonOpen = windowOf(growBody, growText)
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
