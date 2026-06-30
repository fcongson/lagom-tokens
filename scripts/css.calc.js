// Style Dictionary's css/variables format still doesn't wrap math
// expressions in calc() when outputReferences is on (a long-standing
// upstream limitation, unresolved as of Style Dictionary v5 - see
// https://github.com/style-dictionary/style-dictionary/issues/1055).
// This keeps token math expressed as live CSS custom property references
// (e.g. `--lagom-core-dimension-xs: var(--lagom-core-dimension-xxs) * var(--lagom-core-dimension-scale);`)
// instead of baking in a static value, by wrapping the raw expression in calc()
// after Style Dictionary writes the file.
import fs from "fs";
import path from "path";

// Function to wrap CSS custom properties with calc for multiplication
function wrapMultiplicationWithCalc(line) {
  return line.replace(
    /  (--[\w-]+:\s*)([^;]+)(;)/g,
    (match, property, value, semicolon) => {
      // Check if the value contains the multiplication symbol
      if (/\*/.test(value)) {
        return `  ${property}calc(${value})${semicolon}`;
      }
      return line; // If no multiplication symbol, return the original line
    },
  );
}

// Function to process a CSS file
function processCSSFile(filePath) {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n");

  const modifiedLines = lines.map((line) => {
    return wrapMultiplicationWithCalc(line);
  });

  const modifiedContent = modifiedLines.join("\n");

  fs.writeFileSync(filePath, modifiedContent, "utf-8");
  console.log(`Processed: ${filePath}`);
}

// Function to process all CSS files in a directory and its subdirectories
function processCSSFilesInDirectory(directoryPath) {
  const files = fs.readdirSync(directoryPath);

  files.forEach((file) => {
    const filePath = path.join(directoryPath, file);

    if (fs.statSync(filePath).isDirectory()) {
      // Recursively process subdirectories
      processCSSFilesInDirectory(filePath);
    } else if (path.extname(filePath) === ".css") {
      // Process CSS files
      processCSSFile(filePath);
    }
  });
}

// Specify the root directory containing your CSS files and subdirectories
const rootDirectory = "./css";

processCSSFilesInDirectory(rootDirectory);
