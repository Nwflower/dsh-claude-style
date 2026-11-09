/**
 * The crab draws its own frame and nothing of the frames beside it: its window's
 * outermost cells are empty, and a stray device pixel is allowed only where it
 * matches the frame's own first ink column, which the sampler's half-pixel can
 * pull in at a fractional density. Anything else is the defect this spec exists for.
 *
 * @capability mascot
 * @features mascot
 * @risk A thin line runs down the crab's left side or across its top while it plays: the neighbouring frame's claw or legs, drawn at the window's edge.
 */
import { CONVERSATION_PARTS } from '@dsh-claude-style/engine/parts-table'
import { spec, host } from '../../fixtures/behaviour.mjs'

/** How far a device pixel the crab leaves empty may stray from the page behind it, per channel. */
const TOLERANCE = 6
/** The conversation the crab stands in, as this spec builds it. */
const CONVERSATION_ID = 'crab-conversation'
/**
 * The room the conversation keeps above its input area: the transcript stands
 * there on the host's page, and without it the scroller's overflow clips the
 * crab standing on the input area's top edge.
 */
const ROOM_ABOVE = 80
/** The session the stand-in host's driver follows (packages/testing/smoke/page.mjs). */
const SESSION = 'smoke-deepy'
/** The class stem the part walk marks as the composer's stack, which the crab stands on. */
const STACK_PART = Object.keys(CONVERSATION_PARTS).find((stem) => CONVERSATION_PARTS[stem] === 'composer-stack')

/**
 * Put the crab on the conversation's input area at work on a reasoning turn:
 * under reduced motion it holds the thinking sheet's still frame, which has its
 * neighbours' claw and legs right against its own empty edges.
 */
async function thinkingCrab(t) {
  await t.page.evaluate(([id, phase, scroller, session, seat, stackClass, sessionId]) => {
    const conversation = document.createElement('div')
    conversation.id = id
    conversation.setAttribute(phase, 'active')
    conversation.setAttribute(scroller, '')
    const content = document.createElement('div')
    content.setAttribute(session, sessionId)
    const seatBox = document.createElement('div')
    seatBox.setAttribute(seat, '')
    const stack = document.createElement('div')
    stack.className = stackClass
    stack.textContent = 'input'
    seatBox.append(stack)
    content.append(seatBox)
    conversation.append(content)
    document.body.append(conversation)
  }, [CONVERSATION_ID, host('shell.phase'), host.attribute('chat.scroller'), host('conversation.session-attribute'),
    host.attribute('composer.seat'), `_${STACK_PART}_x_1`, SESSION])
  await t.page.waitForTimeout(200)
  await t.page.evaluate((sessionId) => {
    window.__deepy.setStatus(sessionId, { running: true })
    window.__deepy.setTurn('reasoning')
  }, SESSION)
  await t.page.waitForSelector(`${t.surface('mascot.crab')}[${t.surface.attribute('mascot.animation')}="thinking"]`)
  await t.page.waitForTimeout(300)
}

/** An image's pixels, decoded by the page itself: `{ width, height, data }`, RGBA. */
function decode(t, uri) {
  return t.page.evaluate(async (source) => {
    const image = new Image()
    image.src = source
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0)
    return { width: canvas.width, height: canvas.height, data: Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data) }
  }, uri)
}

/** The window and the sheet as drawn: their boxes, and the colour sheet and ink mask the strip paints. */
async function readSprite(t) {
  return t.page.evaluate(([windowSelector, stripSelector]) => {
    const view = document.querySelector(windowSelector)
    const strip = document.querySelector(stripSelector)
    const box = (element) => {
      const rect = element.getBoundingClientRect()
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    }
    const url = (value) => value.slice(value.indexOf('"') + 1, value.lastIndexOf('"'))
    const after = getComputedStyle(strip, '::after')
    return {
      view: box(view),
      strip: box(strip),
      body: url(getComputedStyle(strip).backgroundImage),
      ink: url(after.maskImage || after.webkitMaskImage),
      dpr: devicePixelRatio,
    }
  }, [t.surface('mascot.crab-window'), t.surface('mascot.crab-strip')])
}

/** The window's area at device resolution, with the crab drawn or hidden. */
async function shoot(t, clip, hidden) {
  await t.page.evaluate(([selector, hidden]) => {
    document.querySelector(selector).style.visibility = hidden ? 'hidden' : ''
  }, [t.surface('mascot.crab-window'), hidden])
  const shot = await t.page.screenshot({ clip, scale: 'device' })
  return decode(t, `data:image/png;base64,${shot.toString('base64')}`)
}

/**
 * The device pixels along the window's edges that sit inside one of the frame's
 * empty outermost cells, and those of them that differ from the page behind the
 * crab beyond the sampler's half-pixel.
 */
async function strayEdges(t, sheets) {
  const sprite = await readSprite(t)
  for (const uri of [sprite.body, sprite.ink]) if (!sheets.has(uri)) sheets.set(uri, await decode(t, uri))
  const body = sheets.get(sprite.body)
  const ink = sheets.get(sprite.ink)
  // One sheet cell on the page, and the frame's place in the sheet.
  const cell = sprite.strip.width / body.width
  const frameX = Math.round((sprite.view.left - sprite.strip.left) / cell)
  const frameY = Math.round((sprite.view.top - sprite.strip.top) / cell)
  const columns = Math.round(sprite.view.width / cell)
  const rows = Math.round(sprite.view.height / cell)
  const empty = (x, y) => body.data[(y * body.width + x) * 4 + 3] === 0 && ink.data[(y * ink.width + x) * 4 + 3] === 0
  const clip = {
    x: Math.floor(sprite.view.left),
    y: Math.floor(sprite.view.top),
    width: Math.ceil(sprite.view.left + sprite.view.width) - Math.floor(sprite.view.left),
    height: Math.ceil(sprite.view.top + sprite.view.height) - Math.floor(sprite.view.top),
  }
  const drawn = await shoot(t, clip, false)
  const behind = await shoot(t, clip, true)
  // The colour one sheet cell paints over a page colour: the body's ink under
  // the mask's alpha, the two alphas multiplied.
  const painted = (x, y, base) => {
    const at = (sheet, x, y) => (y * sheet.width + x) * 4
    const alpha = (body.data[at(body, x, y) + 3] / 255) * (ink.data[at(ink, x, y) + 3] / 255)
    if (alpha === 0) return null
    return [0, 1, 2].map(channel => body.data[at(body, x, y) + channel] * alpha + base[channel] * (1 - alpha))
  }
  /**
   * The colours the sampler's half-pixel may legitimately put in this edge pixel:
   * the frame's own first ink column beside the empty cell, at the row and the one
   * either side, since the sample's row is as fractional as its column.
   */
  const allowed = (side, at, base) => {
    const colours = []
    for (let row = at - 1; row <= at + 1; row++) {
      const place = side === 'left' ? [frameX + 1, frameY + row]
        : side === 'right' ? [frameX + columns - 2, frameY + row]
        : side === 'top' ? [frameX + at, frameY + 1]
        : [frameX + at, frameY + rows - 2]
      const colour = painted(place[0], place[1], base)
      if (colour !== null) colours.push(colour)
    }
    return colours
  }
  // The first two device pixels on each side, starting from the one the window's
  // edge cuts through: the sliver lands there, and both stand on the frame's
  // outermost cell or outside the window.
  const device = cell * sprite.dpr
  const left = Math.floor((sprite.view.left - clip.x) * sprite.dpr)
  const top = Math.floor((sprite.view.top - clip.y) * sprite.dpr)
  const right = Math.ceil((sprite.view.left + sprite.view.width - clip.x) * sprite.dpr) - 1
  const bottom = Math.ceil((sprite.view.top + sprite.view.height - clip.y) * sprite.dpr) - 1
  const points = []
  for (let row = 0; row < rows; row++) {
    const y = Math.floor((sprite.view.top - clip.y) * sprite.dpr + (row + 0.5) * device)
    if (empty(frameX, frameY + row)) points.push(['left', row, left, y], ['left', row, left + 1, y])
    if (empty(frameX + columns - 1, frameY + row)) points.push(['right', row, right, y], ['right', row, right - 1, y])
  }
  for (let column = 0; column < columns; column++) {
    const x = Math.floor((sprite.view.left - clip.x) * sprite.dpr + (column + 0.5) * device)
    if (empty(frameX + column, frameY)) points.push(['top', column, x, top], ['top', column, x, top + 1])
    if (empty(frameX + column, frameY + rows - 1)) points.push(['bottom', column, x, bottom], ['bottom', column, x, bottom - 1])
  }
  // The capture is cut at a whole CSS pixel, so a fractional density can leave
  // its last device pixel unread.
  const inside = points.filter(([, , x, y]) => x >= 0 && y >= 0 && x < drawn.width && y < drawn.height)
  const strays = []
  for (const [side, at, x, y] of inside) {
    const offset = (y * drawn.width + x) * 4
    const drawnRgb = [drawn.data[offset], drawn.data[offset + 1], drawn.data[offset + 2]]
    const behindRgb = [behind.data[offset], behind.data[offset + 1], behind.data[offset + 2]]
    const off = Math.max(...[0, 1, 2].map((channel) => Math.abs(drawnRgb[channel] - behindRgb[channel])))
    if (off <= TOLERANCE) continue
    // The sampler's half-pixel may show the frame's own first ink column here
    // (the spec's header says why); the neighbouring frame never may.
    const near = (colours) => colours.some((colour) => Math.max(...[0, 1, 2].map((channel) => Math.abs(drawnRgb[channel] - colour[channel]))) <= TOLERANCE)
    if (near(allowed(side, at, behindRgb))) continue
    strays.push(`${side} cell ${at} off by ${off} (drawn ${drawnRgb.join(',')} behind ${behindRgb.join(',')})`)
  }
  const geometry = `dpr ${sprite.dpr}, cell ${cell.toFixed(3)}css/${device.toFixed(3)}dev, view ${sprite.view.left.toFixed(2)},${sprite.view.top.toFixed(2)} ${sprite.view.width.toFixed(2)}x${sprite.view.height.toFixed(2)}, strip ${sprite.strip.left.toFixed(2)},${sprite.strip.top.toFixed(2)}, frame ${frameX},${frameY} ${columns}x${rows}, phase ${((sprite.view.left - sprite.strip.left) / cell).toFixed(3)},${((sprite.view.top - sprite.strip.top) / cell).toFixed(3)}`
  return { sampled: inside.length, strays, corner: `${(sprite.view.left * sprite.dpr).toFixed(2)}, ${(sprite.view.top * sprite.dpr).toFixed(2)}`, geometry }
}

export default spec({ page: 'crab-states', densities: [1.25] }, ({ test }) => {
  for (const zoom of ['1', '1.25', '1.5']) {
    test(`at 125% density and a page zoom of ${zoom}, the empty edges of the crab's frame show the page behind it`, async (t) => {
      await t.prefs({ motion: 'reduced', pageZoom: zoom })
      await thinkingCrab(t)
      /** The sheets read so far, by their address: the frame does not change while the window moves. */
      const sheets = new Map()
      // The room above keeps the scroller's overflow from clipping the crab.
      await t.page.evaluate(([id, room]) => {
        document.getElementById(id).style.paddingTop = `${room}px`
      }, [CONVERSATION_ID, ROOM_ABOVE])
      await t.page.waitForTimeout(60)
      const { sampled, strays, corner, geometry } = await strayEdges(t, sheets)
      t.expectThat.equal(sampled > 0, true, `the still frame leaves some of its edge cells empty (${sampled} pixels sampled)`)
      t.expectThat.equal(strays.length, 0,
        `with the window's corner at device pixel ${corner}, its empty edge cells show the page behind the crab [${geometry}]${strays.length === 0 ? '' : `: ${strays.slice(0, 4).join('; ')}`}`)
    })
  }
})
