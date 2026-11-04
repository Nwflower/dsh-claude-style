/**
 * importance.mjs — the lane's `importance` scenario: the walk over the page states (D9, D77).
 *
 * The audit itself is in importance-audit.mjs; this file is the walk that gives
 * it states to read — the empty page and a conversation, a draft in the
 * composer, the answer streaming, each of the skin's popovers and a host menu
 * open, the dark flip, the DeepSeek brand, the host's palette, every preference
 * the skin marks the page with, the settings page with each of its tabs and
 * controls, and the pointer on every element a `:hover` rule waits for. One the
 * states show to change nothing fails the run, and so does a selector no state
 * matches an element with: the ones the walk cannot reach are recorded in
 * importance-unreachable.json, each with its reason, and that record only shrinks.
 *
 * Run it as `node packages/testing/e2e.mjs --scenario importance`. With
 * `DSH_IMPORTANCE_REFERENCE=<stylesheet>` every state is also compared, element
 * by element, with that earlier stylesheet: the proof that a cleanup changed
 * nothing.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createImportanceAudit, planImportance, dropImportance, ROOT } from './importance-audit.mjs'
import { openSkinSettings } from './settings-route.mjs'
import { readAppearance, compareAppearance, writeAppearance, HOST_DEPENDENT_STATES } from './appearance.mjs'
import surfaceTable from './data/surface.json' with { type: 'json' }

/** A mark the walk sets, read from the surface table rather than spelled here (D77). */
const surfaceAttribute = (id) => surfaceTable.surface.find((entry) => entry.id === id).attribute

/**
 * The selectors this walk cannot reach, each under the reason it is out of
 * reach, recorded once from a run and reviewed by hand (D9). The list is a
 * debt: a selector the sheet writes that is neither matched in a state nor
 * recorded here fails the scenario, and a recorded one that starts matching
 * fails it too, so the list only shrinks.
 */
const UNREACHABLE_FILE = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'data', 'importance-unreachable.json'), 'utf8'))
const UNREACHABLE = new Map(UNREACHABLE_FILE.groups.flatMap((group) => group.selectors.map((selector) => [selector, group.reason])))
/**
 * A recorded group the walk cannot decide either way: its rules paint inside an
 * animation frame, or dress a row the host's own platform decides to render —
 * the walk reads the page at fixed moments on the machine it runs on, so such a
 * selector is caught in one run and missed in the next. The record holds either
 * way; every other entry still only shrinks.
 */
const EITHER = new Set(UNREACHABLE_FILE.groups.filter((group) => group.either === true).flatMap((group) => group.selectors))
/**
 * Every `!important` the walk proved necessary, with what it beats where it was
 * decided (D9): keyed by the rule's own text and the property, so a build check
 * can compute the same key from the source stylesheet without sharing an index.
 * The run fails when a declaration it needs is not recorded, or a recorded one
 * is no longer needed; `DSH_IMPORTANCE_LEDGER=write` writes the record from the
 * run so the difference is read in the diff.
 */
const LEDGER_FILE = path.join(import.meta.dirname, 'data', 'importance-ledger.json')
const LEDGER = JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'))
const evidenceKey = (item) => `${item.ruleKey}|${item.prop}`
/* ---------- the lane's scenario ---------- */

/** The skin's own triggers, each opening the surface its rules paint. */
const SURFACES = [
  ['model picker', '.dsh-claude-model-btn'],
  ['effort picker', '.dsh-claude-effort-btn'],
  ['permission picker', '.dsh-claude-perm-btn'],
  ['account card', '.dsh-claude-account-btn'],
  ['search panel', '.dsh-claude-search-trigger'],
]

/**
 * The marks the skin puts on `<body>` for its preferences and for what the
 * reader has supplied, each as `core/prefs.ts` writes it. A state sets one and
 * audits the page as that preference would leave it: no pass follows a write
 * the observation bus does not hear (D9), so the mark stands, and a rule whose
 * surface the page does not render stays unmatched whatever the mark says.
 */
const MARKS = [
  ['motion reduced', 'data-dsh-claude-motion', 'reduced'],
  ['motion full', 'data-dsh-claude-motion', 'full'],
  ['status motion sweep', 'data-dsh-claude-status-motion', 'sweep'],
  ['status motion wash', 'data-dsh-claude-status-motion', 'wash'],
  ['search style icon', 'data-dsh-claude-search-style', 'icon'],
  ['search style standalone', 'data-dsh-claude-search-style', 'standalone'],
  ['sidebar relaxed', 'data-dsh-claude-sidebar-layout', 'relaxed'],
  ['sidebar compact', 'data-dsh-claude-sidebar-layout', 'compact'],
  ['stats inline', 'data-dsh-claude-stats-position', 'inline'],
  ['stats context', 'data-dsh-claude-stats-position', 'context'],
  ['footer takeover', 'data-dsh-claude-footer-takeover', ''],
  ['mascot crab', 'data-dsh-claude-mascot', 'crab'],
  ['mascot deepy', 'data-dsh-claude-mascot', 'deepy'],
  ['custom brand mark', 'data-dsh-claude-custom-mark', ''],
  ['custom brand word', 'data-dsh-claude-custom-word', 'text'],
  ['custom brand word image', 'data-dsh-claude-custom-word', 'image'],
  ['custom brand tint', 'data-dsh-claude-custom-tint', ''],
  ['custom brand accent', 'data-dsh-claude-accent', '#d97757'],
  // The zoom the reader picks: the sheet keys its one `zoom` rule on a factor the
  // skin projects from this attribute (shared/page-zoom.ts), so the mark is the
  // whole state and the rule it reaches is the page drawn at that factor.
  ['page zoom 80', surfaceAttribute('skin.page-zoom'), '0.8'],
  ['page zoom 125', surfaceAttribute('skin.page-zoom'), '1.25'],
  ['page zoom 150', surfaceAttribute('skin.page-zoom'), '1.5'],
  // The window's focus state, which the skin mirrors onto the page for the
  // selection paints: a browser the lane drives keeps the focus, so the state
  // is set as the mirror writes it.
  ['window blurred', 'data-dsh-window-blur', ''],
]

/**
 * Where on the page an element can take the pointer: the centre of the first
 * visible match that is the topmost thing at its own centre.
 */
function pointAtInPage(selectors) {
  for (const selector of selectors) {
    let elements = []
    try { elements = [...document.querySelectorAll(selector)] } catch { continue }
    for (const element of elements) {
      const box = element.getBoundingClientRect()
      if (box.width < 2 || box.height < 2 || box.bottom < 0 || box.top > innerHeight) continue
      const x = box.left + box.width / 2
      const y = box.top + box.height / 2
      const top = document.elementFromPoint(x, y)
      if (top !== null && (top === element || element.contains(top))) return { x, y }
    }
  }
  return null
}

/**
 * The lane's `importance` scenario (packages/testing/e2e.mjs): the skin's
 * `!important` declarations audited across the page states the scratch host
 * reaches — the empty page and a conversation, a draft in the composer, the
 * answer streaming, each of the skin's popovers and a host menu open, the dark
 * flip, the DeepSeek brand, the host's palette, the pointer on every element
 * a `:hover` rule waits for, and the settings page with each of its tabs. One
 * the states show to change nothing fails it; so does a selector no state
 * matches an element with. The full verdict is written to
 * importance-verdicts.json.
 *
 * @param lane - the lane's `check`, `sendPrompt`, `waitForTurn` and its table of host marks.
 */
function importanceScenario(lane) {
  /** Type a draft into the composer without sending it, audit, and clear it again. */
  const withDraft = async (page, audit, name) => {
    await page.click('[data-composer-input]')
    await page.keyboard.type('a draft that stays in the composer')
    await page.waitForTimeout(300)
    await audit.state(name)
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(300)
  }
  /** Open what each visible trigger opens, audit, and close it with Escape. */
  const withOpen = async (page, audit, name, selector, limit = 1) => {
    const triggers = page.locator(selector).filter({ visible: true })
    const count = Math.min(await triggers.count(), limit)
    for (let at = 0; at < count; at++) {
      await triggers.nth(at).click()
      await page.waitForTimeout(500)
      await audit.state(count === 1 ? name : `${name} ${at + 1}`)
      await page.keyboard.press('Escape')
      await page.mouse.move(1, 1)
      await page.waitForTimeout(400)
    }
  }
  /** The host's own menus and dialogs: every visible trigger the page offers. */
  const HOST_TRIGGERS = '[aria-haspopup="menu"]:not(:is([class^="dsh-claude"], [class*=" dsh-claude"])), button[aria-haspopup="dialog"]:not(:is([class^="dsh-claude"], [class*=" dsh-claude"]))'
  /**
   * Every control the open settings tab offers, one state each: a preference
   * that renders the skin's own markup (the studio home panel, the mascot, the
   * ban screen, a search style's own box, the quick-provider menu) only puts its
   * elements on the page once the preference is on, and this is where the walk
   * turns them on. The image buttons are left alone — they open a file picker
   * rather than turn a preference on — and so are the fields that take typing.
   */
  const withControls = async (page, audit, tab) => {
    const controls = page.locator('.dsh-claude-settings-rows button:not([disabled]):not(.dsh-claude-settings-button)')
    const many = await controls.count()
    for (let index = 0; index < many; index++) {
      const control = controls.nth(index)
      if (!await control.isVisible()) continue
      await control.click({ force: true })
      await page.waitForTimeout(500)
      await audit.state(`settings control ${tab}.${index + 1}`)
      // The billing table's edit row opens the skin's own card over the tab
      // strip. The state above is audited with the card up, and the card is
      // closed here so the next tab's press is not swallowed by it.
      const card = page.locator('.dsh-claude-billing-card')
      if (await card.count() > 0) {
        await card.locator('.dsh-claude-billing-close').click({ force: true })
        await page.waitForTimeout(300)
      }
    }
  }

  /**
   * The settings page, which most of the sheet dresses and no pointer on the
   * conversation opens: the walk enters it by the host's own shortcut, audits it
   * and then every tab of it with each of the tab's controls pressed. It runs
   * last, since the dialog covers the page and the controls leave the reader's
   * choices behind.
   */
  const withSettings = async (page, audit) => {
    await openSkinSettings(page)
    await page.waitForTimeout(600)
    await audit.state('settings')
    const tabs = page.locator('.dsh-claude-settings-tabs [role="tab"]')
    const many = await tabs.count()
    for (let at = 1; at < many; at++) {
      await tabs.nth(at).click()
      await page.waitForTimeout(500)
      await audit.state(`settings tab ${at + 1}`)
      await withControls(page, audit, at + 1)
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }
  /**
   * Set or remove a body attribute, then let the page answer it: the skin's
   * theme flip holds transitions off for the frames around a palette change, and
   * a state audited inside that window would read the hold, not the page.
   */
  const attribute = async (page, name, value) => {
    await page.evaluate(([key, to]) => {
      if (to === null) document.body.removeAttribute(key)
      else document.body.setAttribute(key, to)
    }, [name, value])
    await page.waitForTimeout(400)
  }

  return {
    script: 'inspect',
    prompt: 'look at the workspace',
    // Signed in against the scripted platform, so the account card and the
    // footer carry a reader and a picture (packages/testing/mock-platform.mjs).
    account: true,
    // A slow stream, so the second answer is still arriving while it is audited.
    delayMs: 400,
    async beforeSend(context) {
      const { page } = context
      const reference = process.env.DSH_IMPORTANCE_REFERENCE
      const audit = await createImportanceAudit(page, reference === undefined ? undefined : fs.readFileSync(reference, 'utf8'))
      // Every state the walk audits is also read for the appearance layer
      // (appearance.mjs, D77): once the audit has landed the state's animations
      // and put the skin's own sheet back, so the reading is the page the
      // reader gets.
      context.appearance = {}
      const auditState = audit.state
      audit.state = async (name, only) => {
        const audited = await auditState(name, only)
        // The states read inside the host's own menus are audited but not
        // snapshotted: which controls the walk's query finds and what each menu
        // holds belong to the host version it runs against, so the readings of
        // one host describe another (appearance.mjs, HOST_DEPENDENT_STATES).
        if (!HOST_DEPENDENT_STATES.test(name)) context.appearance[name] = await readAppearance(page)
        return audited
      }
      context.audit = audit
      // Whether the host's own autofocus has reached the composer by the first
      // reading depends on how fast the page came up, and the composer stack
      // dresses its rows by that focus: the walk puts it there itself.
      await page.focus('[data-composer-input]')
      await context.audit.state('hero')
      await withDraft(page, context.audit, 'hero draft')
      await withOpen(page, context.audit, 'hero host surface', HOST_TRIGGERS, 6)
    },
    async afterTurn(context) {
      const { page, audit } = context
      await audit.state('conversation')
      await withDraft(page, audit, 'conversation draft')
      for (const [name, selector] of SURFACES) await withOpen(page, audit, name, selector)
      await withOpen(page, audit, 'host surface', HOST_TRIGGERS, 8)
      // A second turn: audited while its answer streams in (once the skin's pass
      // has marked the stop button), then with two turns in the rail.
      const second = lane.sendPrompt(page, 'look again')
      await page.waitForSelector(lane.host.streaming, { state: 'attached', timeout: 20000 })
      await page.waitForTimeout(150)
      await audit.state('streaming')
      await second
      await lane.waitForTurn(page)
      const rail = await page.evaluate(pointAtInPage, ['.dsh-claude-turn-rail'])
      if (rail !== null) {
        await page.mouse.move(rail.x, rail.y)
        await page.waitForTimeout(400)
        await audit.state('turn navigator')
        await page.mouse.move(1, 1)
        await page.waitForTimeout(400)
      }
      for (const target of audit.hoverTargets()) {
        const point = await page.evaluate(pointAtInPage, target.selectors)
        if (point === null) continue
        await page.mouse.move(point.x, point.y)
        await page.waitForTimeout(200)
        await audit.state(`hover ${target.id}`, target.only)
        await page.mouse.move(1, 1)
        await page.waitForTimeout(200)
      }
      // An image waiting in the composer: the attachment rail and its card.
      const picker = page.locator('input[type="file"]').first()
      if (await picker.count() > 0) {
        await picker.setInputFiles(path.join(ROOT, 'packages', 'assets', 'src', 'mascot', 'crab', 'idle.png'))
        await page.waitForTimeout(800)
        await audit.state('attachment')
      }
      // The document attributes the stylesheet switches on, each as the page
      // itself carries it: the dark flip, the DeepSeek brand, and the host's own
      // palette and typefaces.
      await attribute(page, 'data-ds-dark-theme', '')
      await audit.state('dark')
      await attribute(page, 'data-dsh-claude-brand', 'deepseek')
      await audit.state('deepseek dark')
      await attribute(page, 'data-ds-dark-theme', null)
      await audit.state('deepseek light')
      await attribute(page, 'data-dsh-claude-brand', 'claude')
      await attribute(page, 'data-dsh-claude-palette', 'host')
      await attribute(page, 'data-dsh-claude-typeface', 'host')
      await audit.state('host palette')
      await attribute(page, 'data-dsh-claude-palette', 'claude')
      await attribute(page, 'data-dsh-claude-typeface', 'claude')
      // The preferences the skin marks the page with, one state each.
      for (const [name, key, value] of MARKS) {
        await attribute(page, key, value)
        await audit.state(name)
        await attribute(page, key, null)
      }
      await withSettings(page, audit)
      // The preferences the controls set render their own markup on the empty
      // page — the studio panel, the mascot, the hero menu — so the walk goes
      // back to it and audits what they put there.
      const home = page.locator('button[data-dsh-claude-part~="new-session"]').first()
      if (await home.count() > 0 && await home.isVisible()) {
        await home.click({ force: true })
        await page.waitForTimeout(1500)
        await audit.state('hero after preferences')
      }
    },
    async assert({ session, audit, out, appearance }) {
      const { states, declarations, drift, sheet, sweep, evidence } = audit.result()
      fs.writeFileSync(path.join(out, 'importance-verdicts.json'), `${JSON.stringify({ states, declarations, drift, sweep, evidence }, null, 2)}\n`)
      // The stylesheet the verdicts number their rules in, for whoever acts on them.
      fs.writeFileSync(path.join(out, 'importance-sheet.css'), sheet)
      const count = (verdict) => declarations.filter((item) => item.verdict === verdict).length
      const idle = declarations.filter((item) => item.verdict === 'removable')
      const hovered = states.filter((item) => item.name.startsWith('hover ')).length
      const named = states.filter((item) => !item.name.startsWith('hover '))
      const dead = new Set(sweep.dead)
      const unrecorded = sweep.dead.filter((selector) => !UNREACHABLE.has(selector))
      const reached = [...UNREACHABLE.keys()].filter((selector) => !dead.has(selector) && !EITHER.has(selector))
      if (process.env.DSH_IMPORTANCE_LEDGER === 'write') {
        const entries = {}
        for (const item of declarations) {
          const beaten = evidence.find((own) => own.ruleKey === item.ruleKey && own.prop === item.prop)
          entries[evidenceKey(item)] = beaten === undefined
            ? { selector: item.selector, prop: item.prop, verdict: item.verdict }
            : { selector: item.selector, prop: item.prop, verdict: item.verdict, state: beaten.state, opponents: beaten.opponents }
        }
        fs.writeFileSync(LEDGER_FILE, `${JSON.stringify({ note: LEDGER.note, entries }, null, 2)}\n`)
      }
      const ledgerNow = process.env.DSH_IMPORTANCE_LEDGER === 'write' ? JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8')) : LEDGER
      const recorded = new Set(Object.keys(ledgerNow.entries))
      const needed = declarations.filter((item) => item.verdict === 'needed')
      const missingEvidence = needed.filter((item) => !recorded.has(evidenceKey(item)))
      const unrecordedDeclarations = declarations.filter((item) => !recorded.has(evidenceKey(item)))
      const runKeys = new Set(declarations.map(evidenceKey))
      const unknownEvidence = [...recorded].filter((key) => !runKeys.has(key))
      const withOpponents = declarations.filter((item) => (ledgerNow.entries[evidenceKey(item)]?.opponents ?? []).length > 0)
      const briefKeys = (keys) => keys.slice(0, 3).map((key) => key.replace(/\s+/g, ' ').slice(0, 90)).join('；')
      const brief = (selectors) => selectors.slice(0, 3).map((selector) => selector.replace(/\s+/g, ' ').slice(0, 90)).join('；')
      const recordedGroups = UNREACHABLE_FILE.groups.map((group) => `${group.reason} ${group.selectors.length}`).join('，')
      const checks = [
        lane.check('每个页面形态都审过', named.length >= 12, `${named.map((item) => `${item.name}: ${item.removable}/${item.needed}${item.sentBack === 0 ? '' : `/退回 ${item.sentBack}`}`).join('；')}；悬停 ${hovered} 处`),
        // Every `!important` the walk found necessary is written down with what
        // it beats where it was decided (D9). The set of declarations is
        // enforced: a run that needs one the ledger has not recorded, or no
        // longer needs one it records, fails until the ledger is written again
        // and the difference read.
        lane.check('每处 !important 都在台账里，需要的那些记着对手', unrecordedDeclarations.length === 0 && unknownEvidence.length === 0 && missingEvidence.length === 0,
          `${declarations.length} 处声明，台账记着 ${recorded.size} 处，其中 ${withOpponents.length} 处认出了对手（${[...new Set(withOpponents.flatMap((item) => (ledgerNow.entries[evidenceKey(item)].opponents ?? []).map((entry) => entry.kind)))].join('、') || '无'}）；本次未记录的 ${unrecordedDeclarations.length} 处（${briefKeys(unrecordedDeclarations.map(evidenceKey))}），台账里多出的 ${unknownEvidence.length} 处（${briefKeys(unknownEvidence)}）`),
        lane.check('没有多余的 !important', idle.length === 0, `${declarations.length} 处：需要 ${count('needed')}，多余 ${idle.length}${idle.length === 0 ? '' : `（${idle.slice(0, 3).map((item) => `${item.selector.replace(/\s+/g, ' ').slice(0, 70)} { ${item.prop} }`).join('；')}…）`}；另有 ${count('unmatched')} 处从未匹配到元素（本次页面形态未覆盖），${count('declared twice')} 处重复声明，${count('third-party')} 处属于第三方应答，${count('transient state')} 处只在短暂标记下生效，${count('unreadable pseudo-element')} 处伪元素读不到计算值`),
        // The other half of "every line is necessary": a selector no state
        // matches an element with is a rule the page never reads. One the walk
        // cannot reach is recorded with its reason; anything else fails, and so
        // does a recorded selector the page has started matching — the record
        // is a debt, and it is only allowed to shrink.
        lane.observe('没有从不匹配元素的皮肤选择器', unrecorded.length === 0, `${sweep.total} 个选择器：${sweep.matched} 个在某个页面形态里匹配到元素，${sweep.dead.length} 个从未匹配（登记在册 ${sweep.dead.length - unrecorded.length}${recordedGroups === '' ? '' : `：${recordedGroups}`}${unrecorded.length === 0 ? '' : `；未登记 ${unrecorded.length}：${brief(unrecorded)}…`}）${sweep.unparsed.length === 0 ? '' : `；${sweep.unparsed.length} 个页面解析不了（${sweep.unparsed.slice(0, 2).join('；')}）`}；${Object.entries(sweep.excused).map(([keep, many]) => `${many} 个按契约不扫（${keep}）`).join('，') || '没有按契约豁免的'}`),
        lane.observe('登记在册的选择器都还匹配不上', reached.length === 0, `登记表里 ${reached.length} 个已经能匹配到元素或规则已删除，该划掉：${brief(reached)}${EITHER.size === 0 ? '' : `；另有 ${EITHER.size} 条记录，抓到与否都算数`}`),
        lane.check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
      // The appearance layer's snapshot is judged on the platform the cloud's
      // lane runs (D77); `DSH_APPEARANCE=write` records it from this walk.
      fs.writeFileSync(path.join(out, 'appearance-reading.json'), `${JSON.stringify(appearance, null, 2)}\n`)
      if (process.env.DSH_APPEARANCE === 'write') writeAppearance(appearance)
      const looks = compareAppearance(appearance)
      const parts = Object.values(appearance).reduce((sum, state) => sum + Object.keys(state).length, 0)
      checks.push(lane.observe('每个页面形态的外观与快照逐项一致', looks.length === 0,
        looks.length === 0 ? `${Object.keys(appearance).length} 个页面形态、${parts} 处部件读数` : `${looks.length} 处不同：${looks.slice(0, 4).join('；')}`))
      if (process.env.DSH_IMPORTANCE_REFERENCE !== undefined) {
        checks.push(lane.check('与参照样式表画出的页面一致', drift.length === 0, drift.length === 0 ? `${states.length} 个状态逐元素比对` : drift.map((item) => `${item.state}: ${item.count} 处，如 ${JSON.stringify(item.first[0])}`).join('；')))
      }
      return checks
    },
  }
}

export { createImportanceAudit, importanceScenario, planImportance, dropImportance }
