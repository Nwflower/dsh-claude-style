/**
 * The waiting line's loader hand-over, read off the recorded frames: how many
 * dots stand in view per frame while the old lane leaves, and whether every dot
 * that comes into view takes its partner's place instead of appearing elsewhere.
 *
 * A dot is read as shown once its opacity passes half, which can be a frame
 * after it starts moving along its arc; the frame that read it therefore sits
 * one step along. The allowance for that dot is the partner's own drift plus the
 * step the dot takes between that frame and its next one.
 */

/** The dots that stand in view in one frame. */
export function dotsInView(frame, shown) {
  return (frame.loader.lanes || []).flatMap((lane) => (lane.spots || []).filter((_, dot) => shown(lane, dot)))
}

/** How many dots stand in view in each of the frames. */
export function handoverCounts(handing, shown) {
  return handing.map((frame) => dotsInView(frame, shown).length)
}

/**
 * Every dot whose first shown position stands further than its allowance from
 * the nearest dot drawn the frame before.
 * @param handing - the frames from the last of the old lane to the first of the new.
 * @param options.shown - whether one lane's dot is shown in a frame.
 * @param options.bound - a bound by name, as the case lane reads them.
 */
export function handoverJumps(handing, { shown, bound }) {
  const spots = (frame, which, dot) => (frame.loader.lanes || [])[which]?.spots?.[dot]
  const stepAfter = (at, which, dot) => {
    for (let next = at + 1; next < handing.length; next += 1) {
      const from = spots(handing[at], which, dot)
      const to = spots(handing[next], which, dot)
      if (from !== undefined && to !== undefined) return Math.hypot(to[0] - from[0], to[1] - from[1])
    }
    return 0
  }
  const jumps = []
  for (let at = 1; at < handing.length; at += 1) {
    const earlier = dotsInView(handing[at - 1], shown)
    const lanesBefore = handing[at - 1].loader.lanes || []
    ;(handing[at].loader.lanes || []).forEach((lane, which) => {
      (lane.spots || []).forEach((spot, dot) => {
        if (!shown(lane, dot) || shown(lanesBefore[which] || {}, dot)) return
        const gap = Math.min(...earlier.map((one) => Math.hypot(one[0] - spot[0], one[1] - spot[1])))
        const allowance = bound('loaderHandOverStepPx') + stepAfter(at, which, dot)
        if (!(gap <= allowance)) jumps.push({ lane: lane.name, dot, gap: Number(gap.toFixed(2)) })
      })
    })
  }
  return jumps
}
