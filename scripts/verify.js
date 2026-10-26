// Smoke-tests the build output in packages/.
//
// For Base and each brand it checks that:
//   - every expected file exists and isn't empty;
//   - no token reference ({…}) is left unresolved;
//   - math is only ever inside calc();
//   - every var() in the CSS names a property that Base or that brand
//     declares, and a brand never references another brand's palette;
//   - every JS module imports, and every export is a plain resolved value.
//
// Run after `yarn build`. Exits 1 if anything fails.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, brands, variants } from "./lib/tokens.js";

const JS = { default: "light", dark: "dark", more: "more", "more-dark": "more-dark" };
const failures = [];
const fail = (message) => failures.push(message);

const outDir = (brand) =>
  brand.id === "base"
    ? path.join(ROOT, "packages/lagom-tokens")
    : path.join(ROOT, "packages/lagom-brands", brand.id);

const read = (file) => {
  if (!fs.existsSync(file)) {
    fail(`${path.relative(ROOT, file)} is missing`);
    return "";
  }
  const text = fs.readFileSync(file, "utf8");
  if (!text.trim()) fail(`${path.relative(ROOT, file)} is empty`);
  return text;
};

const declared = (css) => new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const used = (css) => new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));

// Values with `*` outside a calc(). Strips comments first.
const rawMath = (css) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(";")
    .map((decl) => decl.split(":").slice(1).join(":").trim())
    .filter((value) => value.includes("*") && !/^calc\(/.test(value));

const base = brands.find((b) => b.id === "base");
const baseCss = read(path.join(outDir(base), "css/lagom.css"));
const baseNames = declared(baseCss);

const contractText = read(path.join(outDir(base), "contract.json"));
if (contractText) {
  const contract = JSON.parse(contractText);
  for (const name of Object.values(contract.roles))
    if (!baseNames.has(name)) fail(`contract.json lists ${name}, which lagom.css doesn't declare`);
  if (contract.variants.length !== variants.length) fail("contract.json is missing a variant");
}

for (const brand of brands) {
  const dir = outDir(brand);
  const name = brand.id === "base" ? "lagom" : brand.id;
  const label = (file) => path.relative(ROOT, path.join(dir, file));

  for (const file of [`css/${name}.css`, "css/palette.css"]) {
    const css = read(path.join(dir, file));
    if (/\{[a-z@][\w@.-]*\}/i.test(css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\s*\n/g, "")))
      fail(`${label(file)} has an unresolved token reference`);
    for (const value of rawMath(css)) fail(`${label(file)} has math outside calc(): ${value}`);
    const own = declared(css);
    for (const ref of used(css)) {
      if (!own.has(ref) && !baseNames.has(ref)) fail(`${label(file)} uses ${ref}, which nothing declares`);
      const other = brands.find((b) => b.id !== brand.id && b.id !== "base" && ref.startsWith(`--${b.prefix}-`));
      if (other) fail(`${label(file)} references ${other.name}'s palette (${ref})`);
    }
  }

  for (const variant of variants) {
    const file = path.join(dir, "js", `${JS[variant.id]}.js`);
    if (!read(file)) continue;
    const mod = await import(pathToFileURL(file).href);
    const entries = Object.entries(mod);
    if (!entries.length) fail(`${label(`js/${JS[variant.id]}.js`)} has no exports`);
    for (const [key, value] of entries) {
      if (typeof value !== "string" || /\{|var\(|\*/.test(value))
        fail(`${label(`js/${JS[variant.id]}.js`)}: ${key} isn't resolved (${JSON.stringify(value)})`);
    }
  }
}

if (failures.length) {
  console.error(`✗ build output\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✔ build output: ${brands.length} brands, CSS and JS present and resolved`);
