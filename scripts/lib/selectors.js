// Selectors for each brand × mode × contrast block.
//
// Three attributes choose what an element shows:
//   data-lagom-brand="fern"      (no attribute: Base)
//   data-lagom-theme="dark"      (no attribute: light)
//   data-lagom-contrast="more"   (or the prefers-contrast: more media query)
//
// Each can sit on <html> or on any element inside it, so a section can switch
// brand, mode, or contrast. Custom properties that reference other custom
// properties are resolved where they're declared, so a block must match every
// element that carries at least one of its attributes, with the rest coming
// from ancestors.
//
// Specificity does the layering, so CSS order doesn't matter between files:
//   Base blocks are wrapped in :where() (0,0,0), so any brand outranks Base.
//   A brand block has one attribute per axis it needs: light (0,1,0),
//   dark or more (0,2,0), more + dark (0,3,0).

const attr = {
  dark: '[data-lagom-theme~="dark"]',
  more: '[data-lagom-contrast~="more"]',
  brand: (id) => `[data-lagom-brand~="${id}"]`,
};

// Every way to place a set of attributes on an element and its ancestors,
// with at least one on the element itself.
const placements = (attributes) => {
  const results = new Set();
  const n = attributes.length;
  for (let mask = 1; mask < 1 << n; mask += 1) {
    const own = attributes.filter((_, i) => mask & (1 << i));
    const inherited = attributes.filter((_, i) => !(mask & (1 << i)));
    const element = own.join("");
    if (inherited.length === 0) {
      results.add(element);
      continue;
    }
    // All inherited attributes on one ancestor…
    results.add(`${inherited.join("")} ${element}`);
    // …or on separate ancestors, in either nesting order.
    if (inherited.length === 2) {
      results.add(`${inherited[0]} ${inherited[1]} ${element}`);
      results.add(`${inherited[1]} ${inherited[0]} ${element}`);
    }
  }
  return [...results];
};

const axes = (variant) => [
  ...(variant.mode === "dark" ? [attr.dark] : []),
  ...(variant.contrast === "more" ? [attr.more] : []),
];

/**
 * Selector list for a block. `media` blocks (prefers-contrast) use the same
 * selectors as normal contrast, wrapped in the media query by the caller.
 */
export const selectorsFor = (brandId, variant, { media = false } = {}) => {
  const required = media ? axes({ ...variant, contrast: "normal" }) : axes(variant);
  if (brandId === "base") {
    if (required.length === 0) return [":where(:root)"];
    return placements(required).map((s) => `:where(${s})`);
  }
  return placements([attr.brand(brandId), ...required]).filter((s) =>
    // The brand attribute must be on the element or an ancestor; when the
    // element carries only Base axes, the brand must be inherited.
    s.includes(attr.brand(brandId)),
  );
};

export const MEDIA_MORE = "@media (prefers-contrast: more)";
