# Contributing

Thanks for helping improve `dsh-claude-style`!

## Report an issue

Open an issue with:

- Which theme (light / dark) and viewport you saw it in
- A screenshot (this project is visual — a screenshot beats 100 words)
- The DSH version (`dsh --version`) and install source (npm / GitHub)
- The skin's build id: run `document.body.getAttribute('data-dsh-claude-style')` in the page's developer console

## Suggest a change

A fix is welcome as a pull request on its own: describe the symptom, the cause and, when the look of the page changes, attach a before-and-after screenshot.

Any other change — a new feature, a new setting, a reworked layout — starts as an issue with the rationale and waits for an answer before the code is written.

This theme aims to faithfully replicate the Claude Code Desktop experience; changes should align with the [design tokens](docs/STYLE.md).

## Describe the change

- A change is described once, in its own file under `docs/changes/`; the CHANGELOG's version sections are written from those files at release time. A pending change is never edited into `docs/CHANGELOG.md` by hand.
- Both READMEs describe the plugin as it ships: a pull request leaves both untouched, or changes both in the same pull request, and only to re-shoot a stale screenshot or to correct the install instructions; an explanation of a feature belongs in `docs/changes/`, where the release notes read it.

## Code changes

- Small edits and one-off investigations can use the independent temporary-file commands; tasks that need continuity use a work order. The criteria and commands are in [AGENTS.md](AGENTS.md#work-orders-and-temporary-files).
- Continuous integration is described where it is defined: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) says what each lane reads and which events run it, and [AGENTS.md](AGENTS.md#change-workflow) states the workflow the repository follows. A pull request, a merge-queue entry and a manual run walk the whole matrix; a push to master runs the checks, the build and the spec lane, and a separate observation workflow runs the stand-in page's quick tier and every behaviour spec without joining the branch rule. Open the pull request as a draft once the change has a shape: its run is how the cloud judges the branch, and it answers while the code is still being written. Locally, start only the narrowest run that answers the question in hand, in the background, and compare the tree hash it prints with the tree you have: `node scripts/checks/verify.mjs --help` names every selector and what it walks.
- `lib/` is generated — never edit it by hand. Change `packages/client/src/` (or the host half in `packages/host/src/`), run `npm install` once for the dev dependencies, then `npm run build`: it type-checks the TypeScript sources, bundles them with esbuild and checks the result.
- Code submitted to the Sodium rendering engine (`packages/client/src/features/sodium/`, `packages/engine/src/sheet-rewrite.ts`) is licensed under the PolyForm Shield License 1.0.0; the rest of the repository stays MIT.
- A feature's code and stylesheets live together under `packages/client/src/features/<feature>/`; parts several features share are in `packages/client/src/shared/`. The shape of the tree and the constraints that cross it are in [ARCHITECTURE.md](docs/ARCHITECTURE.md); the reasoning behind a direction is in [docs/adr/](docs/adr/README.md); the rules the build enforces and the working rules are in [AGENTS.md](AGENTS.md).
- Scope every CSS rule under `body[data-dsh-claude-style]`, with dark tokens as the base and light overrides under `:not([data-ds-dark-theme])`.
- `npm run stand-in` checks the built bundle without a running DSH: the host half's private-route fence, installation and teardown invariants, and the behaviour specs a reader can observe on the stand-in host page.
- `node packages/testing/probe.mjs --token <launch-token>` re-checks the composer invariants against a running `dsh web` GUI.
