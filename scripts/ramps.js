// Tone-scale colour ramps.
//
// Every palette colour is named `family-tone`, where tone is its CIELAB
// lightness (L*): 0 is black, 100 is white. Because L* depends only on
// luminance, and WCAG contrast depends only on luminance, tone gaps predict
// contrast for every hue: 40 apart always passes 3:1, 55 apart always passes
// 4.5:1.
//
// A family is generated from a few anchor colours. At each stop, chroma and
// hue are interpolated between the anchors (chroma tapers to 0 towards black
// and white), then chroma is reduced until the colour fits in sRGB.
//
// Usage:
//   node scripts/ramps.js          regenerate tokens/<brand>/palette.json
//   node scripts/ramps.js --check  exit 1 if any palette.json is out of date
//
// Each family's anchors live in its brand's palette.json, under
// "$extensions": { "lagom.anchors": [...] } on the family group, so a
// brand's colours stay in the brand's own folder (and under its licence).
// To change a family, edit its anchors and run this script.

import fs from "node:fs";

export const STOPS = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 98,
];

// D65 reference white.
const WHITE = [0.95047, 1.0, 1.08883];
const EPSILON = 216 / 24389;
const KAPPA = 24389 / 27;

const toLinear = (channel) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (linear) => {
  const c =
    linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
  return c * 255;
};

export const hexToLab = (hex) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16)));
  const x = 0.4124 * r + 0.3576 * g + 0.1805 * b;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
  const f = (t) => (t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116);
  const [fx, fy, fz] = [f(x / WHITE[0]), f(y / WHITE[1]), f(z / WHITE[2])];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

const labToLinearRgb = (l, a, b) => {
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const inv = (t) => (t ** 3 > EPSILON ? t ** 3 : (116 * t - 16) / KAPPA);
  const [x, y, z] = [inv(fx) * WHITE[0], inv(fy) * WHITE[1], inv(fz) * WHITE[2]];
  return [
    3.2406 * x - 1.5372 * y - 0.4986 * z,
    -0.9689 * x + 1.8758 * y + 0.0415 * z,
    0.0557 * x - 0.204 * y + 1.057 * z,
  ];
};

const inGamut = (rgb) => rgb.every((c) => c >= -0.0005 && c <= 1.0005);

export const lchToHex = (l, chroma, hue) => {
  const cos = Math.cos((hue * Math.PI) / 180);
  const sin = Math.sin((hue * Math.PI) / 180);
  let c = chroma;
  if (!inGamut(labToLinearRgb(l, c * cos, c * sin))) {
    let lo = 0;
    let hi = chroma;
    for (let i = 0; i < 50; i += 1) {
      const mid = (lo + hi) / 2;
      if (inGamut(labToLinearRgb(l, mid * cos, mid * sin))) lo = mid;
      else hi = mid;
    }
    c = lo;
  }
  const rgb = labToLinearRgb(l, c * cos, c * sin);
  return `#${rgb
    .map((v) => Math.round(Math.min(255, Math.max(0, fromLinear(Math.max(0, v))))))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
};

const toLch = ([l, a, b]) => [
  l,
  Math.hypot(a, b),
  ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
];

// Linear interpolation between anchors; chroma tapers to 0 at L* 0 and 100.
const interpolateChroma = (points, l) => {
  const first = points[0];
  const last = points.at(-1);
  if (l <= first[0]) return first[0] > 0 ? first[1] * (l / first[0]) : first[1];
  if (l >= last[0]) return last[0] < 100 ? last[1] * ((100 - l) / (100 - last[0])) : last[1];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [la, va] = points[i];
    const [lb, vb] = points[i + 1];
    if (l >= la && l <= lb) return va + ((vb - va) * (l - la)) / (lb - la);
  }
  return last[1];
};

const interpolateHue = (points, l) => {
  const first = points[0];
  const last = points.at(-1);
  if (l <= first[0]) return first[1];
  if (l >= last[0]) return last[1];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [la, ha] = points[i];
    const [lb, hb] = points[i + 1];
    if (l >= la && l <= lb) {
      const delta = ((((hb - ha + 180) % 360) + 360) % 360) - 180;
      return (((ha + (delta * (l - la)) / (lb - la)) % 360) + 360) % 360;
    }
  }
  return last[1];
};

/**
 * Generate a ramp from anchor colours.
 * @param {string[]} anchors Hex colours that define the family's hue and chroma.
 * @returns {Record<number, string>} Tone stop → hex.
 */
export const generateRamp = (anchors) => {
  const lch = anchors.map((hex) => toLch(hexToLab(hex))).sort((p, q) => p[0] - q[0]);
  const chromaPoints = lch.map(([l, c]) => [l, c]);
  const huePoints = lch.filter(([, c]) => c > 2).map(([l, , h]) => [l, h]);
  const neutral = Math.max(...chromaPoints.map(([, c]) => c)) <= 1;
  return Object.fromEntries(
    STOPS.map((stop) => [
      stop,
      lchToHex(
        stop,
        neutral ? 0 : interpolateChroma(chromaPoints, stop),
        huePoints.length ? interpolateHue(huePoints, stop) : 0,
      ),
    ]),
  );
};

// Contrast helpers, shared with check-brand.
export const luminance = (hex) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a, b) => {
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Build a brand's palette token set from its families' anchors. Neutral
 * families (no chroma) also get stop 100, pure white.
 * @param {Record<string, string[]>} families Family name → anchor colours.
 */
export const ANCHORS = "lagom.anchors";

/** Family name → anchors, read from a palette.json's $extensions. */
export const anchorsOf = (set) =>
  Object.fromEntries(
    Object.entries(set.palette ?? {}).map(([family, group]) => {
      const anchors = group.$extensions?.[ANCHORS];
      if (!Array.isArray(anchors) || anchors.length === 0) {
        throw new Error(`palette.${family} has no "$extensions": { "${ANCHORS}": [...] }`);
      }
      return [family, anchors];
    }),
  );

export const paletteSet = (families) => ({
  palette: Object.fromEntries(
    Object.entries(families).map(([family, anchors]) => {
      const ramp = generateRamp(anchors);
      const neutral = anchors.every((hex) => toLch(hexToLab(hex))[1] <= 1);
      if (neutral) ramp[100] = "#ffffff";
      return [
        family,
        {
          $extensions: { [ANCHORS]: anchors },
          ...Object.fromEntries(
            Object.entries(ramp).map(([stop, hex]) => [stop, { $value: hex, $type: "color" }]),
          ),
        },
      ];
    }),
  ),
});

const isMain = import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  const { brands } = await import("../brands.config.js");
  const check = process.argv.includes("--check");
  let stale = 0;
  for (const brand of brands) {
    const file = new URL(`../tokens/${brand.id}/palette.json`, import.meta.url);
    const current = fs.readFileSync(file, "utf8");
    const families = anchorsOf(JSON.parse(current));
    const next = `${JSON.stringify(paletteSet(families), null, 2)}\n`;
    if (check) {
      if (current !== next) {
        console.error(`✗ tokens/${brand.id}/palette.json is out of date: run \`yarn ramps\`.`);
        stale += 1;
      } else {
        console.log(`✔ tokens/${brand.id}/palette.json matches its anchors`);
      }
    } else {
      fs.writeFileSync(file, next);
      console.log(`Wrote tokens/${brand.id}/palette.json (${Object.keys(families).join(", ")})`);
    }
  }
  if (stale) process.exit(1);
}
