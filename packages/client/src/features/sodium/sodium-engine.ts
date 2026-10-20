import { PLUGIN_SHEET_OWNER_ATTRIBUTE, PLUGIN_SHEET_PATH_ATTRIBUTE, PLUGIN_SHEET_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { profileBundles } from '@dsh-claude-style/engine/host'
import { applyRewrite, planRewrite, restoreRewrite } from '@dsh-claude-style/engine/sheet-rewrite'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { RewrittenRule } from '@dsh-claude-style/engine/sheet-rewrite'
import { SODIUM_MEMBERS } from './members'
import type { SodiumAdapter, SodiumMember } from './members'
import { publishLost, publishRules } from './sodium-state'
import { versionAtLeast } from './version'

/** One sheet the rewrite holds, under the adapter that rewrote it. */
interface HeldSheet {
  readonly sheet: CSSStyleSheet
  readonly member: SodiumMember
  readonly adapter: SodiumAdapter
  readonly rules: readonly RewrittenRule[]
}

/**
 * The release each member is on, or null where it cannot be read. The host's
 * is in its boot graph; a plugin's comes from the profile's bundle list, asked
 * only when the table carries a plugin member.
 */
function readReleases(ctx: HostContext): Promise<Map<SodiumMember, string | null>> {
  const host = window.__DSH_BOOT__?.release?.version
  const bundles = SODIUM_MEMBERS.some((member) => member.release === 'bundle') ? profileBundles(ctx) : null
  // A bundle list that fails leaves the plugin members unread and the host's
  // rules still rewritten (D12); reportError surfaces the failure.
  const listed = (bundles ?? Promise.resolve([])).catch((error: unknown) => {
    reportError(error)
    return []
  })
  return listed.then((list) => new Map(SODIUM_MEMBERS.map((member) => {
    if (member.release === 'host') return [member, typeof host === 'string' ? host : null]
    return [member, list.find((bundle) => bundle.name === member.id)?.version ?? null]
  })))
}

/** The sheets on the page that one adapter names, as the loader tagged them. */
function sheetsOf(adapter: SodiumAdapter) {
  const sheets: CSSStyleSheet[] = []
  for (const node of document.head.querySelectorAll<HTMLStyleElement>(PLUGIN_SHEET_SELECTOR)) {
    if (node.getAttribute(PLUGIN_SHEET_OWNER_ATTRIBUTE) !== adapter.owner || node.getAttribute(PLUGIN_SHEET_PATH_ATTRIBUTE) !== adapter.sheet) continue
    if (node.sheet !== null) sheets.push(node.sheet)
  }
  return sheets
}

/**
 * The rewrite itself (D78): on, it rewrites every listed rule on the page and
 * keeps the attributes the rewritten rules read; off, the sheets and the page
 * are the owners' again. `refresh` follows the sheets coming and going while it
 * is on, and `survey` counts what it would rewrite, for the first probe.
 */
export function createSodiumEngine(ctx: HostContext) {
  const releases = readReleases(ctx)
  let on = false
  let held: HeldSheet[] = []
  /** The sheets the table held on the last report, and whether their loss has been reported since. */
  let lastSheets: readonly string[] = []
  let reportedLoss = false
  /** Each adapter's attribute keeper, with the captured classes it keeps them for. */
  const keepers = new Map<SodiumAdapter, { key: string, stop: () => void }>()

  /** The members whose release the table covers. */
  const coveredMembers = () => releases.then((known) => SODIUM_MEMBERS.filter((member) => {
    const release = known.get(member)
    return release !== null && release !== undefined && versionAtLeast(release, member.since)
  }))

  /**
   * Report what the rewrite holds. A table that held rules on a sheet and holds
   * none of them now was overtaken by its owner's change, which the page shows
   * nowhere else: the loss is named once.
   */
  function publish() {
    const rules = held.flatMap(({ member, adapter, rules }) => rules.map((entry) => ({
      member: member.id,
      since: member.since,
      sheet: adapter.sheet,
      declarations: entry.rule.style.cssText,
    })))
    publishRules(rules)
    const lost = on && rules.length === 0 && lastSheets.length > 0
    if (lost && !reportedLoss) reportError(new Error(`sodium: ${lastSheets.join(', ')} no longer carry the rules the table rewrites`))
    reportedLoss = lost
    publishLost(lost ? lastSheets : [])
    lastSheets = [...new Set(held.map(({ adapter }) => adapter.sheet))]
  }

  /**
   * A sheet that refuses a rewritten selector: `applyRewrite` has written that
   * sheet's own rules back, so it stays its owner's while the sheets taken
   * before it stay restorable and reported (D12).
   */
  function reportWrite(error: unknown) {
    reportError(error)
    publish()
  }

  /** Start, restart or stop each adapter's keeper for the classes its rules captured, by role. */
  function keep(planned: readonly HeldSheet[]) {
    const captured = new Map<SodiumAdapter, Map<string, Set<string>>>()
    for (const { adapter, rules } of planned) {
      const roles = captured.get(adapter) ?? new Map<string, Set<string>>()
      for (const entry of rules) {
        for (const [role, name] of Object.entries(entry.captured)) roles.set(role, (roles.get(role) ?? new Set<string>()).add(name))
      }
      captured.set(adapter, roles)
    }
    for (const [adapter, keeper] of keepers) {
      if (captured.has(adapter)) continue
      keeper.stop()
      keepers.delete(adapter)
    }
    for (const [adapter, roles] of captured) {
      const named = new Map([...roles].map(([role, names]) => [role, [...names].sort()]))
      const key = JSON.stringify([...named].sort(([a], [b]) => a < b ? -1 : 1))
      if (keepers.get(adapter)?.key === key) continue
      keepers.get(adapter)?.stop()
      keepers.set(adapter, { key, stop: adapter.maintain(named) })
    }
  }

  /** The rules of a sheet some adapter holds or is about to: the next adapter leaves them alone. */
  function takenIn(sheet: CSSStyleSheet, entries: readonly HeldSheet[]) {
    return new Set(entries.filter((entry) => entry.sheet === sheet).flatMap((entry) => entry.rules.map((rule) => rule.rule)))
  }

  /**
   * Bring the held sheets up to the page: a sheet whose node left or was given
   * a new sheet is gone with its rewrite, and a listed sheet not held yet is
   * rewritten. The keepers start before the selectors change, both in this one
   * task, so no frame reads a rewritten rule without its attribute.
   */
  function sync(members: readonly SodiumMember[]) {
    if (!on) return
    held = held.filter(({ sheet }) => sheet.ownerNode instanceof HTMLStyleElement && sheet.ownerNode.isConnected && sheet.ownerNode.sheet === sheet)
    const fresh: HeldSheet[] = []
    for (const member of members) {
      for (const adapter of member.adapters) {
        for (const sheet of sheetsOf(adapter)) {
          if (held.some((entry) => entry.sheet === sheet && entry.adapter === adapter)) continue
          const rules = planRewrite(sheet, adapter, takenIn(sheet, [...held, ...fresh]))
          if (rules.length > 0) fresh.push({ sheet, member, adapter, rules })
        }
      }
    }
    keep([...held, ...fresh])
    // Each sheet is held as it is written: a sheet the browser refuses takes its
    // own rules back, and the sheets taken before it stay restorable.
    for (const entry of fresh) held.push({ ...entry, rules: applyRewrite(entry.rules) })
    publish()
  }

  return {
    start() {
      if (on) return
      on = true
      coveredMembers().then(sync).catch(reportWrite)
    },
    /** Follow the sheets in `<head>` while on. */
    refresh() {
      if (on) coveredMembers().then(sync).catch(reportWrite)
    },
    stop() {
      if (!on) return
      on = false
      // A rule another writer changed since keeps its rewritten selector, and the
      // marks come off below: from here on it matches nothing, so it is named.
      const stranded = held.flatMap(({ adapter, rules }) => restoreRewrite(rules).map((entry) => `${adapter.sheet} · ${entry.rewritten}`))
      held = []
      keep([])
      publish()
      if (stranded.length > 0) reportError(new Error(`sodium: ${stranded.join('; ')} no longer read as the rewrite left them and stay written`))
    },
    /** How many rules the rewrite would take on the page as it stands. */
    survey() {
      return coveredMembers().then((members) => members.reduce((count, member) => count + member.adapters.reduce(
        (sum, adapter) => sum + sheetsOf(adapter).reduce((rules, sheet) => rules + planRewrite(sheet, adapter).length, 0),
        0,
      ), 0))
    },
  }
}
