# AGENTS.md

`dsh-claude-style` is a theme plugin for DeepSeek Harness that replicates the look and interaction of Claude Code Desktop. It is a layer over the host: until the host offers an extension point for something, the effect is made with CSS and DOM overrides in the browser (D43).

The tree, the two halves and their invariants are in [ARCHITECTURE.md](docs/ARCHITECTURE.md). A direction is recorded in [docs/adr/](docs/adr/README.md): read the decisions a change touches, and cite those file numbers in code comments.

## Writing Rules

- When no comparison is requested, do not use contrast constructions like "not X but Y" or "do X instead of Y".
- Proposals are fully considered and complete in one pass; never phrase work as "first do a version, then observe and adjust". When several proposals are genuinely needed, each stands on its own in parallel; never order them as tiers from conservative to aggressive.
- Do not enumerate or report results that were ruled out during searching and troubleshooting.
- Answers have no preamble and no summary.
- Code identifiers keep their original English names; never invent abbreviations; describe concrete operations with complete verb–object phrasing.
- A reply written in Chinese uses full words of two or more characters (崩溃, 终止, 判定, 推断, 抛出, 挂起, 卡死), never single-character abbreviations; jargon like 「落地」「钉死」「对齐」「栈」 is banned.

## Behavioral Red Lines

- Import needed libraries directly; never guard imports with try/catch. The one exception is the host half's guarded schemastery import in `packages/host/src/settings.ts`, its reason beside it; any new exception carries its reason beside the import the same way (D12).
- Never enter plan mode on your own initiative.
- Never use Git to roll back code. "Roll back" from the user always means restoring the previous state by hand with the edit tools.
- Never read from or write to the system temp directory; intermediate artifacts go to `.debug/` (gitignored).
- When the user provides a web link, read its full content before starting; when a library turns out to be used wrongly, re-read that link in full first.
- Do not reinvent a wheel to avoid a dependency. The package has zero *runtime* dependencies: React and the host packages come from the host at runtime (D36).
- Fail fast: throw where the error is, never swallow it, never fall back silently. A catch is allowed only where it isolates one failure from the rest or where the comment beside it states why the error may stop there (D12).
- No mocks, no fake implementations, no workarounds that exist only to make tests pass.
- The user may withdraw or modify your changes at any time: re-read a file before continuing to edit it, build on the latest state, never re-add what the user deleted.
- If the user asks about something else mid-task, answer at once if you can, then resume the original task; never leave a task half-done.
- When fixing an error in documentation or code, leave no trace of the error.
- Every feature is implemented and iterated until it works; never stop after a first version and ask the user to test. During development a change is carried by `npm run build` and the live page, and a commit or push waits on no test run; the browser lanes are run together before a release (D92). A spec the change touches may be run on its own (`npx vitest run <path>`, `node packages/testing/stand-in.mjs --spec <id>`) when its answer is what the work needs.
- Never inline long multi-line scripts on the command line; write the script to `.debug/` and run it.
- Authored changes — new logic, copy, rules — go through the edit tools. Mechanical transformations across files (moving, renaming, rewriting paths, migrating syntax) may be scripted: the script lives in `.debug/`, its whole diff is read afterwards and the gates are passed; the script never writes new logic.
- Never hand-write a parser for a mature file format; use a library, or avoid parsing.
- A user message ending in a question mark is a question: answer only the question; no better approach, no counter-question, no "ready when you are".
- After the user points out a mistake, continue from the premise that the spot is wrong; do not restate why.
- Output stays in a clean final state: replies, code, comments and commit messages carry no trace of earlier mistakes or of the correction process.
- Conflict priority: the user's current instruction > current repository code > this file > `docs/`. Whether a convention overturned by a current instruction is written back into the documents is the user's call.

## Principles

- Read the ADRs a structural change touches before making it; never contradict one. A direction is overturned by writing the replacing ADR first, naming the numbers it replaces (D48).
- A change earns an ADR only by D48's threshold: one-time moves go to `docs/changes/` and the commit message, tool-enforceable rules go to lint or the build checks, and an ADR constrains future changes with reasoning the code and tests cannot carry. An ADR keeps its own number for good: a replaced one is recorded as void on the replacing ADR's 取代 line, and amendments are never stacked as separate files.
- Public documentation (the bilingual READMEs, the CHANGELOG) never shows decision numbers.
- The Anthropic Sans/Serif/Mono fonts are Anthropic's, for personal use, not covered by MIT, and never shipped in the npm package; `packages/assets/src/fonts/anthropic/` is a repository-only download, and a user's own copy is served from `$DSH_HOME/dsh-claude-style/fonts/`. JetBrains Mono, Inter, Noto Serif and the PoxiaoPixel subset (`ClaudeStylePixel.woff2`, cut by `scripts/art/pixel-font.py`) ship under the SIL OFL 1.1. The pixel crab is Anthropic's character and its sheets are not covered by MIT. Deepy's sheets are by calmly-eating-bugs (@wp3171216237); `docs/gifs/` holds that author's GIFs and stays out of the package.
- Local debug scripts, screenshots and intermediate artifacts go into `.debug/` and are never committed. Drafts are deleted when the task ends; a probe worth keeping becomes a spec under `packages/testing/specs/` or a scenario in `packages/testing/scenarios.mjs` (D92).

## Stop Lines

Hard stops: stop the moment one triggers, without first judging whether it is worth it.

- A source file approaching 750 lines: stop adding features to it and propose splitting it by responsibility inside its feature directory; wait for the user's confirmation, and until then the file gets bug fixes only. `npm run lint` fails when a file crosses the line; a file it lets past records the size it stood at.
- The same host query or the same pattern appearing a 2nd time: stop and move it into the shared layer (host accessors into the host access module). `npm run lint` scans for copied stretches and fails on any of them, so a second copy is the last one.

## Conventions

### CSS and Host Contracts

- Stylesheets are plain CSS. Dark tokens are the base, light overrides go under `:not([data-ds-dark-theme])`; token values and host aliases live in `packages/client/src/theme/tokens.json`. A time, easing curve and z-index above 9 are read from it (D9).
- `!important` only over a host `!important`, an inline style or another skin rule; the `importance` scenario checks each one. A feature never borrows another feature's class names; shared looks use the neutral shared classes.
- Read [docs/STYLE.md](docs/STYLE.md) before changing visuals. Read D3 before adding a host selector: selectors live in `packages/contracts/src/dom.ts` and `table.ts`, and every reading feature claims the entry in its manifest.
- Comments carry what a reader needs to keep the code correct: why this shape, the host contract, ordering and failure modes. They do not narrate changes or record measurements.

### Work Orders and Temporary Files

- Small changes with a clear scope, read-only checks and one-off experiments proceed without a work order. Create or reuse one when the user requests it or the task needs cross-session recovery, handoff or sustained acceptance evidence.
- `npm run work -- new <slug> --title "…"` creates an order under `.debug/work/<id>/`; `npm run work -- path <id> [tmp|refs|shots]` locates its material, and `paths <id>` lists the files it owns. Closing an order removes its directory after verification.
- One-off artifacts use `npm run tmp -- new <label>` or `npm run tmp -- run <label> -- <command>`. Expired sessions are collected by `npm run tmp -- gc`; live owners and filesystem links are protected.
- `.debug/` has only the homes declared in `scripts/shared/debug-paths.mjs`; lint rejects other top-level entries. Build, test, screenshot and cache tools own their output retention. Durable documents never name a work-order or temporary-session instance.

### Privacy

Captures go through `scripts/shared/privacy.mjs`; a failed leak scan fails the run and is never bypassed. Reader-provided attachments are read in place and never copied into a document or capture.

## Layout

`locale/<language>.json` is plugin metadata, covered by `package.json`'s `"./locale/*"` export. A new handle goes into `Handles` in `core/scheduler.ts`; a stylesheet that belongs to no feature goes into `THEME_SHEETS` in `scripts/build/build.mjs`. Mechanisms that only talk to the host page go into `packages/engine/` and receive skin vocabulary through its seam (D73). Host services are read through accessors in `packages/engine/src/host.ts`.

Read D5 before editing `packages/client/data/model-descriptions.json`.

## Commands

Each script states its purpose at the top of the script. `node scripts/checks/verify.mjs --help` defines the three request forms and their selectors; [docs/DEBUGGING.md](docs/DEBUGGING.md) describes live-page inspection. The table below is written by `npm run agents`.

<!-- commands:start — written by npm run agents, not by hand -->

| Command | What it does |
|---|---|
| `npm install` | the dev dependencies: TypeScript, esbuild, Ajv, Vitest, Playwright and the React types |
| `npm run build` | type-check and bundle the client, generated modules, assets and host half |
| `npm run dev` | rebuild inputs in a fresh process to avoid stale evaluated constants |
| `npm run changelog` | validate change fragments and render pending, released or GitHub Release sections |
| `npm run changelog:check` | fail when a `docs/changes/` fragment does not validate or `docs/CHANGELOG.md` holds an `[Unreleased]` section; the cloud job runs this |
| `npm run docs:index` | generate and check the ADR index from decision and retirement files |
| `npm run docs:check` | fail when the committed ADR index differs from the ADR files; the cloud job runs this |
| `npm run checks:numbers` | every number a check decides on, as a generated record |
| `npm run agents` | write this table into AGENTS.md from `package.json` and each script's own header |
| `npm run agents:check` | fail when AGENTS.md's command table differs from `package.json`; the cloud job runs this |
| `npm run lint` | check source limits, repository references, dependency direction and spec contracts (D72, D92) |
| `npm run element-collections` | the element-keyed collections the browser half keeps, by file (C1) |
| `npm run probe` | headless UI regression probe for the composer invariants |
| `npm run stand-in` | the built plugin's one stand-in-page lane (D92): host-half and installation checks, then the behaviour specs a reader can observe |
| `npm run behaviour` | live-page debugging and focused spec listing for the stand-in page (D92), driven from outside through Playwright on the BUILT plugin (`lib/`); no running DSH instance is needed |
| `npm run faults` | whether the specs catch known defects |
| `npm run coverage` | which layer guards which feature (D92), as an observation |
| `npm test` | the logic and mechanism specs on their own, as the cloud job runs them: Vitest in browser mode on the local Chrome or Edge |
| `npm run verify` | the one entry a test run goes through (D92): serialized lanes, staged gates, and verdicts cached by tree and selection |
| `npm run work` | keep task context under .debug/work for continuation, handoff and review; close deletes the order |
| `npm run tmp` | manage owned scratch directories, preserving failure evidence and collecting expired sessions |

<!-- commands:end -->

## Change Workflow

0. Change `packages/client/src/` or `packages/host/src/`; never touch `lib/`.
1. Run `npm run build`, or keep `npm run dev` running while iterating. The live page answers what only it shows; a build never waits on the test lock.
2. Check visual changes in light and dark. Re-shoot stale README screenshots through the privacy sweep.
3. Sync documents: bilingual READMEs change together, a behavior change adds one file under `docs/changes/`, and a direction change adds its replacing ADR before the code. Regenerate affected indexes. Committed judgment records move with the change that moves them.
4. Test layers, selection and cloud verdicts follow D92 and `.github/workflows/`; those files carry the operational detail. A red run on master over this session's push is this session's to fix and re-push.

## Git and Release

- Use conventional commit prefixes and Chinese commit titles and bodies. One logical change per commit, no WIP or unrelated changes; moves are committed apart from logic changes.
- Several sessions work in the main tree at once: stage only the change in hand and leave the rest uncommitted. `npm run work -- paths <id>` prints an order's declared files; a file two sessions touched is merged into one change before commits are split.
- `lib/` is build output and never committed (D47).
- Release requires a green full matrix on master, locally `npm run verify -- --full` or the cloud CI workflow. The Release workflow and `scripts/release/` carry versioning, verdict checking, packing, publishing and GitHub Release details. `scripts/release/changelog.mjs` defines and validates the CHANGELOG format.
