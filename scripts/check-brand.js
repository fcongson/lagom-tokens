// Checks brands against the role contract.
//
//   node scripts/check-brand.js                 every brand in brands.config.js
//   node scripts/check-brand.js fern            one brand
//   node scripts/check-brand.js ./brand.css     a white label's CSS overrides
//
// For each brand and variant (light, dark, more, more-dark) it checks:
//   - completeness: every role in the contract resolves;
//   - both modes: a brand that overrides a role in light also does in dark,
//     and the other way round;
//   - contrast: every pair in packages/lagom-tokens/bin/check-brand.js, at
//     AA (normal) or AAA (more).
// CSS files are checked by the same code white labels run with
// `npx check-brand` (packages/lagom-tokens/bin/check-brand.js).
//
// Exits 1 if anything fails.

import fs from "node:fs";
import path from "node:path";
import { brands, variants, stack, resolve, TOKENS } from "./lib/tokens.js";
import { contract, contractRoles } from "./lib/contract.js";
import { checkPairs, checkCss } from "../packages/lagom-tokens/bin/check-brand.js";

const setKeys = (brandId, set) => {
  const file = path.join(TOKENS, brandId, `${set}.json`);
  if (!fs.existsSync(file)) return new Set();
  const keys = new Set();
  const walk = (node, trail) => {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith("$")) continue;
      if (v && typeof v === "object" && "$value" in v) keys.add([...trail, k].join("."));
      else if (v && typeof v === "object") walk(v, [...trail, k]);
    }
  };
  walk(JSON.parse(fs.readFileSync(file, "utf8")), []);
  return keys;
};

const checkTokenBrand = (brandId) => {
  const failures = [];
  const roles = contractRoles();
  for (const variant of variants) {
    const merged = stack(brandId, variant);
    for (const role of roles) {
      try {
        resolve(merged, role);
      } catch (error) {
        failures.push(`${brandId} ${variant.id}: ${role} doesn't resolve (${error.message})`);
      }
    }
    failures.push(
      ...checkPairs(`${brandId} ${variant.id}`, (role) => resolve(merged, `semantic.color.${role}`), variant),
    );
  }
  if (brandId !== "base") {
    const light = setKeys(brandId, "semantic");
    const dark = setKeys(brandId, "semantic-dark");
    for (const key of light) if (!dark.has(key)) failures.push(`${brandId}: ${key} is set in light but not dark`);
    for (const key of dark) if (!light.has(key)) failures.push(`${brandId}: ${key} is set in dark but not light`);
  }
  return failures;
};

const arg = process.argv[2];
const targets = arg ? [arg] : brands.map((b) => b.id);
let total = 0;
for (const target of targets) {
  const failures = target.endsWith(".css")
    ? checkCss(target, fs.readFileSync(target, "utf8"), contract())
    : checkTokenBrand(target);
  if (failures.length) {
    console.error(`✗ ${target}\n  ${failures.join("\n  ")}`);
    total += failures.length;
  } else {
    console.log(`✔ ${target}: complete, both modes, every pair passes (normal and more contrast)`);
  }
}
if (total) {
  console.error(`\n${total} problem(s).`);
  process.exit(1);
}
