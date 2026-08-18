# CLAUDE.md

## Project
`@gad-lang/codemirror-gad` — CodeMirror 6 language support for the Gad language
(`.gad` / `.gadt` / `.gadx`): syntax highlighting, autocompletion, hover
tooltips, async linting and a sample-tree editor demo.

## Tooling — bun ONLY
- **Always use `bun`.** Never `npm`, `yarn`, `pnpm`, `npx` or `node` directly.
- Build and dev go through the `Makefile` (a thin wrapper over bun) — run `make help`.
- `make build` (tsc → `dist/`), `make typecheck`, `make demo` (example server), `make clean`.

## Layout
- `src/` — the extension: `index.ts` (public API), `language.ts`, `complete.ts`,
  `hover.ts`, `lint.ts`, `gadx.ts`, `template.ts`, `keywords.ts`.
- `example/` — live demo served by `example/serve.ts` (bun), with a samples tree.
- `docs/api.md` — API reference.

## Conventions
- TypeScript strict; keep the public surface in `src/index.ts`.
- Match the surrounding code style; comment density and naming as in-tree.
