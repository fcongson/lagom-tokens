# @fcongson/lagom-tokens

Lagom's role contract and **Base**, the brand every other brand overrides. MIT.

```css
@import "@fcongson/lagom-tokens/css/lagom.css";
```

- `css/lagom.css`: every role and component token, for light, dark (`data-lagom-theme="dark"`), and increased contrast (`data-lagom-contrast="more"` or `prefers-contrast: more`). Base's selectors use `:where()`, so any brand loaded alongside outranks them.
- `css/palette.css`: Base's palette alone (`--lagom-grey-*`, `--lagom-navy-*`), on `:root`.
- `js/light.js`, `js/dark.js`, `js/more.js`, `js/more-dark.js`: the same tokens, fully resolved.
- `contract.json`: every role and Base's values, used by `check-brand`.

To build your own brand, override roles in your CSS and check it:

```bash
npx check-brand your-brand.css
```

See the [repo README](https://github.com/fcongson/lagom-tokens#readme) for the attributes, naming, and a white-label example.
