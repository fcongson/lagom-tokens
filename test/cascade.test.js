// Checks the built CSS in a real browser: that brand, mode, and contrast
// attributes combine as documented, on <html> or on a nested section, in
// either CSS load order, and with prefers-contrast: more.
//
// Run after `yarn build`: yarn test:cascade
// Needs Playwright's Chromium (`npx playwright install chromium` once).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { stack, resolve, variants, cssName } from "../scripts/lib/tokens.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILES = {
  base: "packages/lagom-tokens/css/lagom.css",
  fern: "packages/lagom-brands/fern/css/fern.css",
  waypoint: "packages/lagom-brands/waypoint/css/waypoint.css",
  acme: "examples/white-label.css",
};
const style = (ids) =>
  ids.map((id) => `<style>${fs.readFileSync(path.join(ROOT, FILES[id]), "utf8")}</style>`).join("");

// Expected values come from the token sources, so the test follows palette
// changes: [brand, variant id, token path].
const expect = (brand, variantId, token) =>
  resolve(stack(brand, variants.find((v) => v.id === variantId)), token);

const ROLE = (role) => `semantic.color.${role}`;
const BUTTON_BG = "component.Button.color.primary.background";

// [label, <html> attributes, <section> attributes, token, expected]
const cases = [
  ["Base light", "", "", ROLE("fg.default"), expect("base", "default", ROLE("fg.default"))],
  ["Base dark", 'data-lagom-theme="dark"', "", ROLE("fg.default"), expect("base", "dark", ROLE("fg.default"))],
  ["Fern light", 'data-lagom-brand="fern"', "", ROLE("fg.default"), expect("fern", "default", ROLE("fg.default"))],
  ["Fern dark", 'data-lagom-brand="fern" data-lagom-theme="dark"', "", ROLE("fg.default"), expect("fern", "dark", ROLE("fg.default"))],
  ["Fern page, dark section: text", 'data-lagom-brand="fern"', 'data-lagom-theme="dark"', ROLE("fg.default"), expect("fern", "dark", ROLE("fg.default"))],
  ["Fern page, dark section: button follows", 'data-lagom-brand="fern"', 'data-lagom-theme="dark"', BUTTON_BG, expect("fern", "dark", BUTTON_BG)],
  ["Base page, Waypoint section", "", 'data-lagom-brand="waypoint"', ROLE("fg.default"), expect("waypoint", "default", ROLE("fg.default"))],
  ["Dark page, Waypoint section", 'data-lagom-theme="dark"', 'data-lagom-brand="waypoint"', ROLE("fg.default"), expect("waypoint", "dark", ROLE("fg.default"))],
  ["Fern, more contrast", 'data-lagom-brand="fern" data-lagom-contrast="more"', "", ROLE("accent.default"), expect("fern", "more", ROLE("accent.default"))],
  ["Base, more contrast: button follows accent", 'data-lagom-contrast="more"', "", BUTTON_BG, expect("base", "more", BUTTON_BG)],
  ["Base, more contrast: border width", 'data-lagom-contrast="more"', "", "semantic.border.width", expect("base", "more", "semantic.border.width")],
  ["Fern dark page, more section", 'data-lagom-brand="fern" data-lagom-theme="dark"', 'data-lagom-contrast="more"', ROLE("button.primary.bg"), expect("fern", "more-dark", ROLE("button.primary.bg"))],
  ["Fern header font", 'data-lagom-brand="fern"', "", "component.PageHeader.typography", expect("fern", "default", "core.fontFamilies.heading")],
  ["Base header font", "", "", "component.PageHeader.typography", expect("base", "default", "core.fontFamilies.heading")],
];

// The example white label, by CSS custom property name.
const acme = [
  ["White label light", 'data-lagom-brand="acme"', "", "--lagom-semantic-color-accent-default", "#006a65"],
  ["White label dark section", 'data-lagom-brand="acme"', 'data-lagom-theme="dark"', "--lagom-semantic-color-accent-default", "#6db8b4"],
  ["White label, more contrast", 'data-lagom-brand="acme" data-lagom-contrast="more"', "", "--lagom-semantic-color-accent-default", "#0a5c58"],
  ["White label dark, more section", 'data-lagom-brand="acme" data-lagom-theme="dark"', 'data-lagom-contrast="more"', "--lagom-semantic-color-accent-default", "#87c4c0"],
  ["White label keeps Base's text", 'data-lagom-brand="acme"', "", "--lagom-semantic-color-fg-default", expect("base", "default", ROLE("fg.default"))],
];

const browser = await chromium.launch();
let failed = 0;
const report = (ok, label, got, expected) => {
  if (!ok) failed += 1;
  console.log(`${ok ? "✔" : "✗"} ${label}: ${got.slice(0, 60)}${ok ? "" : ` (expected ${expected})`}`);
};
const read = async (page, html, section, property, files) => {
  await page.setContent(
    `<!doctype html><html ${html}><head>${style(files)}</head><body><section ${section}><p id="t">x</p></section></body></html>`,
  );
  return page.evaluate(
    (name) => getComputedStyle(document.getElementById("t")).getPropertyValue(name).trim(),
    property,
  );
};

for (const order of [
  ["base", "fern", "waypoint"],
  ["waypoint", "fern", "base"],
]) {
  const page = await browser.newPage();
  for (const [label, html, section, token, expected] of cases) {
    const got = await read(page, html, section, cssName(token), order);
    // Typography resolves to a font shorthand; check it names the family.
    const ok = token.endsWith("typography")
      ? got.includes(expected.split(",")[0].replace(/"/g, ""))
      : got.toLowerCase() === expected.toLowerCase();
    report(ok, `[${order[0]} first] ${label}`, got, expected);
  }
  await page.close();
}

const page = await browser.newPage();
for (const [label, html, section, property, expected] of acme) {
  const got = await read(page, html, section, property, ["base", "acme"]);
  report(got.toLowerCase() === expected.toLowerCase(), label, got, expected);
}
await page.close();

// prefers-contrast: more, with no attribute.
const media = await browser.newPage();
await media.emulateMedia({ contrast: "more" });
for (const [label, html, files, expected] of [
  ["prefers-contrast, Fern", 'data-lagom-brand="fern"', ["base", "fern"], expect("fern", "more", ROLE("accent.default"))],
  ["prefers-contrast, Base dark", 'data-lagom-theme="dark"', ["base", "fern"], expect("base", "more-dark", ROLE("accent.default"))],
  ["prefers-contrast, Base light", "", ["base", "fern"], expect("base", "more", ROLE("accent.default"))],
  ["prefers-contrast, white label", 'data-lagom-brand="acme"', ["base", "acme"], "#0a5c58"],
]) {
  const got = await read(media, html, "", "--lagom-semantic-color-accent-default", files);
  report(got.toLowerCase() === expected.toLowerCase(), label, got, expected);
}
await browser.close();

if (failed) {
  console.error(`\n${failed} cascade check(s) failed.`);
  process.exit(1);
}
console.log("\nAll cascade checks pass.");
