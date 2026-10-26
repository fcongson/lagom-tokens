#!/usr/bin/env node
// Checks a white label's CSS against Lagom's role contract.
//
//   npx check-brand brand.css [more.css …]
//
// Your CSS overrides Base (css/lagom.css). This reads it, works out every
// role's value in each variant (light, dark, increased contrast light and
// dark), and checks:
//   - both modes: a role you set for light you also set for dark, and the
//     other way round;
//   - increased contrast: what you set for data-lagom-contrast="more" you
//     also set inside @media (prefers-contrast: more), and the other way
//     round;
//   - completeness: every role still resolves;
//   - contrast: every pair below, at AA normally and AAA (7:1 text, 4.5:1
//     non-text) with increased contrast.
//
// Blocks are classified by selector: data-lagom-theme="dark" makes a block
// dark, and data-lagom-contrast="more" or @media (prefers-contrast: more)
// makes it increased contrast. var() is resolved against your own
// declarations, then Base's. Values must end up as 6-digit hex to be
// checked for contrast.
//
// Exits 1 if anything fails.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// [foreground role, background role, normal minimum, increased-contrast minimum, note]
export const PAIRS = [
  ["fg.default", "bg.default", 4.5, 7],
  ["fg.default", "bg.secondary", 4.5, 7],
  ["fg.default", "bg.tertiary", 4.5, 7],
  ["fg.default", "accent.bg", 4.5, 7],
  ["fg.default", "selection.bg", 4.5, 7],
  ["fg.secondary", "bg.default", 4.5, 7],
  ["fg.secondary", "bg.secondary", 4.5, 7],
  ["fg.tertiary", "bg.default", 4.5, 7],
  ["accent.fg", "bg.default", 4.5, 7],
  ["accent.onAccent", "accent.default", 4.5, 7],
  ["button.primary.fg", "button.primary.bg", 4.5, 7],
  ["button.secondary.fg", "bg.default", 4.5, 7],
  ["button.primary.bg", "bg.default", 3, 4.5],
  ["border.default", "bg.default", 3, 4.5],
  ["focusRing", "bg.default", 3, 4.5],
  ["focusRing", "bg.secondary", 3, 4.5],
  ["focusRing", "bg.tertiary", 3, 4.5],
  ["focusRing", "accent.bg", 3, 4.5],
  ["fg.default", "bg.default", 9, 9, "image focus ring"],
];

const HEX = /^#[0-9a-f]{6}$/i;

const toLinear = (channel) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Contrast failures for one variant.
 * @param {string} label Prefix for messages.
 * @param {(role: string) => string | undefined} valueOf A role's final value.
 * @param {{ contrast: string }} variant
 */
export const checkPairs = (label, valueOf, variant) => {
  const failures = [];
  for (const [fg, bg, normal, more, note] of PAIRS) {
    const min = variant.contrast === "more" ? more : normal;
    const a = valueOf(fg);
    const b = valueOf(bg);
    if (!HEX.test(a ?? "") || !HEX.test(b ?? "")) continue;
    const ratio = contrast(a, b);
    if (ratio < min) {
      failures.push(`${label}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1${note ? ` (${note})` : ""}`);
    }
  }
  return failures;
};

/** Custom-property blocks in a stylesheet, classified by mode and contrast. */
export const parseCss = (css) => {
  const blocks = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const media = /@media[^{]*prefers-contrast:\s*more[^{]*\{([\s\S]*?\})\s*\}/g;
  const collect = (text, inMedia) => {
    for (const [, selector, body] of text.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
      const decls = new Map();
      for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) decls.set(name, value.trim());
      blocks.push({
        dark: /data-lagom-theme~?="dark"/.test(selector),
        more: inMedia || /data-lagom-contrast~?="more"/.test(selector),
        inMedia,
        decls,
      });
    }
  };
  collect(clean.replace(media, ""), false);
  for (const [, inner] of clean.matchAll(media)) collect(inner, true);
  return blocks;
};

const ROLE_PREFIX = "--lagom-semantic-color-";

/**
 * Checks white-label CSS against the contract.
 * @param {string} label Name for messages (usually the file).
 * @param {string} css The white label's CSS.
 * @param {{ roles: Record<string, string>, variants: Array<{ id: string, mode: string, contrast: string, values: Record<string, string> }> }} contract
 *   roles: token path (semantic.color.fg.default) → CSS name; variants: Base's resolved values by CSS name.
 */
export const checkCss = (label, css, contract) => {
  const failures = [];
  const blocks = parseCss(css);
  const names = (filter) => new Set(blocks.filter(filter).flatMap((b) => [...b.decls.keys()]));

  const light = names((b) => !b.dark && !b.more);
  const dark = names((b) => b.dark && !b.more);
  for (const name of light)
    if (name.startsWith(ROLE_PREFIX) && !dark.has(name)) failures.push(`${label}: ${name} is set in light but not dark`);
  for (const name of dark)
    if (name.startsWith(ROLE_PREFIX) && !light.has(name)) failures.push(`${label}: ${name} is set in dark but not light`);

  for (const isDark of [false, true]) {
    const mode = isDark ? "dark" : "light";
    const attr = names((b) => b.more && b.dark === isDark && !b.inMedia);
    const media = names((b) => b.more && b.dark === isDark && b.inMedia);
    for (const name of attr)
      if (!media.has(name))
        failures.push(`${label}: ${name} is set for data-lagom-contrast="more" (${mode}) but not in @media (prefers-contrast: more)`);
    for (const name of media)
      if (!attr.has(name))
        failures.push(`${label}: ${name} is set in @media (prefers-contrast: more) (${mode}) but not for data-lagom-contrast="more"`);
  }

  for (const variant of contract.variants) {
    const applies = (b) => (!b.dark || variant.mode === "dark") && (!b.more || variant.contrast === "more");
    // Light, then dark or more, then both: more specific blocks win.
    const ordered = blocks
      .filter(applies)
      .sort((x, y) => Number(x.dark) + Number(x.more) - (Number(y.dark) + Number(y.more)));
    const declared = new Map();
    for (const b of ordered) for (const [n, v] of b.decls) declared.set(n, v);
    const read = (name, seen = new Set()) => {
      if (seen.has(name)) return undefined;
      const raw = declared.get(name);
      if (raw === undefined) return variant.values[name];
      return raw.replace(/var\((--[\w-]+)(?:,[^)]*)?\)/g, (_, ref) => read(ref, new Set(seen).add(name)) ?? "");
    };
    for (const [role, name] of Object.entries(contract.roles)) {
      if (!read(name)) failures.push(`${label} ${variant.id}: ${role} doesn't resolve`);
    }
    failures.push(
      ...checkPairs(`${label} ${variant.id}`, (role) => read(contract.roles[`semantic.color.${role}`]), variant),
    );
  }
  return failures;
};

const isMain = process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("Usage: check-brand <brand.css> [more.css …]");
    process.exit(2);
  }
  const contractFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "contract.json");
  const contract = JSON.parse(fs.readFileSync(contractFile, "utf8"));
  const css = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const label = files.join(" + ");
  const failures = checkCss(label, css, contract);
  if (failures.length) {
    console.error(`✗ ${label}\n  ${failures.join("\n  ")}\n\n${failures.length} problem(s).`);
    process.exit(1);
  }
  console.log(`✔ ${label}: complete, both modes, every pair passes (normal and more contrast)`);
}
