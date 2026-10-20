/**
 * Rewrite the selectors of a stylesheet another package injected, in place,
 * and write them back (D78).
 *
 * A rule keeps its place in the sheet: the selector is assigned through the
 * CSSOM, so the cascade order and every other rule stay as the owner wrote
 * them, and writing the original back restores the sheet exactly. A sheet the
 * owner injects again is a new object, which carries none of this.
 */

/** One rewrite: a selector in, the selector to take its place out. */
export interface SelectorRewrite {
  /**
   * @returns the selector to write, with the owner's hashed class names the
   *          rewrite read out of it by role; null when it does not apply.
   */
  rewrite(selector: string): { selector: string, captured: Readonly<Record<string, string>> } | null
}

/** One rule a rewrite changes. */
export interface RewrittenRule {
  readonly rule: CSSStyleRule
  /** The selector as the sheet held it. */
  readonly original: string
  /** The selector the rewrite asks for, then as the sheet serializes it once written. */
  readonly rewritten: string
  /** The owner's class names the rewrite read out of the selector, by role. */
  readonly captured: Readonly<Record<string, string>>
}

/** Every style rule under `rules`, those nested in grouping rules and in other style rules included. */
function* styleRules(rules: CSSRuleList): Generator<CSSStyleRule> {
  for (const rule of rules) {
    if (rule instanceof CSSStyleRule) yield rule
    if (rule instanceof CSSGroupingRule || rule instanceof CSSStyleRule) yield* styleRules(rule.cssRules)
  }
}

/**
 * The rules of `sheet` a rewrite would change, with the selector each would
 * take; the sheet itself is left alone.
 *
 * @param taken - rules another rewrite holds already, which this one leaves to it.
 */
export function planRewrite(sheet: CSSStyleSheet, rewrite: SelectorRewrite, taken: ReadonlySet<CSSStyleRule> = new Set()): RewrittenRule[] {
  const planned: RewrittenRule[] = []
  for (const rule of styleRules(sheet.cssRules)) {
    if (taken.has(rule)) continue
    const original = rule.selectorText
    const answer = rewrite.rewrite(original)
    if (answer !== null) planned.push({ rule, original, rewritten: answer.selector, captured: answer.captured })
  }
  return planned
}

/**
 * Give each planned rule its rewritten selector.
 * @returns the rules as rewritten, with the selector the sheet serializes, for
 *          `restoreRewrite`.
 * @throws when the sheet refuses a selector: the CSSOM ignores an invalid one
 *         silently and the rule would keep its costly form unnoticed. Every rule
 *         this call wrote is written back first, so a refused selector leaves
 *         the sheet as its owner wrote it.
 */
export function applyRewrite(planned: readonly RewrittenRule[]): RewrittenRule[] {
  const written: RewrittenRule[] = []
  for (const entry of planned) {
    const original = entry.rule.selectorText
    entry.rule.selectorText = entry.rewritten
    if (entry.rule.selectorText === original) {
      restoreRewrite(written)
      throw new Error(`sheet-rewrite: the sheet refused the selector ${entry.rewritten}`)
    }
    written.push({ ...entry, original, rewritten: entry.rule.selectorText })
  }
  return written
}

/**
 * Write each rule's own selector back. A rule whose selector no longer reads as
 * this rewrite left it was changed since by someone else, and stays theirs.
 * @returns the rules left as they are, which the caller no longer holds.
 */
export function restoreRewrite(rewritten: readonly RewrittenRule[]): RewrittenRule[] {
  const left: RewrittenRule[] = []
  for (const entry of rewritten) {
    if (entry.rule.selectorText === entry.rewritten) entry.rule.selectorText = entry.original
    else left.push(entry)
  }
  return left
}
