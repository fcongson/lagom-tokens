// Lightweight build verification, run via `npm run verify` (and in CI).
// This is a smoke test, not a full snapshot diff: css/ and js/ are
// gitignored build output (generated at publish time), so there's no
// committed "known-good" copy to diff against here. This instead asserts
// that every expected output file got generated, is non-empty, and -
// crucially - contains no leftover unresolved token references or raw
// math expressions (the most likely failure mode after a token or
// transform-config change: a typo'd reference path, or a math expression
// that the css.calc.js step couldn't safely wrap in calc()).
import fs from "node:fs";
import path from "node:path";

const EXPECTED_FILES = [
  "css/variables/_core.css",
  "css/variables/_semantic.css",
  "css/variables/_semantic.light.css",
  "css/variables/_semantic.dark.css",
  "css/variables/_component.css",
  "css/theme/_light.css",
  "css/theme/_dark.css",
  "js/variables/core.js",
  "js/variables/semantic.js",
  "js/variables/semantic.light.js",
  "js/variables/semantic.dark.js",
  "js/variables/component.js",
  "js/theme/light.js",
  "js/theme/dark.js",
];

let failures = 0;

for (const file of EXPECTED_FILES) {
  if (!fs.existsSync(file)) {
    console.error(`✗ missing expected build output: ${file}`);
    failures += 1;
    continue;
  }

  const contents = fs.readFileSync(file, "utf8");

  if (contents.trim().length === 0) {
    console.error(`✗ ${file} is empty`);
    failures += 1;
    continue;
  }

  if (/\{[a-zA-Z0-9_.-]+\}/.test(contents)) {
    console.error(`✗ ${file} contains an unresolved token reference (literal {...} left in output)`);
    failures += 1;
    continue;
  }

  if (path.extname(file) === ".css") {
    // Outside of calc(), a raw "*" multiplication left in a declaration
    // VALUE is invalid CSS - css.calc.js should have wrapped it already.
    // Only look at the value between ":" and ";"/comment, so this doesn't
    // false-positive on "/** ... */" comment delimiters.
    const mathOutsideCalc = contents
      .split("\n")
      .filter((line) => /^\s*--[\w-]+:/.test(line))
      .filter((line) => {
        const value = line.split(":").slice(1).join(":").split("/**")[0];
        return value.includes("*") && !value.includes("calc(");
      });
    if (mathOutsideCalc.length > 0) {
      console.error(`✗ ${file} has raw math outside of calc():\n  ${mathOutsideCalc.join("\n  ")}`);
      failures += 1;
      continue;
    }
  }

  console.log(`✔ ${file}`);
}

if (failures > 0) {
  console.error(`\n${failures} problem(s) found in build output.`);
  process.exit(1);
}

console.log("\nBuild output looks good.");
