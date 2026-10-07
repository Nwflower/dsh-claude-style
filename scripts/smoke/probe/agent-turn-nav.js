/**
 * The turn-navigator case: the host's turn rail with the skin's rail beside it in
 * the same slot, the card its pointer opens, the press and the Alt+↑ keys that
 * drive the host's marks, and the switch that hands the rail back and stands it
 * in again.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    // The conversation navigator: the host's turn rail, built the way ui-chat
    // renders it — a nav in its slot in the conversation's scroller, one mark
    // per turn carrying its list position, the reading position's mark
    // current, the marks inside a scroller whose content is count × 10 + 2
    // pixels tall — over chat rows that carry their turn. A press on the
    // host's mark is recorded, which is the whole of what the host's own jump
    // starts from. The skin's rail stands in the same slot.
    await probe.onlyFor(['turn-nav'], async function () {
      var navPhase = document.createElement('div')
      navPhase.setAttribute('data-phase', 'active')
      var navMarks = ''
      for (var ni = 0; ni < 5; ni++) {
        navMarks += '<button type="button" data-index="' + ni + '"' + (ni === 4 ? ' aria-current="true"' : '') +
          ' style="position:absolute;left:0;right:0;height:10px;top:' + (1 + ni * 10) + 'px"></button>'
      }
      navPhase.innerHTML = '<div data-conversation-session="smoke-nav"><div data-conversation-scroll="" style="height:400px;overflow:auto">' +
        '<div class="_t_slot_1" style="position:relative;height:300px"><nav class="_t_frame_1" style="position:fixed;right:12px;top:100px;width:28px">' +
        '<div class="_t_scroller_1" style="position:relative;overflow:auto;max-height:200px"><div class="_t_marks_1" style="position:relative;height:52px">' + navMarks + '</div></div>' +
        '<div role="tooltip">host preview</div></nav></div>' +
        '<div data-chat-flow="" style="display:flex;flex-direction:column">' +
        '<div data-chat-flow-kind="user" data-chat-turn="4">fourth question</div>' +
        '<div data-chat-flow-kind="assistant-step" data-chat-turn="4">fourth answer</div>' +
        '<div data-chat-flow-kind="user" data-chat-turn="5">fifth question</div></div></div></div>'
      document.body.appendChild(navPhase)
      var navRail = navPhase.querySelector('nav')
      var navPresses = []
      navRail.addEventListener('click', function (event) {
        var mark = event.target.closest('button[data-index]')
        if (mark !== null) navPresses.push(Number(mark.dataset.index))
      })
      var pressKey = function (key, extra) {
        var event = new KeyboardEvent('keydown', Object.assign({ key: key, altKey: true, bubbles: true, cancelable: true }, extra || {}))
        document.body.dispatchEvent(event)
        return event.defaultPrevented
      }
      await sleep(150)
      var skinRail = navPhase.querySelector('.dsh-claude-turn-rail')
      var skinMarks = skinRail === null ? [] : Array.prototype.slice.call(skinRail.querySelectorAll('.dsh-claude-turn-rail-mark'))
      var skinCurrent = skinRail === null ? null : skinRail.querySelector('.dsh-claude-turn-rail-mark[data-current]')
      var navOut = {
        rail: {
          hostHidden: getComputedStyle(navRail).visibility,
          inSlot: skinRail !== null && skinRail.parentElement === navRail.parentElement,
          marks: skinMarks.length,
          unloaded: skinMarks.map(function (mark) { return mark.hasAttribute('data-unloaded') }),
          current: skinMarks.indexOf(skinCurrent),
        },
      }
      r.turnNav = navOut
      var skinRect = skinRail.getBoundingClientRect()
      var markTop = skinCurrent === null ? null : skinCurrent.getBoundingClientRect().top
      skinRail.dispatchEvent(new PointerEvent('pointerenter'))
      var navCard = document.querySelector('.dsh-claude-turn-nav')
      navOut.openAtOnce = navCard === null ? null : navCard.getAttribute('data-open')
      await sleep(250)
      var navRows = navCard === null ? [] : Array.prototype.slice.call(navCard.querySelectorAll('.dsh-claude-turn-nav-row'))
      var navCurrent = navCard === null ? null : navCard.querySelector('[data-current]')
      navOut.open = {
        open: navCard === null ? null : navCard.getAttribute('data-open'),
        // In the rail's slot, inside the conversation pane: a pointer on the card is on the pane.
        inSlot: navCard !== null && navCard.parentElement === navRail.parentElement,
        railMarked: skinRail.hasAttribute('data-dsh-claude-turn-nav-open'),
        marksFaded: getComputedStyle(skinRail.querySelector('.dsh-claude-turn-rail-track')).opacity,
        rows: navRows.map(function (row) { return row.textContent }),
        labels: navRows.map(function (row) { return row.getAttribute('aria-label') }),
        current: navCurrent === null ? null : navCurrent.dataset.index,
        rowGap: navCurrent === null || markTop === null ? null : Math.round(navCurrent.getBoundingClientRect().top - markTop),
        dashGap: navCurrent === null ? null : Math.round(navCurrent.querySelector('.dsh-claude-turn-nav-dash').getBoundingClientRect().right - skinRect.right),
      }
      navRows[3].click()
      await sleep(100)
      navOut.rowPress = navPresses.slice()
      var landed = document.querySelector('[data-dsh-claude-turn-nav-landed]')
      navOut.rowLanding = landed === null ? null : landed.textContent
      navCard.dispatchEvent(new MouseEvent('mouseleave'))
      await sleep(250)
      navOut.closed = { open: navCard.getAttribute('data-open'), railMarked: skinRail.hasAttribute('data-dsh-claude-turn-nav-open') }
      navPresses.length = 0
      navOut.keys = {
        // From the current mark (the fifth turn) one up is the fourth, whose rows are loaded.
        up: pressKey('ArrowUp'),
        // Pressed again at once: on from the turn the last key went to, not back from the reading position.
        upAgain: pressKey('ArrowUp'),
        shifted: pressKey('ArrowUp', { shiftKey: true }),
        bare: pressKey('ArrowUp', { altKey: false }),
      }
      await sleep(100)
      navOut.keys.presses = navPresses.slice()
      var landedByKey = document.querySelector('[data-dsh-claude-turn-nav-landed]')
      navOut.keys.landing = landedByKey === null ? null : landedByKey.textContent
      // A draft in the composer keeps the arrow keys.
      var navDraft = document.createElement('textarea')
      navDraft.value = 'draft'
      document.body.appendChild(navDraft)
      navOut.keys.draft = (function () {
        var event = new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true, cancelable: true })
        navDraft.dispatchEvent(event)
        return event.defaultPrevented
      })()
      navDraft.remove()
      // The switch: off hands the host its rail back, on stands the skin's in again, live.
      var navSwitch = async function (on) {
        window.__pushForm({ turnNav: on })
        document.body.appendChild(document.createElement('i'))
        await sleep(300)
        return {
          rail: navPhase.querySelectorAll('.dsh-claude-turn-rail').length,
          hostReplaced: navRail.hasAttribute('data-dsh-claude-turn-nav-replaced'),
          hostShown: getComputedStyle(navRail).visibility,
        }
      }
      navOut.switchedOff = await navSwitch(false)
      navOut.switchedOn = await navSwitch(true)
      r.turnNav = navOut
    })
  })
})()
