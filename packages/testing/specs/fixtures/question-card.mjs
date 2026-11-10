/**
 * The host's question card, as it mounts it: the question, an option row with
 * the button the reader picks, the field for a custom answer, and the settled
 * reply with the question above the answer.
 *
 * Shared by the behaviour specs and by scripts that read the card's look, so
 * the host's attribute names come from the contract and the markup is written
 * once. The selection blue is read off a probe painted by the same token.
 */
import { host } from './behaviour.mjs'

const QUESTION_ATTR = host.attribute('composer.question-card')
const OPTION_ATTR = host.attribute('composer.question-option')
const REPLY_ATTR = host.attribute('chat.question-reply')
const CONTENT = host('chat.content')
const FLOW_SLOT_ATTR = host.attribute('chat.flow-slot')
const FALLBACK_ATTR = host('composer.fallback-panel')
const SEAT = host('composer.seat')
const SCROLLER_ATTR = host.attribute('chat.scroller')
const COLUMN = host('chat.flow')
const QUESTION_BODY_ATTR = host.attribute('composer.question-body')

/** Mount the host's question card, its option row and the reply that settles it. */
export function mountQuestion(page, selectionProperty) {
  return page.evaluate(([questionAttr, optionAttr, replyAttr, contentSelector, flowAttr, fallbackAttr, seatSelector, scrollerAttr, columnSelector, questionBodyAttr, selectionProperty]) => {
    const name = (selector) => selector.slice(1, -1)
    const content = document.createElement('div')
    content.setAttribute(name(contentSelector), '')
    const scroller = document.createElement('div')
    scroller.setAttribute(scrollerAttr, '')
    const column = document.createElement('div')
    column.setAttribute(name(columnSelector), '')
    // The host's column: a flex column narrower than the composer card, which
    // stands its side clearance wider on either side.
    column.style.cssText = 'display:flex;flex-direction:column;width:600px;margin-left:40px;--dsh-composer-card-max-width:632px;--dsh-composer-side-clearance:16px'
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
    const probe = document.createElement('span')
    probe.style.background = `var(${selectionProperty})`
    document.body.append(content, reply, probe)
    window.__debugQuestion = { card, section, title, column, row, mark, badge, term, answer, content, reply, probe, fallbackAttr }
  }, [QUESTION_ATTR, OPTION_ATTR, REPLY_ATTR, CONTENT, FLOW_SLOT_ATTR, FALLBACK_ATTR, SEAT, SCROLLER_ATTR, COLUMN, QUESTION_BODY_ATTR, selectionProperty])
}

/** Take the question fixture off the page. */
export function unmountQuestion(page) {
  return page.evaluate(() => {
    window.__debugQuestion.content.remove()
    window.__debugQuestion.reply.remove()
    window.__debugQuestion.probe.remove()
    delete window.__debugQuestion
  })
}
