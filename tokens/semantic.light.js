import tokens from "./tokens.studio.json" with { type: "json" };

// See tokens/core.js for why this re-wraps with the outer set-name key.
// Note this deliberately keeps the inner "semantic" key (not "semantic-light")
// so light/dark/base semantic variables share the same generated CSS custom
// property name and only differ by selector - that's what lets component
// tokens reference the theme-agnostic `{semantic.color.*}` path.
export default { "semantic-light": tokens["semantic-light"] };
