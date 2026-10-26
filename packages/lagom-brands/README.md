# @fcongson/lagom-brands

Frank Congson's brands for Lagom: **Fern** (frankcongson.com, frankcongson.dev) and **Waypoint** (heythereeverywhere.com).

**Not licensed for reuse.** This package is public so Frank's own sites can install it. See [LICENSE](./LICENSE). To make your own brand, start from Base in [`@fcongson/lagom-tokens`](https://github.com/fcongson/lagom-tokens).

```css
@import "@fcongson/lagom-tokens/css/lagom.css";
@import "@fcongson/lagom-brands/fern/css/fern.css";
```

```html
<html data-lagom-brand="fern">
```

Each brand has `css/<brand>.css` (its overrides for every mode and contrast level), `css/palette.css` (its palette alone), and `js/{light,dark,more,more-dark}.js`.
