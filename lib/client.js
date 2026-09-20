/**
 * Claude Style — Claude Code Desktop theme for the DeepSeek Harness web GUI.
 *
 * GENERATED FILE — do not edit. Source lives in src/ (JS zones as fragments,
 * stylesheets as plain CSS); `node scripts/build.mjs` assembles this bundle.
 *   - src/constants.js   Zone 1: Constants & Tokens
 *   - src/assets/*.svg   Brand marks (inlined as CSS url() data URIs at build time)
 *   - src/styles/*.css   Zone 2: Stylesheets (tokens, typography, chrome,
 *                        composer, sidebar, components)
 *   - src/context.js     Zone 3: DSH Context & Helpers
 *   - src/overrides.js   Zone 4+5: UI Overrides, Scheduler & Teardown
 *   - src/settings.js    Settings Section (Brand)
 *   - src/entry.js       Zone 6: Plugin Entry & Export
 */
window.__ModuleLoader__.load({
  id: 'dsh-claude-style',
  factory: (require) => {
    'use strict'
    var module = { exports: {} }
    var exports = module.exports

    // React is resolved through the module loader's graph, so the settings
    // section can be a real component without a host half.
    var React = require('react')

    // ============================================================================
    // Zone 1: 常量与配置定义 (Constants & Tokens)
    // ============================================================================
    var STYLE_ID = 'dsh-claude-style-style'

    var COMPOSER_HINT = 'How can I help you today?'

    /** English weekday names, indexed by Date#getDay() (0 = Sunday). */
    var WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    /**
     * Time-of-day hero greeting, à la Claude Code's rotating welcomes. Slots
     * cover all 24 hours; the eight o'clock slot salutes the current weekday
     * instead ("Happy Monday."). `username` fills the Good morning slot.
     */
    function pickHeroGreeting(username) {
      var now = new Date()
      var hour = now.getHours()
      if (hour >= 6 && hour < 8) return 'Good morning, ' + (username || 'User') + '!'
      if (hour >= 8 && hour < 9) return 'Happy ' + WEEKDAY_NAMES[now.getDay()] + '.'
      if (hour >= 9 && hour < 12) return 'What are you working on?'
      if (hour >= 12 && hour < 14) return 'What’s on the agenda today?'
      if (hour >= 14 && hour < 18) return 'Coffee and Claude time?'
      if (hour >= 18) return 'Evening, how are things?'
      return 'You are here!'
    }

    /**
     * Claude Code's 185 playful spinner verbs displayed while thinking / executing.
     * Recreates the iconic CLI waiting experience in the DSH web interface.
     */
    var SPINNER_VERBS = [
      // Cooking (22)
      'Baking', 'Blanching', 'Brewing', 'Caramelizing', 'Cooking', 'Fermenting', 'Flambeing', 'Frosting',
      'Garnishing', 'Infusing', 'Julienning', 'Kneading', 'Leavening', 'Marinating', 'Proofing', 'Sauteing',
      'Seasoning', 'Simmering', 'Stewing', 'Tempering', 'Whisking', 'Zesting',
      // Thinking (21)
      'Cerebrating', 'Cogitating', 'Considering', 'Contemplating', 'Deciphering', 'Deliberating', 'Determining',
      'Envisioning', 'Ideating', 'Imagining', 'Inferring', 'Mulling', 'Musing', 'Noodling', 'Perusing',
      'Philosophising', 'Pondering', 'Pontificating', 'Puzzling', 'Ruminating', 'Thinking',
      // Dancing / Movement (20)
      "Beboppin'", 'Boogieing', 'Frolicking', 'Gallivanting', 'Galloping', 'Grooving', 'Jitterbugging',
      'Meandering', 'Moonwalking', 'Moseying', 'Perambulating', 'Scampering', 'Scurrying', 'Shimmying',
      'Skedaddling', 'Slithering', 'Sock-hopping', 'Waddling', 'Wandering', 'Zigzagging',
      // Playful (26)
      'Befuddling', 'Bloviating', 'Boondoggling', 'Booping', 'Canoodling', 'Combobulating', 'Dilly-dallying',
      'Discombobulating', 'Fiddle-faddling', 'Finagling', 'Flibbertigibbeting', 'Flummoxing', 'Honking',
      'Hullaballooing', 'Lollygagging', 'Puttering', 'Razzle-dazzling', 'Razzmatazzing', 'Recombobulating',
      'Schlepping', 'Shenaniganing', 'Smooshing', 'Tomfoolering', 'Topsy-turvying', 'Whatchamacalliting',
      'Wibbling',
      // Science (12)
      'Crystallizing', 'Evaporating', 'Ionizing', 'Nebulizing', 'Nucleating', 'Osmosing', 'Photosynthesizing',
      'Pollinating', 'Precipitating', 'Quantumizing', 'Sublimating', 'Synthesizing',
      // Nature (15)
      'Billowing', 'Cascading', 'Drizzling', 'Ebbing', 'Flowing', 'Fluttering', 'Germinating', 'Gusting',
      'Misting', 'Sprouting', 'Swirling', 'Swooping', 'Thundering', 'Undulating', 'Whirlpooling',
      // Magic / Fantasy (12)
      'Channeling', 'Channelling', 'Enchanting', 'Hyperspacing', 'Levitating', 'Manifesting', 'Metamorphosing',
      'Orbiting', 'Prestidigitating', 'Transfiguring', 'Transmuting', 'Warping',
      // Productive / Work (25)
      'Accomplishing', 'Actioning', 'Actualizing', 'Architecting', 'Bootstrapping', 'Calculating', 'Churning',
      'Composing', 'Computing', 'Concocting', 'Crafting', 'Creating', 'Crunching', 'Doing', 'Effecting',
      'Elucidating', 'Forging', 'Forming', 'Generating', 'Hashing', 'Hatching', 'Orchestrating', 'Processing',
      'Working', 'Wrangling',
      // Creative (8)
      'Choreographing', 'Cultivating', 'Doodling', 'Embellishing', 'Harmonizing', 'Improvising', 'Sketching',
      'Tinkering',
      // Animal (6)
      'Burrowing', 'Herding', 'Nesting', 'Pouncing', 'Roosting', 'Symbioting',
      // Claude specific (3)
      'Clauding', 'Gitifying', 'Reticulating',
      // Other (13)
      'Beaming', 'Catapulting', 'Coalescing', 'Incubating', 'Mustering', 'Newspapering', 'Propagating',
      'Spinning', 'Twisting', 'Unfurling', 'Unravelling', 'Vibing', 'Whirring'
    ]

    /** Segment label and the shipped /permission preset it selects. */
    var PERMISSION_SEGMENTS = [
      { label: 'Read', preset: 'read-only' },
      { label: 'Edit', preset: 'workspace-write' },
      { label: 'Auto', preset: 'danger-full-access' },
    ]

    /** In-conversation permission popover options matching Claude Code desktop style. */
    var PERMISSION_OPTIONS = [
      {
        preset: 'read-only',
        label: 'Read only',
        desc: '仅读取文件与分析，不修改代码'
      },
      {
        preset: 'workspace-write',
        label: 'Accept edits',
        desc: '允许编辑工作区文件'
      },
      {
        preset: 'danger-full-access',
        label: 'Full access',
        desc: '自动执行，无需反复确认'
      }
    ]

    /** The one preset the shipped UI gates behind its risk-confirmation dialog. */
    var GATED_PRESET = 'danger-full-access'
    /** Shipped full-access row labels, used to find that row in the shipped menu. */
    var FULL_ACCESS_LABELS = ['完全权限', 'Full access']
    /** Fallback prompt, used only when the shipped menu cannot be reached. */
    var GATED_PROMPT = '启用完全权限（Auto）？\n\n智能体将减少确认步骤，可直接执行敏感操作、文件修改或外部命令。仅建议在你信任当前任务时使用。'

    /** Skin-owned class names, so nothing couples to hashed CSS-module classes. */
    var SEGMENTS_CLASS = 'dsh-claude-segments'
    var SEGMENT_CLASS = 'dsh-claude-segment'

    /** Brand marks selectable from the settings page. `claude` is the default. */
    var BRAND_CLAUDE = 'claude'
    var BRAND_ANTHROPIC = 'anthropic'
    var DEFAULT_BRAND = BRAND_CLAUDE
    /** localStorage key holding the chosen brand. */
    var BRAND_STORAGE_KEY = 'dsh-claude-style:brand'
    /** The document attribute the stylesheet switches on. */
    var BRAND_ATTR = 'data-dsh-claude-brand'

    /** Wordmark aspect ratio; scripts/build.mjs sizes the sidebar word height from it (geometry lives in src/assets/claude-word.svg). */
    var CLAUDE_WORD_ASPECT = 512.22 / 121.54

    var SANS = "'Anthropic Sans Web Text','Noto Sans SC','Source Han Sans SC',-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Helvetica Neue',Helvetica,Arial,sans-serif"
    var SERIF = "'Anthropic Serif Web Text',Georgia,'Times New Roman','Noto Serif SC','Source Han Serif SC','Songti SC','SimSun',serif"
    var MONO = "'Anthropic Mono Variable',ui-monospace,'SF Mono','JetBrains Mono','Fira Code',Consolas,'Liberation Mono',Menlo,Courier,monospace"

    // ============================================================================
    // Zone 2: 样式表（由 src/styles/*.css 内联生成，勿手改） (CSS Stylesheet)
    // ============================================================================
    var CSS = [
      "/* --- 2.1 Design Tokens (Dark Base & Light Overrides) --- */",
      "/* ---------- design tokens: warm-black (dark) base ---------- */",
      "body[data-dsh-claude-style] {",
      "  --dsw-font-family: 'Anthropic Sans Web Text','Noto Sans SC','Source Han Sans SC',-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Helvetica Neue',Helvetica,Arial,sans-serif;",
      "  --dsw-font-serif: 'Anthropic Serif Web Text',Georgia,'Times New Roman','Noto Serif SC','Source Han Serif SC','Songti SC','SimSun',serif;",
      "  --dsw-font-code: 'Anthropic Mono Variable',ui-monospace,'SF Mono','JetBrains Mono','Fira Code',Consolas,'Liberation Mono',Menlo,Courier,monospace;",
      "  --dsw-font-markdown-h1-font-family: var(--dsw-font-serif);",
      "  --dsw-font-markdown-h2-font-family: var(--dsw-font-serif);",
      "  --dsw-font-markdown-h3-font-family: var(--dsw-font-serif);",
      "  --dsw-font-markdown-h4-font-family: var(--dsw-font-serif);",
      "  --dsw-font-markdown-base-font-family: var(--dsw-font-family);",
      "  --dsw-font-markdown-small-font-family: var(--dsw-font-family);",
      "  --dsw-font-markdown-table-font-family: var(--dsw-font-family);",
      "  --dsw-alias-bg-base: #141413;",
      "  --dsw-alias-bg-layer-1: #1c1b1a;",
      "  --dsw-alias-bg-layer-2: #242320;",
      "  --dsw-alias-bg-layer-3: #2e2c29;",
      "  --dsw-alias-bg-overlay: #242320;",
      "  --dsw-alias-border-l1: #242320;",
      "  --dsw-alias-border-l2: #2e2c29;",
      "  --dsw-alias-border-l3: #3a3833;",
      "  --dsw-alias-brand-primary: #d97757;",
      "  --dsw-alias-brand-text: #faf9f5;",
      "  --dsw-alias-button-elevated-fill: #242320;",
      "  --dsw-alias-button-floating-fill: #242320;",
      "  --dsw-alias-button-floating-hover: #2e2c29;",
      "  --dsw-alias-button-info-fill: #d97757;",
      "  --dsw-alias-button-info-hover: #e08a6d;",
      "  --dsw-alias-interactive-bg-active: rgba(217, 119, 87, 0.30);",
      "  --dsh-claude-hover-bg: rgba(255, 255, 255, 0.08);",
      "  --dsw-alias-interactive-bg-hover: var(--dsh-claude-hover-bg);",
      "  --dsw-alias-interactive-bg-hover-solid: #2e2c29;",
      "  --dsw-alias-label-primary: #faf9f5;",
      "  --dsw-alias-label-primary-bluish: #faf9f5;",
      "  --dsw-alias-label-secondary: #b0aea5;",
      "  --dsw-alias-label-tertiary: #8f8d84;",
      "  --dsw-alias-label-caption: #6b6a65;",
      "  --dsw-alias-state-business-primary: #d97757;",
      "  --dsw-alias-state-business-tertiary: #3a2a22;",
      "  --dsw-shadow-lv2: 0 4px 16px rgba(0, 0, 0, 0.30), 0 1px 3px rgba(0, 0, 0, 0.14);",
      "  --dsw-specific-input-major: #0f0e0d;",
      "  --dsw-specific-selector: #2e2c29;",
      "  --dsw-specific-sidebar-fill: #141413;",
      "}",
      "",
      "/* ================= light variant: ivory editorial ================= */",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) {",
      "  --dsw-alias-bg-base: #fcfcfb;",
      "  --dsw-alias-bg-layer-1: #f5f3ee;",
      "  --dsw-alias-bg-layer-2: #f0eee6;",
      "  --dsw-alias-bg-layer-3: #e8e6dc;",
      "  --dsw-alias-bg-overlay: #ffffff;",
      "  --dsw-alias-border-l1: #e8e6dc;",
      "  --dsw-alias-border-l2: #dedcd2;",
      "  --dsw-alias-border-l3: #d0cdc1;",
      "  --dsw-alias-brand-primary: #d97757;",
      "  --dsw-alias-button-info-fill: #d97757;",
      "  --dsw-alias-button-info-hover: #c6613f;",
      "  --dsw-alias-button-floating-fill: #ffffff;",
      "  --dsw-alias-button-floating-hover: #ffffff;",
      "  --dsw-alias-label-primary: #141413;",
      "  --dsw-alias-label-primary-bluish: #141413;",
      "  --dsw-alias-label-secondary: #6e6a60;",
      "  --dsw-alias-label-tertiary: #8f8a7e;",
      "  --dsw-alias-label-caption: #a6a094;",
      "  --dsw-alias-state-business-primary: #d97757;",
      "  --dsw-alias-state-business-tertiary: #e9dfd2;",
      "  --dsw-specific-input-major: #ffffff;",
      "  --dsw-specific-menu: #ffffff;",
      "  --dsw-specific-selector: #f0eee6;",
      "  --dsw-specific-sidebar-fill: #fbfbf9;",
      "  --dsh-claude-hover-bg: rgba(0, 0, 0, 0.08);",
      "  --dsw-alias-interactive-bg-hover: var(--dsh-claude-hover-bg);",
      "  --dsw-shadow-lv2: 0 4px 18px rgba(20, 20, 19, 0.10), 0 1px 3px rgba(20, 20, 19, 0.05);",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) {",
      "  color: #141413;",
      "  background-color: #fcfcfb !important;",
      "}",
      "",
      "html:has(body[data-dsh-claude-style]:not([data-ds-dark-theme])),",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) #root {",
      "  background-color: #fcfcfb !important;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) :is([data-pane=\"sidebar\"], [class*=\"sidebarCol\"], .dshDesktopSidebarSurface) {",
      "  --dsw-specific-sidebar-fill: #fbfbf9 !important;",
      "  background: #fbfbf9 !important;",
      "  border-right: 1px solid #e8e6dc !important;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) :is([data-pane=\"conversation\"], [class*=\"centerCol\"]) {",
      "  background: #fcfcfb !important;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) a {",
      "  color: #c6613f;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) a:hover {",
      "  color: #a94f2f;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) button[class*=\"_brand\"],",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) button[class*=\"_primary\"],",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [data-slot=\"sidebar.settings\"] > :is(button, [role=\"button\"]) {",
      "  background: #d97757;",
      "  color: #ffffff;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) button[class*=\"_brand\"]:hover,",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) button[class*=\"_primary\"]:hover,",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [data-slot=\"sidebar.settings\"] > :is(button, [role=\"button\"]):hover {",
      "  background: #c6613f;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) blockquote {",
      "  color: #6e6a60;",
      "  border-left-color: #c6613f;",
      "  background: rgba(198, 97, 63, 0.05);",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) pre {",
      "  background: #f5f3ee;",
      "  border-color: #e8e6dc;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) code:not(pre code) {",
      "  background: #e8e6dc;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) table th {",
      "  background: #f0eee6;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) * {",
      "  scrollbar-color: rgba(208, 205, 193, 0.9) transparent;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) ::-webkit-scrollbar-thumb {",
      "  background: rgba(208, 205, 193, 0.9);",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) ::-webkit-scrollbar-thumb:hover {",
      "  background: rgba(143, 138, 126, 0.8);",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) ::selection {",
      "  background: rgba(217, 119, 87, 0.22);",
      "}",
      "",
      "/* --- 2.2 Typography & Markdown Editorial --- */",
      "/* ---------- typography: serif display + sans UI + mono code ---------- */",
      "body[data-dsh-claude-style] {",
      "  font-family: var(--dsw-font-family);",
      "  color: #faf9f5;",
      "  background-color: #141413;",
      "}",
      "",
      "body[data-dsh-claude-style] :is(h1, h2, h3, h4, [class*=\"headline\"], [class*=\"title\"]) {",
      "  font-family: var(--dsw-font-serif);",
      "  font-weight: 500;",
      "  letter-spacing: -0.01em;",
      "  line-height: 1.25;",
      "}",
      "",
      "/* display headings sit at 500; the new-conversation headline drops one step",
      "   further to 400, and both keep the tighter display tracking */",
      "body[data-dsh-claude-style] :is(h1, [class*=\"headline\"]) {",
      "  font-weight: 500;",
      "  letter-spacing: -0.015em;",
      "}",
      "",
      "body[data-dsh-claude-style] :is(pre, code, kbd, samp, [class*=\"mono\"], [class*=\"codeBlock\"], [class*=\"CodeBlock\"]) {",
      "  font-family: var(--dsw-font-code);",
      "}",
      "",
      "/* editorial captions */",
      "body[data-dsh-claude-style] :is([class*=\"caption\"], [class*=\"sectionLabel\"]) {",
      "  font-size: 12px;",
      "  font-weight: 500;",
      "}",
      "",
      "/* ---------- editorial markdown ---------- */",
      "body[data-dsh-claude-style] blockquote {",
      "  font-family: var(--dsw-font-serif);",
      "  font-style: italic;",
      "  color: #b0aea5;",
      "  border-left: 2px solid #d97757;",
      "  background: rgba(217, 119, 87, 0.06);",
      "  border-radius: 0 8px 8px 0;",
      "  padding: 0.6em 1em;",
      "}",
      "",
      "body[data-dsh-claude-style] pre {",
      "  background: #1c1b1a;",
      "  border: 1px solid #242320;",
      "  border-radius: 8px;",
      "}",
      "",
      "body[data-dsh-claude-style] code:not(pre code) {",
      "  background: #2e2c29;",
      "  border-radius: 4px;",
      "  padding: 0.15em 0.4em;",
      "  font-size: 0.88em;",
      "}",
      "",
      "body[data-dsh-claude-style] hr {",
      "  border: none;",
      "  border-top: 1px solid rgba(20, 20, 19, 0.14);",
      "  margin: 1.6em 0;",
      "}",
      "",
      "body[data-dsh-claude-style] table {",
      "  border-collapse: collapse;",
      "  font-size: 0.92em;",
      "  width: 100%;",
      "}",
      "",
      "body[data-dsh-claude-style] table th {",
      "  background: rgba(250, 249, 245, 0.06);",
      "  font-weight: 600;",
      "  text-align: left;",
      "}",
      "",
      "body[data-dsh-claude-style] table td, body[data-dsh-claude-style] table th {",
      "  border: none;",
      "  border-bottom: 1px solid rgba(20, 20, 19, 0.12);",
      "  padding: 0.6em 0.85em !important;",
      "}",
      "",
      "/* tabs: subtle editorial weighting */",
      "body[data-dsh-claude-style] [role=\"tab\"] {",
      "  font-weight: 500;",
      "}",
      "",
      "/* technical meta (model selector, triggers) read as mono labels */",
      "body[data-dsh-claude-style] [class*=\"triggerLabel\"],",
      "body[data-dsh-claude-style] [class*=\"selectLabel\"],",
      "body[data-dsh-claude-style] [class*=\"monoLabel\"] {",
      "  font-family: var(--dsw-font-code);",
      "  font-size: 12px;",
      "  letter-spacing: 0;",
      "}",
      "",
      "/* --- 2.3 Host Chrome Restyling (Sidebar, Composer, Buttons) --- */",
      "/* ---------- canvas + hairline structure ---------- */",
      "body[data-dsh-claude-style] :is([data-pane=\"sidebar\"], [class*=\"sidebarCol\"], .dshDesktopSidebarSurface) {",
      "  --dsw-specific-sidebar-fill: #141413 !important;",
      "  background: #141413 !important;",
      "  border-right: 1px solid #242320 !important;",
      "}",
      "",
      "body[data-dsh-claude-style] :is([data-pane=\"conversation\"], [class*=\"centerCol\"]) {",
      "  background: #141413;",
      "}",
      "",
      "/* ---------- clay accent: one emphasis color, disciplined ---------- */",
      "body[data-dsh-claude-style] a {",
      "  color: #e08a6d;",
      "}",
      "",
      "body[data-dsh-claude-style] a:hover {",
      "  color: #f0a488;",
      "}",
      "",
      "body[data-dsh-claude-style] button[class*=\"brand\"] {",
      "  color: #d97757;",
      "}",
      "",
      "/* The baked-in wordmark \"HARNESS\" badge (a pill rect + its letter paths)",
      "   looks crowded next to the whale + wordmark. Hide the badge entirely so",
      "   the brand reads as a clean whale + wordmark on the clay pill. */",
      "body[data-dsh-claude-style] button[class*=\"brand\"] rect[fill=\"currentColor\"],",
      "body[data-dsh-claude-style] button[class*=\"brand\"] path[fill*=\"label-primary-inverted\"] {",
      "  display: none;",
      "}",
      "",
      "/* pill CTAs: send + settings sidebar actions */",
      "body[data-dsh-claude-style] button[class*=\"_brand\"],",
      "body[data-dsh-claude-style] button[class*=\"_primary\"],",
      "body[data-dsh-claude-style] [data-slot=\"sidebar.settings\"] > :is(button, [role=\"button\"]) {",
      "  border-radius: 9999px;",
      "  background: #d97757;",
      "  color: #ffffff;",
      "  font-weight: 500;",
      "}",
      "",
      "body[data-dsh-claude-style] button[class*=\"_brand\"]:hover,",
      "body[data-dsh-claude-style] button[class*=\"_primary\"]:hover,",
      "body[data-dsh-claude-style] [data-slot=\"sidebar.settings\"] > :is(button, [role=\"button\"]):hover {",
      "  background: #e08a6d;",
      "}",
      "",
      "/* Brand logo chip: drop the loud clay pill so the mark + wordmark sit on",
      "   the canvas. That pill also carried a 9999px radius, and together with the",
      "   button overflow:hidden its arc clipped the leading edge of the mark — so",
      "   the radius goes as well. Adaptive logo color: espresso on light, ivory",
      "   on dark. */",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) button[class*=\"brand\"],",
      "body[data-dsh-claude-style][data-ds-dark-theme] button[class*=\"brand\"] {",
      "  background: transparent !important;",
      "  border: none;",
      "  border-radius: 0;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) button[class*=\"brand\"] {",
      "  color: #141413 !important;",
      "}",
      "",
      "body[data-dsh-claude-style][data-ds-dark-theme] button[class*=\"brand\"] {",
      "  color: #faf9f5 !important;",
      "}",
      "",
      "/* badges: full pill */",
      "body[data-dsh-claude-style] :is([class*=\"badge\"], [class*=\"Badge\"], [class*=\"tag\"], [class*=\"Tag\"]) {",
      "  border-radius: 9999px;",
      "}",
      "",
      "/* ---------- chrome details ---------- */",
      "body[data-dsh-claude-style] * {",
      "  scrollbar-width: thin;",
      "  scrollbar-color: rgba(58, 56, 51, 0.9) transparent;",
      "}",
      "",
      "body[data-dsh-claude-style] ::-webkit-scrollbar {",
      "  width: 8px;",
      "  height: 8px;",
      "}",
      "",
      "body[data-dsh-claude-style] ::-webkit-scrollbar-track {",
      "  background: transparent;",
      "}",
      "",
      "body[data-dsh-claude-style] ::-webkit-scrollbar-thumb {",
      "  background: rgba(58, 56, 51, 0.9);",
      "  border-radius: 9999px;",
      "}",
      "",
      "body[data-dsh-claude-style] ::-webkit-scrollbar-thumb:hover {",
      "  background: rgba(107, 106, 101, 0.9);",
      "}",
      "",
      "body[data-dsh-claude-style] ::selection {",
      "  background: rgba(217, 119, 87, 0.30);",
      "  color: inherit;",
      "}",
      "",
      "body[data-dsh-claude-style] :is(button, input, textarea, select, [role=\"button\"], [role=\"tab\"], [role=\"treeitem\"]) {",
      "  outline: none;",
      "}",
      "",
      "/* Keyboard focus ring: neutral, in the input box's own shadow colour",
      "   (espresso #141413 in light); dark inverts to bright ivory — a near-black",
      "   canvas gets a light ring, never a darker one. */",
      "body[data-dsh-claude-style] :is(button, input, textarea, select, [role=\"button\"], [role=\"tab\"], [role=\"treeitem\"]):focus-visible {",
      "  outline: 2px solid rgba(20, 20, 19, 0.45);",
      "  outline-offset: 1px;",
      "}",
      "",
      "body[data-dsh-claude-style][data-ds-dark-theme] :is(button, input, textarea, select, [role=\"button\"], [role=\"tab\"], [role=\"treeitem\"]):focus-visible {",
      "  outline-color: rgba(250, 249, 245, 0.60);",
      "}",
      "",
      "/* ---------- Claude Code layout: hero brand mark ---------- */",
      "/* The new-conversation hero ships the DeepSeek fish; swap it for the selected",
      "   brand mark. Every child of the hitbox is hidden — the mark can sit behind a",
      "   slot wrapper, not always a bare svg — and the mark is painted on the hitbox,",
      "   so React keeps owning its own node. The hero keeps the clay fill in both",
      "   brands, matching the shipped accent treatment. */",
      "body[data-dsh-claude-style] [class*=\"fishHitbox\"] > * {",
      "  display: none !important;",
      "}",
      "",
      "body[data-dsh-claude-style] [class*=\"fishHitbox\"] svg {",
      "  display: none !important;",
      "}",
      "",
      "body[data-dsh-claude-style] [class*=\"fishHitbox\"]::before {",
      "  content: \"\";",
      "  flex: none;",
      "  width: 42.5px;",
      "  height: 42.5px;",
      "  background-repeat: no-repeat;",
      "  background-position: center;",
      "  background-size: contain;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-dsh-claude-brand=\"anthropic\"]) [class*=\"fishHitbox\"]::before {",
      "  background-image: url(\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20148.09%20148.18'%3E%3Cg%20transform%3D'translate(-75.96%2C-223.53)'%3E%3Cpath%20fill%3D'%23D97757'%20d%3D'm%20105.01%2C322.07%2029.14%2C-16.35%200.49%2C-1.42%20-0.49%2C-0.79%20h%20-1.42%20l%20-4.87%2C-0.3%20-16.65%2C-0.45%20-14.44%2C-0.6%20-13.99%2C-0.75%20-3.52%2C-0.75%20-3.3%2C-4.35%200.34%2C-2.17%202.96%2C-1.99%204.24%2C0.37%209.37%2C0.64%2014.06%2C0.97%2010.2%2C0.6%2015.11%2C1.57%20h%202.4%20l%200.34%2C-0.97%20-0.82%2C-0.6%20-0.64%2C-0.6%20-14.55%2C-9.86%20-15.75%2C-10.42%20-8.25%2C-6%20-4.46%2C-3.04%20-2.25%2C-2.85%20-0.97%2C-6.22%204.05%2C-4.46%205.44%2C0.37%201.39%2C0.37%205.51%2C4.24%2011.77%2C9.11%2015.37%2C11.32%202.25%2C1.87%200.9%2C-0.64%200.11%2C-0.45%20-1.01%2C-1.69%20-8.36%2C-15.11%20-8.92%2C-15.37%20-3.97%2C-6.37%20-1.05%2C-3.82%20c%20-0.37%2C-1.57%20-0.64%2C-2.89%20-0.64%2C-4.5%20l%204.61%2C-6.26%202.55%2C-0.82%206.15%2C0.82%202.59%2C2.25%203.82%2C8.74%206.19%2C13.76%209.6%2C18.71%202.81%2C5.55%201.5%2C5.14%200.56%2C1.57%20h%200.97%20v%20-0.9%20l%200.79%2C-10.54%201.46%2C-12.94%201.42%2C-16.65%200.49%2C-4.69%202.32%2C-5.62%204.61%2C-3.04%203.6%2C1.72%202.96%2C4.24%20-0.41%2C2.74%20-1.76%2C11.44%20-3.45%2C17.92%20-2.25%2C12%20h%201.31%20l%201.5%2C-1.5%206.07%2C-8.06%2010.2%2C-12.75%204.5%2C-5.06%205.25%2C-5.59%203.37%2C-2.66%20h%206.37%20l%204.69%2C6.97%20-2.1%2C7.2%20-6.56%2C8.32%20-5.44%2C7.05%20-7.8%2C10.5%20-4.87%2C8.4%200.45%2C0.67%201.16%2C-0.11%2017.62%2C-3.75%209.52%2C-1.72%2011.36%2C-1.95%205.14%2C2.4%200.56%2C2.44%20-2.02%2C4.99%20-12.15%2C3%20-14.25%2C2.85%20-21.22%2C5.02%20-0.26%2C0.19%200.3%2C0.37%209.56%2C0.9%204.09%2C0.22%20h%2010.01%20l%2018.64%2C1.39%204.87%2C3.22%202.92%2C3.94%20-0.49%2C3%20-7.5%2C3.82%20-10.12%2C-2.4%20-23.62%2C-5.62%20-8.1%2C-2.02%20h%20-1.12%20v%200.67%20l%206.75%2C6.6%2012.37%2C11.17%2015.49%2C14.4%200.79%2C3.56%20-1.99%2C2.81%20-2.1%2C-0.3%20-13.61%2C-10.24%20-5.25%2C-4.61%20-11.89%2C-10.01%20h%20-0.79%20v%201.05%20l%202.74%2C4.01%2014.47%2C21.75%200.75%2C6.67%20-1.05%2C2.17%20-3.75%2C1.31%20-4.12%2C-0.75%20-8.47%2C-11.89%20-8.74%2C-13.39%20-7.05%2C-12%20-0.86%2C0.49%20-4.16%2C44.81%20-1.95%2C2.29%20-4.5%2C1.72%20-3.75%2C-2.85%20-1.99%2C-4.61%201.99%2C-9.11%202.4%2C-11.89%201.95%2C-9.45%201.76%2C-11.74%201.05%2C-3.9%20-0.07%2C-0.26%20-0.86%2C0.11%20-8.85%2C12.15%20-13.46%2C18.19%20-10.65%2C11.4%20-2.55%2C1.01%20-4.42%2C-2.29%200.41%2C-4.09%202.47%2C-3.64%2014.74%2C-18.75%208.89%2C-11.62%205.74%2C-6.71%20-0.04%2C-0.97%20h%20-0.34%20l%20-39.15%2C25.42%20-6.97%2C0.9%20-3%2C-2.81%200.37%2C-4.61%201.42%2C-1.5%2011.77%2C-8.1%20-0.04%2C0.04%20z'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E\");",
      "}",
      "",
      "body[data-dsh-claude-style][data-dsh-claude-brand=\"anthropic\"] [class*=\"fishHitbox\"]::before {",
      "  background-image: url(\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2024%2024'%3E%3Cpath%20d%3D'M4.709%2015.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0%2011.784l.055-.352.48-.321.686.06%201.52.103%202.278.158%201.652.097%202.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686%201.908%201.476%202.491%201.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97%202.97%200%2001-.104-.729L6.283.134%206.696%200l.996.134.42.364.62%201.414%201.002%202.229%201.555%203.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286%201.851-.559%202.903-.364%201.942h.212l.243-.242.985-1.306%201.652-2.064.73-.82.85-.904.547-.431h1.033l.76%201.129-.34%201.166-1.064%201.347-.881%201.142-1.264%201.7-.79%201.36.073.11.188-.02%202.856-.606%201.543-.28%201.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061%201.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093%201.068%202.006%201.81%202.509%202.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649%202.345%203.521.122%201.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674%207.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434%201.967-2.18%202.945-1.726%201.845-.414.164-.717-.37.067-.662.401-.589%202.388-3.036%201.44-1.882.93-1.086-.006-.158h-.055L4.132%2018.56l-1.13.146-.487-.456.061-.746.231-.243%201.908-1.312-.006.006z'%20fill%3D'%23D97757'%2F%3E%3C%2Fsvg%3E\");",
      "}",
      "",
      "/* The preview badge has no Claude Code counterpart. */",
      "body[data-dsh-claude-style] [class*=\"previewBadge\"] {",
      "  display: none !important;",
      "}",
      "",
      "/* Headline: the shipped 26px/32px editorial display, then 15% back off that",
      "   (52 -> 44.2) and one weight step below the display rule. */",
      "body[data-dsh-claude-style] [class*=\"headline\"]:has([class*=\"fishHitbox\"]) {",
      "  font-size: 44.2px;",
      "  line-height: 54.4px;",
      "  font-weight: 400;",
      "}",
      "",
      "/* ---------- Claude Code layout: composer input + buttons ---------- */",
      "/* The composer card is the input box: one step up in type size, pure white",
      "   so it separates from the canvas, and an outline 4px tighter than the",
      "   shipped 22px. */",
      "body[data-dsh-claude-style] [data-composer-card] {",
      "  font-size: 15px;",
      "  border-radius: 18px;",
      "  border: 1px solid var(--dsw-alias-border-l1);",
      "  position: relative;",
      "  z-index: 2;",
      "  gap: 8px !important;",
      "  padding-bottom: 2px !important;",
      "  min-height: 0 !important;",
      "  height: auto !important;",
      "  transition: border-color 0.12s ease, box-shadow 0.12s ease;",
      "}",
      "",
      "/* Input height, by composer variant. The hero (new conversation) keeps the",
      "   tall 86px field it was tuned to. An active conversation instead hugs its",
      "   draft: the shipped 36px floor holds exactly one line, the contenteditable",
      "   then grows a line at a time, and .scroll caps the box at",
      "   --dsh-composer-text-max-height before it starts scrolling. Both hooks are",
      "   ancestors of the field, so :is() also keeps the tall field through the",
      "   settling frame, while an active composer matches neither. */",
      "body[data-dsh-claude-style] :is([class*=\"composerHero\"], [data-phase=\"hero\"]) [data-composer-input] {",
      "  min-height: 86px !important;",
      "}",
      "",
      "body[data-dsh-claude-style] [data-composer-input] {",
      "  min-height: 36px !important;",
      "  height: auto !important;",
      "}",
      "",
      "/* Tight bottom padding below the button controls row. The selector must",
      "   be `[class*=\"_row\"]`: a bare `[class*=\"row\"]` substring-matches the",
      "   shipped input growth wrapper `.p_FcLG_grow` (\"grow\" contains \"row\"),",
      "   which pins the composer field to the toolbar-row metrics. */",
      "body[data-dsh-claude-style] [data-composer-card] [class*=\"_row\"] {",
      "  padding-bottom: 2px !important;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [data-composer-card] {",
      "  background: #ffffff;",
      "  box-shadow: 0 4px 12px rgba(20, 20, 19, 0.04), 0 1px 3px rgba(20, 20, 19, 0.02);",
      "}",
      "",
      "/* Focus: the shipped field has no focus face at all — only the caret moves —",
      "   so this adds one, in the input box's own shadow colour rather than the",
      "   accent: the hairline takes the drop-shadow tint (espresso in light), a 1px",
      "   halo in the same tone hugs the edge, and the drop shadow deepens. Dark sits",
      "   on a near-black canvas, where black-on-black carries no cue at all — there",
      "   the focus face inverts to a BRIGHT ivory rim and halo, so the field visibly",
      "   lights up instead of deepening. The tray below continues the same hairline,",
      "   so its three edges follow whenever the card above it holds focus. */",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [data-composer-card]:focus-within {",
      "  border-color: rgba(20, 20, 19, 0.36);",
      "  box-shadow: 0 0 0 1px rgba(20, 20, 19, 0.13), 0 6px 18px rgba(20, 20, 19, 0.06), 0 2px 6px rgba(20, 20, 19, 0.03);",
      "}",
      "",
      "body[data-dsh-claude-style][data-ds-dark-theme] [data-composer-card]:focus-within {",
      "  border-color: rgba(250, 249, 245, 0.45);",
      "  box-shadow: 0 0 0 1px rgba(250, 249, 245, 0.18), 0 6px 24px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.22);",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [class*=\"composerStack\"]:has([data-composer-card]:focus-within) > [class*=\"heroWorkspaceRow\"] {",
      "  border-color: rgba(20, 20, 19, 0.36);",
      "}",
      "",
      "body[data-dsh-claude-style][data-ds-dark-theme] [class*=\"composerStack\"]:has([data-composer-card]:focus-within) > [class*=\"heroWorkspaceRow\"] {",
      "  border-color: rgba(250, 249, 245, 0.45);",
      "}",
      "",
      "/* The workspace-trigger variant paints its dashed ring through a masked svg",
      "   cut with rx=22; re-cut it so the ring tracks the 18px card. */",
      "body[data-dsh-claude-style] [data-composer-card]:after {",
      "  border-radius: 18px;",
      "  -webkit-mask: url(\"data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27none%27 rx=%2718%27 ry=%2718%27 stroke=%27black%27 stroke-width=%272%27 stroke-dasharray=%274 4%27/%3E%3C/svg%3E\");",
      "  mask: url(\"data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27none%27 rx=%2718%27 ry=%2718%27 stroke=%27black%27 stroke-width=%272%27 stroke-dasharray=%274 4%27/%3E%3C/svg%3E\");",
      "}",
      "",
      "/* Commands and attach: 7px corners instead of the shipped full circle, no",
      "   resting fill, and a warm plate on hover. */",
      "body[data-dsh-claude-style] :is(button[aria-label=\"指令\"], button[aria-label=\"Commands\"], button[aria-label=\"添加附件\"], button[aria-label=\"Add attachment\"]) {",
      "  border-radius: 7px;",
      "}",
      "",
      "/* Send, and the stop/queue/steer labels that replace it while running: the",
      "   shipped 34px circle becomes a 7px rounded rectangle. */",
      "body[data-dsh-claude-style] :is(button[aria-label=\"发送消息\"], button[aria-label=\"Send message\"], button[aria-label=\"排队发送\"], button[aria-label=\"Queue message\"], button[aria-label=\"插话发送\"], button[aria-label=\"Steer message\"], button[aria-label=\"停止生成\"], button[aria-label=\"Stop generating\"]) {",
      "  border-radius: 7px;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) :is(button[aria-label=\"指令\"], button[aria-label=\"Commands\"], button[aria-label=\"添加附件\"], button[aria-label=\"Add attachment\"]) {",
      "  background: transparent;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) :is(button[aria-label=\"指令\"], button[aria-label=\"Commands\"], button[aria-label=\"添加附件\"], button[aria-label=\"Add attachment\"]):hover:not(:disabled) {",
      "  background: #f6f6f4;",
      "}",
      "",
      "/* Model selector: the same type size as the permission segments and the",
      "   same 7px corners; its chevron is dropped while the click target and the",
      "   menu it opens stay exactly as shipped. Its shipped hover token is only a",
      "   ~6% tint, so the hover plate matches the composer tool buttons. */",
      "body[data-dsh-claude-style] [data-composer-card] [class*=\"trigger\"] {",
      "  font-size: 14px;",
      "  border-radius: 7px;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [data-composer-card] [class*=\"trigger\"]:hover:not(:disabled) {",
      "  background: #f6f6f4;",
      "}",
      "",
      "body[data-dsh-claude-style] [data-composer-card] [class*=\"_chevron\"] {",
      "  display: none !important;",
      "}",
      "",
      "/* ---------- Claude Code layout: composer footer bar ---------- */",
      "/* Reference layout: two-tier integrated tray. The top card is a pure white",
      "   rounded card with drop shadow (z-index: 2). The bottom tray is a seamless",
      "   equal-width tray (z-index: 1) attached directly to the bottom of the card,",
      "   with transparent background (inheriting the canvas tone #fcfcfb),",
      "   left/right/bottom border, and 18px rounded bottom corners. */",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:has([class*=\"heroWorkspaceRow\"]) {",
      "  --dsh-claude-bar-h: 96px;",
      "}",
      "",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:has([class*=\"heroWorkspaceRow\"]) *:has([data-composer-card]) {",
      "  order: 1;",
      "  padding-bottom: 0 !important;",
      "}",
      "",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:has([class*=\"heroWorkspaceRow\"]) [data-composer-card] {",
      "  gap: 8px !important;",
      "  padding-bottom: 2px !important;",
      "  min-height: 0 !important;",
      "  height: auto !important;",
      "}",
      "",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:has([class*=\"heroWorkspaceRow\"]) > [class*=\"heroWorkspaceRow\"] {",
      "  order: 2;",
      "  position: relative;",
      "  z-index: 1;",
      "  box-sizing: border-box;",
      "  height: calc(var(--dsh-claude-bar-h) + 18px);",
      "  width: calc(100% - var(--dsh-composer-side-clearance, 0px) - var(--dsh-composer-side-clearance, 0px));",
      "  max-width: var(--dsh-composer-card-max-width, 100%);",
      "  margin: calc(0px - var(--dsh-composer-stack-gap, 6px) - 18px) auto 0;",
      "  padding: 18px 16px 0 16px;",
      "  background: transparent;",
      "  border-left: 1px solid var(--dsw-alias-border-l1);",
      "  border-right: 1px solid var(--dsw-alias-border-l1);",
      "  border-bottom: 1px solid var(--dsw-alias-border-l1);",
      "  border-top: none;",
      "  border-radius: 0 0 18px 18px;",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: space-between;",
      "  transition: border-color 0.12s ease;",
      "}",
      "",
      "/* Muted typography and 7px corners for footer controls */",
      "body[data-dsh-claude-style] [class*=\"heroWorkspaceRow\"] :is(button, [role=\"button\"]) {",
      "  font-size: 13px;",
      "  color: var(--dsw-alias-label-secondary);",
      "  border-radius: 7px;",
      "}",
      "",
      "/* Hide chevrons in the footer tray for a clean, minimal Claude Code look */",
      "body[data-dsh-claude-style] [class*=\"heroWorkspaceRow\"] :is([class*=\"chevron\"], [class*=\"Chevron\"]) {",
      "  display: none !important;",
      "}",
      "",
      "/* ---------- Claude Code layout: composer send button ---------- */",
      "/* An empty composer keeps the send button in place but drops it to a ghost:",
      "   transparent plate, a hairline in the input box border colour, and the glyph",
      "   in the same colour the model control uses for its effort tier (low/high), so",
      "   it reads as not-ready instead of vanishing. Flat by design (no shadow), and",
      "   border-box keeps the outer 34px so the row does not shift. The stop/queue/",
      "   steer labels are untouched, so a running turn keeps its control even with an",
      "   empty draft. */",
      "body[data-dsh-claude-style] [data-composer-card]:has([data-composer-placeholder]) :is(button[aria-label=\"发送消息\"], button[aria-label=\"Send message\"]) {",
      "  box-sizing: border-box;",
      "  background: transparent;",
      "  color: var(--dsw-alias-label-caption);",
      "  border: 1px solid var(--dsw-alias-border-l2);",
      "  box-shadow: none;",
      "  cursor: default;",
      "}",
      "",
      "/* ---------- In-conversation single-line composer ---------- */",
      "/* In an active conversation, compress composer to a single-line input card,",
      "   render send button as an enter symbol ↵ inside the card on the right,",
      "   and display toolbar controls directly underneath on the canvas. */",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"],",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"]:focus-within,",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card],",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card]:focus-within {",
      "  background: transparent !important;",
      "  border: none !important;",
      "  box-shadow: none !important;",
      "  outline: none !important;",
      "  padding: 0 !important;",
      "  gap: 0 !important;",
      "  display: flex !important;",
      "  flex-direction: column !important;",
      "  position: relative !important;",
      "  width: 100% !important;",
      "  max-width: var(--dsh-composer-card-max-width, 100%) !important;",
      "  box-sizing: border-box !important;",
      "  overflow: visible !important;",
      "  height: auto !important;",
      "}",
      "/* Do NOT override the host viewArea flex contract here. In the active",
      "   phase the host uses `flex: 1 0 auto; min-height: auto` so the viewArea",
      "   is content-sized and the sticky composerSeat pins to the scrollport",
      "   bottom. An earlier override (`flex: 1 1 auto; min-height: 0`) let the",
      "   viewArea shrink to exactly viewport-minus-composer, which put the",
      "   composer seat near the TOP of the scroll content — sticky bottom:0",
      "   cannot pull an element down past its normal position, so the composer",
      "   appeared mid-scroll and never followed message growth. */",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) {",
      "  flex: 0 0 auto !important;",
      "  overflow: visible !important;",
      "  height: auto !important;",
      "  max-height: none !important;",
      "}",
      "/* The composer is a chat-view affordance. The host keeps the seat mounted on",
      "   every conversation tab (轨迹 / 上下文 even reserve room for it), but it",
      "   should only show on the chat tab — drop the whole bottom area otherwise.",
      "   Hiding the seat also zeroes the host's --dsh-composer-height, so the",
      "   trajectory ledger's bottom clearance collapses with it. */",
      "body[data-dsh-claude-style][data-dsh-claude-composer-hidden] [data-composer-seat] {",
      "  display: none !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"]:not([data-has-attachments=\"true\"]) [class*=\"rail\"]:not([class*=\"trailing\"]),",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card]:not([data-has-attachments=\"true\"]) [class*=\"rail\"]:not([class*=\"trailing\"]) {",
      "  display: none !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"][data-has-attachments=\"true\"] [class*=\"rail\"]:not([class*=\"trailing\"]),",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card][data-has-attachments=\"true\"] [class*=\"rail\"]:not([class*=\"trailing\"]) {",
      "  background: var(--dsw-specific-input-major, #ffffff) !important;",
      "  border: 1px solid var(--dsw-alias-border-l1) !important;",
      "  border-bottom: none !important;",
      "  border-radius: 14px 14px 0 0 !important;",
      "  padding: 8px 12px 2px 12px !important;",
      "  margin: 0 !important;",
      "  width: 100% !important;",
      "  max-width: 100% !important;",
      "  box-sizing: border-box !important;",
      "  box-shadow: 0 1px 3px rgba(20, 20, 19, 0.03) !important;",
      "  transition: border-color 0.12s ease, box-shadow 0.12s ease !important;",
      "}",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [data-composer-card][data-composer-variant=\"inline\"][data-has-attachments=\"true\"] [class*=\"rail\"]:not([class*=\"trailing\"]),",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card][data-has-attachments=\"true\"] [class*=\"rail\"]:not([class*=\"trailing\"]) {",
      "  background: #ffffff !important;",
      "  border-color: #e8e6dc !important;",
      "}",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [data-composer-card][data-composer-variant=\"inline\"]:focus-within [class*=\"rail\"]:not([class*=\"trailing\"]),",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card]:focus-within [class*=\"rail\"]:not([class*=\"trailing\"]) {",
      "  border-color: rgba(20, 20, 19, 0.36) !important;",
      "  box-shadow: 0 0 0 1px rgba(20, 20, 19, 0.13), 0 4px 12px rgba(20, 20, 19, 0.05) !important;",
      "}",
      "body[data-dsh-claude-style][data-ds-dark-theme] [data-composer-card][data-composer-variant=\"inline\"]:focus-within [class*=\"rail\"]:not([class*=\"trailing\"]),",
      "body[data-dsh-claude-style][data-ds-dark-theme] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card]:focus-within [class*=\"rail\"]:not([class*=\"trailing\"]) {",
      "  border-color: rgba(250, 249, 245, 0.45) !important;",
      "  box-shadow: 0 0 0 1px rgba(250, 249, 245, 0.18), 0 4px 16px rgba(0, 0, 0, 0.40) !important;",
      "}",
      "/* The attachment rail nests two levels: ComposerAttachments' outer rail wraps",
      "   AttachmentRail's scrolling inner rail, and BOTH substring-match",
      "   `[class*=\"rail\"]`, so the block above would draw the card frame twice —",
      "   one box inside the other. Only the outer shell carries the frame; the",
      "   inner scrolling rail stays frameless. */",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"][data-has-attachments=\"true\"] [class*=\"rail\"]:not([class*=\"trailing\"]) [class*=\"rail\"]:not([class*=\"trailing\"]),",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card][data-has-attachments=\"true\"] [class*=\"rail\"]:not([class*=\"trailing\"]) [class*=\"rail\"]:not([class*=\"trailing\"]) {",
      "  background: transparent !important;",
      "  border: none !important;",
      "  box-shadow: none !important;",
      "  border-radius: 0 !important;",
      "  padding: 0 !important;",
      "  margin: 0 !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] [data-input-scroll],",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] [data-input-scroll] {",
      "  background: var(--dsw-specific-input-major, #ffffff) !important;",
      "  border: 1px solid var(--dsw-alias-border-l1) !important;",
      "  border-radius: 14px !important;",
      "  min-height: 38px !important;",
      "  height: auto !important;",
      "  max-height: var(--dsh-composer-text-max-height, 180px) !important;",
      "  box-sizing: border-box !important;",
      "  display: block !important;",
      "  width: 100% !important;",
      "  max-width: 100% !important;",
      "  overflow-y: auto !important;",
      "  overflow-x: hidden !important;",
      "  padding: 7px 36px 7px 14px !important;",
      "  margin: 0 !important;",
      "  position: relative !important;",
      "  cursor: text !important;",
      "  transition: border-color 0.12s ease, box-shadow 0.12s ease !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"][data-has-attachments=\"true\"] [data-input-scroll],",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card][data-has-attachments=\"true\"] [data-input-scroll] {",
      "  border-top: none !important;",
      "  border-radius: 0 0 14px 14px !important;",
      "  /* The card is a flex column with an 8px gap; with attachments that gap",
      "     shows the canvas as a seam line between the thumbnails and the text.",
      "     Close it (negative margin pulls the input up onto the rail) and move the",
      "     8px into the top padding, so the text keeps its distance from the",
      "     thumbnails and the card's total height is unchanged. */",
      "  margin-top: -8px !important;",
      "  min-height: 32px !important;",
      "  padding: 10px 36px 6px 14px !important;",
      "}",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [data-composer-card][data-composer-variant=\"inline\"] [data-input-scroll],",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] [data-input-scroll] {",
      "  background: #ffffff !important;",
      "  border-color: #e8e6dc !important;",
      "  box-shadow: 0 1px 3px rgba(20, 20, 19, 0.03) !important;",
      "}",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [data-composer-card][data-composer-variant=\"inline\"]:focus-within [data-input-scroll],",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card]:focus-within [data-input-scroll] {",
      "  border-color: rgba(20, 20, 19, 0.36) !important;",
      "  box-shadow: 0 0 0 1px rgba(20, 20, 19, 0.13), 0 4px 12px rgba(20, 20, 19, 0.05) !important;",
      "}",
      "body[data-dsh-claude-style][data-ds-dark-theme] [data-composer-card][data-composer-variant=\"inline\"]:focus-within [data-input-scroll],",
      "body[data-dsh-claude-style][data-ds-dark-theme] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card]:focus-within [data-input-scroll] {",
      "  border-color: rgba(250, 249, 245, 0.45) !important;",
      "  box-shadow: 0 0 0 1px rgba(250, 249, 245, 0.18), 0 4px 16px rgba(0, 0, 0, 0.40) !important;",
      "}",
      "/* With attachments the rail already carries the card's focus ring, so the",
      "   input keeps only the deepened drop — its own 1px ring would paint a second",
      "   line across the seam between the thumbnails and the text. */",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [data-composer-card][data-composer-variant=\"inline\"][data-has-attachments=\"true\"]:focus-within [data-input-scroll],",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card][data-has-attachments=\"true\"]:focus-within [data-input-scroll] {",
      "  box-shadow: 0 4px 12px rgba(20, 20, 19, 0.05) !important;",
      "}",
      "body[data-dsh-claude-style][data-ds-dark-theme] [data-composer-card][data-composer-variant=\"inline\"][data-has-attachments=\"true\"]:focus-within [data-input-scroll],",
      "body[data-dsh-claude-style][data-ds-dark-theme] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card][data-has-attachments=\"true\"]:focus-within [data-input-scroll] {",
      "  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.40) !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] [data-input-scroll] [class*=\"grow\"],",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] [data-input-scroll] [class*=\"grow\"] {",
      "  width: 100% !important;",
      "  max-width: 100% !important;",
      "  min-height: 24px !important;",
      "  position: relative !important;",
      "  display: block !important;",
      "  box-sizing: border-box !important;",
      "  overflow-x: hidden !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] [data-composer-input],",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] [data-composer-input] {",
      "  min-height: 24px !important;",
      "  height: auto !important;",
      "  line-height: 24px !important;",
      "  padding: 0 !important;",
      "  font-size: 14px !important;",
      "  width: 100% !important;",
      "  max-width: 100% !important;",
      "  box-sizing: border-box !important;",
      "  cursor: text !important;",
      "  outline: none !important;",
      "  white-space: pre-wrap !important;",
      "  word-break: break-word !important;",
      "  overflow-wrap: anywhere !important;",
      "  overflow-x: hidden !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] [data-composer-placeholder],",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] [data-composer-placeholder] {",
      "  line-height: 24px !important;",
      "  height: 24px !important;",
      "  position: absolute !important;",
      "  top: 0 !important;",
      "  left: 0 !important;",
      "  right: 0 !important;",
      "  max-width: 100% !important;",
      "  box-sizing: border-box !important;",
      "  font-size: 14px !important;",
      "  color: var(--dsw-alias-label-caption) !important;",
      "  white-space: nowrap !important;",
      "  text-overflow: ellipsis !important;",
      "  overflow: hidden !important;",
      "  pointer-events: none !important;",
      "  user-select: none !important;",
      "}",
      "/* Pinned send button inside input box */",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] :is(button[aria-label^=\"发送\"], button[aria-label^=\"Send\"], button[aria-label*=\"发送\"], button[aria-label*=\"Send\"], button[aria-label*=\"排队\"], button[aria-label*=\"Queue\"], button[aria-label*=\"插话\"], button[aria-label*=\"Steer\"], [class*=\"sendBtn\"], [class*=\"sendButton\"]),",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] :is(button[aria-label^=\"发送\"], button[aria-label^=\"Send\"], button[aria-label*=\"发送\"], button[aria-label*=\"Send\"], button[aria-label*=\"排队\"], button[aria-label*=\"Queue\"], button[aria-label*=\"插话\"], button[aria-label*=\"Steer\"], [class*=\"sendBtn\"], [class*=\"sendButton\"]) {",
      "  position: absolute !important;",
      "  bottom: 40px !important;",
      "  right: 8px !important;",
      "  top: auto !important;",
      "  left: auto !important;",
      "  width: 26px !important;",
      "  height: 26px !important;",
      "  min-width: 26px !important;",
      "  padding: 0 !important;",
      "  border-radius: 6px !important;",
      "  display: inline-flex !important;",
      "  align-items: center !important;",
      "  justify-content: center !important;",
      "  z-index: 10 !important;",
      "  box-shadow: none !important;",
      "  background: transparent !important;",
      "  color: var(--dsw-alias-label-caption) !important;",
      "  border: none !important;",
      "  cursor: pointer !important;",
      "  transition: color 0.12s ease, background-color 0.12s ease !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] :is(button[aria-label^=\"发送\"], button[aria-label^=\"Send\"], button[aria-label*=\"发送\"], button[aria-label*=\"Send\"], button[aria-label*=\"排队\"], button[aria-label*=\"Queue\"], button[aria-label*=\"插话\"], button[aria-label*=\"Steer\"], [class*=\"sendBtn\"], [class*=\"sendButton\"]) :is(svg, [class*=\"chevron\"], span) {",
      "  display: none !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] :is(button[aria-label^=\"发送\"], button[aria-label^=\"Send\"], button[aria-label*=\"发送\"], button[aria-label*=\"Send\"], button[aria-label*=\"排队\"], button[aria-label*=\"Queue\"], button[aria-label*=\"插话\"], button[aria-label*=\"Steer\"], [class*=\"sendBtn\"], [class*=\"sendButton\"])::after,",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] :is(button[aria-label^=\"发送\"], button[aria-label^=\"Send\"], button[aria-label*=\"发送\"], button[aria-label*=\"Send\"], button[aria-label*=\"排队\"], button[aria-label*=\"Queue\"], button[aria-label*=\"插话\"], button[aria-label*=\"Steer\"], [class*=\"sendBtn\"], [class*=\"sendButton\"])::after {",
      "  content: \"↵\" !important;",
      "  font-family: var(--dsw-font-code, monospace) !important;",
      "  font-size: 16px !important;",
      "  font-weight: 500 !important;",
      "  line-height: 1 !important;",
      "  color: currentColor !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] :is(button[aria-label^=\"发送\"], button[aria-label^=\"Send\"], button[aria-label*=\"发送\"], button[aria-label*=\"Send\"]):not(:disabled):hover,",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] :is(button[aria-label^=\"发送\"], button[aria-label^=\"Send\"], button[aria-label*=\"发送\"], button[aria-label*=\"Send\"]):not(:disabled):hover {",
      "  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;",
      "  color: var(--dsw-alias-label-primary) !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"]:not(:has([data-composer-placeholder])) :is(button[aria-label^=\"发送\"], button[aria-label^=\"Send\"], button[aria-label*=\"发送\"], button[aria-label*=\"Send\"]),",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card]:not(:has([data-composer-placeholder])) :is(button[aria-label^=\"发送\"], button[aria-label^=\"Send\"], button[aria-label*=\"发送\"], button[aria-label*=\"Send\"]) {",
      "  color: var(--dsw-alias-brand-primary, #d97757) !important;",
      "}",
      "/* Pinned stop button inside input box */",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] :is(button[aria-label*=\"停止\"], button[aria-label*=\"Stop\"]),",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] :is(button[aria-label*=\"停止\"], button[aria-label*=\"Stop\"]) {",
      "  position: absolute !important;",
      "  bottom: 40px !important;",
      "  right: 8px !important;",
      "  top: auto !important;",
      "  left: auto !important;",
      "  width: 26px !important;",
      "  height: 26px !important;",
      "  min-width: 26px !important;",
      "  padding: 0 !important;",
      "  border-radius: 6px !important;",
      "  display: inline-flex !important;",
      "  align-items: center !important;",
      "  justify-content: center !important;",
      "  z-index: 10 !important;",
      "  background: var(--dsw-alias-interactive-bg-hover) !important;",
      "  color: var(--dsw-alias-brand-primary, #d97757) !important;",
      "  border: none !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] :is(button[aria-label*=\"停止\"], button[aria-label*=\"Stop\"]) svg,",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] :is(button[aria-label*=\"停止\"], button[aria-label*=\"Stop\"]) svg {",
      "  display: block !important;",
      "  width: 12px !important;",
      "  height: 12px !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] :is(button[aria-label*=\"停止\"], button[aria-label*=\"Stop\"])::after,",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] :is(button[aria-label*=\"停止\"], button[aria-label*=\"Stop\"])::after {",
      "  display: none !important;",
      "}",
      "/* Toolbar row below input card. `[class*=\"_row\"]` on purpose: a bare",
      "   `[class*=\"row\"]` substring-matches the shipped `.p_FcLG_grow` input",
      "   wrapper (\"grow\" contains \"row\"), and the fixed 28px height + flex",
      "   display here would pin the composer field to one line forever. */",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] [class*=\"_row\"],",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] [class*=\"_row\"] {",
      "  display: flex !important;",
      "  flex-wrap: nowrap !important;",
      "  justify-content: space-between !important;",
      "  align-items: center !important;",
      "  padding: 0 4px !important;",
      "  margin: 6px 0 0 0 !important;",
      "  background: transparent !important;",
      "  border: none !important;",
      "  box-shadow: none !important;",
      "  min-height: 28px !important;",
      "  height: 28px !important;",
      "  width: 100% !important;",
      "  max-width: 100% !important;",
      "  box-sizing: border-box !important;",
      "  overflow: visible !important;",
      "}",
      "/* The context-occupancy meter renders its click-open panel INSIDE the inline",
      "   composer card, and its legend classes (`…_rows` / `…_row`) substring-match",
      "   the toolbar-row override above — which flattened the shipped definition",
      "   list into one 28px flex line and wrapped every label/value. Restore the",
      "   shipped legend layout: the list stacks vertically, each row keeps its",
      "   natural height and space-between distribution. */",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] [class*=\"_rows\"],",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] [class*=\"_rows\"] {",
      "  display: block !important;",
      "  height: auto !important;",
      "  min-height: 0 !important;",
      "  width: auto !important;",
      "  max-width: none !important;",
      "  padding: 0 !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] [class*=\"_rows\"] [class*=\"_row\"],",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] [class*=\"_rows\"] [class*=\"_row\"] {",
      "  display: flex !important;",
      "  height: auto !important;",
      "  min-height: 0 !important;",
      "  width: auto !important;",
      "  max-width: none !important;",
      "  padding: 2px 0 !important;",
      "  margin: 0 !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] [class*=\"tools\"],",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] [class*=\"tools\"] {",
      "  display: flex !important;",
      "  align-items: center !important;",
      "  gap: 8px !important;",
      "  flex: 0 0 auto !important;",
      "  overflow: visible !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] [class*=\"modes\"],",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] [class*=\"modes\"] {",
      "  order: 1 !important;",
      "  display: inline-flex !important;",
      "  align-items: center !important;",
      "  overflow: visible !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] :is(button[aria-label=\"指令\"], button[aria-label=\"Commands\"]),",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] :is(button[aria-label=\"指令\"], button[aria-label=\"Commands\"]) {",
      "  order: 2 !important;",
      "  width: 24px !important;",
      "  height: 24px !important;",
      "  border-radius: 6px !important;",
      "  background: transparent !important;",
      "  color: var(--dsw-alias-label-secondary) !important;",
      "  display: inline-flex !important;",
      "  align-items: center !important;",
      "  justify-content: center !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] :is(button[aria-label=\"添加附件\"], button[aria-label=\"Add attachment\"]),",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] :is(button[aria-label=\"添加附件\"], button[aria-label=\"Add attachment\"]) {",
      "  order: 3 !important;",
      "  width: 24px !important;",
      "  height: 24px !important;",
      "  border-radius: 6px !important;",
      "  background: transparent !important;",
      "  color: var(--dsw-alias-label-secondary) !important;",
      "  display: inline-flex !important;",
      "  align-items: center !important;",
      "  justify-content: center !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] :is(button[aria-label=\"指令\"], button[aria-label=\"Commands\"], button[aria-label=\"添加附件\"], button[aria-label=\"Add attachment\"]):hover:not(:disabled),",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] :is(button[aria-label=\"指令\"], button[aria-label=\"Commands\"], button[aria-label=\"添加附件\"], button[aria-label=\"Add attachment\"]):hover:not(:disabled) {",
      "  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;",
      "  color: var(--dsw-alias-label-primary) !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] [class*=\"trailing\"],",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] [class*=\"trailing\"] {",
      "  display: flex !important;",
      "  align-items: center !important;",
      "  gap: 8px !important;",
      "  margin-left: auto !important;",
      "  flex: 0 0 auto !important;",
      "}",
      "/* Model trigger in trailing */",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] [class*=\"trailing\"] > :first-child,",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] [class*=\"trailing\"] :is([class*=\"trigger\" i], [class*=\"model\" i], [class*=\"Model\"]) {",
      "  display: inline-flex !important;",
      "  align-items: center !important;",
      "  font-size: 13px !important;",
      "  color: var(--dsw-alias-label-secondary) !important;",
      "  border-radius: 7px !important;",
      "  cursor: pointer !important;",
      "  visibility: visible !important;",
      "  opacity: 1 !important;",
      "}",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [data-composer-card][data-composer-variant=\"inline\"] [class*=\"trailing\"] > :first-child:hover:not(:disabled),",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) [data-composer-card][data-composer-variant=\"inline\"] [class*=\"trailing\"] :is([class*=\"trigger\" i], [class*=\"model\" i], [class*=\"Model\"]):hover:not(:disabled) {",
      "  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.06)) !important;",
      "  color: var(--dsw-alias-label-primary) !important;",
      "}",
      "/* Token stats pills — merged into the toolbar row (one line with the",
      "   controls). The base rule below is the fallback for the host's own",
      "   position (a full-width line under the card); once mergeStatsIntoRow()",
      "   has moved the pills into the row, the override after it resets every",
      "   geometry property the host's full-width line depends on. */",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] ~ [data-composer-stats],",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-stats] {",
      "  display: flex !important;",
      "  align-items: center !important;",
      "  justify-content: center !important;",
      "  gap: 12px !important;",
      "  font-size: 12px !important;",
      "  color: var(--dsw-alias-label-secondary) !important;",
      "  margin: 6px auto 0 !important;",
      "  height: 24px !important;",
      "  line-height: 24px !important;",
      "  pointer-events: auto !important;",
      "  width: 100% !important;",
      "  max-width: var(--dsh-composer-card-max-width, 100%) !important;",
      "  box-sizing: border-box !important;",
      "  overflow: hidden !important;",
      "  white-space: nowrap !important;",
      "  text-overflow: ellipsis !important;",
      "}",
      "/* In-row: the pills become an inline, shrinkable flex item between the left",
      "   tool cluster and the trailing model/status group (the row's space-between",
      "   centers them). Width, padding and margin come from the host's full-width",
      "   line, so all of them are reset; the pills keep their own hover/click. */",
      "body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] [class*=\"_row\"] [data-composer-stats],",
      "body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-card] [class*=\"_row\"] [data-composer-stats] {",
      "  width: auto !important;",
      "  max-width: none !important;",
      "  margin: 0 8px !important;",
      "  padding: 0 !important;",
      "  height: auto !important;",
      "  line-height: 20px !important;",
      "  justify-content: flex-start !important;",
      "  flex: 0 1 auto !important;",
      "  min-width: 0 !important;",
      "}",
      "/* The stats pills are on-demand: hidden unless the chat window (the composer)",
      "   is hovered, so the toolbar stays clean. Space is preserved — no reflow when",
      "   they fade in — and because the pills live inside the card, hovering them",
      "   keeps them visible long enough to click. */",
      "body[data-dsh-claude-style] [data-composer-card] [class*=\"_row\"] [data-composer-stats] {",
      "  opacity: 0 !important;",
      "  visibility: hidden !important;",
      "  pointer-events: none !important;",
      "  transition: opacity 0.15s ease, visibility 0.15s ease !important;",
      "}",
      "body[data-dsh-claude-style] [data-composer-card]:hover [class*=\"_row\"] [data-composer-stats] {",
      "  opacity: 1 !important;",
      "  visibility: visible !important;",
      "  pointer-events: auto !important;",
      "}",
      "@media (max-width: 820px) {",
      "  body[data-dsh-claude-style] [data-composer-card][data-composer-variant=\"inline\"] ~ [data-composer-stats],",
      "  body[data-dsh-claude-style] [class*=\"composerStack\"]:not(:has([class*=\"heroWorkspaceRow\"])) [data-composer-stats] {",
      "    display: none !important;",
      "  }",
      "}",
      "",
      "/* ---------- Claude Code layout: sidebar brand ---------- */",
      "/* The shipped whale and wordmark give way to the selected brand. Each variant",
      "   is painted as an alpha mask over currentColor, so it follows the light/dark",
      "   label colour instead of carrying a baked-in one. The choice is switched by a",
      "   document attribute rather than by swapping the stylesheet, so the settings",
      "   page only has to flip one attribute and the whole UI follows.",
      "",
      "   Sizing: both marks are set to an 18px cap height to match the shipped",
      "   brandName box, and each wordmark takes its natural width from that height",
      "   via the artwork aspect ratios (Claude 4.214:1, ANTHROPIC ~8.94:1). The",
      "   wordmark keeps a max-width so a longer brand can never clip the row. */",
      "body[data-dsh-claude-style] :is([class*=\"brandMark\"], [class*=\"railMark\"]) > * {",
      "  display: none !important;",
      "}",
      "",
      "body[data-dsh-claude-style] :is([class*=\"brandMark\"], [class*=\"railMark\"])::before {",
      "  content: \"\";",
      "  display: block;",
      "  flex: none;",
      "  background-color: currentColor;",
      "  background-repeat: no-repeat;",
      "  background-position: center;",
      "  background-size: contain;",
      "}",
      "",
      "/* Claude (default): starburst mark + the Claude wordmark. */",
      "body[data-dsh-claude-style]:not([data-dsh-claude-brand=\"anthropic\"]) :is([class*=\"brandMark\"], [class*=\"railMark\"])::before {",
      "  width: 18px;",
      "  height: 18px;",
      "  -webkit-mask: url(\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20148.09%20148.18'%3E%3Cg%20transform%3D'translate(-75.96%2C-223.53)'%3E%3Cpath%20d%3D'm%20105.01%2C322.07%2029.14%2C-16.35%200.49%2C-1.42%20-0.49%2C-0.79%20h%20-1.42%20l%20-4.87%2C-0.3%20-16.65%2C-0.45%20-14.44%2C-0.6%20-13.99%2C-0.75%20-3.52%2C-0.75%20-3.3%2C-4.35%200.34%2C-2.17%202.96%2C-1.99%204.24%2C0.37%209.37%2C0.64%2014.06%2C0.97%2010.2%2C0.6%2015.11%2C1.57%20h%202.4%20l%200.34%2C-0.97%20-0.82%2C-0.6%20-0.64%2C-0.6%20-14.55%2C-9.86%20-15.75%2C-10.42%20-8.25%2C-6%20-4.46%2C-3.04%20-2.25%2C-2.85%20-0.97%2C-6.22%204.05%2C-4.46%205.44%2C0.37%201.39%2C0.37%205.51%2C4.24%2011.77%2C9.11%2015.37%2C11.32%202.25%2C1.87%200.9%2C-0.64%200.11%2C-0.45%20-1.01%2C-1.69%20-8.36%2C-15.11%20-8.92%2C-15.37%20-3.97%2C-6.37%20-1.05%2C-3.82%20c%20-0.37%2C-1.57%20-0.64%2C-2.89%20-0.64%2C-4.5%20l%204.61%2C-6.26%202.55%2C-0.82%206.15%2C0.82%202.59%2C2.25%203.82%2C8.74%206.19%2C13.76%209.6%2C18.71%202.81%2C5.55%201.5%2C5.14%200.56%2C1.57%20h%200.97%20v%20-0.9%20l%200.79%2C-10.54%201.46%2C-12.94%201.42%2C-16.65%200.49%2C-4.69%202.32%2C-5.62%204.61%2C-3.04%203.6%2C1.72%202.96%2C4.24%20-0.41%2C2.74%20-1.76%2C11.44%20-3.45%2C17.92%20-2.25%2C12%20h%201.31%20l%201.5%2C-1.5%206.07%2C-8.06%2010.2%2C-12.75%204.5%2C-5.06%205.25%2C-5.59%203.37%2C-2.66%20h%206.37%20l%204.69%2C6.97%20-2.1%2C7.2%20-6.56%2C8.32%20-5.44%2C7.05%20-7.8%2C10.5%20-4.87%2C8.4%200.45%2C0.67%201.16%2C-0.11%2017.62%2C-3.75%209.52%2C-1.72%2011.36%2C-1.95%205.14%2C2.4%200.56%2C2.44%20-2.02%2C4.99%20-12.15%2C3%20-14.25%2C2.85%20-21.22%2C5.02%20-0.26%2C0.19%200.3%2C0.37%209.56%2C0.9%204.09%2C0.22%20h%2010.01%20l%2018.64%2C1.39%204.87%2C3.22%202.92%2C3.94%20-0.49%2C3%20-7.5%2C3.82%20-10.12%2C-2.4%20-23.62%2C-5.62%20-8.1%2C-2.02%20h%20-1.12%20v%200.67%20l%206.75%2C6.6%2012.37%2C11.17%2015.49%2C14.4%200.79%2C3.56%20-1.99%2C2.81%20-2.1%2C-0.3%20-13.61%2C-10.24%20-5.25%2C-4.61%20-11.89%2C-10.01%20h%20-0.79%20v%201.05%20l%202.74%2C4.01%2014.47%2C21.75%200.75%2C6.67%20-1.05%2C2.17%20-3.75%2C1.31%20-4.12%2C-0.75%20-8.47%2C-11.89%20-8.74%2C-13.39%20-7.05%2C-12%20-0.86%2C0.49%20-4.16%2C44.81%20-1.95%2C2.29%20-4.5%2C1.72%20-3.75%2C-2.85%20-1.99%2C-4.61%201.99%2C-9.11%202.4%2C-11.89%201.95%2C-9.45%201.76%2C-11.74%201.05%2C-3.9%20-0.07%2C-0.26%20-0.86%2C0.11%20-8.85%2C12.15%20-13.46%2C18.19%20-10.65%2C11.4%20-2.55%2C1.01%20-4.42%2C-2.29%200.41%2C-4.09%202.47%2C-3.64%2014.74%2C-18.75%208.89%2C-11.62%205.74%2C-6.71%20-0.04%2C-0.97%20h%20-0.34%20l%20-39.15%2C25.42%20-6.97%2C0.9%20-3%2C-2.81%200.37%2C-4.61%201.42%2C-1.5%2011.77%2C-8.1%20-0.04%2C0.04%20z'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E\") center / contain no-repeat;",
      "  mask: url(\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20148.09%20148.18'%3E%3Cg%20transform%3D'translate(-75.96%2C-223.53)'%3E%3Cpath%20d%3D'm%20105.01%2C322.07%2029.14%2C-16.35%200.49%2C-1.42%20-0.49%2C-0.79%20h%20-1.42%20l%20-4.87%2C-0.3%20-16.65%2C-0.45%20-14.44%2C-0.6%20-13.99%2C-0.75%20-3.52%2C-0.75%20-3.3%2C-4.35%200.34%2C-2.17%202.96%2C-1.99%204.24%2C0.37%209.37%2C0.64%2014.06%2C0.97%2010.2%2C0.6%2015.11%2C1.57%20h%202.4%20l%200.34%2C-0.97%20-0.82%2C-0.6%20-0.64%2C-0.6%20-14.55%2C-9.86%20-15.75%2C-10.42%20-8.25%2C-6%20-4.46%2C-3.04%20-2.25%2C-2.85%20-0.97%2C-6.22%204.05%2C-4.46%205.44%2C0.37%201.39%2C0.37%205.51%2C4.24%2011.77%2C9.11%2015.37%2C11.32%202.25%2C1.87%200.9%2C-0.64%200.11%2C-0.45%20-1.01%2C-1.69%20-8.36%2C-15.11%20-8.92%2C-15.37%20-3.97%2C-6.37%20-1.05%2C-3.82%20c%20-0.37%2C-1.57%20-0.64%2C-2.89%20-0.64%2C-4.5%20l%204.61%2C-6.26%202.55%2C-0.82%206.15%2C0.82%202.59%2C2.25%203.82%2C8.74%206.19%2C13.76%209.6%2C18.71%202.81%2C5.55%201.5%2C5.14%200.56%2C1.57%20h%200.97%20v%20-0.9%20l%200.79%2C-10.54%201.46%2C-12.94%201.42%2C-16.65%200.49%2C-4.69%202.32%2C-5.62%204.61%2C-3.04%203.6%2C1.72%202.96%2C4.24%20-0.41%2C2.74%20-1.76%2C11.44%20-3.45%2C17.92%20-2.25%2C12%20h%201.31%20l%201.5%2C-1.5%206.07%2C-8.06%2010.2%2C-12.75%204.5%2C-5.06%205.25%2C-5.59%203.37%2C-2.66%20h%206.37%20l%204.69%2C6.97%20-2.1%2C7.2%20-6.56%2C8.32%20-5.44%2C7.05%20-7.8%2C10.5%20-4.87%2C8.4%200.45%2C0.67%201.16%2C-0.11%2017.62%2C-3.75%209.52%2C-1.72%2011.36%2C-1.95%205.14%2C2.4%200.56%2C2.44%20-2.02%2C4.99%20-12.15%2C3%20-14.25%2C2.85%20-21.22%2C5.02%20-0.26%2C0.19%200.3%2C0.37%209.56%2C0.9%204.09%2C0.22%20h%2010.01%20l%2018.64%2C1.39%204.87%2C3.22%202.92%2C3.94%20-0.49%2C3%20-7.5%2C3.82%20-10.12%2C-2.4%20-23.62%2C-5.62%20-8.1%2C-2.02%20h%20-1.12%20v%200.67%20l%206.75%2C6.6%2012.37%2C11.17%2015.49%2C14.4%200.79%2C3.56%20-1.99%2C2.81%20-2.1%2C-0.3%20-13.61%2C-10.24%20-5.25%2C-4.61%20-11.89%2C-10.01%20h%20-0.79%20v%201.05%20l%202.74%2C4.01%2014.47%2C21.75%200.75%2C6.67%20-1.05%2C2.17%20-3.75%2C1.31%20-4.12%2C-0.75%20-8.47%2C-11.89%20-8.74%2C-13.39%20-7.05%2C-12%20-0.86%2C0.49%20-4.16%2C44.81%20-1.95%2C2.29%20-4.5%2C1.72%20-3.75%2C-2.85%20-1.99%2C-4.61%201.99%2C-9.11%202.4%2C-11.89%201.95%2C-9.45%201.76%2C-11.74%201.05%2C-3.9%20-0.07%2C-0.26%20-0.86%2C0.11%20-8.85%2C12.15%20-13.46%2C18.19%20-10.65%2C11.4%20-2.55%2C1.01%20-4.42%2C-2.29%200.41%2C-4.09%202.47%2C-3.64%2014.74%2C-18.75%208.89%2C-11.62%205.74%2C-6.71%20-0.04%2C-0.97%20h%20-0.34%20l%20-39.15%2C25.42%20-6.97%2C0.9%20-3%2C-2.81%200.37%2C-4.61%201.42%2C-1.5%2011.77%2C-8.1%20-0.04%2C0.04%20z'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E\") center / contain no-repeat;",
      "}",
      "",
      "body[data-dsh-claude-style] [class*=\"brandIdentity\"] > [class*=\"brandName\"] > * {",
      "  display: none !important;",
      "}",
      "",
      "body[data-dsh-claude-style] [class*=\"brandIdentity\"] > [class*=\"brandName\"]::before {",
      "  content: \"\";",
      "  display: block;",
      "  flex: none;",
      "  background-color: currentColor;",
      "  background-repeat: no-repeat;",
      "  background-position: center;",
      "  background-size: contain;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-dsh-claude-brand=\"anthropic\"]) [class*=\"brandIdentity\"] > [class*=\"brandName\"]::before {",
      "  width: 75.9px;",
      "  max-width: 100%;",
      "  height: 18px;",
      "  -webkit-mask: url(\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'177.76%2014.09%20512.22%20121.54'%3E%3Cg%20transform%3D'translate(-75.96%2C-223.53)'%3E%3Cpath%20d%3D'm%20317.73%2C349.33%20c%20-18.82%2C0%20-31.69%2C-10.5%20-37.76%2C-26.66%20-3.17%2C-8.42%20-4.74%2C-17.36%20-4.61%2C-26.36%200%2C-27.11%2012.15%2C-45.94%2039%2C-45.94%2018.04%2C0%2029.17%2C7.87%2035.51%2C26.66%20h%207.72%20l%20-1.05%2C-25.91%20c%20-10.8%2C-6.97%20-24.3%2C-10.5%20-40.72%2C-10.5%20-23.14%2C0%20-42.82%2C10.35%20-53.77%2C29.02%20-5.66%2C9.86%20-8.53%2C21.07%20-8.32%2C32.44%200%2C20.74%209.79%2C39.11%2028.16%2C49.31%2010.06%2C5.37%2021.34%2C8.04%2032.74%2C7.72%2017.92%2C0%2032.14%2C-3.41%2044.74%2C-9.37%20l%203.26%2C-28.57%20h%20-7.87%20c%20-4.72%2C13.05%20-10.35%2C20.89%20-19.69%2C25.05%20-4.57%2C2.06%20-10.35%2C3.11%20-17.32%2C3.11%20z%20m%2081.18%2C-98.96%200.75%2C-12.75%20h%20-5.32%20l%20-23.7%2C7.12%20v%203.86%20l%2010.5%2C4.87%20v%2089.17%20c%200%2C6.07%20-3.11%2C7.42%20-11.25%2C8.44%20v%206.52%20h%2040.31%20v%20-6.52%20c%20-8.17%2C-1.01%20-11.25%2C-2.36%20-11.25%2C-8.44%20V%20250.4%20l%20-0.04%2C-0.04%20z%20m%20160.31%2C108.75%20h%203.11%20l%2027.26%2C-5.17%20v%20-6.67%20l%20-3.82%2C-0.3%20c%20-6.37%2C-0.6%20-8.02%2C-1.91%20-8.02%2C-7.12%20v%20-47.55%20l%200.75%2C-15.26%20h%20-4.31%20l%20-25.76%2C3.71%20v%206.52%20l%202.51%2C0.45%20c%206.97%2C1.01%209.04%2C2.96%209.04%2C7.84%20v%2042.37%20c%20-6.67%2C5.17%20-13.05%2C8.44%20-20.62%2C8.44%20-8.4%2C0%20-13.61%2C-4.27%20-13.61%2C-14.25%20v%20-39.79%20l%200.75%2C-15.26%20h%20-4.42%20l%20-25.8%2C3.71%20v%206.52%20l%202.66%2C0.45%20c%206.97%2C1.01%209.04%2C2.96%209.04%2C7.84%20v%2039.11%20c%200%2C16.57%209.37%2C24.45%2024.3%2C24.45%2011.4%2C0%2020.74%2C-6.07%2027.75%2C-14.51%20l%20-0.75%2C14.51%20-0.04%2C-0.04%20z%20M%20484.3%2C306.36%20c%200%2C-21.19%20-11.25%2C-29.32%20-31.57%2C-29.32%20-17.92%2C0%20-30.94%2C7.42%20-30.94%2C19.72%200%2C3.67%201.31%2C6.49%203.97%2C8.44%20l%2013.65%2C-1.8%20c%20-0.6%2C-4.12%20-0.9%2C-6.64%20-0.9%2C-7.69%200%2C-6.97%203.71%2C-10.5%2011.25%2C-10.5%2011.14%2C0%2016.76%2C7.84%2016.76%2C20.44%20v%204.12%20l%20-28.12%2C8.44%20c%20-9.37%2C2.55%20-14.7%2C4.76%20-18.26%2C9.94%20-1.89%2C3.17%20-2.8%2C6.82%20-2.62%2C10.5%200%2C12%208.25%2C20.47%2022.35%2C20.47%2010.2%2C0%2019.24%2C-4.61%2027.11%2C-13.35%202.81%2C8.74%207.12%2C13.35%2014.81%2C13.35%206.22%2C0%2011.85%2C-2.51%2016.87%2C-7.42%20l%20-1.5%2C-5.17%20c%20-2.17%2C0.6%20-4.27%2C0.9%20-6.49%2C0.9%20-4.31%2C0%20-6.37%2C-3.41%20-6.37%2C-10.09%20v%20-30.97%20z%20m%20-36%2C40.76%20c%20-7.69%2C0%20-12.45%2C-4.46%20-12.45%2C-12.3%200%2C-5.32%202.51%2C-8.44%207.87%2C-10.24%20l%2022.8%2C-7.24%20v%2021.9%20c%20-7.27%2C5.51%20-11.55%2C7.87%20-18.22%2C7.87%20z%20m%20237.36%2C6.82%20v%20-6.67%20l%20-3.86%2C-0.3%20c%20-6.37%2C-0.6%20-7.99%2C-1.91%20-7.99%2C-7.12%20v%20-89.47%20l%200.75%2C-12.75%20h%20-5.36%20l%20-23.7%2C7.12%20v%203.86%20l%2010.5%2C4.87%20v%2029.32%20c%20-5.91%2C-4.05%20-12.98%2C-6.08%20-20.14%2C-5.77%20-23.55%2C0%20-41.92%2C17.92%20-41.92%2C44.74%200%2C22.09%2013.2%2C37.35%2034.95%2C37.35%2011.25%2C0%2021.04%2C-5.47%2027.11%2C-13.95%20l%20-0.75%2C13.95%20h%203.15%20l%2027.26%2C-5.17%20v%200%20z%20m%20-49.35%2C-68.02%20c%2011.25%2C0%2019.69%2C6.52%2019.69%2C18.52%20v%2033.75%20c%20-5.18%2C5.16%20-12.23%2C8%20-19.54%2C7.87%20-16.12%2C0%20-24.3%2C-12.75%20-24.3%2C-29.77%200%2C-19.12%209.34%2C-30.37%2024.15%2C-30.37%20z%20M%20743.3%2C302.8%20c%20-2.1%2C-9.9%20-8.17%2C-15.52%20-16.61%2C-15.52%20-12.6%2C0%20-21.34%2C9.49%20-21.34%2C23.1%200%2C20.14%2010.65%2C33.19%2027.86%2C33.19%2011.48%2C-0.12%2022.04%2C-6.33%2027.71%2C-16.31%20l%205.02%2C1.35%20c%20-2.25%2C17.47%20-18.07%2C30.52%20-37.5%2C30.52%20-22.8%2C0%20-38.51%2C-16.87%20-38.51%2C-40.87%200%2C-24%2017.06%2C-41.21%2039.86%2C-41.21%2017.02%2C0%2029.02%2C10.24%2032.89%2C28.01%20l%20-59.4%2C18.22%20v%20-8.02%20l%2040.01%2C-12.41%20v%20-0.04%20z'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E\") center / contain no-repeat;",
      "  mask: url(\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'177.76%2014.09%20512.22%20121.54'%3E%3Cg%20transform%3D'translate(-75.96%2C-223.53)'%3E%3Cpath%20d%3D'm%20317.73%2C349.33%20c%20-18.82%2C0%20-31.69%2C-10.5%20-37.76%2C-26.66%20-3.17%2C-8.42%20-4.74%2C-17.36%20-4.61%2C-26.36%200%2C-27.11%2012.15%2C-45.94%2039%2C-45.94%2018.04%2C0%2029.17%2C7.87%2035.51%2C26.66%20h%207.72%20l%20-1.05%2C-25.91%20c%20-10.8%2C-6.97%20-24.3%2C-10.5%20-40.72%2C-10.5%20-23.14%2C0%20-42.82%2C10.35%20-53.77%2C29.02%20-5.66%2C9.86%20-8.53%2C21.07%20-8.32%2C32.44%200%2C20.74%209.79%2C39.11%2028.16%2C49.31%2010.06%2C5.37%2021.34%2C8.04%2032.74%2C7.72%2017.92%2C0%2032.14%2C-3.41%2044.74%2C-9.37%20l%203.26%2C-28.57%20h%20-7.87%20c%20-4.72%2C13.05%20-10.35%2C20.89%20-19.69%2C25.05%20-4.57%2C2.06%20-10.35%2C3.11%20-17.32%2C3.11%20z%20m%2081.18%2C-98.96%200.75%2C-12.75%20h%20-5.32%20l%20-23.7%2C7.12%20v%203.86%20l%2010.5%2C4.87%20v%2089.17%20c%200%2C6.07%20-3.11%2C7.42%20-11.25%2C8.44%20v%206.52%20h%2040.31%20v%20-6.52%20c%20-8.17%2C-1.01%20-11.25%2C-2.36%20-11.25%2C-8.44%20V%20250.4%20l%20-0.04%2C-0.04%20z%20m%20160.31%2C108.75%20h%203.11%20l%2027.26%2C-5.17%20v%20-6.67%20l%20-3.82%2C-0.3%20c%20-6.37%2C-0.6%20-8.02%2C-1.91%20-8.02%2C-7.12%20v%20-47.55%20l%200.75%2C-15.26%20h%20-4.31%20l%20-25.76%2C3.71%20v%206.52%20l%202.51%2C0.45%20c%206.97%2C1.01%209.04%2C2.96%209.04%2C7.84%20v%2042.37%20c%20-6.67%2C5.17%20-13.05%2C8.44%20-20.62%2C8.44%20-8.4%2C0%20-13.61%2C-4.27%20-13.61%2C-14.25%20v%20-39.79%20l%200.75%2C-15.26%20h%20-4.42%20l%20-25.8%2C3.71%20v%206.52%20l%202.66%2C0.45%20c%206.97%2C1.01%209.04%2C2.96%209.04%2C7.84%20v%2039.11%20c%200%2C16.57%209.37%2C24.45%2024.3%2C24.45%2011.4%2C0%2020.74%2C-6.07%2027.75%2C-14.51%20l%20-0.75%2C14.51%20-0.04%2C-0.04%20z%20M%20484.3%2C306.36%20c%200%2C-21.19%20-11.25%2C-29.32%20-31.57%2C-29.32%20-17.92%2C0%20-30.94%2C7.42%20-30.94%2C19.72%200%2C3.67%201.31%2C6.49%203.97%2C8.44%20l%2013.65%2C-1.8%20c%20-0.6%2C-4.12%20-0.9%2C-6.64%20-0.9%2C-7.69%200%2C-6.97%203.71%2C-10.5%2011.25%2C-10.5%2011.14%2C0%2016.76%2C7.84%2016.76%2C20.44%20v%204.12%20l%20-28.12%2C8.44%20c%20-9.37%2C2.55%20-14.7%2C4.76%20-18.26%2C9.94%20-1.89%2C3.17%20-2.8%2C6.82%20-2.62%2C10.5%200%2C12%208.25%2C20.47%2022.35%2C20.47%2010.2%2C0%2019.24%2C-4.61%2027.11%2C-13.35%202.81%2C8.74%207.12%2C13.35%2014.81%2C13.35%206.22%2C0%2011.85%2C-2.51%2016.87%2C-7.42%20l%20-1.5%2C-5.17%20c%20-2.17%2C0.6%20-4.27%2C0.9%20-6.49%2C0.9%20-4.31%2C0%20-6.37%2C-3.41%20-6.37%2C-10.09%20v%20-30.97%20z%20m%20-36%2C40.76%20c%20-7.69%2C0%20-12.45%2C-4.46%20-12.45%2C-12.3%200%2C-5.32%202.51%2C-8.44%207.87%2C-10.24%20l%2022.8%2C-7.24%20v%2021.9%20c%20-7.27%2C5.51%20-11.55%2C7.87%20-18.22%2C7.87%20z%20m%20237.36%2C6.82%20v%20-6.67%20l%20-3.86%2C-0.3%20c%20-6.37%2C-0.6%20-7.99%2C-1.91%20-7.99%2C-7.12%20v%20-89.47%20l%200.75%2C-12.75%20h%20-5.36%20l%20-23.7%2C7.12%20v%203.86%20l%2010.5%2C4.87%20v%2029.32%20c%20-5.91%2C-4.05%20-12.98%2C-6.08%20-20.14%2C-5.77%20-23.55%2C0%20-41.92%2C17.92%20-41.92%2C44.74%200%2C22.09%2013.2%2C37.35%2034.95%2C37.35%2011.25%2C0%2021.04%2C-5.47%2027.11%2C-13.95%20l%20-0.75%2C13.95%20h%203.15%20l%2027.26%2C-5.17%20v%200%20z%20m%20-49.35%2C-68.02%20c%2011.25%2C0%2019.69%2C6.52%2019.69%2C18.52%20v%2033.75%20c%20-5.18%2C5.16%20-12.23%2C8%20-19.54%2C7.87%20-16.12%2C0%20-24.3%2C-12.75%20-24.3%2C-29.77%200%2C-19.12%209.34%2C-30.37%2024.15%2C-30.37%20z%20M%20743.3%2C302.8%20c%20-2.1%2C-9.9%20-8.17%2C-15.52%20-16.61%2C-15.52%20-12.6%2C0%20-21.34%2C9.49%20-21.34%2C23.1%200%2C20.14%2010.65%2C33.19%2027.86%2C33.19%2011.48%2C-0.12%2022.04%2C-6.33%2027.71%2C-16.31%20l%205.02%2C1.35%20c%20-2.25%2C17.47%20-18.07%2C30.52%20-37.5%2C30.52%20-22.8%2C0%20-38.51%2C-16.87%20-38.51%2C-40.87%200%2C-24%2017.06%2C-41.21%2039.86%2C-41.21%2017.02%2C0%2029.02%2C10.24%2032.89%2C28.01%20l%20-59.4%2C18.22%20v%20-8.02%20l%2040.01%2C-12.41%20v%20-0.04%20z'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E\") center / contain no-repeat;",
      "}",
      "",
      "/* Anthropic (alternate): the A\\ lockup + the ANTHROPIC wordmark. */",
      "body[data-dsh-claude-style][data-dsh-claude-brand=\"anthropic\"] :is([class*=\"brandMark\"], [class*=\"railMark\"])::before {",
      "  width: 25.9px;",
      "  height: 18px;",
      "  -webkit-mask: url(\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2046%2032'%3E%3Cpath%20d%3D'M32.73%200H25.7846L38.4499%2032H45.3953L32.73%200Z'%2F%3E%3Cpath%20d%3D'M12.6653%200L0%2032H7.08167L9.67193%2025.28H22.9219L25.5122%2032H32.5939L19.9286%200H12.6653ZM11.9626%2019.3371L16.2969%208.09143L20.6313%2019.3371H11.9626Z'%2F%3E%3C%2Fsvg%3E\") center / contain no-repeat;",
      "  mask: url(\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2046%2032'%3E%3Cpath%20d%3D'M32.73%200H25.7846L38.4499%2032H45.3953L32.73%200Z'%2F%3E%3Cpath%20d%3D'M12.6653%200L0%2032H7.08167L9.67193%2025.28H22.9219L25.5122%2032H32.5939L19.9286%200H12.6653ZM11.9626%2019.3371L16.2969%208.09143L20.6313%2019.3371H11.9626Z'%2F%3E%3C%2Fsvg%3E\") center / contain no-repeat;",
      "}",
      "",
      "body[data-dsh-claude-style][data-dsh-claude-brand=\"anthropic\"] [class*=\"brandIdentity\"] > [class*=\"brandName\"]::before {",
      "  width: 160.9px;",
      "  max-width: 100%;",
      "  height: 18px;",
      "  -webkit-mask: url(\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20143%2016'%3E%3Cpath%20transform%3D'translate(18.299999237060547%2C0.27000001072883606)'%20d%3D'%20M10.716191291809082%2C10.829001426696777%20C10.716191291809082%2C10.829001426696777%203.756195545196533%2C0%203.756195545196533%2C0%20C3.756195545196533%2C0%200%2C0%200%2C0%20C0%2C0%200%2C15.470022201538086%200%2C15.470022201538086%20C0%2C15.470022201538086%203.2038140296936035%2C15.470022201538086%203.2038140296936035%2C15.470022201538086%20C3.2038140296936035%2C15.470022201538086%203.2038140296936035%2C4.6410064697265625%203.2038140296936035%2C4.6410064697265625%20C3.2038140296936035%2C4.6410064697265625%2010.163809776306152%2C15.470022201538086%2010.163809776306152%2C15.470022201538086%20C10.163809776306152%2C15.470022201538086%2013.919991493225098%2C15.470022201538086%2013.919991493225098%2C15.470022201538086%20C13.919991493225098%2C15.470022201538086%2013.919991493225098%2C0%2013.919991493225098%2C0%20C13.919991493225098%2C0%2010.716191291809082%2C0%2010.716191291809082%2C0%20C10.716191291809082%2C0%2010.716191291809082%2C10.829001426696777%2010.716191291809082%2C10.829001426696777%20C10.716191291809082%2C10.829001426696777%2010.716191291809082%2C10.829001426696777%2010.716191291809082%2C10.829001426696777z'%2F%3E%3Cpath%20transform%3D'translate(34.869998931884766%2C0.27000001072883606)'%20d%3D'%20M0%2C2.983504056930542%20C0%2C2.983504056930542%205.19273567199707%2C2.983504056930542%205.19273567199707%2C2.983504056930542%20C5.19273567199707%2C2.983504056930542%205.19273567199707%2C15.470022201538086%205.19273567199707%2C15.470022201538086%20C5.19273567199707%2C15.470022201538086%208.507256507873535%2C15.470022201538086%208.507256507873535%2C15.470022201538086%20C8.507256507873535%2C15.470022201538086%208.507256507873535%2C2.983504056930542%208.507256507873535%2C2.983504056930542%20C8.507256507873535%2C2.983504056930542%2013.700006484985352%2C2.983504056930542%2013.700006484985352%2C2.983504056930542%20C13.700006484985352%2C2.983504056930542%2013.700006484985352%2C0%2013.700006484985352%2C0%20C13.700006484985352%2C0%200%2C0%200%2C0%20C0%2C0%200%2C2.983504056930542%200%2C2.983504056930542%20C0%2C2.983504056930542%200%2C2.983504056930542%200%2C2.983504056930542z'%2F%3E%3Cpath%20transform%3D'translate(51.22999954223633%2C0.27000001072883606)'%20d%3D'%20M10.605714797973633%2C6.165900230407715%20C10.605714797973633%2C6.165900230407715%203.3142902851104736%2C6.165900230407715%203.3142902851104736%2C6.165900230407715%20C3.3142902851104736%2C6.165900230407715%203.3142902851104736%2C0%203.3142902851104736%2C0%20C3.3142902851104736%2C0%200%2C0%200%2C0%20C0%2C0%200%2C15.470022201538086%200%2C15.470022201538086%20C0%2C15.470022201538086%203.3142902851104736%2C15.470022201538086%203.3142902851104736%2C15.470022201538086%20C3.3142902851104736%2C15.470022201538086%203.3142902851104736%2C9.149404525756836%203.3142902851104736%2C9.149404525756836%20C3.3142902851104736%2C9.149404525756836%2010.605714797973633%2C9.149404525756836%2010.605714797973633%2C9.149404525756836%20C10.605714797973633%2C9.149404525756836%2010.605714797973633%2C15.470022201538086%2010.605714797973633%2C15.470022201538086%20C10.605714797973633%2C15.470022201538086%2013.919991493225098%2C15.470022201538086%2013.919991493225098%2C15.470022201538086%20C13.919991493225098%2C15.470022201538086%2013.919991493225098%2C0%2013.919991493225098%2C0%20C13.919991493225098%2C0%2010.605714797973633%2C0%2010.605714797973633%2C0%20C10.605714797973633%2C0%2010.605714797973633%2C6.165900230407715%2010.605714797973633%2C6.165900230407715%20C10.605714797973633%2C6.165900230407715%2010.605714797973633%2C6.165900230407715%2010.605714797973633%2C6.165900230407715z'%2F%3E%3Cpath%20transform%3D'translate(69.23999786376953%2C0.27000001072883606)'%20d%3D'%20M3.3151700496673584%2C2.983504056930542%20C3.3151700496673584%2C2.983504056930542%207.403865814208984%2C2.983504056930542%207.403865814208984%2C2.983504056930542%20C9.03934097290039%2C2.983504056930542%209.901290893554688%2C3.5801939964294434%209.901290893554688%2C4.707304000854492%20C9.901290893554688%2C5.834399700164795%209.03934097290039%2C6.431103706359863%207.403865814208984%2C6.431103706359863%20C7.403865814208984%2C6.431103706359863%203.3151700496673584%2C6.431103706359863%203.3151700496673584%2C6.431103706359863%20C3.3151700496673584%2C6.431103706359863%203.3151700496673584%2C2.983504056930542%203.3151700496673584%2C2.983504056930542%20C3.3151700496673584%2C2.983504056930542%203.3151700496673584%2C2.983504056930542%203.3151700496673584%2C2.983504056930542z%20M13.216461181640625%2C4.707304000854492%20C13.216461181640625%2C1.7900969982147217%2011.072648048400879%2C0%207.558576583862305%2C0%20C7.558576583862305%2C0%200%2C0%200%2C0%20C0%2C0%200%2C15.470022201538086%200%2C15.470022201538086%20C0%2C15.470022201538086%203.3151700496673584%2C15.470022201538086%203.3151700496673584%2C15.470022201538086%20C3.3151700496673584%2C15.470022201538086%203.3151700496673584%2C9.414593696594238%203.3151700496673584%2C9.414593696594238%20C3.3151700496673584%2C9.414593696594238%207.005825519561768%2C9.414593696594238%207.005825519561768%2C9.414593696594238%20C7.005825519561768%2C9.414593696594238%2010.321218490600586%2C15.470022201538086%2010.321218490600586%2C15.470022201538086%20C10.321218490600586%2C15.470022201538086%2013.990056991577148%2C15.470022201538086%2013.990056991577148%2C15.470022201538086%20C13.990056991577148%2C15.470022201538086%2010.319005966186523%2C8.953378677368164%2010.319005966186523%2C8.953378677368164%20C12.161579132080078%2C8.245061874389648%2013.216461181640625%2C6.753532409667969%2013.216461181640625%2C4.707304000854492%20C13.216461181640625%2C4.707304000854492%2013.216461181640625%2C4.707304000854492%2013.216461181640625%2C4.707304000854492z'%2F%3E%3Cpath%20transform%3D'translate(84.98999786376953%2C0)'%20d%3D'%20M7.622087478637695%2C12.906073570251465%20C5.015110492706299%2C12.906073570251465%203.4244225025177%2C11.049725532531738%203.4244225025177%2C8.022093772888184%20C3.4244225025177%2C4.95027494430542%205.015110492706299%2C3.0939269065856934%207.622087478637695%2C3.0939269065856934%20C10.206976890563965%2C3.0939269065856934%2011.775577545166016%2C4.95027494430542%2011.775577545166016%2C8.022093772888184%20C11.775577545166016%2C11.049725532531738%2010.206976890563965%2C12.906073570251465%207.622087478637695%2C12.906073570251465%20C7.622087478637695%2C12.906073570251465%207.622087478637695%2C12.906073570251465%207.622087478637695%2C12.906073570251465z%20M7.622087478637695%2C0%20C3.1593029499053955%2C0%200%2C3.3149218559265137%200%2C8.022093772888184%20C0%2C12.685078620910645%203.1593029499053955%2C16%207.622087478637695%2C16%20C12.062784194946289%2C16%2015.200028419494629%2C12.685078620910645%2015.200028419494629%2C8.022093772888184%20C15.200028419494629%2C3.3149218559265137%2012.062784194946289%2C0%207.622087478637695%2C0%20C7.622087478637695%2C0%207.622087478637695%2C0%207.622087478637695%2C0z'%2F%3E%3Cpath%20transform%3D'translate(103.29000091552734%2C0.27000001072883606)'%20d%3D'%20M7.405848026275635%2C6.873104095458984%20C7.405848026275635%2C6.873104095458984%203.3160574436187744%2C6.873104095458984%203.3160574436187744%2C6.873104095458984%20C3.3160574436187744%2C6.873104095458984%203.3160574436187744%2C2.983504056930542%203.3160574436187744%2C2.983504056930542%20C3.3160574436187744%2C2.983504056930542%207.405848026275635%2C2.983504056930542%207.405848026275635%2C2.983504056930542%20C9.04176139831543%2C2.983504056930542%209.90394115447998%2C3.646505117416382%209.90394115447998%2C4.928304195404053%20C9.90394115447998%2C6.2101030349731445%209.04176139831543%2C6.873104095458984%207.405848026275635%2C6.873104095458984%20C7.405848026275635%2C6.873104095458984%207.405848026275635%2C6.873104095458984%207.405848026275635%2C6.873104095458984z%20M7.5605998039245605%2C0%20C7.5605998039245605%2C0%200%2C0%200%2C0%20C0%2C0%200%2C15.470022201538086%200%2C15.470022201538086%20C0%2C15.470022201538086%203.3160574436187744%2C15.470022201538086%203.3160574436187744%2C15.470022201538086%20C3.3160574436187744%2C15.470022201538086%203.3160574436187744%2C9.85659408569336%203.3160574436187744%2C9.85659408569336%20C3.3160574436187744%2C9.85659408569336%207.5605998039245605%2C9.85659408569336%207.5605998039245605%2C9.85659408569336%20C11.07561206817627%2C9.85659408569336%2013.219999313354492%2C8.000200271606445%2013.219999313354492%2C4.928304195404053%20C13.219999313354492%2C1.8563942909240723%2011.07561206817627%2C0%207.5605998039245605%2C0%20C7.5605998039245605%2C0%207.5605998039245605%2C0%207.5605998039245605%2C0z'%2F%3E%3Cpath%20transform%3D'translate(128.0399932861328%2C0)'%20d%3D'%20M10.914844512939453%2C10.5414400100708%20C10.340370178222656%2C12.044201850891113%209.191434860229492%2C12.906073570251465%207.622706890106201%2C12.906073570251465%20C5.0155181884765625%2C12.906073570251465%203.4246866703033447%2C11.049725532531738%203.4246866703033447%2C8.022093772888184%20C3.4246866703033447%2C4.95027494430542%205.0155181884765625%2C3.0939269065856934%207.622706890106201%2C3.0939269065856934%20C9.191434860229492%2C3.0939269065856934%2010.340370178222656%2C3.9557981491088867%2010.914844512939453%2C5.458559989929199%20C10.914844512939453%2C5.458559989929199%2014.427860260009766%2C5.458559989929199%2014.427860260009766%2C5.458559989929199%20C13.566211700439453%2C2.1436522006988525%2010.981111526489258%2C0%207.622706890106201%2C0%20C3.1595458984375%2C0%200%2C3.3149218559265137%200%2C8.022093772888184%20C0%2C12.685078620910645%203.1595458984375%2C16%207.622706890106201%2C16%20C11.003214836120605%2C16%2013.588300704956055%2C13.834254264831543%2014.449976921081543%2C10.5414400100708%20C14.449976921081543%2C10.5414400100708%2010.914844512939453%2C10.5414400100708%2010.914844512939453%2C10.5414400100708%20C10.914844512939453%2C10.5414400100708%2010.914844512939453%2C10.5414400100708%2010.914844512939453%2C10.5414400100708z'%2F%3E%3Cpath%20transform%3D'translate(117.83000183105469%2C0.27000001072883606)'%20d%3D'%20M0%2C0%20C0%2C0%206.1677093505859375%2C15.470022201538086%206.1677093505859375%2C15.470022201538086%20C6.1677093505859375%2C15.470022201538086%209.550004005432129%2C15.470022201538086%209.550004005432129%2C15.470022201538086%20C9.550004005432129%2C15.470022201538086%203.382294178009033%2C0%203.382294178009033%2C0%20C3.382294178009033%2C0%200%2C0%200%2C0%20C0%2C0%200%2C0%200%2C0z'%2F%3E%3Cpath%20transform%3D'translate(0%2C0.27000001072883606)'%20d%3D'%20M5.824605464935303%2C9.348296165466309%20C5.824605464935303%2C9.348296165466309%207.93500280380249%2C3.911694288253784%207.93500280380249%2C3.911694288253784%20C7.93500280380249%2C3.911694288253784%2010.045400619506836%2C9.348296165466309%2010.045400619506836%2C9.348296165466309%20C10.045400619506836%2C9.348296165466309%205.824605464935303%2C9.348296165466309%205.824605464935303%2C9.348296165466309%20C5.824605464935303%2C9.348296165466309%205.824605464935303%2C9.348296165466309%205.824605464935303%2C9.348296165466309z%20M6.166755199432373%2C0%20C6.166755199432373%2C0%200%2C15.470022201538086%200%2C15.470022201538086%20C0%2C15.470022201538086%203.4480772018432617%2C15.470022201538086%203.4480772018432617%2C15.470022201538086%20C3.4480772018432617%2C15.470022201538086%204.709278583526611%2C12.22130012512207%204.709278583526611%2C12.22130012512207%20C4.709278583526611%2C12.22130012512207%2011.16093635559082%2C12.22130012512207%2011.16093635559082%2C12.22130012512207%20C11.16093635559082%2C12.22130012512207%2012.421928405761719%2C15.470022201538086%2012.421928405761719%2C15.470022201538086%20C12.421928405761719%2C15.470022201538086%2015.87000560760498%2C15.470022201538086%2015.87000560760498%2C15.470022201538086%20C15.87000560760498%2C15.470022201538086%209.703250885009766%2C0%209.703250885009766%2C0%20C9.703250885009766%2C0%206.166755199432373%2C0%206.166755199432373%2C0%20C6.166755199432373%2C0%206.166755199432373%2C0%206.166755199432373%2C0z'%2F%3E%3C%2Fsvg%3E\") center / contain no-repeat;",
      "  mask: url(\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20143%2016'%3E%3Cpath%20transform%3D'translate(18.299999237060547%2C0.27000001072883606)'%20d%3D'%20M10.716191291809082%2C10.829001426696777%20C10.716191291809082%2C10.829001426696777%203.756195545196533%2C0%203.756195545196533%2C0%20C3.756195545196533%2C0%200%2C0%200%2C0%20C0%2C0%200%2C15.470022201538086%200%2C15.470022201538086%20C0%2C15.470022201538086%203.2038140296936035%2C15.470022201538086%203.2038140296936035%2C15.470022201538086%20C3.2038140296936035%2C15.470022201538086%203.2038140296936035%2C4.6410064697265625%203.2038140296936035%2C4.6410064697265625%20C3.2038140296936035%2C4.6410064697265625%2010.163809776306152%2C15.470022201538086%2010.163809776306152%2C15.470022201538086%20C10.163809776306152%2C15.470022201538086%2013.919991493225098%2C15.470022201538086%2013.919991493225098%2C15.470022201538086%20C13.919991493225098%2C15.470022201538086%2013.919991493225098%2C0%2013.919991493225098%2C0%20C13.919991493225098%2C0%2010.716191291809082%2C0%2010.716191291809082%2C0%20C10.716191291809082%2C0%2010.716191291809082%2C10.829001426696777%2010.716191291809082%2C10.829001426696777%20C10.716191291809082%2C10.829001426696777%2010.716191291809082%2C10.829001426696777%2010.716191291809082%2C10.829001426696777z'%2F%3E%3Cpath%20transform%3D'translate(34.869998931884766%2C0.27000001072883606)'%20d%3D'%20M0%2C2.983504056930542%20C0%2C2.983504056930542%205.19273567199707%2C2.983504056930542%205.19273567199707%2C2.983504056930542%20C5.19273567199707%2C2.983504056930542%205.19273567199707%2C15.470022201538086%205.19273567199707%2C15.470022201538086%20C5.19273567199707%2C15.470022201538086%208.507256507873535%2C15.470022201538086%208.507256507873535%2C15.470022201538086%20C8.507256507873535%2C15.470022201538086%208.507256507873535%2C2.983504056930542%208.507256507873535%2C2.983504056930542%20C8.507256507873535%2C2.983504056930542%2013.700006484985352%2C2.983504056930542%2013.700006484985352%2C2.983504056930542%20C13.700006484985352%2C2.983504056930542%2013.700006484985352%2C0%2013.700006484985352%2C0%20C13.700006484985352%2C0%200%2C0%200%2C0%20C0%2C0%200%2C2.983504056930542%200%2C2.983504056930542%20C0%2C2.983504056930542%200%2C2.983504056930542%200%2C2.983504056930542z'%2F%3E%3Cpath%20transform%3D'translate(51.22999954223633%2C0.27000001072883606)'%20d%3D'%20M10.605714797973633%2C6.165900230407715%20C10.605714797973633%2C6.165900230407715%203.3142902851104736%2C6.165900230407715%203.3142902851104736%2C6.165900230407715%20C3.3142902851104736%2C6.165900230407715%203.3142902851104736%2C0%203.3142902851104736%2C0%20C3.3142902851104736%2C0%200%2C0%200%2C0%20C0%2C0%200%2C15.470022201538086%200%2C15.470022201538086%20C0%2C15.470022201538086%203.3142902851104736%2C15.470022201538086%203.3142902851104736%2C15.470022201538086%20C3.3142902851104736%2C15.470022201538086%203.3142902851104736%2C9.149404525756836%203.3142902851104736%2C9.149404525756836%20C3.3142902851104736%2C9.149404525756836%2010.605714797973633%2C9.149404525756836%2010.605714797973633%2C9.149404525756836%20C10.605714797973633%2C9.149404525756836%2010.605714797973633%2C15.470022201538086%2010.605714797973633%2C15.470022201538086%20C10.605714797973633%2C15.470022201538086%2013.919991493225098%2C15.470022201538086%2013.919991493225098%2C15.470022201538086%20C13.919991493225098%2C15.470022201538086%2013.919991493225098%2C0%2013.919991493225098%2C0%20C13.919991493225098%2C0%2010.605714797973633%2C0%2010.605714797973633%2C0%20C10.605714797973633%2C0%2010.605714797973633%2C6.165900230407715%2010.605714797973633%2C6.165900230407715%20C10.605714797973633%2C6.165900230407715%2010.605714797973633%2C6.165900230407715%2010.605714797973633%2C6.165900230407715z'%2F%3E%3Cpath%20transform%3D'translate(69.23999786376953%2C0.27000001072883606)'%20d%3D'%20M3.3151700496673584%2C2.983504056930542%20C3.3151700496673584%2C2.983504056930542%207.403865814208984%2C2.983504056930542%207.403865814208984%2C2.983504056930542%20C9.03934097290039%2C2.983504056930542%209.901290893554688%2C3.5801939964294434%209.901290893554688%2C4.707304000854492%20C9.901290893554688%2C5.834399700164795%209.03934097290039%2C6.431103706359863%207.403865814208984%2C6.431103706359863%20C7.403865814208984%2C6.431103706359863%203.3151700496673584%2C6.431103706359863%203.3151700496673584%2C6.431103706359863%20C3.3151700496673584%2C6.431103706359863%203.3151700496673584%2C2.983504056930542%203.3151700496673584%2C2.983504056930542%20C3.3151700496673584%2C2.983504056930542%203.3151700496673584%2C2.983504056930542%203.3151700496673584%2C2.983504056930542z%20M13.216461181640625%2C4.707304000854492%20C13.216461181640625%2C1.7900969982147217%2011.072648048400879%2C0%207.558576583862305%2C0%20C7.558576583862305%2C0%200%2C0%200%2C0%20C0%2C0%200%2C15.470022201538086%200%2C15.470022201538086%20C0%2C15.470022201538086%203.3151700496673584%2C15.470022201538086%203.3151700496673584%2C15.470022201538086%20C3.3151700496673584%2C15.470022201538086%203.3151700496673584%2C9.414593696594238%203.3151700496673584%2C9.414593696594238%20C3.3151700496673584%2C9.414593696594238%207.005825519561768%2C9.414593696594238%207.005825519561768%2C9.414593696594238%20C7.005825519561768%2C9.414593696594238%2010.321218490600586%2C15.470022201538086%2010.321218490600586%2C15.470022201538086%20C10.321218490600586%2C15.470022201538086%2013.990056991577148%2C15.470022201538086%2013.990056991577148%2C15.470022201538086%20C13.990056991577148%2C15.470022201538086%2010.319005966186523%2C8.953378677368164%2010.319005966186523%2C8.953378677368164%20C12.161579132080078%2C8.245061874389648%2013.216461181640625%2C6.753532409667969%2013.216461181640625%2C4.707304000854492%20C13.216461181640625%2C4.707304000854492%2013.216461181640625%2C4.707304000854492%2013.216461181640625%2C4.707304000854492z'%2F%3E%3Cpath%20transform%3D'translate(84.98999786376953%2C0)'%20d%3D'%20M7.622087478637695%2C12.906073570251465%20C5.015110492706299%2C12.906073570251465%203.4244225025177%2C11.049725532531738%203.4244225025177%2C8.022093772888184%20C3.4244225025177%2C4.95027494430542%205.015110492706299%2C3.0939269065856934%207.622087478637695%2C3.0939269065856934%20C10.206976890563965%2C3.0939269065856934%2011.775577545166016%2C4.95027494430542%2011.775577545166016%2C8.022093772888184%20C11.775577545166016%2C11.049725532531738%2010.206976890563965%2C12.906073570251465%207.622087478637695%2C12.906073570251465%20C7.622087478637695%2C12.906073570251465%207.622087478637695%2C12.906073570251465%207.622087478637695%2C12.906073570251465z%20M7.622087478637695%2C0%20C3.1593029499053955%2C0%200%2C3.3149218559265137%200%2C8.022093772888184%20C0%2C12.685078620910645%203.1593029499053955%2C16%207.622087478637695%2C16%20C12.062784194946289%2C16%2015.200028419494629%2C12.685078620910645%2015.200028419494629%2C8.022093772888184%20C15.200028419494629%2C3.3149218559265137%2012.062784194946289%2C0%207.622087478637695%2C0%20C7.622087478637695%2C0%207.622087478637695%2C0%207.622087478637695%2C0z'%2F%3E%3Cpath%20transform%3D'translate(103.29000091552734%2C0.27000001072883606)'%20d%3D'%20M7.405848026275635%2C6.873104095458984%20C7.405848026275635%2C6.873104095458984%203.3160574436187744%2C6.873104095458984%203.3160574436187744%2C6.873104095458984%20C3.3160574436187744%2C6.873104095458984%203.3160574436187744%2C2.983504056930542%203.3160574436187744%2C2.983504056930542%20C3.3160574436187744%2C2.983504056930542%207.405848026275635%2C2.983504056930542%207.405848026275635%2C2.983504056930542%20C9.04176139831543%2C2.983504056930542%209.90394115447998%2C3.646505117416382%209.90394115447998%2C4.928304195404053%20C9.90394115447998%2C6.2101030349731445%209.04176139831543%2C6.873104095458984%207.405848026275635%2C6.873104095458984%20C7.405848026275635%2C6.873104095458984%207.405848026275635%2C6.873104095458984%207.405848026275635%2C6.873104095458984z%20M7.5605998039245605%2C0%20C7.5605998039245605%2C0%200%2C0%200%2C0%20C0%2C0%200%2C15.470022201538086%200%2C15.470022201538086%20C0%2C15.470022201538086%203.3160574436187744%2C15.470022201538086%203.3160574436187744%2C15.470022201538086%20C3.3160574436187744%2C15.470022201538086%203.3160574436187744%2C9.85659408569336%203.3160574436187744%2C9.85659408569336%20C3.3160574436187744%2C9.85659408569336%207.5605998039245605%2C9.85659408569336%207.5605998039245605%2C9.85659408569336%20C11.07561206817627%2C9.85659408569336%2013.219999313354492%2C8.000200271606445%2013.219999313354492%2C4.928304195404053%20C13.219999313354492%2C1.8563942909240723%2011.07561206817627%2C0%207.5605998039245605%2C0%20C7.5605998039245605%2C0%207.5605998039245605%2C0%207.5605998039245605%2C0z'%2F%3E%3Cpath%20transform%3D'translate(128.0399932861328%2C0)'%20d%3D'%20M10.914844512939453%2C10.5414400100708%20C10.340370178222656%2C12.044201850891113%209.191434860229492%2C12.906073570251465%207.622706890106201%2C12.906073570251465%20C5.0155181884765625%2C12.906073570251465%203.4246866703033447%2C11.049725532531738%203.4246866703033447%2C8.022093772888184%20C3.4246866703033447%2C4.95027494430542%205.0155181884765625%2C3.0939269065856934%207.622706890106201%2C3.0939269065856934%20C9.191434860229492%2C3.0939269065856934%2010.340370178222656%2C3.9557981491088867%2010.914844512939453%2C5.458559989929199%20C10.914844512939453%2C5.458559989929199%2014.427860260009766%2C5.458559989929199%2014.427860260009766%2C5.458559989929199%20C13.566211700439453%2C2.1436522006988525%2010.981111526489258%2C0%207.622706890106201%2C0%20C3.1595458984375%2C0%200%2C3.3149218559265137%200%2C8.022093772888184%20C0%2C12.685078620910645%203.1595458984375%2C16%207.622706890106201%2C16%20C11.003214836120605%2C16%2013.588300704956055%2C13.834254264831543%2014.449976921081543%2C10.5414400100708%20C14.449976921081543%2C10.5414400100708%2010.914844512939453%2C10.5414400100708%2010.914844512939453%2C10.5414400100708%20C10.914844512939453%2C10.5414400100708%2010.914844512939453%2C10.5414400100708%2010.914844512939453%2C10.5414400100708z'%2F%3E%3Cpath%20transform%3D'translate(117.83000183105469%2C0.27000001072883606)'%20d%3D'%20M0%2C0%20C0%2C0%206.1677093505859375%2C15.470022201538086%206.1677093505859375%2C15.470022201538086%20C6.1677093505859375%2C15.470022201538086%209.550004005432129%2C15.470022201538086%209.550004005432129%2C15.470022201538086%20C9.550004005432129%2C15.470022201538086%203.382294178009033%2C0%203.382294178009033%2C0%20C3.382294178009033%2C0%200%2C0%200%2C0%20C0%2C0%200%2C0%200%2C0z'%2F%3E%3Cpath%20transform%3D'translate(0%2C0.27000001072883606)'%20d%3D'%20M5.824605464935303%2C9.348296165466309%20C5.824605464935303%2C9.348296165466309%207.93500280380249%2C3.911694288253784%207.93500280380249%2C3.911694288253784%20C7.93500280380249%2C3.911694288253784%2010.045400619506836%2C9.348296165466309%2010.045400619506836%2C9.348296165466309%20C10.045400619506836%2C9.348296165466309%205.824605464935303%2C9.348296165466309%205.824605464935303%2C9.348296165466309%20C5.824605464935303%2C9.348296165466309%205.824605464935303%2C9.348296165466309%205.824605464935303%2C9.348296165466309z%20M6.166755199432373%2C0%20C6.166755199432373%2C0%200%2C15.470022201538086%200%2C15.470022201538086%20C0%2C15.470022201538086%203.4480772018432617%2C15.470022201538086%203.4480772018432617%2C15.470022201538086%20C3.4480772018432617%2C15.470022201538086%204.709278583526611%2C12.22130012512207%204.709278583526611%2C12.22130012512207%20C4.709278583526611%2C12.22130012512207%2011.16093635559082%2C12.22130012512207%2011.16093635559082%2C12.22130012512207%20C11.16093635559082%2C12.22130012512207%2012.421928405761719%2C15.470022201538086%2012.421928405761719%2C15.470022201538086%20C12.421928405761719%2C15.470022201538086%2015.87000560760498%2C15.470022201538086%2015.87000560760498%2C15.470022201538086%20C15.87000560760498%2C15.470022201538086%209.703250885009766%2C0%209.703250885009766%2C0%20C9.703250885009766%2C0%206.166755199432373%2C0%206.166755199432373%2C0%20C6.166755199432373%2C0%206.166755199432373%2C0%206.166755199432373%2C0z'%2F%3E%3C%2Fsvg%3E\") center / contain no-repeat;",
      "}",
      "",
      "/* ---------- Claude Code layout: new session button ---------- */",
      "/* Narrow height matching conversation row, persistent hover plate, left-aligned plus icon */",
      "body[data-dsh-claude-style] button[class*=\"newSession\"] {",
      "  display: flex !important;",
      "  align-items: center !important;",
      "  justify-content: flex-start !important;",
      "  text-align: left !important;",
      "  width: 100% !important;",
      "  box-sizing: border-box !important;",
      "  height: 28px !important;",
      "  line-height: 28px !important;",
      "  padding: 0 8px !important;",
      "  margin: 0 0 6px 0 !important;",
      "  border: none !important;",
      "  border-radius: 6px !important;",
      "  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;",
      "  color: var(--dsw-alias-label-primary, #141413) !important;",
      "  font-family: var(--dsw-font-family) !important;",
      "  font-size: 13px !important;",
      "  font-weight: 500 !important;",
      "  cursor: pointer !important;",
      "  box-shadow: none !important;",
      "  transition: background-color 0.12s ease !important;",
      "}",
      "body[data-dsh-claude-style] button[class*=\"newSession\"]:hover {",
      "  background: rgba(0, 0, 0, 0.12) !important;",
      "}",
      "body[data-dsh-claude-style][data-ds-dark-theme] button[class*=\"newSession\"] {",
      "  color: #f5f4ef !important;",
      "}",
      "body[data-dsh-claude-style][data-ds-dark-theme] button[class*=\"newSession\"]:hover {",
      "  background: rgba(255, 255, 255, 0.12) !important;",
      "}",
      "body[data-dsh-claude-style] button[class*=\"newSession\"] svg {",
      "  display: none !important;",
      "}",
      "body[data-dsh-claude-style] button[class*=\"newSession\"]::before {",
      "  content: \"\";",
      "  display: inline-block !important;",
      "  width: 13px !important;",
      "  height: 13px !important;",
      "  margin-right: 6px !important;",
      "  flex: none !important;",
      "  background-color: currentColor !important;",
      "  -webkit-mask: url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><line x1='12' y1='5' x2='12' y2='19'></line><line x1='5' y1='12' x2='19' y2='12'></line></svg>\") center / contain no-repeat !important;",
      "  mask: url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><line x1='12' y1='5' x2='12' y2='19'></line><line x1='5' y1='12' x2='19' y2='12'></line></svg>\") center / contain no-repeat !important;",
      "}",
      "",
      "/* ---------- Claude Code layout: workspace & session sidebar ---------- */",
      "/* 1. Typography: Anthropic Sans and compact font sizes */",
      "body[data-dsh-claude-style] :is([data-pane=\"sidebar\"], [class*=\"sidebarCol\"], [class*=\"treeBody\"], [role=\"tree\"]) :is([class*=\"title\"], [class*=\"projectText\"], [class*=\"sectionLabel\"], [class*=\"sessionRow\"], [class*=\"projectRow\"], [class*=\"time\"]) {",
      "  font-family: var(--dsw-font-family) !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"projectRow\"] [class*=\"title\"] {",
      "  font-size: 13px !important;",
      "  line-height: 18px !important;",
      "  letter-spacing: normal !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"sessionRow\"] [class*=\"title\"] {",
      "  font-size: 13px !important;",
      "  line-height: 18px !important;",
      "  letter-spacing: normal !important;",
      "  color: var(--dsw-alias-label-secondary, #787672) !important;",
      "  transition: color 0.12s ease !important;",
      "}",
      "body[data-dsh-claude-style][data-ds-dark-theme] [class*=\"sessionRow\"] [class*=\"title\"] {",
      "  color: #8c8983 !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"sessionRow\"]:is(:hover, [class*=\"selected\"], [class*=\"active\"], [class*=\"menuOpen\"], [aria-selected=\"true\"], [data-selected=\"true\"]) [class*=\"title\"] {",
      "  color: var(--dsw-alias-label-primary, #141413) !important;",
      "}",
      "body[data-dsh-claude-style][data-ds-dark-theme] [class*=\"sessionRow\"]:is(:hover, [class*=\"selected\"], [class*=\"active\"], [class*=\"menuOpen\"], [aria-selected=\"true\"], [data-selected=\"true\"]) [class*=\"title\"] {",
      "  color: #f5f4ef !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"sessionRow\"] [class*=\"time\"] {",
      "  font-size: 11px !important;",
      "  line-height: 16px !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"sectionLabel\"] {",
      "  font-size: 12px !important;",
      "  line-height: 16px !important;",
      "}",
      "",
      "/* 2. Compact scale: shrunken heights, margins, and paddings */",
      "body[data-dsh-claude-style] [class*=\"projectRow\"] {",
      "  height: 28px !important;",
      "  min-height: 28px !important;",
      "  padding: 0 6px !important;",
      "  gap: 4px !important;",
      "  border-radius: 6px !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"sessionRow\"] {",
      "  height: 28px !important;",
      "  min-height: 28px !important;",
      "  padding: 0 6px !important;",
      "  gap: 0 !important;",
      "  border-radius: 6px !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"sessionRow\"] [class*=\"title\"] {",
      "  margin: 0 4px !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"groupSection\"] > * + * {",
      "  margin-top: 1px !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"groupSection\"] + [class*=\"groupSection\"] {",
      "  margin-top: 6px !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"projectRow\"] [class*=\"rowActions\"],",
      "body[data-dsh-claude-style] [class*=\"sessionRow\"] [class*=\"rowActions\"] {",
      "  gap: 6px !important;",
      "}",
      "body[data-dsh-claude-style] :is([class*=\"projectRow\"], [class*=\"sessionRow\"]) [class*=\"iconButton\"] {",
      "  width: 16px !important;",
      "  height: 16px !important;",
      "}",
      "",
      "/* 3. Hover & active background: session rows only. A folder row is a heading,",
      "   not a target, so it never takes a hover plate — its hover cue is the label",
      "   darkening (rule 4). This also cancels the shipped",
      "   .projectRow:hover{background:var(--dsw-alias-interactive-bg-hover)}. */",
      "body[data-dsh-claude-style] [class*=\"sessionRow\"]:hover,",
      "body[data-dsh-claude-style] [class*=\"sessionRow\"][class*=\"selected\"],",
      "body[data-dsh-claude-style] [class*=\"sessionRow\"][class*=\"menuOpen\"] {",
      "  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;",
      "}",
      "",
      "body[data-dsh-claude-style] [class*=\"projectRow\"],",
      "body[data-dsh-claude-style] [class*=\"projectRow\"]:hover,",
      "body[data-dsh-claude-style] [class*=\"projectRow\"][class*=\"menuOpen\"],",
      "body[data-dsh-claude-style] [class*=\"projectRow\"][class*=\"selected\"] {",
      "  background: transparent !important;",
      "}",
      "",
      "/* 4. Folder header styling: grey font, remove folder icon, dropdown arrow */",
      "/* Folder text: muted grey */",
      "body[data-dsh-claude-style] [class*=\"projectRow\"] [class*=\"title\"] {",
      "  color: var(--dsw-alias-label-secondary, #787672) !important;",
      "  font-weight: 500 !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"projectRow\"]:hover [class*=\"title\"] {",
      "  color: var(--dsw-alias-label-primary, #141413) !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"projectRow\"] [class*=\"folderActive\"] {",
      "  color: inherit !important;",
      "}",
      "/* Cancel folder icon */",
      "body[data-dsh-claude-style] [class*=\"projectRow\"] [class*=\"folder\"] {",
      "  display: none !important;",
      "}",
      "/* Project row flex layout: Title on the left, dropdown arrow next to title */",
      "body[data-dsh-claude-style] [class*=\"projectRow\"] {",
      "  display: flex !important;",
      "  align-items: center !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"projectRow\"] [class*=\"projectText\"] {",
      "  order: 1 !important;",
      "  flex: 0 0 auto !important;",
      "  margin-right: 2px !important;",
      "}",
      "/* The chevron is a reveal-on-hover affordance, never a resting one. The",
      "   shipped CSS gates it on .projectRow:hover alone, which drops it the moment",
      "   the pointer moves down into the folder's conversation list; :has() on the",
      "   group section widens the trigger to the folder row or any row inside it. */",
      "body[data-dsh-claude-style] [class*=\"projectRow\"] [class*=\"chevron\"] {",
      "  order: 2 !important;",
      "  display: none !important;",
      "  width: 14px !important;",
      "  height: 14px !important;",
      "  align-items: center !important;",
      "  justify-content: center !important;",
      "  color: var(--dsw-alias-label-secondary, #787672) !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"groupSection\"]:has(:is([class*=\"projectRow\"], [class*=\"sessionRow\"]):hover) [class*=\"projectRow\"] [class*=\"chevron\"] {",
      "  display: inline-flex !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"projectRow\"] [class*=\"rowActions\"] {",
      "  order: 3 !important;",
      "  margin-left: auto !important;",
      "}",
      "/* Cancel solid lower triangle, replace with dropdown menu arrow */",
      "body[data-dsh-claude-style] [class*=\"projectRow\"] [class*=\"chevron\"] svg {",
      "  display: none !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"projectRow\"] [class*=\"chevron\"]::after {",
      "  content: \"\";",
      "  display: inline-block;",
      "  width: 12px;",
      "  height: 12px;",
      "  background: currentColor;",
      "  -webkit-mask: url(\"data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27 fill=%27none%27 stroke=%27black%27 stroke-width=%271.5%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M4 6l4 4 4-4%27/%3E%3C/svg%3E\") center / contain no-repeat;",
      "  mask: url(\"data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27 fill=%27none%27 stroke=%27black%27 stroke-width=%271.5%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M4 6l4 4 4-4%27/%3E%3C/svg%3E\") center / contain no-repeat;",
      "  transition: transform 0.15s var(--ds-ease-in-out, ease);",
      "}",
      "body[data-dsh-claude-style] [class*=\"projectRow\"][aria-expanded=\"false\"] [class*=\"chevron\"]::after {",
      "  transform: rotate(-90deg);",
      "}",
      "/* Session status circle indicator (matching Claude style) */",
      "body[data-dsh-claude-style] [class*=\"sessionRow\"] [class*=\"slot\"] {",
      "  width: 14px !important;",
      "  height: 16px !important;",
      "  display: inline-flex !important;",
      "  align-items: center !important;",
      "  justify-content: center !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"sessionRow\"] [class*=\"slot\"]:empty::after {",
      "  content: \"\";",
      "  display: inline-block;",
      "  width: 5px;",
      "  height: 5px;",
      "  border-radius: 50%;",
      "  border: 1.2px solid var(--dsw-alias-label-caption, #a6a094);",
      "  box-sizing: border-box;",
      "}",
      "",
      "/* Session status ongoing indicator: Windows 11 circular progress ring (replaces blue square matrix) */",
      "body[data-dsh-claude-style] svg[data-state=\"ongoing\"] {",
      "  width: 10px !important;",
      "  height: 10px !important;",
      "  box-sizing: border-box !important;",
      "  border-radius: 50% !important;",
      "  border: 1.5px solid rgba(255, 255, 255, 0.18) !important;",
      "  border-top-color: #faf9f5 !important;",
      "  animation: 0.85s linear infinite dsh-claude-win11-spin !important;",
      "  transform-origin: center center !important;",
      "  display: inline-block !important;",
      "  flex: none !important;",
      "  color: transparent !important;",
      "  fill: none !important;",
      "  background: transparent !important;",
      "}",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) svg[data-state=\"ongoing\"] {",
      "  border-color: rgba(20, 20, 19, 0.12) !important;",
      "  border-top-color: #6e6a60 !important;",
      "}",
      "body[data-dsh-claude-style] svg[data-state=\"ongoing\"] * {",
      "  display: none !important;",
      "}",
      "@keyframes dsh-claude-win11-spin {",
      "  0% { transform: rotate(0deg); }",
      "  100% { transform: rotate(360deg); }",
      "}",
      "@media (prefers-reduced-motion: reduce) {",
      "  body[data-dsh-claude-style] svg[data-state=\"ongoing\"] {",
      "    animation: none !important;",
      "  }",
      "}",
      "",
      "/* Turn status: Claude thinking indicator (terracotta accent shimmer) */",
      "body[data-dsh-claude-style] [class*=\"turnStatus\"]:not([class*=\"Clock\"]):not([class*=\"clock\"]) {",
      "  background: linear-gradient(90deg, #d97757 0%, #d97757 40%, #f3b5a3 50%, #d97757 60%, #d97757 100%);",
      "  background-position: 100% 0;",
      "  background-size: 250% 100%;",
      "  -webkit-background-clip: text;",
      "  background-clip: text;",
      "  -webkit-text-fill-color: transparent;",
      "  color: transparent;",
      "  animation: 1.8s linear infinite dsh-claude-turn-status-shimmer;",
      "}",
      "@keyframes dsh-claude-turn-status-shimmer {",
      "  to { background-position: 0 0; }",
      "}",
      "@media (prefers-reduced-motion: reduce) {",
      "  body[data-dsh-claude-style] [class*=\"turnStatus\"]:not([class*=\"Clock\"]):not([class*=\"clock\"]) {",
      "    background-position: 0 0;",
      "    background-size: 100% 100%;",
      "    animation: none;",
      "  }",
      "}",
      "",
      "/* --- 2.4 Custom Components (Segments & Account Popover) --- */",
      "/* ---------- Claude Code layout: permission segments ---------- */",
      "/* The shipped access control is one popup-select button; it is replaced by",
      "   a Read | Edit | Auto segmented control over the same three presets. */",
      "body[data-dsh-claude-style] button[aria-label^=\"访问模式\"],",
      "body[data-dsh-claude-style] button[aria-label^=\"Access mode\"] {",
      "  display: none !important;",
      "}",
      "",
      "body[data-dsh-claude-style] .dsh-claude-segments {",
      "  flex: none;",
      "  align-items: center;",
      "  gap: 2px;",
      "  padding: 2px;",
      "  border-radius: 7px;",
      "  background: var(--dsw-specific-selector);",
      "  display: inline-flex;",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) .dsh-claude-segments {",
      "  background: #f6f6f4;",
      "}",
      "",
      "body[data-dsh-claude-style] .dsh-claude-segment {",
      "  appearance: none;",
      "  margin: 0;",
      "  border: 0;",
      "  cursor: pointer;",
      "  background: transparent;",
      "  color: var(--dsw-alias-label-secondary);",
      "  font: inherit;",
      "  font-size: 14px;",
      "  font-weight: 500;",
      "  line-height: 18px;",
      "  padding: 3px 12px;",
      "  border-radius: 7px;",
      "  transition: background-color .1s, color .1s;",
      "}",
      "",
      "body[data-dsh-claude-style] .dsh-claude-segment:hover:not([data-active]) {",
      "  color: var(--dsw-alias-label-primary);",
      "}",
      "",
      "body[data-dsh-claude-style] .dsh-claude-segment[data-active] {",
      "  color: var(--dsw-alias-label-primary);",
      "  background: var(--dsw-alias-bg-layer-3);",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) .dsh-claude-segment[data-active] {",
      "  background: var(--dsw-alias-bg-overlay);",
      "  box-shadow: 0 1px 2px rgba(20, 20, 19, 0.08);",
      "}",
      "",
      "/* ---------- Claude Code layout: in-conversation permission popover ---------- */",
      "body[data-dsh-claude-style] .dsh-claude-perm-container {",
      "  position: relative !important;",
      "  display: inline-flex !important;",
      "  z-index: 20 !important;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-perm-btn {",
      "  display: inline-flex !important;",
      "  align-items: center !important;",
      "  gap: 4px !important;",
      "  height: 24px !important;",
      "  padding: 0 6px 0 6px !important;",
      "  border-radius: 6px !important;",
      "  border: none !important;",
      "  background: transparent !important;",
      "  color: var(--dsw-alias-label-primary, #141413) !important;",
      "  font-family: var(--dsw-font-family) !important;",
      "  font-size: 13px !important;",
      "  font-weight: 500 !important;",
      "  cursor: pointer !important;",
      "  user-select: none !important;",
      "  transition: background-color 0.12s ease !important;",
      "}",
      "body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-perm-btn {",
      "  color: #faf9f5 !important;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-perm-btn:hover,",
      "body[data-dsh-claude-style] .dsh-claude-perm-btn[data-open=\"true\"] {",
      "  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-perm-chevron {",
      "  width: 12px;",
      "  height: 12px;",
      "  display: inline-flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  color: var(--dsw-alias-label-secondary);",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-perm-chevron::after {",
      "  content: \"\";",
      "  display: inline-block;",
      "  width: 10px;",
      "  height: 10px;",
      "  background: currentColor;",
      "  -webkit-mask: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\") center / contain no-repeat;",
      "  mask: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\") center / contain no-repeat;",
      "  transition: transform 0.15s ease;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-perm-btn[data-open=\"true\"] .dsh-claude-perm-chevron::after {",
      "  transform: rotate(180deg);",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-perm-popover {",
      "  position: fixed !important;",
      "  min-width: 220px !important;",
      "  background: var(--dsw-alias-bg-overlay, #ffffff) !important;",
      "  border: 1px solid var(--dsw-alias-border-l1, #e8e6dc) !important;",
      "  border-radius: 12px !important;",
      "  box-shadow: 0 8px 30px rgba(20, 20, 19, 0.12), 0 2px 8px rgba(20, 20, 19, 0.06) !important;",
      "  padding: 6px !important;",
      "  box-sizing: border-box !important;",
      "  z-index: 99999 !important;",
      "  display: flex !important;",
      "  flex-direction: column !important;",
      "  /* Two-line preset rows (label + description) need air between them: the",
      "     2px gap read as one solid block, so each row is separated by 6px. */",
      "  gap: 6px !important;",
      "  opacity: 0 !important;",
      "  pointer-events: none !important;",
      "  transform: translateY(4px) scale(0.98) !important;",
      "  transform-origin: bottom left !important;",
      "  transition: opacity 0.15s ease, transform 0.15s ease !important;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-perm-popover[data-open=\"true\"] {",
      "  opacity: 1 !important;",
      "  pointer-events: auto !important;",
      "  transform: translateY(0) scale(1) !important;",
      "}",
      "body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-perm-popover {",
      "  background: #1e1e1d !important;",
      "  border-color: #2e2c29 !important;",
      "  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3) !important;",
      "}",
      "",
      "/* ---------- Claude Code layout: account row & floating popover ---------- */",
      "/* footArea positioning with crisp hairline border spanning entire sidebar */",
      "body[data-dsh-claude-style] [class*=\"footArea\"] {",
      "  position: relative !important;",
      "  overflow: visible !important;",
      "  margin: 0 calc(-1 * var(--dsh-sidebar-inline-padding, 12px)) -6px !important;",
      "  padding: 8px var(--dsh-sidebar-inline-padding, 12px) 6px !important;",
      "  border-top: 1px solid var(--dsw-alias-border-l1, #e8e6dc) !important;",
      "  background: transparent !important;",
      "  box-sizing: border-box !important;",
      "}",
      "body[data-dsh-claude-style][data-ds-dark-theme] [class*=\"footArea\"] {",
      "  border-top-color: #2e2c29 !important;",
      "}",
      "",
      "/* Account trigger button in sidebar */",
      "body[data-dsh-claude-style] .dsh-claude-account-btn {",
      "  display: flex !important;",
      "  align-items: center !important;",
      "  width: 100% !important;",
      "  height: 32px !important;",
      "  box-sizing: border-box !important;",
      "  padding: 0 8px !important;",
      "  margin: 0 !important;",
      "  border-radius: 6px !important;",
      "  cursor: pointer !important;",
      "  user-select: none !important;",
      "  background: transparent !important;",
      "  transition: background-color 0.12s ease !important;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-account-btn:hover,",
      "body[data-dsh-claude-style] .dsh-claude-account-btn[data-open=\"true\"] {",
      "  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-account-avatar {",
      "  width: 18px;",
      "  height: 18px;",
      "  background: url(\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2024%2024'%3E%3Cpath%20d%3D'M4.709%2015.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0%2011.784l.055-.352.48-.321.686.06%201.52.103%202.278.158%201.652.097%202.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686%201.908%201.476%202.491%201.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97%202.97%200%2001-.104-.729L6.283.134%206.696%200l.996.134.42.364.62%201.414%201.002%202.229%201.555%203.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286%201.851-.559%202.903-.364%201.942h.212l.243-.242.985-1.306%201.652-2.064.73-.82.85-.904.547-.431h1.033l.76%201.129-.34%201.166-1.064%201.347-.881%201.142-1.264%201.7-.79%201.36.073.11.188-.02%202.856-.606%201.543-.28%201.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061%201.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093%201.068%202.006%201.81%202.509%202.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649%202.345%203.521.122%201.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674%207.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434%201.967-2.18%202.945-1.726%201.845-.414.164-.717-.37.067-.662.401-.589%202.388-3.036%201.44-1.882.93-1.086-.006-.158h-.055L4.132%2018.56l-1.13.146-.487-.456.061-.746.231-.243%201.908-1.312-.006.006z'%20fill%3D'%23D97757'%2F%3E%3C%2Fsvg%3E\") center / contain no-repeat;",
      "  flex: none;",
      "  margin-right: 8px;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-account-label {",
      "  flex: 1;",
      "  min-width: 0;",
      "  overflow: hidden;",
      "  text-overflow: ellipsis;",
      "  white-space: nowrap;",
      "  font-size: 13px;",
      "  line-height: 18px;",
      "  font-family: var(--dsw-font-family);",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-account-user {",
      "  font-weight: 500;",
      "  color: var(--dsw-alias-label-primary);",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-account-chevron {",
      "  width: 14px;",
      "  height: 14px;",
      "  flex: none;",
      "  color: var(--dsw-alias-label-secondary);",
      "  display: inline-flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  margin-left: auto;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-account-chevron::after {",
      "  content: \"\";",
      "  display: inline-block;",
      "  width: 12px;",
      "  height: 12px;",
      "  background: currentColor;",
      "  -webkit-mask: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\") center / contain no-repeat;",
      "  mask: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\") center / contain no-repeat;",
      "  transition: transform 0.15s ease;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-account-btn[data-open=\"true\"] .dsh-claude-account-chevron::after {",
      "  transform: rotate(180deg);",
      "}",
      "",
      "/* Floating Popover Container: Adaptive Width */",
      "body[data-dsh-claude-style] .dsh-claude-account-popover {",
      "  position: absolute !important;",
      "  bottom: calc(100% + 4px) !important;",
      "  left: 8px !important;",
      "  right: 8px !important;",
      "  width: auto !important;",
      "  max-width: calc(100% - 16px) !important;",
      "  min-width: 0 !important;",
      "  background: var(--dsw-alias-bg-overlay, #ffffff) !important;",
      "  border: 1px solid var(--dsw-alias-border-l1, #e8e6dc) !important;",
      "  border-radius: 12px !important;",
      "  box-shadow: 0 8px 30px rgba(20, 20, 19, 0.12), 0 2px 8px rgba(20, 20, 19, 0.06) !important;",
      "  padding: 6px !important;",
      "  box-sizing: border-box !important;",
      "  z-index: 1000 !important;",
      "  display: flex !important;",
      "  flex-direction: column !important;",
      "  gap: 2px !important;",
      "  opacity: 0 !important;",
      "  pointer-events: none !important;",
      "  transform: translateY(6px) scale(0.98) !important;",
      "  transform-origin: bottom left !important;",
      "  transition: opacity 0.15s ease, transform 0.15s ease !important;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-account-popover[data-open=\"true\"] {",
      "  opacity: 1 !important;",
      "  pointer-events: auto !important;",
      "  transform: translateY(0) scale(1) !important;",
      "}",
      "body[data-dsh-claude-style][data-ds-dark-theme] .dsh-claude-account-popover {",
      "  background: #1e1e1d !important;",
      "  border-color: #2e2c29 !important;",
      "  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3) !important;",
      "}",
      "/* Hover bridge between trigger and popover */",
      "body[data-dsh-claude-style] .dsh-claude-account-popover::after {",
      "  content: \"\";",
      "  position: absolute;",
      "  top: 100%;",
      "  left: 0;",
      "  right: 0;",
      "  height: 12px;",
      "  background: transparent;",
      "}",
      "",
      "/* Popover Header */",
      "body[data-dsh-claude-style] .dsh-claude-account-popover-header {",
      "  padding: 6px 8px 6px 8px !important;",
      "  display: flex !important;",
      "  flex-direction: column !important;",
      "  gap: 2px !important;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-account-popover-name {",
      "  font-size: 14px !important;",
      "  font-weight: 600 !important;",
      "  color: var(--dsw-alias-label-primary, #141413) !important;",
      "  line-height: 18px !important;",
      "  font-family: var(--dsw-font-family) !important;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-account-popover-divider {",
      "  height: 1px !important;",
      "  background: var(--dsw-alias-border-l1, #e8e6dc) !important;",
      "  margin: 2px 0 4px 0 !important;",
      "  flex: none !important;",
      "}",
      "",
      "/* Popover Body & Items */",
      "body[data-dsh-claude-style] .dsh-claude-account-popover-body {",
      "  display: flex !important;",
      "  flex-direction: column !important;",
      "  gap: 2px !important;",
      "  max-height: 360px !important;",
      "  overflow-y: auto !important;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-popover-item {",
      "  width: 100% !important;",
      "  height: 32px !important;",
      "  min-height: 32px !important;",
      "  padding: 0 8px !important;",
      "  border-radius: 6px !important;",
      "  border: none !important;",
      "  background: transparent !important;",
      "  color: var(--dsw-alias-label-primary, #141413) !important;",
      "  font-size: 13px !important;",
      "  font-weight: 400 !important;",
      "  display: flex !important;",
      "  align-items: center !important;",
      "  justify-content: flex-start !important;",
      "  gap: 8px !important;",
      "  box-shadow: none !important;",
      "  cursor: pointer !important;",
      "  font-family: var(--dsw-font-family) !important;",
      "  transition: background-color 0.12s ease !important;",
      "  box-sizing: border-box !important;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-popover-item:hover {",
      "  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08)) !important;",
      "  color: var(--dsw-alias-label-primary, #141413) !important;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-popover-item-icon {",
      "  display: inline-flex !important;",
      "  align-items: center !important;",
      "  justify-content: center !important;",
      "  width: 16px !important;",
      "  height: 16px !important;",
      "  flex: none !important;",
      "  color: var(--dsw-alias-label-secondary, #787672) !important;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-popover-item-icon svg {",
      "  width: 16px !important;",
      "  height: 16px !important;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-popover-item-text {",
      "  flex: 1 !important;",
      "  min-width: 0 !important;",
      "  overflow: hidden !important;",
      "  text-overflow: ellipsis !important;",
      "  white-space: nowrap !important;",
      "  text-align: left !important;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-popover-item-shortcut {",
      "  margin-left: auto !important;",
      "  font-size: 11px !important;",
      "  color: var(--dsw-alias-label-tertiary, #a6a094) !important;",
      "  font-family: var(--ds-font-family-code, monospace) !important;",
      "  padding-left: 8px !important;",
      "}",
      "body[data-dsh-claude-style] .dsh-claude-popover-item-badge {",
      "  margin-left: auto !important;",
      "  font-size: 10px !important;",
      "  line-height: 14px !important;",
      "  padding: 0 5px !important;",
      "  border-radius: 8px !important;",
      "  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.08)) !important;",
      "  color: var(--dsw-alias-label-secondary, #787672) !important;",
      "}",
      "",
      "/* Ensure popover items only display inside the popover */",
      "body[data-dsh-claude-style] [class*=\"footArea\"] > .dsh-claude-popover-item {",
      "  display: none !important;",
      "}",
      "",
      "/* Hide original trigger buttons in footArea while keeping containers intact for modals */",
      "body[data-dsh-claude-style] [class*=\"footArea\"] > [class*=\"settingsArea\"] > [class*=\"triggerRow\"],",
      "body[data-dsh-claude-style] [class*=\"footArea\"] > [class*=\"footerActions\"] :is([class*=\"footerButtons\"], > button) {",
      "  display: none !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"footArea\"] > [class*=\"settingsArea\"],",
      "body[data-dsh-claude-style] [class*=\"footArea\"] > [class*=\"footerActions\"] {",
      "  position: static !important;",
      "  width: 0 !important;",
      "  height: 0 !important;",
      "  margin: 0 !important;",
      "  padding: 0 !important;",
      "  line-height: 0 !important;",
      "  font-size: 0 !important;",
      "  overflow: visible !important;",
      "}",
      "",
      "/* Generic footer-action redirection. The `sidebar.footer.action` slot accepts",
      "   arbitrary plugin controls, not just buttons; overrides.js marks every",
      "   mirrored entry (`data-dsh-claude-footer-entry`) and hides it in place",
      "   (`data-dsh-claude-footer-hidden`) once it is redirected into the account",
      "   popover. Entries that host a floating overlay (a fixed panel or dialog)",
      "   keep their subtree visible — the overlay must stay reachable after the",
      "   mirrored popover item opens it — but the entry box itself collapses so it",
      "   never paints inside the zero-sized footerActions container. */",
      "body[data-dsh-claude-style] [class*=\"footArea\"] [data-dsh-claude-footer-hidden] {",
      "  display: none !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"footArea\"] [data-dsh-claude-footer-entry] {",
      "  width: 0 !important;",
      "  height: 0 !important;",
      "  min-width: 0 !important;",
      "  min-height: 0 !important;",
      "  margin: 0 !important;",
      "  padding: 0 !important;",
      "  border: none !important;",
      "  background: transparent !important;",
      "  box-shadow: none !important;",
      "  overflow: visible !important;",
      "}",
      "",
      "/* Collapsed rail mode adaptations */",
      "body[data-dsh-claude-style] [class*=\"root\"][class*=\"collapsed\"] .dsh-claude-account-btn {",
      "  width: 36px !important;",
      "  height: 36px !important;",
      "  padding: 0 !important;",
      "  justify-content: center !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"root\"][class*=\"collapsed\"] .dsh-claude-account-avatar {",
      "  margin-right: 0 !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"root\"][class*=\"collapsed\"] :is(.dsh-claude-account-label, .dsh-claude-account-chevron) {",
      "  display: none !important;",
      "}",
      "body[data-dsh-claude-style] [class*=\"root\"][class*=\"collapsed\"] .dsh-claude-account-popover {",
      "  left: calc(100% + 8px) !important;",
      "  bottom: 0 !important;",
      "  right: auto !important;",
      "  width: 220px !important;",
      "  transform-origin: bottom left !important;",
      "}",
      "",
      "/* Embedded footer widgets: display-only plugin entries (progress bars,",
      "   status panels — the cost-meter balance/quota stack is the known case)",
      "   cannot collapse into a text menu item, so overrides.js embeds a live clone",
      "   of the entry into the popover. The embed sits above the action items with",
      "   a hairline separator; the cloned plugin markup keeps its own classes, so",
      "   the plugin's own stylesheet styles the content. */",
      "body[data-dsh-claude-style] .dsh-claude-popover-embed {",
      "  padding: 2px 2px 6px;",
      "  margin-bottom: 4px;",
      "  border-bottom: 1px solid var(--dsw-alias-border-l2, #2e2c29);",
      "  border-radius: 7px;",
      "}",
      "",
      "body[data-dsh-claude-style] .dsh-claude-popover-embed[data-clickable] {",
      "  cursor: pointer;",
      "}",
      "",
      "body[data-dsh-claude-style] .dsh-claude-popover-embed[data-clickable]:hover {",
      "  background: var(--dsh-claude-hover-bg, rgba(0, 0, 0, 0.08));",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) .dsh-claude-popover-embed {",
      "  border-bottom-color: #e8e6dc;",
      "}",
      "",
      "/* ---------- Third-party repair: dsh-agy-link run_code fallback card ---------- */",
      "/* The agy-link bridge replaces the host run_code tool card with its own keyed",
      "   toolview; its non-mirror fallback ships an unstyled header (two bare spans,",
      "   not even a gap) and a bare pre. Give the header the tool-row rhythm, the",
      "   tool name the skin's technical-meta mono voice (overriding the editorial",
      "   serif the `[class*=\"title\"]` rule lends it), the variant label a real",
      "   pill, and the code preview card padding. */",
      "body[data-dsh-claude-style] .agy-tv-header {",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 8px;",
      "  min-height: 24px;",
      "}",
      "body[data-dsh-claude-style] .agy-tv-title {",
      "  font-family: var(--dsw-font-code);",
      "  font-weight: 500;",
      "  font-size: 12px;",
      "  letter-spacing: 0;",
      "  line-height: 24px;",
      "  color: var(--dsw-alias-label-secondary);",
      "}",
      "body[data-dsh-claude-style] .agy-tv-badge {",
      "  font-family: var(--dsw-font-code);",
      "  font-size: 11px;",
      "  line-height: 16px;",
      "  padding: 0 6px;",
      "  border-radius: 9999px;",
      "  background: var(--dsw-alias-interactive-bg-hover);",
      "  color: var(--dsw-alias-label-tertiary);",
      "}",
      "body[data-dsh-claude-style] .agy-tv-pre {",
      "  padding: 10px 12px;",
      "  overflow-x: auto;",
      "}",
      "",
      "/* ---------- Claude Code layout: settings section (brand) ---------- */",
      "/* The skin's own page in the settings dialog. It borrows the composer's",
      "   segment language so the two controls read as one design. */",
      "body[data-dsh-claude-style] .dsh-claude-brand-section {",
      "  display: flex;",
      "  flex-direction: column;",
      "  gap: 16px;",
      "  padding: 20px 24px;",
      "  max-width: 640px;",
      "  box-sizing: border-box;",
      "  font-family: var(--dsw-font-family);",
      "}",
      "",
      "body[data-dsh-claude-style] .dsh-claude-brand-title {",
      "  font-size: 15px;",
      "  font-weight: 600;",
      "  color: var(--dsw-alias-label-primary);",
      "}",
      "",
      "body[data-dsh-claude-style] .dsh-claude-brand-card {",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 12px;",
      "  padding: 12px 14px;",
      "  border: 1px solid var(--dsw-alias-border-l1);",
      "  border-radius: 12px;",
      "}",
      "",
      "body[data-dsh-claude-style] .dsh-claude-brand-card-text {",
      "  flex: 1;",
      "  min-width: 0;",
      "}",
      "",
      "body[data-dsh-claude-style] .dsh-claude-brand-card-title {",
      "  font-size: 13px;",
      "  font-weight: 600;",
      "  line-height: 1.5;",
      "  color: var(--dsw-alias-label-primary);",
      "}",
      "",
      "body[data-dsh-claude-style] .dsh-claude-brand-card-desc {",
      "  margin-top: 4px;",
      "  font-size: 12px;",
      "  line-height: 1.5;",
      "  color: var(--dsw-alias-label-tertiary);",
      "}",
      "",
      "body[data-dsh-claude-style] .dsh-claude-brand-segments {",
      "  flex: none;",
      "  display: inline-flex;",
      "  align-items: center;",
      "  gap: 2px;",
      "  padding: 2px;",
      "  border-radius: 7px;",
      "  background: var(--dsw-specific-selector);",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) .dsh-claude-brand-segments {",
      "  background: #f6f6f4;",
      "}",
      "",
      "body[data-dsh-claude-style] .dsh-claude-brand-option {",
      "  appearance: none;",
      "  margin: 0;",
      "  border: 0;",
      "  cursor: pointer;",
      "  background: transparent;",
      "  color: var(--dsw-alias-label-secondary);",
      "  font: inherit;",
      "  font-size: 13px;",
      "  font-weight: 500;",
      "  line-height: 18px;",
      "  padding: 3px 12px;",
      "  border-radius: 7px;",
      "  transition: background-color .1s, color .1s;",
      "}",
      "",
      "body[data-dsh-claude-style] .dsh-claude-brand-option:hover:not([data-active=\"true\"]) {",
      "  color: var(--dsw-alias-label-primary);",
      "}",
      "",
      "body[data-dsh-claude-style] .dsh-claude-brand-option[data-active=\"true\"] {",
      "  color: var(--dsw-alias-label-primary);",
      "  background: var(--dsw-alias-bg-layer-3);",
      "}",
      "",
      "body[data-dsh-claude-style]:not([data-ds-dark-theme]) .dsh-claude-brand-option[data-active=\"true\"] {",
      "  background: var(--dsw-alias-bg-overlay);",
      "  box-shadow: 0 1px 2px rgba(20, 20, 19, 0.08);",
      "}",
    ].join('\n')

    // ============================================================================
    // Zone 3: 宿主上下文与通用辅助 (DSH Context & Helpers)
    // ============================================================================
    function findAccessTrigger() {
      var prefixes = ['访问模式', 'Access mode']
      var buttons = document.querySelectorAll('button[aria-label]')
      for (var i = 0; i < buttons.length; i++) {
        var label = buttons[i].getAttribute('aria-label') || ''
        for (var j = 0; j < prefixes.length; j++) {
          if (label.indexOf(prefixes[j]) === 0) return buttons[i]
        }
      }
      return null
    }

    /**
     * The current-session selection left the Session Controller in dsh 0.2:
     * the list snapshot no longer carries `current`, and the main-view
     * selection is projected by the `uiSession` service as a binding source
     * whose `value.key` is the selected session id (`undefined` when no
     * session is materialized). Read the new source first and fall back to
     * the legacy `list.current` so older hosts keep working.
     */
    function currentSessionId(ctx, sessions) {
      try {
        var uiSession = ctx.get('uiSession')
        var current = uiSession === void 0 || uiSession === null ? null : uiSession.current
        var value = current === void 0 || current === null ? null : current.value
        if (value !== void 0 && value !== null && typeof value.key === 'string') return value.key
      } catch (error) { /* fall through to the legacy snapshot field */ }
      return sessions.list.getSnapshot().current
    }

    function currentSession(ctx) {
      var sessions = ctx.get('sessions')
      if (sessions === void 0 || sessions === null) return null
      var id = currentSessionId(ctx, sessions)
      if (id === void 0 || id === null) return null
      var binding = sessions.binding(id)
      if (binding === void 0 || binding === null) return null
      return binding.session === void 0 ? null : binding.session
    }

    function currentPreset(session) {
      try {
        var snapshot = session.projections.faceOf('permissions').getSnapshot()
        if (snapshot === void 0 || snapshot === null) return null
        // dsh 0.2+ projection faces hand back the bare value (e.g. the preset
        // id string); older hosts wrapped it as `{ currentValue }`.
        if (typeof snapshot === 'object' && 'currentValue' in snapshot) return snapshot.currentValue
        return snapshot
      } catch (error) {
        return null
      }
    }

    /**
     * Read the persisted brand choice.
     *
     * Storage is the renderer's own localStorage, which DSH backs with the
     * `persist:dsh-desktop-renderer` partition, so the value survives an app
     * restart. Every access is guarded: a locked-down or full store must not
     * break the theme, so an unreadable value simply falls back to the default.
     *
     * @returns one of BRAND_CLAUDE / BRAND_ANTHROPIC.
     */
    function readStoredBrand() {
      try {
        var raw = window.localStorage.getItem(BRAND_STORAGE_KEY)
        if (raw === BRAND_ANTHROPIC) return BRAND_ANTHROPIC
        if (raw === BRAND_CLAUDE) return BRAND_CLAUDE
      } catch (error) {
        /* storage unavailable — fall through to the default */
      }
      return DEFAULT_BRAND
    }

    /** Persist the brand choice, ignoring a store that refuses writes. */
    function writeStoredBrand(brand) {
      try {
        window.localStorage.setItem(BRAND_STORAGE_KEY, brand)
      } catch (error) {
        /* storage unavailable — the session still shows the chosen brand */
      }
    }

    /**
     * Apply a brand to the document. The stylesheet keys off the attribute, so
     * this is the single mutation that repaints the sidebar brand; keeping it to
     * one attribute write is what makes the switch cheap and idempotent.
     *
     * @param brand - the brand to show; unknown values fall back to the default.
     * @returns the brand actually applied.
     */
    function applyBrand(brand) {
      var next = brand === BRAND_ANTHROPIC ? BRAND_ANTHROPIC : BRAND_CLAUDE
      document.body.setAttribute(BRAND_ATTR, next)
      return next
    }

    /**
     * The client context exposes no user or account service, so the account
     * name is inferred from the home-directory segment of a workspace path or
     * a session cwd. Falls back to 'User'.
     */
    function getUsername(ctx) {
      try {
        if (ctx && typeof ctx.get === 'function') {
          var workspaces = ctx.get('workspaces')
          if (workspaces && workspaces.list && typeof workspaces.list.getSnapshot === 'function') {
            var items = workspaces.list.getSnapshot().items || []
            for (var i = 0; i < items.length; i++) {
              var m = (items[i].path || '').match(/[/\\](?:Users|home)[/\\]([^/\\]+)/i)
              if (m && m[1]) return m[1]
            }
          }
          var sessions = ctx.get('sessions')
          if (sessions && sessions.list && typeof sessions.list.getSnapshot === 'function') {
            var byId = sessions.list.getSnapshot().byId || {}
            for (var id in byId) {
              var m2 = (byId[id].cwd || '').match(/[/\\](?:Users|home)[/\\]([^/\\]+)/i)
              if (m2 && m2[1]) return m2[1]
            }
          }
        }
      } catch (e) {}
      return 'User'
    }

    // ============================================================================
    // Zone 4: Claude Code UI 重塑与交互增强 (UI Overrides)
    // ============================================================================
    /**
     * Install the Claude Code surface rewrites: the copy slots (hero headline,
     * composer hint), the permission segmented control, and the account footer.
     * All of them sit in React-rendered trees — the headline and hint re-render
     * on locale switches, the hint unmounts while a draft exists, and the
     * composer re-renders the access trigger on every preset change — so one
     * MutationObserver re-applies them after each render. Every rewrite is
     * idempotent (a node already in the target state is left alone, and the
     * controls are only inserted when absent), so the observer cannot feed
     * itself.
     */
    function installOverrides(ctx) {
      // --- 4.1 Copy Overrides ---
      /** Shipped idle composer hints (zh / en, hero / default) this skin replaces. */
      var HINT_SOURCES = [
        '描述你想要构建的内容',
        '发消息或创建任务',
        'Describe what you want to build',
        'Message or run a task',
        'How can I help you today?',
        'Type / for commands',
      ]

      function rewriteHeadline() {
        var greeting = pickHeroGreeting(getUsername(ctx))
        var groups = document.querySelectorAll('[class*="titleGroup"]')
        for (var i = 0; i < groups.length; i++) {
          var spans = groups[i].children
          for (var j = 0; j < spans.length; j++) {
            var span = spans[j]
            var cls = span.getAttribute('class') || ''
            if (cls.indexOf('previewBadge') !== -1) continue
            if (span.textContent !== greeting) span.textContent = greeting
            break
          }
        }
      }

      function rewriteHint() {
        var isHero = document.querySelector('[class*="heroWorkspaceRow"], [class*="titleGroup"]') !== null
        var targetHint = isHero ? COMPOSER_HINT : 'Type / for commands'
        var hints = document.querySelectorAll('[data-composer-placeholder]')
        for (var i = 0; i < hints.length; i++) {
          var node = hints[i]
          var text = node.textContent || ''
          var idle = false
          for (var j = 0; j < HINT_SOURCES.length; j++) {
            if (text.indexOf(HINT_SOURCES[j]) === 0) {
              idle = true
              break
            }
          }
          if (idle && text !== targetHint) node.textContent = targetHint
        }
      }

      /**
       * Claude Code spinner verbs: picks one random verb per session turn
       * and retains it stably for that turn's thinking duration.
       */
      function pickRandomSpinnerVerb() {
        return SPINNER_VERBS[Math.floor(Math.random() * SPINNER_VERBS.length)] + '...'
      }

      function rewriteTurnStatus() {
        var nodes = document.querySelectorAll('[role="status"][class*="turnStatus"], [class*="turnStatus"]:not([class*="Clock"]):not([class*="clock"])')
        for (var i = 0; i < nodes.length; i++) {
          var el = nodes[i]
          var cls = el.getAttribute('class') || ''
          if (cls.indexOf('Clock') !== -1 || cls.indexOf('clock') !== -1) continue
          var verb = el.getAttribute('data-dsh-spinner-verb')
          if (!verb) {
            verb = pickRandomSpinnerVerb()
            el.setAttribute('data-dsh-spinner-verb', verb)
          }
          for (var j = 0; j < el.childNodes.length; j++) {
            var child = el.childNodes[j]
            if (child.nodeType === Node.TEXT_NODE) {
              if (child.nodeValue !== verb) {
                child.nodeValue = verb
              }
              break
            }
          }
        }
      }

      // --- 4.2 Permission Segments & In-Conversation Popover ---
      var segments = null
      var permContainer = null
      var permBtn = null
      var permLabel = null
      var permPopover = null

      function buildSegments(onPick) {
        var group = document.createElement('div')
        group.className = SEGMENTS_CLASS
        group.setAttribute('role', 'radiogroup')
        group.setAttribute('aria-label', 'Permission')
        for (var i = 0; i < PERMISSION_SEGMENTS.length; i++) {
          var spec = PERMISSION_SEGMENTS[i]
          var item = document.createElement('button')
          item.type = 'button'
          item.className = SEGMENT_CLASS
          item.setAttribute('role', 'radio')
          item.setAttribute('data-preset', spec.preset)
          item.textContent = spec.label
          group.appendChild(item)
        }
        group.addEventListener('click', function (event) {
          var target = event.target
          var item = target !== null && typeof target.closest === 'function' ? target.closest('.' + SEGMENT_CLASS) : null
          if (item === null || !group.contains(item)) return
          onPick(item.getAttribute('data-preset'))
        })
        return group
      }

      var permDocPointerListener = null
      var permResizeListener = null

      /** Every dismiss route (item pick, outside pointer, resize/scroll, Escape) closes the menu through this one path. */
      function closePermMenu() {
        if (permBtn === null || permPopover === null) return
        permBtn.removeAttribute('data-open')
        permBtn.setAttribute('aria-expanded', 'false')
        permPopover.removeAttribute('data-open')
      }

      function buildPermTriggerAndPopover(onPick) {
        var container = document.createElement('div')
        container.className = 'dsh-claude-perm-container'

        var btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'dsh-claude-perm-btn'
        btn.setAttribute('aria-haspopup', 'menu')
        btn.setAttribute('aria-expanded', 'false')

        var label = document.createElement('span')
        label.className = 'dsh-claude-perm-label'
        label.textContent = 'Accept edits'

        var chevron = document.createElement('span')
        chevron.className = 'dsh-claude-perm-chevron'
        chevron.setAttribute('aria-hidden', 'true')

        btn.appendChild(label)
        btn.appendChild(chevron)

        var popover = document.createElement('div')
        popover.className = 'dsh-claude-perm-popover'
        popover.setAttribute('role', 'menu')

        for (var i = 0; i < PERMISSION_OPTIONS.length; i++) {
          var opt = PERMISSION_OPTIONS[i]
          var item = document.createElement('button')
          item.type = 'button'
          item.className = 'dsh-claude-popover-item'
          item.setAttribute('role', 'menuitem')
          item.setAttribute('data-preset', opt.preset)

          var col = document.createElement('div')
          col.style.cssText = 'display:flex; flex-direction:column; gap:2px; flex:1; text-align:left; min-width:0;'

          var itemTitle = document.createElement('span')
          itemTitle.style.cssText = 'font-weight:500; font-size:13px; line-height:16px;'
          itemTitle.textContent = opt.label

          var itemDesc = document.createElement('span')
          itemDesc.style.cssText = 'font-size:11px; line-height:14px; color:var(--dsw-alias-label-tertiary);'
          itemDesc.textContent = opt.desc

          col.appendChild(itemTitle)
          col.appendChild(itemDesc)
          item.appendChild(col)

          var check = document.createElement('span')
          check.className = 'dsh-claude-perm-check'
          check.style.cssText = 'font-size:12px; color:var(--dsw-alias-brand-primary, #d97757); margin-left:8px; display:none;'
          check.textContent = '✓'
          item.appendChild(check)

          item.addEventListener('click', (function (preset) {
            return function (e) {
              e.stopPropagation()
              closePermMenu()
              onPick(preset)
            }
          })(opt.preset))

          popover.appendChild(item)
        }

        function openPerm() {
          var rect = btn.getBoundingClientRect()
          popover.style.left = Math.max(8, rect.left) + 'px'
          popover.style.bottom = Math.max(8, window.innerHeight - rect.top + 6) + 'px'
          btn.setAttribute('data-open', 'true')
          btn.setAttribute('aria-expanded', 'true')
          popover.setAttribute('data-open', 'true')
        }

        btn.addEventListener('click', function (e) {
          e.stopPropagation()
          var isOpen = btn.getAttribute('data-open') === 'true'
          if (isOpen) {
            closePermMenu()
          } else {
            openPerm()
          }
        })

        if (!permDocPointerListener) {
          permDocPointerListener = function (e) {
            if (permPopover && permBtn && permPopover.getAttribute('data-open') === 'true') {
              if (!permBtn.contains(e.target) && !permPopover.contains(e.target)) closePermMenu()
            }
          }
          document.addEventListener('pointerdown', permDocPointerListener)
        }

        if (!permResizeListener) {
          permResizeListener = function () {
            if (permPopover && permBtn && permPopover.getAttribute('data-open') === 'true') closePermMenu()
          }
          window.addEventListener('resize', permResizeListener)
          window.addEventListener('scroll', permResizeListener, true)
        }

        container.appendChild(btn)
        document.body.appendChild(popover)

        return {
          container: container,
          btn: btn,
          label: label,
          popover: popover
        }
      }

      function updatePermState(preset) {
        if (!permLabel || !permPopover) return
        var matchedLabel = 'Accept edits'
        for (var i = 0; i < PERMISSION_OPTIONS.length; i++) {
          if (PERMISSION_OPTIONS[i].preset === preset) {
            matchedLabel = PERMISSION_OPTIONS[i].label
            break
          }
        }
        permLabel.textContent = matchedLabel

        var items = permPopover.querySelectorAll('[data-preset]')
        for (var j = 0; j < items.length; j++) {
          var it = items[j]
          var isCurrent = it.getAttribute('data-preset') === preset
          var check = it.querySelector('.dsh-claude-perm-check')
          if (check) {
            check.style.display = isCurrent ? 'inline' : 'none'
          }
          if (isCurrent) {
            it.setAttribute('data-active', '')
          } else {
            it.removeAttribute('data-active')
          }
        }
      }

      function submitPreset(preset) {
        var session = currentSession(ctx)
        if (session === null) return
        var settled = session.command('/permission ' + preset)
        if (settled !== void 0 && typeof settled.then === 'function') settled.then(schedule, schedule)
      }

      /**
       * Drive the shipped access menu to its full-access row, so the switch
       * runs through the shipped risk-confirmation dialog rather than a
       * skin-owned prompt. The trigger is hidden by this skin but still in
       * the tree, so a synthetic click still opens the menu; the row is then
       * picked by its label. A plain confirm stands in only when that menu
       * cannot be reached, which keeps the switch behind an explicit
       * acknowledgement either way.
       */
      function openShippedGate() {
        var trigger = findAccessTrigger()
        if (trigger === null) {
          if (window.confirm(GATED_PROMPT)) submitPreset(GATED_PRESET)
          return
        }
        trigger.click()
        var attempts = 0
        function seek() {
          var items = document.querySelectorAll('[role="menu"] button[role="menuitem"]')
          for (var i = 0; i < items.length; i++) {
            var text = (items[i].textContent || '').trim()
            for (var j = 0; j < FULL_ACCESS_LABELS.length; j++) {
              if (text === FULL_ACCESS_LABELS[j]) {
                items[i].click()
                return
              }
            }
          }
          attempts += 1
          if (attempts < 20) {
            requestAnimationFrame(seek)
            return
          }
          trigger.click()
          if (window.confirm(GATED_PROMPT)) submitPreset(GATED_PRESET)
        }
        requestAnimationFrame(seek)
      }

      function pick(preset) {
        var session = currentSession(ctx)
        if (session === null || preset === null) return
        if (preset === currentPreset(session)) return
        if (preset === GATED_PRESET) {
          openShippedGate()
          return
        }
        submitPreset(preset)
      }

      function syncAttachmentState() {
        var cards = document.querySelectorAll('[data-composer-card]')
        for (var ci = 0; ci < cards.length; ci++) {
          var card = cards[ci]
          var hasAtt = card.querySelector('._54WpYG_imageItem, [class*="imageItem"], [class*="thumbnail"], [class*="FileCard"], [class*="rail"]:not([class*="trailing"]) [class*="item"], [class*="rail"]:not([class*="trailing"]) img, [class*="rail"]:not([class*="trailing"]) [class*="card"]') !== null
          if (hasAtt) {
            if (card.getAttribute('data-has-attachments') !== 'true') {
              card.setAttribute('data-has-attachments', 'true')
            }
          } else {
            if (card.hasAttribute('data-has-attachments')) {
              card.removeAttribute('data-has-attachments')
            }
          }
        }
      }

      /**
       * Merge the session-stats pills into the composer toolbar row so the
       * controls and the stats share ONE line. The host renders the pills
       * (the `conversation.composer.dock` slot) as the card's sibling — a
       * full-width line of their own below the input box; the skin moves
       * them into the row, right before the trailing model/status group.
       * A host re-render can put them back, so the move is re-applied on
       * every pass and is a no-op once they are in place.
       */
      function mergeStatsIntoRow() {
        var stats = document.querySelector('[data-composer-stats]')
        if (!stats) return
        // `[class*="_row"]`, not `[class*="row"]`: the bare substring also
        // matches the input growth wrapper (`grow` contains `row`).
        var row = null
        if (stats.parentElement && stats.parentElement.matches && stats.parentElement.matches('[class*="_row"]')) {
          row = stats.parentElement
        } else {
          // Host default: the pills sit in a slot anchor beside the card.
          // Walk up to the nearest ancestor that also holds a composer card.
          var node = stats.parentElement
          while (node && node !== document.body && row === null) {
            var card = node.querySelector('[data-composer-card]')
            if (card) {
              var r = card.querySelector('[class*="_row"]')
              if (r) row = r
            }
            node = node.parentElement
          }
        }
        if (row === null) return
        var trailing = row.querySelector('[class*="trailing"]')
        var inPlace = stats.parentElement === row &&
          (trailing !== null ? stats.nextElementSibling === trailing : row.lastElementChild === stats)
        if (inPlace) return
        if (trailing !== null) row.insertBefore(stats, trailing)
        else row.appendChild(stats)
      }

      // Re-insert when a re-render swapped the host row, then mirror the running preset.
      function syncSegments() {
        var hasTurns = document.querySelector('[class*="turn"], [class*="message"], [data-turn], [data-message-id]') !== null
        var isHero = !hasTurns && (document.querySelector('[class*="composerHero"], [data-phase="hero"]') !== null)
        var allCards = document.querySelectorAll('[data-composer-card]')
        for (var c = 0; c < allCards.length; c++) {
          allCards[c].setAttribute('data-composer-variant', isHero ? 'hero' : 'inline')
        }

        var trigger = findAccessTrigger()
        if (trigger === null) return
        var host = trigger.parentElement
        if (host === null) return

        var session = currentSession(ctx)
        var preset = session === null ? null : currentPreset(session)

        var existingPermContainers = document.querySelectorAll('.dsh-claude-perm-container')
        var existingSegments = document.querySelectorAll('.' + SEGMENTS_CLASS)

        if (isHero) {
          for (var i = 0; i < existingPermContainers.length; i++) {
            existingPermContainers[i].remove()
          }
          if (permPopover && permPopover.parentElement) {
            permPopover.parentElement.removeChild(permPopover)
          }
          permContainer = null
          permBtn = null
          permLabel = null
          permPopover = null

          if (existingSegments.length > 1) {
            for (var s = 1; s < existingSegments.length; s++) existingSegments[s].remove()
          }
          if (existingSegments.length === 1 && host.contains(existingSegments[0])) {
            segments = existingSegments[0]
          } else {
            for (var s2 = 0; s2 < existingSegments.length; s2++) existingSegments[s2].remove()
            segments = buildSegments(pick)
            host.insertBefore(segments, host.firstChild)
          }
          for (var j = 0; j < segments.children.length; j++) {
            var item = segments.children[j]
            if (item.getAttribute('data-preset') === preset) {
              item.setAttribute('data-active', '')
              item.setAttribute('aria-checked', 'true')
            } else {
              item.removeAttribute('data-active')
              item.setAttribute('aria-checked', 'false')
            }
          }
        } else {
          for (var es = 0; es < existingSegments.length; es++) {
            existingSegments[es].remove()
          }
          segments = null

          var allExisting = document.querySelectorAll('.dsh-claude-perm-container')
          if (allExisting.length > 0) {
            permContainer = allExisting[0]
            for (var p = 1; p < allExisting.length; p++) {
              allExisting[p].remove()
            }
            if (permContainer.parentElement !== host) {
              host.insertBefore(permContainer, host.firstChild)
            }
            permBtn = permContainer.querySelector('.dsh-claude-perm-btn')
            permLabel = permContainer.querySelector('.dsh-claude-perm-label')
          } else {
            var res = buildPermTriggerAndPopover(pick)
            permContainer = res.container
            permBtn = res.btn
            permLabel = res.label
            permPopover = res.popover
            host.insertBefore(permContainer, host.firstChild)
          }
          updatePermState(preset)
        }
      }

      /**
       * The composer is chat-view-only. The host mounts the seat inside the
       * conversation root on every tab (轨迹 / 上下文 even reserve room for
       * it), so the skin reflects the active view on <body> and CSS drops the
       * whole bottom area unless the chat tab is selected.
       *
       * Scope: the conversation tablist lives in the panel header, which is
       * the root's first child — any other tablist (the trajectory detail
       * panel, say) renders later inside the ledger. The chat view registers
       * at order 0, so it is always the tablist's FIRST tab; reading that
       * tab's aria-selected is locale-independent. No tab bar at all (hero /
       * single view) means the chat surface is all there is.
       */
      function syncChatTabComposer() {
        var chatActive = true
        var seat = document.querySelector('[data-composer-seat]')
        var root = seat && seat.closest ? seat.closest('[data-phase]') : null
        if (root) {
          var list = root.querySelector('[role="tablist"]')
          if (list) {
            var first = list.querySelector('[role="tab"]')
            if (first) chatActive = first.getAttribute('aria-selected') === 'true'
          }
        }
        if (chatActive) document.body.removeAttribute('data-dsh-claude-composer-hidden')
        else document.body.setAttribute('data-dsh-claude-composer-hidden', '')
      }

      // --- 4.3 Account Footer & Popover ---
      var accountBtn = null
      var accountPopover = null
      var popoverBody = null
      var popoverTimer = null

      function openPopover() {
        if (!accountPopover || !accountBtn) return
        if (popoverTimer) {
          clearTimeout(popoverTimer)
          popoverTimer = null
        }
        // Mirrors are frozen while the popover is open (syncPopoverItems
        // bails), so reconcile them here — before the reveal — to show fresh
        // content/order and bind click targets for the upcoming interaction.
        try {
          var footArea = document.querySelector('[class*="footArea"]')
          if (footArea) syncPopoverItems(footArea)
        } catch (error) { /* opening must never fail because of a mirror sync */ }
        accountPopover.setAttribute('data-open', 'true')
        accountBtn.setAttribute('data-open', 'true')
        accountBtn.setAttribute('aria-expanded', 'true')
      }

      function closePopover() {
        if (!accountPopover || !accountBtn) return
        if (popoverTimer) {
          clearTimeout(popoverTimer)
          popoverTimer = null
        }
        accountPopover.setAttribute('data-open', 'false')
        accountBtn.setAttribute('data-open', 'false')
        accountBtn.setAttribute('aria-expanded', 'false')
      }

      function togglePopover() {
        if (!accountPopover) return
        var isOpen = accountPopover.getAttribute('data-open') === 'true'
        if (isOpen) {
          closePopover()
        } else {
          openPopover()
        }
      }

      function scheduleClosePopover() {
        if (popoverTimer) clearTimeout(popoverTimer)
        popoverTimer = setTimeout(function () {
          closePopover()
        }, 150)
      }

      function cancelClosePopover() {
        if (popoverTimer) {
          clearTimeout(popoverTimer)
          popoverTimer = null
        }
      }

      var settingsItem = null
      function syncPopoverItems(footArea) {
        if (!popoverBody || !footArea) return

        var origSettingsTrigger = footArea.querySelector('[class*="settingsArea"] button[aria-haspopup="dialog"]') ||
                                  footArea.querySelector('[class*="settingsArea"] button')
        var labelText = '设置'
        if (origSettingsTrigger) {
          var txt = (origSettingsTrigger.textContent || '').trim()
          if (!txt) txt = origSettingsTrigger.getAttribute('aria-label') || ''
          if (txt) labelText = txt
        }

        if (!settingsItem) {
          settingsItem = document.createElement('button')
          settingsItem.type = 'button'
          settingsItem.className = 'dsh-claude-popover-item'
          settingsItem.setAttribute('data-action', 'settings')
          settingsItem.innerHTML =
            '<span class="dsh-claude-popover-item-icon">' +
              '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
                '<circle cx="12" cy="12" r="3"></circle>' +
                '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>' +
              '</svg>' +
            '</span>' +
            '<span class="dsh-claude-popover-item-text">' + labelText + '</span>' +
            '<span class="dsh-claude-popover-item-shortcut">Ctrl+,</span>'

          settingsItem.addEventListener('click', function (e) {
            e.stopPropagation()
            closePopover()
            var realTrigger = footArea.querySelector('[class*="settingsArea"] button[aria-haspopup="dialog"]') ||
                              footArea.querySelector('[class*="settingsArea"] button')
            if (realTrigger) {
              realTrigger.click()
            }
          })
          popoverBody.appendChild(settingsItem)
        } else {
          var txtEl = settingsItem.querySelector('.dsh-claude-popover-item-text')
          if (txtEl && txtEl.textContent !== labelText) txtEl.textContent = labelText
        }

        var footerActions = footArea.querySelector('[class*="footerActions"]')
        var footerEntries = syncFooterActionVisibility(footerActions)

        // While the popover is open, its mirrors must stay completely static:
        // a content rewrite, reorder, or embedded-clone replacement under the
        // pointer cancels the browser's :hover state and can swallow the click
        // between pointerdown and pointerup. Sync runs only while closed;
        // openPopover runs one final pass right before the reveal — and the
        // sidebar-side redirection above stays live, so a newly mounted entry
        // keeps being hidden even with the popover open.
        if (accountPopover && accountPopover.getAttribute('data-open') === 'true') return

        var existingActionItems = popoverBody.querySelectorAll('[data-action-index], [data-embed-index]')
        for (var ea = 0; ea < existingActionItems.length; ea++) {
          var staleIdx = parseInt(existingActionItems[ea].getAttribute('data-action-index') || existingActionItems[ea].getAttribute('data-embed-index'), 10)
          if (isNaN(staleIdx) || staleIdx >= footerEntries.length) {
            existingActionItems[ea].parentElement.removeChild(existingActionItems[ea])
          }
        }

        for (var f = 0; f < footerEntries.length; f++) {
          try {
            (function (entry, idx) {
            var trigger = findFooterTrigger(entry)
            var hasContent = (entry.textContent || '').trim() !== '' ||
                             entry.querySelector('svg, img, canvas') !== null

            // Rich widgets (progress bars, stat panels) cannot collapse into
            // a text menu item — embed a live clone instead, forwarding
            // clicks to the entry's trigger when it has one (the cost-meter
            // balance stack is itself clickable).
            if (!entryIsActionLike(entry, trigger)) {
              removeActionMirror(idx)
              if (hasContent) {
                syncEmbedMirror(entry, idx, trigger)
              } else {
                removeEmbedMirror(idx)
              }
              return
            }
            removeEmbedMirror(idx)

            // The mirrored item activates the first interactive element
            // outside any overlay.
            var activator = trigger
            var item = popoverBody.querySelector('[data-action-index="' + idx + '"]')
            var iconEl = (trigger && trigger.querySelector('svg')) || entry.querySelector('svg')
            var iconHtml = iconEl ? iconEl.outerHTML : ''
            var text = activator.getAttribute('aria-label') || (activator.textContent || '').trim() || '插件'
            var badge = activator.getAttribute('data-cordis-badge') || entry.getAttribute('data-cordis-badge') || ''

            if (!item) {
              item = document.createElement('button')
              item.type = 'button'
              item.className = 'dsh-claude-popover-item'
              item.setAttribute('data-action-index', idx)
              item.innerHTML =
                '<span class="dsh-claude-popover-item-icon">' + iconHtml + '</span>' +
                '<span class="dsh-claude-popover-item-text">' + text + '</span>' +
                (badge ? '<span class="dsh-claude-popover-item-badge">' + badge + '</span>' : '')

              item.addEventListener('click', function (e) {
                e.stopPropagation()
                closePopover()
                // The activator is rebound on every (closed-state) sync pass
                // (`item.__dshActivator`), never captured at creation — the
                // host re-sorts list slots by `order` on each render, so the
                // entry behind an index changes over time.
                var live = item.__dshActivator
                if (!live || typeof live.click !== 'function') {
                  // Safety net: re-resolve the current trigger for this index
                  // from the live footer DOM. Covers the rare case where the
                  // stored node was detached by a host re-render while the
                  // popover was open.
                  try {
                    var fa = document.querySelector('[class*="footArea"]')
                    var actions = fa ? fa.querySelector('[class*="footerActions"]') : null
                    var liveEntries = actions ? footerEntriesOf(actions) : []
                    var liveEntry = liveEntries[idx] || null
                    live = liveEntry ? findFooterTrigger(liveEntry) : null
                  } catch (error) {
                    live = null
                  }
                }
                if (live && typeof live.click === 'function') live.click()
              })
              popoverBody.insertBefore(item, settingsItem)
            } else {
              // Entries are reused by index: the host re-sorts list slots by
              // `order` on every render, so a re-sort can seat a different
              // plugin under an existing item — icon, text, badge AND the
              // click target must all re-sync, or the label shows one entry
              // while the click fires the previous occupant's trigger.
              var iEl = item.querySelector('.dsh-claude-popover-item-icon')
              if (iEl && iEl.innerHTML !== iconHtml) iEl.innerHTML = iconHtml
              var tEl = item.querySelector('.dsh-claude-popover-item-text')
              if (tEl && tEl.textContent !== text) tEl.textContent = text
              var bEl = item.querySelector('.dsh-claude-popover-item-badge')
              if (bEl && bEl.textContent !== badge) bEl.textContent = badge
            }
            // Rebind the click target to the entry currently behind this
            // index. Done on every pass, for new and reused items alike.
            item.__dshActivator = activator
            })(footerEntries[f], f)
          } catch (err) {
            // A single broken entry must not abort the rest of the mirror
            // sync (which would leave later items without a rebound
            // activator or un-ordered).
          }
        }

        // The host re-sorts list-slot outlets by `order` on every render
        // (stable, ties keep registration order), and plugins mount
        // progressively at startup — so the mirror nodes must track the live
        // footer order on every pass: a later re-sort would otherwise leave
        // the popover frozen in a stale order that no longer matches the
        // real controls. Re-append action items and embedded widgets in
        // entry-index order.
        var mirrors = []
        for (var mi = 0; mi < popoverBody.children.length; mi++) {
          var mirrorNode = popoverBody.children[mi]
          if (mirrorNode === settingsItem) continue
          if (mirrorNode.hasAttribute('data-action-index') || mirrorNode.hasAttribute('data-embed-index')) {
            mirrors.push(mirrorNode)
          }
        }
        mirrors.sort(function (a, b) {
          var ai = parseInt(a.getAttribute('data-action-index') || a.getAttribute('data-embed-index'), 10) || 0
          var bi = parseInt(b.getAttribute('data-action-index') || b.getAttribute('data-embed-index'), 10) || 0
          return ai - bi
        })
        for (var mr = 0; mr < mirrors.length; mr++) {
          popoverBody.insertBefore(mirrors[mr], settingsItem)
        }
      }

      // --- Footer action redirection helpers ---
      /**
       * The `sidebar.footer.action` list slot accepts arbitrary plugin
       * controls, not just buttons: a plugin may render a composite widget
       * (toggles, selects, status chips) straight into the sidebar footer.
       * Redirection therefore works on ENTRIES (direct children of
       * footerActions), not on `querySelectorAll('button')`:
       *   - every entry is marked `data-dsh-claude-footer-entry` (CSS
       *     collapses its box so nothing paints in the sidebar);
       *   - entries without a floating overlay are hidden wholesale via
       *     `data-dsh-claude-footer-hidden`;
       *   - entries hosting an overlay — a fixed-position panel (the cordis
       *     inventory panel) or a dialog/menu/listbox — stay visible, but
       *     every branch of their subtree that does not lead to the overlay
       *     is hidden, so only the overlay itself can surface.
       * Returns the live entry list for popover mirroring.
       */
      function syncFooterActionVisibility(footerActions) {
        if (!footerActions) return []
        var entries = footerEntriesOf(footerActions)
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i]
          entry.setAttribute('data-dsh-claude-footer-entry', '')
          var all = entry.querySelectorAll('*')
          for (var j = 0; j < all.length; j++) {
            var el = all[j]
            if (el.hasAttribute('data-dsh-claude-footer-overlay')) continue
            var role = el.getAttribute('role') || ''
            var overlay = role === 'dialog' || role === 'menu' || role === 'listbox'
            if (!overlay) {
              try { overlay = window.getComputedStyle(el).position === 'fixed' } catch (e) { overlay = false }
            }
            if (overlay) el.setAttribute('data-dsh-claude-footer-overlay', '')
          }
          markFooterHiddenBranches(entry)
        }
        return entries
      }

      /**
       * Mirrorable footer units. Every slot outlet renders inside a
       * `div[data-slot]` anchor with `display:contents`, so a list slot's
       * entries are the ANCHOR's children, not footerActions' — reading
       * `footerActions.children` directly collapses every registrant into a
       * single mirrorable unit and drops all but the first from the popover.
       * Dead cells (`data-slot-error`) never mirror.
       */
      function footerEntriesOf(footerActions) {
        var entries = []
        var kids = footerActions.children
        for (var i = 0; i < kids.length; i++) {
          var kid = kids[i]
          if (kid.hasAttribute('data-slot-error')) continue
          if (kid.hasAttribute('data-slot')) {
            var slotKids = kid.children
            for (var j = 0; j < slotKids.length; j++) {
              if (!slotKids[j].hasAttribute('data-slot-error')) entries.push(slotKids[j])
            }
          } else {
            entries.push(kid)
          }
        }
        return entries
      }

      /** Hide every branch of `el`'s subtree that does not carry an overlay. */
      function markFooterHiddenBranches(el) {
        if (el.hasAttribute('data-dsh-claude-footer-overlay')) {
          el.removeAttribute('data-dsh-claude-footer-hidden')
          return
        }
        if (el.querySelector('[data-dsh-claude-footer-overlay]') !== null) {
          el.removeAttribute('data-dsh-claude-footer-hidden')
          var kids = el.children
          for (var i = 0; i < kids.length; i++) markFooterHiddenBranches(kids[i])
          return
        }
        el.setAttribute('data-dsh-claude-footer-hidden', '')
      }

      /** Remove the mirrored text item for one entry index, if present. */
      function removeActionMirror(idx) {
        var item = popoverBody.querySelector('[data-action-index="' + idx + '"]')
        if (item && item.parentElement) item.parentElement.removeChild(item)
      }

      /** Remove the embedded widget clone for one entry index, if present. */
      function removeEmbedMirror(idx) {
        var embed = popoverBody.querySelector('[data-embed-index="' + idx + '"]')
        if (embed && embed.parentElement) embed.parentElement.removeChild(embed)
      }

      /**
       * Whether an entry reads as a plain ACTION (mirror it as a text menu
       * item) or as a rich WIDGET (embed a live clone). A text item is only
       * faithful when the trigger accounts for essentially all of the
       * entry's visible content: a clickable progress-bar stack (cost-meter
       * balance) would otherwise shrink to one label and lose its bars.
       * Overlay text is excluded so an open cordis panel does not flip its
       * own entry into a widget.
       */
      function entryIsActionLike(entry, trigger) {
        if (trigger === null) return false
        if (trigger === entry) {
          // Only genuinely interactive ROOTS count as actions; a clickable
          // container (a region or tabindex wrapper) is still a widget.
          var tag = entry.tagName
          var role = entry.getAttribute('role') || ''
          return tag === 'BUTTON' || tag === 'A' || role === 'button'
        }
        // Semantic meter markup is always a widget, however small.
        if (entry.querySelector('[role="progressbar"], [role="meter"], meter, progress') !== null) return false
        var entryText = textExcludingOverlays(entry)
        var triggerText = (trigger.textContent || '').trim()
        // Tight slack: the trigger must account for essentially all of the
        // entry's visible text. A balance box reading "余额¥10.07" beside an
        // icon-only trigger already exceeds it — and its bar must survive.
        return entryText.length - triggerText.length <= 2
      }

      /** Visible text of an entry, skipping overlay subtrees. */
      function textExcludingOverlays(entry) {
        var text = ''
        var walker = document.createTreeWalker(entry, 4 /* SHOW_TEXT */, {
          acceptNode: function (node) {
            var p = node.parentElement
            while (p && p !== entry) {
              if (p.hasAttribute('data-dsh-claude-footer-overlay')) return 2 // REJECT
              p = p.parentElement
            }
            return 1 // ACCEPT
          }
        })
        while (walker.nextNode()) text += walker.currentNode.nodeValue
        return text.trim()
      }

      /**
       * Embed a live clone of a display-only footer entry (a progress bar
       * reads as nothing as a text menu item — the cost-meter balance/quota
       * stack is the known case). The clone is replaced only when the
       * source's markup changes, so it tracks the plugin's re-renders without
       * churning the popover DOM. Skin marker attributes, ids, and overlay
       * subtrees are stripped from the copy: it must never be re-hidden by
       * the footArea hiding rule, double-register an id, or duplicate an
       * open panel next to the real one. Event listeners do not survive
       * cloning, so the embed forwards clicks back into the live entry —
       * path-mapped to the clicked sub-control (see resolveEmbedActivator) —
       * and deliberately leaves the popover open so the widget's response
       * stays visible; it still closes on pointer-leave as usual. The embed
       * is marked `data-clickable` for the cursor when the entry has a
       * trigger at all.
       */
      function syncEmbedMirror(entry, idx, forward) {
        var embed = popoverBody.querySelector('[data-embed-index="' + idx + '"]')
        if (!embed) {
          embed = document.createElement('div')
          embed.className = 'dsh-claude-popover-embed'
          embed.setAttribute('data-embed-index', idx)
          embed.addEventListener('click', function (e) {
            if (!embed.__dshEntry) return
            e.stopPropagation()
            var activator = resolveEmbedActivator(e.target, embed)
            if (activator) activator.click()
          })
          popoverBody.insertBefore(embed, settingsItem)
        }
        embed.__dshEntry = entry
        embed.__dshForward = forward || null
        if (forward) {
          embed.setAttribute('data-clickable', '')
        } else {
          embed.removeAttribute('data-clickable')
        }
        var clone = entry.cloneNode(true)
        clone.removeAttribute('id')
        clone.removeAttribute('data-dsh-claude-footer-entry')
        clone.removeAttribute('data-dsh-claude-footer-hidden')
        clone.removeAttribute('data-dsh-claude-footer-overlay')
        var overlays = clone.querySelectorAll('[data-dsh-claude-footer-overlay]')
        for (var o = 0; o < overlays.length; o++) {
          overlays[o].parentElement.removeChild(overlays[o])
        }
        var stripped = clone.querySelectorAll('[id], [data-dsh-claude-footer-hidden]')
        for (var s = 0; s < stripped.length; s++) {
          stripped[s].removeAttribute('id')
          stripped[s].removeAttribute('data-dsh-claude-footer-hidden')
        }
        var html = clone.outerHTML
        if (embed.getAttribute('data-embed-html') !== html) {
          embed.setAttribute('data-embed-html', html)
          while (embed.firstChild) embed.removeChild(embed.firstChild)
          embed.appendChild(clone)
        }
      }

      var INTERACTIVE_SELECTOR = 'button, [role="button"], a[href], [tabindex], input, select, summary'

      /**
       * Map a click inside the embedded clone back to the matching control
       * of the live entry. Forwarding every embed click to the entry's FIRST
       * trigger misfires for multi-control widgets (the cost-meter stack
       * carries refresh / collapse / tab buttons): the user clicks the
       * balance box but the first button in tree order fires. The clone
       * preserves the entry's tree shape, so the clicked node's child-index
       * path replays onto the original (tag-checked per level — overlay
       * stripping can shift siblings); the nearest interactive element at or
       * above the mapped node wins, and any mismatch falls back to the
       * entry's primary trigger.
       */
      function resolveEmbedActivator(clicked, embed) {
        var entry = embed.__dshEntry
        var cloneRoot = embed.firstChild
        if (!entry || !cloneRoot || !clicked || clicked.nodeType !== 1) return embed.__dshForward
        if (clicked === embed || clicked === cloneRoot) return embed.__dshForward
        // Child-index path from the clicked clone node up to the clone root.
        var path = []
        var node = clicked
        while (node && node !== cloneRoot) {
          var parent = node.parentElement
          if (!parent) return embed.__dshForward
          path.unshift(Array.prototype.indexOf.call(parent.children, node))
          node = parent
        }
        // Replay the path on the live entry, verifying shape level by level.
        var original = entry
        var cloneNode = cloneRoot
        for (var i = 0; i < path.length; i++) {
          var nextClone = cloneNode.children[path[i]]
          var nextOrig = original.children[path[i]]
          if (!nextClone || !nextOrig || nextClone.tagName !== nextOrig.tagName) {
            return embed.__dshForward
          }
          cloneNode = nextClone
          original = nextOrig
        }
        // Nearest interactive element at or above the mapped original,
        // bounded by the entry and never inside an overlay subtree.
        var target = original
        while (target) {
          if (target !== entry && target.matches && target.matches(INTERACTIVE_SELECTOR) &&
              !hasOverlayAncestor(target, entry)) {
            return target
          }
          if (target === entry) break
          target = target.parentElement
        }
        return embed.__dshForward
      }

      /** Whether `el` sits inside an overlay-marked subtree above `entry`. */
      function hasOverlayAncestor(el, entry) {
        var node = el
        while (node && node !== entry) {
          if (node.hasAttribute && node.hasAttribute('data-dsh-claude-footer-overlay')) return true
          node = node.parentElement
        }
        return false
      }

      /**
       * First interactive element of a footer entry that is not part of an
       * overlay subtree (an open panel may render action buttons of its own,
       * and those must never become the popover item's activation target).
       */
      function findFooterTrigger(entry) {
        var selector = INTERACTIVE_SELECTOR
        if (entry.matches && entry.matches(selector) &&
            !entry.hasAttribute('data-dsh-claude-footer-overlay')) {
          return entry
        }
        var found = entry.querySelectorAll(selector)
        for (var i = 0; i < found.length; i++) {
          var candidate = found[i]
          var node = candidate
          var insideOverlay = false
          while (node && node !== entry) {
            if (node.hasAttribute && node.hasAttribute('data-dsh-claude-footer-overlay')) {
              insideOverlay = true
              break
            }
            node = node.parentElement
          }
          if (!insideOverlay) return candidate
        }
        return null
      }

      function syncAccountFooter() {
        var footArea = document.querySelector('[class*="footArea"]')
        if (footArea === null) return

        var username = getUsername(ctx)

        if (accountBtn === null || !footArea.contains(accountBtn)) {
          if (accountBtn && accountBtn.parentElement) accountBtn.parentElement.removeChild(accountBtn)
          accountBtn = document.createElement('div')
          accountBtn.className = 'dsh-claude-account-btn'
          accountBtn.setAttribute('role', 'button')
          accountBtn.setAttribute('tabindex', '0')
          accountBtn.setAttribute('aria-haspopup', 'menu')
          accountBtn.setAttribute('aria-expanded', 'false')
          accountBtn.innerHTML =
            '<span class="dsh-claude-account-avatar"></span>' +
            '<span class="dsh-claude-account-label">' +
              '<span class="dsh-claude-account-user">' + username + '</span>' +
            '</span>' +
            '<span class="dsh-claude-account-chevron"></span>'

          accountBtn.addEventListener('mouseenter', function () {
            openPopover()
          })
          accountBtn.addEventListener('mouseleave', function () {
            scheduleClosePopover()
          })
          accountBtn.addEventListener('click', function (e) {
            e.stopPropagation()
            togglePopover()
          })
          footArea.appendChild(accountBtn)
        } else {
          var userEl = accountBtn.querySelector('.dsh-claude-account-user')
          if (userEl && userEl.textContent !== username) userEl.textContent = username
        }

        if (accountPopover === null || !footArea.contains(accountPopover)) {
          if (accountPopover && accountPopover.parentElement) accountPopover.parentElement.removeChild(accountPopover)
          accountPopover = document.createElement('div')
          accountPopover.id = 'dsh-claude-account-popover'
          accountPopover.className = 'dsh-claude-account-popover'
          accountPopover.setAttribute('data-open', 'false')

          accountPopover.addEventListener('mouseenter', function () {
            cancelClosePopover()
          })
          accountPopover.addEventListener('mouseleave', function () {
            scheduleClosePopover()
          })

          var header = document.createElement('div')
          header.className = 'dsh-claude-account-popover-header'

          var nameEl = document.createElement('div')
          nameEl.className = 'dsh-claude-account-popover-name'
          nameEl.textContent = username

          var divider = document.createElement('div')
          divider.className = 'dsh-claude-account-popover-divider'

          header.appendChild(nameEl)
          header.appendChild(divider)
          accountPopover.appendChild(header)

          popoverBody = document.createElement('div')
          popoverBody.className = 'dsh-claude-account-popover-body'
          accountPopover.appendChild(popoverBody)

          footArea.appendChild(accountPopover)
        } else {
          var nameEl2 = accountPopover.querySelector('.dsh-claude-account-popover-name')
          if (nameEl2 && nameEl2.textContent !== username) nameEl2.textContent = username
        }

        syncPopoverItems(footArea)
      }

      // ============================================================================
      // Zone 5: 响应式调度与生命周期清理 (Scheduler & Teardown)
      // ============================================================================
      function onGlobalPointerDown(e) {
        if (!accountPopover || !accountBtn) return
        var target = e.target
        if (target && (accountBtn.contains(target) || accountPopover.contains(target))) return
        closePopover()
      }

      function onGlobalKeyDown(e) {
        if (e.key === 'Escape') {
          closePopover()
          closePermMenu()
        }
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
          e.preventDefault()
          var realTrigger = document.querySelector('[class*="footArea"] [class*="settingsArea"] button[aria-haspopup="dialog"]') ||
                            document.querySelector('[class*="footArea"] [class*="settingsArea"] button')
          if (realTrigger) {
            realTrigger.click()
          }
        }
        // Plain Enter in inline composer sends message; Shift+Enter creates newline; IME composition preserved
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (e.isComposing || e.keyCode === 229) return
          var target = e.target
          if (target && (target.hasAttribute('data-composer-input') || (target.closest && target.closest('[data-composer-input]')))) {
            var card = target.closest('[data-composer-card]')
            if (card) {
              var sendBtn = card.querySelector('button[aria-label^="发送"], button[aria-label^="Send"], button[aria-label*="发送"], button[aria-label*="Send"], button[aria-label*="排队"], button[aria-label*="Queue"], button[aria-label*="插话"], button[aria-label*="Steer"], [class*="sendBtn"], [class*="sendButton"]')
              if (sendBtn && !sendBtn.disabled) {
                e.preventDefault()
                e.stopPropagation()
                sendBtn.click()
              }
            }
          }
        }
      }

      function onCardPointerDown(e) {
        var card = e.target.closest && e.target.closest('[data-composer-card][data-composer-variant="inline"]')
        if (!card) return
        if (e.target.closest('button, [role="button"], [role="menu"], [role="radiogroup"], input, select')) return
        var input = card.querySelector('[data-composer-input]')
        if (input && document.activeElement !== input) {
          input.focus()
        }
      }

      document.addEventListener('pointerdown', onGlobalPointerDown)
      document.addEventListener('pointerdown', onCardPointerDown)
      document.addEventListener('keydown', onGlobalKeyDown, true)

      // Chat streaming mutates the tree constantly; coalesce to one pass a frame.
      var scheduled = false
      var composerCardObserver = null
      var observedCard = null
      if (typeof ResizeObserver !== 'undefined') {
        composerCardObserver = new ResizeObserver(function () {
          var scroller = document.querySelector('[data-conversation-scroll], [class*="scrollBody"]')
          if (scroller) {
            var dist = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
            if (dist < 150) {
              scroller.scrollTop = scroller.scrollHeight
            }
          }
        })
      }

      function schedule() {
        if (scheduled) return
        scheduled = true
        requestAnimationFrame(function () {
          scheduled = false
          rewriteHeadline()
          rewriteHint()
          rewriteTurnStatus()
          syncAttachmentState()
          mergeStatsIntoRow()
          syncSegments()
          syncChatTabComposer()
          syncAccountFooter()
          if (composerCardObserver) {
            var currentCard = document.querySelector('[data-composer-card]')
            if (currentCard !== observedCard) {
              if (observedCard) composerCardObserver.unobserve(observedCard)
              observedCard = currentCard
              if (observedCard) composerCardObserver.observe(observedCard)
            }
          }
        })
      }

      var observer = new MutationObserver(schedule)
      observer.observe(document.body, {
        childList: true,
        characterData: true,
        subtree: true,
        attributes: true,
        // The shipped trigger carries the current preset in its aria-label;
        // the conversation tabs carry the active view in aria-selected.
        attributeFilter: ['aria-label', 'aria-selected'],
      })
      schedule()

      // The hero greeting follows the clock: re-apply it every minute so the
      // line rolls over on the hour while the app stays open. rewriteHeadline
      // skips identical text, so this cannot feed the observer.
      var greetingTimer = setInterval(function () {
        rewriteHeadline()
      }, 60000)

      return function () {
        clearInterval(greetingTimer)
        greetingTimer = null
        observer.disconnect()
        if (composerCardObserver) {
          composerCardObserver.disconnect()
          composerCardObserver = null
          observedCard = null
        }
        if (popoverTimer) {
          clearTimeout(popoverTimer)
          popoverTimer = null
        }
        document.removeEventListener('pointerdown', onGlobalPointerDown)
        document.removeEventListener('pointerdown', onCardPointerDown)
        document.removeEventListener('keydown', onGlobalKeyDown, true)
        if (permDocPointerListener) {
          document.removeEventListener('pointerdown', permDocPointerListener)
          permDocPointerListener = null
        }
        if (permResizeListener) {
          window.removeEventListener('resize', permResizeListener)
          window.removeEventListener('scroll', permResizeListener, true)
          permResizeListener = null
        }
        if (segments !== null && segments.parentElement !== null) segments.parentElement.removeChild(segments)
        segments = null
        if (permPopover !== null && permPopover.parentElement !== null) {
          permPopover.parentElement.removeChild(permPopover)
        }
        permPopover = null
        permBtn = null
        permLabel = null
        permContainer = null
        if (accountPopover !== null && accountPopover.parentElement !== null) {
          accountPopover.parentElement.removeChild(accountPopover)
        }
        accountPopover = null
        popoverBody = null
        if (accountBtn !== null && accountBtn.parentElement !== null) {
          accountBtn.parentElement.removeChild(accountBtn)
        }
        accountBtn = null
        var leftoverItems = document.querySelectorAll('.dsh-claude-popover-item, .dsh-claude-popover-embed, .dsh-claude-account-popover, .dsh-claude-account-btn, .dsh-claude-perm-container, .dsh-claude-perm-popover, .dsh-claude-segments')
        for (var li = 0; li < leftoverItems.length; li++) {
          if (leftoverItems[li].parentElement) {
            leftoverItems[li].parentElement.removeChild(leftoverItems[li])
          }
        }
        // Un-hide host footer controls the popover redirection had hidden.
        var footerMarked = document.querySelectorAll('[data-dsh-claude-footer-entry], [data-dsh-claude-footer-hidden], [data-dsh-claude-footer-overlay]')
        for (var fm = 0; fm < footerMarked.length; fm++) {
          footerMarked[fm].removeAttribute('data-dsh-claude-footer-entry')
          footerMarked[fm].removeAttribute('data-dsh-claude-footer-hidden')
          footerMarked[fm].removeAttribute('data-dsh-claude-footer-overlay')
        }
      }
    }

    // ============================================================================
    // Zone 4.4: 设置页品牌分区 (Settings Section: Brand)
    // ============================================================================
    /**
     * The settings page section, mounted by the host into the `settings.section`
     * slot. That slot hands a section only `{ close }` plus the standard hooks, so
     * this component owns its state and persistence rather than reading a store.
     *
     * It renders a segmented control in the same visual language as the composer's
     * permission control: a single hairline track with the active segment plated.
     */
    function BrandSettingsSection() {
      var state = React.useState(readStoredBrand())
      var brand = state[0]
      var setBrand = state[1]

      var choose = function (next) {
        if (next === brand) return
        writeStoredBrand(next)
        applyBrand(next)
        setBrand(next)
      }

      var options = [
        { value: BRAND_CLAUDE, label: 'Claude' },
        { value: BRAND_ANTHROPIC, label: 'Anthropic' },
      ]

      var segments = []
      for (var i = 0; i < options.length; i++) {
        segments.push(
          React.createElement(
            'button',
            {
              key: options[i].value,
              type: 'button',
              className: 'dsh-claude-brand-option',
              'data-active': options[i].value === brand ? 'true' : 'false',
              'aria-pressed': options[i].value === brand ? 'true' : 'false',
              onClick: (function (value) {
                return function () {
                  choose(value)
                }
              })(options[i].value),
            },
            options[i].label,
          ),
        )
      }

      return React.createElement(
        'div',
        { className: 'dsh-claude-brand-section' },
        React.createElement('div', { className: 'dsh-claude-brand-title' }, 'Claude Style'),
        React.createElement(
          'div',
          { className: 'dsh-claude-brand-card' },
          React.createElement(
            'div',
            { className: 'dsh-claude-brand-card-text' },
            React.createElement('div', { className: 'dsh-claude-brand-card-title' }, 'Sidebar brand'),
            React.createElement(
              'div',
              { className: 'dsh-claude-brand-card-desc' },
              'Which brand mark the sidebar shows. Claude is the default.',
            ),
          ),
          React.createElement('div', { className: 'dsh-claude-brand-segments', role: 'group' }, segments),
        ),
      )
    }

    /**
     * Register the settings section.
     *
     * Two waits are needed, and both are declarative rather than polling:
     *
     *   1. `ctx.inject(['slots'], …)` waits for the slot registry service. The
     *      renderer provides it, so reading `ctx.get('slots')` directly during
     *      `apply` could see nothing and silently drop the section.
     *   2. `slots.inject('settings.section', …)` waits for the slot *declaration*,
     *      which `dsh-client-ui-settings-general` publishes later. Registering
     *      eagerly instead would throw and fail the boot.
     *
     * `order: 22` sorts the section after the shipped ones (general 0, models 10,
     * plugins 15, agent-presets 20, chat-import 21). The slot accepts no icon
     * field, so the navigation entry takes the host's default glyph.
     *
     * @param ctx - client root context.
     * @returns a disposer that tears the registration down.
     */
    function installSettingsSection(ctx) {
      if (typeof ctx.inject !== 'function') return function () {}
      var fiber = ctx.inject(['slots'], function (scope) {
        var slots = scope.get('slots')
        if (slots === void 0 || slots === null || typeof slots.inject !== 'function') return
        scope.effect(function () {
          return slots.inject('settings.section', function () {
            return slots.register(
              { name: 'settings.section', id: 'claude-style', order: 22, label: function () { return 'Claude Style' } },
              BrandSettingsSection,
            )
          })
        }, 'dsh-claude-style: settings section')
      })
      return function () {
        try {
          if (fiber && typeof fiber.dispose === 'function') fiber.dispose()
        } catch (error) {
          /* the fiber may already be gone during teardown */
        }
      }
    }

    // ============================================================================
    // Zone 6: 插件入口与导出 (Plugin Entry & Export)
    // ============================================================================
    function apply(ctx) {
      var body = document.body
      body.setAttribute('data-dsh-claude-style', '')
      applyBrand(readStoredBrand())

      var old = document.getElementById(STYLE_ID)
      if (old && old.parentElement) old.parentElement.removeChild(old)

      var style = document.createElement('style')
      style.id = STYLE_ID
      style.dataset.skinChrome = 'dsh-claude-style-style'
      style.textContent = CSS
      document.head.appendChild(style)

      var stopOverrides = installOverrides(ctx)
      var stopSettings = installSettingsSection(ctx)

      ctx.effect(function () {
        return function () {
          stopOverrides()
          stopSettings()
          body.removeAttribute('data-dsh-claude-style')
          body.removeAttribute(BRAND_ATTR)
          var el = document.getElementById(STYLE_ID)
          if (el) el.remove()
        }
      }, 'dsh-claude-style: Claude Code Desktop theme')
    }

    exports.apply = apply
    return module.exports

  },
})
