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
