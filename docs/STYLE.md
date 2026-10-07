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

**The DeepSeek brand's palettes.** The DeepSeek brand turns both palettes
blue. The single accent is DeepSeek's brand blue `#4D6BFE` — the colour of its
whale logo and of Deepy — with a darker step for text links on the light canvas
and a lighter one on the dark; the sidebar's whale and wordmark and the hero's
fish take it as their ink. The neutrals are the host's own cool family (its
`neutral-bluish` ramp) under a white carrying only a hint of sky in light and a
blue-black in dark. User bubbles take a blue tint as the host's own do, and
inline code keeps the body ink as the host draws it. The skin's Claude marks
(the account row's
picture without an avatar, the turn status line's spark) become DeepSeek's
whale (`src/assets/brand/deepseek-mark.svg`, the host's `FISH_LOGO_PATH`); the
violet top rung of the reasoning slider stays.

| Token | Claude light | DeepSeek light | Claude dark | DeepSeek dark | Use |
|---|---|---|---|---|---|
| accent | `#D97757` | `#4D6BFE` | `#D97757` | `#4D6BFE` | brand primary, primary / info fills, checks, business primary (dark `#6A84FF`) |
| accent hover | `#C6613F` | `#3A57E8` | `#E08A6D` | `#6A84FF` | primary / info button hover |
| link | `#C6613F` / `#A94F2F` | `#3B56D9` / `#2C43B8` | `#E08A6D` / `#F0A488` | `#8FA4FF` / `#B0C0FF` | text link at rest / under the pointer |
| markdown link | `#184F95` | `#3B56D9` | `#8AB4F8` | `#8FA4FF` | `--dsh-claude-link` |
| brand art | `#141413` | `#4D6BFE` | `#FAF9F5` | `#4D6BFE` | sidebar whale and wordmark, `--dsh-claude-logo-ink` |
| canvas | `#FCFCFB` | `#FAFBFF` | `#141413` | `#13161D` | bg base / layer 1, `--dsh-claude-canvas` |
| sidebar | `#FBFBF9` | `#F7F9FF` | `#141413` | `#13161D` | sidebar, `--dsh-claude-sidebar-canvas` |
| layers | `#FBFBF9` / `#F9F9F6` | `#F7F9FF` / `#F4F7FE` | `#242320` / `#2E2C29` | `#212631` / `#2A303C` | layer 2 / layer 3 |
| raised card | canvas | canvas | `#1E1E1D` | `#1B1F28` | popovers, menus, search palette, `--dsh-claude-raised` |
| hairlines | `#E8E6DC` / `#DEDCD2` / `#D0CDC1` | `#E7ECF7` / `#DDE4F1` / `#CFD8EA` | `#242320` / `#2E2C29` / `#3A3833` | `#212631` / `#2A303C` / `#363D4B` | border l1 / l2 / l3 |
| solid hover | `#F0EFE9` | `#EEF3FC` | `#2E2C29` | `#2A303C` | the host's solid hover chip |
| chip | `#F6F6F4` | `#F2F6FD` | selector | selector | segmented control and switch at rest, `--dsh-claude-chip` |
| table head | `#F0F0EF` | `#EFF3FB` | `#242320` | `#212631` | `--dsh-claude-table-head` |
| inks | `#141413` / `#6E6A60` / `#8F8A7E` / `#A6A094` | `#0F1115` / `#61666B` / `#81858C` / `#ADB2B8` | `#FAF9F5` / `#B0AEA5` / `#8F8D84` / `#6B6A65` | `#EEF1F8` / `#AEB5C4` / `#8A92A3` / `#666E7E` | label primary / secondary / tertiary / caption |
| user bubble | hover wash | `#EAF0FE` | host's | `#232A3A` | `--dsw-specific-bubble` |
| hover wash | `rgba(0, 0, 0, 0.08)` | `rgba(38, 49, 72, 0.08)` | `rgba(255, 255, 255, 0.08)` | `rgba(255, 255, 255, 0.08)` | `--dsh-claude-hover-bg` |

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

## Two palettes · 两套配色归属

The Colours and Typefaces rows each choose who paints: **Claude** (the default)
or **Follow the host**. Every rule that writes a host token carries the Claude
gate in its selector — `%%PALETTE_CLAUDE%%` for colours, `%%TYPEFACE_CLAUDE%%`
for `--dsw-font-*` — and so does every rule that paints the skin's canvas onto
the host's frame (`<html>`, `<body>`, `#root`, the sidebar and conversation
columns); the build refuses an ungated one. Under "follow the host" those rules
drop out: the host's own tokens stand, or another theme plugin's, such as a
wallpaper plugin that clears the canvas and turns the overlays to glass.

The skin's own surfaces read only its private tokens and host tokens. Under the
host palette each private token is an alias of a host token, so those surfaces
follow whoever paints the host's. A new private colour token is written into
both the Claude blocks and the host block (the build checks the host block
covers every one). Cards take the host's overlay layer rather than its canvas:
a plugin that clears the canvas still gives its overlays a readable fill, and the
shared popover card blurs what lies behind it (`blur(16px) saturate(1.4)`).

| Private token | Host alias | Use |
|---|---|---|
| `--dsh-claude-canvas` | `--dsw-alias-bg-base` | the page canvas, the search box |
| `--dsh-claude-sidebar-canvas` | `--dsw-specific-sidebar-fill` | the sidebar |
| `--dsh-claude-raised` | `--dsw-alias-bg-overlay` | popovers, menus (dark) |
| `--dsh-claude-card` | `--dsw-alias-bg-overlay` | cards on the canvas in light and raised in dark: the account popover, the search palette |
| `--dsh-claude-chip` | `--dsw-specific-selector` | segmented control and switch at rest |
| `--dsh-claude-hover-bg` | `--dsw-alias-interactive-bg-hover` | hover wash |
| `--dsh-claude-inline-code-bg` / `-fg` | `--dsw-alias-markdown-inline-code` / `--dsw-alias-label-primary` | inline code |
| `--dsh-claude-link` / `-underline` / `-hover` | `--dsw-alias-link` (underline at 60%) | markdown links |
| `--dsh-claude-ink-strong` / `--dsh-claude-session-ink` | `--dsw-alias-label-primary` / `--dsw-alias-label-secondary` | active row ink, session title at rest |
| `--dsh-claude-table-head` | `--dsw-alias-bg-layer-2` | table header row |
| `--dsh-claude-scrollbar` / `-hover` | `--dsw-alias-border-l2` / `--dsw-alias-label-caption` | scrollbar thumb |
| `--dsh-claude-inverse-fill` / `-ink` | `--dsw-alias-interactive-bg-hover` / `--dsw-alias-label-primary` | the model picker's group label (an inverted chip under Claude, a hover-plate chip under the host) |
| `--dsh-claude-logo-ink` | `--dsw-alias-label-primary` | sidebar brand art |

Under the host typeface the skin's own faces fall back to the host's:
`--dsh-claude-font-serif`, `-prose` and `-brand` to `--dsw-font-family` (the host
carries no serif), `--dsh-claude-font-code` to `--ds-font-family-code`.

Two colours stay whoever paints: the reasoning slider's violet top rung
(`--dsh-claude-apex*`) and the account-hold page, which reproduces a Claude
screen. Translucent neutral hover tints and the usage panel's data colours stay
literal; they read on any canvas. Every other colour that paints a surface, a
text, a border or an accent reads a token.

## Windows titlebar · 桌面顶栏

On the Windows desktop the 40px caption row has no colour of its own: the
sidebar and the conversation run to the window's top edge, each in its own
fill (`--dsh-claude-sidebar-canvas`, `--dsh-claude-canvas`), and the sidebar's
1px `--dsw-alias-border-l1` hairline runs with them from the top edge to the
bottom. The conversation column and the fullscreen file panel lose the host's
16px top-left corner, so the hairline meets them straight. The three window
buttons sit on the page itself: no block of their own behind them, and they dim
with a modal's mask like everything else. Their hover plate is the system's, a
tint of the button glyph's colour.

## Typography

- **Serif display** — headings / editorial statements (`--dsh-claude-font-serif`).
- **Sans UI** — chrome, body (`--dsw-font-family`).
- **Mono** — code, technical labels (`--dsh-claude-font-code`).


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
address. `src/features/selection/selection.ts` therefore mirrors `document.hasFocus()`
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
the account drawer, and the host's own menu primitive under the hero row's
workspace and preset pickers — is meant to start from one recipe. New popovers
take it rather than inventing a card.

Two rules hold across all of them, both owned by `shared/popover.ts`. A
pointer opens a card only after a **100 ms dwell** — long enough that crossing a
28px trigger on the way somewhere else unfolds nothing — and the card closes
100 ms after the pointer leaves. One card keeps its own number with the reason
written where it is used: the model picker's levels close after 150 ms (the
pointer has to cross level 1 to reach level 2). And **only one card is on screen
at a time**: each popover registers its close path with `registerPopover(name,
close)` and calls `closeOtherPopovers(name)` on the way open, so opening the
model picker folds the permission menu, the account drawer and the host's hero
menu.

The context meter's popover is the host's own panel (it portals it, places it,
and dismisses it), so the skin drives its trigger on hover and paints nothing of
the shell itself. What it carries is described under "Context popover" below.

**Card**

| Property | Value |
|---|---|
| background | `var(--dsw-alias-bg-overlay)`; dark `#1e1e1d` |
| border | `1px solid var(--dsw-alias-border-l1)`; dark `#2e2c29` |
| radius | 12px |
| shadow | `0 8px 30px rgba(20,20,19,.12), 0 2px 8px rgba(20,20,19,.06)`; dark `rgba(0,0,0,.5)` / `rgba(0,0,0,.3)` |
| padding | 6px |
| layout | flex column, `gap: 6px`; a list body stacks its rows 3px apart |
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
marker of their own. `src/features/hero-menu/hero-menu.ts` stamps the open card with
`data-dsh-claude-hero-menu` and `features/hero-menu/hero-menu.css` restyles it; the
host's other menus (sidebar row menus, the settings permission row, submenus)
keep the host's own design on purpose. What that replaces: a 20px radius card
with 4px padding, 40px rows at 10px radius, and 14px text.

The stamp's value names the picker (`workspace` or `preset`), because the two
cards differ. The preset card keeps the popover table's 32px rows for its
two-line entries. The workspace card is Claude Code's folder menu: a 180px-min
card with 4px padding, 26px plain-text rows (no folder glyph in front of each
folder, no `＋` on the pinned add row) and the accent check on the current one.

**The account card** is that primitive too, and it carries the skin's rows
inside it. The host mounts it with nothing but its own three entries and places
it from that geometry; `features/account/surface.ts` injects the skin's container
a frame later, the card grows, and the host re-places it on the frame after the
list changed. Nothing may be painted in between: the card would fade in at the
height and the place it is about to leave — low, then jumping up mid-fade. So
while the account row is armed the card stays unpainted (the same armed window
that carries its one-shot entrance), and the feature stamps
`data-dsh-claude-account-ready` once the skin's rows are inside it and its
placement has been read twice with the same value. The entrance animation hangs
on that stamp, so it plays on the card the reader will actually see.

## Context popover · 上下文弹层

The context meter's popover is the host's own panel: the skin opens it by
pressing the host's trigger (hover, with the shared 100 ms dwell and close
grace, gated on the "open popovers on hover" preference; a click still works),
and paints nothing of its shell or its dismissal. It mounts
instead of toggling `data-open`, so the feature stamps the panel and it takes
the cards' own short rise as a one-shot animation — same 4px, same `scale(.98)`,
same 0.15s — and a surface the skin opens arrives the same way wherever it is
the host's.

Its horizontal place is the one thing the skin takes over. ui-chat hangs the
panel from the anchor's LEFT edge and only then clamps it into the viewport
(`useStatDialog`, align `start`), so a trigger at the end of the composer row
leaves the panel against the window's right margin instead of under the ring.
`features/context-stats/session-stats.ts` reads the meter's right edge and the
panel's own layout width — `offsetWidth`, not its rect: the entrance scales the
box, and a transformed rect is two per cent narrower than the one that settles —
and writes `--dsh-claude-context-panel-left` with the mark that turns it on;
`features/composer/inline-bar.css` reads it with `!important`, which outranks the
host's inline value. The reading is re-taken when the panel's box changes (a size
subscription on the observation bus) and when the viewport moves (`reposition('viewport')`).

What the skin appends to it is the session's numbers
(`features/context-stats/session-stats.ts`), read from the host's `sessionStats`
and `tokenUsage` projections — the same durable whole-log values the host's own
pills render — never by opening the host's stat dialogs. The labels and the
duration / token templates come from the host's `chat` locale namespace, so the
two surfaces read the same words; the host's small formatting rules
(`formatDuration`, `formatTokensPerSecond`, `formatExactTokens`,
`formatCacheHitPercent`) are mirrored so the figures match character for
character.

Which figures appear follows the host's statistics row. Its detailed form gets
the whole list. Its compact form carries only the output speed and the cache-hit
share on the composer line, so the block keeps the four that row leaves out —
the total time, the first-token average, the output speed and the cache-hit
share. The total is the one figure the host has no word for (its dialog names
the model's time and the tool calls' separately): it is their sum, labelled from
the skin's own copy (`contextTotalTime`).

The block: a 1px `var(--dsw-alias-border-l1)` rule and 10px above it, then per
section an 11px / 16px heading at 600 in `label-tertiary` and a two-column grid
(6px by 10px). A row is a stack: 12px / 16px label in `label-tertiary` over a
14px / 20px value at 500 in `label-primary`, the value in tabular figures so
numbers do not dance as they change. Rows follow the host's own rules — one
appears only when its input exists — and the block is rewritten on every
projection frame while the panel is open.

While the projections have answered nothing, the block holds the numbers' place
under the two real headings: bars at a row's own 37px (16 + 1 + 20) in the host's
solid hover fill, pulsing over 1.6s (still under the reduced animation choice).
The place is given up after 2s, so a host that serves no such projection ends at
the panel it drew itself rather than keeping placeholder bars.

**All five are aligned**: the account drawer was the outlier
(8px row radius, 2px and 4px card gap, 8px padding, 220 / 260px min-width,
z-index 1000 and 100000) and now follows the table above. The hero row's pickers are the host's own menu primitive, which differs in
two ways that CSS cannot change: it mounts instead of toggling a `data-open`
attribute, so it takes the same fade/scale as a one-shot `0.15s` animation; and
the host places it *below* its trigger, which is where the composer sits — so
`src/features/hero-menu/hero-menu.ts` re-places it on the trigger the way the
skin's own composer pickers sit: right-aligned with the trigger and opening
upward by the same 6px air, flipping below only when the viewport leaves no room
above, and clamped to the 8px viewport margin (`POPOVER_MARGIN`). The host
re-runs its own placement from its anchor geometry on every frame while the card
is open, so the position is handed over in two custom properties on the card
(`--dsh-claude-hero-menu-x` / `--dsh-claude-hero-menu-y`, written by the same
pass that stamps it) which `features/hero-menu/hero-menu.css` reads with
`!important`; that declaration outranks the host's plain inline value.

## Search · 搜索

**Sidebar box.** The box takes the brand's place in the logo row while the
pointer is over the sidebar: 32px tall, 8px radius, a 1px `#E8E6DC` hairline on
the ivory canvas fill (dark: `#2E2C29` on `#1E1E1D`), a 16px search glyph in the
secondary label, the "Search" label in the tertiary label at 14px, and the
host's search shortcut as 20px keycaps at the right end. It is a button like
the New session and Plugins rows below it: the pointer cursor, and on hover the
same plate those rows take (`--dsh-claude-hover-bg`, dark `rgba(255, 255, 255,
0.08)`) laid over its opaque fill. Box and brand share one grid cell and
cross-fade over 0.16s, the timing the workspace heading and its segmented
control trade places with; the box is excluded from the window drag region. In
the desktop titlebar mode the brand row rises 10px, since the sidebar column
starts under the 40px titlebar — as far as it goes with the box still wholly
below that edge, which clips the column.

**Palette.** A modal card set 8vh from the top, 760px wide at most, 16px radius,
on the same ivory fill (dark `#1E1E1D`) under the host's mask. From the top: a
17px borderless input with a 28px close button; the category chips (32px tall,
8px radius, 14px, tertiary at rest and primary when current) sharing one
sliding highlight at `rgba(20, 20, 19, 0.06)`; the list, capped at
`min(520px, 62vh)`, with 13px tertiary section captions and 40px rows (8px
radius, 15px title, an 18px glyph in the secondary label, a 13px tertiary detail
after the title and an optional 13px tertiary excerpt line under it, the match
inside it in the primary label at weight 500 with no fill); a hairline-topped footer
of hints with 20px keycaps. The input text, the chips' text, the captions and
the row glyphs all start on one vertical line 24px in from the card edge. The
highlighted row takes `rgba(20, 20, 19, 0.05)` (dark `rgba(250, 249, 245, 0.07)`)
and shows the Enter glyph; the others hide it. The card fades in and settles
from 6px above at 98.5% scale over 0.18s; on close card and mask fade out
together over 0.14s before the modal unmounts.

## Turn status · 轮次状态行

A running, stopped or failed turn's status line sits after the turn's work (its
footer and queued messages below it), 4px under the last row, with no rule under
it: a 14px Claude spark in the brand clay (`--dsw-alias-brand-primary`,
`#D97757`), 8px gap, then the text in the tertiary label at the host's secondary
content size (13px, 24px line), one line with an ellipsis. Parts are joined by
` · `: `elapsed · N tokens · action` while the turn runs, `Stopped` or `Failed`
(the host's words) `· duration · N tokens` after; the token part is left out
until a finished step has reported usage. While the turn runs the spark turns a
full circle every 2.4s, breathing down to 78% at the half turn, in every
animation setting, like the sidebar's background-work ring; a stopped or failed
turn's spark stands still. A turn that finishes normally keeps the host's own
control.

## Home layouts · 首页版面

The new-conversation page has two arrangements. `homeLayout` (settings: Home
layout) writes `data-dsh-claude-home-layout` onto `<body>` and
`src/features/home/home-panel.css` branches on it. Both are the host's own
hero markup — the greeting, the workspace row, the dock and the composer card
inside `…_composerStack …_composerHero` — so only the arrangement differs.

| | Classic | Studio |
|---|---|---|
| greeting | centred, 44.2px serif, brand mark on its line | top left, one fixed line naming the user ("What's up next, …?") in the 20px sans UI face, a 21px brand mark on its line |
| composer card | vertically centred in the scroll body | the conversation's single-line inline form, resting on the window's bottom edge (16px foot) |
| between them | — | the usage panel |
| workspace / preset row | the card's footer tray | hairline chips directly above the card |
| column width | the hero's centred box | a 720px composer column; the greeting and the panel form a 480px block against its left edge |

The studio composer is stamped `data-composer-variant="inline"` (composer.ts's
pass reads the same preference), so the home card is drawn by the conversation's
single-line stylesheet. The classic tray rules in `features/composer/card.css` are scoped
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
book, the yardstick line appears under the grid: sixty-five books from Tao Te
Ching (7.6k tokens) to In Search of Lost Time (1.6M), the public-domain ones
measured by feeding their full text to the o200k_base tokenizer (the English
original or the standard English translation; Faust in German) and the rest
estimated (1.3 tokens a word for English, 0.96 tokens a character for modern
Chinese prose). The line states the rounded multiple as a share of the book
("~2× the tokens in Moby-Dick"), never as an excess over it.
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

Claude Code's pixel crab is the mascot under the Claude brand (or when picked in
the Mascot row). It stands where Deepy does — the composer card's top edge on
both home layouts, the input area or the panel that replaces its card in a
conversation (unless Where it appears keeps it to the home page) — and follows
the same states with the same keys. It is drawn on a 52×36 grid of cells at 2px
a cell, crisp (`pixelated`, 104×72px): feet on the bottom row, on the edge of
what it stands on; the right claw four cells in from the grid's right edge, so
it stands 8px inside the card's right edge, where the 18px corner starts to
round, and the four spare cells take a lean, a note or a sparkle. The resting
crab — shell 16×12 cells, claws 4×4, eyes 2×2, four legs 2×4 — is 48×32px
(columns 24–47, rows 20–35) and only it takes the pointer. The shell is the clay
accent `#d97757` in both themes, the side-on back `#b9603f`, the eyes `#141413`;
the props (the laptop, the thought bubble, letters, notes, the hard hat) are an
ink mask filled with the tertiary label ink. Every frame lasts 80ms, Claude
Code's pace. Its laptop frames are Claude Code's own routine; the rest are drawn
by `scripts/draw-crab.py` after the same character. With the animation choice
resolved to "reduced" each state holds its still frame; a click or a pull still
plays its reaction.

| State | Animation | Still frame |
|---|---|---|
| idle, every 20–40 s a look around, a claw wave or Claude Code's whole laptop routine | `idle`, `idle-look`, `idle-wave`, `idle-laptop` | 0 |
| the model reasons or has not answered: eyes up to a thought bubble | `thinking` | 18 |
| the model writes or tools run: 1 / 2 / 3+ sessions at work (typing / headphones / typing in a hard hat) | `typing` / `music` / `building` | 0 / 0 / 0 |
| subagents running: 1 / 2+ (headphones / conducting) | `music` / `conducting` | 0 / 0 |
| a compaction runs: squashed | `compacting` | 3 |
| an approval, a question or a plan review waits: an exclamation mark | `notification` | 0 |
| a tool call or a turn failed (4.8 s): crossed eyes, a shake | `error` | 4 |
| a turn or a compaction finished (5.2 s): hops, claws up | `happy` | 3 |
| a quiet minute / the next pointer move or key | `sleeping` / `waking` | 0 / 11 |
| a click on the left / right half, four quick clicks, a pull | `poke-left` / `poke-right`, `tickle`, `drag` | 0 |

## Deepy · 小鲸鱼

Under the DeepSeek brand (or when picked in the Mascot row) the mascot is
Deepy, the pixel whale of the Deepy theme pack: a 52×52 grid of logical pixels drawn at 2px a pixel (a 104px
square), its ground line — row 48.5, the middle of its shadow — on the top edge
of what it stands on. Every sheet's crop box reaches 3px past that ground line,
and the whale paints over the host's cards, so its box is lifted by those 3px:
the sprite's last row lands on the card's top edge, and the shadow's tail stays
off the card instead of being stamped across it. Its box is 8px in from the
right end of the card it stands over. On the home page that is the composer card
(both layouts); in a conversation it is the whole input area, and the panel that
replaces the card while the reader is asked for something (those panels start
6–8px above their card). Every frame lasts 50ms. The sheets carry five device
pixels to a logical pixel and are scaled down smoothly, so the whale stays crisp
from 1× to 2× screens without `image-rendering: pixelated`, which would drop
rows on a downscale. The body is Deepy's blue `#4E6FFF` with a navy `#142660`
outline and a white belly in both themes; on the dark canvas the outline and the
soft shadow recede and the blue body carries the shape. Only the resting body
(columns 12–44, rows 30–48) takes the pointer. With the animation choice
resolved to "reduced" each state holds its still frame; a click or a pull still
plays its reaction.

| State | Animation | Still frame |
|---|---|---|
| idle, every 20–40 s a look around or a spout | `idle`, `idle-look`, `idle-spout` | 0 |
| the model reasons or has not answered | `thinking` | 20 |
| the model writes or tools run: 1 / 2 / 3+ sessions at work | `typing` / `music` / `building` | 16 / 0 / 0 |
| subagents running: 1 / 2+ | `music` / `conducting` | 0 / 6 |
| a compaction runs | `compacting` | 20 |
| an approval, a question or a plan review waits | `notification` | 12 |
| a tool call or a turn failed (4.8 s) | `error` | 24 |
| a turn or a compaction finished (5.2 s) | `happy` | 44 |
| a quiet minute (no work, no pointer move or key) / the next pointer move or key | `sleeping` / `waking` | 10 / 29 |
| a click on the face / the tail, four quick clicks, a pull | `poke-left` / `poke-right`, `tickle`, `drag` | 0 |

## Implementation notes

- Every rule is scoped under `body[data-dsh-claude-style]`.
- Dark tokens are the base; light overrides use `:not([data-ds-dark-theme])`.
- A surface's stylesheet sits beside its feature under `src/features/<feature>/`;
  the look no single feature owns is in `src/theme/`, and the parts several
  features share (the popover card and rows, the sliding highlight) are in
  `src/shared/`. The host selector discipline and the style checks the build
  runs are in `docs/decisions/` (D3, D4, D9, D19, D30, D37).

