# AGENTS.md

`dsh-claude-style` is a theme plugin for DeepSeek Harness that replicates the look and interaction of Claude Code Desktop. It is a layer over the host: until the host offers an extension point for something, the effect is made with CSS and DOM overrides in the browser (D43).

The shape of the tree, the two halves and the invariants that cross them are in [ARCHITECTURE.md](docs/ARCHITECTURE.md). A direction is recorded in [docs/adr/](docs/adr/README.md) as one page: the background it answers, the decision, what follows from it, and what would make it worth revisiting. Read the ones a change touches before making it; the numbers code comments cite are those files' names.

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
- Every feature is implemented and iterated until it works; never stop after a first version and ask the user to test. During development a change is carried by `npm run build` and the live page, and a commit or push waits on no test run; the browser lanes are run together before a release (D87). A spec the change touches may be run on its own (`npx vitest run <path>`, `node packages/testing/behaviour.mjs --spec <id>`) when its answer is what the work needs.
- Never inline long multi-line scripts on the command line; write the script to `.debug/` and run it.
- Authored changes — new logic, copy, rules — go through the edit tools. Mechanical transformations across files (moving, renaming, rewriting paths, migrating syntax) may be scripted: the script lives in `.debug/`, its whole diff is read afterwards and the gates are passed; the script never writes new logic.
- Never hand-write a parser for a mature file format; use a library, or avoid parsing.
- A user message ending in a question mark is a question: answer only the question; no better approach, no counter-question, no "ready when you are".
- After the user points out a mistake, continue from the premise that the spot is wrong; do not restate why.
- Output stays in a clean final state: replies, code, comments and commit messages carry no trace of earlier mistakes or of the correction process.
- Conflict priority: the user's current instruction > current repository code > this file > `docs/`. Whether a convention overturned by a current instruction is written back into the documents is the user's call.

## Principles

- Read the ADRs a structural change touches before making it; never contradict one. A direction is overturned by writing the replacing ADR first, naming the numbers it replaces (D48).
- A change earns an ADR only by D48's threshold: one-time moves go to `docs/changes/` and the commit message, tool-enforceable rules go to lint or the build checks, and an ADR constrains future changes with reasoning the code and tests cannot carry. An ADR keeps its own number for good: the number is the handle code comments cite, a replaced one is recorded as void on the replacing ADR's 取代 line, and amendments are never stacked as separate files.
- Public documentation (the bilingual READMEs, the CHANGELOG) never shows decision numbers.
- The Anthropic Sans/Serif/Mono fonts are Anthropic's, for personal use, not covered by MIT, and never shipped in the npm package; `packages/assets/src/fonts/anthropic/` is a repository-only download, and a user's own copy is served from `$DSH_HOME/dsh-claude-style/fonts/`. JetBrains Mono, Inter, Noto Serif and the PoxiaoPixel subset (`ClaudeStylePixel.woff2`, cut by `scripts/pixel-font.py`) ship under the SIL OFL 1.1. The pixel crab is Anthropic's character and its sheets are not covered by MIT. Deepy's sheets are by calmly-eating-bugs (@wp3171216237); `docs/gifs/` holds that author's GIFs and stays out of the package.
- Local debug scripts, screenshots and intermediate artifacts go into `.debug/` and are never committed. Drafts are deleted when the task ends; a probe worth keeping becomes a spec under `packages/testing/specs/` or a scenario in `packages/testing/scenarios.mjs` (D87).

## Stop Lines

Hard stops: stop the moment one triggers, without first judging whether it is worth it.

- A source file approaching 750 lines: stop adding features to it and propose splitting it by responsibility inside its feature directory; wait for the user's confirmation, and until then the file gets bug fixes only. `npm run lint` fails when a file crosses the line; a file it lets past records the size it stood at.
- The same host query or the same pattern appearing a 2nd time: stop and move it into the shared layer (host accessors into the host access module). `npm run lint` scans for copied stretches and fails on any of them, so a second copy is the last one.

## Conventions

### CSS

- Stylesheets are plain CSS: attributes are spelled out, and a brand mark is read as `var(--dsh-claude-image-<name>)`. The build checks scope, the composer gate, `:has()` placement, the token gates and that every `data-dsh-*` attribute a selector reads is written somewhere in the TypeScript, on the syntax tree (D9). Dark tokens are the base, light overrides go under `:not([data-ds-dark-theme])`. Each card names its canvas, sidebar, bubble and accent as seeds in `packages/client/src/theme/tokens.json`; no pure black and no cold grays.
- `!important` only where the page needs it: over a host `!important`, an inline style or another skin rule. The lane's `importance` scenario drops each one on the real page and fails on any that changes nothing (D9); run it after writing one.
- Token values and host aliases live in `packages/client/src/theme/tokens.json`; the token stylesheet and the token, motion and layer tables in `docs/STYLE.md` are generated from it. A time, an easing curve (D9) and a z-index above 9 (D9) are read from it, never written.
- A feature never borrows another feature's class names; shared looks use the neutral shared classes (`dsh-claude-popover-card`, `dsh-claude-popover-item`, …).
- Design tokens and shape rules are in `docs/STYLE.md`; read it before changing visuals.

### Host Selectors

Read D3 before adding a host selector. After adding a substring selector, compare what it matches on a live page. A new selector goes into `packages/contracts/src/dom.ts` with an entry in `packages/contracts/src/table.ts` (its id, what it means, how the contract test checks it) and that id in the `contracts` list of every feature manifest that reads it; the build refuses a literal without a table entry and an entry no manifest claims.

### Comments

Comments carry only what a reader needs to keep the code correct: why the code has this shape, the host contract it depends on, the ordering that matters, what breaks if it changes. One to three lines is the norm. Never restate the code, narrate the change, or record measurements or release history. A direction with reasoning behind it lives in `docs/adr/`; cite the file's number (`D9`) and let the comment carry only what the code needs. Visual rules cite `docs/STYLE.md`.

### Work Orders and Temporary Files

Small changes with a clear scope that can finish in the current session, read-only checks and one-off experiments proceed without a work order. Create no temporary directory when the task produces no intermediate files. Changed line counts, file counts and the presence of temporary files do not determine whether a work order is needed.

Automatically create or reuse a work order when the user explicitly requests one or the task needs cross-session recovery, handoff between people or agents, or sustained collection of acceptance evidence. Run `npm run work -- new <slug> --title "…"` when that need becomes clear, without asking for confirmation. A work order lives under `.debug/work/<id>/`: `work.md` holds its goal, acceptance criteria, measurements and handoff, while `refs/`, `shots/` and `tmp/` hold the material that travels with the task. `close` deletes the directory after verification and after each measurement names its durable home or `none`. In a linked worktree, `npm run work` keeps orders under the main tree's `.debug/work`, resolves an order's paths, specs, change and ADR and the durable documents it scans for order IDs there, and reads the schema and template from the checkout it runs in; `npm run work -- path <id> [tmp|refs|shots]` prints an order's material directory for a script in that checkout to write into.

One-off scripts, screenshots and logs use an independent directory created by `npm run tmp -- new <label>`. It prints an absolute path under `.debug/tmp/`; `--pid <owner-pid>` names a persistent owner when the command runs through npm. `npm run tmp -- path <id|path>` refreshes activity and ownership, and `close <id|path>` removes a finished session. `npm run tmp -- run <label> -- <command> [args]` passes the path as `DSH_TMP_DIR`, protects the command while it runs, removes its directory on success and retains failure evidence. Temporary sessions require no work metadata or review steps.

`npm run tmp -- gc` previews inactive directories whose owner has exited and whose last activity is at least 24 hours old; `--yes` removes them. Active owners and filesystem links are protected. `npm run work -- gc` includes the same temporary-session collection beside orphaned work orders and loose legacy files. `npm run lint` checks both work orders and temporary ownership records. Build, test, screenshot and cache tools keep their own output directories and retention rules; running them does not create a work order. Durable documents never name a work-order or temporary-session instance. A behavior change still adds `docs/changes/`; a direction change still adds an ADR.

### Model Copy

Read D5 before editing `packages/client/data/model-descriptions.json`.

### Screenshots and Privacy

Before writing to disk, `scripts/shared/privacy.mjs` replaces workspace names, session titles, usernames, drive-letter paths and balances with neutral stand-ins and runs a leak scan; a failed scan fails the run and is never bypassed. `shoot.mjs` and the end-to-end lane's `shots` scenario both go through it, and each writes its captures to the run's output directory for review. The conversation scene opens the sidebar conversation titled `Markdown rendering tour` and refuses one holding any user message other than the demo prompt in `packages/testing/shoot.mjs`.

## Layout

The tree's shape, the two halves and what each holds are in [ARCHITECTURE.md](docs/ARCHITECTURE.md). The rules that follow from it: `locale/<language>.json` is plugin metadata, and `package.json`'s `exports` must cover it with `"./locale/*"`, or the host degrades the whole metadata (icon included) to `meta.error`; a new handle goes into `Handles` in `core/scheduler.ts`, and lint refuses a feature module importing the whole `Ui`; a stylesheet that belongs to no feature goes into `THEME_SHEETS` in `scripts/build.mjs`; a non-null assertion `!` only marks a value the call order guarantees; the mechanism that only talks to the host page goes into `packages/engine/`, and it reads the skin's own vocabulary through the seam its entry hands over rather than importing the skin (D73) — a host service is read through an accessor in `packages/engine/src/host.ts`, never by name at the feature.

## Commands

Each script states its own purpose at the top of the script; the table below is written by `npm run agents`, and the runs that take flags or drive a live page follow it.

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
| `npm run lint` | check source limits, repository references, dependency direction and spec contracts (D72, D87) |
| `npm run probe` | headless UI regression probe for the composer invariants |
| `npm run smoke` | the BUILT plugin (`lib/`): the host half in Node and the browser half in the stand-in host page under headless Chrome, with no DSH instance running; pages run several at a time, the motion pages two at a time last |
| `npm run behaviour` | the behaviour layer (D87): what a reader can see on the BUILT plugin (`lib/`), loaded into the smoke's stand-in host page and driven from outside through Playwright; no running DSH instance is needed |
| `npm run faults` | whether the specs catch known defects |
| `npm run coverage` | which layer guards which feature (D87), as an observation |
| `npm test` | the logic and mechanism specs on their own, as the cloud job runs them: Vitest in browser mode on the local Chrome or Edge |
| `npm run verify` | the one entry a test run goes through (D87): serialized lanes, staged gates, and verdicts cached by tree and selection |
| `npm run work` | keep task context under .debug/work for continuation, handoff and review; close deletes the order |
| `npm run tmp` | manage owned scratch directories, preserving failure evidence and collecting expired sessions |

<!-- commands:end -->

```sh
npm run verify                                  # the iteration tier: the checks, the build and the tests the working tree's change reaches, started as one batch
npm run verify -- --quick                       # that tier plus the smoke's quick tier and every behaviour spec
npm run verify -- --feature <dir>[,<dir>…]      # that smoke and the behaviour specs of one packages/client/src/features/ directory, motion cases included
npm run verify -- --case <name>[,<name>…]       # named browser cases, motion cases included
npm run verify -- --full                        # the whole smoke walk, every behaviour spec, the checks, the build and the spec lane, about a minute
npm run verify -- --e2e                         # the run above plus the end-to-end lane's default table
npm run verify -- --scenario <name>[,<name>…]   # the end-to-end lane's named scenarios
npm run verify -- --full --e2e                  # everything the tool holds, asked for with 请确认你正处于发布流程。
npx jscpd                                       # list every copied stretch the lint rule reads, as .jscpd.json scans them
node packages/testing/behaviour.mjs --open <page> [--prefs <json>] [--band <name>]   # keep one stand-in page up, and print the address --eval asks at
node packages/testing/behaviour.mjs --eval --at <address> "<expression>"             # or --stdin, a script on standard input, to ask the open page
node packages/testing/behaviour.mjs --close --at <address>                           # end the session --open started
node packages/testing/probe.mjs --token <launch-token>          # composer invariants against a running dsh web
node packages/testing/probe-timing.mjs --token <launch-token>   # startup, catalog readiness, open latency, heap
node packages/testing/shoot.mjs --token <launch-token> --brand <claude|deepseek> --scene <home|conversation>   # re-shoot one README screenshot pair
node packages/testing/dsh-web.mjs                       # boot a scratch dsh web (`$DSH_HOME` under .debug/) with this checkout linked in, and print its URL
node packages/testing/host-snapshot.mjs                 # re-capture the host's conversation and composer markup for the stand-in page, through the privacy sweep
node packages/testing/e2e.mjs --scenario <name>[,<name>…] [--headed]   # one scenario; the shots scenario writes its captures to the trace directory
node packages/testing/e2e.mjs --shard <index>:<total>   # one slice of the lane's default table, which is how the cloud's four jobs each run one
DSH_IMPORTANCE_REFERENCE=<old.css> node packages/testing/e2e.mjs --scenario importance   # compare every page state with an earlier stylesheet, element by element
node packages/testing/mock-llm.mjs                      # the scripted model service on its own, printing the base URL to configure a route with
node packages/testing/mock-platform.mjs                 # the scripted account platform on its own, printing the origin a scenario signs in against
```

A whole test run on this machine goes through `npm run verify` (D87), and it belongs to the release stretch; a single spec runs on its own command. Every gate carries the cloud step's own deadline and is taken down past it, so a hung lane frees the lock. A spec lives at `packages/testing/specs/<layer>/<capability>/` and opens with its `@capability`, `@features` and `@risk`; it reaches the product through `@dsh-claude-style/client/pure`, the contract and engine packages, the host contract table, the skin's surface table (`packages/testing/data/surface.json`) and what the reader sees, which lint holds. A behaviour test failing over a defect someone has taken up goes into `packages/testing/data/quarantine.json` by hand, with the defect in the reader's terms; `npm run faults` reports which specs the defect corpus in `packages/testing/faults/` turns red, and `npm run coverage` which layer guards which feature. `node scripts/verify.mjs --help` prints the tiers and what each one walks; the lock the lanes share and the verdict cache are described at the top of `scripts/verify.mjs`. The quick tier leaves out the motion cases; a feature whose cases all watch motion is covered by naming it (`--feature <dir>`), which drops the quick tier. A lane that reads frames — the smoke's motion cases, the end-to-end scenarios that sample the page — is what a loaded machine disturbs: both lanes take `--jobs <n>` (default from the machine's core count) and `--jobs 1` drives one page or scenario at a time. probe, probe-timing and shoot need a running `dsh web` (default `http://127.0.0.1:3080`, `--url` for another; the token is the `/?token=…` in the GUI URL or `DSH_WEB_TOKEN`). All of them need a local Chrome/Edge (`CHROME_PATH` to choose one). `packages/testing/e2e.mjs` boots its own host and needs no running instance, and gives a verdict only on the newest host version published under any dist-tag (`packages/testing/host-version.mjs` reads it from the registry; a machine with another one gets exit 3 and `verify` answers `UNJUDGED`); its scenarios and their scripts are in `packages/testing/scenarios.mjs`, and the bounds its checks read are in `packages/testing/data/bounds.json`.

### Live Inspection

- The bridge answers what only the running page can answer: whether a host selector matches, how a timing behaves, which build a hot reload left loaded. A colour or a spacing written in a token or stylesheet is settled in the source and by the user's eye in light and dark; for a part recorded in `packages/testing/data/appearance.json`, that snapshot is the machine check, and reading the value back through the bridge adds no evidence.
- Desktop window: `node D:\DSH\dsh-gui-bridge\bin\bridge.cjs "<expression>"` evaluates in the window the user sees (`--stdin` reads a script file). While that window is in the background its animation frames are paused: a probe waiting on `requestAnimationFrame` hangs, and anything it put in the page must be cleaned up by hand.
- Stand-in page: `node packages/testing/behaviour.mjs --open <page> [--prefs <json>] [--band <name>]` keeps one of the smoke's pages from the built `lib/` running, applies a preference patch through `window.__pushForm`, and prints the address another command line evaluates at — `--eval --at <address> "<expression>"`, or `--stdin` for a script; `--close --at <address>` ends the session. It takes no verify lock, so it can sit beside a run.
- Which build a page runs: `document.body.getAttribute('data-dsh-claude-style')`; `npm run build` prints the id it wrote. Hot reload swaps the bundle without reloading the page; reload a page that went through many hot reloads before treating it as evidence.
- Host sources: the globally installed `@deepseek-ai/dsh` carries the host's client packages under `node_modules/@deepseek-ai/dsh-client-*/lib/`; the desktop's own copies are fetched from the `url` of each entry in the page's `__DSH_BOOT__.entries`.
- A scratch worktree under `.debug/` or `.agents/worktrees/` is created with `node scripts/worktree.mjs add <path> <ref>`, which borrows this tree's `node_modules` through a directory link, and taken off with `node scripts/worktree.mjs remove <path>`: `git worktree remove` follows the link on Windows and deletes the directory it names, which for `node_modules` is the main tree's own.
- A scratch `dsh web` that has `@alm-allen/dsh-chat-ux` installed makes the skin's chat features stand down; to match a profile without it, filter that entry out of both `__DSH_BOOT__.entries` and every `batches[].entries` before the page boots. A scratch instance on a real model creates real sessions and usage when a message is sent.

## Change Workflow

0. Change `packages/client/src/` or `packages/host/src/`; never touch `lib/`.
1. `npm run build`, or keep `npm run dev` running while iterating.
2. While iterating, the build carries the work forward, and the live page answers what only it shows (D87): with a `dsh web` or the desktop running, `probe.mjs`, the bridge and the live page carry the checks, including after a hot reload. No test run stands between a change and its commit or push; a spec the change touches is run on its own when its answer is needed. A build never waits on the test lock.
3. Visual changes are checked by the user in light and dark; re-shoot stale README screenshots with `shoot.mjs`; `packages/testing/e2e.mjs --scenario shots` writes both palettes to the trace directory for that review, with the privacy sweep already applied.
4. Sync documents: the bilingual READMEs and the documents beside them change together; a behavior change adds one file under `docs/changes/` (D48), and `npm run changelog` prints the next release's section from those files; a changed direction becomes its own page under `docs/adr/` following D48, and the index is regenerated with `npm run docs:index`.
5. A push to master is judged in the cloud by the checks, the build, the spec lane and the part of the smoke and the behaviour lane its change reaches: a change inside feature directories walks those directories' smoke cases and behaviour specs, and any other change walks the smoke's quick tier and every behaviour spec. A red push run does not keep the commit off master; it names the push that brought the regression. After a feature-only push a separate Observe workflow runs the smoke's quick tier and the whole behaviour lane, writes its failures into the run page, and joins no branch rule. A pull request and a merge-queue entry walk the whole smoke, the behaviour specs on Linux and the end-to-end lane; the macOS behaviour lane runs on the manual matrix a release takes and in the nightly workflow, the Windows job reads the host half alone; the branch rule names the single `required` job, so a merge waits on every job of that run while the jobs themselves stay free to change.
6. A red push run or a red observation run on master over the commits this session pushed is this session's to fix and re-push; a failure on another branch, on someone else's merge or on an external pull request is reported to the user, not fixed here. Failures of the browser lanes are found and fixed in the release stretch (Git and Release).

## Git and Release

- Conventional commit prefixes (`fix(scope):`, `refactor(scope):`, `docs(scope):`, `chore(release):` …); commit titles and bodies in Chinese; one logical change per commit, no WIP, no unrelated changes; moves are committed apart from logic changes.
- Several sessions work in the main tree at once, so a commit carries one session's change: stage the files of the change in hand and leave the rest uncommitted. A pull request to an outside project is the one branch of a session's own that gets pushed.
- `lib/` is build output and never committed (D47): it is gitignored on `master`, built by the gates, and shipped by npm and by the `dist` branch.
- Release stretch: before the version is cut, the whole matrix runs once on master — `gh workflow run CI --ref master` in the cloud, or `npm run verify -- --full --e2e` on this machine — and every red lane is fixed, each failure re-run on its own spec or case until it passes, then the matrix once more. Only a green matrix is released.
- Release: `node scripts/changelog.mjs --release <version>` (the pending changes become that version's section and `docs/changes/` is cleared) → `npm version patch|minor` → commit the two and push the tag. The local machine runs no `npm publish`: the package's `prepublishOnly` would only build what the workflow builds again. The Release workflow first reads the matrix verdict on the commit the tag names (`scripts/release-verdict.mjs`, D87) and stops before packing when there is none; then it packs the package once, publishes it as `<version>-dev.<run number>` under npm's `dev` tag, runs the checks that read no page, and publishes `<version>` as `latest` from the same tarball, writes `dist` with the very files npm gets and moves the version tag onto that packaged commit, and opens the GitHub Release with the version's CHANGELOG section (`node scripts/changelog.mjs --notes <version>`); a rerun skips what is already out and the dev build this tag already published. `scripts/dist-branch.mjs --push` does the same step by hand if needed (it builds first, since `lib/` is not in version control).
- CHANGELOG format (the release sections are written by `scripts/changelog.mjs`, which reads the files under `docs/changes/`; a pending change is never written into the file):
  - Version sections `## [x.y.z] - YYYY-MM-DD`, newest first; a pending change lives in `docs/changes/` and reaches the file when `--release` writes its version's section.
  - Each section bilingual on one page: a `[中文](#cn-x.y.z) | [English](#en-x.y.z)` line, then `<h3 id="cn-x.y.z">新增功能</h3>` and `<h3 id="en-x.y.z">New Features</h3>` anchors carrying the version; further groups use plain `###`.
  - Groups, fixed in name and order: 新增功能 / 体验优化 / 问题修复 / 安全 / 移除 / 其他变更 and New Features / Improvements / Bug Fixes / Security / Removals / Chores; empty groups are omitted.
  - Footer: `Full Changelog: [vPrevious...vCurrent](compare link)`.
  - One entry per verifiable behavior or contract, as one sentence in each language: verb-first (新增、修复、改善 / Add, Fix, Improve) and only the change's name, with no explanatory tail after a colon, no bold, no account of how the code worked before, no measured numbers, no attribution — those belong in the commit message. Proper nouns, option names, flags, file paths and code stay verbatim; an external contract change names the migration in the same sentence; user-facing changes stay in sync with the READMEs. No internal numbering, no boilerplate, no format notes inside version sections.
