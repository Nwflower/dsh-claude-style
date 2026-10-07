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
      // The seal (send-morph.ts's compact). The two fills and the halo are
      // animations of their own, and a main thread held by the submission's own
      // render can leave one of them behind the shell's snap: the card's fill,
      // still the size of the draft area, then paints over a shell that is
      // already the bubble. Holding the fill layers where they are is that
      // state, and the seal has to write their end state in the same task as
      // the snap.
      if (sendInput !== null) sendInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      await sleep(50)
      var sealEcho = document.createElement('div')
      sealEcho.setAttribute('data-submission-echo', '')
      sealEcho.innerHTML = '<div id="sealBubble" style="width:220px;height:44px;background:rgb(240,240,240);border-radius:18px;padding:8px 12px;font-size:15px;line-height:24px">sealed</div>'
      sendFlow.appendChild(sealEcho)
      await sleep(16)
      var frozen = 0
      var sealGhost = document.querySelector('[data-dsh-claude-send-ghost]')
      if (sealGhost !== null) {
        Array.prototype.forEach.call(sealGhost.querySelectorAll('div'), function (node) {
          if (getComputedStyle(node).backgroundColor === 'rgba(0, 0, 0, 0)') return
          node.getAnimations().forEach(function (animation) {
            animation.pause()
            frozen += 1
          })
        })
      }
      var sealBox = document.getElementById('sealBubble').getBoundingClientRect()
      var sealFill = getComputedStyle(document.getElementById('sealBubble')).backgroundColor
      var sealed = false
      var lateLight = 0
      var sealStarted = Date.now()
      while (Date.now() - sealStarted < 600) {
        await sleep(16)
        var sealNow = document.querySelector('[data-dsh-claude-send-ghost]')
        if (sealNow === null) continue
        var sealLayers = sealNow.querySelectorAll('div')
        Array.prototype.forEach.call(sealLayers, function (node) {
          if (node.style.opacity === '0') sealed = true
        })
        // Past the shape's stretch nothing but the bubble's own fill may paint
        // over the destination: a light layer there is the card's surface.
        if (Date.now() - sealStarted < 300) continue
        Array.prototype.forEach.call(sealLayers, function (node) {
          var style = getComputedStyle(node)
          if (style.backgroundColor === sealFill || Number(style.opacity) <= 0.05) return
          var match = /rgb\((\d+), (\d+), (\d+)\)/.exec(style.backgroundColor)
          if (match === null) return
          if (!(Number(match[1]) > 235 && Number(match[2]) > 235 && Number(match[3]) > 235)) return
          var box = node.getBoundingClientRect()
          if (box.width < 4 || box.height < 4) return
          if (box.left >= sealBox.right || box.right <= sealBox.left || box.top >= sealBox.bottom || box.bottom <= sealBox.top) return
          lateLight += 1
        })
      }
      r.send.seal = { frozen: frozen, sealed: sealed, lateLight: lateLight }
      sealEcho.remove()
      await sleep(700)
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
