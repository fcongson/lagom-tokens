# lagom-tokens

Design tokens used to support [lagom-ui](https://github.com/fcongson/lagom-ui)

Tokens are authored in the [W3C DTCG](https://www.designtokens.org/tr/drafts/format/) format (`$value`/`$type`/`$description`) and built with [Style Dictionary](https://styledictionary.com/) v5 + [`@tokens-studio/sd-transforms`](https://github.com/tokens-studio/sd-transforms) v2. See [`tokens/README.md`](./tokens/README.md) for how the token files fit together, and [`docs/dtcg-migration-plan.md`](./docs/dtcg-migration-plan.md) for the plan behind the DTCG migration (its "Outcome" section records what actually shipped).

## Requirements

Node.js >= 22 (required by Style Dictionary v5). Dependencies are installed with Yarn (classic, `yarn.lock`):

```bash
yarn install
```

## Scripts

- `build` — generates `css/` and `js/` from `tokens/tokens.studio.json`: runs `scripts/sd.build.js` (Style Dictionary), then `css:calc`.
- `css:calc` — post-processes the generated CSS, wrapping token math (e.g. `var(--a) * var(--b)`) in `calc()`. Run automatically by `build`.
- `verify` — smoke-tests the generated `css/`/`js/` output (every expected file present and non-empty, no unresolved references, no raw math left outside `calc()`).

## Output

`css/` and `js/` are build output (gitignored, generated at publish time). All CSS custom properties and JS exports are prefixed with `lagom` (e.g. `--lagom-core-dimension-xs`, `lagomCoreDimensionXs`).

- `css/variables/` and `js/variables/` — one file per token set: `core`, `semantic`, `semantic.light`, `semantic.dark`, `component` (CSS files are prefixed with `_`, e.g. `_core.css`). Each file contains only its own set's tokens. CSS values keep `var()` references to the sets they depend on (listed in each file's header), so those files must be loaded too.
- `css/theme/` and `js/theme/` — `light` and `dark` themes. Each is self-contained: every token from `core`, `semantic`, the matching light/dark set, and `component`.

Light tokens use the `:root` selector; dark tokens use `[data-lagom-theme~="dark"]`.

The package is published to GitHub Packages as `@fcongson/lagom-tokens` (see `.npmrc`). Files are imported by path, e.g. `@fcongson/lagom-tokens/css/theme/_light.css` or `@fcongson/lagom-tokens/js/variables/core.js`.

## Releasing

Bump `version` in `package.json`, then push a matching `v*` tag (e.g. `v1.0.1`). The [Style Dictionary workflow](./.github/workflows/style-dictionary.yml) builds, verifies and publishes the package. See [`.github/workflows/README.md`](./.github/workflows/README.md).

## References

[Design Tokens Community Group (W3C DTCG) format spec](https://www.designtokens.org/tr/drafts/format/)

[Style Dictionary](https://styledictionary.com/)

[Style Dictionary — DTCG support](https://styledictionary.com/info/dtcg/)

[Style Dictionary Transforms for Tokens Studio](https://github.com/tokens-studio/sd-transforms)

[Tokens Studio for Figma](https://tokens.studio/)

[Tokens Studio — Token Format: W3C DTCG vs Legacy](https://docs.tokens.studio/manage-settings/token-format)

[Supernova — Figma tokens & CLI](https://learn.supernova.io/latest/releases/november-2022/figma-tokens-and-cli.html)

[Supernova — CLI](https://github.com/Supernova-Studio/cli)

[Supernova — Figma tokens sync](https://github.com/Supernova-Studio/cli/blob/main/docs/figma-tokens-sync.md)

[Supernova — Figma tokens config mapping](https://github.com/Supernova-Studio/cli/blob/main/docs/figma-tokens-sync-mapping-examples.md)
