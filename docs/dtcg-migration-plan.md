# lagom-tokens: Migration to the W3C DTCG Token Spec

> This is the plan as written **before** the migration. The "Current state (baseline)" section describes the pre-migration repo. The migration shipped as v1.0.0. See [Outcome](#outcome) for where the result differs from the plan.

## Outcome

What shipped, compared with the target state and phases below:

- **Done as planned:** `tokens/tokens.studio.json` converted to DTCG. `style-dictionary@^5.5.0` and `@tokens-studio/sd-transforms@^2.0.3`, with `scripts/sd.build.js` rewritten against the async v5 API and the `tokens-studio` preprocessor. Build scripts and `tokens/*.js` converted to ESM. `package.json` has `"type": "module"`, an `exports` map for `css/*` and `js/*`, and version 1.0.0. The stale `yarn-error.log` and dead `getJsonConfig` code are gone. A CI workflow runs on pushes and PRs.
- **`engines.node` is `>=22`, not `>=18`.** Style Dictionary v5 requires Node 22. CI and the release workflow pin Node 22.
- **`scripts/css.calc.js` was kept.** `ts/resolveMath` resolves math to literals, but with `outputReferences` on, Style Dictionary still writes the unresolved `var() * var()` expression without wrapping it in `calc()`. The script is still needed to keep those values live references. Composite tokens whose sub-values use `^` exponent math (no `calc()` equivalent) are output as resolved literals instead, through a per-token `outputReferences` function in `sd.build.js`.
- **No `json/` output.** The dead code was deleted, not wired up.
- **No snapshot tests.** Verification was a one-time diff against the pre-migration build. The changes found were cosmetic (hex case, comment style), plus a `px` unit on `paragraphSpacing` in JS output. At first all typography composites were resolved to literals. A later change narrowed that to only the tokens that use `^`. The committed check is `scripts/verify-build.js` (`npm run verify`), a smoke test for missing or empty files, unresolved `{...}` references and raw math outside `calc()`. It does not diff against a snapshot.
- **Not done:** `lint`/`format`/`test` scripts, Changesets/CHANGELOG, `.nvmrc`.

## Why

The "modern spec" for design tokens is the [W3C Design Tokens Format Module (DTCG)](https://www.designtokens.org/tr/drafts/format/), which reached its first stable release (2025.10) in October 2025. It standardizes tokens on `$value`/`$type`/`$description` instead of the legacy `value`/`type`/`comment` keys that Tokens Studio and `lagom-tokens` currently use. Figma, Tokens Studio, Style Dictionary, and Terrazzo all now support it natively, which is the real payoff: less custom glue code, and tokens that aren't locked to one tool's dialect.

`lagom-tokens` is currently two major versions behind on its build chain (`style-dictionary@3.9.2`, `@tokens-studio/sd-transforms@0.12.2`, both released years ago) and uses the legacy token format throughout `tokens/tokens.studio.json`. Current versions are `style-dictionary@5.5.0` and `@tokens-studio/sd-transforms@2.0.3`, and the latter now hard-requires `style-dictionary@^5.0.0`. So the spec migration and the tooling upgrade have to happen together — sd-transforms 2.x won't run against the old Style Dictionary, and the old sd-transforms doesn't understand DTCG.

## Current state (baseline)

- 860-line `tokens/tokens.studio.json` with `core`, `semantic`, `semantic-light`, `semantic-dark`, `component` sets, ~168 typed tokens, legacy Tokens Studio type names (`fontSizes`, `fontWeights`, `fontFamilies`, `lineHeights`, `letterSpacing`, `paragraphSpacing`, `borderRadius`, `borderWidth`, `opacity`, `typography`, `dimension`, `spacing`, `color`, `other`).
- `tokens/*.js` files are thin CommonJS wrappers (`module.exports = require("./tokens.studio.json").core`, etc.) — no `"type": "module"` in `package.json`, no ESM anywhere.
- `scripts/sd.build.js` uses the old `StyleDictionary.extend(cfg)` API and synchronous `buildAllPlatforms()`.
- `scripts/css.calc.js` is a hand-rolled post-processor that wraps any CSS value containing `*` in `calc(...)`, because the SD 3.x build couldn't resolve token math (`{core.dimension.xxs} * {core.dimension.scale}`) for non-pixel-output cases. Style Dictionary 4/5 plus `sd-transforms`' math resolution can likely replace this script outright.
- Outputs: `css/variables/`, `css/theme/`, `js/variables/`, `js/theme/` only. A `getJsonConfig` helper exists in `sd.build.js` but is commented out and unused.
- No tests, no lint/format config, no CI, no TypeScript types, no `engines` field, no `exports` map. A stray `yarn-error.log` (a stale JSON-parse failure from an old `package.json`) is committed to the repo.
- Consumer: [`lagom-ui`](https://github.com/fcongson/lagom-ui) imports the built `css/` and `js/` output directly, so any change to generated variable names, file paths, or computed values is a breaking change downstream.

## Target state

- `tokens/tokens.studio.json` authored in DTCG format (`$value`/`$type`/`$description`), with Tokens Studio's plugin settings switched to "W3C DTCG" token format so future edits stay in spec.
- `style-dictionary@^5.5.0` and `@tokens-studio/sd-transforms@^2.0.3`, build scripts rewritten against the v4/v5 API (`new StyleDictionary(cfg)`, async `build()`, preprocessor-based Tokens Studio handling instead of the old transform list).
- Build scripts converted to ESM (or at minimum isolated `.mjs`), `css.calc.js` hack removed if SD's native math resolution covers it.
- `package.json` modernized: `"type": "module"`, `engines.node >= 18`, `exports` map for `css`/`js` (and optionally `json`) subpaths, scripts for `lint`, `format`, `test`, `build`.
- A verification step (snapshot diff of generated CSS/JS against the pre-migration output) so the team knows exactly what changed before publishing, since `lagom-ui` depends on the exact variable names and values.

## Phased plan

**Phase 0 — Prep.** Branch off `main`. Pin Node to 18+ locally (Style Dictionary 4/5 requires it; the repo's `.nvmrc`, if any, should reflect this). Delete or relocate the stale `yarn-error.log`. Capture the current build output (`css/`, `js/`) as a snapshot/baseline for later diffing — this is the regression net for the whole migration.

**Phase 1 — Convert tokens to DTCG format.** Rewrite `tokens/tokens.studio.json` so every token uses `$value`/`$type`/`$description` instead of `value`/`type`/`description`/`comment`, and reconcile legacy Tokens Studio type names with DTCG type names (e.g. `fontSizes` → `fontSize` equivalents, `boxShadow`/`typography`/`border` composite types). `sd-transforms`' built-in preprocessor can auto-align most Tokens Studio types to DTCG on the fly, which reduces manual rename risk — decide whether to rely on that preprocessor at build time or do a one-time hard conversion of the source file (recommended, since it keeps the source of truth in the modern spec rather than depending on a transform to paper over it every build). Switch the Tokens Studio Figma plugin's token format setting to DTCG so future syncs from Figma stay aligned. Update `supernova.settings.json` and `tokens/README.md` to describe the new format.

**Phase 2 — Upgrade Style Dictionary and sd-transforms.** Bump `style-dictionary` 3.9.2 → 5.5.0 and `@tokens-studio/sd-transforms` 0.12.2 → 2.0.3 in `package.json`. Rewrite `scripts/sd.build.js`: replace `StyleDictionary.extend(cfg)` with `new StyleDictionary(cfg)`, `await` the now-async `buildAllPlatforms()`/`cleanAllPlatforms()` calls, and update the transform list/registration to whatever sd-transforms 2.x expects (it has moved toward a preprocessor-based architecture rather than registering individual `ts/*` transforms by name — check the current README for the exact registration call). Run a codemod pass using the official Style Dictionary v4 codemods where applicable to catch any internal-import patterns that no longer work under the locked-down package entrypoints.

**Phase 3 — Modernize the build pipeline.** Convert `scripts/sd.build.js` and `scripts/css.calc.js` to ESM (`import`/`export`), or give them `.mjs` extensions if the rest of the package stays CJS. Attempt to delete `css.calc.js` by relying on Style Dictionary/sd-transforms' built-in math resolution (`ts/resolveMath` or equivalent) for the multiplication cases that motivated the hack; only keep it if a real gap remains, and document why. Reinstate or remove the dead `getJsonConfig` path — if a `json/` output is useful for non-CSS/JS consumers, wire it in; otherwise delete the dead code.

**Phase 4 — Package metadata cleanup.** Add `"type": "module"` (or document the CJS/ESM split), `engines.node`, and an `exports` map so consumers import `@fcongson/lagom-tokens/css/variables/core.css` etc. explicitly rather than relying on implicit file paths. Review whether `style-dictionary`/`sd-transforms` should move from `devDependencies` to stay there (they're build-time only, so `devDependencies` is correct — just confirm nothing at runtime needs them). Add `lint`/`format` scripts if the project wants consistent style enforcement (e.g. Prettier/ESLint flat config, both of which now assume ESM-friendly configs).

**Phase 5 — Verification.** Diff the newly generated `css/` and `js/` output against the Phase 0 baseline. Expect some intentional differences (DTCG type alignment can shift how composite tokens like `typography` or `boxShadow` expand) but flag any unintended ones — especially from sd-transforms' color-modifier transform, which has changed its underlying color math library between major versions and can shift computed hex/HSL values by rounding. Spin up `lagom-ui` against the new build locally (or in a linked/`yalc` setup) to confirm nothing visibly breaks before publishing.

**Phase 6 — Tests and CI.** Add a minimal test (even a simple Node script comparing build output against committed snapshots) so future token edits can't silently change generated CSS without review. Add a GitHub Actions workflow that runs `yarn build` (or `npm run build`) and the new test on every PR. Optional but recommended: adopt Changesets for versioning so the DTCG migration is published as a clearly-flagged major version bump, with a CHANGELOG entry explaining the format change for `lagom-ui` and any other consumers.

**Phase 7 — Publish and document.** Bump to a new major version (this is a breaking change for anyone reading `tokens/tokens.studio.json` directly, even if generated CSS/JS output stays stable). Update `README.md` and `tokens/README.md` to describe the DTCG format and the new build chain, replacing or supplementing the existing Supernova/Tokens Studio reference links with the [DTCG spec](https://www.designtokens.org/tr/drafts/format/) and [Style Dictionary DTCG docs](https://styledictionary.com/info/dtcg/). Publish, then update `lagom-ui`'s dependency and confirm its build/visual output is unaffected.

## Risks to watch

Sd-transforms 2.x's color-modifier transform uses a different underlying library than the 0.12.x version did, which can produce slightly different computed color values after `lighten`/`darken`/alpha operations — worth a visual diff, not just a text diff, on the `semantic.light`/`semantic.dark` theme output. The DTCG type-alignment step is the other main source of risk: legacy Tokens Studio composite types (`typography`, `border`, `boxShadow`) don't map 1:1 to DTCG composite types, so the `component` and `semantic` sets (which lean on composites) need closer review than the flatter `core` set. Because `lagom-ui` consumes generated file paths and CSS variable names directly, any rename there is a breaking change regardless of whether the token source format changed — treat path/name stability as a separate decision from the spec migration itself.

## Suggested sequencing

Phases 0–3 can be done together as one PR (tooling + format migration, since they're interdependent). Phase 4 is independent cleanup and can land separately. Phase 5 (verification) gates the release — don't publish until the diff is understood and `lagom-ui` has been smoke-tested. Phases 6–7 (CI/tests, publish) close out the migration and prevent regressions on the next token change.
