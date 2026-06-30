import tokens from "./tokens.studio.json" with { type: "json" };

// Re-wrap with the outer set-name key. tokens.core is already singly-wrapped
// (`{ core: { ... } }`) as Tokens Studio's single-file export format double
// names every set; @tokens-studio/sd-transforms' `excludeParentKeys`
// preprocessor expects to strip exactly one such wrapper per source file, so
// re-adding the outer key here keeps the "core" prefix in the build output.
export default { core: tokens.core };
