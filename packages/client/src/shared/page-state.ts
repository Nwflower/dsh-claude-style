import * as React from 'react'
import { DARK_THEME_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import type { BrandingAppearance } from '@dsh-claude-style/contracts/branding-presets'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { MOTION_ATTR } from '../constants'
import { motionReduced } from '../core/prefs'
import { pageAppearance } from './custom-brand'

/** React hooks over live `<body>` appearance and motion attributes, driven by the shared mutation bus (D40). */

export function usePageAppearance(): BrandingAppearance {
  const [appearance, setAppearance] = React.useState<BrandingAppearance>(pageAppearance)
  React.useEffect(
    () => subscribeMutations(document.body, { attributes: true, attributeFilter: [DARK_THEME_ATTRIBUTE] }, () => setAppearance(pageAppearance())),
    [],
  )
  return appearance
}

export function useDarkTheme(): boolean {
  return usePageAppearance() === 'dark'
}

export function useMotionReduced(): boolean {
  const [reduced, setReduced] = React.useState(motionReduced)
  React.useEffect(
    () => subscribeMutations(document.body, { attributes: true, attributeFilter: [MOTION_ATTR] }, () => setReduced(motionReduced())),
    [],
  )
  return reduced
}
