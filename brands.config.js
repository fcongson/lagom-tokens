// Brands built from this repo.
//
// Every brand overrides Base. `prefix` names its palette variables
// (`--fern-olive-45`), and `package` says which published package it ships
// in. Token sources, including each palette's anchor colours, live in
// tokens/<id>/ (see scripts/ramps.js).

export const brands = [
  {
    id: "base",
    name: "Base",
    prefix: "lagom",
    package: "lagom-tokens",
  },
  {
    id: "fern",
    name: "Fern",
    prefix: "fern",
    package: "lagom-brands",
  },
  {
    id: "waypoint",
    name: "Waypoint",
    prefix: "waypoint",
    package: "lagom-brands",
  },
];

// The variants every brand can define, in cascade order. Each maps to one
// token set file per brand: tokens/<id>/<set>.json.
export const variants = [
  { id: "default", mode: "light", contrast: "normal", set: "semantic" },
  { id: "dark", mode: "dark", contrast: "normal", set: "semantic-dark" },
  { id: "more", mode: "light", contrast: "more", set: "semantic-more" },
  { id: "more-dark", mode: "dark", contrast: "more", set: "semantic-more-dark" },
];
