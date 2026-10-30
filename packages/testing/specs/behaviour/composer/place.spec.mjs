/**
 * The composer's place in the page belongs to the transcript, not to the host's
 * phase mark. The host grants the seat's pin, the bar behind the card and the
 * view area's content-sized height from `data-phase="active"` alone; a phase
 * mark landing on `hero` or `settling` with a message column already mounted
 * drops all three, and the composer comes to rest in the middle of the rows,
 * which paint on below it. The skin marks the conversation root while a column
 * is mounted and holds the same place from that mark.
 *
 * The same composer is also judged in the frame it first paints in: a session
 * switch mounts the card in one batch as large as a whole conversation, and a
 * card the skin has not marked yet draws one frame in the host's own look. And
 * the host's question card, with the options it offers and the reply that
 * settles it, is judged as the reader sees it.
 *
 * @capability composer
 * @features composer
 * @risk Once a conversation is showing, the composer stops following the window's bottom edge and stands in the middle of the transcript, with the rows running past it; a session switch paints the composer in the host's own look for a frame, and a question card is drawn in the host's own box instead of the skin's.
 */
import { spec, host, surface } from '../../fixtures/behaviour.mjs'

const SEAT = host('composer.seat')
const COLUMN = host('chat.flow')
const SCROLLER = host('chat.scroller')
const PHASE = host('shell.phase')
const MARK = surface.attribute('composer.transcript')
const PART = surface.attribute('skin.part')
/** The host's own composer card, the draft in it and the hint it draws on an empty one. */
const CARD = host('composer.card')
const CARD_ATTR = host.attribute('composer.card')
const INPUT_ATTR = host.attribute('composer.input')
const HINT_ATTR = host.attribute('composer.placeholder')
/** The column the host keeps the composer in; the parts walk reads the card's own parts in it. */
const SCROLLER_ATTR = host.attribute('chat.scroller')
/** The variant the composer pass writes on a card. */
const VARIANT = host('composer.variant')
/** The host's question card, the option row in it and the reply that settles it. */
const QUESTION_ATTR = host.attribute('composer.question-card')
const OPTION_ATTR = host.attribute('composer.question-option')
const REPLY_ATTR = host.attribute('chat.question-reply')

/** The canvas the seat paints its bar with, in the Claude palette. */
const CANVAS = 'rgb(255, 255, 255)'

/**
 * The host's shape around a composer: a phase root, its scroll body, the view
 * area holding the message column, and the seat after them. The view area is
 * marked as the part it plays for the length of one reading — the walk would
 * take the mark back on its next pass — so the contract holds without the spec
 * spelling the host's own class. The reading of the place is kept with the
 * fixture, so both tests read it the same way.
 */
function mount(t, phase) {
  return t.page.evaluate(([seat, column, scroller, phaseAttribute, part, mark, value]) => {
    const name = (selector) => selector.slice(1, -1)
    const root = document.createElement('div')
    root.setAttribute(phaseAttribute, value)
    root.style.cssText = 'display:flex;flex-direction:column;height:200px;width:360px'
    const body = document.createElement('div')
    body.setAttribute(name(scroller), '')
    body.style.cssText = 'flex:1;min-height:0;overflow-y:auto'
    const view = document.createElement('div')
    const flow = document.createElement('div')
    flow.setAttribute(name(column), '')
    flow.style.height = '600px'
    const seatBox = document.createElement('div')
    seatBox.setAttribute(name(seat), '')
    seatBox.style.height = '40px'
    view.append(flow)
    body.append(view, seatBox)
    root.append(body)
    document.body.append(root)
    window.__debugPlace = {
      root,
      seat: seatBox,
      view,
      mark,
      phaseAttribute,
      read() {
        const paint = getComputedStyle(seatBox)
        const band = getComputedStyle(seatBox, '::before')
        // The view area's contract is read in the one frame it carries the part
        // mark: the rule is the stylesheet's, and the mark is the walk's.
        view.setAttribute(part, 'view-area')
        const flex = getComputedStyle(view).flex
        view.removeAttribute(part)
        return {
          phase: root.getAttribute(phaseAttribute),
          mark: root.hasAttribute(mark),
          position: paint.position,
          bottom: paint.bottom,
          bar: paint.backgroundColor,
          band: band.content === 'none' ? null : band.height,
          flex,
        }
      },
    }
  }, [SEAT, COLUMN, SCROLLER, PHASE, PART, MARK, phase])
}

/** Where the seat and the view area stand, read off the page. */
function readPlace(t) {
  return t.page.evaluate(() => window.__debugPlace.read())
}

/** Move the root's phase mark and read the place in the same frame. */
function readUnder(t, phase) {
  return t.page.evaluate((value) => {
    const { root, phaseAttribute } = window.__debugPlace
    const current = root.getAttribute(phaseAttribute)
    root.setAttribute(phaseAttribute, value)
    const state = window.__debugPlace.read()
    root.setAttribute(phaseAttribute, current)
    return state
  }, phase)
}

/** The mark the composer pass writes, waited for. */
function waitForMark(t, present) {
  return t.page.waitForFunction((wanted) => window.__debugPlace !== undefined &&
    window.__debugPlace.root.hasAttribute(window.__debugPlace.mark) === wanted, present, { timeout: 8000 })
}

/**
 * A fresh composer card, mounted in one batch as large as a session switch's.
 *
 * The card is the host's own shape: the draft, the hint the host draws on an
 * empty draft, and the trailing row with its primary button. The class names
 * the parts walk reads are taken off the page's own card, so this source
 * spells no host name.
 *
 * The reading is taken in the frame the card paints in: the browser runs a
 * frame's callbacks before it paints, so what is read there is what the reader
 * sees in that frame.
 */
function mountLargeBatch(t) {
  return t.page.evaluate(([cardAttr, inputAttr, hintAttr, scrollerAttr, variantAttr, cardSelector, part]) => {
    const source = document.querySelector(cardSelector)
    const trailingClass = source.querySelector(`[${part}~="trailing"]`).className
    const primaryClass = source.querySelector(`[${part}~="composer-primary"]`).className
    // The host's own filled primary button: without it a card the skin has not
    // marked yet would draw a transparent one, and the flash would not show.
    const sheet = document.createElement('style')
    sheet.textContent = `[${part}~="composer-primary"] { background: rgb(0, 122, 255); }`
    document.head.append(sheet)
    const wrapper = document.createElement('div')
    const scroller = document.createElement('div')
    scroller.setAttribute(scrollerAttr, '')
    const card = document.createElement('div')
    card.setAttribute(cardAttr, '')
    const draft = document.createElement('div')
    draft.setAttribute(inputAttr, '')
    draft.setAttribute('contenteditable', 'true')
    const hint = document.createElement('div')
    hint.setAttribute(hintAttr, '')
    const trailing = document.createElement('div')
    trailing.className = trailingClass
    const send = document.createElement('button')
    send.className = primaryClass
    send.setAttribute('aria-label', 'Send message')
    send.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 1v14"></path></svg>'
    trailing.append(send)
    card.append(draft, hint, trailing)
    scroller.append(card)
    wrapper.append(scroller)
    // A session switch mounts a whole flow in one task, and a batch that big
    // is what moves the scheduler's pass past the frame this card paints in.
    for (let index = 0; index < 120; index += 1) wrapper.append(document.createElement('div'))
    document.body.append(wrapper)
    window.__debugBatch = { wrapper, sheet }
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const mounted = scroller.querySelector(cardSelector)
        const button = mounted.querySelector(`[${part}~="composer-primary"]`)
        resolve({
          variant: mounted.getAttribute(variantAttr),
          radius: getComputedStyle(mounted).borderRadius,
          sendBackground: getComputedStyle(button).backgroundColor,
        })
      })
    })
  }, [CARD_ATTR, INPUT_ATTR, HINT_ATTR, SCROLLER_ATTR, VARIANT, CARD, PART])
}

/**
 * The host's question card, as it mounts it: the question, an option row with
 * the button the reader picks, and the settled reply with the question above
 * the answer.
 */
function mountQuestion(t) {
  return t.page.evaluate(([questionAttr, optionAttr, replyAttr]) => {
    const card = document.createElement('div')
    card.setAttribute(questionAttr, '')
    const section = document.createElement('section')
    const row = document.createElement('div')
    row.setAttribute(optionAttr, '')
    const button = document.createElement('button')
    button.setAttribute('aria-checked', 'true')
    const mark = document.createElement('span')
    mark.textContent = '1'
    button.append(mark)
    row.append(button)
    section.append(row)
    card.append(section)
    const reply = document.createElement('div')
    reply.setAttribute(replyAttr, '')
    const list = document.createElement('dl')
    const term = document.createElement('dt')
    term.textContent = 'Which one?'
    const answer = document.createElement('dd')
    answer.textContent = 'The first'
    list.append(term, answer)
    reply.append(list)
    // The accent the skin paints the taken option with, read off a probe that
    // asks the token for it: the two are compared as paints of it.
    const probe = document.createElement('span')
    probe.style.background = 'var(--dsw-alias-brand-primary)'
    document.body.append(card, reply, probe)
    window.__debugQuestion = { card, reply, probe }
    const paint = getComputedStyle
    return {
      cardRadius: paint(section).borderRadius,
      rowRadius: paint(row).borderRadius,
      markRadius: paint(mark).borderRadius,
      markBackground: paint(mark).backgroundColor,
      accent: paint(probe).backgroundColor,
      termSize: paint(term).fontSize,
      answerWeight: paint(answer).fontWeight,
    }
  }, [QUESTION_ATTR, OPTION_ATTR, REPLY_ATTR])
}

export default spec({ page: 'composer' }, ({ test }) => {
  test('a mounted transcript holds the composer on the scrollport\'s bottom under every phase mark', async (t) => {
    await mount(t, 'active')
    await waitForMark(t, true)
    const active = await readPlace(t)
    t.expectThat.equal(active.mark, true, 'the root marked while a message column is mounted')
    t.expectThat.equal([active.position, active.bottom, active.flex], ['sticky', '0px', '1 0 auto'], 'the seat pinned and the view area content-sized under the active phase')
    t.expectThat.equal([active.bar, active.band], [CANVAS, '40px'], 'the bar and its fade band behind the card')
    // The host's other marks for a conversation: moving the mark alone must not
    // move the composer.
    for (const phase of ['hero', 'settling']) {
      t.expectThat.equal(await readUnder(t, phase), { ...active, phase }, `the composer's place under the ${phase} mark`)
    }
    await t.page.evaluate(() => { window.__debugPlace.root.remove(); delete window.__debugPlace })
  })

  test('a card mounted in a session switch\'s batch is drawn in the skin\'s own look on its first frame', async (t) => {
    // Let the page settle first: a pass already waiting would mark the card
    // before it is mounted, and the frame read here would not be its first.
    await t.page.waitForTimeout(150)
    const frame = await mountLargeBatch(t)
    t.expectThat.equal(frame.variant, 'inline', 'the card carries its variant in the frame it paints in')
    t.expectThat.equal(frame.radius, '18px', 'the card is drawn in the skin\'s own radius')
    t.expectThat.equal(frame.sendBackground, 'rgba(0, 0, 0, 0)', 'the send button is the ghost, not the host\'s filled one')
    await t.page.evaluate(() => {
      window.__debugBatch.wrapper.remove()
      window.__debugBatch.sheet.remove()
      delete window.__debugBatch
    })
  })

  test('the question card and its settled reply are drawn in the skin\'s own look', async (t) => {
    const reading = await mountQuestion(t)
    t.expectThat.equal(reading.cardRadius, '18px', 'the question card is drawn in the skin\'s own radius')
    t.expectThat.equal(reading.rowRadius, '8px', 'an option row is a small plate')
    t.expectThat.equal(reading.markRadius, '6px', 'the option\'s own mark has the skin\'s corners')
    t.expectThat.equal(reading.markBackground, reading.accent, 'the option taken is filled with the accent')
    t.expectThat.equal(reading.termSize, '12px', 'the question reads as the caption of the pair')
    t.expectThat.equal(reading.answerWeight, '500', 'the answer carries the weight')
    await t.page.evaluate(() => {
      window.__debugQuestion.card.remove()
      window.__debugQuestion.reply.remove()
      window.__debugQuestion.probe.remove()
      delete window.__debugQuestion
    })
  })

  test('the mark leaves with the transcript, and the place is the host\'s again', async (t) => {
    await mount(t, 'active')
    await waitForMark(t, true)
    await t.page.evaluate((column) => window.__debugPlace.root.querySelector(column).remove(), COLUMN)
    await waitForMark(t, false)
    const gone = await readPlace(t)
    t.expectThat.equal(gone.mark, false, 'the root unmarked once the column is gone')
    t.expectThat.equal([gone.position, gone.flex], ['static', '0 1 auto'], 'the seat and the view area handed back to the host')
    await t.page.evaluate(() => { window.__debugPlace.root.remove(); delete window.__debugPlace })
  })
})
