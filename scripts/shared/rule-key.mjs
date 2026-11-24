/** rule-key.mjs — key style rules by normalized selector in the build and importance audit. */
function ruleKey(rule) {
  return rule.selector.replace(/\s+/g, ' ').trim()
}

export { ruleKey }
