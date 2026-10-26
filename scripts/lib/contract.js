// The role contract as data, for check-brand.
//
// roles: every token in Base's light semantic set (the contract), by path,
// with its CSS custom property name. variants: Base's fully resolved value
// for every CSS custom property, per variant. The build writes this to
// packages/lagom-tokens/contract.json so the published check-brand can run
// without the token sources.

import fs from "node:fs";
import path from "node:path";
import { TOKENS, stack, resolve, variants, cssName } from "./tokens.js";

export const contractRoles = () => {
  const data = JSON.parse(fs.readFileSync(path.join(TOKENS, "base", "semantic.json"), "utf8"));
  const roles = [];
  const walk = (node, trail) => {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith("$")) continue;
      if (v && typeof v === "object" && "$value" in v) roles.push([...trail, k].join("."));
      else if (v && typeof v === "object") walk(v, [...trail, k]);
    }
  };
  walk(data, []);
  return roles;
};

export const contract = () => ({
  roles: Object.fromEntries(contractRoles().map((role) => [role, cssName(role)])),
  variants: variants.map((variant) => {
    const merged = stack("base", variant);
    return {
      id: variant.id,
      mode: variant.mode,
      contrast: variant.contrast,
      values: Object.fromEntries([...merged.keys()].map((key) => [cssName(key), resolve(merged, key)])),
    };
  }),
});
