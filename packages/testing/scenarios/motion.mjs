#!/usr/bin/env node
/**
 * motion.mjs — the transitions.dev surfaces on the real page (D9, D92).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.mjs).
 *
 * Each surface is read where it moves, by the animation or the transition it
 * plays and the state it comes to rest in: the home greeting rising, the usage
 * panel's numbers taking over from its placeholders, a settings switch that
 * bounces only once pressed, a settings tab sliding in while a still copy of the
 * one it replaced slides out, the overtime badge popping onto the waiting line
 * and playing its exit before it hides, and a menu card growing out of its
 * trigger and dipping only a little as it closes. The `process` script keeps the
 * model silent past the overtime mark, so the badge comes and goes in one turn.
 * The page runs the studio home, which draws the usage panel.
 */
import { waitForSkin } from '../dsh-web.mjs'
import { recordUntil } from '../lane.mjs'
import { openSkinSettings } from './remote-settings.mjs'

/** The host's page markers this scenario reads. */
const HOST = {
  brandMark: '[data-dsh-claude-part~="hero-mark"]', // the hero's brand mark seat (theme/hero.css)
  greeting: '[data-dsh-claude-part~="hero-mark"] + [data-dsh-claude-part~="hero-title-group"]', // the hero's greeting beside it
}

/** The skin's own marks (the stylesheets and modules each names). */
const SKIN = {
  revealing: 'data-dsh-claude-revealing', // home-layout.ts
  statValue: '.dsh-claude-home-stat-value',
  page: '.dsh-claude-settings',
  switch: 'fieldset.dsh-claude-settings-rows .dsh-claude-settings-switch:not(:disabled)',
  tab: '.dsh-claude-settings-tabs [role="tab"]',
  rows: '.dsh-claude-settings-pages > fieldset.dsh-claude-settings-rows',
  leaving: '.dsh-claude-settings-leaving',
  badge: '.dsh-claude-chat-wait-badge',
  badgeLeaving: 'data-dsh-claude-wait-badge-leaving', // chat-wait.ts
  modelButton: '.dsh-claude-model-btn',
  modelCard: '.dsh-claude-model-popover:not(.dsh-claude-model-popover-sub)',
}

/** Record every hand-over the usage panel plays, from the page's first frame. */
function watchReveal(marks) {
  window.__motionReveal = []
  new MutationObserver((records) => {
    for (const record of records) {
      const panel = record.target
      if (!(panel instanceof Element) || !panel.hasAttribute(marks.revealing)) continue
      const value = panel.querySelector(marks.statValue)
      window.__motionReveal.push({ words: value === null ? null : getComputedStyle(value).animationName })
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: [marks.revealing] })
}

/** The animation an element plays, its delay, and nothing when it is not there. */
const animationOf = (page, selector) => page.evaluate((target) => {
  const element = document.querySelector(target)
  if (element === null) return null
  const style = getComputedStyle(element)
  return { name: style.animationName, delay: style.animationDelay }
}, selector)

/*
 * Each surface is recorded on every frame from the press until its own motion
 * has landed: the settings page keeps preview cards moving on their own clocks,
 * so the page as a whole never comes to rest, and what is waited for is the
 * element under test (D92: the settle rule).
 */

/** The first settings switch's knob, read inside the page, with whether its own motion is still running. */
function knobInPage(marks) {
  const element = document.querySelector(marks.switch)
  const knob = element.querySelector('.dsh-claude-settings-switch-knob')
  const style = getComputedStyle(knob)
  return {
    label: element.getAttribute('aria-label'),
    moved: element.hasAttribute('data-moved'),
    on: element.hasAttribute('data-on'),
    animation: style.animationName,
    running: knob.getAnimations().some((animation) => (animation.playState === 'running' || animation.playState === 'pending') && animation.effect?.getComputedTiming().iterations !== Infinity),
  }
}

/** A press's frames end once the motion it started has run and stopped. */
const motionLanded = (frames) => frames.some((frame) => frame.running) && !frames[frames.length - 1].running

/**
 * The settings switch: read at rest, recorded on every frame from a press
 * until its knob lands, and left with the value it had. The scenario's own
 * patch layer stands over the saved settings, so a written value can come back
 * to the one the layers resolve to; the switch is pressed again only when it
 * has not.
 */
async function readSwitch(page) {
  const control = page.locator(SKIN.switch).first()
  const before = await page.evaluate(knobInPage, SKIN)
  await control.click()
  const frames = await recordUntil(page, knobInPage, motionLanded, SKIN, 8000, 'the switch knob landing')
  let after = frames[frames.length - 1]
  if (after.on !== before.on) {
    await control.click()
    const back = await recordUntil(page, knobInPage, motionLanded, SKIN, 8000, 'the switch knob landing again')
    after = back[back.length - 1]
  }
  return { before, pressed: frames.filter((frame) => frame.animation !== 'none'), after }
}

/** The settings page's rows and the still copy of a tab leaving, read inside the page. */
function slideInPage(marks) {
  const rows = document.querySelector(marks.rows)
  const still = document.querySelector(`${marks.leaving} > *`)
  return {
    enter: rows === null ? null : rows.getAttribute('data-dsh-claude-page-enter'),
    enterAnimation: rows === null ? null : getComputedStyle(rows).animationName,
    leave: still === null ? null : still.getAttribute('data-dsh-claude-page-leave'),
    leaveAnimation: still === null ? null : getComputedStyle(still).animationName,
    hidden: still === null ? null : still.getAttribute('aria-hidden') === 'true' && still.hasAttribute('inert') && !still.hasAttribute('role'),
    leaving: document.querySelectorAll(`${marks.leaving} > *`).length,
    running: rows !== null && rows.getAnimations().some((animation) => (animation.playState === 'running' || animation.playState === 'pending') && animation.effect?.getComputedTiming().iterations !== Infinity),
  }
}

/** A slide's frames end once its still copy is gone and the arriving rows have landed. */
const slideLanded = (frames) => frames.some((frame) => frame.leaving > 0) && frames[frames.length - 1].leaving === 0 && !frames[frames.length - 1].running

/** A tab change: every frame of the slide, from the press until it has landed. */
async function readTabSlide(page, tab) {
  await page.locator(SKIN.tab).nth(tab).click()
  const frames = await recordUntil(page, slideInPage, slideLanded, SKIN, 8000, 'the settings tab slide landing')
  return { during: frames.filter((frame) => frame.leaving > 0), after: frames[frames.length - 1].leaving }
}

/** The model card, read inside the page, with whether its own motion is still running. */
function cardInPage(marks) {
  const element = document.querySelector(marks.modelCard)
  if (element === null) return null
  const style = getComputedStyle(element)
  return {
    open: element.getAttribute('data-open'),
    scale: style.scale,
    transform: style.transform,
    opacity: style.opacity,
    visibility: style.visibility,
    running: element.getAnimations().some((animation) => (animation.playState === 'running' || animation.playState === 'pending') && animation.effect?.getComputedTiming().iterations !== Infinity),
  }
}

/**
 * The model card open, or closed, once the motion the press started has run
 * and landed; each runs in the page, so neither carries a closure.
 */
const cardOpened = (frames) => frames.some((frame) => frame !== null && frame.running) &&
  frames[frames.length - 1] !== null && frames[frames.length - 1].open === 'true' && !frames[frames.length - 1].running
const cardClosed = (frames) => frames.some((frame) => frame !== null && frame.running) &&
  frames[frames.length - 1] !== null && frames[frames.length - 1].open === 'false' && !frames[frames.length - 1].running

/** The model card: open and landed, then closed and landed. */
async function readMenu(page) {
  await page.locator(SKIN.modelButton).first().click()
  const opening = await recordUntil(page, cardInPage, cardOpened, SKIN, 8000, 'the model card opening')
  // A press on the trigger keeps a card the hover opened; Escape closes it.
  await page.keyboard.press('Escape')
  const closing = await recordUntil(page, cardInPage, cardClosed, SKIN, 8000, 'the model card closing')
  return { opened: opening[opening.length - 1], closed: closing[closing.length - 1] }
}

function motionScenario({ check }) {
  return {
    script: 'process',
    prompt: 'take your time, then answer',
    viewport: { width: 1280, height: 900 },
    patch: [
      '- id: ui-skin-claude-style',
      '  config:',
      '    homeLayout: studio',
    ],
    initScript: { content: `(${watchReveal.toString()})(${JSON.stringify(SKIN)})` },
    /** The home page before the turn: the greeting, the panel, the settings page. */
    async beforeSend(context) {
      const { page, notes } = context
      await waitForSkin(page)
      notes.mark = await animationOf(page, HOST.brandMark)
      notes.greeting = await animationOf(page, HOST.greeting)
      await page.waitForFunction(() => (window.__motionReveal ?? []).length > 0, undefined, { timeout: 30000 }).catch(() => {})
      notes.reveal = await page.evaluate(() => window.__motionReveal ?? [])
      await openSkinSettings(page)
      notes.slide = await readTabSlide(page, 1)
      // The main window tab carries switches of its own; the general tab has none.
      await readTabSlide(page, 2)
      notes.switch = await readSwitch(page)
      await page.keyboard.press('Escape')
      await page.locator(SKIN.page).first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {})
    },
    /** The overtime badge: out once the silence runs over, then its exit before it hides. */
    async duringTurn(context) {
      const { page, notes } = context
      await page.waitForSelector(`${SKIN.badge}:not([hidden])`, { timeout: 20000 })
      notes.badgeIn = await animationOf(page, `${SKIN.badge}:not([hidden])`)
      // The exit lasts one exit duration, shorter than a poll can be trusted to
      // see: the page records the leaving mark itself, and whether the badge was
      // still laid out when it arrived.
      await page.evaluate((marks) => {
        const badge = document.querySelector(marks.badge)
        window.__motionBadge = []
        new MutationObserver(() => {
          window.__motionBadge.push({ leaving: badge.hasAttribute(marks.badgeLeaving), hidden: badge.hidden })
        }).observe(badge, { attributes: true, attributeFilter: [marks.badgeLeaving, 'hidden'] })
      }, SKIN)
      await page.waitForFunction((marks) => document.querySelector(marks.badge).hidden, SKIN, { timeout: 30000 })
      notes.badgeSteps = await page.evaluate(() => window.__motionBadge)
    },
    async afterTurn(context) {
      context.notes.menu = await readMenu(context.page)
    },
    async assert({ session, notes }) {
      const reveal = notes.reveal ?? []
      const sw = notes.switch ?? {}
      const slide = notes.slide ?? {}
      const menu = notes.menu ?? {}
      const closedScale = Number.parseFloat(menu.closed?.scale ?? 'NaN')
      return [
        check('首页标题的标志与问候语错开升起',
          notes.mark?.name === 'dsh-claude-hero-rise' && notes.greeting?.name === 'dsh-claude-hero-rise' && notes.greeting?.delay !== '0s' && notes.mark?.delay === '0s',
          JSON.stringify({ mark: notes.mark, greeting: notes.greeting })),
        check('用量面板的数字到达时从占位里显出来',
          reveal.length > 0 && reveal[0].words === 'dsh-claude-home-reveal-words', JSON.stringify(reveal)),
        check('开关打开页面时静止，按下的那一刻才弹跳着过去，最后留下原来的值',
          sw.before?.moved === false && sw.before?.animation === 'none' &&
            sw.pressed?.[0]?.moved === true && sw.pressed[0].on !== sw.before?.on &&
            sw.pressed[0].animation === (sw.pressed[0].on ? 'dsh-claude-switch-on' : 'dsh-claude-switch-off') &&
            sw.after?.on === sw.before?.on,
          JSON.stringify(sw)),
        check('切到右侧的标签时新页从右侧滑入，旧页的静止副本向左滑出、不进入读屏与 Tab 顺序，播完即移除',
          (slide.during ?? []).length > 0 && slide.during.every((frame) => frame.enter === 'forward' && frame.enterAnimation === 'dsh-claude-page-in' &&
            frame.leave === 'forward' && frame.leaveAnimation === 'dsh-claude-page-out' && frame.hidden === true) && slide.after === 0,
          JSON.stringify({ during: (slide.during ?? []).slice(0, 2), frames: (slide.during ?? []).length, after: slide.after })),
        check('超时徽标弹出时滑入，离开时先播完退出再隐藏',
          notes.badgeIn?.name === 'dsh-claude-wait-badge-in' &&
            JSON.stringify(notes.badgeSteps) === JSON.stringify([{ leaving: true, hidden: false }, { leaving: false, hidden: true }]),
          JSON.stringify({ in: notes.badgeIn, steps: notes.badgeSteps })),
        check('菜单卡片展开后停在原尺寸，收起后回到从触发点长出的起始比例',
          menu.opened?.open === 'true' && menu.opened?.scale === '1' && menu.opened?.transform === 'none' && menu.opened?.opacity === '1' &&
            menu.closed?.open === 'false' && menu.closed?.visibility === 'hidden' && Math.abs(closedScale * 0.99 - 0.97) < 0.001 &&
            /^matrix\(0\.99, 0, 0, 0\.99,/.test(menu.closed?.transform ?? ''),
          JSON.stringify(menu)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { motionScenario }
