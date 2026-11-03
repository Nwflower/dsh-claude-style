import { check, basicChecks, same } from './_shared.mjs'

/** One row by the name its label carries. */
function byName(rows) {
  return (rows || []).reduce((all, row) => { all[row.name] = row; return all }, {})
}

/** Whether a computed `rgb()` is neutral enough to read as grey: no channel leads by more than a neutral host step. */
function neutral(colour) {
  if (typeof colour !== 'string') return false
  const channels = colour.match(/[\d.]+/g)
  if (channels === null || channels.length < 3) return false
  const [r, g, b] = channels.slice(0, 3).map(Number)
  return Math.max(r, g, b) - Math.min(r, g, b) <= 18
}

export default {
  /**
   * The model menu's rows and the peak rate meter every one of them carries: an
   * official model a profile claims, one no profile claims, the seat's own row
   * at the bottom of level 1 (whose provider that level does not list), and a
   * level-2 row.
   */
  'model-meter'(r) {
    basicChecks(r)
    const meter = r.modelMeter || {}
    const levelOne = meter.levelOne || []
    const one = byName(levelOne)
    const two = byName(meter.levelTwo)
    check('the picker draws level 1 with the seat\'s own row under the list',
      levelOne.length === 3 && one['V4.1 Flash'] !== undefined && one['Kimi K3'] !== undefined && one['GLM-5.3'] !== undefined,
      JSON.stringify(levelOne.map((row) => row.name)))
    check('the official Flash row carries the host\'s 1017 release tag, and the other rows do not',
      one['V4.1 Flash'] !== undefined && one['V4.1 Flash'].text.includes('1017') &&
        one['Kimi K3'] !== undefined && !one['Kimi K3'].text.includes('1017'),
      JSON.stringify({
        flash: one['V4.1 Flash'] === undefined ? null : one['V4.1 Flash'].text,
        kimi: one['Kimi K3'] === undefined ? null : one['Kimi K3'].text,
      }))
    check('the seat\'s row is the current one and the last of that level',
      meter.currentRow !== null && meter.currentRow !== undefined && meter.currentRow.current === true && meter.currentRow.name === 'GLM-5.3',
      JSON.stringify(meter.currentRow))
    check('the seat\'s own row carries the meter too, with the rate in force on it',
      meter.currentRow !== null && meter.currentRow !== undefined && meter.currentRow.meter !== null &&
        meter.currentRow.meter.period === 'campaign' && meter.currentRow.meter.value === '0.5×' && meter.currentRow.meter.icon,
      JSON.stringify(meter.currentRow === null || meter.currentRow === undefined ? null : meter.currentRow.meter))
    check('an official model a profile claims carries its rate and its countdown',
      one['V4.1 Flash'] !== undefined && one['V4.1 Flash'].meter !== null &&
        (one['V4.1 Flash'].meter.period === 'peak' || one['V4.1 Flash'].meter.period === 'offPeak') &&
        (one['V4.1 Flash'].meter.value === '2×' || one['V4.1 Flash'].meter.value === '1×') &&
        /^· \d+[mhd]/.test(one['V4.1 Flash'].meter.countdown),
      JSON.stringify(one['V4.1 Flash'] === undefined ? null : one['V4.1 Flash'].meter))
    check('a model no profile claims carries nothing at all',
      one['Kimi K3'] !== undefined && one['Kimi K3'].meter === null,
      JSON.stringify(one['Kimi K3']))
    check('every meter stands immediately in front of its row\'s check, and names its judgement',
      levelOne.every((row) => row.meter === null || (row.meter.beforeCheck === true && row.meter.title !== null && row.meter.title !== '')),
      JSON.stringify(levelOne.map((row) => row.meter === null ? null : { beforeCheck: row.meter.beforeCheck, title: row.meter.title })))
    const listed = one['V4.1 Flash']
    check('the seat\'s row is drawn as the list rows are: same height, padding, radius and layout',
      meter.currentRow !== null && meter.currentRow !== undefined && listed !== undefined &&
        same(meter.currentRow.box, listed.box),
      JSON.stringify({ current: meter.currentRow === null || meter.currentRow === undefined ? null : meter.currentRow.box, listed: listed === undefined ? null : listed.box }))
    check('the second level carries the same meter on its rows',
      two['GLM-5.3'] !== undefined && two['GLM-5.3'].meter !== null &&
        two['GLM-5.3'].meter.period === 'campaign' && two['GLM-5.3'].meter.value === '0.5×' &&
        two['GLM-5.3'].meter.beforeCheck === true,
      JSON.stringify(two['GLM-5.3'] === undefined ? null : two['GLM-5.3'].meter))
    const press = r.modelPress || {}
    check('with the hover preference on, a press on the open model menu keeps it up',
      press.opened === true && press.kept === true,
      JSON.stringify({ opened: press.opened, kept: press.kept }))
    const descriptions = r.modelDescriptions || {}
    check('every row of the first level carries a line saying what the model is while Model descriptions is on, and turning it off takes the line off that level alone',
      descriptions.listed === 3 && descriptions.lines === 3 &&
        descriptions.bareListed === 3 && descriptions.bareLines === 0 &&
        descriptions.secondLevelLines === 0 && descriptions.bareSecondLevelLines === 0,
      JSON.stringify(descriptions))
    // The picker's switch is live: its teardown hands the host's own seat and
    // menu back, and installing it again takes the seat over once more.
    const picker = r.modelPicker || {}
    check('switching the model picker off hands the host\'s own seat back, and on takes it over again',
      picker.off !== undefined && picker.off.trigger === false && picker.off.hostMarked === false &&
        picker.back !== undefined && picker.back.trigger === true && picker.back.hostMarked === true,
      JSON.stringify(picker))
    const seat = r.modelSeat || {}
    check('the seat\'s own line carries the tag with the Flash model in force, on a neutral plate and ink',
      seat.text !== null && seat.text.includes('V4.1 Flash') && seat.text.includes('1017') &&
        seat.tagBg !== null && seat.tagBg !== 'rgba(0, 0, 0, 0)' && neutral(seat.tagBg) && neutral(seat.tagColor),
      JSON.stringify(seat))
    const external = r.externalControls || {}
    check('the control registry mounts an independent model picker, rejects an unknown id and preserves the composer on teardown',
      external.available === true && external.mountedCount === 2 && external.externalPopover === true &&
        external.unknownRejected === true && external.remainingCount === 1 && external.slotClean === true &&
        external.externalStyle != null && external.externalStyle.display === 'flex' && external.externalStyle.height === '28px' &&
        external.externalStyle.border === '0px' && external.externalStyle.background === 'rgba(0, 0, 0, 0)',
      JSON.stringify(external))
  },
  'model-account'(r) {
    basicChecks(r)
    const account = r.modelAccount || {}
    check('with no API key, the signed-in account leads the first level beside the chosen provider',
      Array.isArray(account.levelOne) && account.levelOne[0] === 'DeepSeek V4.1 Flash' && account.levelOne[1] === 'GLM-5.3' &&
        account.lead === 'DeepSeek Account',
      JSON.stringify(account))
    check('the account that leads the first level is not repeated behind More models',
      Array.isArray(account.levelTwo) && account.levelTwo.includes('Gateway Flash') && !account.levelTwo.includes('DeepSeek V4.1 Flash'),
      JSON.stringify(account.levelTwo))
  },
}
