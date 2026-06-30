# lagom-tokens

Design tokens used to support [lagom-ui](https://github.com/fcongson/lagom-ui)

Tokens are authored in the [W3C DTCG](https://www.designtokens.org/tr/drafts/format/) format (`$value`/`$type`/`$description`) and built with [Style Dictionary](https://styledictionary.com/) v5 + [`@tokens-studio/sd-transforms`](https://github.com/tokens-studio/sd-transforms) v2. See [`docs/dtcg-migration-plan.md`](./docs/dtcg-migration-plan.md) for the migration writeup and [`tokens/README.md`](./tokens/README.md) for how the token files fit together.

## Requirements

Node.js >= 22 (required by Style Dictionary v5).

## Scripts

- `build` — generates `css/` and `js/` from `tokens/tokens.studio.json`.
- `verify` — smoke-tests the generated `css/`/`js/` output (no unresolved references, no invalid raw math left outside `calc()`).

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
