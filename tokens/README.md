# Tokens

## `tokens.studio.json`

[Tokens Studio for Figma](https://tokens.studio/) interacts with `tokens.studio.json`. Tokens Studio reads from and writes to a single json file. This single file is then separated into its various layers (described below).

Tokens are written in the [W3C DTCG](https://www.designtokens.org/tr/drafts/format/) format (`$value`/`$type`/`$description` instead of the legacy `value`/`type`/`description`). The Tokens Studio plugin's "Token Format" setting (Settings → Token Format) should stay set to **W3C DTCG** so future syncs from Figma keep writing this format - see [Tokens Studio's DTCG vs Legacy doc](https://docs.tokens.studio/manage-settings/token-format).

Each top-level key (`core`, `semantic`, `semantic-light`, `semantic-dark`, `component`) is Tokens Studio's single-file export wrapping - it nests every set under its own name again (e.g. `tokens.core` is `{ "core": { ...token groups... } }`, and `tokens["semantic-light"]` is `{ "semantic": { ...light-only tokens... } }`, deliberately reusing the `semantic` key so light/dark/base variants share the same generated CSS custom property name). `@tokens-studio/sd-transforms`' `excludeParentKeys` preprocessor option strips exactly one such wrapper per source file at build time - see `tokens/[layer].js` below for why each file re-adds that wrapper before handing tokens to Style Dictionary.

## `[layer].js`

Each `[layer].js` file selects a single token set from `tokens.studio.json` and re-wraps it with its outer set-name key, e.g.:

```js
// core.js
import tokens from "./tokens.studio.json" with { type: "json" };

export default { core: tokens.core };
```

This re-wrap matters: `tokens.core` is already singly-wrapped (`{ core: {...} }`), and `excludeParentKeys` expects to strip exactly one wrapper layer per source file. Skip the re-wrap and the `core` prefix gets stripped from every generated variable name instead of just the redundant inner layer.

## [Style Dictionary](https://styledictionary.com/)

[Style Dictionary](https://styledictionary.com/) (v5) then uses the individual token sets, via [`@tokens-studio/sd-transforms`](https://github.com/tokens-studio/sd-transforms) (v2), to build the css custom properties (css variables) and JS modules that will be used in [Lagom UI](https://lagom-ui.netlify.app/). See `scripts/sd.build.js`.
