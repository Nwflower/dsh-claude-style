# Style Guide · 设计令牌

Design tokens for `dsh-claude-style`, recreating the Claude Code Desktop aesthetic.

## Palette

| Token | Value | Use |
|---|---|---|
| ivory light | `#FCFCFB` | light canvas / layer 1 |
| sidebar light | `#FBFBF9` | light sidebar / layer 2 |
| ivory neutral | `#F9F9F6` | layer 3 / section bg |
| ivory border | `#E8E6DC` | border l1 |
| slate dark | `#141413` | text (light mode), canvas (dark mode) |
| warm gray | `#B0AEA5` | metadata |
| clay | `#D97757` | single accent — CTA / links |
| accent deep | `#C6613F` | accent hover |
| hairline | `#1414131a` | 1px warm border |

Rules:

- Never pure white, never pure black, never cool grays.
- Accent usage stays under ~10% of visible elements.

**Host token bindings.** The skin supplies its palette through the host's own
alias tokens, so a host control that reads more than one token for one surface
has to be given all of them. A filled primary button is that case: the host takes
the fill from `--dsw-alias-brand-primary`, but the hover from a monochrome step
of its own scale (light `#43454a`, dark `#ebeef2`) and the label from a
foreground token the skin leaves alone. `--dsw-alias-button-primary-fill` and
`--dsw-alias-button-primary-hover` therefore state both steps in each palette.
Two fills are palette-specific rather than carried over from the dark base:
`--dsw-alias-interactive-bg-hover-solid` (a solid chip, lighter than the canvas
in light) and `--dsw-alias-button-elevated-fill` (a surface above the canvas in
light, a raised gray in dark).

## Typography

- **Serif display** — headings / editorial statements (`--dsw-font-serif`).
- **Sans UI** — chrome, body (`--dsw-font-family`).
- **Mono** — code, technical labels (`--dsw-font-code`).


## Shapes

- Radius: 4 / 8 / 16 px; pills for CTAs (`9999px`).
- Borders: 1px warm hairline.
- Spacing: 4 px rhythm.
- Bottom edge: the transcript never fades behind the composer by shadow. The
  composer seat paints an opaque `var(--dsw-alias-bg-base)` bar across its own
  box (so the bar's height *is* the composer's height) and one
  `--dsh-composer-fade-h` (40px) gradient band above it, running to transparent.
  The same token is the transcript's bottom clearance, so the last turn rests
  exactly at the band's top edge. Never re-add background-coloured halo shadows
  to the card to hide the transcript: they have to be restated in every
  light / dark / focus / attachment rule, and every rule that resets the card's
  `box-shadow` inherits the job.
- Focus: the composer field lights up — its hairline takes the input box's own
  shadow colour (espresso `#141413` in light) with a 1px halo in the same tone
  and a deeper drop shadow. Dark inverts the face: on the near-black canvas a
  black edge carries no cue, so the hairline and halo become bright ivory —
  the field visibly lights up instead of deepening. The footer tray below
  follows the same hairline so the two tiers stay one outline. Accent is never
  used for focus strokes.

## Text selection

Selection is the one surface that leaves the palette on purpose — it is a
transient gesture, not part of the interface, so it uses the platform's two
solid paints and looks the same on both canvases:

| State | Background | Text |
|---|---|---|
| Window focused | `#3366D0` | `#FFFFFF` |
| Window unfocused | `#C7C7C6` | `#000000` |

Both are solid (never translucent) and `!important`, so they override whatever
colour the text underneath carries — links, inline code, syntax tokens. CSS
cannot read window focus: Chromium reaches the inactive paint through its own
internal `-internal-inactive-selection-*` properties, which a stylesheet cannot
address. `src/overrides/selection.js` therefore mirrors `document.hasFocus()`
onto `data-dsh-window-blur` and the stylesheet switches on that attribute; the
selection itself survives the blur.

## Markdown material

A quote is a **container**, not a link: it keeps the prose face on a neutral bar
and wash (text `#B0AEA5`, light `#6E6A60`), and whatever sits inside it keeps its
own material — links stay blue, inline-code chips stay warm red, file mentions
stay link-blue. Never paint the quote itself with the link colour: the colour
inherits into the block's inline code and mentions, which is exactly the leak
that made every path inside a quote read as a link.

**Inline file mentions are links, not code.** The host resolves a file path
inside an inline code span to a button (`.fileMention`, hashed — match it with
`[class*="_fileMention"]`) and paints it with its link alias. The generic
inline-code chip rule is more specific than that class, so a mention inherits
the chip's warm red unless a rule names it. A mention takes the link blue, weight
500, and the link's underline (solid in the link tone at rest, solid and fully
opaque on hover, same thickness and offset — the same treatment the skin gives an
anchor); the chip itself is left alone — the same fill, hairline, radius and
padding as any other inline code. Plain inline code keeps its warm text. Note the
hover rule must set only `text-decoration-color`: the `text-decoration` shorthand
resets `text-decoration-thickness` to `auto` and thins the line mid-hover.

## Inline code

The chip hugs its glyphs. The host builds it as an `inline-flex` box that
inherits the prose line box — 23px for a 15px code size — which left ~5px of
empty wash above and below the text. The skin sets `line-height: 1.2` on inline
code (27px → 22px, with the 1px padding as the visible inset); lower values
start clipping descenders. The fill, hairline, radius and size are unchanged.

## Popovers · 多选一弹层

Every single-choice popover in the skin — the permission menu, the model picker,
the account drawer, the session-stats card, and the host's own menu primitive
under the hero row's workspace and preset pickers — is meant to start from one
recipe. New popovers take it rather than inventing a card.

Two rules hold across all of them, both owned by `overrides/popover-utils.js`. A
pointer opens a card only after a **100 ms dwell** — long enough that crossing a
28px trigger on the way somewhere else unfolds nothing — and the card closes
100 ms after the pointer leaves. Two cards keep their own numbers with the reason
written where they are used: the model picker's levels close after 150 ms (the
pointer has to cross level 1 to reach level 2) and the session-stats card waits
300 ms to open (its sentence sits mid-row, where a passing pointer would trip
it). And **only one card is on screen at a time**: each popover registers its
close path with `registerPopover(name, close)` and calls
`closeOtherPopovers(name)` on the way open, so opening the model picker folds the
permission menu, the account drawer, the stats card and the host's hero menu.

**Card**

| Property | Value |
|---|---|
| background | `var(--dsw-alias-bg-overlay)`; dark `#1e1e1d` |
| border | `1px solid var(--dsw-alias-border-l1)`; dark `#2e2c29` |
| radius | 12px |
| shadow | `0 8px 30px rgba(20,20,19,.12), 0 2px 8px rgba(20,20,19,.06)`; dark `rgba(0,0,0,.5)` / `rgba(0,0,0,.3)` |
| padding | 6px |
| layout | flex column, `gap: 6px` |
| z-index | 99999, above the host's own menus (1100) |
| open | `opacity 0 → 1`, `translateY(4px) scale(.98) → none`, `.15s ease`, origin on the anchor's side |

**Row**

| Property | Value |
|---|---|
| min-height | 32px — a floor, not a cap: a two-line row grows |
| padding | `2px 7px` |
| radius | 6px |
| text | 13px / 20px, `var(--dsw-alias-label-primary)` |
| hover | `var(--dsh-claude-hover-bg, rgba(0, 0, 0, .08))` |
| icon | 16px, `var(--dsw-alias-label-secondary)` |
| two-line row | name 13px / 16px at 500; description 11px / 14px in `label-tertiary` |
| current row | trailing `IconCheckOutline16` in `var(--dsw-alias-brand-primary)` — the accent is what marks the choice |
| disabled | `opacity: .4`, `cursor: not-allowed` |

**Heading, separator, footer**

- heading row: 11px / 16px at 600, `letter-spacing: .04em`, uppercase, `label-tertiary`, `padding: 6px 7px 2px`
- separator: 1px `var(--dsw-alias-border-l1)`, `margin: 2px 4px`
- pinned footer: `margin-top` / `padding-top` 4px, `1px solid var(--dsw-alias-border-l1)` above

**Host surfaces**

The host's dropdown menus are one shared primitive (primitives' `Menu`), and its
two class-name families hash in opposite directions: the primitive ships inside
the web shell as `_<local>_<hash>_<n>` (`_itemWrap_1nxmc_92`,
`_itemLabel_1nxmc_174`), while the client-ui packages hash as `<hash>_<local>`
(`daogkW_itemName`, `p_FcLG_cardWorkspaceTrigger`). A substring matcher therefore
takes the longest stable piece of whichever family it targets — `_itemWrap_`,
`_itemLabel_`, `_viewport_` on one side, `_itemName`, `_itemDesc` on the other —
never the bare local name.

The hero row's two pickers are that primitive, portaled to `<body>` with no
marker of their own. `src/overrides/hero-menu.js` stamps the open card with
`data-dsh-claude-hero-menu` and `components/hero-menu.css` restyles it; the
host's other menus (sidebar row menus, the settings permission row, submenus)
keep the host's own design on purpose. What that replaces: a 20px radius card
with 4px padding, 40px rows at 10px radius, and 14px text.

**All five are aligned**: the account drawer and the stats card were the outliers
(8px row radius, 2px and 4px card gap, 8px padding, 220 / 260px min-width,
z-index 1000 and 100000) and now follow the table above. The hero row's pickers are the host's own menu primitive, which differs in
two ways that CSS cannot change: it mounts instead of toggling a `data-open`
attribute, so it takes the same fade/scale as a one-shot `0.15s` animation; and
the host places it *below* its trigger, which is where the composer sits — so
`src/overrides/hero-menu.js` re-places it beside the trigger (bottom-aligned,
growing upward into the empty hero space, flipping left when the viewport is
tight). The host re-runs its own placement from its anchor geometry on every
frame while the card is open, so the position is handed over in two custom
properties on the card (`--dsh-claude-hero-menu-x` / `--dsh-claude-hero-menu-y`,
written by the same pass that stamps it) which `components/hero-menu.css` reads
with `!important`; that declaration outranks the host's plain inline value.

## Home layouts · 首页版面

The new-conversation page has two arrangements. `homeLayout` (settings: Home
layout) writes `data-dsh-claude-home-layout` onto `<body>` and
`src/styles/components/home-panel.css` branches on it. Both are the host's own
hero markup — the greeting, the workspace row, the dock and the composer card
inside `…_composerStack …_composerHero` — so only the arrangement differs.

| | Classic | Studio |
|---|---|---|
| greeting | centred, 44.2px serif, brand mark on its line | top left, one fixed line naming the user ("What's up next, …?") in the 20px sans UI face, a 21px brand mark on its line |
| composer card | vertically centred in the scroll body | the conversation's single-line inline form, resting on the window's bottom edge (16px foot) |
| between them | — | the usage panel |
| workspace / preset row | the card's footer tray | hairline chips directly above the card |
| column width | the hero's centred box | a 720px composer column; the greeting and the panel form a 480px block against its left edge |

The studio composer is stamped `data-composer-variant="inline"` (composer.js's
pass reads the same preference), so the home card is drawn by the conversation's
single-line stylesheet. The classic tray rules in `composer/card.css` are scoped
away from studio with `:not([data-dsh-claude-home-layout="studio"])`. That is
deliberate: they set `order: 1` / `order: 2` on the same boxes, and a competing
rule would have to be out-specified rather than merely reordered — scoping them
removes the contest.

**The usage panel.** It is a `conversation.input.dock` entry (the host's list
seat between the greeting and the card; a list seat keys its entries by `id`),
and it renders only in the hero phase — the host mounts that same seat inside a
conversation, where the todo, queue and goal bars hang on it. The seat is scoped
to a session, so the cold start screen (no session yet, the card waiting for a
workspace) has none; there the skin mounts the same component on a
`display: contents` element of its own (`.dsh-claude-home-seat`) and drops it
once the host's dock arrives. A window too short for the whole panel shrinks the
panel, never the page: the greeting keeps the top edge, the chips and the card
keep the bottom, and the panel scrolls between them with a 32px fade over its
bottom edge that lifts over the last 32px of travel.

The cold start card waits for a workspace: the host marks it with a dashed ring
and makes every control on it inert, so a press anywhere opens the workspace
picker. In the studio form the ring sits on the single-line input box itself
(the host's dashed stroke and colours, flat, no drop shadow), and the permission
segments fill the card's empty mode strip on the preset a new session starts in
— disabled, like the rest of the card's controls.

The panel is Claude Code's dashboard shape: a flat warm-gray wash (a
`color-mix` of the label tone at 4% over the card tone, which flips with the
theme on its own), an Overview/Models tab pair on the left of its head, and the
All/30d/7d range pills on the right. The active tab and range pill are a gray
chip one step below that wash — half the radius the 20px control would round to,
so it reads as a rounded rectangle rather than a full pill. Overview carries six
stat cells in a 3×2 grid under Claude Code's names (Sessions, Messages, Total
tokens, Active days, Peak hour, Favorite model) whose tiles sit one clear step
deeper than the panel (15% of the label tone) and set a 12px label over a 13px
bold figure — the figure stays barely above its own label, which is also what
lets a long model id such as deepseek-v4.1-flash sit on one line; the favourite
model is a name, not a figure, and keeps the regular weight. Messages are the
settled calls. Once the picked range's total passes one
book, the yardstick line appears under the grid: eleven books from Animal Farm
(39k tokens) to In Search of Lost Time (1.6M), each sized at 1.3 tokens a word.
The book is drawn afresh each time the page comes back to the new-conversation
hero, and a range that has not reached it steps down to the longest book it has
passed, so the range pills keep the same book whenever the totals allow. The heat
grid takes one
equal column per week (twenty-six weeks), square cells from a 3px gutter, in
Claude Code's blue data ramp (`#3b6ecf` at 20/40/65/100 over the neutral empty
cell); because the columns are fractions of the panel's own width, the newest
week can never fall past the edge. Hovering a cell shows Claude Code's day tip at
once: a solid pill in the label ink with the canvas tone for text (so it inverts
with the theme), 13px medium, reading the day in the shell's language and its
messages ("Sep 9 — 15,955"); over the three columns at either end the pill lines
up with the cell's outer edge so it stays inside the panel. The session list's
fallback has no per-day message count, and its tip names the day's tokens.
Models is Claude Code's own shape: one column
per day of the chart's thirty-day window, stacked from the axis up with each
model's slice in its rank's colour (ranks past the ramp share its last, grey
step), four gridlines with their token labels in a 34px left gutter and every
third column's date under it in the shell's language ("Aug 26"), and beneath it
the ranked list — swatch, model name, the input/output split, and the share of
the models shown — folding past six rows behind one "show more" row, which turns
into "show less" once the list is open. The chart
and the list write counts Claude Code's way: one decimal at most, no trailing
".0", a lowercase k ("109M", "963.6k"). The list reads the roll-up's per-model
buckets; the chart reads its per-day per-model map, so a day with nothing
attributed to a model draws no stack. Each column is sized to its day's total
against the axis top and each slice to its share of the day, so the column's
rounding sits on the top of the stack. A range window filters the
tiles (the peak hour included), the yardstick line and the model list; the heat
grid and the chart keep their own windows.

Two sources, in this order: the host half's usage route, then the session list's
own projection block (`tokenUsage`, `modelSelection`, `sessionListMetadata`).
The second answers in a few milliseconds and carries per-model totals without the
four buckets, which is what the list falls back to when the first cannot answer.
The first reads the cost-meter ledger when one covers the newest activity — its
`<provider>:<model>` split becomes the per-model cells, one model across providers
merged into one — and otherwise the accurate per-event fold; both carry each day's
session ids, which a range window unions into one distinct session count. Only
the fold knows the settlement hours: it keeps one hour histogram per day, which a
range window sums into its own peak hour, and behind a cost-meter answer it still
runs for the histograms alone — the ledger's figures land first, and the peak
hour of the sessions whose logs remain lands a moment later. The panel names
which one it drew from, and a figure neither can answer is a dash.

The skeleton keeps the frame's geometry — six fixed-size stat cells, a heat grid
of a fixed cell count, and on the models tab the chart's frame with three
stand-in rows — and the heat grid's empty cell **is** the zero step, so "no data"
and "a day with no usage" stay different things: a missing value draws a
placeholder, a zero day draws the grid's own base tone.

## The composer crab · 输入卡片上的螃蟹

On the studio layout's new-conversation page, Claude Code's pixel crab stands on
the composer card's top edge: 4px cells, a nine-cell shell with two-cell arms
(52×32px), feet on the card's edge and the right arm 8px inside the single-line
card's right edge, so the feet stand where its 18px corner starts to round. The
classic layout keeps its centred hero without the crab. The shell is the clay accent `#d97757` in both
themes, the side-on back is `#b9603f`, the eyes `#141413`, and the rod takes the
tertiary label ink. When the crab is clicked, when the pointer leaves it, and on its own every 25–45
seconds while the page is in view, it plays Claude Code's fishing routine
(about three seconds): a half turn and a wink, the rod raised overhead and cast
down onto the card's edge, a hop, a spell of fishing side-on, and the rod put
away as it turns back to face front. With reduced motion requested, only a click
plays it: the pointer passing by and the idle timer leave it still. Only the crab
takes the pointer; the room the rod swings through does not.

## Implementation notes

- Every rule is scoped under `body[data-dsh-claude-style]`.
- Dark tokens are the base; light overrides use `:not([data-ds-dark-theme])`.

## Architecture · 源码结构

The shipped bundle `lib/client.js` is **generated** — never edit it directly.
Source lives in `src/` and `node scripts/build.mjs` (or `npm run build`)
assembles the bundle. The map below annotates what each source is for; the
assembly order itself is authoritative in `scripts/build.mjs`
(`FRAGMENTS` / `STYLE_FILES`), which the build enforces:

| Source | Content |
|---|---|
| `src/constants.js` | constants, spinner verbs, shared token values (evaluated at build time to fill `%%TOKEN%%` placeholders) |
| `src/assets/brand/*.svg` | brand marks, inlined as CSS `url()` data URIs at build time (the loader exposes no asset URLs) |
| `src/assets/icons/combine/*.svg` | vendor lockups (Lobe Icons mark + wordmark composed into one SVG, MIT), inlined as JS markup tables at build time; bound to models by `model-descriptions.json` → `brands` |
| `src/assets/icons/*.svg` | hand-provided lockup artwork (e.g. ChatGPT), which the vendoring step prefers over anything fetched; `brands.lockups` may also point a brand's two halves at different Lobe icons or crop a wordmark |
| `src/styles/tokens.css` | design tokens (dark base + ivory light) |
| `src/styles/typography.css` | serif display / sans UI / mono code, editorial markdown |
| `src/styles/chrome.css` | canvas, hairlines, clay accent, chrome details |
| `src/styles/composer/hero.css` | hero brand mark and headline |
| `src/styles/composer/card.css` | composer input card and footer tray (gated by composer preference) |
| `src/styles/composer/inline.css` | in-conversation single-line composer (gated by composer preference) |
| `src/styles/composer/inline-bar.css` | the inline composer's trailing bar: model trigger and merged time/usage stats line (gated by composer preference) |
| `src/styles/sidebar.css` | sidebar brand, new-session row, workspace tree |
| `src/styles/components/workspace.css` | the workspace section's 进行中 / 已归档 segment control and the skin's own archived list |
| `src/styles/components/permissions.css` | permission segments and popover |
| `src/styles/components/account-footer.css` | account row and floating popover |
| `src/styles/components/ban-screen.css` | the account-hold easter egg (full-window overlay) |
| `src/styles/components/model-picker.css` | model picker popovers |
| `src/styles/components/effort-picker.css` | the reasoning-effort card, slider and its trigger |
| `src/styles/components/popover.css` | shared popover chrome: header, body and menu rows |
| `src/styles/components/hero-menu.css` | the host's menu primitive under the hero row's workspace/preset pickers (composer-gated) |
| `src/styles/components/footer-takeover.css` | host footer takeover rules |
| `src/styles/components/third-party.css` | agy-link repair rules |
| `src/styles/components/settings.css` | settings page section |
| `src/styles/components/home-panel.css` | the studio home layout and the usage panel's shell (keyed on the attribute `home-layout.js` writes) |
| `src/styles/components/home-overview.css` | the usage panel's Overview tab: stat cells, heat grid, yardstick line |
| `src/styles/components/home-models.css` | the usage panel's Models tab: the stacked chart and the ranked list |
| `src/styles/components/mascot.css` | the pixel crab: its seat on the card's top edge and its inks |
| `src/styles/components/theme-flip.css` | theme-flip transition suppression |
| `src/context/host.js` | host accessors and helpers |
| `src/context/prefs.js` | preference store |
| `src/context/model-copy.js` | model copy document store |
| `src/context/i18n.js` | localized copy lookups |
| `src/overrides/popover-utils.js` | shared anchor positioning and hover intent |
| `src/overrides/composer.js` | composer layout feature: each pass writes the variant, gate, attachment and context-ring attributes the composer stylesheets read |
| `src/overrides/copy.js` | composer/copy rewrites installer |
| `src/overrides/session-stats.js` | session-stats card factory (`createSessionStats`), the permissions feature's split-out half |
| `src/overrides/permissions.js` | permission segments/popover installer (the stats card lives in `session-stats.js`) |
| `src/overrides/model-brand.js` | brand lockup lookup: maps a catalog model to its vendored lockup through the `brands` bindings |
| `src/overrides/model-copy-lookup.js` | model copy lookup: exact entry → family rule → tier rule → the catalog's own text |
| `src/overrides/model/catalog.js` | model catalog factory (`createModelCatalog`): the per-session ModelDirectory store |
| `src/overrides/model/rows.js` | model row factory (`createModelRows`): option cells, provider rules, level-1 sections |
| `src/overrides/model-picker.js` | model picker installer, wiring the `model/` factories (thin orchestration) |
| `src/overrides/effort/matrix.js` | effort matrix factory (`createEffortMatrix`): the tier data the slider snaps to |
| `src/overrides/effort/control.js` | effort control factory (`createEffortControl`): the reasoning-effort slider and its card |
| `src/overrides/effort-picker.js` | effort picker installer, wiring the `effort/` factories (thin orchestration) |
| `src/overrides/hero-menu.js` | stamps the host menu card the hero row's pickers open |
| `src/overrides/quick-providers.js` | the settings page's quick-providers multi-select popover |
| `src/overrides/account/profile.js` | account profile factory (`createAccountProfile`): signed-in name/avatar reads and retries |
| `src/overrides/account/host-menu.js` | host account menu factory (`createHostAccountMenu`): reads and drives the host's own menu |
| `src/overrides/account/rows.js` | account rows factory (`createAccountRows`): the account popover's row builders |
| `src/overrides/account/footer-mirror.js` | footer mirror factory (`createFooterMirror`): redirects other plugins' footer entries into the drawer |
| `src/overrides/account/surface.js` | account surface factory (`createAccountSurface`): one row model, picks the mount point each pass (the host's account menu or the self-built popover) |
| `src/overrides/account-footer.js` | account drawer installer, wiring the `account/` factories (thin orchestration) |
| `src/overrides/ban-screen.js` | account-hold easter egg installer |
| `src/overrides/theme-flip.js` | suppresses transitions during a theme flip, so colours and shapes land together |
| `src/overrides/workspace-view.js` | workspace section feature: the 进行中 / 已归档 segments and the archived list (row delete goes through the plugin's own route) |
| `src/overrides/view-tabs.js` | conversation view tabs: moves the tab bar onto the title row when it fits, and places the pill that slides to the active tab |
| `src/overrides/home-layout.js` | home layout feature shell: writes the layout attribute, registers the usage panel into the host's dock seat, and draws the panel's head |
| `src/overrides/home/data.js` | the usage panel's data: the roll-up route, the session list's fallback, and the figures both tabs read |
| `src/overrides/home/overview.js` | the usage panel's Overview tab: stat cells, heat grid, yardstick line |
| `src/overrides/home/models.js` | the usage panel's Models tab: the stacked chart and the ranked list |
| `src/overrides/mascot.js` | the pixel crab on the new-conversation card: its poses as one inline SVG, and the fishing routine |
| `src/overrides/scheduler.js` | scheduler, observers, subscriptions, teardown |
| `src/overrides/selection.js` | mirrors the window's focus state onto the document for the two text-selection paints |
| `src/settings.js` | settings section (brand switch) |
| `src/entry.js` | `apply()` orchestrator + exports |
| `src/model-descriptions.json` | model copy (picker labels + per-model descriptions); validated at build time and **copied** to `lib/`, not inlined |

Fragments share one factory scope at runtime — no `import`/`export`, 4-space
base indent; the build rejects unsubstituted `%%TOKENS%%` and refuses to emit a
bundle that fails to parse. The hard rules for fragments, model copy and host
selectors live in `AGENTS.md` (the selector section below is the detail page it
points to); the reasoning behind them is in `docs/architecture.md` (D1, D3, D5).

Model copy is the one thing that does **not** go into the bundle: the build
copies `src/model-descriptions.json` to `lib/` and the host half serves it, so
the table grows without a rebuild. The picker's brand bindings ride the same
document under `brands`; the note inside the file explains why a model no rule
claims draws no lockup at all.

### Host selector discipline · 宿主选择器纪律

The host uses hashed CSS-module classes (`p_FcLG_row`, `_0cyzDW_viewArea`, …).
Substring matchers must use the **longest stable fragment**, and every new
rule should be checked for accidental hits:

- `[class*="_row"]`, never `[class*="row"]` — the bare substring also matches
  the composer growth wrapper `…_grow` and pinned the input field to 28px.
- Never override the host's active-phase layout contract on
  `[class*="viewArea"]` (`flex: 1 0 auto; min-height: auto`) — it is what
  keeps the sticky composer seat pinned to the scrollport bottom.
- An anchor that carries a host button class (`_linkButton`, e.g. the settings
  page's "充值") is a filled or outlined control, not a text link: it states its
  own ink. The blanket anchor colour excludes that class — painting it leaves a
  filled button's label the same colour as its fill.

`node scripts/probe.cjs --token <launch-token>` drives a headless Chrome over
CDP and asserts the invariants (composer pinned at bottom, single-line start,
content growth). `node scripts/shoot.cjs --token <launch-token>` recaptures
the README screenshots (`docs/light.png` / `docs/dark.png`), swapping personal
data for neutral stand-ins in the DOM before any pixel is written.
