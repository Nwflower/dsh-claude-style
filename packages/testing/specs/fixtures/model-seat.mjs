/** Share one long model name between stand-in markup and behaviour locators. */
const MODEL_SEAT_NAME = 'DeepSeek V4 Reasoner Extended Context'

/** Delay directory re-enumeration so specs can observe the selection window frame by frame. */
async function holdEcho(page, ms) {
  await page.evaluate((delay) => {
    window.__dshSmokeHost.modelDirectories.directoryFor('smoke-session').echoDelay = delay
  }, ms)
}

export { MODEL_SEAT_NAME, holdEcho }
