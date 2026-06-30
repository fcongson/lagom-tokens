import StyleDictionary from "style-dictionary";
import { register } from "@tokens-studio/sd-transforms";

register(StyleDictionary, { excludeParentKeys: true });

const VARIABLES = [
  { set: "core", destination: "core" },
  { set: "semantic", references: ["core"] },
  {
    set: "semantic.light",
    // selector: '[data-lagom-theme~="light"]', // use default :root selector
    references: ["core"],
  },
  {
    set: "semantic.dark",
    selector: '[data-lagom-theme~="dark"]',
    references: ["core"],
  },
  {
    set: "component",
    references: ["core", "semantic", "semantic.light", "semantic.dark"],
  },
];

const THEMES = [
  {
    set: "component",
    output: "light",
    // selector: '[data-lagom-theme~="light"]', // use default :root selector
    references: ["core", "semantic", "semantic.light"],
  },
  {
    set: "component",
    output: "dark",
    selector: '[data-lagom-theme~="dark"]',
    references: ["core", "semantic", "semantic.dark"],
  },
];

// Composite (object-value) token types whose sub-properties get assembled
// into a single CSS shorthand declaration (e.g. `typography` -> the CSS
// `font` shorthand). Most of these are fine as var()/calc() reference
// chains, same as any other token. The one case that isn't: a sub-value
// using exponent math (e.g. `{core.fontSizes.body}*(1.5^5)`), because CSS
// calc() has no exponent operator, so it can't be expressed live. Only
// flatten a composite token to a literal when one of its sub-values
// actually contains "^" - every other token (composite or not) keeps its
// var() reference so themes/overrides keep working.
const COMPOSITE_TYPES = ["typography", "shadow", "border"];

function hasExponentMath(value) {
  if (typeof value === "string") return value.includes("^");
  if (value && typeof value === "object") {
    return Object.values(value).some(hasExponentMath);
  }
  return false;
}

const outputReferences = (token) => {
  if (!COMPOSITE_TYPES.includes(token.original?.$type)) return true;
  return !hasExponentMath(token.original?.$value);
};

/**
 * Get common css config for style dictionary
 */

const getCssConfig = ({
  buildPathSubdirectory,
  destination,
  filter,
  fileHeader,
  selector,
}) => ({
  transforms: [
    "ts/descriptionToComment",
    "ts/resolveMath",
    "ts/opacity",
    "ts/size/lineheight",
    "ts/typography/fontWeight",
    "ts/color/modifiers",
    "ts/size/css/letterspacing",
    "ts/color/css/hexrgba",
    "typography/css/shorthand",
    "shadow/css/shorthand",
    "border/css/shorthand",
    "name/kebab",
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
 * Build token set variables
 */

for (const { set, selector, references } of VARIABLES) {
  const buildPathSubdirectory = "variables";
  const filter = (token) => token.isSource;
  const referenceNotice = references?.length
    ? ["", `References variables: ${references.join(", ")}`]
    : [];
  const fileHeader = (defaultMessage) => [
    ...defaultMessage,
    ...referenceNotice,
  ];
  const sd = new StyleDictionary({
    include: references?.map((set) => `tokens/${set}.js`),
    source: [`tokens/${set}.js`],
    preprocessors: ["tokens-studio"],
    platforms: {
      css: getCssConfig({
        buildPathSubdirectory,
        destination: set,
        filter,
        fileHeader,
        selector,
      }),
      js: getJsConfig({ buildPathSubdirectory, destination: set, filter }),
    },
  });
  await sd.cleanAllPlatforms();
  await sd.buildAllPlatforms();
}

/**
 * Build themes
 */

for (const { set, output, selector, references } of THEMES) {
  const buildPathSubdirectory = "theme";
  const sd = new StyleDictionary({
    include: references?.map((set) => `tokens/${set}.js`),
    source: [`tokens/${set}.js`],
    preprocessors: ["tokens-studio"],
    platforms: {
      css: getCssConfig({
        buildPathSubdirectory,
        destination: output,
        selector,
      }),
      js: getJsConfig({ buildPathSubdirectory, destination: output }),
    },
  });
  await sd.cleanAllPlatforms();
  await sd.buildAllPlatforms();
}
