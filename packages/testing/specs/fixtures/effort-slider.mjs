/**
 * The effort slider's geometry after its card opens: the track's box, the
 * knob's box, the centre line they share, and `segment`, the travel between two
 * neighbouring stops.
 *
 * @param stops - how many rungs the ladder holds.
 */
async function openSlider(t, stops) {
  await t.page.click(t.surface('effort.trigger'))
  await t.settle()
  const track = await t.read.box(t.surface('effort.track'))
  const knob = await t.read.box(t.surface('effort.knob'))
  return {
    track,
    knob,
    y: track.top + track.height / 2,
    segment: (track.width - knob.width) / (stops - 1),
  }
}

/** The centre of a stop's resting position along the track. */
function stopX(track, knob, share) {
  return track.left + knob.width / 2 + (track.width - knob.width) * share
}

export { openSlider, stopX }
