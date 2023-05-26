const { registerTransforms } = require("@tokens-studio/sd-transforms");
const StyleDictionary = require("style-dictionary");

registerTransforms(StyleDictionary);

const VARIABLES = [
  { set: "core", destination: "core" },
  { set: "semantic", references: ["core"] },
  { set: "semantic.light", references: ["core"] },
  { set: "semantic.dark", references: ["core"] },
  {
    set: "component",
    references: ["core", "semantic", "semantic.light", "semantic.dark"],
  },
];

const THEMES = [
  {
    set: "component",
    output: "light",
    references: ["core", "semantic", "semantic.light"],
  },
  {
    set: "component",
    output: "dark",
    references: ["core", "semantic", "semantic.dark"],
  },
];

/**
 * Get common css config for style dictionary
 */

const getCssConfig = ({
  destinationPrefix,
  destination,
  filter,
  fileHeader,
  resolve,
}) => ({
  transforms: [
    "ts/descriptionToComment",
    ...(resolve ? ["ts/resolveMath"] : []),
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
      destination: `_${destinationPrefix}.${destination}.css`,
      format: "css/variables",
      filter,
      options: {
        outputReferences: resolve ? false : true,
        fileHeader,
      },
    },
  ],
});

/**
 * Get common js config for style dictionary
 */

const getJsConfig = ({ destinationPrefix, destination, filter }) => ({
  transformGroup: "tokens-studio",
  prefix: "lagom",
  buildPath: "build/js/",
  files: [
    {
      destination: `${destinationPrefix}.${destination}.js`,
      format: "javascript/es6",
      filter,
    },
  ],
});

/**
 * Build token set variables
 */

VARIABLES.forEach(({ set, references }) => {
  const destinationPrefix = "variables";
  const filter = (token) => token.isSource;
  const referenceNotice = references?.length
    ? ["", `References variables: ${references.join(", ")}`]
    : [];
  const fileHeader = (defaultMessage) => [
    ...defaultMessage,
    ...referenceNotice,
  ];
  const sd = StyleDictionary.extend({
    include: references?.map((set) => `tokens/${set}.js`),
    source: [`tokens/${set}.js`],
    platforms: {
      css: getCssConfig({
        destinationPrefix,
        destination: set,
        filter,
        fileHeader,
      }),
      js: getJsConfig({ destinationPrefix, destination: set, filter }),
    },
  });
  sd.cleanAllPlatforms();
  sd.buildAllPlatforms();
});

/**
 * Build themes
 */

THEMES.forEach(({ set, output, references }) => {
  const destinationPrefix = "theme";
  const sd = StyleDictionary.extend({
    include: references?.map((set) => `tokens/${set}.js`),
    source: [`tokens/${set}.js`],
    platforms: {
      css: getCssConfig({
        destinationPrefix,
        destination: output,
        resolve: true,
      }),
      js: getJsConfig({ destinationPrefix, destination: output }),
    },
  });
  sd.cleanAllPlatforms();
  sd.buildAllPlatforms();
});
