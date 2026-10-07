/**
 * What every smoke case opens with, and the small helpers the cases share.
 */
'use strict'
const { MARKUP, SKIN_FACE, SKIN_HAT, same, check } = require('../shared.cjs')

/** WCAG contrast ratio between two `rgb(r, g, b)` readings. */
function contrast(a, b) {
  const luminance = (css) => {
    const channels = css.match(/[\d.]+/g).slice(0, 3).map((raw) => {
      const c = Number(raw) / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  }
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

/**
 * The two checks every case opens with: the install completed and no feature
 * reported a failure. The cases whose subject is a failing host API
 * (install-fault, sync-fault) state their own expectations instead, and the
 * three that never look at the console keep the install check alone.
 */
function basicChecks(r) {
  check('apply() completes', r.applyError === null, r.applyError)
  check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
}

/** Checks every case shares: a clean teardown and an idle scheduler. */
function commonChecks(r) {
  check('nothing the skin runs leaves an uncaught error or an unhandled rejection',
    Array.isArray(r.uncaught) && r.uncaught.length === 0, (r.uncaught || []).join(' | ').slice(0, 600))
  check("the model trigger rule reaches the host's trigger alone: a menu nested in the seat stays a block, the marked seat root stays hidden",
    !r.composerRestyle || (r.modelSeat.trigger === 'inline-flex' && r.modelSeat.nestedMenu === 'block' && r.modelSeat.markedRoot === 'none'),
    JSON.stringify(r.modelSeat))
  check('the home layout attribute follows the preference',
    r.homeLayoutAttr === r.homeLayoutExpected,
    JSON.stringify({ attribute: r.homeLayoutAttr, expected: r.homeLayoutExpected }))
  check("the host's solid hover chip keeps its label readable on its fill",
    r.chipInk !== null && r.chipFill !== null && contrast(r.chipInk, r.chipFill) >= 4.5,
    JSON.stringify({ ink: r.chipInk, fill: r.chipFill }))
  check('a filled host anchor keeps its own ink instead of the link colour',
    r.topUpInk !== null && r.topUpFill !== null && r.topUpInk !== r.topUpFill &&
      contrast(r.topUpInk, r.topUpFill) >= 3,
    JSON.stringify({ ink: r.topUpInk, fill: r.topUpFill }))
  check('the idle session seat draws the status circle through the slot outlet',
    r.seatIdle !== null && r.seatIdle.content !== 'none' && r.seatIdle.width === '5px',
    JSON.stringify(r.seatIdle))
  check('a seat carrying the running status dot draws no circle',
    r.seatRunning !== null && r.seatRunning.content === 'none' && r.seatRunning.svgs > 0,
    JSON.stringify(r.seatRunning))
  check('scheduler idle once settled (0 passes in 1 s)', r.idlePasses === 0, `${r.idlePasses} passes`, 'timing')
  check('a closed popover card claims no menu role for the host\'s keyboard arbitration',
    r.closedMenuCards === 0, `${r.closedMenuCards} closed cards carry role=menu`)
  check('no Windows titlebar marker: the body carries no data-dsh-titlebar-tabs',
    r.titlebarTabs === false, JSON.stringify(r.titlebarTabs))
  check('teardown registered with the host', r.teardownRegistered)
  check("the sheet carries this package's own module-system tags, so no sibling's bookkeeping can take it away",
    r.sheetPlugin === 'dsh-claude-style' && r.sheetPluginCss === 'dsh-claude-style/client.css' && r.sheetClaimable === false,
    JSON.stringify({ plugin: r.sheetPlugin, css: r.sheetPluginCss, claimable: r.sheetClaimable }))
  check("a sibling's untagged sheet stays out of this package's bookkeeping, so no reload of this package removes it",
    r.siblingSheetTag === 'dsh-claude-style/foreign-sheet' && r.siblingSheetClaimable === false && r.siblingSheetSurvives === true,
    JSON.stringify({ tag: r.siblingSheetTag, claimable: r.siblingSheetClaimable, survives: r.siblingSheetSurvives }))
  check("a sibling's sheet arriving after this bundle is parked before any package can claim it",
    r.lateSheetTag === 'dsh-claude-style/foreign-sheet' && r.lateSheetClaimable === false,
    JSON.stringify({ tag: r.lateSheetTag, claimable: r.lateSheetClaimable }))
  if (!r.teardownRegistered) return
  check('teardown leaves no skin node, marker, body attribute or stylesheet',
    r.leftNodes === 0 && r.leftMarkers === 0 && r.leftAttrs.length === 0 && !r.leftStylesheet,
    `nodes ${r.leftNodes}, markers ${r.leftMarkers}, attrs ${JSON.stringify(r.leftAttrs)}, stylesheet ${r.leftStylesheet}`)
  check('no pass runs after teardown', r.passesAfterTeardown === 0, `${r.passesAfterTeardown} passes`)
  check("the host's own account row is handed back visible and clickable",
    !r.hostRowPresent || (r.hostRowEnd !== null && r.hostRowEnd.visibility === 'visible' &&
      r.hostRowEnd.pointerEvents === 'auto' && r.hostRowEnd.display !== 'none' && r.hostRowEnd.width > 0),
    JSON.stringify(r.hostRowEnd))
}

module.exports = { MARKUP, SKIN_FACE, SKIN_HAT, same, check, contrast, basicChecks, commonChecks }
