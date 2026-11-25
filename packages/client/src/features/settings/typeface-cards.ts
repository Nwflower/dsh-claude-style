import * as React from 'react'
import {
  FONT_PREF_KEYS,
  FONT_PRESET_PRIMARY_LABEL,
  FONT_ROLES,
  FONT_ROLE_CODE,
  FONT_ROLE_PROSE,
  FONT_ROLE_UI,
} from '@dsh-claude-style/contracts/typeface'
import type { FontRole } from '@dsh-claude-style/contracts/typeface'
import { TYPEFACE_HOST, TYPEFACE_SYSTEM } from '../../constants'
import type { Prefs } from '../../constants'
import { activateOnCardKey } from '../../shared/preview-cards'
import { Glyph } from '../../shared/settings-glyphs'
import type { SettingsView } from './settings-controls'
import { activeTypefacePopoverRole, subscribeTypefacePopover, toggleTypefacePopover } from './typeface-popover'
import { copy } from './copy'
import type { CopyKey } from './copy'

/**
 * Three-column typography preview cards for the Appearance tab: Prose, Interface
 * and Code. Each card renders a miniature live sample in the role's active CSS
 * font token, shows the primary active family with a compact stack count badge,
 * opens the anchored family-stack picker on click, and offers a single refresh
 * icon button when customized to restore the preset default.
 */

const ROLE_TITLES: Readonly<Record<FontRole, CopyKey>> = {
  [FONT_ROLE_PROSE]: 'typefaceRoleProse',
  [FONT_ROLE_UI]: 'typefaceRoleUi',
  [FONT_ROLE_CODE]: 'typefaceRoleCode',
}

/** Fixed bilingual preview lines shown across all three role cards for direct visual comparison. */
const SAMPLE_TITLE = 'DeepSeek'
const SAMPLE_SUBTITLE = '探索未知之境'

/** Primary display name shown on a card when no custom family stack is configured. */
function defaultFamilyLabel(typeface: Prefs['typeface'], role: FontRole): string {
  if (typeface === TYPEFACE_HOST) return copy('typefaceHost')
  if (typeface === TYPEFACE_SYSTEM) return FONT_PRESET_PRIMARY_LABEL.system[role]
  return FONT_PRESET_PRIMARY_LABEL.claude[role]
}

/** Miniature live visual preview for one typography role. */
function roleSample(role: FontRole): React.ReactElement {
  return React.createElement(
    'div',
    { className: 'dsh-claude-typeface-sample', 'data-role': role, 'aria-hidden': 'true' },
    React.createElement('div', { className: 'dsh-claude-typeface-sample-title' }, SAMPLE_TITLE),
    React.createElement('div', { className: 'dsh-claude-typeface-sample-sub' }, SAMPLE_SUBTITLE),
  )
}

export function TypefaceCards(props: { prefs: Prefs, write: SettingsView['write'] }) {
  const { prefs, write } = props
  const openRole = React.useSyncExternalStore(subscribeTypefacePopover, activeTypefacePopoverRole)

  return React.createElement(
    'div',
    { className: 'dsh-claude-typeface-cards', role: 'group', 'aria-label': copy('typefaceTitle') },
    FONT_ROLES.map(role => {
      const prefKey = FONT_PREF_KEYS[role]
      const stack = prefs[prefKey]
      const customized = stack.length > 0
      const isOpen = openRole === role
      const title = copy(ROLE_TITLES[role])
      const primary = customized ? stack[0] : defaultFamilyLabel(prefs.typeface, role)
      const resetLabel = copy('typefaceResetRole', { role: title })

      return React.createElement(
        'div',
        {
          key: role,
          className: 'dsh-claude-typeface-card',
          role: 'button',
          tabIndex: 0,
          'data-role': role,
          'data-open': isOpen ? '' : undefined,
          'data-customized': customized ? '' : undefined,
          'aria-expanded': isOpen ? 'true' : 'false',
          'aria-haspopup': 'dialog',
          'aria-label': `${title}: ${primary}`,
          onClick: (event: React.MouseEvent<HTMLDivElement>) => {
            toggleTypefacePopover(role, event.currentTarget)
          },
          onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
            const target = event.currentTarget
            activateOnCardKey(event, () => toggleTypefacePopover(role, target))
          },
        },
        roleSample(role),
        React.createElement(
          'div',
          { className: 'dsh-claude-typeface-meta' },
          React.createElement(
            'div',
            { className: 'dsh-claude-typeface-head' },
            React.createElement('span', { className: 'dsh-claude-typeface-name' }, title),
            customized
              ? React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'dsh-claude-typeface-icon-btn dsh-claude-typeface-card-reset',
                  'data-action': 'reset',
                  title: resetLabel,
                  'aria-label': resetLabel,
                  onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation()
                    write({ [prefKey]: [] })
                  },
                },
                React.createElement(Glyph, { name: 'refresh' }),
              )
              : null,
          ),
          React.createElement(
            'div',
            { className: 'dsh-claude-typeface-summary' },
            React.createElement('span', { className: 'dsh-claude-typeface-primary' }, primary),
            stack.length > 1
              ? React.createElement('span', { className: 'dsh-claude-typeface-count' }, `+${stack.length - 1}`)
              : null,
            React.createElement('span', { className: 'dsh-claude-typeface-chevron', 'aria-hidden': 'true' }, React.createElement(Glyph, { name: 'chevronDown' })),
          ),
        ),
      )
    }),
  )
}
