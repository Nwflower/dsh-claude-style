import { check, basicChecks } from './_shared.mjs'

/**
 * A tool body's output arriving (features/chat-tool-lines): the rows a batch
 * brings are marked with the offset their place in that batch earns, a line
 * streaming in on its own is drawn at once, and the animation choice takes the
 * whole arrival with it.
 */
export default {
  'chat-tool-lines'(r) {
    basicChecks(r)
    const lines = r.toolLines || {}
    const alone = lines.alone || []
    check('a conversation the page mounts on its own is never replayed',
      alone.every((frame) => frame.marked === 0), JSON.stringify(alone.slice(0, 4)))
    const sweep = lines.sweep || []
    const first = sweep.find((frame) => frame.marked > 0) || {}
    const delays = first.delays || []
    check('a body the reader opens is drawn two rows at a time, with the pair after a pair',
      delays.length === 4 && delays[0] === 0 && delays[1] === 0 && delays[2] === delays[3] && delays[2] > 0,
      JSON.stringify(first))
    check('the marks come off once the batch has landed',
      (lines.landed || {}).marked === 0, JSON.stringify(lines.landed))
    const single = (lines.single || []).find((frame) => frame.marked > 0) || {}
    check('a line a running command appends on its own is drawn at once',
      (single.marked || 0) === 1 && single.delays[0] === 0, JSON.stringify(single))
    const read = (lines.read || []).find((frame) => frame.marked > 0) || {}
    check('a read card\u2019s rows are a batch of their own',
      (read.marked || 0) === 2 && read.delays[0] === 0 && read.delays[1] === 0, JSON.stringify(read))
    const diff = (lines.diff || []).find((frame) => frame.marked > 0) || {}
    check('the two sides of one hunk sweep together',
      (diff.marked || 0) === 2 && diff.delays[0] === 0 && diff.delays[1] === 0, JSON.stringify(diff))
    const reduced = lines.reduced || []
    check('the animation choice takes the arrival with it',
      reduced.every((frame) => frame.marked === 0), JSON.stringify(reduced.slice(0, 4)))
    const back = (lines.back || []).find((frame) => frame.marked > 0) || {}
    check('switching it back brings the arrival back',
      (back.marked || 0) === 2, JSON.stringify(back))
  },
}
