# Migrating from lagom-tokens 1.x to 2.0.0

2.0.0 splits the tokens into a role contract with a default brand (Base, in `@fcongson/lagom-tokens`) and Frank's own brands (Fern and Waypoint, in `@fcongson/lagom-brands`). There are no aliases for the old names. Use the script below, then fix what it lists.

## What changed

- **Brands.** What 1.x shipped is now the **Fern** brand. Base is a neutral brand (grey and navy, Lexend, Source Serif 4, DM Mono) that every brand overrides. If your site looked like 1.x, you want Fern.
- **Loading.** One stylesheet per package holds every mode and contrast level. Choose with attributes on `<html>` or any element:
  - `data-lagom-brand="fern"` (no attribute: Base)
  - `data-lagom-theme="dark"` (no attribute: light)
  - `data-lagom-contrast="more"`, or the `prefers-contrast: more` media query
- **Palette.** Colours are named by tone (CIELAB lightness, 5 to 98, plus 100 for white in neutral families) instead of base/lighterN/darkerN, and each brand has its own prefix: `--lagom-grey-55` (Base), `--fern-olive-45`, `--waypoint-brick-40`. Old colours moved to the nearest stop, so some values shift slightly (ΔE 4 at most, honey-base the largest).
- **Roles.** `muted` and `subtle` are now `secondary` and `tertiary`. Brand tints and `shadows-default` are gone. New roles: `accent-fg`, `selection-bg`, `focus-ring`, `border-width`, `focus-ring-width`, `image-filter`. New component tokens replace lagom-ui's `--themed-*` hooks: page header and hero margins, hero and featured-section image fit, and the header type scale (`core-font-sizes-header1` to `header6`).
- **JS.** `js/theme/light.js` is now `js/light.js`. There are also `js/dark.js`, `js/more.js`, and `js/more-dark.js`. The `js/variables/*` and `css/variables/*` per-set files are gone.

## Run the script

From a clone of this repo:

```bash
node scripts/migrate.js path/to/your/src                 # dry run, Fern palette
node scripts/migrate.js path/to/your/src --write         # apply
node scripts/migrate.js path/to/your/src --palette base  # map grey and navy to Base instead
```

It rewrites CSS custom properties, JS export names, and import paths, and lists everything it can't change for you. Then:

1. Update `@fcongson/lagom-tokens` to 2.x, and add `@fcongson/lagom-brands` if you use Fern or Waypoint.
2. Load `@fcongson/lagom-tokens/css/lagom.css`, then your brand's CSS (e.g. `@fcongson/lagom-brands/fern/css/fern.css`), and set `data-lagom-brand` on `<html>`. Delete imports of `_dark.css`.
3. Dark mode still uses `data-lagom-theme="dark"`, as in 1.x. Dark values now come from `lagom.css` itself.
4. If you override roles yourself, run `npx check-brand your.css` to check contrast in all four variants.

## Every change

The script reads [`migration/2.0.0.json`](./migration/2.0.0.json). JS export names are the camelCase of the CSS names (`--lagom-semantic-color-fg-muted` is `lagomSemanticColorFgMuted`). Palette stops are shown with Fern's prefix.

### Renamed

- `--lagom-semantic-color-fg-muted` → `--lagom-semantic-color-fg-secondary`
- `--lagom-semantic-color-fg-subtle` → `--lagom-semantic-color-fg-tertiary`
- `--lagom-semantic-color-bg-muted` → `--lagom-semantic-color-bg-secondary`
- `--lagom-semantic-color-bg-subtle` → `--lagom-semantic-color-bg-tertiary`
- `--lagom-semantic-color-border-muted` → `--lagom-semantic-color-border-secondary`

### Palette

- `--lagom-core-colors-black` → `--fern-grey-5`
- `--lagom-core-colors-white` → `--fern-grey-100`
- `--lagom-core-colors-grey-darker40` → `--fern-grey-15`
- `--lagom-core-colors-grey-darker35` → `--fern-grey-20`
- `--lagom-core-colors-grey-darker30` → `--fern-grey-25`
- `--lagom-core-colors-grey-darker20` → `--fern-grey-35`
- `--lagom-core-colors-grey-base` → `--fern-grey-55`
- `--lagom-core-colors-grey-lighter20` → `--fern-grey-75`
- `--lagom-core-colors-grey-lighter40` → `--fern-grey-95`
- `--lagom-core-colors-honey-darker20` → `--fern-honey-45`
- `--lagom-core-colors-honey-darker10` → `--fern-honey-60`
- `--lagom-core-colors-honey-base` → `--fern-honey-75`
- `--lagom-core-colors-honey-lighter20` → `--fern-honey-85`
- `--lagom-core-colors-honey-lighter40` → `--fern-honey-95`
- `--lagom-core-colors-olive-darker20` → `--fern-olive-20`
- `--lagom-core-colors-olive-darker10` → `--fern-olive-35`
- `--lagom-core-colors-olive-base` → `--fern-olive-45`
- `--lagom-core-colors-olive-lighter20` → `--fern-olive-65`
- `--lagom-core-colors-olive-lighter40` → `--fern-olive-85`
- `--lagom-core-colors-navy-darker20` → `--fern-navy-10`
- `--lagom-core-colors-navy-darker10` → `--fern-navy-25`
- `--lagom-core-colors-navy-base` → `--fern-navy-35`
- `--lagom-core-colors-navy-lighter20` → `--fern-navy-50`
- `--lagom-core-colors-navy-lighter40` → `--fern-navy-75`
- `--lagom-core-colors-violet-darker10` → `--fern-violet-10`
- `--lagom-core-colors-violet-darker5` → `--fern-violet-15`
- `--lagom-core-colors-violet-base` → `--fern-violet-20`
- `--lagom-core-colors-violet-lighter20` → `--fern-violet-40`
- `--lagom-core-colors-violet-lighter40` → `--fern-violet-60`
- `--lagom-core-colors-red-darker20` → `--fern-red-15`
- `--lagom-core-colors-red-darker10` → `--fern-red-25`
- `--lagom-core-colors-red-base` → `--fern-red-35`
- `--lagom-core-colors-red-lighter20` → `--fern-red-50`
- `--lagom-core-colors-red-lighter40` → `--fern-red-75`

### Removed

- `--lagom-core-colors-transparent`: Use the CSS keyword transparent.
- `--lagom-semantic-color-brand-primary`: Brand tints are gone. For an accent, use lagom-semantic-color-accent-default. For the exact colour, use a palette stop: Fern's is fern-olive-45.
- `--lagom-semantic-color-brand-secondary`: Brand tints are gone. Use a palette stop: Fern's is fern-navy-35.
- `--lagom-semantic-color-brand-tertiary`: Brand tints are gone. Use a palette stop: Fern's is fern-violet-20.
- `--lagom-semantic-color-shadows-default`: Removed with no replacement. Use a palette stop (fern-grey-5 in light, fern-grey-15 in dark) in your own shadow.
- `--lagom-core-spacing-multi-value`: Tokens Studio sample token. Write the value out: var(--lagom-core-dimension-sm) var(--lagom-core-dimension-xl).
- `--lagom-core-border-radius-multi-value`: Tokens Studio sample token. Write the value out: var(--lagom-core-border-radius-xs) var(--lagom-core-border-radius-lg).

### Files

- `@fcongson/lagom-tokens/css/theme/_light.css` → `@fcongson/lagom-tokens/css/lagom.css`
- `@fcongson/lagom-tokens/css/theme/_dark.css` → remove (included in `css/lagom.css` / `js/dark`)
- `@fcongson/lagom-tokens/css/variables/_core.css` → `@fcongson/lagom-tokens/css/lagom.css`
- `@fcongson/lagom-tokens/css/variables/_semantic.css` → `@fcongson/lagom-tokens/css/lagom.css`
- `@fcongson/lagom-tokens/css/variables/_semantic.light.css` → `@fcongson/lagom-tokens/css/lagom.css`
- `@fcongson/lagom-tokens/css/variables/_semantic.dark.css` → remove (included in `css/lagom.css` / `js/dark`)
- `@fcongson/lagom-tokens/css/variables/_component.css` → `@fcongson/lagom-tokens/css/lagom.css`
- `@fcongson/lagom-tokens/js/theme/light` → `@fcongson/lagom-tokens/js/light`
- `@fcongson/lagom-tokens/js/theme/dark` → `@fcongson/lagom-tokens/js/dark`
- `@fcongson/lagom-tokens/js/variables/core` → `@fcongson/lagom-tokens/js/light`
- `@fcongson/lagom-tokens/js/variables/semantic` → `@fcongson/lagom-tokens/js/light`
- `@fcongson/lagom-tokens/js/variables/semantic.light` → `@fcongson/lagom-tokens/js/light`
- `@fcongson/lagom-tokens/js/variables/semantic.dark` → `@fcongson/lagom-tokens/js/dark`
- `@fcongson/lagom-tokens/js/variables/component` → `@fcongson/lagom-tokens/js/light`
