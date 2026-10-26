// Loading, merging, naming, and formatting tokens.
//
// Token sources are Tokens Studio multi-file sets in W3C DTCG format:
// tokens/<brand>/<set>.json. A brand's stack for one variant is Base's sets
// followed by the brand's own, later sets overriding earlier ones.
//
// Palettes are namespaced per brand: tokens/fern/palette.json's
// `palette.olive.45` becomes `palette@fern.olive.45` in the merged stack, and
// `{palette.…}` references in Fern's own sets point at Fern's palette. Base
// roles keep pointing at Base's palette, so an inherited role can never pick
// up another brand's colour.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brands, variants } from "../../brands.config.js";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const TOKENS = path.join(ROOT, "tokens");

export const brandById = (id) => {
  const brand = brands.find((b) => b.id === id);
  if (!brand) throw new Error(`Unknown brand "${id}"`);
  return brand;
};

const readSet = (brandId, set) => {
  const file = path.join(TOKENS, brandId, `${set}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
};

const isToken = (node) => node && typeof node === "object" && "$value" in node;

// Point `{palette.…}` references at the brand's own namespaced palette.
const namespaceRefs = (value, brandId) => {
  if (typeof value === "string") return value.replace(/\{palette\./g, `{palette@${brandId}.`);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, namespaceRefs(v, brandId)]));
  }
  return value;
};

const flatten = (node, trail, out, meta) => {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    const next = [...trail, key];
    if (isToken(child)) {
      out.set(next.join("."), {
        path: next,
        value: namespaceRefs(child.$value, meta.brand),
        type: child.$type,
        description: child.$description,
        ...meta,
      });
    } else if (child && typeof child === "object") {
      flatten(child, next, out, meta);
    }
  }
};

const loadInto = (map, brandId, set) => {
  const data = readSet(brandId, set);
  if (!data) return;
  if (set === "palette") {
    // Re-root the palette under its brand's namespace.
    flatten({ [`palette@${brandId}`]: data.palette }, [], map, { brand: brandId, set });
  } else {
    flatten(data, [], map, { brand: brandId, set });
  }
};

/** Semantic sets for a variant, in order: light first, then the variant's own. */
export const semanticSets = (variant) => {
  switch (variant.id) {
    case "default":
      return ["semantic"];
    case "dark":
      return ["semantic", "semantic-dark"];
    case "more":
      return ["semantic", "semantic-more"];
    case "more-dark":
      return ["semantic", "semantic-dark", "semantic-more-dark"];
    default:
      throw new Error(`Unknown variant ${variant.id}`);
  }
};

/**
 * The merged token map for a brand and variant: Base, then the brand.
 * @returns {Map<string, object>} dotted path → token
 */
export const stack = (brandId, variant) => {
  const map = new Map();
  const layers = brandId === "base" ? ["base"] : ["base", brandId];
  for (const layer of layers) {
    for (const set of ["palette", "core", ...semanticSets(variant), "component"]) {
      loadInto(map, layer, set);
    }
  }
  return map;
};

/** Tokens a brand's own sets define for a variant (no Base). */
export const ownTokens = (brandId, variant) => {
  const map = new Map();
  for (const set of ["palette", "core", ...semanticSets(variant), "component"]) {
    loadInto(map, brandId, set);
  }
  return map;
};

// ------------------------------------------------------------------ naming

const kebab = (segment) =>
  segment
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

/** CSS custom property name for a dotted token path. */
export const cssName = (dotted) => {
  const [head, ...rest] = dotted.split(".");
  if (head.startsWith("palette@")) {
    const brand = brandById(head.slice("palette@".length));
    return `--${brand.prefix}-${rest.map(kebab).join("-")}`;
  }
  return `--lagom-${[head, ...rest].map(kebab).join("-")}`;
};

/** JS export name for a dotted token path. */
export const jsName = (dotted) =>
  cssName(dotted)
    .slice(2)
    .replace(/-([a-z0-9])/g, (_, ch) => ch.toUpperCase());

// --------------------------------------------------------------- formatting

const REF = /\{([^{}]+)\}/g;

export const hasReference = (value) =>
  typeof value === "string"
    ? /\{[^{}]+\}/.test(value)
    : value && typeof value === "object"
      ? Object.values(value).some(hasReference)
      : false;

const percentToNumber = (value) =>
  typeof value === "string" && value.trim().endsWith("%")
    ? `${parseFloat(value) / 100}`
    : value;

const percentToEm = (value) => {
  if (typeof value !== "string" || !value.trim().endsWith("%")) return value;
  const n = parseFloat(value) / 100;
  return n === 0 ? "0" : `${n}em`;
};

// Literal values by type, before references are substituted.
const literal = (value, type) => {
  if (hasReference(value)) return value;
  switch (type) {
    case "opacity":
    case "lineHeights":
      return percentToNumber(value);
    case "letterSpacing":
      return percentToEm(value);
    default:
      return value;
  }
};

const cssExpression = (value, type) => {
  const v = literal(value, type);
  const replaced = String(v).replace(REF, (_, ref) => `var(${cssName(ref)})`);
  return /\*/.test(replaced) ? `calc(${replaced})` : replaced;
};

/** The CSS value for a token, keeping references as var(). */
export const cssValue = (token) => {
  if (token.type === "typography" && typeof token.value === "object") {
    const { fontWeight, fontSize, lineHeight, fontFamily } = token.value;
    return [
      cssExpression(fontWeight, "fontWeights"),
      `${cssExpression(fontSize, "fontSizes")}/${cssExpression(lineHeight, "lineHeights")}`,
      cssExpression(fontFamily, "fontFamilies"),
    ].join(" ");
  }
  return cssExpression(token.value, token.type);
};

// ---------------------------------------------------------------- resolving

const evaluate = (expression) => {
  // Multiply-only math on numbers with at most one unit, e.g. "1px * 2 * 2".
  if (!/\*/.test(expression)) return expression;
  const parts = expression.split("*").map((p) => p.trim());
  let unit = "";
  let product = 1;
  for (const part of parts) {
    const match = part.match(/^(-?[\d.]+)([a-z%]*)$/);
    if (!match) return expression;
    product *= parseFloat(match[1]);
    if (match[2]) unit = match[2];
  }
  return `${Math.round(product * 1000) / 1000}${unit}`;
};

/** Resolve a token to a final literal value within a merged map. */
export const resolve = (map, dotted, seen = new Set()) => {
  if (seen.has(dotted)) throw new Error(`Circular reference at ${dotted}`);
  const token = map.get(dotted);
  if (!token) throw new Error(`Unresolved reference {${dotted}}`);
  const next = new Set(seen).add(dotted);
  const sub = (value, type) => {
    const v = literal(value, type);
    if (typeof v !== "string") return v;
    const replaced = v.replace(REF, (_, ref) => resolve(map, ref, next));
    return evaluate(replaced);
  };
  if (token.type === "typography" && typeof token.value === "object") {
    const { fontWeight, fontSize, lineHeight, fontFamily } = token.value;
    return `${sub(fontWeight, "fontWeights")} ${sub(fontSize, "fontSizes")}/${sub(
      lineHeight,
      "lineHeights",
    )} ${sub(fontFamily, "fontFamilies")}`;
  }
  return sub(token.value, token.type);
};

export { brands, variants };
