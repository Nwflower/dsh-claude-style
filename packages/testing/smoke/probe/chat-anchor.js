/**
 * The answer's first line (packages/client/src/features/chat-anchor/): with the
 * switch off the answer's own start moves nobody, and with it on a reader at the
 * tail is carried to the first line and given the follow there, while a reader
 * away from the tail stays where he is.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['chat-anchor'], async function () {
      var scroller = document.querySelector('[data-conversation-scroll]')
      var column = document.querySelector('[data-chat-flow]')
      var answer = document.querySelector('[data-chat-group-part="response"]')
      var gap = function () {
        return Math.round(scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop)
      }
      /** The answer's first line, as the reader sees it: the row's top against the scroller's. */
      var firstLine = function () {
        return Math.round(answer.getBoundingClientRect().top - scroller.getBoundingClientRect().top)
      }
      /** The markdown layer's mark, arriving inside a row: the moment an answer starts. */
      var streamIn = function (row, id) {
        var mark = document.createElement('div')
        mark.setAttribute('data-streaming', '')
        mark.id = id
        row.appendChild(mark)
      }
      var atTail = async function () {
        scroller.scrollTop = scroller.scrollHeight
        await probe.settle()
      }
      // The host counts every row of a running turn into its process group, the
      // answer row included, and drops the mark when the turn closes: the anchor
      // has to find the answer by its own part while the mark stands.
      answer.setAttribute('data-turn-process-member', '')
      await probe.settle()
      // The switch ships off: an answer starting moves the page not at all.
      window.__pushForm({ answerAnchor: false })
      await probe.settle()
      await atTail()
      var offBefore = { top: scroller.scrollTop, gap: gap() }
      streamIn(answer, 'anchorOffMark')
      await probe.settle()
      var offAfter = { top: scroller.scrollTop, gap: gap() }
      document.getElementById('anchorOffMark').remove()
      await probe.settle()
      window.__pushForm({ answerAnchor: true })
      await probe.settle()
      // On, with the reader following the tail: the answer's first line comes to
      // the top of the conversation and the follow is handed over there.
      await atTail()
      var onBefore = gap()
      streamIn(answer, 'anchorOnMark')
      await probe.settle()
      var anchored = { before: onBefore, gap: gap(), top: firstLine() }
      // On, with the reader reading higher up: the answer starting is not his
      // to be moved by, so the position stays where he put it.
      document.getElementById('anchorOnMark').remove()
      scroller.scrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight - 300)
      await probe.settle()
      var awayBefore = { top: scroller.scrollTop, gap: gap() }
      var second = document.createElement('div')
      second.setAttribute('data-chat-flow-key', 'second-answer')
      second.setAttribute('data-chat-flow-kind', 'assistant-step')
      second.setAttribute('data-chat-group-part', 'response')
      second.setAttribute('data-turn-process-member', '')
      second.style.height = '300px'
      column.appendChild(second)
      streamIn(second, 'anchorAwayMark')
      await probe.settle()
      var awayAfter = { top: scroller.scrollTop, gap: gap() }
      second.remove()
      await probe.settle()
      // An answer that starts shorter than the window: the write lands at the end
      // and the reader keeps following the tail, and the first line takes the top
      // only once the row outgrows the window.
      var growing = document.createElement('div')
      growing.setAttribute('data-chat-flow-key', 'growing-answer')
      growing.setAttribute('data-chat-flow-kind', 'assistant-step')
      growing.setAttribute('data-chat-group-part', 'response')
      growing.setAttribute('data-turn-process-member', '')
      growing.style.height = '60px'
      column.appendChild(growing)
      await atTail()
      streamIn(growing, 'anchorGrowMark')
      await probe.settle()
      var growBefore = { top: Math.round(growing.getBoundingClientRect().top - scroller.getBoundingClientRect().top), gap: gap() }
      growing.style.height = '600px'
      await probe.settle()
      await probe.settle()
      var grown = { top: Math.round(growing.getBoundingClientRect().top - scroller.getBoundingClientRect().top), gap: gap() }
      growing.remove()
      answer.removeAttribute('data-turn-process-member')
      await probe.settle()
      r.chatAnchor = {
        off: { before: offBefore, after: offAfter },
        anchored: anchored,
        away: { before: awayBefore, after: awayAfter },
        growing: { before: growBefore, after: grown },
      }
    })
  })
})()
