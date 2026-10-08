'use strict'
const { check, basicChecks, same } = require('./_shared.cjs')

/** One row by the name its label carries. */
function byName(rows) {
  return (rows || []).reduce((all, row) => { all[row.name] = row; return all }, {})
}

module.exports = {
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
  },
}
