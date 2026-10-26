# @fcongson/lagom-tokens

## 2.0.0

Lagom's tokens are now a role contract that any brand can fill in. See [MIGRATION.md](../../MIGRATION.md); `node scripts/migrate.js` rewrites most names for you.

- **Base**, a neutral default brand (grey and navy; Lexend, Source Serif 4, DM Mono; 8px button radius), replaces the 1.x look, which moves to the Fern brand in `@fcongson/lagom-brands`.
- **One stylesheet**, `css/lagom.css`, covers light, dark, and increased contrast. Choose with `data-lagom-theme="dark"` and `data-lagom-contrast="more"` (or `prefers-contrast: more`), on `<html>` or any element.
- **Increased contrast**: every role has AAA values (7:1 text, 4.5:1 non-text), with thicker borders (2px) and focus rings (3px).
- **Tone-scale palette**: colours are named by CIELAB lightness (`--lagom-grey-55`), so tone gaps predict contrast for every hue.
- **Roles**: `muted`/`subtle` are now `secondary`/`tertiary`. New: `accent-fg`, `selection-bg`, `focus-ring`, `border-width`, `focus-ring-width`, `image-filter`. Removed: `brand-primary`, `brand-secondary`, `brand-tertiary`, `shadows-default`.
- **Component tokens** for what lagom-ui's `--themed-*` hooks used to set: page header and hero margins, hero and featured-section image fit, and the header type scale.
- **JS**: `js/light.js`, `js/dark.js`, `js/more.js`, `js/more-dark.js` replace `js/theme/*` and `js/variables/*`.
- **`check-brand`**: `npx check-brand brand.css` checks a white label's overrides against the contract.
- Built by this repo's own scripts instead of Style Dictionary.
