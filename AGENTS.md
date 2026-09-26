# AGENTS.md

`dsh-claude-style` is a theme plugin for DeepSeek Harness that replicates the look and interaction of Claude Code Desktop.

## Writing Rules

- When no comparison is requested, do not use contrast constructions like "not X but Y" or "do X instead of Y"; without something to contrast against, no contrast appears.
- Proposals must be fully considered and complete in one pass; never phrase work as "first do a version that does X, then observe and adjust". When multiple proposals are genuinely needed, each must stand on its own in parallel; never order them as tiers from conservative to aggressive.
- Do not enumerate or report results that were ruled out during searching and troubleshooting.
- Answers have no preamble and no summary: no "in one sentence" wrap-ups, no "the above is an overview, now let's break it down" sentences.
- Code identifiers keep their original English names; never invent shorthand abbreviations; when describing concrete operations, use complete verb–object phrasing that states both the action and its target.
- If a reply is written in Chinese, words must use their full forms of two or more characters (崩溃, 终止, 判定, 推断, 抛出, 挂起, 卡死), never single-character abbreviations; jargon like 「落地」「钉死」「对齐」「栈」 is banned — use everyday words understandable to people outside the internet industry.

## Behavioral Red Lines

- Import needed libraries directly; never guard imports with try/catch. Recorded exception: the settings layer's guarded schemastery import in docs/architecture.md D10; any new exception must be written into that file first.
- Never enter plan mode on your own initiative.
- Never use Git to roll back any code. When the user says "roll back", it always means manually restoring code to its previous state with the edit tools.
- Never read from or write to the system temp directory; intermediate artifacts go to `.debug/` (gitignored).
- When the user provides a web link, read the full content of the link before starting execution; when you discover a mistake in how a library is used, re-read the full content of that link first.
- Do not minimize dependencies; never reinvent the wheel to avoid a dependency (this repository's "zero build toolchain, zero runtime dependencies" is the D1 architectural constraint and is excluded from this rule).
- Code must fail fast: throw at the point of error, never swallow errors, never fall back silently. Recorded exception: per-feature failure isolation in docs/architecture.md D12 is a deliberate decision, and the fallbacks in each feature's install/sync stay.
- No mocks, no fake implementations, no workarounds that exist only to make tests pass.
- The user may withdraw or modify your changes at any time: re-read the file before continuing to edit, and build on the latest state the user left; never re-add content the user deleted.
- If the user asks about something else mid-task: answer immediately if you can, then resume the original task right away — never abandon a task half-done.
- When fixing errors in documentation or code, leave no trace of the error in the update.
- Every feature must be implemented, run, tested, and iterated until it works correctly; never stop after an initial implementation and ask the user to test. The verification gates for this repository are in "Change Workflow".
- Never inline long multi-line scripts on the command line; write the script to a file (in `.debug/`) first, then run it.
- Python files start with no docstring and no shebang; comments are in Chinese with technical terms kept in English; do not over-comment.
- Never modify code programmatically (heredoc, Python scripts, sed, perl, etc.), even if the user asks; all code changes go through the edit tools.
- Never hand-write parsers that parse mature file formats as strings or byte streams; use a third-party library, or avoid parsing.
- A user message ending in a question mark is a question: answer only the question; do not offer a better approach, do not ask counter-questions, do not end with "ready when you are".
- After the user points out a mistake, continue working from the premise that the spot is wrong; do not restate why the mistake was wrong.
- Output stays in a clean final state: replies, code, comments, and commit messages carry no trace of earlier mistakes or the correction process — when the user points out something extra you did, delete it and be done; never mention it again in commit titles or comments.

## Principles

- This repository only builds a Web theme plugin; it never modifies the DSH engine, apiproxy, or the official UI packages. All effects are achieved on the browser side through CSS overrides and client-side DOM overrides.
- Zero build toolchain, zero runtime dependencies: `scripts/build.mjs` concatenates the `src/` fragments verbatim in a fixed order into the single file `lib/client.js`. Do not introduce bundlers like esbuild/rollup, do not introduce any new dependency (the DSH module loader has no relative require and no asset URLs — this architecture must be preserved, see docs/architecture.md D1).
- `lib/client.js`, `lib/model-descriptions.json`, and `lib/claude-mark.svg` are build artifacts; never edit them by hand — run `npm run build` after changing `src/`. `host/index.js` is the handwritten host side and can be edited directly.
- The npm package does not distribute the Anthropic Sans/Serif fonts; `fonts/` is a repository-only download. Anthropic fonts are copyrighted by Anthropic and are not covered by MIT. The JetBrains Mono code font ships with the plugin package under the SIL OFL.
- Public documentation (bilingual README, docs, CHANGELOG) never shows internal numbering.
- Local debug scripts, screenshots, and intermediate artifacts all go into `.debug/` and are never committed.
- Read `docs/architecture.md` (architectural decisions and trade-offs) before structural changes; never contradict recorded decisions. If a decision truly must be overturned, first explain in that document why the old decision no longer holds.
- Conflict priority: the user's current instruction > current repository code > this file > docs/. Whether a convention overturned by a current instruction gets written back into documentation is the user's call — the AI does not guess on the spot.

## Size Stop Lines (Mechanically Triggered, Not Judgment-Based)

- When any fragment under `src/` (.js/.css) approaches 750 lines: stop adding new features to it, output a split proposal and wait for user confirmation; until the proposal is approved, that file gets bugfixes only. The split layout and relocation discipline are in docs/architecture.md D13.
- When the same host selector pattern or the same DOM query logic appears for the 3rd time: likewise stop and propose a merge; do not write a 4th copy.
- These two are hard stop lines for the executing model: stop the moment they trigger, without first judging "whether it's worth it".

## Commands

```sh
npm run build            # Concatenate src/ → lib/client.js; validate %%TOKEN%%, CSS gate, syntax, and model-descriptions.json
npm run smoke            # Smoke-test the lib/ artifacts: fences on host-side private routes; in headless Chrome: startup, 0 idle passes, no markup injection, Enter stays with the host, feature isolation, clean teardown
node scripts/probe.cjs --token <launch-token>   # Headless Chrome asserting composer invariants against a running GUI
node scripts/probe-timing.cjs --token <launch-token>   # Itemized timing: startup long tasks and resources, model catalog readiness, open latency, line composition, lockup markup parsing, heap
node scripts/shoot.cjs --token <launch-token>   # Re-shoot the README screenshots (docs/light.png / docs/dark.png)
```

probe / shoot need a running `dsh web` instance; the token comes from the `/?token=…` in the GUI URL (or the `DSH_WEB_TOKEN` environment variable). smoke does not — it checks the artifacts against a stand-in host page. All three require a local Chrome/Edge (set `CHROME_PATH` to specify one).

### Live inspection

Read the running GUI before starting any probe instance: `desktop.eval` evaluates an expression inside the live page (the desktop window or a `dsh web` tab) and returns its value, so the skin's real rendering and the host's real markup can be read straight from the window the user is looking at. The skin is applied when `document.body.hasAttribute('data-dsh-claude-style')`.

Two facts decide what that page is actually running:

- **A page keeps the bundle it loaded.** Compare `performance.timeOrigin` in the page against `lib/client.js`'s modification time: a page older than the last build runs stale code, so a symptom reported from it may already be fixed — or may predate the change entirely. Ask for a reload before treating a screenshot as evidence about the current build.
- **The engine checkout is a sibling of this repository** (`../deepseek-harness`, `D:\Build\deepseek-harness` here): `@deepseek-ai/dsh-root`, the host version under test. The host's own client bundles live at `packages/client/*/lib/client.js` — the same files the GUI runs — so read the host's markup and wiring there rather than unpacking npm tarballs. A second copy of the published packages sits in the npm global root and in `%APPDATA%\@deepseek-ai\dsh-desktop`.

## Repository Layout

- `src/` — all source code. The fragment list and assembly order live in `scripts/build.mjs` (`FRAGMENTS` / `STYLE_FILES`, enforced by the build); the feature list lives in `src/entry.js` (`FEATURES`) — those two lists are authoritative, this section does not enumerate files. Layout conventions: `constants.js` is evaluated at build time to fill %%TOKEN%% placeholders; `context/` holds host accessors, the preference store, model copy, i18n; `overrides/` holds one fragment per feature plus the shared popover-utils and the scheduler, and a feature split into helper fragments gets a subdirectory named after it (split layout in docs/architecture.md D13); `styles/` splits into root stylesheets, `composer/` and `components/`; `assets/brand/*.svg` are brand marks inlined as CSS data URIs at build time; `assets/icons/combine/*.svg` are vendor lockups (icon + vendor wordmark combined into one SVG) inlined at build time as a JS markup table; `assets/icons/*.svg` are hand-provided lockup assets, same level as the generated `combine/`, taking priority over network fetching during vendoring; `model-descriptions.json` is model copy data + the `brands` brand bindings and `brands.lockups` override table.
- `lib/` is the artifact directory: `client.js`, `model-descriptions.json` and `claude-mark.svg` are build output, never hand-edited (the icon is copied from `src/assets/brand/claude-mark-clay.svg` — it is `package.json`'s `icon`, which the 0.1.7 plugin manifest reads for the plugin card icon). The host side is handwritten: `index.js` and its sibling modules (e.g. the usage roll-up), providing private routes like `/dsh-claude-style/model-descriptions.json` — security constraints in docs/architecture.md D11.
- `locale/` (plugin metadata localization): `meta.title` / `meta.description` in `<language>.json`, read by the 0.1.7 plugin card and detail page; `exports` must cover them with the `"./locale/*"` wildcard — the host resolves through exports file by file, and a missing one throws during enumeration, degrading the entire metadata (including the icon) to `meta.error`.
- `skin.json` is the skin manifest; `cordis.patch.yml` inserts `ui-skin-claude-style` into the web roster.
- `scripts/` — build and regression tools (`fetch-lobe-combines.py` is the only networked script: run by hand, never part of the build; it fetches Lobe assets per the brand table in `model-descriptions.json` and composes the lockups); `docs/` — documentation and screenshots; `fonts/` — font files (JetBrains Mono ships in the package; Anthropic fonts are repository-only downloads).
- `.debug/` and `node_modules/` are never committed.

## Core Conventions

### CSS

- Every rule must hang under `body[data-dsh-claude-style]`; dark tokens are the base, light overrides go under `:not([data-ds-dark-theme])`. Light main canvas `#FCFCFB`, dark `#141413`, accent ember orange `#D97757`; no pure white, pure black, or cold grays.
- Composer-related rules must sit below the `/* @composer-gate */` marker; the build stamps the `[%%COMPOSER_ATTR%%]` gate onto every rule below the marker — a missed one fails the build (see docs/architecture.md D4).
- Design tokens and shape rules live in `docs/STYLE.md`; read it before changing visuals.

### Host Selector Discipline

The host uses hashed CSS-module class names. Two inviolable rules: substring matching uses only the **longest stable fragment** (`[class*="_row"]`, never `[class*="row"]`); never override the host's active-period layout contract on `[class*="viewArea"]`. After adding a substring selector, you must check for collateral damage. Incident background and details in `docs/STYLE.md` and docs/architecture.md D3.

### JS Fragments

All fragments share one factory scope: **no import/export**, keep 4-space base indentation and ES5 style; `%%TOKEN%%` is replaced by the build and no residue may remain in the artifact; React is obtained only via the loader's `require('react')`. The fragment list and concatenation order are in `scripts/build.mjs`; helper fragments export top-level `createX(...)` factories, features are installed and ordered uniformly through entry.js's FEATURES table — the contract is in docs/architecture.md D13.

### Model Copy Is Data, Not Bundle

- `src/model-descriptions.json` is validated at build time and **copied** to `lib/`; the browser side fetches it through the host route the first time it renders a picker. Extending the copy table requires no JS change.
- Each entry is `{ locale: text }`; lookup degrades through: exact entry → family rule → tier rule → catalog's own text.
- The copy is product-line copy: mapped by name pattern, unchanged across version iterations and retirements; never add self-invented tier prefixes (like "Flagship tier:"); never repeat the model name already in the row.
- Family rules are ordered and must be anchored (e.g. the `flash` rule is scoped to deepseek); **never write superlatives like "strongest/flagship"** — superlatives are only allowed in exact entries bound to a concrete version number, otherwise old models get mislabeled as flagship. Full policy in docs/architecture.md D5.

### Screenshots and Privacy

- Before writing to disk, `shoot.cjs` replaces workspace names / session titles / usernames / drive-letter paths / balances with neutral stand-ins and runs a leak scan; a failed scan fails the run and must not be bypassed.

## Change Workflow

1. Change `src/` (CSS or JS fragments); never touch `lib/client.js`.
2. `npm run build` to regenerate artifacts and pass the syntax gate.
3. `npm run smoke` to smoke-test the artifacts against the stand-in host; with a `dsh web` instance running, also run `node scripts/probe.cjs --token <token>` to assert the composer invariants (pinned to bottom, starts single-line, grows with content, restores when cleared).
4. Visual changes are checked by the user in both light and dark modes; when README screenshots go stale, re-shoot them with `shoot.cjs`.
5. Sync documentation: the bilingual READMEs (`README.md` Chinese / `README.en.md` English) change together; behavioral changes go into `CHANGELOG.md`'s `[Unreleased]` section — format in "Git and Release".
6. A feature is done when all gates pass and behavior is verified correct; if a gate fails, keep fixing — never hand it to the user for testing.

## Git and Release

- Use conventional commit prefixes (`fix(scope):` / `refactor(scope):` / `docs(scope):` / `chore(release):` etc.); one logical change per commit, no WIP commits, no unrelated changes mixed in.
- Required before committing: `npm run build` succeeds and the working tree has no stray files. `lib/client.js` and `lib/model-descriptions.json` are build output and are **not** committed with the source: while a parallel session edits the same tree they stay out of the commit entirely, and each session commits only its own source. At release the complete artifacts are rebuilt from `src/` and committed together with the release commit — users consume versions, not commits.
- Release flow: update CHANGELOG → `npm version patch|minor` → `npm run build` and commit the rebuilt `lib/` artifacts → tag → `npm publish` (`prepublishOnly` re-runs the build automatically) → GitHub Release, with release notes taken from the CHANGELOG section for that version.
- CHANGELOG format (same spec as dsh upstream release notes):
  - Version sections: `## [x.y.z] - YYYY-MM-DD`, newest on top; in-development changes go under `## [Unreleased]`.
  - Each section is bilingual on one page: first a `[中文](#cn-x.y.z) | [English](#en-x.y.z)` language-switch line, then two anchors `<h3 id="cn-x.y.z">新增功能</h3>` (Chinese) and `<h3 id="en-x.y.z">New Features</h3>` (English) — anchor ids must carry the version number to avoid same-name collisions across sections on the page; further groups within each language use plain `###` headings.
  - Groups are fixed in name and order: Chinese `新增功能` / `体验优化` / `问题修复` / `安全` / `移除` / `其他变更`, English `New Features` / `Improvements` / `Bug Fixes` / `Security` / `Removals` / `Chores`; groups with no content are omitted entirely.
  - Section footer: `**Full Changelog**: [vPrevious...vCurrent](compare link)`.
  - Content policy: one entry per verifiable behavior or contract, no implementation diaries — an entry states what the user sees and does (the symptom, then the behavior after the fix); root causes and internal mechanism belong in the commit message, not the entry; changes to external contracts (settings, private routes, host version requirements) must be called out explicitly; performance changes carry locally measured numbers; user-facing behavior changes stay in sync with the bilingual READMEs and docs.
  - No internal numbering, no "AI-ification" boilerplate, no self-referential explanatory text (format notes live in this spec, not in version sections).
