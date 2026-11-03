/**
 * What the tables are built from: the two attributes the marking pass writes,
 * and the anchors three of the host's own menus stand in. They are the skin's, so
 * they arrive with the install (packages/engine/src/parts.ts, D73).
 */
export interface PartsTableVocabulary {
  /** The attribute a marked node carries: the part names it stands for, space-separated. */
  part: string
  /** The anchors the skin's own menus stand in, which the menu parts are read under. */
  regions: { account: string, hero: string, more: string }
}

/**
 * The host class names the skin reads, as data (D3): host CSS-module local name
 * → the skin's own part name.
 *
 * The host hashes its class names (`_2H3hWW_root`, `_root_38jqx_3`), so a
 * stylesheet cannot match one whole, and a substring match takes whatever else
 * holds that fragment — `title` also names `titleRow` and `subtitle`, `row`
 * also names `grow` and `arrow`, `rail` also names `trailing`, and another
 * plugin's class name can hold it too. packages/engine/src/parts.ts walks these
 * tables and writes the part names onto the element, so every rule matches
 * one attribute whole.
 *
 * Each entry is one exact local name. A local name that means different things
 * in different places is read in the region it belongs to: the composer's
 * `row` and the sidebar's `title` are their own regions' names.
 *
 * This file is data only, so the build reads it directly (scripts/css.mjs, the
 * part gate) and holds every part a stylesheet reads to the table here. A host
 * rename is one line in this file.
 */
import { COMPOSER_OVERLAY_SELECTOR, CONVERSATION_HEADER_SLOT_SELECTOR, CONVERSATION_SCROLL_SELECTOR, RIGHTBAR_COLUMN_SELECTOR, ROOT_SLOT_SELECTOR, SHIMMER_DECORATION_SELECTOR, SIDEBAR_SLOT_SELECTOR } from '@dsh-claude-style/contracts/dom'

/** Host CSS-module local name → the skin's part name. */
export type PartTable = Record<string, string>

/** The shell's three columns, read from the root slot down. */
export const FRAME_PARTS: PartTable = {
  sidebarCol: 'sidebar-column',
  centerCol: 'center-column',
  rightbarCol: 'rightbar-column',
}

/** The sidebar, from its slot anchor down. */
export const SIDEBAR_PARTS: PartTable = {
  logoRow: 'logo-row',
  brand: 'brand-button',
  brandIdentity: 'brand-identity',
  brandMark: 'brand-mark',
  brandName: 'brand-name',
  railMark: 'rail-mark',
  toggle: 'sidebar-toggle',
  panelIcon: 'panel-icon',
  newSession: 'new-session',
  newSessionLabelMask: 'new-session-mask',
  newSessionContent: 'new-session-content',
  newSessionShortcut: 'new-session-shortcut',
  separator: 'key-separator',
  panelList: 'panel-list',
  panelRow: 'panel-row',
  panelGlyph: 'panel-glyph',
  regionArea: 'region-area',
  footArea: 'foot-area',
  footerActions: 'footer-actions',
  footerButtons: 'footer-buttons',
  settingsArea: 'settings-area',
  sectionHeader: 'section-header',
  sectionLabel: 'section-label',
  sectionActions: 'section-actions',
  headerActions: 'section-actions',
  headerActionsHidden: 'section-actions-hidden',
  treeBody: 'tree-body',
  groupSection: 'group-section',
  projectRow: 'project-row',
  sessionRow: 'session-row',
  title: 'row-title',
  projectText: 'row-project-text',
  time: 'row-time',
  rowActions: 'row-actions',
  iconButton: 'row-icon-button',
  slot: 'row-slot',
  folder: 'row-folder',
  folderActive: 'row-folder-active',
  chevron: 'row-chevron',
  arrow: 'row-arrow',
  active: 'row-active',
  selected: 'row-selected',
  menuOpen: 'row-menu-open',
  searchSlot: 'search-slot',
  searchButton: 'search-button',
  triggerRow: 'settings-trigger',
  list: 'list',
  listArea: 'list-area',
}

/** The conversation's header, from its slot anchor down. */
export const HEADER_PARTS: PartTable = {
  header: 'conversation-header',
  headerLeading: 'header-leading',
  titleRow: 'title-row',
  titleCluster: 'title-cluster',
  crumbs: 'header-title',
  crumbSeg: 'header-crumb',
  headerActions: 'header-actions',
  headerUtilities: 'header-utilities',
  headerCorner: 'header-corner',
  // From 0.2.1-rc.3 the host draws the tab row as `tabs` with the tablist in its
  // own `viewTabs` and the overflow menu beside it; before that `tabs` was the
  // tablist. The stylesheet holds both shapes to one look.
  tabs: 'view-tabs',
  viewTabs: 'view-tabs-list',
  viewsMore: 'view-tabs-more',
  tab: 'view-tab',
  tabActive: 'view-tab-active',
  label: 'header-label',
}

/**
 * The conversation's scrolling body: the transcript and the composer seat under
 * it, so the composer's own parts are read here too.
 */
export const CONVERSATION_PARTS: PartTable = {
  viewArea: 'view-area',
  scrollBody: 'scroll-body',
  composerSeat: 'composer-seat',
  composerStack: 'composer-stack',
  runningIcon: 'running-icon',
  runningContent: 'running-content',
  callRow: 'call-row',
  scroll: 'input-scroll',
  grow: 'input-grow',
  row: 'row',
  // A disclosure row's icon seat, which also holds the chevron its hover shows.
  leading: 'row-leading',
  rows: 'rows',
  tools: 'tools',
  trailing: 'trailing',
  modes: 'modes',
  dock: 'composer-dock',
  overlayAnchor: 'composer-overlay-anchor',
  standardControls: 'composer-controls',
  // The host names its one activity seat two ways: `activity` while the slot is
  // idle, `activityExpanded` while a plugin (the voice input) expands it. The
  // seat keeps its part through both, or the rules reading it stop at the switch.
  activity: 'composer-activity',
  activityExpanded: 'composer-activity',
  primary: 'composer-primary',
  trigger: 'trigger',
  chevron: 'trigger-chevron',
  rail: 'attachment-rail',
  image: 'attachment-image',
  preview: 'attachment-preview',
  close: 'attachment-remove',
  delete: 'attachment-remove',
  remove: 'attachment-remove',
  badge: 'badge',
  tag: 'tag',
  kindTag: 'kind-tag',
  kindTagIcon: 'kind-tag-icon',
  kindTagLabel: 'kind-tag-label',
  rowTag: 'row-tag',
  optionLine: 'option-line',
  attemptBadge: 'attempt-badge',
  keyBadge: 'key-badge',
  cardWorkspaceTrigger: 'card-workspace-trigger',
  composerHero: 'composer-hero',
  heroWorkspaceRow: 'hero-workspace-row',
  headline: 'hero-headline',
  titleGroup: 'hero-title-group',
  fishHitbox: 'hero-mark',
  previewBadge: 'hero-preview-badge',
  // The host's turn rail, which the skin stands in for (features/turn-nav reads
  // these before its own stamp lands, so the host name is the only anchor).
  frame: 'rail-frame',
  scroller: 'rail-scroller',
  // The attachment tiles and the composer's own parts the features read by name.
  imageItem: 'attachment-image-item',
  thumbnail: 'attachment-thumbnail',
  item: 'attachment-item',
  card: 'composer-card-box',
  workspaceLabel: 'workspace-chip-label',
  clearButton: 'clear-button',
}

/** The right sidebar's docked panels. */
export const RIGHTBAR_PARTS: PartTable = {
  guide: 'panel-guide',
  panel: 'panel',
  divider: 'dock-divider',
}

/**
 * The rows of a host menu card. The host portals its menus to `<body>` with no
 * marker of its own, so the region is the skin's own stamp on the card: only
 * the feature that recognises it (features/account, features/hero-menu,
 * features/sidebar-entries) writes one, and the rows are read the moment it
 * lands.
 */
export const MENU_PARTS: PartTable = {
  itemWrap: 'menu-item',
  itemIcon: 'menu-item-icon',
  itemLabel: 'menu-item-label',
  itemName: 'menu-item-name',
  itemDesc: 'menu-item-desc',
  check: 'menu-check',
  viewport: 'menu-viewport',
  footer: 'menu-footer',
  submenu: 'menu-submenu',
  selected: 'menu-item-selected',
  divider: 'menu-divider',
}

/**
 * Names read on the whole page: the host's own text and badge roles, which its
 * sheets and the skin's both style wherever they stand. Read on `<body>` down,
 * so a heading inside a sidebar panel and one inside the transcript read alike,
 * and a badge inside a dialog reads like one in a chat row.
 *
 * These are the names the skin's typography and badge rules name; several the
 * host declared once and no longer renders (`mono`, `codeBlock`, `tagSystem`,
 * …) stay here, so a rule is exact today and one line restores it if the host
 * brings the name back.
 */
export const PAGE_PARTS: PartTable = {
  // The host renders its markdown renderer's own names wherever a transcript,
  // a search hit or a preview shows one, so they are read page-wide (D3).
  markdown: 'markdown',
  tableScroll: 'table-scroll',
  fileMention: 'file-mention',
  fileLink: 'file-link',
  // The host's own `root` of whatever component an element belongs to: the hero
  // page's root sits in the centre column, the composer's and the model seat's
  // sit in the conversation, so the name is read page-wide and a rule that wants
  // one of them qualifies it with that component's own marker.
  root: 'host-root',
  title: 'text-title',
  headline: 'text-headline',
  caption: 'text-caption',
  sectionLabel: 'section-label',
  triggerLabel: 'trigger-label',
  selectLabel: 'text-select-label',
  monoLabel: 'text-mono-label',
  mono: 'text-mono',
  codeBlock: 'text-code',
  linkIcon: 'link-icon',
  linkButton: 'link-button',
  panel: 'panel',
  overlay: 'overlay',
  navIcon: 'nav-icon',
  // The settings dialog's section rail, which the skin reads to mark its own
  // tab. The dialog is an overlay outside the conversation's box, so this name
  // is page-wide.
  navList: 'nav-list',
  mask: 'mask',
  tagSystem: 'tag-system',
  tagUser: 'tag-user',
  tagContext: 'tag-context',
  tagMessage: 'tag-message',
  tagTool: 'tag-tool',
  tagSubtool: 'tag-subtool',
  kindTag: 'kind-tag',
  kindTagIcon: 'kind-tag-icon',
  kindTagLabel: 'kind-tag-label',
  rowTag: 'row-tag',
  optionLine: 'option-line',
  badge: 'badge',
  attemptBadge: 'attempt-badge',
  keyBadge: 'key-badge',
}

/** One region: the host subtree its parts are read in, and the parts themselves. */
export interface PartRegion {
  /** The host subtree the region's parts are read in; a host contract (D3). */
  within: string
  parts: PartTable
  /**
   * A subtree the region does not read inside: another element of the host's,
   * mounted in the region's own box. The element carrying the mark keeps its
   * parts; nothing standing in it does — the composer's overlay seat holds the
   * host's `@` and `/` menus, whose own `item` and `trailing` are not the
   * composer's (D3, the same name in two regions).
   */
  skip?: string
  /**
   * Parts read on the anchor's own element children alone — where the host puts
   * a slot's content. A local name as common as `root` cannot be read anywhere
   * inside the region: rows and tooltips have a `_root` of their own.
   */
  rootParts?: PartTable
}

/** Every region, in the order the walk enters them. */
export function partRegions(vocabulary: PartsTableVocabulary): PartRegion[] {
  return [
    { within: 'body', parts: PAGE_PARTS },
    {
    within: ROOT_SLOT_SELECTOR,
    parts: FRAME_PARTS,
    rootParts: { frame: 'layout-frame' },
    },
    {
    within: SIDEBAR_SLOT_SELECTOR,
    parts: SIDEBAR_PARTS,
    rootParts: { root: 'sidebar-root', collapsed: 'sidebar-collapsed', quietBars: 'sidebar-quiet', fading: 'sidebar-fading' },
    },
    { within: CONVERSATION_HEADER_SLOT_SELECTOR, parts: HEADER_PARTS },
    { within: CONVERSATION_SCROLL_SELECTOR, parts: CONVERSATION_PARTS, skip: COMPOSER_OVERLAY_SELECTOR },
    { within: RIGHTBAR_COLUMN_SELECTOR, parts: RIGHTBAR_PARTS },
    { within: `[${vocabulary.regions.account}], [${vocabulary.regions.hero}], [${vocabulary.regions.more}]`, parts: MENU_PARTS },
  ]
}

/** Every part name the tables define, sorted: the whole vocabulary a sheet may read. */
export function partNames(vocabulary: PartsTableVocabulary): string[] {
  const names = new Set<string>()
  for (const region of partRegions(vocabulary)) {
    for (const part of Object.values(region.parts)) names.add(part)
    for (const part of Object.values(region.rootParts ?? {})) names.add(part)
  }
  return [...names].sort()
}


/**
 * The structural relations a stylesheet reads as a hold: a rule naming an
 * element because of what its subtree contains (`A:has(B)`) reads
 * `data-dsh-claude-holds` instead, and packages/engine/src/parts.ts keeps that
 * mark current (D9). Each entry answers one question the walk already knows
 * the answer to.
 *
 * `holder` names the element that takes the mark; `*` marks whichever ancestor
 * holds the node, which is what a rule styling an unnamed wrapper needs.
 * `scope` keeps the mark inside one box: nothing at or above the scope is
 * marked. `direct` is the `>` in `:has(> B)`: only the held node's own parent
 * counts. `attributes` are the names whose change can move this mark, so the
 * marking pass watches them; a part-based side needs no attribute because the
 * pass already watches class names.
 */
export interface HoldRelation {
  /** The word a stylesheet reads in `[data-dsh-claude-holds~="…"]`. */
  name: string
  /** The element that takes the mark, or `*` for any ancestor that holds the node. */
  holder: string
  /** The held side, matched on each node the pass walks. */
  held: string
  /** Only nodes strictly inside this element are marked. */
  scope?: string
  /** Only the held node's own parent counts. */
  direct?: boolean
  /** Attributes whose changes can move this mark. */
  attributes: string[]
}

/** Every relation a stylesheet reads, and the rule that reads it. */
export function holdRelations(vocabulary: PartsTableVocabulary): HoldRelation[] {
  /** The selector for one part name, so the relations below spell their sides in this vocabulary. */
  const part = (name: string) => `[${vocabulary.part}~="${name}"]`
  return [
    // theme/chrome.css, theme/wallpaper.css: the frame paints to the window's top
    // only where its own first column is the sidebar.
    { name: 'sidebar-column', holder: part('layout-frame'), held: part('sidebar-column'), direct: true, attributes: [] },
  // theme/chrome.css, theme/wallpaper.css, features/view-tabs/view-tabs.css: the
  // header owns the tab strip, and only that header loses its bottom edge.
  { name: 'view-tabs', holder: part('conversation-header'), held: part('view-tabs'), attributes: [] },
  // theme/hero.css: the headline takes the display cut where it carries the mark.
  { name: 'hero-mark', holder: part('hero-headline'), held: part('hero-mark'), attributes: [] },
  // features/home/home-panel.css: the boxes the host's `display: contents` slot
  // anchors expose are the ones that sort the studio's greeting.
  { name: 'hero-headline', holder: '*', held: part('hero-headline'), scope: part('composer-hero'), attributes: [] },
  // features/composer/card.css: the classic tray sorts the boxes above the card.
  { name: 'composer-card', holder: '*', held: '[data-composer-card]', scope: part('composer-stack'), attributes: ['data-composer-card'] },
  // theme/wallpaper.css: the phase box holding the transcript paints the canvas.
  { name: 'conversation-scroll', holder: '[data-phase]', held: '[data-conversation-scroll]', attributes: ['data-phase', 'data-conversation-scroll'] },
  // features/composer/inline-bar.css: the host's own statistics dialogs stand down.
  {
    name: 'host-stats',
    holder: '[role="dialog"]',
    held: '[data-session-stats-details], [data-session-stats-usage]',
    attributes: ['data-session-stats-details', 'data-session-stats-usage'],
  },
  // features/composer/inline-bar.css: the activity seat carries the stop button
  // while a turn runs, and its flex item is out of the flow while it is empty —
  // its gap would otherwise stand between the seat and the docked meter.
  {
    name: 'composer-activity-filled',
    holder: part('composer-activity'),
    held: '[data-slot="conversation.input.activity"] > *',
    attributes: [],
  },
  // features/account/account-footer.css, footer-takeover.css: only the footer
  // boxes around the host's own account row keep their size.
  {
    name: 'account-row',
    holder: '*',
    held: '[data-dsh-claude-account-host-row]',
    scope: part('foot-area'),
    attributes: ['data-dsh-claude-account-host-row'],
  },
  // features/account/footer-takeover.css: the host mounts its own account menu on
  // <body>, outside the sidebar, so the collapsed rail's card width cannot be
  // read from a sidebar ancestor. The body takes the mark, and the frame's own
  // collapse attribute is the fact it is read from.
  {
    name: 'sidebar-rail',
    holder: 'body',
    held: '[data-sidebar-collapsed]',
    attributes: ['data-sidebar-collapsed'],
  },
  // features/search/search.css: the wrapper the host's rail puts around its own
  // search button carries no part of its own, and the skin's box takes that seat
  // in the collapsed rail — so the wrapper is the node that stands down, and the
  // button it holds is the node the pass knows.
  {
    name: 'rail-search',
    holder: '*',
    held: part('search-button'),
    scope: part('region-area'),
    direct: true,
    attributes: [],
  },
  // features/row-skip/row-skip.css: a row the host has folded stands no box, and the row keeps
  // its content-visibility: auto only while nothing under it is hidden. The host's own
  // mark, any element's hidden attribute, and the chat area as the scope.
  {
    name: 'hidden-row',
    holder: '[data-chat-flow-kind]',
    held: '[data-turn-process-hidden], [hidden]',
    scope: '[data-chat-flow]',
    attributes: ['data-turn-process-hidden', 'hidden'],
  },
  // features/process-column/process-column.css: a row's title steps aside only
  // where a description follows it; the host writes the decorative separator
  // only in front of a description that is not empty.
  {
    name: 'row-summary',
    holder: part('row'),
    held: SHIMMER_DECORATION_SELECTOR,
    attributes: [],
  },
  ]
}
