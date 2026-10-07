/**
 * The chat-send case: a submission lifts a stand-in off the composer card, hides
 * the real row while it flies and puts everything back when it lands, and the
 * animation choice that leaves the row visible.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    // The ported send flight (packages/client/src/features/chat-send/): a submission lifts a
    // stand-in off the composer card, hides the real row while it flies, and puts
    // everything back when it lands.
    await probe.onlyFor(['chat-send'], async function () {
      var sendInput = document.getElementById('editor')
      var sendFlow = document.createElement('div')
      sendFlow.setAttribute('data-chat-flow', '')
      sendFlow.id = 'sendFlow'
      sendFlow.style.cssText = 'display:block;min-height:120px'
      // Right above the composer card, so both ends of the flight are on one screen.
      var sendCard = document.querySelector('[data-composer-card]')
      if (sendCard !== null && sendCard.parentElement !== null) sendCard.parentElement.insertBefore(sendFlow, sendCard)
      else document.body.insertBefore(sendFlow, document.body.firstChild)
      r.send = { inputFound: sendInput !== null }
      // The reader presses Enter in the draft: that is where the origin is taken.
      if (sendInput !== null) sendInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      await sleep(60)
      // The host mounts the echo bubble the moment the submission goes through.
      var sendEcho = document.createElement('div')
      sendEcho.setAttribute('data-submission-echo', '')
      sendEcho.innerHTML = '<div style="width:220px;height:44px;background:rgb(240,240,240);border-radius:18px;padding:8px 12px;font-size:15px;line-height:24px">hello world</div>'
      sendFlow.appendChild(sendEcho)
      await sleep(90)
      var sendGhost = document.querySelector('[data-dsh-claude-send-ghost]')
      r.send.flying = {
        ghost: sendGhost !== null,
        clone: sendGhost !== null && sendGhost.querySelector('[data-composer-card]') !== null,
        hidden: sendEcho.hasAttribute('data-dsh-claude-send-flight'),
        visibility: getComputedStyle(sendEcho).visibility,
        animations: sendGhost === null ? 0 : sendGhost.getAnimations({ subtree: true }).length,
      }
      await sleep(700)
      r.send.landed = {
        ghost: document.querySelector('[data-dsh-claude-send-ghost]') !== null,
        hidden: sendEcho.hasAttribute('data-dsh-claude-send-flight'),
        visibility: getComputedStyle(sendEcho).visibility,
      }
      sendEcho.remove()
      // The plate (send-morph.ts's shell). The shape carries the destination
      // bubble's own fill from the first frame: a fill of its own that has to be
      // grown out to meet the shape shows the page through the shape until it
      // gets there, which reads as the bubble turning pale and then blue.
      if (sendInput !== null) sendInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      await sleep(50)
      var plateEcho = document.createElement('div')
      plateEcho.setAttribute('data-submission-echo', '')
      plateEcho.innerHTML = '<div id="plateBubble" style="width:220px;height:44px;background:rgb(240,240,240);border-radius:18px;padding:8px 12px;font-size:15px;line-height:24px">plate</div>'
      sendFlow.appendChild(plateEcho)
      await sleep(16)
      var plateBox = document.getElementById('plateBubble').getBoundingClientRect()
      var plateFill = getComputedStyle(document.getElementById('plateBubble')).backgroundColor
      var plateFrames = 0
      var plateWrong = 0
      var plateLight = 0
      var plateStarted = Date.now()
      while (Date.now() - plateStarted < 400) {
        await sleep(16)
        var plateGhost = document.querySelector('[data-dsh-claude-send-ghost]')
        if (plateGhost === null) continue
        var plateNodes = plateGhost.querySelectorAll('div')
        var plateShell = null
        Array.prototype.forEach.call(plateNodes, function (node) {
          if (plateShell === null && getComputedStyle(node).overflow === 'hidden') plateShell = node
        })
        if (plateShell === null) continue
        plateFrames += 1
        if (getComputedStyle(plateShell).backgroundColor !== plateFill) plateWrong += 1
        // Anything light painting inside the destination is the card's surface
        // left over the bubble.
        Array.prototype.forEach.call(plateNodes, function (node) {
          var style = getComputedStyle(node)
          if (style.backgroundColor === plateFill || Number(style.opacity) <= 0.05) return
          var match = /rgb\((\d+), (\d+), (\d+)\)/.exec(style.backgroundColor)
          if (match === null) return
          if (!(Number(match[1]) > 235 && Number(match[2]) > 235 && Number(match[3]) > 235)) return
          var box = node.getBoundingClientRect()
          if (box.width < 4 || box.height < 4) return
          if (box.left >= plateBox.right || box.right <= plateBox.left || box.top >= plateBox.bottom || box.bottom <= plateBox.top) return
          plateLight += 1
        })
      }
      r.send.plate = { frames: plateFrames, wrong: plateWrong, light: plateLight }
      plateEcho.remove()
      await sleep(700)
      // The hand-over (send-flight.ts's land). The host can take the echo away
      // before the real row mounts; fading then carries the reader's message
      // into the page and puts it back when the row arrives, so the stand-in
      // holds until there is a row to land on.
      if (sendInput !== null) sendInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      await sleep(50)
      var holdEcho = document.createElement('div')
      holdEcho.setAttribute('data-submission-echo', '')
      holdEcho.innerHTML = '<div style="width:220px;height:44px;background:rgb(240,240,240);border-radius:18px;padding:8px 12px">held</div>'
      sendFlow.appendChild(holdEcho)
      await sleep(16)
      holdEcho.remove()
      await sleep(520)
      var holdGhost = document.querySelector('[data-dsh-claude-send-ghost]')
      r.send.hold = { ghost: holdGhost !== null, opacity: holdGhost === null ? 0 : Number(getComputedStyle(holdGhost).opacity) }
      var holdRow = document.createElement('div')
      holdRow.setAttribute('data-chat-flow-kind', 'user')
      holdRow.innerHTML = '<div><div style="width:220px;height:44px;background:rgb(240,240,240);border-radius:18px;padding:8px 12px">held</div></div>'
      sendFlow.appendChild(holdRow)
      await sleep(300)
      r.send.handed = {
        ghost: document.querySelector('[data-dsh-claude-send-ghost]') !== null,
        hidden: holdRow.hasAttribute('data-dsh-claude-send-flight'),
        visibility: getComputedStyle(holdRow).visibility,
      }
      holdRow.remove()
      await sleep(200)
      // The animation choice: with "reduced" in force the origin is not even
      // measured, so no stand-in goes up and the echo stays visible (D26 — the
      // resolved choice, read at each submission).
      window.__pushForm({ motion: 'reduced' })
      await sleep(150)
      if (sendInput !== null) sendInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      await sleep(60)
      var reducedEcho = document.createElement('div')
      reducedEcho.setAttribute('data-submission-echo', '')
      reducedEcho.innerHTML = '<div style="width:220px;height:44px;background:rgb(240,240,240);border-radius:18px;padding:8px 12px">hello again</div>'
      sendFlow.appendChild(reducedEcho)
      await sleep(120)
      r.send.reduced = {
        ghost: document.querySelector('[data-dsh-claude-send-ghost]') !== null,
        hidden: reducedEcho.hasAttribute('data-dsh-claude-send-flight'),
        visibility: getComputedStyle(reducedEcho).visibility,
      }
      reducedEcho.remove()
      window.__pushForm({ motion: 'system' })
      await sleep(150)
      sendFlow.remove()
    })
  })
})()
