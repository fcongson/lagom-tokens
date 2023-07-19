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
  buildPathSubdirectory,
  destination,
  filter,
  fileHeader,
  outputReferences,
  selector,
}) => ({
  transforms: [
    "ts/descriptionToComment",
    // ...(outputReferences ? [] : ["ts/resolveMath"]),
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
  buildPath: `css/${buildPathSubdirectory}/`,
  files: [
    {
      destination: `_${destination}.css`,
      format: "css/variables",
      filter,
      options: {
        outputReferences,
        fileHeader,
        selector,
      },
    },
  ],
});

/**
 * Get common js config for style dictionary
 */

const getJsConfig = ({ buildPathSubdirectory, destination, filter }) => ({
  transformGroup: "tokens-studio",
  prefix: "lagom",
  buildPath: `js/${buildPathSubdirectory}/`,
  files: [
    {
      destination: `${destination}.js`,
      format: "javascript/es6",
      filter,
    },
  ],
});

/**
 * Get common json config for style dictionary
 */

const getJsonConfig = ({ buildPathSubdirectory, destination, filter }) => ({
  transformGroup: "tokens-studio",
  prefix: "lagom",
  buildPath: `json/${buildPathSubdirectory}/`,
  files: [
    {
      destination: `${destination}.json`,
      format: "json",
      filter,
    },
  ],
});

/**
 * Build token set variables
 */

VARIABLES.forEach(({ set, references }) => {
  const buildPathSubdirectory = "variables";
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
        buildPathSubdirectory,
        destination: set,
        filter,
        fileHeader,
        // outputReferences: true,
      }),
      js: getJsConfig({ buildPathSubdirectory, destination: set, filter }),
      // json: getJsonConfig({ buildPathSubdirectory, destination: set, filter }),
    },
  });
  sd.cleanAllPlatforms();
  sd.buildAllPlatforms();
});

/**
 * Build themes
 */

THEMES.forEach(({ set, output, references }) => {
  const buildPathSubdirectory = "theme";
  const sd = StyleDictionary.extend({
    include: references?.map((set) => `tokens/${set}.js`),
    source: [`tokens/${set}.js`],
    platforms: {
      css: getCssConfig({
        buildPathSubdirectory,
        destination: output,
        // outputReferences: true,
        selector: `[data-lagom-theme~="${output}"]`,
      }),
      js: getJsConfig({ buildPathSubdirectory, destination: output }),
    },
  });
  sd.cleanAllPlatforms();
  sd.buildAllPlatforms();
});
