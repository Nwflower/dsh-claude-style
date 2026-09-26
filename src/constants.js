    const STYLE_ID = 'dsh-claude-style-style'

    /**
     * Settings identity.
     *
     * A settings namespace IS a profile entry id and its schema IS the entry's
     * Config, so the id below is what both halves address — read off the
     * running loader entry where possible, with the id `cordis.patch.yml`
     * inserts as the fallback.
     *
     * PACKAGE_NAME is the other half of the contract: a bundle's own
     * configuration is a `plugins.bundle.config` entry keyed by the bundle's
     * package name, which is what makes it render on this plugin's page.
     */
    const SETTINGS_ENTRY_FALLBACK = 'ui-skin-claude-style'
    const PACKAGE_NAME = 'dsh-claude-style'
    const BUNDLE_CONFIG_SLOT = 'plugins.bundle.config'
    const SETTINGS_SECTION_SLOT = 'settings.section'

    const COMPOSER_HINT = 'How can I help you today?'

    /**
     * Model picker copy.
     *
     * The copy itself is NOT here. It ships as `model-descriptions.json` beside
     * the bundle, and the browser half fetches it at runtime (the host half
     * serves it under MODEL_COPY_ROUTE), so the model table grows without a
     * rebuild and no copy enters the bundle. The language comes from the shell's
     * own `locale` service — one line per row, in the language the rest of the
     * UI is in — never two languages stacked.
     *
     * The constants below are the neutral fallbacks painted before that document
     * arrives, and kept if it never does. They are English because a failed
     * fetch has no locale to honour.
     */
    const MODEL_OFFICIAL_GROUP = 'deepseek-official'
    const MODEL_COPY_ROUTE = '/dsh-claude-style/model-descriptions.json'
    const MODEL_COPY_FALLBACK_LOCALE = 'en'
    const MODEL_FALLBACK_LABEL = 'Select model'
    const MODEL_LOADING_LABEL = 'Loading models…'
    const MODEL_EMPTY_LABEL = 'No models available.'
    const MODEL_EFFORT_LABEL = 'Reasoning effort'
    const MODEL_EFFORT_DEFAULT = 'Default'
    /** The effort slider's two ends. Kept in English in every locale: they name
     *  the axis, not a level, and the level's own name rides beside the label. */
    const MODEL_EFFORT_FASTER = 'Faster'
    const MODEL_EFFORT_SMARTER = 'Smarter'
    /** What the slider reads when the model offers no levels at all. */
    const MODEL_EFFORT_NONE = '—'
    const MODEL_MORE_LABEL = 'More models'
    const MODEL_TRIGGER_LABEL = 'Select model, currently {model}'

    /** English weekday names, indexed by Date#getDay() (0 = Sunday). */
    const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    /**
     * The classic hero's welcomes, à la Claude Code's rotating greetings. Each
     * time-of-day slot has its own pool — the night slot runs past midnight,
     * so its hours count on from 24 — and a few lines fit any hour. `{name}`
     * is the user's name, `{weekday}` today's.
     */
    const HERO_GREETING_SLOTS = [
      { from: 5, to: 12, lines: [
        'Good morning, {name}!',
        'Happy {weekday}, {name}.',
        'What are you working on?',
        'Morning, {name}. What’s first?',
        'Fresh start, {name}?',
      ] },
      { from: 12, to: 14, lines: [
        'What’s on the agenda today?',
        'Good afternoon, {name}.',
        'Midday check-in, {name}?',
      ] },
      { from: 14, to: 18, lines: [
        'Coffee and Claude time?',
        'Good afternoon, {name}.',
        'How’s the day going, {name}?',
        'Afternoon, {name}. What’s next?',
      ] },
      { from: 18, to: 22, lines: [
        'Evening, how are things?',
        'Good evening, {name}.',
        'How was your day, {name}?',
        'Winding down, or just getting started?',
      ] },
      { from: 22, to: 29, lines: [
        'You are here!',
        'Hello, night owl.',
        'Burning the midnight oil, {name}?',
        'Still up, {name}?',
      ] },
    ]
    const HERO_GREETING_ANYTIME = [
      'Back at it, {name}?',
      'Welcome back, {name}.',
      'Hey there, {name}.',
      'What shall we build?',
    ]

    /**
     * One classic hero welcome: the current slot's pool and the any-hour lines,
     * picked by `draw` in [0, 1). The caller holds the draw, so the line stays
     * put between passes and changes only when the draw or the slot does.
     */
    function pickHeroGreeting(username, draw) {
      const now = new Date()
      const hour = now.getHours()
      const clock = hour < 5 ? hour + 24 : hour
      let lines = HERO_GREETING_ANYTIME
      for (let s = 0; s < HERO_GREETING_SLOTS.length; s++) {
        const slot = HERO_GREETING_SLOTS[s]
        if (clock >= slot.from && clock < slot.to) lines = slot.lines.concat(HERO_GREETING_ANYTIME)
      }
      const line = lines[Math.min(lines.length - 1, Math.floor(draw * lines.length))]
      return line.replace('{name}', username || 'User').replace('{weekday}', WEEKDAY_NAMES[now.getDay()])
    }

    /**
     * The studio dashboard's greeting, à la Claude Code's desktop home: one
     * fixed line naming the signed-in user, no clock. The classic hero keeps
     * the rotating welcomes.
     */
    function pickStudioGreeting(username) {
      return `What's up next, ${username || 'User'}?`
    }

    /**
     * Claude-flavored presentation of the permission presets, keyed by preset
     * id. The host's catalog decides WHICH presets a deployment offers — a
     * third-party plugin's ride in it, the auto mode plugin's `auto-mode` among
     * them — and this table decides how a known one reads. A preset the table
     * does not know falls back to the name the catalog carries, so nothing the
     * host offers is ever hidden and a machine id is never shown.
     */
    const PERMISSION_PRESETS = {
      'read-only': { label: 'Read only', desc: '仅读取文件与分析，不修改代码' },
      'workspace-write': { label: 'Accept edits', desc: '允许编辑工作区文件' },
      'auto-mode': { label: 'Auto mode', desc: '规则放行常规操作，其余由分类器裁决' },
      'auto': { label: 'Auto review', desc: '无沙箱运行，调用前由模型审查' },
      'danger-full-access': { label: 'Full access', desc: '自动执行，无需反复确认' }
    }

    /**
     * The control's segments, in slot order. Each slot lists the presets it may
     * bind to, best first: the deployment's own auto tier wins the slot over the
     * host's built-in Auto review, and a slot none of whose presets the host
     * offers is not drawn at all.
     */
    const PERMISSION_SEGMENTS = [
      { label: 'Read', presets: ['read-only'] },
      { label: 'Edit', presets: ['workspace-write'] },
      { label: 'Auto', presets: ['auto-mode', 'auto'] },
      { label: 'Yolo', presets: ['danger-full-access'] }
    ]

    /** Popover row order; a preset the host offers but this list does not know follows in catalog order. */
    const PERMISSION_ORDER = ['read-only', 'workspace-write', 'auto-mode', 'auto', 'danger-full-access']

    /**
     * What the control draws before the host's first catalog read settles: the
     * shipped built-ins, with the auto slot left out the way the shipped picker
     * renders nothing until its own catalog arrives.
     */
    const PERMISSION_SHIPPED_PRESETS = ['read-only', 'workspace-write', 'danger-full-access']

    /**
     * Names for host values that are never switch targets. `custom` is the
     * host's own word for knob settings that match no preset, so the trigger
     * reads that rather than the machine value.
     */
    const PERMISSION_CURRENT_LABELS = { custom: 'Custom' }

    /** Skin-owned class names, so nothing couples to hashed CSS-module classes. */
    const SEGMENTS_CLASS = 'dsh-claude-segments'
    const SEGMENT_CLASS = 'dsh-claude-segment'

    /**
     * Preferences, persisted in the profile entry's settings namespace (the
     * exported Config in host/index.js declares the fields; src/core/prefs.js
     * reads and writes them). Each value is mirrored onto the document as an
     * attribute so the stylesheet decides what a preference means, and the
     * defaults here are the shipped behaviour.
     */

    /** Brand marks selectable from the settings page. `claude` is the default. */
    const BRAND_CLAUDE = 'claude'
    const BRAND_ANTHROPIC = 'anthropic'
    /** Leave the brand area entirely to the host: neither brand variant matches. */
    const BRAND_OFF = 'off'
    const DEFAULT_BRAND = BRAND_CLAUDE
    /** The document attribute the stylesheet switches on. */
    const BRAND_ATTR = 'data-dsh-claude-brand'

    /** Present while the skin takes over the sidebar footer (settings area + account row). */
    const FOOTER_ATTR = 'data-dsh-claude-footer-takeover'
    /**
     * The language the account-hold easter egg (src/features/ban-screen/ban-screen.js) is
     * written in. It is its own preference rather than "follow the shell",
     * because the page reproduces a real Claude screen: the point is to read it
     * in the language Claude actually used, whatever the shell is set to. The
     * default is English for that reason.
     */
    const BAN_LOCALE_EN = 'en'
    const BAN_LOCALE_ZH = 'zh'
    const BAN_LOCALES = [BAN_LOCALE_EN, BAN_LOCALE_ZH]
    const DEFAULT_BAN_LOCALE = BAN_LOCALE_EN
    /** Present while the composer restyle applies to the page currently shown. */
    const COMPOSER_ATTR = 'data-dsh-claude-composer-active'
    /**
     * Present while the permission control is installed. The composer restyle
     * hides the host's access-mode button and its statistics dialogs because
     * this feature replaces them, and those rules also require this attribute:
     * a permission control that is switched off hands them back while the rest
     * of the composer restyle keeps running.
     */
    const PERMISSIONS_ATTR = 'data-dsh-claude-permissions'
    /**
     * Stamped on the host's own account menu card while it is open (Desktop
     * 0.1.7+). That card is the host's shared Menu portal and its class names
     * are hashed, so src/features/account/surface.js stamps this attribute and
     * features/account/account-footer.css repaints the card, its rows and its
     * separators with the skin's popover language.
     */
    const ACCOUNT_MENU_ATTR = 'data-dsh-claude-account-menu'
    /**
     * Set on <body> from the moment the account row is hovered or pressed until
     * its menu closes. The card's own marker needs the menu's rows to identify
     * the card, so it lands two or three frames after the host has already
     * painted the card; an entry animation keyed on it therefore replayed from
     * transparent over a card that was already visible. This one is in place
     * before the host mounts the card, so the animation runs from its first
     * frame.
     */
    const ACCOUNT_ARMED_ATTR = 'data-dsh-claude-account-armed'
    /**
     * Stamped on the host's shared menu card while it is the hero row's picker
     * (the workspace chip or the agent-preset seat opened it). The host portals
     * that card to <body> with no marker of its own, so the stylesheet cannot
     * tell it from the host's other menus; src/features/hero-menu/hero-menu.js stamps it
     * and features/hero-menu/hero-menu.css switches on this attribute.
     */
    const HERO_MENU_ATTR = 'data-dsh-claude-hero-menu'
    /**
     * Present while the browser window does NOT hold focus.
     *
     * The window's focus state is the only thing that separates the two text
     * selection paints (gray on black unfocused, blue on white focused), and no
     * selector can read it — so src/features/selection/selection.js mirrors it onto the
     * document and the stylesheet switches on this attribute.
     */
    const WINDOW_BLUR_ATTR = 'data-dsh-window-blur'
    /**
     * Which home layout is in force. The stylesheet branches on it, and the two
     * layouts differ only in arrangement — the hero's own markup is the host's
     * either way, so the switch is one attribute plus the panel registration.
     */
    const HOME_LAYOUT_ATTR = 'data-dsh-claude-home-layout'
    /**
     * Present while the studio layout owns the page shown: the studio layout is
     * in force and the page is the new-conversation hero. Every studio rule keys
     * on it, so the host's hero-phase marker is read once per pass in JS rather
     * than repeated across the stylesheet.
     */
    const HOME_HERO_ATTR = 'data-dsh-claude-home-hero'
    /**
     * The host half's session-deletion route (host/index.js, SESSION_DELETE_PATH).
     * The harness gives the browser half no deletion API of its own, so the
     * archived row's delete button posts the session id here and the host half
     * removes the stored session directory. Keep the path in step with the host
     * half.
     */
    const SESSION_DELETE_ROUTE = '/dsh-claude-style/session-delete'
    /**
     * The host half's cross-session usage roll-up (host/index.js, USAGE_PATH).
     * The browser half cannot read the session logs or the cost-meter ledger, so
     * the day buckets behind the home dashboard's panel arrive from here.
     */
    const USAGE_ROUTE = '/dsh-claude-style/usage'
    /**
     * Home-page layouts. `classic` is the centered hero the skin has always
     * drawn; `studio` is the dashboard form: the greeting sits at the top left,
     * the composer hugs the window's bottom edge, and the usage panel fills the
     * space between them. Studio is the default: it is Claude Code's own home.
     */
    const HOME_LAYOUT_CLASSIC = 'classic'
    const HOME_LAYOUT_STUDIO = 'studio'
    const HOME_LAYOUTS = [HOME_LAYOUT_CLASSIC, HOME_LAYOUT_STUDIO]
    const DEFAULT_HOME_LAYOUT = HOME_LAYOUT_STUDIO
    /** Composer surfaces the restyle may cover, in settings order. */
    const COMPOSER_SCOPES = ['off', 'hero', 'conversation', 'all']
    /**
     * How eagerly the skin's popovers open on hover: `off` is click-only,
     * `account` auto-opens the sidebar account popover alone, and `all` adds the
     * permission, model, session-stats and the host's two hero-row pickers.
     */
    const AUTO_POPOVER_OFF = 'off'
    const AUTO_POPOVER_ACCOUNT = 'account'
    const AUTO_POPOVER_ALL = 'all'
    const AUTO_POPOVER_SCOPES = [AUTO_POPOVER_OFF, AUTO_POPOVER_ACCOUNT, AUTO_POPOVER_ALL]
    const DEFAULT_AUTO_POPOVER = AUTO_POPOVER_ALL
    /** Route that resolves the name this instance runs as, once; never polled. */
    const USERNAME_ROUTE = '/dsh-claude-style/username'
    /** Route that forwards the HDSL launcher's account contract; never polled. */
    const HDSL_ROUTE = '/dsh-claude-style/hdsl'
    /**
     * The player's own avatar, forwarded by the host half; 404 falls back to the
     * mark. What the route serves is the launcher's normalized skin atlas, not a
     * finished avatar, so the account row crops the head out of it
     * (src/features/account/rows.js).
     */
    const HDSL_SKIN_ROUTE = '/dsh-claude-style/hdsl-skin.png'
    /** Longest accepted custom username; mirrored by host/index.js. */
    const USERNAME_MAX = 64
    /** Most quick-provider ids kept, and the longest id accepted; mirrored by host/index.js. */
    const QUICK_PROVIDERS_MAX = 64
    const PROVIDER_ID_MAX = 128

    /** Wordmark aspect ratio; scripts/build.mjs sizes the sidebar word height from it (geometry lives in src/assets/claude-word.svg). */
    const CLAUDE_WORD_ASPECT = 512.22 / 121.54

    const SANS = "'Anthropic Sans Web Text','Noto Sans SC','Source Han Sans SC',-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Helvetica Neue',Helvetica,Arial,sans-serif"
    const SERIF = "'Anthropic Serif Web Text',Georgia,'Times New Roman','Noto Sans SC','Source Han Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif"
    /**
     * Conversation prose: Claude sets Latin text in the serif face and lets
     * Chinese fall through to a sans CJK — the serif Latin faces carry no CJK
     * glyphs, so the stack leads with serif and names the sans CJK families
     * after it. UI chrome keeps SANS; only markdown prose uses this.
     */
    const PROSE = "'Anthropic Serif Web Text',Georgia,'Times New Roman','Noto Sans SC','Source Han Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif"
    const MONO = "'JetBrains Mono','Noto Sans SC','Source Han Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei',ui-monospace,'SF Mono','Fira Code',Consolas,'Liberation Mono',Menlo,Courier,monospace"
