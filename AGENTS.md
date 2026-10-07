# AGENTS.md

`dsh-claude-style` is a theme plugin for DeepSeek Harness that replicates the look and interaction of Claude Code Desktop. It is a layer over the host: until the host offers an extension point for something, the effect is made with CSS and DOM overrides in the browser (docs/decisions/D43).

The repository is moving to the architecture in `docs/decisions/` (D36–D48). A decision marked 待实施 states the current state (现状); until it is implemented, change code according to that current state. "Commands", "Current Layout" and "Change Workflow" below describe what runs today and are updated as each migration step lands.

## Writing Rules

- When no comparison is requested, do not use contrast constructions like "not X but Y" or "do X instead of Y".
- Proposals are fully considered and complete in one pass; never phrase work as "first do a version, then observe and adjust". When several proposals are genuinely needed, each stands on its own in parallel; never order them as tiers from conservative to aggressive.
- Do not enumerate or report results that were ruled out during searching and troubleshooting.
- Answers have no preamble and no summary.
- Code identifiers keep their original English names; never invent abbreviations; describe concrete operations with complete verb–object phrasing.
- A reply written in Chinese uses full words of two or more characters (崩溃, 终止, 判定, 推断, 抛出, 挂起, 卡死), never single-character abbreviations; jargon like 「落地」「钉死」「对齐」「栈」 is banned.

## Behavioral Red Lines

- Import needed libraries directly; never guard imports with try/catch. The one recorded exception is the host half's guarded schemastery import (D10); any new exception is written into a decision first.
- Never enter plan mode on your own initiative.
- Never use Git to roll back code. "Roll back" from the user always means restoring the previous state by hand with the edit tools.
- Never read from or write to the system temp directory; intermediate artifacts go to `.debug/` (gitignored).
- When the user provides a web link, read its full content before starting; when a library turns out to be used wrongly, re-read that link in full first.
- Do not reinvent a wheel to avoid a dependency. The package has zero *runtime* dependencies: React and the host packages come from the host at runtime (D36).
- Fail fast: throw where the error is, never swallow it, never fall back silently. The only catches allowed are the ones D12 lists, each with its reason beside it.
- No mocks, no fake implementations, no workarounds that exist only to make tests pass.
- The user may withdraw or modify your changes at any time: re-read a file before continuing to edit it, build on the latest state, never re-add what the user deleted.
- If the user asks about something else mid-task, answer at once if you can, then resume the original task; never leave a task half-done.
- When fixing an error in documentation or code, leave no trace of the error.
- Every feature is implemented, run, tested and iterated until it works; never stop after a first version and ask the user to test.
- Never inline long multi-line scripts on the command line; write the script to `.debug/` and run it.
- Authored changes — new logic, copy, rules — go through the edit tools. Mechanical transformations across files (moving, renaming, rewriting paths, migrating syntax) may be scripted: the script lives in `.debug/`, its whole diff is read afterwards and the gates are passed; the script never writes new logic.
- Never hand-write a parser for a mature file format; use a library, or avoid parsing.
- A user message ending in a question mark is a question: answer only the question; no better approach, no counter-question, no "ready when you are".
- After the user points out a mistake, continue from the premise that the spot is wrong; do not restate why.
- Output stays in a clean final state: replies, code, comments and commit messages carry no trace of earlier mistakes or of the correction process.
- Conflict priority: the user's current instruction > current repository code > this file > `docs/`. Whether a convention overturned by a current instruction is written back into the documents is the user's call.

## Principles

- Read the relevant decisions in `docs/decisions/` before a structural change; never contradict one. If a decision must be overturned, first write the replacing decision and retire the old number (D48).
- Public documentation (the bilingual READMEs, the CHANGELOG) never shows decision numbers.
- The Anthropic Sans/Serif fonts are Anthropic's, for personal use, not covered by MIT, and never shipped in the npm package; `fonts/` is a repository-only download. JetBrains Mono, Inter and Noto Serif ship under the SIL OFL 1.1. The pixel crab is Anthropic's character and its sheets are not covered by MIT. Deepy's sheets are by calmly-eating-bugs (@wp3171216237); `showcase/gifs/` holds that author's GIFs and stays out of the package.
- Local debug scripts, screenshots and intermediate artifacts go into `.debug/` and are never committed. Drafts are deleted when the task ends; `race.cjs`, `send-trace.cjs` and `sample-flight.cjs` stay until D45 turns them into maintained tools.

## Stop Lines

Hard stops: stop the moment one triggers, without first judging whether it is worth it.

- A source file approaching 750 lines: stop adding features to it and propose splitting it by responsibility inside its feature directory; wait for the user's confirmation, and until then the file gets bug fixes only.
- The same host query or the same pattern appearing a 3rd time: stop and move it into the shared layer (host accessors into the host access module); never write a 3rd copy.

## Conventions

### CSS

- Every rule is scoped under `body[data-dsh-claude-style]`; dark tokens are the base, light overrides go under `:not([data-ds-dark-theme])`. Light canvas `#FCFCFB`, dark `#141413`, accent ember orange `#D97757`; no pure white, pure black or cold grays.
- Composer rules are gated (D4); `:has()` only in a selector's last compound (D9); rules that write host tokens carry the palette or typeface gate (D30).
- A feature never borrows another feature's class names; shared looks use the neutral shared classes (`dsh-claude-popover-card`, `dsh-claude-popover-item`, …).
- Design tokens and shape rules are in `docs/STYLE.md`; read it before changing visuals.

### Host Selectors

Read D3 and D19 before adding a host selector. After adding a substring selector, compare what it matches on a live page.

### Comments

Comments carry only what a reader needs to keep the code correct: why the code has this shape, the host contract it depends on, the ordering that matters, what breaks if it changes. One to three lines is the norm. Never restate the code, narrate the change, or record measurements or release history. Design reasoning lives in the decisions — cite the number (`D9`); visual rules cite `docs/STYLE.md`.

### Model Copy

Read D5 before editing `src/model-descriptions.json`.

### Screenshots and Privacy

Before writing to disk, `shoot.cjs` replaces workspace names, session titles, usernames, drive-letter paths and balances with neutral stand-ins and runs a leak scan; a failed scan fails the run and is never bypassed. The conversation scene opens the sidebar conversation titled `Markdown rendering tour` and refuses one holding any user message other than the demo prompt in `scripts/shoot.cjs`.

## Current Layout

Target layout: D46. Today:

- `src/core/` host access, preferences, model copy, i18n, the scheduler, the observation bus and the frame pipeline (D40), with their unit tests beside them (`*.test.ts`); `src/shared/` parts several features use (TypeScript beside CSS); `src/theme/` the global look no single feature owns; `src/features/<feature>/` one feature's installer, helpers and stylesheets, the main file named after the feature.
- `src/constants.ts` holds build-time constants; `src/model-descriptions.json` the model copy and `brands` bindings, its shape declared in `src/model-descriptions.schema.json`; `src/assets/` brand marks, mascot sheets and vendor lockups.
- `src/generated.d.ts` types the module the build generates; `src/globals.d.ts` the DOM additions and the element properties the skin sets; `tsconfig.json` the type check.
- `host/` the handwritten host half (private routes, settings `Config`, HDSL, search, usage).
- `lib/` build output only, never edited by hand.
- `locale/<language>.json` plugin metadata; `package.json`'s `exports` must cover them with `"./locale/*"`, or the host degrades the whole metadata (icon included) to `meta.error`.
- `skin.json` the skin manifest; `cordis.patch.yml` inserts the skin into the web roster.
- `scripts/` build, smoke and live tools (`fetch-lobe-combines.py` is the only networked script, run by hand; `draw-crab.py` redraws the crab's sheets after a drawing change); `docs/` decisions, style guide, screenshots; `fonts/`; `showcase/gifs/`.

The source is TypeScript ES modules under `strict` (D36). A module nothing imports fails the build; a feature is a directory under `src/features/` whose main module exports `install(ctx, ui)` beside a `<main>.manifest.ts` (D42) — its order, switch, stylesheets with their ranks, settings switch row, smoke cases and description; a stylesheet that belongs to no feature goes into `THEME_SHEETS` in `scripts/build.mjs`. React and the host packages are imported by name and stay external; build-time data (stylesheet, lockups, sheet stamps, build id) is imported from `virtual:dsh-claude-style/generated`. A host value without a type yet is `HostValue` (D44); a non-null assertion `!` only marks a value the call order guarantees.

## Commands

```sh
npm install                                  # dev dependencies: TypeScript, esbuild, Ajv, Vitest, Playwright, React types
npm run build                                # type-checks src/, bundles it into lib/client.js with its source map, runs the build checks, prints the build id
npm test                                     # unit tests: Vitest in browser mode on the local Chrome/Edge
npm run smoke                                # full run: every browser case and check, plus the host half's route checks
npm run smoke -- --quick --feature <dir>     # iteration run: quick tier, cases covering one src/features/ directory
npm run smoke -- --case <name>[,<name>…]     # named browser cases
npm run smoke -- --feature <dir>[,<dir>…]    # cases covering those directories (the `cases` of their manifests)
node scripts/probe.cjs --token <launch-token>          # composer invariants against a running dsh web
node scripts/probe-timing.cjs --token <launch-token>   # startup, catalog readiness, open latency, heap
node scripts/shoot.cjs --token <launch-token> --brand <claude|deepseek> --scene <home|conversation>   # re-shoot one README screenshot pair
```

The quick tier leaves out the motion cases; a feature whose cases all watch motion needs the run without `--quick`. probe, probe-timing and shoot need a running `dsh web` (default `http://127.0.0.1:3080`, `--url` for another; the token is the `/?token=…` in the GUI URL or `DSH_WEB_TOKEN`). All of them need a local Chrome/Edge (`CHROME_PATH` to choose one).

### Live Inspection

- Desktop window: `node D:\Build\dsh-desktop-bridge\bin\bridge.cjs "<expression>"` evaluates in the window the user sees (`--stdin` reads a script file). While that window is in the background its animation frames are paused: a probe waiting on `requestAnimationFrame` hangs, and anything it put in the page must be cleaned up by hand.
- Which build a page runs: `document.body.getAttribute('data-dsh-claude-style')`; `npm run build` prints the id it wrote. Hot reload swaps the bundle without reloading the page; reload a page that went through many hot reloads before treating it as evidence.
- Host sources: the globally installed `@deepseek-ai/dsh` carries the host's client packages under `node_modules/@deepseek-ai/dsh-client-*/lib/`; the desktop's own copies are fetched from the `url` of each entry in the page's `__DSH_BOOT__.entries`.
- A scratch `dsh web` that has `@alm-allen/dsh-chat-ux` installed makes the skin's chat features stand down; to match a profile without it, filter that entry out of both `__DSH_BOOT__.entries` and every `batches[].entries` before the page boots. A scratch instance on a real model creates real sessions and usage when a message is sent.

## Change Workflow

1. Change `src/` or `host/`; never touch `lib/`.
2. `npm run build`.
3. While iterating, `npm test` for the logic with unit tests and `npm run smoke -- --quick --feature <dir>` (without `--quick` for motion features); with a `dsh web` running, also `probe.cjs`; check the live page, including after a hot reload. Timing and ordering against the real host is verified on a real instance — the smoke stand-in does not reproduce it.
4. Visual changes are checked by the user in light and dark; re-shoot stale README screenshots with `shoot.cjs`.
5. Sync documents: the bilingual READMEs change together; behavior changes go into the CHANGELOG's `[Unreleased]`; a changed decision is rewritten in `docs/decisions/` following D48's template, and its row in the hand-written index `docs/decisions/README.md` is updated with it.
6. Done means the build, the unit tests and the relevant smoke pass and the behavior is verified; the full smoke is the release gate. If a gate fails, keep fixing.

## Git and Release

- Conventional commit prefixes (`fix(scope):`, `refactor(scope):`, `docs(scope):`, `chore(release):` …); commit titles and bodies in Chinese; one logical change per commit, no WIP, no unrelated changes; moves are committed apart from logic changes.
- Another session may be editing the same working tree: commit only your own changes — whole files only when every change in them is yours, otherwise your hunks alone. Before committing, export the index (`git checkout-index -a --prefix=.debug/<dir>/`) and run the build and the relevant smoke there.
- Until D47 lands, `lib/` is committed only with the release commit: release = update the CHANGELOG → full `npm run smoke` → `npm version patch|minor` → `npm run build` and commit the rebuilt `lib/` → tag → `npm publish` → GitHub Release with the notes from that CHANGELOG section.
- CHANGELOG format:
  - Version sections `## [x.y.z] - YYYY-MM-DD`, newest first; work in progress under `## [Unreleased]`.
  - Each section bilingual on one page: a `[中文](#cn-x.y.z) | [English](#en-x.y.z)` line, then `<h3 id="cn-x.y.z">新增功能</h3>` and `<h3 id="en-x.y.z">New Features</h3>` anchors carrying the version; further groups use plain `###`.
  - Groups, fixed in name and order: 新增功能 / 体验优化 / 问题修复 / 安全 / 移除 / 其他变更 and New Features / Improvements / Bug Fixes / Security / Removals / Chores; empty groups are omitted.
  - Footer: `**Full Changelog**: [vPrevious...vCurrent](compare link)`.
  - One entry per verifiable behavior or contract: the symptom the user saw, then the behavior after the change. Root causes go in the commit message. External contract changes (settings, private routes, host version requirements) are called out; performance changes carry locally measured numbers; user-facing changes stay in sync with the READMEs. No internal numbering, no boilerplate, no format notes inside version sections.
