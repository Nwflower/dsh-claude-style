/**
 * Runs in the page after the bundle: applies the skin, then runs the steps the
 * other parts register, in the order page.cjs injects them, and answers with the
 * report object the cases read.
 *
 * A part reaches shared state through window.__dshSmokeProbe alone: the report
 * it fills in, the registration list, the readers every part uses, and the
 * surfaces a step builds and a later one hands back at teardown.
 */
(function () {
  window.__applyError = null
  try { window.__skin.apply(window.__ctx) } catch (e) { window.__applyError = String((e && e.stack) || e) }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms) }) }
  /** One frame, through the rAF the stand-in did not wrap, so asking for it is no pass of the skin's. */
  function frame() { return new Promise(function (done) { window.__nativeRaf(function () { done() }) }) }
  /** Whether every finite animation on the page has landed; an endless one is the page's own life. */
  function landed() {
    return document.getAnimations().every(function (animation) {
      if (animation.playState !== 'running' && animation.playState !== 'pending') return true
      var timing = animation.effect === null ? null : animation.effect.getComputedTiming()
      return timing !== null && timing.iterations === Infinity
    })
  }
  /**
   * Record `read()` on every frame from now until the page has settled, and
   * answer the readings with the settled one last (D86: the settle rule). The
   * page has settled when its finite animations have landed and the skin has
   * asked for no pass for eight frames' worth of a 60 Hz display (134 ms, over
   * at least two frames, so a slower display waits the same wall clock). A clock
   * of the page's own — the waiting line ticks four times a second while a turn
   * runs — is its life, the way an endless animation is, so a quiet run between
   * two ticks counts. `quietMs` adds a stretch of wall clock with no pass at
   * all, for a reading that counts passes itself. A page that never settles
   * fails the step by name.
   */
  async function watch(read, quietMs) {
    var readings = []
    var quietFrames = 0
    var lastPass = performance.now()
    var started = performance.now()
    for (;;) {
      if (read !== undefined) readings.push(read())
      var before = window.__passes
      await frame()
      if (window.__passes === before) quietFrames += 1
      else {
        quietFrames = 0
        lastPass = performance.now()
      }
      if (quietFrames >= 2 && performance.now() - lastPass >= Math.max(134, quietMs || 0) && landed()) break
      if (performance.now() - started > 8000) throw new Error('smoke: the page did not settle within eight seconds')
    }
    if (read !== undefined) readings.push(read())
    return readings
  }
  /** Wait for the page to settle (see watch). */
  function settle(quietMs) { return watch(undefined, quietMs) }
  /**
   * Record `read()` on every frame until `reached(readings)` holds, for a page
   * that keeps moving on a clock of its own and so never settles; the readings
   * end with the one that reached. A state that never comes fails the step by
   * name once `limitMs` (eight seconds unless the state's own clock is longer)
   * has passed.
   */
  async function until(read, reached, what, limitMs) {
    var limit = limitMs === undefined ? 8000 : limitMs
    var readings = []
    var started = performance.now()
    for (;;) {
      readings.push(read())
      if (reached(readings)) return readings
      if (performance.now() - started > limit) throw new Error('smoke: ' + what + ' did not happen within ' + limit + ' ms')
      await frame()
    }
  }
  function attrs(el) { return el ? Array.prototype.map.call(el.attributes, function (a) { return a.name }) : null }
  // A segmented control's sliding pill (packages/client/src/shared/sliding-pill.ts) against
  // the item it should sit under: its mark, its written placement, the item's
  // own fill (which gives way to the pill) and the transitions running on it.
  function pillState(control, item) {
    var box = control.getBoundingClientRect()
    var itemBox = item.getBoundingClientRect()
    var slides = control.getAnimations({ subtree: true }).filter(function (a) {
      return a.effect && a.effect.pseudoElement === '::before'
    })
    return {
      attr: control.hasAttribute('data-dsh-claude-pill'),
      content: getComputedStyle(control, '::before').content,
      x: parseFloat(control.style.getPropertyValue('--dsh-claude-pill-x')),
      w: parseFloat(control.style.getPropertyValue('--dsh-claude-pill-w')),
      itemX: itemBox.left - box.left - control.clientLeft,
      itemW: itemBox.width,
      itemFill: getComputedStyle(item).backgroundColor,
      slides: slides.map(function (a) { return a.transitionProperty }),
    }
  }

  var probe = {
    sleep: sleep,
    frame: frame,
    watch: watch,
    settle: settle,
    until: until,
    attrs: attrs,
    pillState: pillState,
    report: { applyError: window.__applyError, teardownRegistered: typeof window.__dispose === 'function' },
    steps: [],
    // The view-tab strip and the search root the shell cases build, and the
    // sibling's sheet the page carried before the bundle ran: the teardown step
    // reads all three back.
    viewStrip: null,
    searchRoot: null,
    siblingSheet: null,
    /** Register one step; the parts run in the order page.cjs injects them. */
    step: function (body) { probe.steps.push(body) },
    /**
     * One case's own collection: `body` runs when the cases this page load
     * carries include one of `names` (page.cjs sets window.SMOKE_GROUPS to
     * them, and window.SMOKE_CASE to the page's own name for the pages that
     * carry a single case). This is the only place that decides, and a list
     * that matches none of them leaves that case's assertions short of their
     * fields, so they fail.
     */
    onlyFor: async function (names, body) {
      var running = window.SMOKE_GROUPS || [window.SMOKE_CASE]
      if (names.some(function (name) { return running.indexOf(name) !== -1 })) await body()
    },
  }
  window.__dshSmokeProbe = probe
  window.__smoke = (async function () {
    // Every part is injected as one script, so yielding once lets that script
    // finish registering its steps before the first one runs.
    await Promise.resolve()
    for (var i = 0; i < probe.steps.length; i++) await probe.steps[i]()
    return probe.report
  })()
})()
