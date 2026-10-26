#!/usr/bin/env node
// Rewrites lagom-tokens 1.x names and import paths to 2.0.0.
//
//   node scripts/migrate.js <file or folder>… [--palette fern|base] [--write]
//   node scripts/migrate.js --table            print MIGRATION.md's tables
//
// Without --write it only reports what it would change. It rewrites:
//   - renamed roles (fg-muted → fg-secondary, …), as CSS custom properties
//     (--lagom-semantic-color-fg-muted) and JS exports (lagomSemanticColorFgMuted);
//   - old palette names (--lagom-core-colors-olive-base) to tone stops, with
//     the brand's prefix: --fern-olive-45 (--palette fern, the default) or
//     --lagom-grey-55 (--palette base; Base has grey and navy only);
//   - import paths (css/theme/_light.css → css/lagom.css, …).
// It lists, without changing, everything that needs a person: removed
// tokens, dark-theme imports that are no longer needed, and palette colours
// Base doesn't have.
//
// The map is migration/2.0.0.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, "migration/2.0.0.json"), "utf8"));
const EXTENSIONS = new Set([".css", ".scss", ".less", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".vue", ".svelte", ".astro", ".html", ".md", ".mdx"]);
const SKIP = new Set(["node_modules", ".git", "dist", "build", ".next", ".nuxt", "coverage"]);

const camel = (kebab) => kebab.replace(/-([a-z0-9])/g, (_, ch) => ch.toUpperCase());
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

// ------------------------------------------------------------ the table

if (flag("--table")) {
  const rows = (pairs) => pairs.map(([a, b]) => `- \`--${a}\` → \`${b}\``).join("\n");
  console.log("### Renamed\n");
  console.log(rows(Object.entries(MAP.renamed).map(([a, b]) => [a, `--${b}`])));
  console.log("\n### Palette\n");
  console.log(
    rows(
      Object.entries(MAP.palette.names).map(([a, stop]) => [a, `--fern-${stop}`]),
    ),
  );
  console.log("\n### Removed\n");
  console.log(Object.entries(MAP.removed).map(([a, why]) => `- \`--${a}\`: ${why}`).join("\n"));
  console.log("\n### Files\n");
  console.log(
    Object.entries(MAP.files)
      .map(([a, b]) => `- \`${a}\` → ${b ? `\`${b}\`` : "remove (included in `css/lagom.css` / `js/dark`)"}`)
      .join("\n"),
  );
  process.exit(0);
}

// ------------------------------------------------------------ rewriting

const palette = option("--palette", "fern");
if (!["fern", "base"].includes(palette)) {
  console.error('--palette must be "fern" or "base"');
  process.exit(2);
}
const BASE_FAMILIES = new Set(["grey", "navy"]);
const prefix = palette === "fern" ? "fern" : "lagom";

// [old kebab name, new kebab name or null, note]
const names = [
  ...Object.entries(MAP.renamed).map(([a, b]) => [a, b]),
  ...Object.entries(MAP.palette.names).map(([a, stop]) => {
    const family = stop.split("-")[0];
    if (palette === "base" && !BASE_FAMILIES.has(family))
      return [a, null, `Base has no ${family}: pick a colour from Base's grey or navy, or migrate with --palette fern`];
    return [a, `${prefix}-${stop}`];
  }),
  ...Object.entries(MAP.removed).map(([a, why]) => [a, null, why]),
];

// Each old name is matched as a CSS custom property and as a JS export,
// only as a whole name. Longest first, so no name is a prefix of another.
const rules = names
  .sort((x, y) => y[0].length - x[0].length)
  .flatMap(([from, to, note]) => [
    { pattern: new RegExp(`--${escape(from)}(?![\\w-])`, "g"), to: to && `--${to}`, note, label: `--${from}` },
    { pattern: new RegExp(`(?<![\\w$])${escape(camel(from))}(?![\\w$])`, "g"), to: to && camel(to), note, label: camel(from) },
  ]);

const fileRules = Object.entries(MAP.files).map(([from, to]) => ({
  // Matches the path with or without .js, and keeps whatever followed it.
  pattern: new RegExp(`${escape(from)}(?![\\w./-])|${escape(from)}(?=\\.js)`, "g"),
  to,
  label: from,
}));

const walk = (target, out = []) => {
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) if (!SKIP.has(entry)) walk(path.join(target, entry), out);
  } else if (EXTENSIONS.has(path.extname(target))) {
    out.push(target);
  }
  return out;
};

const targets = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--palette");
if (!targets.length) {
  console.error("Usage: node scripts/migrate.js <file or folder>… [--palette fern|base] [--write]");
  process.exit(2);
}

const write = flag("--write");
let changed = 0;
let replacements = 0;
let usesFernPalette = false;
const todo = [];

for (const file of targets.flatMap((t) => walk(t))) {
  const original = fs.readFileSync(file, "utf8");
  let text = original;
  const lineOf = (index) => original.slice(0, index).split("\n").length;

  for (const rule of [...rules, ...fileRules]) {
    text = text.replace(rule.pattern, (match, ...rest) => {
      const offset = rest.at(-2);
      if (rule.to) {
        replacements += 1;
        if (rule.to.startsWith("--fern-") || rule.to.startsWith("fern")) usesFernPalette = true;
        return rule.to;
      }
      const note = rule.note ?? "Remove this import: dark mode is now part of css/lagom.css (and js/dark.js).";
      todo.push(`${file}:${typeof offset === "number" ? lineOf(offset) : "?"}  ${rule.label}: ${note}`);
      return match;
    });
  }

  if (text !== original) {
    changed += 1;
    console.log(`${write ? "Updated" : "Would update"} ${file}`);
    if (write) fs.writeFileSync(file, text);
  }
}

console.log(`\n${replacements} replacement(s) in ${changed} file(s)${write ? "" : " (dry run: add --write to apply)"}.`);
if (usesFernPalette) {
  console.log(
    "\nThese files now use Fern's palette (--fern-*, fern* exports). Install @fcongson/lagom-brands, load\n" +
      "@fcongson/lagom-brands/fern/css/fern.css after lagom.css, and set data-lagom-brand=\"fern\" on <html>.\n" +
      "JS palette exports come from @fcongson/lagom-brands/fern/js/<variant>.",
  );
}
if (todo.length) {
  console.log(`\nNeeds a person (${todo.length}):\n  ${todo.join("\n  ")}`);
}
