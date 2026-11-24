# Style Guide · 设计令牌

Design tokens and cross-feature visual rules for `dsh-claude-style`.

## Where values live

Colours, durations, easings and nonlocal stacking levels live in `packages/client/src/theme/tokens.json` (D9, D48). Component-local lengths stay in each feature's stylesheet under `packages/client/src/features/<feature>/`, mascot frame geometry stays in `packages/client/src/features/mascot/sheets.ts`, and page-scale math stays in `packages/client/src/shared/page-zoom.ts` and `packages/client/src/shared/page-scale.ts`. The three tables below are generated from `packages/client/src/theme/tokens.json` by `npm run build`; edit `tokens.json` directly.

## Palette and colour cards

Six built-in colour presets (`claude`, `deepseek`, `parchment`, `forest`, `dusk`, `rose`) and user-defined schemes share one five-seed model (`accent`, `background`, `text`, `code`, `link`) with dark outline modes (`highlight` or `surface`) and brand mark inks (`original`, `accent`, `text`, D97).

- Never use pure `#000000` or cold untinted grays; surfaces, inks and borders derive from each card's seed ladder.
- Keep accent fills under roughly 10% of visible chrome.
- Rules that override host palette tokens or paint frame backgrounds must carry the `[data-dsh-claude-palette]` gate so turning `palette` to `host` yields cleanly to the host or wallpaper plugins. Every private `--dsh-claude-*` colour token declares a `hostAlias` in `tokens.json`.
- Context window categories use eight fixed semantic tokens (`--dsh-claude-context-system`, `-tools`, `-messages`, `-assistant`, `-tool-call`, `-tool-result`, `-attachment`, `-fixed`, D104).

<!-- generated:tokens (packages/client/src/theme/tokens.json) -->
| Card | Accent | Canvas light | Canvas dark | Text light | Text dark | Sidebar light | Sidebar dark | Bubble light | Bubble dark | Link light | Link dark | Edges | Logo ink | Code light | Code dark |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude (default) | `#d97757` | `#ffffff` | `#191919` | `#161616` | `#fdfdfd` | `#fafafa` | `#1f1f1f` | `#f4f2f3` | `rgba(255, 255, 255, 0.06)` | `#184f95` | `#8ab4f8` | highlight | ink | `#161616` | `#fdfdfd` |
| deepseek | `#4d6bfe` | `#fbfcff` | `#13161d` | `#131416` | `#f4f9ff` | `#f7f9ff` | `#13161d` | `#ecf0ff` | `#262b36` | `#3b56d9` | `#8fa4ff` | surface | accent | `#0f1115` | `#eef1f8` |
| parchment | `#b5673a` | `#f7f1e3` | `#1d1a16` | `#100c04` | `#fffef9` | — | — | — | — | `#8f4a1c` | `#e3a676` | highlight | ink | `#2a241c` | `#f3ecdf` |
| forest | `#3f8f6f` | `#f7fbf7` | `#151a17` | `#101310` | `#f7fffa` | — | — | — | — | `#256b50` | `#7fcfae` | surface | ink | `#14201a` | `#e9f2ec` |
| dusk | `#8a6ae6` | `#faf8ff` | `#18161f` | `#121116` | `#fcf9ff` | — | — | — | — | `#5b3fc4` | `#b3a1ff` | surface | ink | `#17132a` | `#efecfa` |
| rose | `#d4577c` | `#fdf1f2` | `#1d1618` | `#140c0d` | `#fff9fc` | — | — | — | — | `#a8325a` | `#f29bb4` | highlight | ink | `#24141a` | `#f8ecef` |

| Tone | Seed | Light | Dark |
| --- | --- | --- | --- |
| `canvas` |  | `Δl 0` | `Δl 0` |
| `surface-1` |  | `Δl 0` | `Δl +0.036` |
| `surface-2` |  | `Δl 0` | `Δl +0.065` |
| `surface-3` |  | `Δl +0.002` | `Δl +0.104` |
| `overlay` |  | `Δl +0.01 · C 0` | `Δl +0.065` |
| `code-block` |  | `Δl +0.01 · C 0` | `Δl +0.036` |
| `inset` |  | `Δl +0.01 · C 0` | `Δl -0.024` |
| `card` |  | `Δl 0` | `Δl +0.044` |
| `table-head` |  | `Δl -0.034` | `Δl +0.065` |
| `hover-plate` |  | `Δl -0.034` | `Δl +0.104` |
| `selector` |  | `Δl -0.004` | `Δl +0.104` |
| `chip` |  | `Δl -0.019` | `Δl 0` |
| `sidebar` |  | `Δl -0.002 · ΔC +0.002` | `Δl 0` |
| `canvas-ink` |  | `Δl -0.801` | `Δl +0.781` |
| `ink` |  | `Δl 0` | `Δl 0` |
| `ink-2` |  | `Δl +0.327 · ΔC +0.01` | `Δl -0.21 · ΔC +0.009` |
| `ink-3` |  | `Δl +0.436 · ΔC +0.011` | `Δl -0.323 · ΔC +0.012` |
| `ink-4` |  | `Δl +0.55 · ΔC +0.007` | `Δl -0.445 · ΔC +0.01` |
| `bubble` |  | `Δl -0.037 · ΔC +0.002` | `Δl +0.09 · α 0.06` |
| `bubble-flat` |  | — | `Δl +0.088 · ΔC +0.006` |
| `border-1` |  | `Δl -0.067` | `Δl +0.026 · α 0.09` |
| `border-2` |  | `Δl -0.098` | `Δl +0.026 · α 0.18` |
| `border-3` |  | `Δl -0.144` | `Δl +0.026 · α 0.3` |
| `border-1-flat` |  | — | `Δl +0.069` |
| `border-2-flat` |  | — | `Δl +0.108` |
| `border-3-flat` |  | — | `Δl +0.161` |
| `divider` |  | `Δl 0 · α 0.05` | `Δl +0.026 · α 0.06` |
| `scrollbar` |  | `Δl -0.128 · α 0.9` | `Δl -0.63 · α 0.9` |
| `scrollbar-hover` |  | `Δl -0.368 · α 0.8` | `Δl -0.446 · α 0.9` |
| `on-accent` |  | `Δl 0` | `Δl +0.775` |
| `inverse-ink` |  | `Δl +0.011` | `Δl -0.011` |
| `hover-wash` |  | `Δl -0.081 · α 0.08` | `Δl +0.026 · α 0.08` |
| `code-wash` |  | `Δl -0.081 · α 0.05` | `Δl +0.026 · α 0.05` |
| `shimmer` |  | `Δl 0` | `Δl 0` |
| `accent` |  | `Δl 0 · C ×1` | `Δl 0 · C ×1` |
| `accent-hover` |  | `Δl -0.063 · C ×1.01` | `Δl +0.071 · C ×0.91 · h +2` |
| `accent-active` |  | `Δl +0.068 · C ×1.1 · h +1 · α 0.26` | `Δl 0 · C ×1 · α 0.3` |
| `accent-tint` |  | `Δl 0 · C 0.028` | `Δl 0 · C 0.055` |
| `ui-link` |  | `Δl -0.069 · C ×0.95` | `Δl +0.1 · C ×0.72` |
| `ui-link-hover` |  | `Δl -0.143 · C ×0.9` | `Δl +0.19 · C ×0.7` |
| `link` |  | `Δl 0 · C ×1` | `Δl 0 · C ×1` |
| `link-underline` |  | `Δl 0 · C ×1 · α 0.6` | `Δl 0 · C ×1 · α 0.6` |

| Token | Tone | claude light | claude dark | deepseek light | deepseek dark | parchment light | parchment dark | forest light | forest dark | dusk light | dusk dark | rose light | rose dark | Host alias | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `--dsw-alias-bg-base` | `canvas` | `#ffffff` | `#191919` | `#fbfcff` | `#13161d` | `#f7f1e3` | `#1d1a16` | `#f7fbf7` | `#151a17` | `#faf8ff` | `#18161f` | `#fdf1f2` | `#1d1618` | host's own |  |
| `--dsw-alias-bg-layer-1` | `surface-1` | `#ffffff` | `#212121` | `#fbfcff` | `#1b1e26` | `#f7f1e3` | `#26221e` | `#f7fbf7` | `#1d221f` | `#faf8ff` | `#201e28` | `#fdf1f2` | `#261e20` | host's own |  |
| `--dsw-alias-bg-layer-2` | `surface-2` | `#ffffff` | `#282828` | `#fbfcff` | `#22252d` | `#f7f1e3` | `#2d2925` | `#f7fbf7` | `#242926` | `#faf8ff` | `#27252f` | `#fdf1f2` | `#2d2527` | host's own |  |
| `--dsw-alias-bg-layer-3` | `surface-3` | `#ffffff` | `#323232` | `#fcfdff` | `#2b2f37` | `#f8f2e4` | `#36332f` | `#f8fcf8` | `#2e3330` | `#fbf9ff` | `#312f39` | `#fef2f3` | `#372f31` | host's own |  |
| `--dsw-alias-bg-overlay` | `overlay` | `#ffffff` | `#282828` | `#ffffff` | `#22252d` | `#f5f5f5` | `#2d2925` | `#fdfdfd` | `#242926` | `#fdfdfd` | `#27252f` | `#f8f8f8` | `#2d2527` | host's own |  |
| `--dsw-alias-border-l1` | `border-1` / `border-1-flat` | `#e9e9e9` | `rgba(255, 255, 255, 0.09)` | — | `#23262e` | `#e1dbcd` | `rgba(255, 255, 250, 0.09)` | — | `#252a27` | — | `#282630` | `#e7dbdc` | `rgba(255, 253, 255, 0.09)` | host's own | the standard edge: card and panel outlines, dividers, field outlines |
| `--dsw-alias-border-l2` | `border-2` / `border-2-flat` | `#dedede` | `rgba(255, 255, 255, 0.18)` | — | `#2c3038` | `#d7d1c3` | `rgba(255, 255, 250, 0.18)` | — | `#2f3431` | — | `#32303a` | `#dcd1d2` | `rgba(255, 253, 255, 0.18)` | host's own |  |
| `--dsw-alias-border-l3` | `border-3` / `border-3-flat` | `#cfcfcf` | `rgba(255, 255, 255, 0.3)` | — | `#3a3d46` | `#c8c2b5` | `rgba(255, 255, 250, 0.3)` | — | `#3c423e` | — | `#403d48` | `#cec2c3` | `rgba(255, 253, 255, 0.3)` | host's own |  |
| `--dsh-claude-divider` | `divider` | `rgba(22, 22, 22, 0.05)` | `rgba(255, 255, 255, 0.06)` | `rgba(19, 20, 22, 0.05)` | `rgba(251, 255, 255, 0.06)` | `rgba(16, 12, 4, 0.05)` | `rgba(255, 255, 250, 0.06)` | `rgba(16, 19, 16, 0.05)` | `rgba(249, 255, 252, 0.06)` | `rgba(18, 17, 22, 0.05)` | `rgba(255, 254, 255, 0.06)` | `rgba(20, 12, 13, 0.05)` | `rgba(255, 253, 255, 0.06)` | `var(--dsw-alias-border-l1)` | a line that only separates: foot areas, settings rows, menu separators, the transcript's rule |
| `--dsw-alias-brand-primary` | `accent` | `#d97757` | `#d97757` | `#4d6bfe` | `#4d6bfe` | `#b5673a` | `#b5673a` | `#3f8f6f` | `#3f8f6f` | `#8a6ae6` | `#8a6ae6` | `#d4577c` | `#d4577c` | host's own | the single accent: checks, focus rings, selected marks |
| `--dsw-alias-brand-text` | `on-accent` | `#ffffff` | `#fbfbfb` | `#fbfcff` | `#f2f7ff` | `#f7f1e3` | `#fffdf7` | `#f7fbf7` | `#f5fdf8` | `#faf8ff` | `#faf7ff` | `#fdf1f2` | `#fff7fa` | host's own |  |
| `--dsw-alias-button-primary-fill` | `accent` | `#d97757` | `#d97757` | `#4d6bfe` | `#4d6bfe` | `#b5673a` | `#b5673a` | `#3f8f6f` | `#3f8f6f` | `#8a6ae6` | `#8a6ae6` | `#d4577c` | `#d4577c` | host's own |  |
| `--dsw-alias-button-primary-hover` | `accent-hover` | `#c46343` | `#eb9170` | `#3d56e9` | `#6a84ff` | `#a15425` | `#c78055` | `#287c5d` | `#5ba487` | `#7856d1` | `#a183f4` | `#bf426a` | `#e8738f` | host's own |  |
| `--dsw-alias-button-elevated-fill` | `overlay` | `#ffffff` | `#282828` | `#ffffff` | `#22252d` | `#f5f5f5` | `#2d2925` | `#fdfdfd` | `#242926` | `#fdfdfd` | `#27252f` | `#f8f8f8` | `#2d2527` | host's own |  |
| `--dsw-alias-button-floating-fill` | `overlay` | `#ffffff` | `#282828` | `#ffffff` | `#22252d` | `#f5f5f5` | `#2d2925` | `#fdfdfd` | `#242926` | `#fdfdfd` | `#27252f` | `#f8f8f8` | `#2d2527` | host's own |  |
| `--dsw-alias-button-floating-hover` | `surface-3` | `#ffffff` | `#323232` | `#fcfdff` | `#2b2f37` | `#f8f2e4` | `#36332f` | `#f8fcf8` | `#2e3330` | `#fbf9ff` | `#312f39` | `#fef2f3` | `#372f31` | host's own |  |
| `--dsw-alias-button-info-fill` | `accent` | `#d97757` | `#d97757` | `#4d6bfe` | `#4d6bfe` | `#b5673a` | `#b5673a` | `#3f8f6f` | `#3f8f6f` | `#8a6ae6` | `#8a6ae6` | `#d4577c` | `#d4577c` | host's own |  |
| `--dsw-alias-button-info-hover` | `accent-hover` | `#c46343` | `#eb9170` | `#3d56e9` | `#6a84ff` | `#a15425` | `#c78055` | `#287c5d` | `#5ba487` | `#7856d1` | `#a183f4` | `#bf426a` | `#e8738f` | host's own |  |
| `--dsw-alias-interactive-bg-active` | `accent-active` | `rgba(246, 136, 98, 0.26)` | `rgba(217, 119, 87, 0.3)` | `rgba(95, 124, 255, 0.26)` | `rgba(77, 107, 254, 0.3)` | `rgba(208, 121, 68, 0.26)` | `rgba(181, 103, 58, 0.3)` | `rgba(74, 166, 131, 0.26)` | `rgba(63, 143, 111, 0.3)` | `rgba(161, 123, 255, 0.26)` | `rgba(138, 106, 230, 0.3)` | `rgba(243, 101, 141, 0.26)` | `rgba(212, 87, 124, 0.3)` | host's own |  |
| `--dsh-claude-hover-bg` | `hover-wash` | `rgba(6, 6, 6, 0.08)` | `rgba(255, 255, 255, 0.08)` | `rgba(4, 4, 6, 0.08)` | `rgba(251, 255, 255, 0.08)` | `rgba(3, 1, 0, 0.08)` | `rgba(255, 255, 250, 0.08)` | `rgba(3, 4, 3, 0.08)` | `rgba(249, 255, 252, 0.08)` | `rgba(3, 3, 6, 0.08)` | `rgba(255, 254, 255, 0.08)` | `rgba(4, 1, 2, 0.08)` | `rgba(255, 253, 255, 0.08)` | `var(--dsw-alias-interactive-bg-hover)` | hover wash |
| `--dsh-claude-status-unread` | literal | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | the native unread background-completion reminder, independent of the brand accent |
| `--dsh-claude-status-awaiting` | literal | `#fab219` | `#fab219` | `#fab219` | `#fab219` | `#fab219` | `#fab219` | `#fab219` | `#fab219` | `#fab219` | `#fab219` | `#fab219` | `#fab219` | `#fab219` | the sidebar's waiting-for-input yellow: approvals, plan reviews and questions |
| `--dsh-claude-status-running` | literal | `#898781` | `#898781` | `#898781` | `#898781` | `#898781` | `#898781` | `#898781` | `#898781` | `#898781` | `#898781` | `#898781` | `#898781` | `#898781` | the sidebar's muted neutral running dot |
| `--dsh-claude-field-ring` | literal | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `#2a78d6` | `var(--dsw-alias-brand-primary)` | the ring around a field the reader is renaming in: the session title's own editor, drawn from the selection blue |
| `--dsw-focus-ring-color` | literal | `rgba(20, 20, 19, 0.45)` | `rgba(250, 249, 245, 0.60)` | `rgba(20, 20, 19, 0.45)` | `rgba(250, 249, 245, 0.60)` | `rgba(20, 20, 19, 0.45)` | `rgba(250, 249, 245, 0.60)` | `rgba(20, 20, 19, 0.45)` | `rgba(250, 249, 245, 0.60)` | `rgba(20, 20, 19, 0.45)` | `rgba(250, 249, 245, 0.60)` | `rgba(20, 20, 19, 0.45)` | `rgba(250, 249, 245, 0.60)` | host's own | the keyboard focus ring: the host's own `:focus-visible` rules paint it, and the skin's fallback ring reads it |
| `--dsh-claude-inline-code-bg` | `code-wash` | `rgba(6, 6, 6, 0.05)` | `rgba(255, 255, 255, 0.05)` | `rgba(4, 4, 6, 0.05)` | `rgba(251, 255, 255, 0.05)` | `rgba(3, 1, 0, 0.05)` | `rgba(255, 255, 250, 0.05)` | `rgba(3, 4, 3, 0.05)` | `rgba(249, 255, 252, 0.05)` | `rgba(3, 3, 6, 0.05)` | `rgba(255, 254, 255, 0.05)` | `rgba(4, 1, 2, 0.05)` | `rgba(255, 253, 255, 0.05)` | `var(--dsw-alias-markdown-inline-code)` | inline code fill |
| `--dsh-claude-inline-code-fg` | card `code` | `#161616` | `#fdfdfd` | `#0f1115` | `#eef1f8` | `#2a241c` | `#f3ecdf` | `#14201a` | `#e9f2ec` | `#17132a` | `#efecfa` | `#24141a` | `#f8ecef` | `var(--dsw-alias-label-primary)` | inline code ink |
| `--dsh-claude-link` | `link` | `#184f95` | `#8ab4f8` | `#3b56d9` | `#8fa4ff` | `#8f4a1c` | `#e3a676` | `#256b50` | `#7fcfae` | `#5b3fc4` | `#b3a1ff` | `#a8325a` | `#f29bb4` | `var(--dsw-alias-link)` | markdown links |
| `--dsh-claude-link-underline` | `link-underline` | `rgba(24, 79, 149, 0.6)` | `rgba(138, 180, 248, 0.6)` | `rgba(59, 86, 217, 0.6)` | `rgba(143, 164, 255, 0.6)` | `rgba(143, 74, 28, 0.6)` | `rgba(227, 166, 118, 0.6)` | `rgba(37, 107, 80, 0.6)` | `rgba(127, 207, 174, 0.6)` | `rgba(91, 63, 196, 0.6)` | `rgba(179, 161, 255, 0.6)` | `rgba(168, 50, 90, 0.6)` | `rgba(242, 155, 180, 0.6)` | `color-mix(in srgb, var(--dsw-alias-link) 60%, transparent)` | markdown link underline |
| `--dsw-alias-markdown-code-block` | `code-block` | `#ffffff` | `#212121` | `#ffffff` | `#1b1e26` | `#f5f5f5` | `#26221e` | `#fdfdfd` | `#1d221f` | `#fdfdfd` | `#201e28` | `#f8f8f8` | `#261e20` | host's own |  |
| `--dsw-alias-markdown-code-block-banner` | `overlay` | `#ffffff` | `#282828` | `#ffffff` | `#22252d` | `#f5f5f5` | `#2d2925` | `#fdfdfd` | `#242926` | `#fdfdfd` | `#27252f` | `#f8f8f8` | `#2d2527` | host's own |  |
| `--dsw-alias-interactive-bg-hover` | `--dsh-claude-hover-bg` | `var(--dsh-claude-hover-bg)` | `var(--dsh-claude-hover-bg)` | `var(--dsh-claude-hover-bg)` | `var(--dsh-claude-hover-bg)` | `var(--dsh-claude-hover-bg)` | `var(--dsh-claude-hover-bg)` | `var(--dsh-claude-hover-bg)` | `var(--dsh-claude-hover-bg)` | `var(--dsh-claude-hover-bg)` | `var(--dsh-claude-hover-bg)` | `var(--dsh-claude-hover-bg)` | `var(--dsh-claude-hover-bg)` | host's own |  |
| `--dsw-alias-interactive-bg-hover-solid` | `hover-plate` | `#f4f4f4` | `#323232` | `#f0f1f4` | `#2b2f37` | `#ece6d8` | `#36332f` | `#ecf0ec` | `#2e3330` | `#efedf4` | `#312f39` | `#f2e6e7` | `#372f31` | host's own | the host's solid hover chip |
| `--dsw-alias-label-primary` | `ink` | `#161616` | `#fdfdfd` | `#131416` | `#f4f9ff` | `#100c04` | `#fffef9` | `#101310` | `#f7fffa` | `#121116` | `#fcf9ff` | `#140c0d` | `#fff9fc` | host's own |  |
| `--dsw-alias-label-primary-bluish` | `ink` | `#161616` | `#fdfdfd` | `#131416` | `#f4f9ff` | `#100c04` | `#fffef9` | `#101310` | `#f7fffa` | `#121116` | `#fcf9ff` | `#140c0d` | `#fff9fc` | host's own |  |
| `--dsw-alias-label-secondary` | `ink-2` | `#70696b` | `#beb6b8` | `#646871` | `#acb5c0` | `#665e4c` | `#bcbaae` | `#606960` | `#aebcb4` | `#666370` | `#b9b3bf` | `#6e5c5e` | `#bfb3b9` | host's own |  |
| `--dsw-alias-label-tertiary` | `ink-3` | `#91888b` | `#9c9395` | `#848892` | `#88929f` | `#867d6a` | `#99978a` | `#7f897f` | `#8a9a90` | `#868391` | `#97909d` | `#8f7b7d` | `#9d8f96` | host's own |  |
| `--dsw-alias-label-caption` | `ink-4` | `#b2acae` | `#776f71` | `#a7abb3` | `#656e79` | `#a7a08e` | `#747267` | `#a3aba3` | `#67756c` | `#a8a6b2` | `#726c77` | `#b09ea0` | `#776b72` | host's own |  |
| `--dsw-alias-label-shimmer` | `shimmer` | `#161616` | `#fdfdfd` | `#131416` | `#f4f9ff` | `#100c04` | `#fffef9` | `#101310` | `#f7fffa` | `#121116` | `#fcf9ff` | `#140c0d` | `#fff9fc` | host's own | the highlight band's tint over running words: the host's own rows and the skin's band (shared/sweep-band.ts) alike |
| `--dsw-alias-label-deep-diving-shimmer` | `shimmer` | `#161616` | `#fdfdfd` | `#131416` | `#f4f9ff` | `#100c04` | `#fffef9` | `#101310` | `#f7fffa` | `#121116` | `#fcf9ff` | `#140c0d` | `#fff9fc` | host's own | the band's tint inside the running row, which the host points --dsw-alias-label-shimmer at; under Claude it is the same warm band as everywhere else |
| `--dsw-alias-state-business-primary` | `accent` | `#d97757` | `#d97757` | `#4d6bfe` | `#4d6bfe` | `#b5673a` | `#b5673a` | `#3f8f6f` | `#3f8f6f` | `#8a6ae6` | `#8a6ae6` | `#d4577c` | `#d4577c` | host's own |  |
| `--dsw-alias-state-business-tertiary` | `accent-tint` | `#f6ded7` | `#48261b` | `#dce4f7` | `#252f4c` | `#f4dfd4` | `#462716` | `#d4eadf` | `#0f3929` | `#e4e1f6` | `#312b4a` | `#f5dde1` | `#47242d` | host's own |  |
| `--dsw-alias-link` | `ui-link` | `#bf6446` | `#eaa088` | `#3e57e0` | `#7594fd` | `#9c542a` | `#c78d6e` | `#2d795c` | `#74a991` | `#7657ca` | `#a593ed` | `#b94569` | `#e3879e` | host's own | text link at rest |
| `--dsw-alias-shadow-lv2` | literal | `0 4px 18px rgba(20, 20, 19, 0.10), 0 1px 3px rgba(20, 20, 19, 0.05)` | `0 4px 16px rgba(0, 0, 0, 0.30), 0 1px 3px rgba(0, 0, 0, 0.14)` | `0 4px 18px rgba(20, 20, 19, 0.10), 0 1px 3px rgba(20, 20, 19, 0.05)` | `0 4px 16px rgba(0, 0, 0, 0.30), 0 1px 3px rgba(0, 0, 0, 0.14)` | `0 4px 18px rgba(20, 20, 19, 0.10), 0 1px 3px rgba(20, 20, 19, 0.05)` | `0 4px 16px rgba(0, 0, 0, 0.30), 0 1px 3px rgba(0, 0, 0, 0.14)` | `0 4px 18px rgba(20, 20, 19, 0.10), 0 1px 3px rgba(20, 20, 19, 0.05)` | `0 4px 16px rgba(0, 0, 0, 0.30), 0 1px 3px rgba(0, 0, 0, 0.14)` | `0 4px 18px rgba(20, 20, 19, 0.10), 0 1px 3px rgba(20, 20, 19, 0.05)` | `0 4px 16px rgba(0, 0, 0, 0.30), 0 1px 3px rgba(0, 0, 0, 0.14)` | `0 4px 18px rgba(20, 20, 19, 0.10), 0 1px 3px rgba(20, 20, 19, 0.05)` | `0 4px 16px rgba(0, 0, 0, 0.30), 0 1px 3px rgba(0, 0, 0, 0.14)` | host's own |  |
| `--dsw-specific-input-major` | `inset` | `#ffffff` | `#141414` | `#ffffff` | `#0e1117` | `#f5f5f5` | `#171511` | `#fdfdfd` | `#101512` | `#fdfdfd` | `#131119` | `#f8f8f8` | `#171113` | host's own |  |
| `--dsw-specific-selector` | `selector` | `#fefefe` | `#323232` | `#fafbfe` | `#2b2f37` | `#f6f0e2` | `#36332f` | `#f6faf6` | `#2e3330` | `#f9f7fe` | `#312f39` | `#fcf0f1` | `#372f31` | host's own |  |
| `--dsw-specific-sidebar-fill` | card `sidebar` | `#fafafa` | `#1f1f1f` | `#f7f9ff` | `#13161d` | `#f7f0e1` | `#1d1a16` | `#f6fbf6` | `#151a17` | `#faf7ff` | `#18161f` | `#fef0f1` | `#1d1618` | host's own |  |
| `--dsw-alias-brand-primary-new-colorprimary-new-color` | `accent` | `#d97757` | `#d97757` | `#4d6bfe` | `#4d6bfe` | `#b5673a` | `#b5673a` | `#3f8f6f` | `#3f8f6f` | `#8a6ae6` | `#8a6ae6` | `#d4577c` | `#d4577c` | host's own |  |
| `--dsh-claude-canvas` | `canvas` | `#ffffff` | `#191919` | `#fbfcff` | `#13161d` | `#f7f1e3` | `#1d1a16` | `#f7fbf7` | `#151a17` | `#faf8ff` | `#18161f` | `#fdf1f2` | `#1d1618` | `var(--dsw-alias-bg-base)` | the page canvas |
| `--dsh-claude-sidebar-canvas` | card `sidebar` | `#fafafa` | `#1f1f1f` | `#f7f9ff` | `#13161d` | `#f7f0e1` | `#1d1a16` | `#f6fbf6` | `#151a17` | `#faf7ff` | `#18161f` | `#fef0f1` | `#1d1618` | `var(--dsw-specific-sidebar-fill)` | the sidebar |
| `--dsh-claude-card` | `card` | `#ffffff` | `#232323` | `#fbfcff` | `#1d2028` | `#f7f1e3` | `#282420` | `#f7fbf7` | `#1f2421` | `#faf8ff` | `#22202a` | `#fdf1f2` | `#282022` | `var(--dsw-alias-bg-overlay)` | cards on the canvas in light and raised in dark: the account popover, the search palette |
| `--dsh-claude-inverse-fill` | `ink` | `#161616` | `#fdfdfd` | `#131416` | `#f4f9ff` | `#100c04` | `#fffef9` | `#101310` | `#f7fffa` | `#121116` | `#fcf9ff` | `#140c0d` | `#fff9fc` | `var(--dsw-alias-interactive-bg-hover)` | the model picker's group label fill: an inverted chip under Claude, a hover-plate chip under the host |
| `--dsh-claude-inverse-ink` | `inverse-ink` | `#ffffff` | `#171717` | `#feffff` | `#11141a` | `#fbf5e7` | `#1a1714` | `#fbfffb` | `#131715` | `#fefcff` | `#16141c` | `#fff5f6` | `#1a1416` | `var(--dsw-alias-label-primary)` | the model picker's group label ink |
| `--dsh-claude-table-head` | `table-head` | `#f4f4f4` | `#282828` | `#f0f1f4` | `#22252d` | `#ece6d8` | `#2d2925` | `#ecf0ec` | `#242926` | `#efedf4` | `#27252f` | `#f2e6e7` | `#2d2527` | `var(--dsw-alias-bg-layer-2)` | table header row |
| `--dsh-claude-ripple-ink` | `ink-3` | `#91888b` | `#9c9395` | `#848892` | `#88929f` | `#867d6a` | `#99978a` | `#7f897f` | `#8a9a90` | `#868391` | `#97909d` | `#8f7b7d` | `#9d8f96` | `var(--dsw-alias-label-secondary, #8a8a85)` | the new-conversation page's glyph field, and the wake a ripple leaves in it |
| `--dsh-claude-data-ink` | literal | `#3b6ecf` | `#3b6ecf` | `#3b6ecf` | `#3b6ecf` | `#3b6ecf` | `#3b6ecf` | `#3b6ecf` | `#3b6ecf` | `#3b6ecf` | `#3b6ecf` | `#3b6ecf` | `#3b6ecf` | `var(--dsw-alias-link, #3b6ecf)` | the home heat grid's single data blue |
| `--dsh-claude-data-0` | literal | `#3b7ddd` | `#6aa2ff` | `#3b7ddd` | `#6aa2ff` | `#3b7ddd` | `#6aa2ff` | `#3b7ddd` | `#6aa2ff` | `#3b7ddd` | `#6aa2ff` | `#3b7ddd` | `#6aa2ff` | `light-dark(#3b7ddd, #6aa2ff)` | the Models chart and legend's categorical colour 0 |
| `--dsh-claude-data-1` | literal | `#ec7a2c` | `#ff9b55` | `#ec7a2c` | `#ff9b55` | `#ec7a2c` | `#ff9b55` | `#ec7a2c` | `#ff9b55` | `#ec7a2c` | `#ff9b55` | `#ec7a2c` | `#ff9b55` | `light-dark(#ec7a2c, #ff9b55)` | the Models chart and legend's categorical colour 1 |
| `--dsh-claude-data-2` | literal | `#25a06b` | `#45c98c` | `#25a06b` | `#45c98c` | `#25a06b` | `#45c98c` | `#25a06b` | `#45c98c` | `#25a06b` | `#45c98c` | `#25a06b` | `#45c98c` | `light-dark(#25a06b, #45c98c)` | the Models chart and legend's categorical colour 2 |
| `--dsh-claude-data-3` | literal | `#8a63d8` | `#ac8cf7` | `#8a63d8` | `#ac8cf7` | `#8a63d8` | `#ac8cf7` | `#8a63d8` | `#ac8cf7` | `#8a63d8` | `#ac8cf7` | `#8a63d8` | `#ac8cf7` | `light-dark(#8a63d8, #ac8cf7)` | the Models chart and legend's categorical colour 3 |
| `--dsh-claude-data-4` | literal | `#13a5bd` | `#3dc6dc` | `#13a5bd` | `#3dc6dc` | `#13a5bd` | `#3dc6dc` | `#13a5bd` | `#3dc6dc` | `#13a5bd` | `#3dc6dc` | `#13a5bd` | `#3dc6dc` | `light-dark(#13a5bd, #3dc6dc)` | the Models chart and legend's categorical colour 4 |
| `--dsh-claude-data-5` | literal | `#df4d8f` | `#f77cb2` | `#df4d8f` | `#f77cb2` | `#df4d8f` | `#f77cb2` | `#df4d8f` | `#f77cb2` | `#df4d8f` | `#f77cb2` | `#df4d8f` | `#f77cb2` | `light-dark(#df4d8f, #f77cb2)` | the Models chart and legend's categorical colour 5 |
| `--dsh-claude-data-6` | literal | `#e0a514` | `#f4c445` | `#e0a514` | `#f4c445` | `#e0a514` | `#f4c445` | `#e0a514` | `#f4c445` | `#e0a514` | `#f4c445` | `#e0a514` | `#f4c445` | `light-dark(#e0a514, #f4c445)` | the Models chart and legend's categorical colour 6 |
| `--dsh-claude-data-7` | literal | `#e2504f` | `#ff7b78` | `#e2504f` | `#ff7b78` | `#e2504f` | `#ff7b78` | `#e2504f` | `#ff7b78` | `#e2504f` | `#ff7b78` | `#e2504f` | `#ff7b78` | `light-dark(#e2504f, #ff7b78)` | the Models chart and legend's categorical colour 7 |
| `--dsh-claude-data-8` | literal | `#7aae24` | `#a1d45a` | `#7aae24` | `#a1d45a` | `#7aae24` | `#a1d45a` | `#7aae24` | `#a1d45a` | `#7aae24` | `#a1d45a` | `#7aae24` | `#a1d45a` | `light-dark(#7aae24, #a1d45a)` | the Models chart and legend's categorical colour 8 |
| `--dsh-claude-data-9` | literal | `#8b91a0` | `#a6acb8` | `#8b91a0` | `#a6acb8` | `#8b91a0` | `#a6acb8` | `#8b91a0` | `#a6acb8` | `#8b91a0` | `#a6acb8` | `#8b91a0` | `#a6acb8` | `light-dark(#8b91a0, #a6acb8)` | the Models chart and legend's categorical colour 9 |
| `--dsh-claude-context-messages` | literal | `#3783f0` | `#64a5ff` | `#3783f0` | `#64a5ff` | `#3783f0` | `#64a5ff` | `#3783f0` | `#64a5ff` | `#3783f0` | `#64a5ff` | `#3783f0` | `#64a5ff` | `light-dark(#3783f0, #64a5ff)` | context conversation bodies (user and assistant text), and the used-ink bar that stands before the parts arrive |
| `--dsh-claude-context-assistant` | literal | `#8a6ee2` | `#a88eff` | `#8a6ee2` | `#a88eff` | `#8a6ee2` | `#a88eff` | `#8a6ee2` | `#a88eff` | `#8a6ee2` | `#a88eff` | `#8a6ee2` | `#a88eff` | `light-dark(#8a6ee2, #a88eff)` | context reasoning: the assistant's reasoning residual, told apart from the conversation's text |
| `--dsh-claude-context-tool-call` | literal | `#c04f8e` | `#e07ab0` | `#c04f8e` | `#e07ab0` | `#c04f8e` | `#e07ab0` | `#c04f8e` | `#e07ab0` | `#c04f8e` | `#e07ab0` | `#c04f8e` | `#e07ab0` | `light-dark(#c04f8e, #e07ab0)` | context tool calls: the assistant's invocations, told apart from the results they bring back |
| `--dsh-claude-context-tool-result` | literal | `#2695ac` | `#4db4cc` | `#2695ac` | `#4db4cc` | `#2695ac` | `#4db4cc` | `#2695ac` | `#4db4cc` | `#2695ac` | `#4db4cc` | `#2695ac` | `#4db4cc` | `light-dark(#2695ac, #4db4cc)` | context tool results: what the tools handed back, told apart from both sides of the conversation |
| `--dsh-claude-context-tools` | literal | `#df5200` | `#ff7333` | `#df5200` | `#ff7333` | `#df5200` | `#ff7333` | `#df5200` | `#ff7333` | `#df5200` | `#ff7333` | `#df5200` | `#ff7333` | `light-dark(#df5200, #ff7333)` | context capability row (tools, skills and MCP merged): Claude Desktop's orange category |
| `--dsh-claude-context-attachment` | literal | `#009e7d` | `#2bbe9b` | `#009e7d` | `#2bbe9b` | `#009e7d` | `#2bbe9b` | `#009e7d` | `#2bbe9b` | `#009e7d` | `#2bbe9b` | `#009e7d` | `#2bbe9b` | `light-dark(#009e7d, #2bbe9b)` | context files and images extracted from any message: Claude Desktop's green category |
| `--dsh-claude-context-system` | literal | `#b67800` | `#da950b` | `#b67800` | `#da950b` | `#b67800` | `#da950b` | `#b67800` | `#da950b` | `#b67800` | `#da950b` | `#b67800` | `#da950b` | `light-dark(#b67800, #da950b)` | context system prompt: Claude Desktop's yellow category |
| `--dsh-claude-context-fixed` | literal | `#8f8f8f` | `#8a8a8a` | `#8f8f8f` | `#8a8a8a` | `#8f8f8f` | `#8a8a8a` | `#8f8f8f` | `#8a8a8a` | `#8f8f8f` | `#8a8a8a` | `#8f8f8f` | `#8a8a8a` | `light-dark(#8f8f8f, #8a8a8a)` | context injection (instruction files and other attributed context): Claude Desktop's neutral grey for the parts a turn does not grow |
| `--dsh-claude-ripple-wave` | literal | `#3b6ef0` | `#7fa6ff` | `#3b6ef0` | `#7fa6ff` | `#3b6ef0` | `#7fa6ff` | `#3b6ef0` | `#7fa6ff` | `#3b6ef0` | `#7fa6ff` | `#3b6ef0` | `#7fa6ff` | `var(--dsw-alias-link, #3b6ef0)` | the front of a ripple in the new-conversation page's glyph field |
| `--dsh-claude-scrollbar` | `scrollbar` | `rgba(213, 213, 213, 0.9)` | `rgba(62, 62, 62, 0.9)` | `rgba(209, 210, 213, 0.9)` | `rgba(55, 59, 64, 0.9)` | `rgba(205, 199, 186, 0.9)` | `rgba(64, 63, 59, 0.9)` | `rgba(205, 209, 205, 0.9)` | `rgba(57, 64, 60, 0.9)` | `rgba(208, 206, 213, 0.9)` | `rgba(61, 59, 64, 0.9)` | `rgba(211, 199, 200, 0.9)` | `rgba(64, 59, 61, 0.9)` | `var(--dsw-alias-border-l2)` | scrollbar thumb |
| `--dsh-claude-scrollbar-hover` | `scrollbar-hover` | `rgba(138, 138, 138, 0.8)` | `rgba(113, 113, 113, 0.9)` | `rgba(134, 135, 138, 0.8)` | `rgba(105, 109, 115, 0.9)` | `rgba(130, 125, 113, 0.8)` | `rgba(115, 114, 109, 0.9)` | `rgba(130, 134, 130, 0.8)` | `rgba(108, 115, 110, 0.9)` | `rgba(133, 131, 138, 0.8)` | `rgba(112, 109, 115, 0.9)` | `rgba(136, 125, 126, 0.8)` | `rgba(115, 109, 112, 0.9)` | `var(--dsw-alias-label-caption)` | scrollbar thumb under the pointer |
| `--dsh-claude-link-hover` | `ui-link-hover` | `#a35035` | `#ffbea6` | `#2e41c0` | `#91b1ff` | `#824117` | `#e4a98a` | `#196348` | `#90c5ad` | `#6142ad` | `#c1b0ff` | `#9d3254` | `#ffa4ba` | `var(--dsw-alias-link)` | text link under the pointer |
| `--dsh-claude-logo-ink` | card `logoInk` | `#161616` | `#fdfdfd` | `#4d6bfe` | `#4d6bfe` | `#100c04` | `#fffef9` | `#101310` | `#f7fffa` | `#121116` | `#fcf9ff` | `#140c0d` | `#fff9fc` | `var(--dsw-alias-label-primary)` | sidebar brand art: the whale and the wordmark |
| `--dsw-specific-menu` | `overlay` | `#ffffff` | — | `#ffffff` | — | `#f5f5f5` | — | `#fdfdfd` | — | `#fdfdfd` | — | `#f8f8f8` | — | host's own |  |
| `--dsw-specific-bubble` | card `bubble` | `#f4f2f3` | `rgba(255, 255, 255, 0.06)` | `#ecf0ff` | `#262b36` | `#ebe5d5` | `rgba(255, 255, 250, 0.06)` | `#eaefea` | `#27302b` | `#eeebf4` | `#2d2a37` | `#f2e4e5` | `rgba(255, 253, 255, 0.06)` | host's own | user message bubble |
| `--dsh-claude-chip` | `chip` | `#f9f9f9` | — | `#f5f6f9` | — | `#f1ebdd` | — | `#f1f5f1` | — | `#f4f2f9` | — | `#f7ebec` | — | `var(--dsw-specific-selector)` | segmented control and switch at rest |
| `--dsh-claude-meter-peak` | literal | `#a4621d` | `#e2a45f` | `#a4621d` | `#e2a45f` | `#a4621d` | `#e2a45f` | `#a4621d` | `#e2a45f` | `#a4621d` | `#e2a45f` | `#a4621d` | `#e2a45f` | `var(--dsw-alias-state-warn-label)` | the peak rate badge: the expensive end of a provider's own billing clock |
| `--dsh-claude-meter-valley` | literal | `#3d7550` | `#8cbf96` | `#3d7550` | `#8cbf96` | `#3d7550` | `#8cbf96` | `#3d7550` | `#8cbf96` | `#3d7550` | `#8cbf96` | `#3d7550` | `#8cbf96` | `var(--dsw-alias-state-success-primary)` | the off-peak rate badge, and the dated promotions priced below it |
<!-- /generated:tokens -->

## Typography and shapes

- **Serif display** (`--dsh-claude-font-serif`), **Sans UI** (`--dsw-font-family`), and **Mono** (`--dsh-claude-font-code`); under `typeface: host`, private font tokens fall back to the host's font variables.
- **Radius ladder**: `4px` / `8px` / `16px`, `12px` popover cards with `6px` rows, and pill CTAs.
- **Dividers and outlines**: `0.5px` layout dividers in `--dsw-alias-border-l1`, `0.5px` content dividers in `--dsh-claude-divider`, and `1px` outlines on cards, fields and popovers.
- **Composer clearance**: the composer seat uses an opaque `--dsw-alias-bg-base` bar plus one `--dsh-composer-fade-h` gradient band above it, matched by transcript bottom padding; never mask transcript text with background-coloured `box-shadow` halos.
- **Focus rings**: keyboard focus uses `:where()` fallback rules reading `--dsw-focus-ring-color`; never use the brand accent for generic focus strokes.

## Surfaces and layout

- **Single-choice popovers**: permission, model, effort, account and hero workspace/preset menus share `packages/client/src/shared/popover.css` and `packages/client/src/shared/popover.ts`, keeping at most one popover open at a time and clamping placement within the viewport.
- **Session panel** (D113): the skin contributes `Context`, `Session stats`, `Token usage` and `Outputs` sections plus `This computer` and `Preset` rows inside the host's `Environment` section. Docked sections render as individual cards; when the host's two-child `<section>` contract holds, the skin adds section folding (`Session stats` and `Token usage` folded by default, with trailing summary figures while folded) and rolls back automatically if the host changes structure.
- **Home layouts**: `homeLayout` offers `off` (host default), `classic` (centred hero with segmented permissions and footer tray) and `studio` (top-left greeting, usage dashboard and bottom inline composer).
- **Stylesheet conventions**: scope rules under `body[data-dsh-claude-style]`; dark tokens are the base and light overrides sit under `:not([data-ds-dark-theme])`; responsive rules read `data-dsh-claude-page-under-<width>` marks from `packages/client/src/shared/page-scale.ts` rather than raw viewport `@media (max-width: ...)` queries so page zoom scales breakpoints consistently (D81).

## Motion

Every duration, easing curve, travel distance, blur and scale reads a token from `packages/client/src/theme/tokens.json` (shared presets in `packages/client/src/shared/motion.css`, script readers in `packages/client/src/shared/motion.ts`, D9). Under `Reduced` animation, `--dsh-claude-duration-reduced` collapses transitions and loops hold their resting frame.

<!-- generated:motion (packages/client/src/theme/tokens.json) -->
| Token | Value | Use |
|---|---|---|
| `--dsh-claude-duration-instant` | `80ms` | the composer caret following the insertion point |
| `--dsh-claude-duration-feedback` | `120ms` | a control answering hover, press or focus: its colour, background, border, shadow, or a small turn or slide of its own parts |
| `--dsh-claude-duration-reveal` | `120ms` | content entering the chat area: an opened row's body, and each streamed piece of the answer |
| `--dsh-claude-duration-stream-fade` | `240ms` | one character of a streaming answer coming to its own colour (features/chat-reveal), and the settings page's preview of it |
| `--dsh-claude-duration-enter` | `320ms` | one message the reader sends growing into its row, the same growth on the Motion tab's card, and a colour disc lifting out of its row and springing back |
| `--dsh-claude-duration-surface` | `150ms` | a floating surface or a group of controls appearing: popover cards, menus, panels, the search dialog, a toast, a strip fading in, a hint over what it names |
| `--dsh-claude-duration-exit` | `120ms` | a surface leaving on the reader's dismissal: a menu or a dialog closing, the overtime badge leaving |
| `--dsh-claude-duration-hint-exit` | `50ms` | a hint leaving the moment the pointer leaves what it names |
| `--dsh-claude-duration-hint-delay` | `80ms` | how long the pointer rests on something before its hint starts to appear |
| `--dsh-claude-duration-open` | `250ms` | a surface growing out of its anchor: a menu out of its trigger, a full-window dialog out of the centre, a settings page sliding in, the overtime badge sliding onto its line |
| `--dsh-claude-duration-swap` | `150ms` | each half of a wording swap: the old words leaving, the new ones arriving |
| `--dsh-claude-duration-swap-gap` | `50ms` | the offset the words arriving start after the words leaving, so the two halves of a wording swap travel together |
| `--dsh-claude-duration-clear-delay` | `50ms` | how long after a field empties the streak under its cleared words starts to rise |
| `--dsh-claude-duration-clear-text` | `400ms` | the two halves of clearing a field: the words leaving it, and the placeholder taking their place |
| `--dsh-claude-duration-clear` | `1000ms` | one whole clear: the words leaving, the placeholder arriving, and the streak's rise, peak and fall |
| `--dsh-claude-duration-roll` | `160ms` | a figure's characters rolling over to new digits |
| `--dsh-claude-duration-move` | `200ms` | something travelling along its own track: a fold's door, the reasoning slider's knob and fill, a hint moving from one colour disc to the next |
| `--dsh-claude-duration-count` | `220ms` | a session number counting to its new reading |
| `--dsh-claude-duration-slide` | `240ms` | the segmented controls' sliding highlight, a sidebar icon's quarter turn, the wording box taking the width of the words arriving, and streamed content sliding up from the bottom edge |
| `--dsh-claude-duration-fade` | `300ms` | a slow cross-fade: the theme flip, the reasoning knob's glow, a placeholder handing its place to what it stood for |
| `--dsh-claude-duration-bounce` | `350ms` | a switch's knob travelling across with its double bounce |
| `--dsh-claude-duration-tab-underline` | `280ms` | the conversation tab underline stretching and settling under the next label |
| `--dsh-claude-duration-flight` | `400ms` | the sent message flying from the composer to its row |
| `--dsh-claude-duration-step` | `500ms` | one step of the reasoning window's text rising two lines |
| `--dsh-claude-duration-pop` | `500ms` | something popping into place: the overtime badge's own pill |
| `--dsh-claude-duration-rise` | `500ms` | a line of the home greeting rising into place |
| `--dsh-claude-duration-stagger` | `70ms` | how far behind the piece before it a staggered piece starts: the greeting's second line |
| `--dsh-claude-period-dot-orbit` | `2400ms` | one turn of the waiting line's loader dots that swap corners: four quarter-turns of the two pairs, which leaves every dot where it started |
| `--dsh-claude-period-dot-cross` | `1200ms` | one round trip of the waiting line's loader dots along three tangentially offset 120-degree axes in phase, brushing past each other at the centre |
| `--dsh-claude-duration-dot-handover-gap` | `2500ms` | the least stretch the waiting line's loader hand-over must stand before an output-end may lay down the next motion: the model outputting holds the motion, and only an output ending past this gap switches it, so quick outputs cannot flip the motion faster than this |
| `--dsh-claude-duration-dot-morph` | `680ms` | how long a loader dot takes, once the motion it leaves has it standing still, to swirl in polar coordinates from that pose into the path of the motion taking over |
| `--dsh-claude-duration-dot-settle` | `80ms` | the brief level-line hold after a synchronised swirl lands at the top of the wave before the dots ripple downward |
| `--dsh-claude-duration-reduced` | `0.01ms` | every skin animation and transition under the Reduced animation choice (D40) |
| `--dsh-claude-period-status-title` | `3000ms` | the running title's strong shimmer: 15 percent rest, 70 percent travel, 15 percent rest |
| `--dsh-claude-period-status-breathe` | `1200ms` | one opacity cycle of the sidebar's running dot, matching Claude Desktop's status-dot cadence |
| `--dsh-claude-period-host-sweep` | `1500ms` | one pass of the highlight band across the waiting line's words and a running process group's header |
| `--dsh-claude-duration-host-sweep-delay` | `300ms` | how long the highlight band waits after its words appear before its first pass |
| `--dsh-claude-period-preview-swap` | `4000ms` | one turn of the settings page's waiting-line preview: one wording standing, leaving, and standing again |
| `--dsh-claude-period-preview-reveal` | `4000ms` | one turn of the settings page's new-text fade preview: the sample arriving character by character, then standing before the next wipe |
| `--dsh-claude-period-preview-caret` | `4000ms` | one turn of the settings page's caret preview: the sample line typed out, then standing whole before the next turn |
| `--dsh-claude-period-preview-enter` | `2600ms` | one turn of the Motion tab's message-entrance card: one message arriving, standing, and giving way to the next |
| `--dsh-claude-period-preview-meter` | `5200ms` | one round trip of the settings page's context-meter preview from 1% up to 100% and back to 1% |
| `--dsh-claude-period-wash-hue` | `4000ms` | one turn of the hue rotation the waiting line's colour wash runs through |
| `--dsh-claude-period-wash-drift` | `5000ms` | one orbit of the colour washes around the waiting line's glyph box |
| `--dsh-claude-period-pulse` | `1600ms` | a placeholder breathing while its numbers are computed |
| `--dsh-claude-period-flash` | `1450ms` | one flash of the reasoning slider's top-rung matrix |
| `--dsh-claude-period-flow` | `4000ms` | one pass of the reasoning slider's top-rung particle flow |
| `--dsh-claude-period-blink` | `1000ms` | one blink of the composer caret |
| `--dsh-claude-period-breathe` | `2400ms` | one breath of the sidebar's ongoing-conversation light |
| `--dsh-claude-period-spin` | `850ms` | one turn of the sidebar's ongoing-conversation ring |
| `--dsh-claude-period-landed` | `1400ms` | the mark on the turn the conversation navigator landed on |
| `--dsh-claude-period-hold` | `840ms` | how long the reasoning window's text stands between two steps |
| `--dsh-claude-period-dot-bounce` | `1200ms` | one full vertical wave of the waiting line's three round loader dots under the Claude brand, with each dot staggered by a sixth of this period |
| `--dsh-claude-period-dot-line` | `1250ms` | one round trip of the waiting line's loader dots along their own lines |
| `--dsh-claude-ease-standard` | `ease` | feedback and surfaces: the default curve |
| `--dsh-claude-ease-out` | `ease-out` | something arriving and settling: a fold's door, content entering the chat area, the landing mark, a hint appearing and leaving |
| `--dsh-claude-ease-enter` | `cubic-bezier(0.34, 1.3, 0.64, 1)` | a message the reader sends growing into its row: the slight overshoot as it takes its full size |
| `--dsh-claude-ease-status-title` | `cubic-bezier(0.45, 0, 0.55, 1)` | the middle travel segment of the strong running-title shimmer |
| `--dsh-claude-ease-in-out` | `ease-in-out` | something that leaves and returns, or swaps in place: wording swaps, pulses, flashes |
| `--dsh-claude-ease-glide` | `cubic-bezier(0.22, 0.61, 0.36, 1)` | travel along a track: the sliding highlight, the reasoning slider, the search dialog's entrance, the reasoning window's step, the wording box's width, the stream's slide |
| `--dsh-claude-ease-tab-leading-edge` | `cubic-bezier(0.2, 0, 0.32, 1.28)` | the leading edge of the tab underline stretching just past the new label before settling |
| `--dsh-claude-ease-tab-trailing-edge` | `cubic-bezier(0.52, 0, 0.72, 1)` | the trailing edge of the tab underline accelerating later and easing to a stop as it catches the leading edge |
| `--dsh-claude-ease-roll` | `cubic-bezier(0.4, 0, 0.2, 1)` | digits rolling over: the file rows' tail and the process group header's counts |
| `--dsh-claude-ease-spring` | `cubic-bezier(0.34, 1.45, 0.64, 1)` | a small overshoot as something lands: the overtime badge popping in, a switch's knob bouncing past its end |
| `--dsh-claude-ease-recoil` | `cubic-bezier(0.34, 3.85, 0.64, 1)` | a lifted colour disc springing back into its row once the pointer leaves, overshooting well past its place before it rests |
| `--dsh-claude-ease-settle` | `cubic-bezier(0.22, 1, 0.36, 1)` | a surface or a page settling into place out of its anchor: menus and dialogs opening and closing, a settings page sliding, the overtime badge sliding onto its line, the greeting's lines rising, a hint travelling between colour discs, a colour disc lifting |
| `--dsh-claude-ease-host-sweep` | `steps(48, end)` | the band across the waiting line's words and a running process group's header |
| `--dsh-claude-ease-harmonic` | `cubic-bezier(0.37, 0, 0.63, 1)` | a loader dot walking its line or crossing its offset axis from one end to the other, its size between an end and the middle, and the radial glide of a swirl hand-over: a sine's simple harmonic, at rest at either end and fastest halfway |
| `--dsh-claude-ease-dot-wave` | `cubic-bezier(0.45, 0, 0.55, 1)` | the vertical wave of the three round loader dots: symmetric quadratic ease-in-out with gentle holds at both turning points |
| `--dsh-claude-ease-dot-swirl` | `cubic-bezier(0.28, 0, 0.2, 1)` | the counter-clockwise angular sweep of a loader hand-over: brisk acceleration out of departure and a long smooth unwind into the landing pose |
| `--dsh-claude-ease-damped-out` | `cubic-bezier(0.33, 1, 0.68, 1)` | a loader dot's fade as the loader opens |
| `--dsh-claude-distance-nudge` | `4px` | the short offset a surface rises from, a small row's wording swap travels, and the colour disc under the pointer lifts |
| `--dsh-claude-distance-travel` | `8px` | the waiting line's wording swap, a settings page's slide, the overtime badge's sideways slide, and both directions of the waiting line's loader dots: the lift off their floor and the reach along their own lines |
| `--dsh-claude-distance-rise` | `12px` | how far below its place a line of the home greeting starts, and the overtime badge's upward slide |
| `--dsh-claude-blur-soft` | `2px` | the blur words and badges pass through while they swap or pop in, and a placeholder passes through as it hands its place over |
| `--dsh-claude-blur-enter` | `3px` | the blur a settings page or a line of the home greeting passes through as it slides or rises in |
| `--dsh-claude-scale-surface` | `0.98` | the scale a surface grows from as it rises, and a hint grows from as it appears |
| `--dsh-claude-scale-dropdown` | `0.97` | the scale a menu grows from out of its trigger |
| `--dsh-claude-scale-dropdown-exit` | `0.99` | the scale a menu shrinks to while it fades on closing |
| `--dsh-claude-scale-lift` | `1.05` | the scale the colour disc under the pointer grows to as it lifts |
| `--dsh-claude-scale-lift-falloff` | `0.45` | the share of its neighbour's lift a colour disc keeps, one disc further from the pointer |
| `--dsh-claude-scale-dialog` | `0.96` | the scale a full-window dialog grows from and returns to |
| `--dsh-claude-scale-dot-mid` | `0.55` | how small a loader dot is while it crosses the middle of its line; at either end it is the dot's own size, so the line motion never draws a dot larger than the bouncing one |
| `--dsh-claude-duration-resize` | `300ms` | a surface taking a new size: the model picker's card following a fold or the list a query leaves |
| `--dsh-claude-timing-feedback` | `var(--dsh-claude-duration-feedback) var(--dsh-claude-ease-standard)` | shorthand: a control's state change, written after the property in a transition |
| `--dsh-claude-timing-surface` | `var(--dsh-claude-duration-surface) var(--dsh-claude-ease-standard)` | shorthand: a surface appearing, written after the property or the keyframes' name |
<!-- /generated:motion -->

## Layers

Sibling-local ordering within a single stacking box uses literals `-1` through `9`; any surface clearing host chrome or floating over the window uses a `--dsh-claude-layer-*` token (D9).

<!-- generated:layers (packages/client/src/theme/tokens.json) -->
| Token | Value | Use |
|---|---|---|
| `--dsh-claude-layer-control` | `10` | a control kept over the composer card's own stacked rows: the send and stop buttons, the reasoning picker's trigger |
| `--dsh-claude-layer-picker` | `20` | a picker that hangs its card from inside the composer: the permission picker, whose card has to stand over the controls beside it |
| `--dsh-claude-layer-chrome` | `30` | the window's title row the skin draws into: the title, view tabs and actions over the host's own header |
| `--dsh-claude-layer-peek` | `40` | the sidebar opened over the page while the pointer rests on its toggle: over the main window's title row and its own controls, under the floating cards and menus its rows open |
| `--dsh-claude-layer-float` | `99999` | a floating card or menu over everything the host draws: the popover cards, the hero menu |
| `--dsh-claude-layer-tooltip` | `100000` | the host's own tooltip bubble while it explains a control inside a card the skin floats: over those cards, under a takeover |
| `--dsh-claude-layer-takeover` | `2147483000` | a surface that covers the whole window: the account-hold page, the sent message's stand-in in flight |
<!-- /generated:layers -->
