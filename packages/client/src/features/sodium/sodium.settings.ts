import * as React from 'react'
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SettingsControlsOf } from '../../core/feature'
import type manifest from './sodium.manifest'
import { copy } from './copy'
import { rulesInEffect, sheetsLost, subscribeLost, subscribeRules } from './sodium-state'
import type { RuleInEffect } from './sodium-state'

/**
 * The line under the sodium switch (D76): how many rules the rewrite holds on
 * this page right now, and on hover each one by its member, its sheet and its
 * declarations, so the table can be checked against what the page carries. A
 * sheet whose rules the table no longer recognizes is named in the line: the
 * saving it stood for ended without an error of the page's own.
 */
export const controls: SettingsControlsOf<typeof manifest> = {
  'sodium-rules': SodiumRules,
}

/** The tooltip's lines: each member with the release its shapes start from, then its rules. */
function ruleLines(rules: readonly RuleInEffect[]) {
  const lines: string[] = []
  let member = ''
  for (const rule of rules) {
    if (rule.member !== member) {
      member = rule.member
      lines.push(copy('sodiumMember', { member: rule.member, since: rule.since }))
    }
    lines.push(`${rule.sheet.slice(rule.sheet.lastIndexOf('/') + 1)} · ${rule.declarations}`)
  }
  return lines.join('\n')
}

function SodiumRules() {
  const rules = React.useSyncExternalStore(subscribeRules, rulesInEffect)
  const lost = React.useSyncExternalStore(subscribeLost, sheetsLost)
  // The line takes the keyboard focus while it has rules to list, so the list is reachable without a pointer.
  const anchor: React.HTMLAttributes<HTMLSpanElement> = { tabIndex: rules.length === 0 ? undefined : 0, className: 'dsh-claude-sodium-rules' }
  const line = lost.length === 0
    ? copy('sodiumRules', { count: rules.length })
    : `${copy('sodiumRules', { count: rules.length })} · ${copy('sodiumLost')}`
  return React.createElement(Tooltip, {
    label: () => ruleLines(rules),
    side: 'bottom',
    delayMs: 500,
    disabled: rules.length === 0,
    children: React.createElement('span', anchor, line),
  })
}
