# Tokens

## `tokens.studio.json`

[Tokens Studio for Figma](https://tokens.studio/) interacts with `tokens.studio.json`. Tokens Studio reads from and writes to a single json file. This single file is then separated into its various layers (described below).

## `[layer].js`

Each `[layer].js` file uses a single token set defined in `tokens.studio.json`. In the following example, the `core` token set is used from `tokens.studio.json` to create `core.js`

```
// core.js

const { core } = require("./tokens.studio.json");
module.exports = core;
```

## [Style Dictionary](https://amzn.github.io/style-dictionary/#/)

[Style Dictionary](https://amzn.github.io/style-dictionary/#/) then uses the individual token sets to build the css custom properties (css variables) that will be used in [Lagom UI](https://lagom-ui.netlify.app/).
