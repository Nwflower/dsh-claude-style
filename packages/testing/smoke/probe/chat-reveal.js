/**
 * The token reveal (packages/client/src/features/chat-reveal/): characters arriving in a
 * streaming container are registered as named highlights from the faintest step, are
 * gone once faded, and the preference withdraws the engine whole.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var r = probe.report

  probe.step(async function () {
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
      // The fade ships off: a container streaming before the choice is turned on
      // gets nothing at all, which is the answer the row offers first.
      var revealShippedContainer = document.createElement('div')
      revealShippedContainer.setAttribute('data-streaming', '')
      revealShippedContainer.textContent = 'Hello there'
      document.body.appendChild(revealShippedContainer)
      await probe.settle()
      var revealShipped = revealPeek()
      revealShippedContainer.remove()
      window.__pushForm({ chatReveal: 'on' })
      await probe.settle()
      // Characters arriving, then more of them: every frame from each arrival
      // until the settle rule has run out, so the registration is read on the
      // frames that carry it; the fade's own end is read after the growth.
      var revealContainer = document.createElement('div')
      revealContainer.setAttribute('data-streaming', '')
      revealContainer.textContent = 'Hello there'
      document.body.appendChild(revealContainer)
      var revealOpening = await probe.watch(revealPeek)
      revealContainer.firstChild.data = 'Hello there, more'
      var revealGrown = await probe.watch(revealPeek)
      // The fade runs on the engine's own frames, which the settle rule does
      // not count (a feature painting its own frames must not hold it, D92);
      // the emptied registry is the state the settled reading waits for.
      var faded = await probe.until(revealPeek,
        function (read) { return read[read.length - 1].total === 0 }, 'the faded token highlights to leave the registry')
      var revealSettled = faded[faded.length - 1]
      window.__pushForm({ chatReveal: 'off' })
      await probe.settle()
      var revealOff = revealPeek()
      window.__pushForm({ chatReveal: 'on' })
      await probe.settle()
      var revealBack = revealPeek()
      // The animation choice: "reduced" withdraws the engine the same way the
      // preference does (D40 — the resolved choice, not the system query).
      window.__pushForm({ motion: 'reduced' })
      await probe.settle()
      var revealReduced = revealPeek()
      window.__pushForm({ motion: 'system' })
      await probe.settle()
      // And the system setting flipping underneath "follow the system": the
      // resolved attribute moves, the preference stream is re-run and a running
      // engine goes with it (packages/client/src/core/prefs.ts, refreshMotionAttribute).
      window.__setSystemReduced(true)
      await probe.settle()
      var revealFlipReduced = revealPeek()
      window.__setSystemReduced(false)
      await probe.settle()
      var revealFlipBack = revealPeek()
      revealContainer.remove()
      r.reveal = {
        shipped: revealShipped, opening: revealOpening, grown: revealGrown, settled: revealSettled, off: revealOff, back: revealBack,
        reduced: revealReduced, systemFlip: { reduced: revealFlipReduced, back: revealFlipBack },
      }
    })
  })
})()
