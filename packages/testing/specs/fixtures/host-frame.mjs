/**
 * The host's own conversation frame, mounted from the snapshot the capture tool
 * writes (packages/testing/data/host-snapshot.json, D3, D86).
 *
 * A behaviour spec on the stand-in page used to hand-build the host's phase
 * root, conversation body, width handles and input bar, and to write the host's
 * numbers into the spec. Both are the host's: the frame here is the tags, class
 * names and attributes the host itself wrote, and the values the stand-in mounts
 * are the ones the host declared on that page. The behaviour layer reads this
 * stored record, so a host upgrade reaches it through the capture command's
 * diff and the `contract` scenario's host-output observations, which is where a
 * change is named; `node packages/testing/host-snapshot.mjs` writes the record
 * again.
 */
import snapshot from '../../data/host-snapshot.json' with { type: 'json' }

/** The host's own markup and values, as the last capture read them. */
function hostFrame() {
  return snapshot
}

/** How many pixels the host itself leaves under the composer card. */
function hostRoom(frame = snapshot) {
  const room = Number.parseFloat(frame.composer.bar.paddingBottom)
  if (!Number.isFinite(room)) throw new Error(`host frame: the snapshot records no room under the card (${JSON.stringify(frame.composer.bar.paddingBottom)})`)
  return room
}

/**
 * Mount the captured frame around the stand-in's card and scroller: the composer
 * stack and the bar the card hangs in, and the conversation's phase root, body
 * and width handles. Runs once per test, on a page the runner has just opened.
 *
 * @param t - the behaviour test's context (`page`, `host`, `settle`).
 */
async function mountConversation(t) {
  await t.page.evaluate(mountFrame, {
    frame: snapshot,
    cardSelector: t.host('composer.card'),
    scrollerSelector: t.host('chat.scroller'),
  })
  await t.settle()
}

/** The mount, in the page. */
function mountFrame({ frame, cardSelector, scrollerSelector }) {
  const card = document.querySelector(cardSelector)
  const scroller = document.querySelector(scrollerSelector)
  if (card === null || scroller === null) throw new Error('host frame: the stand-in page has no composer card or conversation scroller')
  const stack = card.parentElement
  if (stack === null) throw new Error('host frame: the card stands in no composer stack')
  const dress = (element, step) => {
    element.className = step.classes.join(' ')
    for (const [name, value] of Object.entries(step.attributes)) element.setAttribute(name, value)
    for (const [name, value] of Object.entries(step.style ?? {})) element.style.setProperty(name, value)
  }
  dress(stack, frame.composer.stack)
  let inner = card
  for (const step of [frame.composer.bar, ...frame.composer.above]) {
    const wrapper = document.createElement(step.tag)
    dress(wrapper, step)
    inner.replaceWith(wrapper)
    wrapper.append(inner)
    inner = wrapper
  }
  // The room under the card is a rule of the host's own stylesheet, so the
  // stand-in writes it as a class rule too: a stop of the skin's has to be able
  // to write over it, which an inline style would never let it do.
  const room = document.createElement('style')
  room.textContent = `${frame.composer.bar.classes.map((name) => `.${CSS.escape(name)}`).join(', ')} { padding-bottom: ${frame.composer.bar.paddingBottom}; }`
  document.head.append(room)
  const phase = document.createElement(frame.conversation.phase.tag)
  dress(phase, frame.conversation.phase)
  const content = document.createElement(frame.conversation.content.tag)
  dress(content, frame.conversation.content)
  const widths = document.createElement('style')
  widths.textContent = `${frame.conversation.content.classes.map((name) => `.${CSS.escape(name)}`).join(', ')} { ${Object.entries(frame.conversation.content.properties).map(([name, value]) => `${name}: ${value};`).join(' ')} }`
  document.head.append(widths)
  scroller.replaceWith(phase)
  phase.append(content)
  content.append(scroller)
  for (const sibling of frame.conversation.siblings) {
    const element = document.createElement(sibling.tag)
    dress(element, sibling)
    content.append(element)
  }
}

export { hostFrame, hostRoom, mountConversation }
