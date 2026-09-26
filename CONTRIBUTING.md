# Contributing

Thanks for helping improve `dsh-claude-style`!

## Report an issue

Open an issue with:

- Which theme (light / dark) and viewport you saw it in
- A screenshot (this project is visual — a screenshot beats 100 words)
- The DSH version (`dsh --version`) and install source (npm / GitHub)
- The skin's build id: run `document.body.getAttribute('data-dsh-claude-style')` in the page's developer console

## Suggest a change

Open an issue first and describe the rationale. This theme aims to faithfully replicate the Claude Code Desktop experience; changes should align with the [design tokens](docs/STYLE.md).

## Code changes

- `lib/` is generated — never edit it by hand. Change `src/` (or the host half in `host/`) and run `npm run build`, which also checks the sources and syntax-gates the bundle.
- A feature's code and stylesheets live together under `src/features/<feature>/`; parts several features share are in `src/shared/`. The layout and the decisions behind it are in [docs/architecture.md](docs/architecture.md); the rules the build enforces and the working rules are in [AGENTS.md](AGENTS.md).
- Scope every CSS rule under `body[data-dsh-claude-style]`, with dark tokens as the base and light overrides under `:not([data-ds-dark-theme])`.
- `npm run smoke` checks the built bundle without a running DSH: the host half's private-route fence, and — in headless Chrome/Edge against a stand-in host page — boot, an idle scheduler, no markup injection, Enter left to the host, feature isolation, no uncaught errors and a clean teardown.
- `node scripts/probe.cjs --token <launch-token>` re-checks the composer invariants against a running `dsh web` GUI.
