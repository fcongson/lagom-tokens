import tokens from "./tokens.studio.json" with { type: "json" };

// See tokens/core.js for why this re-wraps with the outer set-name key.
export default { component: tokens.component };
