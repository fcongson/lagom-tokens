// Suggests increased-contrast (prefers-contrast: more) role values for a
// brand, from its own palette.
//
// For each mode it keeps the page backgrounds, then:
//   - moves each text, border, and focus role along its own colour family,
//     towards the mode's extreme (darker in light, lighter in dark), to the
//     nearest stop that reaches AAA: 7:1 for text, 4.5:1 for borders, button
//     fills, and the focus ring;
//   - for text on a fill (on-accent, primary button text), keeps the text
//     and moves the fill away from it, so the design doesn't flip;
//   - if no stop in a text role's family can pass on a band (bg-secondary,
//     accent-bg, selection), moves that band towards bg-default.
// Roles that point at another role (Base's button-primary-bg points at
// accent-default) follow it and aren't written.
//
// Usage: node scripts/suggest-more.js <brand> [--write]
// Review the result by eye before committing: it's a starting point.

import fs from "node:fs";
import path from "node:path";
import { TOKENS, stack, resolve, variants } from "./lib/tokens.js";
import { contrast } from "./ramps.js";

const [brandId, flag] = process.argv.slice(2);
if (!brandId) {
  console.error("Usage: node scripts/suggest-more.js <brand> [--write]");
  process.exit(1);
}

const TEXT = 7;
const NON_TEXT = 4.5;
const BANDS = ["bg.secondary", "bg.tertiary", "accent.bg", "selection.bg"];

// [role, backgrounds it must pass on, target]
const ON_PAGE = [
  ["fg.default", ["bg.default", ...BANDS], TEXT],
  ["fg.secondary", ["bg.default", "bg.secondary"], TEXT],
  ["fg.tertiary", ["bg.default"], TEXT],
  ["accent.fg", ["bg.default"], TEXT],
  ["button.secondary.fg", ["bg.default"], TEXT],
  ["border.default", ["bg.default"], NON_TEXT],
  ["focusRing", ["bg.default", "bg.secondary", "bg.tertiary", "accent.bg"], NON_TEXT],
];
// [text, fill]: the fill moves, the text stays.
// The third value says whether the fill must also stand out from the page
// (a button's edge must; an accent fill doesn't).
const ON_FILL = [
  ["accent.onAccent", "accent.default", false],
  ["button.primary.fg", "button.primary.bg", true],
];
const ROLES = [...new Set([...ON_PAGE.flatMap(([r, bgs]) => [r, ...bgs]), ...ON_FILL.flatMap(([t, f]) => [t, f])])];

const key = (role) => `semantic.color.${role}`;

const suggest = (mode) => {
  const variant = variants.find((v) => v.mode === mode && v.contrast === "normal");
  const merged = stack(brandId, variant);

  // Each role is either a palette stop, an alias of another role, or a literal.
  const state = new Map();
  for (const role of ROLES) {
    const value = merged.get(key(role))?.value;
    const m = typeof value === "string" && value.match(/^\{([^{}]+)\}$/);
    if (m && m[1].startsWith("palette@")) {
      const [ns, family, stop] = m[1].split(".");
      state.set(role, { kind: "stop", ns, family, stop: Number(stop), original: Number(stop) });
    } else if (m && m[1].startsWith("semantic.color.")) {
      state.set(role, { kind: "alias", of: m[1].slice("semantic.color.".length) });
    } else {
      state.set(role, { kind: "literal", hex: resolve(merged, key(role)) });
    }
  }
  const root = (role) => (state.get(role).kind === "alias" ? root(state.get(role).of) : role);
  const hexOf = (s) => merged.get(`${s.ns}.${s.family}.${s.stop}`)?.value;
  const value = (role) => {
    const s = state.get(root(role));
    return s.kind === "stop" ? hexOf(s) : s.hex;
  };
  const stops = (s) =>
    [...merged.keys()]
      .filter((k) => k.startsWith(`${s.ns}.${s.family}.`))
      .map((k) => Number(k.split(".").at(-1)))
      .sort((a, b) => a - b);
  const ok = (a, b, target) => !/^#/.test(b ?? "") || contrast(a, b) >= target;

  for (let pass = 0; pass < 4; pass += 1) {
    for (const [role, backgrounds, target] of ON_PAGE) {
      const s = state.get(root(role));
      if (s.kind !== "stop") continue;
      const passes = (stop) => backgrounds.every((bg) => ok(hexOf({ ...s, stop }), value(bg), target));
      if (passes(s.stop)) continue;
      const toward = stops(s).filter((st) => (mode === "light" ? st <= s.stop : st >= s.stop));
      const ordered = mode === "light" ? toward.reverse() : toward;
      const found = ordered.find(passes);
      if (found !== undefined) {
        s.stop = found;
        continue;
      }
      // Nothing in this family passes: pull the failing bands towards the page.
      const extreme = { ...s, stop: stops(s).at(mode === "light" ? 0 : -1) };
      for (const bg of backgrounds.filter((b) => BANDS.includes(b))) {
        const b = state.get(root(bg));
        if (b.kind !== "stop" || ok(hexOf(extreme), hexOf(b), target)) continue;
        const toward = stops(b).filter((st) => (mode === "light" ? st >= b.stop : st <= b.stop));
        const ordered = mode === "light" ? toward : toward.reverse();
        const fix = ordered.find((st) => ok(hexOf(extreme), hexOf({ ...b, stop: st }), target));
        if (fix !== undefined) b.stop = fix;
      }
    }
    for (const [text, fill, edge] of ON_FILL) {
      const f = state.get(root(fill));
      if (f.kind !== "stop" || ok(value(text), hexOf(f), TEXT)) continue;
      // Move the fill away from the text: darker under light text, lighter under dark.
      const textIsLight = contrast(value(text), "#000000") > contrast(value(text), "#ffffff");
      const toward = stops(f).filter((st) => (textIsLight ? st <= f.stop : st >= f.stop));
      const ordered = textIsLight ? toward.reverse() : toward;
      const found = ordered.find(
        (st) =>
          ok(value(text), hexOf({ ...f, stop: st }), TEXT) &&
          (!edge || ok(hexOf({ ...f, stop: st }), value("bg.default"), NON_TEXT)),
      );
      if (found !== undefined) f.stop = found;
    }
  }

  return new Map(
    [...state.entries()]
      .filter(([, s]) => s.kind === "stop" && s.stop !== s.original)
      .map(([role, s]) => [role, `${s.family}-${s.stop}`]),
  );
};

const toSet = (changes, extra) => {
  const color = {};
  for (const [role, ref] of changes) {
    const parts = role.split(".");
    let node = color;
    for (const part of parts.slice(0, -1)) node = node[part] ??= {};
    const [family, stop] = ref.split("-");
    node[parts.at(-1)] = { $value: `{palette.${family}.${stop}}`, $type: "color" };
  }
  return { semantic: { color, ...extra } };
};

const light = suggest("light");
const dark = suggest("dark");
console.log(`${brandId} more (light):`, Object.fromEntries(light));
console.log(`${brandId} more (dark):`, Object.fromEntries(dark));

if (flag === "--write") {
  const widths =
    brandId === "base"
      ? {
          border: { width: { $value: "2px", $type: "borderWidth" } },
          focusRing: { width: { $value: "3px", $type: "borderWidth" } },
        }
      : {};
  for (const [file, changes] of [
    ["semantic-more.json", light],
    ["semantic-more-dark.json", dark],
  ]) {
    fs.writeFileSync(path.join(TOKENS, brandId, file), `${JSON.stringify(toSet(changes, widths), null, 2)}\n`);
  }
  console.log(`Wrote tokens/${brandId}/semantic-more.json and semantic-more-dark.json`);
}
