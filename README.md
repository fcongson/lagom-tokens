# lagom-tokens

Design tokens for [lagom-ui](https://github.com/fcongson/lagom-ui), as a role contract that any brand can fill in.

This repo publishes two packages:

- [`@fcongson/lagom-tokens`](./packages/lagom-tokens) (MIT): the contract and **Base**, the brand every other brand overrides. Use it to build your own brand.
- [`@fcongson/lagom-brands`](./packages/lagom-brands) (all rights reserved): Frank Congson's brands, **Fern** (frankcongson.com, frankcongson.dev) and **Waypoint** (heythereeverywhere.com). Public so Frank's sites can install it, but not licensed for reuse.

See [LICENSE](./LICENSE) for which folders are under which terms, and [MIGRATION.md](./MIGRATION.md) for upgrading from 1.x.

## Using the tokens

```css
@import "@fcongson/lagom-tokens/css/lagom.css";
/* Optional: a brand, loaded after lagom.css */
@import "@fcongson/lagom-brands/fern/css/fern.css";
```

Three attributes choose what an element shows. Each can go on `<html>` or on any element inside it, so a section can switch on its own:

- `data-lagom-brand="fern"`: the brand (no attribute: Base)
- `data-lagom-theme="dark"`: the mode (no attribute: light)
- `data-lagom-contrast="more"`: increased contrast (also applied by the `prefers-contrast: more` media query)

Load order between the files doesn't matter: Base's selectors have zero specificity, so any brand outranks it.

Every role is a CSS custom property, `--lagom-semantic-color-fg-default` for example. Palette colours are prefixed by brand: `--lagom-grey-55` (Base), `--fern-olive-45`, `--waypoint-brick-40`. JS modules export the same tokens, fully resolved, per variant: `js/light.js`, `js/dark.js`, `js/more.js`, `js/more-dark.js`.

## Making your own brand

Start from Base and override roles in your own CSS. [`examples/white-label.css`](./examples/white-label.css) is a complete example. Then check it:

```bash
npx check-brand your-brand.css
```

`check-brand` comes with `@fcongson/lagom-tokens`. It checks that every role still resolves, that anything you set for light you also set for dark, that your increased-contrast blocks match your `prefers-contrast` blocks, and that every text and non-text pair passes contrast: AA normally, AAA (7:1 text, 4.5:1 non-text) with increased contrast. Each role's requirements are in its description in [`tokens/base/semantic.json`](./tokens/base/semantic.json).

## Working in this repo

Node.js >= 22 and Yarn (classic). `yarn install`, then:

- `yarn ramps`: regenerate each brand's `palette.json` from its anchor colours. `yarn ramps:check` fails if one is out of date.
- `yarn build`: build both packages into `packages/*/css` and `packages/*/js`, plus `packages/lagom-tokens/contract.json` (build output, gitignored).
- `yarn check-brand [brand | file.css]`: check every brand (or one, or a CSS file) against the contract.
- `yarn suggest-more <brand> [--write]`: suggest increased-contrast values for a brand from its own palette. Review them by eye before committing.
- `yarn verify`: smoke-test the build output.
- `yarn test:cascade`: check the built CSS in Chromium (`npx playwright install chromium` once).
- `yarn ci`: all of the above, as CI runs it.

See [`tokens/README.md`](./tokens/README.md) for how the token sources fit together.

## Releasing

Each package is versioned and published on its own. Bump `version` in the package's `package.json`, then push a tag named after it: `lagom-tokens@2.0.0` or `lagom-brands@1.0.0`. The [publish workflow](./.github/workflows/publish.yml) runs every check and publishes that package to GitHub Packages. See [`.github/workflows/README.md`](./.github/workflows/README.md).

## References

- [Design Tokens Community Group (W3C DTCG) format](https://www.designtokens.org/tr/drafts/format/)
- [Tokens Studio for Figma](https://tokens.studio/)
- [WCAG 2.2 contrast (minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [enhanced](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html)
