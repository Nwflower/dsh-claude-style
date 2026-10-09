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
- Public documentation (the bilingual READMEs, the feature and settings documents beside them, the CHANGELOG) never shows decision numbers.
- The Anthropic Sans/Serif fonts are Anthropic's, for personal use, not covered by MIT, and never shipped in the npm package; `packages/assets/src/fonts/anthropic/` is a repository-only download, and a user's own copy is served from `$DSH_HOME/dsh-claude-style/fonts/`. JetBrains Mono, Inter and Noto Serif ship under the SIL OFL 1.1. The pixel crab is Anthropic's character and its sheets are not covered by MIT. Deepy's sheets are by calmly-eating-bugs (@wp3171216237); `docs/gifs/` holds that author's GIFs and stays out of the package.
- Local debug scripts, screenshots and intermediate artifacts go into `.debug/` and are never committed. Drafts are deleted when the task ends; a probe worth keeping becomes a scenario in `packages/testing/e2e.cjs` (D45).

## Stop Lines

Hard stops: stop the moment one triggers, without first judging whether it is worth it.

- A source file approaching 750 lines: stop adding features to it and propose splitting it by responsibility inside its feature directory; wait for the user's confirmation, and until then the file gets bug fixes only. `npm run lint` fails when a file crosses the line, and the one file it lets past records the size it stood at.
- The same host query or the same pattern appearing a 3rd time: stop and move it into the shared layer (host accessors into the host access module); never write a 3rd copy.

## Conventions

### CSS

- Stylesheets are plain CSS: attributes are spelled out, and a brand mark is read as `var(--dsh-claude-image-<name>)`. The build checks scope, the composer gate, `:has()` placement, the token gates and that every `data-dsh-*` attribute a selector reads is written somewhere in the TypeScript, on the syntax tree (D51). Dark tokens are the base, light overrides go under `:not([data-ds-dark-theme])`. Light canvas `#FCFCFB`, dark `#141413`, accent ember orange `#D97757`; no pure white, pure black or cold grays.
- `!important` only where the page needs it: over a host `!important`, an inline style or another skin rule. The lane's `importance` scenario drops each one on the real page and fails on any that changes nothing (D51); run it after writing one.
- Token values and host aliases live in `packages/client/src/theme/tokens.json`; the token stylesheet and the token table in `docs/STYLE.md` are generated from it.
- A feature never borrows another feature's class names; shared looks use the neutral shared classes (`dsh-claude-popover-card`, `dsh-claude-popover-item`, …).
- Design tokens and shape rules are in `docs/STYLE.md`; read it before changing visuals.

### Host Selectors

Read D3 and D19 before adding a host selector. After adding a substring selector, compare what it matches on a live page. A new selector goes into `packages/contracts/src/dom.ts` with an entry in `packages/contracts/src/table.ts` (its id, what it means, how the contract test checks it) and that id in the `contracts` list of every feature manifest that reads it; the build refuses a literal without a table entry and an entry no manifest claims.

### Comments

Comments carry only what a reader needs to keep the code correct: why the code has this shape, the host contract it depends on, the ordering that matters, what breaks if it changes. One to three lines is the norm. Never restate the code, narrate the change, or record measurements or release history. Design reasoning lives in the decisions — cite the number (`D9`); visual rules cite `docs/STYLE.md`.

### Model Copy

Read D5 before editing `packages/client/data/model-descriptions.json`.

### Screenshots and Privacy

Before writing to disk, `scripts/shared/privacy.cjs` replaces workspace names, session titles, usernames, drive-letter paths and balances with neutral stand-ins and runs a leak scan; a failed scan fails the run and is never bypassed. `shoot.cjs` and the end-to-end lane's `shots` scenario both go through it, and each writes its captures to the run's output directory for review. The conversation scene opens the sidebar conversation titled `Markdown rendering tour` and refuses one holding any user message other than the demo prompt in `scripts/shoot.cjs`.

## Current Layout

Target layout: D46. Today:

- `packages/client/src/core/` host access, preferences, model copy, i18n, the scheduler, the observation bus and the frame pipeline (D40), with their unit tests beside them (`*.test.ts`); `packages/client/src/shared/` parts several features use (TypeScript beside CSS); `packages/client/src/theme/` the global look no single feature owns and the design tokens (`tokens.json`, its shape in `tokens.schema.json`); `packages/client/src/features/<feature>/` one feature's installer, helpers and stylesheets, the main file named after the feature.
- `packages/` the npm workspaces (D46): `packages/contracts` holds what both halves share — the host contract (`src/dom.ts` the selectors and attributes the skin reads, `src/table.ts` the same list with what each means and who reads it, `src/timing.ts` the timing assumptions, `src/services.ts` the service and value shapes, `src/usage.ts` the payloads the two halves exchange) and the preference defaults and route paths (`src/prefs.ts`, `src/routes.ts`). Import it by package name (`@dsh-claude-style/contracts/services`); the type check and the bundler both resolve it through `tsconfig.json`'s `paths`, the build loads those tables by repository path, and the host build inlines its values so the published package carries no contracts module.
- `packages/client/src/constants.ts` holds the constants the build reads out of the browser half; `packages/client/data/model-descriptions.json` the model copy and `brands` bindings, its shape declared in `packages/client/data/model-descriptions.schema.json`; `packages/assets/src/` every image, from brand marks to mascot sheets (`packages/assets/assets.mjs` decides inline or route, D38) beside `fonts/` the faces the package ships with their licences and authors file, which `buildFonts` copies into `lib/fonts/` and the repository-only Anthropic faces live one directory deeper under `anthropic/`.
- `packages/client/src/generated.d.ts` types the module the build generates; `packages/client/src/globals.d.ts` the DOM additions and the element properties the skin sets; `tsconfig.json` the type check.
- `packages/host/` the handwritten host half (private routes, settings `Config`, HDSL, search, usage); the build writes it into `lib/host/`, which the package's `main` and `exports` point at.
- `lib/` build output only, never edited by hand and never committed (D47).
- `locale/<language>.json` plugin metadata; `package.json`'s `exports` must cover them with `"./locale/*"`, or the host degrades the whole metadata (icon included) to `meta.error`.
- `skin.json` the skin manifest; `cordis.patch.yml` inserts the skin into the web roster.
- `scripts/` build (`build.mjs` the pipeline, `css.mjs` the stylesheets, minified at the end by `scripts/shared/minify-css.cjs`, `build-checks.mjs` the refusals beyond them, `model-copy.mjs` the copy document's check, `peakrate-catalog.mjs` the shipped rate catalog's check, `chunks.mjs` the deferred features' chunks, `virtual-modules.mjs` the three generated modules, `build-cache.mjs` the Deepy vectors and brotli payloads kept in `.debug/build-cache/` under the hash of their inputs, `dev.mjs` the watcher behind `npm run dev`), smoke and live tools (`fetch-lobe-combines.py` and `fetch-peakrate-catalog.mjs` are the networked scripts, run by hand; `draw-crab.py` redraws the crab's sheets after a drawing change); `scripts/shared/privacy.cjs` the replacements and the sweep before a screenshot reaches disk; `packages/assets/` the images and the generator that decides how each is delivered (`assets.mjs`); `packages/testing/` the maintained runnable tools (D45): `dsh-web.cjs` the scratch host, `mock-llm.cjs` the scripted model service, `e2e.cjs` the end-to-end lane; `docs/` the decisions (`docs/decisions/`), the style guide, the feature and settings documents (`docs/FEATURES.md`, `docs/SETTINGS.md` and their `.en` twins), the README screenshots (`docs/screenshots/`), the showcase GIFs (`docs/gifs/`) and the change records (`docs/changes/`).

The source is TypeScript ES modules under `strict` (D36); React components are TSX on the automatic JSX runtime, which the host provides like React (D57). A module nothing imports fails the build; a feature is a directory under `packages/client/src/features/` whose main module exports `install(ctx, ui)` beside a `<main>.manifest.ts` (D42) — its order, switch, stylesheets with their ranks, settings switch row, smoke cases, description and the other features' handles it `reads`. A feature module types `ui` as `FeatureUi<typeof manifest>` (the manifest imported as a type): it sees its own handle and the ones it `reads`, a new handle goes into `Handles` in `core/scheduler.ts`, and lint refuses a feature module importing the whole `Ui`. A stylesheet that belongs to no feature goes into `THEME_SHEETS` in `scripts/build.mjs`. A manifest's `load: 'deferred'` takes the feature's own modules out of `lib/client.js` into a chunk the page fetches once it is taken (D39); only a feature the first frames can do without is deferred. React and the host packages are imported by name and stay external; build-time data (stylesheet, asset addresses, lockups, build id) is imported from `virtual:dsh-claude-style/generated`. A host value without a type yet is `HostValue` (D44); a non-null assertion `!` only marks a value the call order guarantees.

## Commands

```sh
npm install                                  # dev dependencies: TypeScript, esbuild, Ajv, Vitest, Playwright, React types
npm run build                                # type-checks src/, bundles it into lib/client.js and the deferred features' chunks under lib/assets/ with their source maps, runs the build checks, prints the build id
npm run dev                                  # rebuild on every change to packages/client, assets, host, contracts and scripts/, each run with DSH_CLAUDE_STYLE_DEBUG=1
npm run lint                                 # the rules that need no build: the stop line, Markdown links, decision citations, the repository paths prose names (D48) and feature modules' ui (D42)
npm run features                             # write the feature docs' list from the feature manifests (D48)
npm run features:check                       # fail when that list differs from the manifests; CI runs this
npm run changelog                            # write the CHANGELOG's [Unreleased] section from docs/changes/ (D48)
npm run changelog:check                      # fail when that section differs from docs/changes/; CI runs this
npm run docs:index                           # write docs/decisions/README.md from the decision files (D48)
npm run docs:check                           # fail when that index differs from the files; CI runs this
npm test                                     # unit tests: Vitest in browser mode on the local Chrome/Edge
npm run smoke                                # full run: every browser case and check, plus the host half's route checks
npm run smoke -- --quick --feature <dir>     # iteration run: quick tier, cases covering one packages/client/src/features/ directory
npm run smoke -- --case <name>[,<name>…]     # named browser cases
npm run smoke -- --feature <dir>[,<dir>…]    # cases covering those directories (the `cases` of their manifests)
node scripts/probe.cjs --token <launch-token>          # composer invariants against a running dsh web
node scripts/probe-timing.cjs --token <launch-token>   # startup, catalog readiness, open latency, heap
node scripts/shoot.cjs --token <launch-token> --brand <claude|deepseek> --scene <home|conversation>   # re-shoot one README screenshot pair
node packages/testing/dsh-web.cjs                       # boot a scratch dsh web (`$DSH_HOME` under .debug/) with this checkout linked in, and print its URL
node packages/testing/e2e.cjs                           # the end-to-end lane: scratch host plus a scripted model service, asserting on the real page
node packages/testing/e2e.cjs --scenario <name>[,<name>…] [--headed]   # one scenario; the shots scenario writes its captures to the trace directory
DSH_IMPORTANCE_REFERENCE=<old.css> node packages/testing/e2e.cjs --scenario importance   # also compare every page state with an earlier stylesheet, element by element (importance-sheet.css of an earlier run)
node packages/testing/mock-llm.cjs                      # the scripted model service on its own, printing the base URL to configure a route with
```

The quick tier leaves out the motion cases; a feature whose cases all watch motion needs the run without `--quick`. probe, probe-timing and shoot need a running `dsh web` (default `http://127.0.0.1:3080`, `--url` for another; the token is the `/?token=…` in the GUI URL or `DSH_WEB_TOKEN`). All of them need a local Chrome/Edge (`CHROME_PATH` to choose one). `packages/testing/e2e.cjs` boots its own host and needs no running instance; its scenarios, their scripts and their bounds are in D45.

### Live Inspection

- Desktop window: `node D:\Build\dsh-desktop-bridge\bin\bridge.cjs "<expression>"` evaluates in the window the user sees (`--stdin` reads a script file). While that window is in the background its animation frames are paused: a probe waiting on `requestAnimationFrame` hangs, and anything it put in the page must be cleaned up by hand.
- Which build a page runs: `document.body.getAttribute('data-dsh-claude-style')`; `npm run build` prints the id it wrote. Hot reload swaps the bundle without reloading the page; reload a page that went through many hot reloads before treating it as evidence.
- Host sources: the globally installed `@deepseek-ai/dsh` carries the host's client packages under `node_modules/@deepseek-ai/dsh-client-*/lib/`; the desktop's own copies are fetched from the `url` of each entry in the page's `__DSH_BOOT__.entries`.
- A scratch `dsh web` that has `@alm-allen/dsh-chat-ux` installed makes the skin's chat features stand down; to match a profile without it, filter that entry out of both `__DSH_BOOT__.entries` and every `batches[].entries` before the page boots. A scratch instance on a real model creates real sessions and usage when a message is sent.

## Change Workflow

1. Change `packages/client/src/` or `packages/host/src/`; never touch `lib/`.
2. `npm run build`, or keep `npm run dev` running while iterating.
3. While iterating, `npm test` for the logic with unit tests and `npm run smoke -- --quick --feature <dir>` (without `--quick` for motion features); with a `dsh web` running, also `probe.cjs`; check the live page, including after a hot reload. Timing and ordering against the real host is verified on a real instance — the smoke stand-in does not reproduce it.
4. Visual changes are checked by the user in light and dark; re-shoot stale README screenshots with `shoot.cjs`; `packages/testing/e2e.cjs --scenario shots` writes both palettes to the trace directory for that review, with the privacy sweep already applied.
5. Sync documents: the bilingual READMEs and the documents beside them change together, and the feature list in `docs/FEATURES.md` and `docs/FEATURES.en.md` comes from the manifests — edit a feature's `description` and run `npm run features`; a behavior change adds one file under `docs/changes/` (D48) and `npm run changelog` writes the `[Unreleased]` section from those files — never edit that section by hand; a changed decision is rewritten in `docs/decisions/` following D48's template, and the index is regenerated with `npm run docs:index`.
6. Done means the build, the unit tests, the relevant smoke and the end-to-end scenarios covering the change pass, and the behavior is verified; the full smoke is the release gate, and the lane runs on every change to the chat area or to timing. If a gate fails, keep fixing.

## Git and Release

- Conventional commit prefixes (`fix(scope):`, `refactor(scope):`, `docs(scope):`, `chore(release):` …); commit titles and bodies in Chinese; one logical change per commit, no WIP, no unrelated changes; moves are committed apart from logic changes.
- Another session may be editing the same working tree: commit only your own changes — whole files only when every change in them is yours, otherwise your hunks alone. Before committing, export the index (`git checkout-index -a --prefix=.debug/<dir>/`) and run the build and the relevant smoke there.
- `lib/` is build output and never committed (D47): it is gitignored on `master`, built by the gates, and shipped by npm and by the `dist` branch.
- Release: `node scripts/changelog.mjs --release <version>` (the pending changes become that version's section and `docs/changes/` is cleared) → `npm version patch|minor` → commit the two and push the tag. The Release workflow then checks the tag names `package.json`'s version, runs the gates, writes `dist` with the very files npm gets and moves the version tag onto that packaged commit, publishes to npm through trusted publishing (no npm token is stored; the package's trusted publisher on npmjs.com names this repository and `release.yml`), and opens the GitHub Release with the version's CHANGELOG section (`node scripts/changelog.mjs --notes <version>`); a rerun skips what is already out. `scripts/dist-branch.mjs --push` does the same step by hand if needed (it builds first, since `lib/` is not in version control).
- CHANGELOG format (the `[Unreleased]` section and the release sections are written by `scripts/changelog.mjs`; the files under `docs/changes/` are what is authored):
  - Version sections `## [x.y.z] - YYYY-MM-DD`, newest first; work in progress under `## [Unreleased]`.
  - Each section bilingual on one page: a `[中文](#cn-x.y.z) | [English](#en-x.y.z)` line, then `<h3 id="cn-x.y.z">新增功能</h3>` and `<h3 id="en-x.y.z">New Features</h3>` anchors carrying the version; further groups use plain `###`.
  - Groups, fixed in name and order: 新增功能 / 体验优化 / 问题修复 / 安全 / 移除 / 其他变更 and New Features / Improvements / Bug Fixes / Security / Removals / Chores; empty groups are omitted.
  - Footer: `**Full Changelog**: [vPrevious...vCurrent](compare link)`.
  - One entry per verifiable behavior or contract: the symptom the user saw, then the behavior after the change. Root causes go in the commit message. External contract changes (settings, private routes, host version requirements) are called out; performance changes carry locally measured numbers; user-facing changes stay in sync with the READMEs. No internal numbering, no boilerplate, no format notes inside version sections.
