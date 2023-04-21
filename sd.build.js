const StyleDictionary = require("style-dictionary");

const TOKEN_SETS = [
  { name: "core" },
  { name: "light", references: ["core"] },
  { name: "dark", references: ["core"] },
  { name: "theme", references: ["core", "light"] },
];

TOKEN_SETS.forEach(({ name, references }) =>
  StyleDictionary.extend({
    include: references?.map((set) => `tokens/${set}.js`),
    source: [`tokens/${name}.js`],
    platforms: {
      css: {
        transformGroup: "css",
        prefix: "sd",
        buildPath: "build/css/",
        files: [
          {
            destination: `_variables.${name}.css`,
            format: "css/variables",
            options: {
              outputReferences: true,
            },
          },
        ],
      },
      js: {
        transformGroup: "js",
        buildPath: "build/js/",
        files: [
          {
            destination: `variables.${name}.js`,
            format: "javascript/es6",
          },
        ],
      },
    },
  }).buildAllPlatforms()
);
