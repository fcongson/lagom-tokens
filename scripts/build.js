// Builds both packages from tokens/.
//
//   packages/lagom-tokens/css/lagom.css     Base: every block, scoped (see lib/selectors.js)
//   packages/lagom-tokens/css/palette.css   Base palette only, on :root
//   packages/lagom-tokens/js/<variant>.js   Base, fully resolved
//   packages/lagom-tokens/contract.json     the role contract, for bin/check-brand.js
//   packages/lagom-brands/<brand>/css/<brand>.css
//   packages/lagom-brands/<brand>/css/palette.css
//   packages/lagom-brands/<brand>/js/<variant>.js
//
// Variants: light, dark, more (increased contrast), more-dark.

import fs from "node:fs";
import path from "node:path";
import {
  ROOT,
  brands,
  variants,
  stack,
  ownTokens,
  cssName,
  cssValue,
  jsName,
  hasReference,
  resolve,
  semanticSets,
} from "./lib/tokens.js";
import { selectorsFor, MEDIA_MORE } from "./lib/selectors.js";
import { contract } from "./lib/contract.js";

const HEADER = "/**\n * Do not edit directly: generated from tokens/ by scripts/build.js.\n */\n";
const JS_NAMES = { default: "light", dark: "dark", more: "more", "more-dark": "more-dark" };

const isPalette = (key) => key.startsWith("palette@");

const declarations = (tokens) =>
  tokens
    .map(([, token]) => {
      const description = token.description ? ` /* ${token.description.replace(/\*\//g, "")} */` : "";
      return `  ${cssName(token.path.join("."))}: ${cssValue(token)};${description}`;
    })
    .join("\n");

const block = (selectors, tokens, indent = "") => {
  const body = declarations(tokens)
    .split("\n")
    .map((line) => indent + line)
    .join("\n");
  return `${indent}${selectors.join(`,\n${indent}`)} {\n${body}\n${indent}}\n`;
};

const references = (value) =>
  typeof value === "string"
    ? [...value.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1])
    : value && typeof value === "object"
      ? Object.values(value).flatMap(references)
      : [];

/** Keys in `merged` whose reference chain reaches any key in `seeds`. */
const dependents = (merged, seeds) => {
  const memo = new Map();
  const reaches = (key, seen = new Set()) => {
    if (seeds.has(key)) return true;
    if (memo.has(key)) return memo.get(key);
    if (seen.has(key)) return false;
    seen.add(key);
    const token = merged.get(key);
    const result = token ? references(token.value).some((ref) => reaches(ref, seen)) : false;
    memo.set(key, result);
    return result;
  };
  return new Set([...merged.keys()].filter((key) => reaches(key)));
};

/**
 * Which tokens a block declares: the tokens this scope changes, plus every
 * token that references one of them (custom properties resolve where they're
 * declared, so those must be redeclared to pick up the change).
 */
const blockTokens = (brandId, variant) => {
  const merged = stack(brandId, variant);
  if (brandId === "base" && variant.id === "default") {
    return [...merged.entries()].filter(([key, t]) => !isPalette(key) || t.brand === "base");
  }
  const variantSets = new Set(semanticSets(variant).filter((s) => s !== "semantic"));
  const changed =
    brandId === "base"
      ? new Set([...merged.entries()].filter(([, t]) => variantSets.has(t.set)).map(([k]) => k))
      : new Set(
          [...ownTokens(brandId, variant).keys()].filter(
            (key) => !isPalette(key) || variant.id === "default",
          ),
        );
  const affected = dependents(merged, changed);
  return [...merged.entries()].filter(([key]) => affected.has(key));
};

const cssFile = (brandId) => {
  const parts = [HEADER];
  for (const variant of variants) {
    parts.push(block(selectorsFor(brandId, variant), blockTokens(brandId, variant)));
  }
  // prefers-contrast: more, for anyone who hasn't set data-lagom-contrast.
  const media = variants
    .filter((v) => v.contrast === "more")
    .map((v) => block(selectorsFor(brandId, v, { media: true }), blockTokens(brandId, v), "  "));
  parts.push(`${MEDIA_MORE} {\n${media.join("\n")}}\n`);
  return parts.join("\n");
};

const paletteFile = (brandId) => {
  const merged = stack(brandId, variants[0]);
  const tokens = [...merged.entries()].filter(([key, t]) => isPalette(key) && t.brand === brandId);
  return `${HEADER}\n${block([":root"], tokens)}`;
};

const jsFile = (brandId, variant) => {
  const merged = stack(brandId, variant);
  const lines = [...merged.keys()]
    .filter((key) => !isPalette(key) || merged.get(key).brand === brandId)
    .map((key) => `export const ${jsName(key)} = ${JSON.stringify(resolve(merged, key))};`);
  return `${HEADER}\n${lines.join("\n")}\n`;
};

const write = (file, contents) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
  console.log(`Wrote ${path.relative(ROOT, file)}`);
};

for (const brand of brands) {
  const out =
    brand.id === "base"
      ? path.join(ROOT, "packages/lagom-tokens")
      : path.join(ROOT, "packages/lagom-brands", brand.id);
  for (const dir of ["css", "js"]) fs.rmSync(path.join(out, dir), { recursive: true, force: true });
  const name = brand.id === "base" ? "lagom" : brand.id;
  write(path.join(out, "css", `${name}.css`), cssFile(brand.id));
  write(path.join(out, "css", "palette.css"), paletteFile(brand.id));
  for (const variant of variants) {
    write(path.join(out, "js", `${JS_NAMES[variant.id]}.js`), jsFile(brand.id, variant));
  }
}

write(path.join(ROOT, "packages/lagom-tokens/contract.json"), `${JSON.stringify(contract(), null, 2)}\n`);
