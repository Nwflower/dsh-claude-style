/**
 * The preference defaults, shared by both halves (D46): the host half's Config
 * is generated from this table (packages/host/src/settings.ts, D10) and the
 * browser half reads it as the value each preference holds until the settings
 * form answers.
 */
export const PREFS_DEFAULT = Object.freeze({
  brand: 'claude',
  motion: 'system',
  collapseFooter: true,
  autoPopover: 'all',
  composerScope: 'all',
  modelPicker: true,
  peakrate: true,
  quickProviders: [],
  username: '',
  banLocale: 'en',
  homeLayout: 'studio',
  palette: 'claude',
  typeface: 'claude',
  mascot: 'brand',
  mascotScope: 'all',
  permissionsControl: true,
  workspaceView: true,
  dockCards: true,
  sidebarSearch: true,
  turnStatus: true,
  turnNav: true,
  viewTabs: true,
  headerBand: true,
  chatAnimations: 'enhanced',
  caretMotion: 'typing',
})
