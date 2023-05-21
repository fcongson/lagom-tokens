const { registerTransforms } = require("@tokens-studio/sd-transforms");
const StyleDictionary = require("style-dictionary");

registerTransforms(StyleDictionary);

const VARIABLES = [
  { source: "core", destination: "core" },
  { source: "light", destination: "light", references: ["core"] },
  { source: "dark", destination: "dark", references: ["core"] },
];

const THEMES = [
  { source: "theme", destination: "light", references: ["core", "light"] },
  { source: "theme", destination: "dark", references: ["core", "dark"] },
];

/**
 * Get common css config for style dictionary
 */

const getCssConfig = (filePrefix, destination) => ({
  transforms: [
    "ts/descriptionToComment",
    "ts/resolveMath",
    "ts/size/px",
    "ts/opacity",
    "ts/size/lineheight",
    "ts/type/fontWeight",
    "ts/color/modifiers",
    "ts/size/css/letterspacing",
    "ts/color/css/hexrgba",
    "ts/typography/css/shorthand",
    "ts/shadow/css/shorthand",
    "ts/border/css/shorthand",
    "name/cti/kebab",
  ],
  prefix: "lagom",
  buildPath: "build/css/",
  files: [
    {
      destination: `_${filePrefix}.${destination}.css`,
      format: "css/variables",
    },
  ],
});

/**
 * Get common js config for style dictionary
 */

const getJsConfig = (filePrefix, destination) => ({
  transformGroup: "tokens-studio",
  prefix: "lagom",
  buildPath: "build/js/",
  files: [
    {
      destination: `${filePrefix}.${destination}.js`,
      format: "javascript/es6",
    },
  ],
});

/**
 * Build token set variables
 */

VARIABLES.forEach(({ source, destination, references }) => {
  const filePrefix = "variables";
  const sd = StyleDictionary.extend({
    include: references?.map((set) => `tokens/${set}.js`),
    source: [`tokens/${source}.js`],
    platforms: {
      css: getCssConfig(filePrefix, destination),
      js: getJsConfig(filePrefix, destination),
    },
  });
  sd.cleanAllPlatforms();
  sd.buildAllPlatforms();
});

/**
 * Build themes
 */

THEMES.forEach(({ source, destination, references }) => {
  const filePrefix = "theme";
  const sd = StyleDictionary.extend({
    include: references?.map((set) => `tokens/${set}.js`),
    source: [`tokens/${source}.js`],
    platforms: {
      css: getCssConfig(filePrefix, destination),
      js: getJsConfig(filePrefix, destination),
    },
  });
  sd.cleanAllPlatforms();
  sd.buildAllPlatforms();
});
