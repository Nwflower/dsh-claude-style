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

- Import needed libraries directly; never guard imports with try/catch. Recorded exception: the host half's guarded schemastery import in docs/architecture.md D10; any new exception must be written into that file first.
- Never enter plan mode on your own initiative.
- Never use Git to roll back any code. When the user says "roll back", it always means manually restoring code to its previous state with the edit tools.
- Never read from or write to the system temp directory; intermediate artifacts go to `.debug/` (gitignored).
- When the user provides a web link, read the full content of the link before starting execution; when you discover a mistake in how a library is used, re-read the full content of that link first.
- Do not minimize dependencies; never reinvent the wheel to avoid a dependency (this repository's "zero build toolchain, zero runtime dependencies" is the D1 architectural constraint and is excluded from this rule).
- Code must fail fast: throw at the point of error, never swallow errors, never fall back silently. The only catches allowed are the ones docs/architecture.md D12 lists, each with its reason written beside it.
- No mocks, no fake implementations, no workarounds that exist only to make tests pass.
- The user may withdraw or modify your changes at any time: re-read the file before continuing to edit, and build on the latest state the user left; never re-add content the user deleted.
- If the user asks about something else mid-task: answer immediately if you can, then resume the original task right away — never abandon a task half-done.
- When fixing errors in documentation or code, leave no trace of the error in the update.
- Every feature must be implemented, run, tested, and iterated until it works correctly; never stop after an initial implementation and ask the user to test. The verification gates for this repository are in "Change Workflow".
- Never inline long multi-line scripts on the command line; write the script to a file (in `.debug/`) first, then run it.
- Authored changes — new logic, new copy, new rules — go through the edit tools. Mechanical transformations across files (moving files, renaming identifiers or class names, rewriting paths, migrating syntax) may be scripted: write the script to `.debug/`, run it, read the whole resulting diff, and pass the gates; such a script never writes new logic.
- Never hand-write parsers that parse mature file formats as strings or byte streams; use a third-party library, or avoid parsing.
- A user message ending in a question mark is a question: answer only the question; do not offer a better approach, do not ask counter-questions, do not end with "ready when you are".
- After the user points out a mistake, continue working from the premise that the spot is wrong; do not restate why the mistake was wrong.
- Output stays in a clean final state: replies, code, comments, and commit messages carry no trace of earlier mistakes or the correction process — when the user points out something extra you did, delete it and be done; never mention it again in commit titles or comments.

## Principles

- This repository only builds a Web theme plugin; it never modifies the DSH engine, apiproxy, or the official UI packages. All effects are achieved on the browser side through CSS overrides and client-side DOM overrides (docs/architecture.md D2).
- Zero build toolchain, zero runtime dependencies: `scripts/build.mjs` concatenates the `src/` fragments verbatim in a fixed order into the single file `lib/client.js`. Do not introduce bundlers like esbuild/rollup, do not introduce any new runtime dependency (the DSH module loader has no relative require and no asset URLs — see docs/architecture.md D1). One-off development tools run from `.debug/` and never enter `package.json`.
- `lib/` holds build output only — `client.js`, `model-descriptions.json`, `claude-mark.svg` — never edited by hand; run `npm run build` after changing `src/`. The handwritten host half lives in `host/`.
- The npm package does not distribute the Anthropic Sans/Serif fonts; `fonts/` is a repository-only download. Anthropic fonts are copyrighted by Anthropic and are not covered by MIT. The JetBrains Mono code font ships with the plugin package under the SIL OFL.
- Public documentation (bilingual README, CHANGELOG) never shows internal numbering; the decision numbers in docs/architecture.md are stable identifiers that code comments cite.
- Local debug scripts, screenshots, and intermediate artifacts all go into `.debug/` and are never committed.
- Read `docs/architecture.md` (the decisions currently in force) before structural changes; never contradict a recorded decision. If a decision truly must be overturned, first rewrite that entry and say why the old decision no longer holds.
- Conflict priority: the user's current instruction > current repository code > this file > docs/. Whether a convention overturned by a current instruction gets written back into documentation is the user's call — the AI does not guess on the spot.

## Stop Lines

- When a fragment under `src/` (.js/.css) approaches 750 lines: stop adding features to it, and propose splitting it along its responsibilities inside its feature folder (helper factories, docs/architecture.md D13 / D18); wait for the user's confirmation, and until then the file gets bug fixes only.
- When the same host selector pattern or the same DOM query logic appears for the 3rd time: stop and move it into `src/shared/` (or `src/core/host.js` for host accessors); do not write a 3rd copy.
- These are hard stop lines: stop the moment they trigger, without first judging "whether it's worth it".

## Commands

```sh
npm run build            # src/ → lib/client.js; checks listed files, %%TOKEN%%, composer gate, :has() placement, syntax, model copy; prints the build id
npm run smoke            # lib/ against a stand-in host: private-route fences; in headless Chrome: startup, 0 idle passes, no markup injection, Enter stays with the host, feature isolation, no uncaught errors, clean teardown
node scripts/probe.cjs --token <launch-token>          # composer invariants against a running `dsh web`
node scripts/probe-timing.cjs --token <launch-token>   # itemized timing: startup, model catalog readiness, open latency, heap
node scripts/shoot.cjs --token <launch-token>          # re-shoot the README screenshots (docs/light.png / docs/dark.png)
```

probe / probe-timing / shoot need a running `dsh web` instance (default `http://127.0.0.1:3080`; `--url` for another); the token is the `/?token=…` in the GUI URL (or `DSH_WEB_TOKEN`). smoke needs no running instance. All of them need a local Chrome/Edge (`CHROME_PATH` to choose one).

### Live inspection

Read the running GUI before starting a probe:

- **Desktop window**: `node D:\Build\dsh-desktop-bridge\bin\bridge.cjs "<expression>"` evaluates an expression in the desktop window the user is looking at and prints the value (`--stdin` reads a longer script from a file). The same bridge is the `desktop_eval` tool for the DSH model.
- **`dsh web` tab**: open the GUI URL in a browser the agent can drive and evaluate there.
- **Which build a page runs**: `document.body.getAttribute('data-dsh-claude-style')` is the build id of the bundle the page is running; `npm run build` prints the id it wrote. A hot reload swaps the bundle without reloading the page, so the page's load time says nothing about its code. A page that has gone through many hot reloads can carry state from older generations; reload it before treating what it shows as evidence.
- **The engine checkout is a sibling of this repository** (`../deepseek-harness`, `D:\Build\deepseek-harness` here): `@deepseek-ai/dsh-root`, the host version under test. The host's own client sources and bundles live under `packages/client/*/` — read the host's markup, contracts (e.g. the renderer's `[data-slot]` anchors) and wiring there rather than unpacking npm tarballs.

## Repository Layout

The assembly order lives in `scripts/build.mjs` (`FRAGMENTS` / `STYLE_FILES`) and the feature list in `src/entry.js` (`FEATURES`); those lists are authoritative and the build refuses a source file neither list names. The layout (docs/architecture.md D18):

- `src/core/` — host accessors (`host.js`), the preference store, model copy, i18n, the scheduler.
- `src/shared/` — parts more than one feature uses, JS beside CSS: `dom.js` (`buildElement`, `createStamp`), `notify.js` (`notifyAll`), `popover.*` (anchoring, hover intent, the popover registry, the card shell and rows), `sliding-pill.*` (the segmented controls' sliding highlight).
- `src/theme/` — the global look no single feature owns (tokens, typography, chrome, hero brand, sidebar, third-party fixes).
- `src/features/<feature>/` — one feature's installer, its helper factories and its stylesheets, side by side; the main file carries the feature's name.
- `src/constants.js` is evaluated at build time to fill `%%TOKEN%%` placeholders; `src/model-descriptions.json` is model copy data plus the `brands` bindings; `src/assets/brand/*.svg` are brand marks inlined as CSS data URIs; `src/assets/icons/combine/*.svg` are vendor lockups inlined as a JS markup table; `src/assets/icons/*.svg` are hand-provided lockup assets that take priority over network fetching during vendoring.
- `host/` — the handwritten host half (`index.js` and its sibling modules): private routes and the settings `Config` (docs/architecture.md D10, D11).
- `lib/` — build output only. `claude-mark.svg` is `package.json`'s `icon`, copied from `src/assets/brand/claude-mark-clay.svg`.
- `locale/` — plugin metadata localization (`meta.title` / `meta.description` per `<language>.json`); `exports` must cover them with `"./locale/*"`, or the host degrades the whole metadata (icon included) to `meta.error`.
- `skin.json` is the skin manifest; `cordis.patch.yml` inserts `ui-skin-claude-style` into the web roster.
- `scripts/` — build and regression tools (`fetch-lobe-combines.py` is the only networked script: run by hand, never part of the build); `docs/` — architecture, style guide, screenshots; `fonts/` — font files.
- `.debug/` and `node_modules/` are never committed.

## Core Conventions

### CSS

- Every rule hangs under `body[data-dsh-claude-style]`; dark tokens are the base, light overrides go under `:not([data-ds-dark-theme])`. Light main canvas `#FCFCFB`, dark `#141413`, accent ember orange `#D97757`; no pure white, pure black, or cold grays.
- Composer rules sit below the `/* @composer-gate */` marker; the build stamps the composer gate onto every rule below it (docs/architecture.md D4).
- `:has()` only in a selector's last compound; structure-dependent state is written as an attribute by the feature's pass (docs/architecture.md D9). The build refuses the other placement.
- A feature never borrows another feature's class names; shared looks use the neutral shared classes (`dsh-claude-popover-card`, `dsh-claude-popover-item`, …).
- Design tokens and shape rules live in `docs/STYLE.md`; read it before changing visuals.

### Host Selector Discipline

Full rules in docs/architecture.md D3 and D19. In short: prefer the host's contracts (`[data-slot="<key>"]` anchors, the host's own data-* attributes), then marks the skin's pass writes (`data-dsh-claude-control` on the composer's buttons), then hashed class substrings — and those use the longest stable fragment (`[class*="_row"]`, never `[class*="row"]`); broad fragments only in deliberately global rules. Never match host elements by their visible text. Never override the host's active-period layout contract on `[class*="viewArea"]`. After adding a substring selector, compare what it matches on a live page.

### JS Fragments

All fragments share one factory scope: no import/export, 4-space base indentation, modern syntax (`const`/`let`, arrow functions, optional chaining). React comes from the build's header (`require('react')`); other host packages are `require`d directly where they are used. Helper fragments export top-level `createX(...)` factories named after their feature; features are installed and ordered through `src/entry.js`'s FEATURES table (docs/architecture.md D13). Reach for the shared parts before writing a local version: `buildElement`, `createStamp`, `notifyAll`, `createSlidingPill`, the popover utilities.

### Model Copy Is Data, Not Bundle

- `src/model-descriptions.json` is validated at build time and **copied** to `lib/`; the browser side fetches it through the host route the first time it renders a picker. Extending the copy table requires no JS change.
- Each entry is `{ locale: text }`; lookup degrades through: exact entry → family rule → tier rule → catalog's own text.
- The copy is product-line copy: mapped by name pattern, unchanged across version iterations and retirements; never add self-invented tier prefixes (like "Flagship tier:"); never repeat the model name already in the row.
- Family rules are ordered and must be anchored (e.g. the `flash` rule is scoped to deepseek); **never write superlatives like "strongest/flagship"** — superlatives are only allowed in exact entries bound to a concrete version number. Full policy in docs/architecture.md D5.

### Screenshots and Privacy

- Before writing to disk, `shoot.cjs` replaces workspace names / session titles / usernames / drive-letter paths / balances with neutral stand-ins and runs a leak scan; a failed scan fails the run and must not be bypassed.

## Change Workflow

1. Change `src/` (or `host/`); never touch `lib/`.
2. `npm run build` to regenerate the artifacts and pass the build's checks.
3. `npm run smoke`; with a `dsh web` instance running, also `node scripts/probe.cjs --token <token>` (composer pinned to the bottom, starts single-line, grows with content, restores when cleared). Check the live page too (see Live inspection), including after a hot reload.
4. Visual changes are checked by the user in both light and dark modes; when README screenshots go stale, re-shoot them with `shoot.cjs`.
5. Sync documentation: the bilingual READMEs (`README.md` Chinese / `README.en.md` English) change together; behavioral changes go into `CHANGELOG.md`'s `[Unreleased]` section — format in "Git and Release"; a changed decision goes into docs/architecture.md.
6. A feature is done when all gates pass and behavior is verified correct; if a gate fails, keep fixing — never hand it to the user for testing.

## Git and Release

- Use conventional commit prefixes (`fix(scope):` / `refactor(scope):` / `docs(scope):` / `chore(release):` etc.); one logical change per commit, no WIP commits, no unrelated changes mixed in. A commit that only moves files is kept apart from commits that change logic.
- Required before committing: `npm run build` succeeds and the working tree has no stray files. `lib/` artifacts are **not** committed with the source; at release the complete artifacts are rebuilt from `src/` and committed with the release commit — users consume versions, not commits.
- Another session may be editing the same working tree. Commit only your own changes: stage whole files only when every change in them is yours, otherwise stage your hunks alone (`git apply --cached` of the filtered hunks). Before committing, export the index (`git checkout-index -a --prefix=.debug/<dir>/`) and run the build and smoke there, so the commit is checked exactly as it will be stored.
- Release flow: update CHANGELOG → `npm version patch|minor` → `npm run build` and commit the rebuilt `lib/` artifacts → tag → `npm publish` (`prepublishOnly` re-runs the build automatically) → GitHub Release, with release notes taken from the CHANGELOG section for that version.
- CHANGELOG format (same spec as dsh upstream release notes):
  - Version sections: `## [x.y.z] - YYYY-MM-DD`, newest on top; in-development changes go under `## [Unreleased]`.
  - Each section is bilingual on one page: first a `[中文](#cn-x.y.z) | [English](#en-x.y.z)` language-switch line, then two anchors `<h3 id="cn-x.y.z">新增功能</h3>` (Chinese) and `<h3 id="en-x.y.z">New Features</h3>` (English) — anchor ids must carry the version number to avoid same-name collisions across sections on the page; further groups within each language use plain `###` headings.
  - Groups are fixed in name and order: Chinese `新增功能` / `体验优化` / `问题修复` / `安全` / `移除` / `其他变更`, English `New Features` / `Improvements` / `Bug Fixes` / `Security` / `Removals` / `Chores`; groups with no content are omitted entirely.
  - Section footer: `**Full Changelog**: [vPrevious...vCurrent](compare link)`.
  - Content policy: one entry per verifiable behavior or contract, no implementation diaries — an entry states what the user sees and does (the symptom, then the behavior after the fix); root causes and internal mechanism belong in the commit message, not the entry; changes to external contracts (settings, private routes, host version requirements) must be called out explicitly; performance changes carry locally measured numbers; user-facing behavior changes stay in sync with the bilingual READMEs and docs.
  - No internal numbering, no "AI-ification" boilerplate, no self-referential explanatory text (format notes live in this spec, not in version sections).
