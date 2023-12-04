const fs = require("fs");
const path = require("path");

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
