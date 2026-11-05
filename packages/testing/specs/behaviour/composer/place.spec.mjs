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
const CONTENT = host('chat.content')
const FLOW_SLOT_ATTR = host.attribute('chat.flow-slot')
const FALLBACK_ATTR = host('composer.fallback-panel')
const QUESTION_BODY_ATTR = host.attribute('composer.question-body')
const CUSTOM_LABEL = surface('composer.question-label')
const FLOW_ITEM = surface('composer.question-flow-item')
const QUESTION_SURFACE_ATTR = surface.attribute('composer.question-surface')
const CUSTOM_ACTIVE_ATTR = surface.attribute('composer.question-custom-active')
const SELECTION_PROPERTY = surface.property('composer.question-selection')
const SUBMIT_SHORTCUT = surface('composer.question-submit-shortcut')

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
  return t.page.evaluate(([questionAttr, optionAttr, replyAttr, contentSelector, flowAttr, fallbackAttr, seatSelector, scrollerAttr, columnSelector, questionBodyAttr, selectionProperty]) => {
    const name = (selector) => selector.slice(1, -1)
    const content = document.createElement('div')
    content.setAttribute(name(contentSelector), '')
    const scroller = document.createElement('div')
    scroller.setAttribute(scrollerAttr, '')
    const column = document.createElement('div')
    column.setAttribute(name(columnSelector), '')
    const flow = document.createElement('div')
    flow.setAttribute(flowAttr, 'conversation.chat.flow')
    column.append(flow)
    const seat = document.createElement('div')
    seat.setAttribute(name(seatSelector), '')
    const chain = document.createElement('div')
    const fallback = document.createElement('div')
    fallback.setAttribute(fallbackAttr, 'conversation.composer')
    fallback.style.display = 'none'
    const card = document.createElement('div')
    card.setAttribute(questionAttr, '')
    const section = document.createElement('section')
    const body = document.createElement('div')
    body.setAttribute(questionBodyAttr, '')
    const titleBox = document.createElement('div')
    const title = document.createElement('h2')
    title.textContent = 'Which one?'
    titleBox.append(title)
    const options = document.createElement('div')
    options.setAttribute('role', 'radiogroup')
    const row = document.createElement('div')
    row.setAttribute(optionAttr, '')
    const button = document.createElement('button')
    button.setAttribute('role', 'radio')
    button.setAttribute('aria-checked', 'true')
    const mark = document.createElement('span')
    mark.textContent = '1'
    const copy = document.createElement('span')
    const line = document.createElement('span')
    const label = document.createElement('span')
    label.textContent = 'The first'
    const badge = document.createElement('span')
    badge.textContent = 'Recommended'
    line.append(label, badge)
    copy.append(line)
    button.append(mark, copy)
    row.append(button)
    const custom = document.createElement('div')
    const customMark = document.createElement('span')
    const field = document.createElement('div')
    const textarea = document.createElement('textarea')
    textarea.placeholder = 'Type your answer'
    field.append(textarea)
    custom.append(customMark, field)
    options.append(row, custom)
    body.append(titleBox, options)
    const footer = document.createElement('footer')
    const footerActions = document.createElement('div')
    footerActions.append(document.createElement('button'), document.createElement('button'))
    footer.append(footerActions)
    section.append(body, footer)
    card.append(section)
    chain.append(fallback, card)
    seat.append(chain)
    scroller.append(column, seat)
    content.append(scroller)
    const reply = document.createElement('div')
    reply.setAttribute(replyAttr, '')
    const list = document.createElement('dl')
    const term = document.createElement('dt')
    term.textContent = 'Which one?'
    const answer = document.createElement('dd')
    answer.textContent = 'The first'
    list.append(term, answer)
    reply.append(list)
    // The selection blue is read off a probe painted by the same token.
    const probe = document.createElement('span')
    probe.style.background = `var(${selectionProperty})`
    document.body.append(content, reply, probe)
    window.__debugQuestion = { card, section, row, mark, badge, term, answer, content, reply, probe, fallbackAttr }
  }, [QUESTION_ATTR, OPTION_ATTR, REPLY_ATTR, CONTENT, FLOW_SLOT_ATTR, FALLBACK_ATTR, SEAT, SCROLLER_ATTR, COLUMN, QUESTION_BODY_ATTR, SELECTION_PROPERTY])
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
    await mountQuestion(t)
    await t.page.waitForFunction((selector) => document.querySelector(selector)?.textContent === 'Other', CUSTOM_LABEL)
    const reading = await t.page.evaluate((flowItem) => {
      const { card, section, row, mark, badge, term, answer, content, probe, fallbackAttr } = window.__debugQuestion
      const paint = getComputedStyle
      return {
        cardRadius: paint(section).borderRadius,
        cardWidth: paint(section.parentElement).width,
        rowRadius: paint(row).borderRadius,
        markRadius: paint(mark).borderRadius,
        markWidth: paint(mark).width,
        markHeight: paint(mark).height,
        markBackground: paint(mark).backgroundColor,
        markCentre: paint(mark).backgroundImage,
        badgeColor: paint(badge).color,
        selectionBlue: paint(probe).backgroundColor,
        termSize: paint(term).fontSize,
        answerWeight: paint(answer).fontWeight,
        frameDisplay: paint(card).display,
        flowParent: section.parentElement.matches(flowItem),
        composerDisplay: content.querySelector(`[${fallbackAttr}]`).style.display,
      }
    }, FLOW_ITEM)
    t.expectThat.equal(reading.cardRadius, '14px', 'the question card is drawn in the skin\'s own radius')
    t.expectThat.equal(reading.cardWidth, '480px', 'the card keeps the home dashboard\'s width on a wide screen')
    t.expectThat.equal(reading.rowRadius, '0px', 'option rows join one continuous list')
    t.expectThat.equal(reading.markRadius, '50%', 'a single-choice option carries a circular radio')
    t.expectThat.equal(reading.markWidth, reading.markHeight, 'the radio keeps equal width and height')
    t.expectThat.equal(reading.markWidth, '20px', 'the radio uses the compact reference size')
    t.expectThat.equal(reading.markBackground, reading.selectionBlue, 'the option taken is filled with the selection blue')
    t.expectThat.equal(reading.markCentre.includes('radial-gradient'), true, 'the radio\'s light centre is drawn as a true circle')
    t.expectThat.equal(reading.badgeColor, reading.selectionBlue, 'the recommendation badge uses the same blue')
    t.expectThat.equal(reading.termSize, '12px', 'the question reads as the caption of the pair')
    t.expectThat.equal(reading.answerWeight, '500', 'the answer carries the weight')
    t.expectThat.equal(reading.frameDisplay, 'none', 'the empty composer root leaves the layout')
    t.expectThat.equal(reading.flowParent, true, 'the card stands at the conversation flow\'s end')
    t.expectThat.equal(reading.composerDisplay, 'contents', 'the composer remains on screen beside the question')
    const customLabelSize = await t.page.evaluate((selector) => getComputedStyle(document.querySelector(selector)).fontSize, CUSTOM_LABEL)
    t.expectThat.equal(customLabelSize, '14px', 'the custom option keeps the host\'s option type size')
    const shortcut = await t.page.evaluate((selector) => ({
      text: document.querySelector(selector).textContent,
      icons: document.querySelector(selector).querySelectorAll('svg').length,
    }), SUBMIT_SHORTCUT)
    t.expectThat.equal(shortcut, { text: 'Ctrl', icons: 1 }, 'the submit button carries Ctrl and the return icon')
    const narrowWidth = await t.page.evaluate(() => {
      const mount = window.__debugQuestion.section.parentElement
      mount.parentElement.style.width = '360px'
      return getComputedStyle(mount).width
    })
    t.expectThat.equal(narrowWidth, '360px', 'the card fills a narrower conversation column')
    await t.page.locator(`[${OPTION_ATTR}]`).hover()
    await t.page.evaluate(() => Promise.all(window.__debugQuestion.row.getAnimations().map(animation => animation.finished)))
    const ordinaryHover = await t.page.evaluate(() => getComputedStyle(window.__debugQuestion.row).backgroundColor)
    await t.page.locator(CUSTOM_LABEL).hover()
    await t.page.waitForFunction(({ expected, selector }) => {
      const label = document.querySelector(selector)
      return getComputedStyle(label.parentElement).backgroundColor === expected
    }, { expected: ordinaryHover, selector: CUSTOM_LABEL })
    await t.page.locator(CUSTOM_LABEL).click()
    await t.page.waitForFunction((attribute) => {
      const field = window.__debugQuestion.section.querySelector(`[${attribute}] > div`)
      return field !== null && getComputedStyle(field).display === 'grid' && document.activeElement === field.querySelector('textarea')
    }, CUSTOM_ACTIVE_ATTR)
    const customFieldBorder = await t.page.evaluate(() => getComputedStyle(window.__debugQuestion.section.querySelector('textarea').parentElement).borderColor)
    t.expectThat.equal(customFieldBorder, reading.selectionBlue, 'the focused custom answer field uses the selection blue')
    await t.page.evaluate(() => {
      const textarea = window.__debugQuestion.section.querySelector('textarea')
      textarea.value = 'A custom answer'
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await t.page.waitForFunction(({ attribute, expected }) => {
      const row = window.__debugQuestion.section.querySelector(`[${attribute}]`)
      return row !== null && getComputedStyle(row.querySelector(':scope > :first-child')).backgroundColor === expected
    }, { attribute: CUSTOM_ACTIVE_ATTR, expected: reading.selectionBlue })
    const customBackground = await t.page.evaluate((attribute) => getComputedStyle(window.__debugQuestion.section.querySelector(`[${attribute}] > :first-child`)).backgroundColor, CUSTOM_ACTIVE_ATTR)
    t.expectThat.equal(customBackground, reading.selectionBlue, 'writing a custom answer selects its radio with the same blue')
    await t.page.evaluate(() => {
      const { section, row } = window.__debugQuestion
      section.querySelector('textarea').value = ''
      const option = row.querySelector('button')
      option.setAttribute('aria-checked', 'true')
      option.click()
    })
    await t.page.waitForFunction((attribute) => window.__debugQuestion.section.querySelector(`[${attribute}]`) === null, CUSTOM_ACTIVE_ATTR)
    const customFieldDisplay = await t.page.evaluate(() => getComputedStyle(window.__debugQuestion.section.querySelector('textarea').parentElement).display)
    t.expectThat.equal(customFieldDisplay, 'none', 'choosing an ordinary option closes the custom answer field')
    await t.page.evaluate(() => { window.__debugQuestion.card.remove() })
    await t.page.waitForFunction((attribute) => document.querySelector(`[${attribute}]`) === null, QUESTION_SURFACE_ATTR)
    const cleaned = await t.page.evaluate((flowItem) => ({
      mounts: document.querySelectorAll(flowItem).length,
      composerDisplay: window.__debugQuestion.content.querySelector(`[${window.__debugQuestion.fallbackAttr}]`).style.display,
    }), FLOW_ITEM)
    t.expectThat.equal(cleaned, { mounts: 0, composerDisplay: 'contents' }, 'the host root\'s departure removes the card and leaves the composer visible')
    await t.page.evaluate(() => {
      window.__debugQuestion.content.remove()
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
