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
