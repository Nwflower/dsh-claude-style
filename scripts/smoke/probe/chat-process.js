/**
 * The redraw process lane (packages/client/src/features/chat-process/): the
 * segments a turn's process folds into at its formal outputs, the figures on
 * the whole-turn control, the reader's own choices, and the thinking row's
 * automatic glide.
 *
 * The stand-in's script models the host: the whole-turn control folds and
 * unfolds every group body and member row, and a group's header flips its own
 * body. What the case measures is the lane's reading of that — which rows it
 * folds, which marks it writes, what it hands back, and how it walks a running
 * thinking row after its text.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['chat-process'], async function () {
      var flow = document.getElementById('processFlow')
      var control = document.getElementById('processControl')
      var bodyA = document.getElementById('processBodyA')
      var headerA = document.getElementById('processHeaderA')
      var note = document.getElementById('processNote')
      var tool2 = document.getElementById('processTool2')
      var think1 = document.getElementById('processThink1')
      var tool1 = document.getElementById('processTool1')
      var summaryOf = function () { return document.querySelector('[data-dsh-claude-process-segment]') }
      var folds = function () { return document.querySelectorAll('[data-segment-folded]').length }
      var held = function () { return document.querySelectorAll('[data-dsh-claude-process-lane]').length }
      var foldedRow = function (id) { return document.getElementById(id).hasAttribute('data-segment-folded') }
      // The reader asked for the redraw tier; the lane installs with the chunk.
      window.__pushForm({ chatAnimations: 'redraw' })
      await sleep(700)
      var summary = summaryOf()
      r.process = {
        marked: document.body.hasAttribute('data-dsh-claude-chat-process'),
        counts: control.getAttribute('data-dsh-claude-process-counts'),
        label: control.textContent.replace(/\s+/g, ' ').trim(),
        summaries: document.querySelectorAll('[data-dsh-claude-process-segment]').length,
        figures: summary === null ? null : summary.querySelector('button').getAttribute('aria-label'),
        rolls: document.querySelectorAll('[data-dsh-claude-number-roll]').length,
        // The work before the intermediate output is folded; the output itself
        // and the work after it stand where the reader can read them.
        foldedWork: foldedRow('processThink1') && foldedRow('processTool1'),
        noteShown: !foldedRow('processNote'),
        laterShown: !foldedRow('processTool2') && !foldedRow('processThink2'),
        laterHidden: !document.getElementById('processThink2').hasAttribute('hidden'),
      }
      // The running thinking row: the lane opens the row the host rendered
      // folded, and the live figures ride the host's running line.
      var liveRow = document.getElementById('processLiveThink')
      var liveStatus = document.getElementById('processLiveStatus')
      var liveStyle = getComputedStyle(liveStatus)
      var liveText = document.getElementById('processLiveStatusText')
      var figures = getComputedStyle(liveStatus, '::after')
      r.process.live = {
        opened: liveRow.hasAttribute('data-expanded'),
        bodyShown: !document.getElementById('processLiveBody').hasAttribute('hidden'),
        clicks: window.__processClicks.think,
        counts: liveStatus.getAttribute('data-dsh-claude-process-counts'),
        after: figures.content,
        figuresColor: figures.color,
        // The reference's own status line: the secondary label colour at the
        // content font size, everything on the line the label sits on.
        style: {
          direction: liveStyle.flexDirection,
          wrap: liveStyle.flexWrap,
          color: liveStyle.color,
          size: liveStyle.fontSize,
          lineHeight: liveStyle.lineHeight,
          sameLine: Math.abs(liveText.getBoundingClientRect().top - liveStatus.getBoundingClientRect().top) < 4,
          dividerFull: getComputedStyle(liveStatus.children[1]).flexBasis,
          labelFill: getComputedStyle(document.getElementById('processLiveStatusLabel')).webkitTextFillColor,
          labelAnimation: getComputedStyle(document.getElementById('processLiveStatusLabel')).animationName,
          labelClip: getComputedStyle(document.getElementById('processLiveStatusLabel')).webkitBackgroundClip,
          iconFill: getComputedStyle(document.getElementById('processLiveStatusIcon')).webkitTextFillColor,
        },
      }
      // The thinking row's glide: while the row runs, the lane walks its track
      // after the text at a reading pace.
      var view = document.getElementById('processLiveBody')
      var track = document.querySelector('[data-dsh-claude-think-track]')
      var trackTop = function () {
        var moved = view.querySelector('[data-dsh-claude-think-track]')
        return moved === null ? null : new DOMMatrixReadOnly(getComputedStyle(moved).transform).m42
      }
      r.process.glideStart = {
        wrapped: track !== null,
        top: trackTop(),
        mode: view.getAttribute('data-dsh-claude-think-mode'),
        edges: view.getAttribute('data-dsh-claude-think-edges'),
      }
      await sleep(1700)
      r.process.glideMoved = {
        top: trackTop(),
        transform: view.querySelector('[data-dsh-claude-think-track]').style.transform,
        edges: view.getAttribute('data-dsh-claude-think-edges'),
        // The preview height is the reference's: the viewport never grows past it.
        preview: Math.round(view.getBoundingClientRect().height),
      }
      // The reader's own wheel takes the row back: the lane unwraps its track
      // and leaves the position to native scrolling.
      view.dispatchEvent(new WheelEvent('wheel', { deltaY: 40, bubbles: true, cancelable: true }))
      await sleep(120)
      r.process.glideHanded = {
        wrapped: view.querySelector('[data-dsh-claude-think-track]') !== null,
        mode: view.getAttribute('data-dsh-claude-think-mode'),
        edges: view.getAttribute('data-dsh-claude-think-edges'),
        scrollTop: Math.round(view.scrollTop),
        clientHeight: view.clientHeight,
        scrollHeight: view.scrollHeight,
        overflow: getComputedStyle(view).overflowY,
        transform: view.querySelector('[data-dsh-claude-think-track]') === null ? null : view.querySelector('[data-dsh-claude-think-track]').style.transform,
      }
      // The answer's own entrance: a block the host appends is faded in on the
      // reference's clock, one absolute animation per arrival.
      var arrived = window.__processAppendParagraph('新到的一段。')
      await sleep(40)
      var entrance = arrived.getAnimations()[0]
      r.process.reveal = {
        marked: arrived.hasAttribute('data-dsh-claude-stream-reveal'),
        animations: arrived.getAnimations().length,
        duration: entrance === undefined ? null : entrance.effect.getTiming().duration,
        easing: entrance === undefined ? null : entrance.effect.getTiming().easing,
        started: entrance === undefined ? null : Math.round(entrance.startTime),
        opacity: getComputedStyle(arrived).opacity,
      }
      await sleep(500)
      r.process.revealDone = { marked: arrived.hasAttribute('data-dsh-claude-stream-reveal'), opacity: getComputedStyle(arrived).opacity }
      // The status line's swap: the copy changes, the line leaves and the next
      // one rises in at the reference's two-phase timing.
      var status = document.getElementById('processStatus')
      var lineOf = function () { return getComputedStyle(status, '::after').transform }
      status.setAttribute('data-dsh-claude-turn-status', '正在调用工具')
      await sleep(80)
      r.process.statusOut = { phase: status.getAttribute('data-dsh-claude-status-swap'), transform: lineOf() }
      await sleep(400)
      r.process.statusSettled = { phase: status.getAttribute('data-dsh-claude-status-swap'), transform: lineOf() }
      // The tier's own tail follow: the scroller is pinned at the end, and new
      // content is walked toward rather than jumped to.
      var scroller = document.getElementById('processScroller')
      // The reader rests at the end and lets the browser deliver his own
      // position before content arrives: growth must not read as him leaving.
      scroller.scrollTop = scroller.scrollHeight
      await sleep(80)
      window.__processGrowScroller()
      await sleep(40)
      var midWalk = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop
      await sleep(700)
      r.process.follow = { 
        midWalk: Math.round(midWalk),
        endGap: Math.round(scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop),
      }
      // The motions the host's own rows carry: the running call's living edge,
      // the compaction divider's arrival, the status line's sweep, and a figure
      // opening its own line.
      var runningDot = getComputedStyle(document.querySelector('#processRunningCall [data-state="running"]'), '::before')
      var compaction = getComputedStyle(document.getElementById('processCompaction'))
      var dial = getComputedStyle(document.getElementById('processCompactionDial'))
      var statusLive = getComputedStyle(document.getElementById('processStatus'), '::after')
      var part = document.querySelector('[data-dsh-claude-segment-part]')
      r.process.rows = {
        running: {
          animation: runningDot.animationName,
          duration: runningDot.animationDuration,
          dot: `${runningDot.width}/${runningDot.height}`,
        },
        compaction: { animation: compaction.animationName, duration: compaction.animationDuration },
        dial: { animation: dial.animationName, duration: dial.animationDuration, delay: dial.animationDelay },
        status: { animation: statusLive.animationName, duration: statusLive.animationDuration },
        partOpen: part === null ? null : { rows: getComputedStyle(part).gridTemplateRows, opacity: getComputedStyle(part).opacity, marked: part.hasAttribute('data-dsh-claude-part-in') },
      }
      if (part !== null) {
        part.removeAttribute('data-dsh-claude-part-in')
        void part.getBoundingClientRect()
        r.process.rows.partStart = { rows: getComputedStyle(part).gridTemplateRows, opacity: getComputedStyle(part).opacity }
        part.setAttribute('data-dsh-claude-part-in', '')
      }
      // The reader's own press on the running thinking row is his: the lane
      // does not open it again while the row is still in that phase.
      var thinkClicksBefore = window.__processClicks.think
      document.getElementById('processLiveControl').click()
      await sleep(360)
      r.process.readerFolded = {
        opened: document.getElementById('processLiveThink').hasAttribute('data-expanded'),
        bodyShown: !document.getElementById('processLiveBody').hasAttribute('hidden'),
        clicksBefore: thinkClicksBefore,
        clicks: window.__processClicks.think,
      }
      // The reader's own press on a segment's summary opens that segment alone.
      summaryOf().querySelector('button').click()
      await sleep(420)
      r.process.reopened = {
        folds: folds(),
        expanded: summaryOf().querySelector('button').getAttribute('aria-expanded'),
        workShown: !foldedRow('processThink1') && !foldedRow('processTool1'),
      }
      // A group the reader closed himself stays closed and keeps its header: the
      // lane does not press that header again, so his press is the last one.
      var clicksBefore = window.__processClicks.headerA
      headerA.click()
      await sleep(320)
      r.process.readerClosed = {
        bodyAOpen: !bodyA.hasAttribute('hidden'),
        headA: headerA.parentElement.hasAttribute('data-dsh-claude-process-head'),
        clicksBefore: clicksBefore,
        clicks: window.__processClicks.headerA,
      }
      // The turn closes: the lane takes its summaries off and shrinks the
      // process, then hands it back to the host's own hidden attribute.
      control.click()
      await sleep(140)
      r.process.closing = { held: held(), summaries: document.querySelectorAll('[data-dsh-claude-process-segment]').length }
      await sleep(900)
      r.process.closed = {
        held: held(),
        summaries: document.querySelectorAll('[data-dsh-claude-process-segment]').length,
        folds: folds(),
        counts: control.getAttribute('data-dsh-claude-process-counts'),
      }
      // Opening again brings the segments back.
      control.click()
      await sleep(320)
      r.process.openedAgain = {
        summaries: document.querySelectorAll('[data-dsh-claude-process-segment]').length,
        figures: summaryOf() === null ? null : summaryOf().querySelector('button').getAttribute('aria-label'),
        folds: folds(),
        held: held(),
        clicks: window.__processClicks.control,
      }
    })
  })
})()
