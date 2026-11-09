/** rule-key.mjs — key style rules identically in the build and importance audit. */
function ruleKey(rule) {
  return `${rule.selector.replace(/\s+/g, ' ')}{${rule.nodes.filter((node) => node.type === 'decl').map((node) => `${node.prop}:${node.value}${node.important ? '!' : ''}`).join(';')}}`
}

export { ruleKey }
