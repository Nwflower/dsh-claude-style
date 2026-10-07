/**
 * The two mascots:
 * the pixel crab’s states and the whale’s sheets.
 */
'use strict'
const { MARKUP, SKIN_FACE, SKIN_HAT, same, check, contrast, basicChecks, commonChecks } = require('./_shared.cjs')

module.exports = {
  'crab-states'(r) {
    basicChecks(r)
    const crab = r.states || {}
    const is = (state, animation, place) => !!state && state.animation === animation && state.place === place && state.ready === true
    check('picked under the Claude brand, the crab stands on the home card idling, from its inlined sheet',
      is(crab.home, 'idle', 'card') && /^url\("data:image\/png/.test(crab.home.sheet), JSON.stringify(crab.home))
    check('its frames change on its own node without waking a pass',
      !!crab.idle && crab.idle.before !== crab.idle.after && crab.idle.passes === 0, JSON.stringify(crab.idle))
    check('a click on its left half pokes it', is(crab.poke, 'poke-left', 'card'), JSON.stringify(crab.poke))
    check('on the conversation page it stands on the input area: thinking, typing, the hard hat with three sessions at work',
      is(crab.thinking, 'thinking', 'stack') && is(crab.typing, 'typing', 'stack') && is(crab.building, 'building', 'stack'),
      JSON.stringify({ thinking: crab.thinking, typing: crab.typing, building: crab.building }))
    check('an approval puts it on the approval panel with the notification',
      is(crab.notification, 'notification', 'panel'), JSON.stringify(crab.notification))
    check('compaction, the celebration when it ends, and the error shake over it',
      is(crab.compacting, 'compacting', 'stack') && is(crab.celebrating, 'happy', 'stack') && is(crab.failed, 'error', 'stack'),
      JSON.stringify({ compacting: crab.compacting, celebrating: crab.celebrating, failed: crab.failed }))
    // The error sheet's still frame is its fifth: column 4 of 26-cell-wide frames at 2px a cell.
    check('reduced motion holds the error sheet\'s still frame',
      crab.stillAttr === 'reduced' && !!crab.still && crab.still.before === '-208px 0px' && crab.still.after === '-208px 0px',
      JSON.stringify(crab.still))
    check('it idles after work, sleeps after a quiet minute, and a pointer move wakes it',
      is(crab.afterWork, 'idle', 'stack') && is(crab.asleep, 'sleeping', 'stack') && is(crab.woken, 'waking', 'stack'),
      JSON.stringify({ afterWork: crab.afterWork, asleep: crab.asleep, woken: crab.woken }))
    // The walk this case drives is the only one that reaches these two: the
    // whale's case reads two sheets and leaves.
    check('it subscribes to the session\'s chat target, which the host builds only for a subscriber',
      crab.chatFollowed === true, JSON.stringify(crab.chatFollowed))
    check('a compaction whose end comes back with the whole feed after a reconnect stops playing, uncelebrated',
      is(crab.resendBefore, 'compacting', 'stack') && is(crab.resent, 'idle', 'stack'),
      JSON.stringify({ before: crab.resendBefore, after: crab.resent }))
    check('it leaves with the conversation, and takes its anchor mark along', crab.gone === true, JSON.stringify(crab.gone))
    check('kept to the home page it stays off the conversation and stands on the home card',
      crab.backInConversation === true && crab.homeOnly === null && is(crab.homeOnlyHero, 'idle', 'card'),
      JSON.stringify({ back: crab.backInConversation, homeOnly: crab.homeOnly, hero: crab.homeOnlyHero }))
    check('with the mascot off it leaves; picking Deepy puts the whale out instead',
      crab.off === null && crab.deepyPicked === true, JSON.stringify({ off: crab.off, deepy: crab.deepyPicked }))
    commonChecks(r)
  },
  // The DeepSeek brand's whale: its palette, the sheet it plays on the home
  // card, the sheet a state change switches to, and the motion choice holding a
  // sheet's still frame. The states it plays on the conversation page are the
  // crab case's, which walks the mascot feature whole.
  deepy(r) {
    basicChecks(r)
    const deepy = r.states || {}
    const is = (state, animation, place) => !!state && state.animation === animation && state.place === place && state.ready === true
    check('the brand stored as "off" reads as DeepSeek, and the light canvas turns sky white',
      deepy.brand === 'deepseek' && deepy.canvas === 'rgb(250, 251, 255)', JSON.stringify({ brand: deepy.brand, canvas: deepy.canvas }))
    check('the DeepSeek brand turns blue: DeepSeek\'s brand blue for the accent, a blue link, a blue-black dark canvas',
      deepy.accent === '#4d6bfe' && deepy.link === '#3b56d9' && !!deepy.dark && deepy.dark.canvas === 'rgb(19, 22, 29)' &&
        deepy.dark.accent === '#4d6bfe' && deepy.dark.raised === '#1b1f28',
      JSON.stringify({ accent: deepy.accent, link: deepy.link, dark: deepy.dark }))
    // The sheet is the vector the build produced, served from the assets route
    // under the name its own content gives it (D38).
    const served = (value) => /^url\("https?:\/\/[^"]*\/dsh-claude-style\/assets\/[0-9a-f]{12}\.svg"\)$/.test(value || '')
    check('the whale takes the crab\'s place on the home card, idling, playing the vector the build rebuilt from its sheet',
      is(deepy.home, 'idle', 'card') && deepy.crab === false && served(deepy.home.sheet),
      JSON.stringify({ home: deepy.home, crab: deepy.crab }))
    check('its frames change on its own node without waking a pass',
      !!deepy.idle && deepy.idle.before !== deepy.idle.after && deepy.idle.passes === 0, JSON.stringify(deepy.idle))
    check('a click on its face pokes it', is(deepy.poke, 'poke-left', 'card'), JSON.stringify(deepy.poke))
    check('the state change switches the node to another served sheet',
      !!deepy.home && !!deepy.poke && deepy.poke.sheet !== deepy.home.sheet && served(deepy.poke.sheet),
      JSON.stringify({ home: deepy.home.sheet, poke: deepy.poke.sheet }))
    check('the animation choice resolves onto the document: reduced holds the still frame, always plays',
      deepy.stillAttr === 'reduced' && deepy.alwaysAttr === 'full' &&
        !!deepy.still && deepy.still.before === deepy.still.after,
      JSON.stringify({ stillAttr: deepy.stillAttr, alwaysAttr: deepy.alwaysAttr, frames: deepy.still }))
    check('it leaves with the page, and takes its anchor mark along', deepy.gone === true, JSON.stringify(deepy.gone))
    commonChecks(r)
  },
}
