/**
 * The automatic folding (packages/client/src/features/chat-fold/): a running thinking
 * row and a running process group are opened at install, both fold back when their
 * section ends, and the reader’s own presses roll a door instead of snapping a body.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var r = probe.report

  probe.step(async function () {
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
      // The figures one holder lays out — the summary itself, or the band's copy
      // of it — read as the words around each standing digit; a roll's sizer
      // holds the digit too, so its text is no reading.
      var figuresOf = function (holder) {
        return Array.prototype.map.call(holder.querySelectorAll(':scope > .dsh-claude-process-summary-part'), function (part) {
          var words = part.querySelectorAll('.dsh-claude-process-summary-words')
          var digit = part.querySelector('.dsh-claude-process-summary-roll [data-dsh-claude-roll]:not([data-dsh-claude-roll="exit"])')
          return words[0].textContent + (digit === null ? '' : digit.textContent) + words[1].textContent
        }).join('')
      }
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
          // The summary's own figures: the band over a running one holds a copy
          // of them, which is read on its own below.
          text: figuresOf(summary),
          sentence: fit === null ? null : Math.round(fit.getBoundingClientRect().width),
          room: Math.round(room),
          headerWidth: foldHeader.clientWidth,
          running: summary.hasAttribute('data-dsh-claude-summary-running'),
          // The host's band over the running summary (shared/sweep-band.ts):
          // the two halves it runs, and the figures its copy holds.
          band: (function () {
            var band = summary.querySelector(':scope > .dsh-claude-sweep-band')
            if (band === null) return null
            return {
              animation: getComputedStyle(band).animationName + ', ' + getComputedStyle(band.firstElementChild).animationName,
              text: figuresOf(band.firstElementChild),
              // The copy's digits stand still while the summary's own roll.
              rolling: band.querySelector('[data-dsh-claude-roll="enter"], [data-dsh-claude-roll="exit"]') !== null,
            }
          })(),
          rolling: summary.querySelector('[data-dsh-claude-roll="enter"]') !== null,
          wordsShown: getComputedStyle(foldWords).display !== 'none',
          summaryShown: getComputedStyle(summary).display !== 'none',
        }
      }
      // The wording answers the room the header has, a frame or two behind a
      // change: a reading is taken once the page has settled.
      var settledSummary = async function () {
        await probe.settle()
        return summaryOf()
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
      // the host's words stop sweeping. The group carries no answer row, so it
      // is a stopped turn's group: the host folds it itself at the end, and the
      // skin opens it again, because a stopped turn's work is all the page has.
      const answeredGroup = document.getElementById('debugAnsweredGroup')
      const answeredBody = document.getElementById('debugAnsweredBody')
      const stoppedGroup = document.getElementById('debugStoppedGroup')
      const stoppedBody = document.getElementById('debugStoppedBody')
      const foldedBy = (body) => body.hasAttribute('hidden')
      foldThink.setAttribute('data-state', 'ok')
      foldWords.removeAttribute('data-shimmer')
      foldWords.textContent = 'Worked'
      stoppedBody.setAttribute('hidden', 'until-found')
      await probe.settle()
      r.fold.after = {
        thinkOpen: foldThink.hasAttribute('data-expanded'),
        groupOpen: !foldBody.hasAttribute('hidden'),
        summary: summaryOf(),
        clicks: Object.assign({}, window.__foldClicks),
      }
      // The two turn groups: one whose turn ends with an answer row stays as the
      // host left it, one whose turn was stopped is opened again after the host
      // folds it.
      r.fold.turnGroups = {
        answeredOpen: !foldedBy(answeredBody),
        stoppedOpen: !foldedBy(stoppedBody),
        stoppedGroupPresent: stoppedGroup.isConnected,
        answeredGroupPresent: answeredGroup.isConnected,
      }
      // The stopped turn's answer arrives late (a restored transcript): the
      // group it belongs to closes like any answered one.
      const lateAnswer = document.createElement('div')
      lateAnswer.setAttribute('data-chat-flow-kind', 'assistant-step')
      lateAnswer.setAttribute('data-chat-turn', '2')
      stoppedGroup.after(lateAnswer)
      await probe.settle()
      r.fold.stoppedLateAnswer = { open: !foldedBy(stoppedBody) }
      // The reasoning's streamed window (reasoning-stream.ts, transitions.dev's
      // "Reasoning stream"): the window takes the text's own height up to the cap
      // reasoning may reach, and only at that cap does the text step up on the
      // snippet's clock behind a mask. The first row is grown three lines at a
      // time, and read once the page has settled after each growth, so the
      // window is read while it grows and again once it is held at the cap; the
      // second stands over the cap from the start, and every frame of its steps
      // is recorded until they stop at the newest line.
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
      // This case holds the optional two-line window; the continuous choice has
      // its own end-to-end scenario (reasoning-stream.mjs).
      window.__pushForm({ reasoningDisplay: 'stepped' })
      await probe.settle()
      foldThink.setAttribute('data-state', 'running')
      // The row reopens for the reasoning: the fold closes it when the phase
      // turns ok, and the window's own reading is of a running, open row.
      r.fold.reasonGrow = await probe.watch(function () { return windowOf(reasonBody, reasonText) })
      r.fold.reasonWindow = [windowOf(growBody, growText)]
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
        await probe.settle()
      }
      for (var growRound = 0; growRound < 3; growRound += 1) {
        await growMore()
        r.fold.reasonWindow.push(windowOf(growBody, growText))
      }
      // The reasoning stops and the reader opens the row: the window is off and
      // the whole text stands in the host's own body again. The capped row's own
      // phase end goes with it, so the window's exit is read as well.
      r.fold.reasonStopped = windowOf(reasonBody, reasonText)
      document.getElementById('debugGrow').setAttribute('data-state', 'ok')
      document.getElementById('debugThink').setAttribute('data-state', 'ok')
      await probe.settle()
      r.fold.reasonClosed = windowOf(reasonBody, reasonText)
      r.fold.reasonGrewClosed = windowOf(growBody, growText)
      document.getElementById('debugThinkRow').click()
      await probe.settle()
      r.fold.reasonOpen = windowOf(growBody, growText)
      // The fold glide on the reader's own press: the click is intercepted, the
      // real element is pressed with the door marked, and the click is handed back
      // afterwards so the host collapses it.
      var disclosure = document.getElementById('debugDisclosure')
      var disclosureBody = function () { return document.getElementById('debugDisclosureBody') }
      var disclosureBefore = window.__disclosureClicks
      // One door, every frame from the press until the page settles: what the
      // frames that carried the door showed, and how the last one stands.
      var doorOf = function (bodyOf, clicksSince) {
        return function () {
          var body = bodyOf()
          return {
            present: body !== null,
            rolling: body !== null && body.hasAttribute('data-dsh-claude-rolling'),
            clipped: body !== null && body.style.overflow === 'hidden',
            rollingAnywhere: document.querySelector('[data-dsh-claude-rolling]') !== null,
            clicks: clicksSince(),
          }
        }
      }
      var rollOf = function (frames) {
        var during = frames.filter(function (frame) { return frame.rolling })
        return {
          rolling: during.length > 0,
          clipped: during.length > 0 && during.every(function (frame) { return frame.clipped }),
          clicksDuringRoll: during.length === 0 ? null : Math.max.apply(null, during.map(function (frame) { return frame.clicks })),
          inserted: frames.some(function (frame) { return frame.present }),
          last: frames[frames.length - 1],
        }
      }
      var disclosureDoor = doorOf(disclosureBody, function () { return window.__disclosureClicks - disclosureBefore })
      disclosure.click()
      var closing = rollOf(await probe.watch(disclosureDoor))
      r.fold.glide = {
        rolling: closing.rolling,
        clipped: closing.clipped,
        clicksDuringRoll: closing.clicksDuringRoll,
        after: { bodyGone: !closing.last.present, rollingAnywhere: closing.last.rollingAnywhere, clicks: closing.last.clicks },
      }
      // The opening direction: the press is remembered as an intent, the host
      // inserts the body, and the door rolls it open.
      disclosure.click()
      var opening = rollOf(await probe.watch(disclosureDoor))
      r.fold.glide.open = { inserted: opening.inserted, rolling: opening.rolling }
      r.fold.glide.openAfter = { present: opening.last.present, rolling: opening.last.rolling }
      // The reader's own press in this phase: the module leaves it alone.
      foldHeader.click()
      await probe.settle()
      r.fold.readerOpen = !foldBody.hasAttribute('hidden')

      // A message the reader sent, taller than the cap (message-fold.ts): the
      // skin clamps the bubble and softens its bottom edge, and the control it
      // draws under the bubble hands the whole message back. The bubble is the
      // element that paints a fill, which is how the module finds it.
      var foldedColumn = document.createElement('div')
      foldedColumn.setAttribute('data-chat-flow', '')
      var foldedRow = document.createElement('div')
      foldedRow.setAttribute('data-chat-flow-kind', 'user')
      var foldedBubble = document.createElement('div')
      foldedBubble.style.background = 'rgb(20, 20, 19)'
      // The message arrives before its own words do (the host mounts the row, the
      // fill and the text land after): the box moves once they land, and that is
      // when the fold has to be decided — a long message standing whole through
      // the whole turn was the page bug this covers.
      var foldedWords = document.createElement('div')
      foldedWords.style.height = '200px'
      foldedBubble.appendChild(foldedWords)
      foldedRow.appendChild(foldedBubble)
      foldedColumn.appendChild(foldedRow)
      document.body.appendChild(foldedColumn)
      await probe.settle()
      var messageOf = function () {
        var toggle = foldedRow.querySelector('.dsh-claude-message-fold-toggle')
        var style = getComputedStyle(foldedBubble)
        return {
          marked: foldedBubble.getAttribute('data-dsh-claude-message-fold'),
          capped: Math.round(foldedBubble.clientHeight),
          full: Math.round(foldedBubble.scrollHeight),
          cap: Math.round(parseFloat(style.getPropertyValue('--dsh-claude-message-fold-cap')) || 0),
          mask: style.maskImage,
          toggle: toggle === null ? null : toggle.textContent,
        }
      }
      r.fold.messageShort = messageOf()
      foldedWords.style.height = '900px'
      await probe.settle()
      r.fold.message = messageOf()
      var foldedToggle = foldedRow.querySelector('.dsh-claude-message-fold-toggle')
      foldedToggle.click()
      await probe.settle()
      r.fold.messageOpen = messageOf()
      foldedColumn.remove()
      await probe.settle()
      // A row the host wraps in a header: the door has to step out of that
      // wrapper for its body, and the accessory beside the row is not it.
      var wrappedRow = document.getElementById('debugWrappedRow')
      var wrappedAccessory = document.getElementById('debugWrappedAccessory')
      var wrappedBody = function () { return document.getElementById('debugWrappedBody') }
      var wrappedBefore = window.__wrappedClicks
      var wrappedDoor = doorOf(wrappedBody, function () { return window.__wrappedClicks - wrappedBefore })
      var accessoryRolled = false
      wrappedRow.click()
      var rolled = rollOf(await probe.watch(function () {
        if (wrappedAccessory.hasAttribute('data-dsh-claude-rolling')) accessoryRolled = true
        return wrappedDoor()
      }))
      r.fold.wrappedRolled = {
        rolling: rolled.rolling,
        clipped: rolled.clipped,
        accessoryRolled: accessoryRolled,
        clicksDuringRoll: rolled.clicksDuringRoll,
        bodyGone: !rolled.last.present,
        folded: wrappedRow.getAttribute('aria-expanded') === 'false',
        clicks: rolled.last.clicks,
      }
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
      // The wrapped family: the body standing after the header carries the fade,
      // and the accessory beside the row inside it keeps the page's own reading.
      // That reading is taken on a bare span first, so a page-wide transition
      // cannot answer for the entrance rule.
      var bareSpan = document.createElement('span')
      foldFlow.appendChild(bareSpan)
      var pageSpan = getComputedStyle(bareSpan).transitionDuration
      bareSpan.remove()
      var wrappedEntranceOf = function () {
        var header = document.createElement('div')
        header.setAttribute('data-disclosure-header', '')
        var row = document.createElement('div')
        row.setAttribute('data-disclosure-row', '')
        var accessory = document.createElement('span')
        accessory.textContent = 'accessory'
        var body = document.createElement('div')
        body.textContent = 'probe body'
        header.appendChild(row)
        header.appendChild(accessory)
        foldFlow.appendChild(header)
        foldFlow.appendChild(body)
        var value = {
          body: getComputedStyle(body).transitionDuration,
          accessory: getComputedStyle(accessory).transitionDuration,
          page: pageSpan,
        }
        header.remove()
        body.remove()
        return value
      }
      r.fold.entranceOn = entranceOf()
      r.fold.entranceWrapped = wrappedEntranceOf()
      window.__pushForm({ chatAnimations: false })
      await probe.settle()
      var offBefore = window.__disclosureClicks
      disclosure.click()
      var offImmediate = window.__disclosureClicks - offBefore
      await probe.settle()
      r.fold.animationsOff = {
        mark: document.body.hasAttribute('data-dsh-claude-chat-fold'),
        entrance: entranceOf(),
        wrappedEntrance: wrappedEntranceOf(),
        immediateClicks: offImmediate,
        rolling: document.querySelector('[data-dsh-claude-rolling]') !== null,
      }
      window.__pushForm({ chatAnimations: true })
      await probe.settle()
      r.fold.animationsBack = { mark: document.body.hasAttribute('data-dsh-claude-chat-fold') }
    })
  })
})()
