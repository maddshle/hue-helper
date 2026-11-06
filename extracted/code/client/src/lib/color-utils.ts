export type RGB = { r: number; g: number; b: number };
export type HSL = { h: number; s: number; l: number };
export type ColorCatalogEntry = { name: string; label: string; hex: string; rgb: RGB };
export type RawColorEntry = { name: string; hex: string };

const colorRows = `
aliceblue #f0f8ff
antiquewhite #faebd7
aqua #00ffff
aquamarine #7fffd4
azure #f0ffff
beige #f5f5dc
bisque #ffe4c4
black #000000
blanchedalmond #ffebcd
blue #0000ff
blueviolet #8a2be2
brown #a52a2a
burlywood #deb887
cadetblue #5f9ea0
chartreuse #7fff00
chocolate #d2691e
coral #ff7f50
cornflowerblue #6495ed
cornsilk #fff8dc
crimson #dc143c
cyan #00ffff
darkblue #00008b
darkcyan #008b8b
darkgoldenrod #b8860b
darkgray #a9a9a9
darkgreen #006400
darkgrey #a9a9a9
darkkhaki #bdb76b
darkmagenta #8b008b
darkolivegreen #556b2f
darkorange #ff8c00
darkorchid #9932cc
darkred #8b0000
darksalmon #e9967a
darkseagreen #8fbc8f
darkslateblue #483d8b
darkslategray #2f4f4f
darkslategrey #2f4f4f
darkturquoise #00ced1
darkviolet #9400d3
deeppink #ff1493
deepskyblue #00bfff
dimgray #696969
dimgrey #696969
dodgerblue #1e90ff
firebrick #b22222
floralwhite #fffaf0
forestgreen #228b22
fuchsia #ff00ff
gainsboro #dcdcdc
ghostwhite #f8f8ff
gold #ffd700
goldenrod #daa520
gray #808080
green #008000
greenyellow #adff2f
grey #808080
honeydew #f0fff0
hotpink #ff69b4
indianred #cd5c5c
indigo #4b0082
ivory #fffff0
khaki #f0e68c
lavender #e6e6fa
lavenderblush #fff0f5
lawngreen #7cfc00
lemonchiffon #fffacd
lightblue #add8e6
lightcoral #f08080
lightcyan #e0ffff
lightgoldenrodyellow #fafad2
lightgray #d3d3d3
lightgreen #90ee90
lightgrey #d3d3d3
lightpink #ffb6c1
lightsalmon #ffa07a
lightseagreen #20b2aa
lightskyblue #87cefa
lightslategray #778899
lightslategrey #778899
lightsteelblue #b0c4de
lightyellow #ffffe0
lime #00ff00
limegreen #32cd32
linen #faf0e6
magenta #ff00ff
maroon #800000
mediumaquamarine #66cdaa
mediumblue #0000cd
mediumorchid #ba55d3
mediumpurple #9370db
mediumseagreen #3cb371
mediumslateblue #7b68ee
mediumspringgreen #00fa9a
mediumturquoise #48d1cc
mediumvioletred #c71585
midnightblue #191970
mintcream #f5fffa
mistyrose #ffe4e1
moccasin #ffe4b5
navajowhite #ffdead
navy #000080
oldlace #fdf5e6
olive #808000
olivedrab #6b8e23
orange #ffa500
orangered #ff4500
orchid #da70d6
palegoldenrod #eee8aa
palegreen #98fb98
paleturquoise #afeeee
palevioletred #db7093
papayawhip #ffefd5
peachpuff #ffdab9
peru #cd853f
pink #ffc0cb
plum #dda0dd
powderblue #b0e0e6
purple #800080
rebeccapurple #663399
red #ff0000
rosybrown #bc8f8f
royalblue #4169e1
saddlebrown #8b4513
salmon #fa8072
sandybrown #f4a460
seagreen #2e8b57
seashell #fff5ee
sienna #a0522d
silver #c0c0c0
skyblue #87ceeb
slateblue #6a5acd
slategray #708090
slategrey #708090
snow #fffafa
springgreen #00ff7f
steelblue #4682b4
tan #d2b48c
teal #008080
thistle #d8bfd8
tomato #ff6347
turquoise #40e0d0
violet #ee82ee
wheat #f5deb3
white #ffffff
whitesmoke #f5f5f5
yellow #ffff00
yellowgreen #9acd32
`;

export const NAMED_COLORS: Record<string, string> = Object.fromEntries(
  colorRows.trim().split("\n").map((row) => {
    const [name, hex] = row.split(" ");
    return [name, hex.toUpperCase()];
  }),
);

const COLOR_WORDS = [
  "rebecca", "alice", "antique", "blanched", "almond", "cadet", "cornflower", "corn", "silk", "crimson", "dark", "deep", "dim", "dodger", "fire", "brick", "floral", "forest", "gainsboro", "ghost", "goldenrod", "golden", "green", "yellow", "honey", "hot", "indian", "indigo", "ivory", "lemon", "chiffon", "lavender", "blush", "lawn", "light", "medium", "midnight", "mint", "misty", "moccasin", "navajo", "old", "lace", "olive", "drab", "orange", "red", "orchid", "pale", "papaya", "whip", "peach", "puff", "peru", "powder", "blue", "purple", "rose", "royal", "saddle", "salmon", "sandy", "brown", "sea", "shell", "sienna", "silver", "sky", "slate", "snow", "spring", "steel", "tan", "teal", "thistle", "tomato", "turquoise", "violet", "wheat", "white", "smoke", "gray", "grey", "black", "aqua", "magenta", "maroon", "cyan", "lime", "fuchsia", "beige", "bisque", "coral", "khaki", "pink", "plum", "sienna", "silver", "violet", "wheat", "azure", "chartreuse", "chocolate", "gainsboro", "gold", "indianred", "linen", "olivedrab", "rebeccapurple", "rosybrown", "teal", "thistle", "whitesmoke",
].sort((a, b) => b.length - a.length);

export function normalizeColorName(name: string): string {
  return name.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]/gu, "");
}

export function buildColorCatalog(additional: readonly RawColorEntry[] = []): ColorCatalogEntry[] {
  const entries = new Map<string, ColorCatalogEntry>();
  const candidates = [
    ...Object.entries(NAMED_COLORS).map(([name, hex]) => ({ name, hex })),
    ...additional,
  ];
  for (const candidate of candidates) {
    const name = candidate.name.trim();
    const normalizedName = normalizeColorName(name);
    const rgb = hexToRgb(candidate.hex);
    if (!normalizedName || !rgb || entries.has(normalizedName)) continue;
    const label = /\s/.test(name) || /[A-Z]/.test(name.slice(1) || "")
      ? name
      : humanizeColorName(name.toLowerCase());
    entries.set(normalizedName, { name, label, hex: rgbToHex(rgb), rgb });
  }
  return [...entries.values()].sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));
}

export function buildColorNameLookup(catalog: readonly ColorCatalogEntry[]): Record<string, string> {
  return Object.fromEntries(catalog.map(({ name, hex }) => [normalizeColorName(name), hex]));
}

export const COLOR_CATALOG: ColorCatalogEntry[] = buildColorCatalog();

export function humanizeColorName(name: string): string {
  const memo = new Map<number, string | null>();
  const split = (index: number): string | null => {
    if (index === name.length) return "";
    if (memo.has(index)) return memo.get(index)!;
    for (const word of COLOR_WORDS) {
      if (name.startsWith(word, index)) {
        const rest = split(index + word.length);
        if (rest !== null) {
          const result = `${word}${rest ? ` ${rest}` : ""}`;
          memo.set(index, result);
          return result;
        }
      }
    }
    memo.set(index, null);
    return null;
  };
  const words = split(0) ?? name;
  return words.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function hexToRgb(value: string): RGB | null {
  const normalized = value.trim().replace(/^#/, "");
  if (!/^(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(normalized)) return null;
  const expanded = normalized.length === 3
    ? normalized.split("").map((part) => part + part).join("")
    : normalized.slice(0, 6);
  const number = Number.parseInt(expanded, 16);
  return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    switch (max) {
      case red: hue = ((green - blue) / delta) % 6; break;
      case green: hue = (blue - red) / delta + 2; break;
      default: hue = (red - green) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { h: Math.round(hue), s: Math.round(saturation * 100), l: Math.round(lightness * 100) };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const secondary = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const offset = lightness - chroma / 2;
  let values: [number, number, number];
  if (h < 60) values = [chroma, secondary, 0];
  else if (h < 120) values = [secondary, chroma, 0];
  else if (h < 180) values = [0, chroma, secondary];
  else if (h < 240) values = [0, secondary, chroma];
  else if (h < 300) values = [secondary, 0, chroma];
  else values = [chroma, 0, secondary];
  return { r: Math.round((values[0] + offset) * 255), g: Math.round((values[1] + offset) * 255), b: Math.round((values[2] + offset) * 255) };
}

function parseRgbComponent(value: string): number | null {
  const normalized = value.trim();
  const parsed = normalized.endsWith("%") ? Number.parseFloat(normalized) * 2.55 : Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 255 ? Math.round(parsed) : null;
}

export function parseColorInput(value: string, colorNames: Record<string, string> = NAMED_COLORS): RGB | null {
  const input = value.trim().toLowerCase();
  const hex = hexToRgb(input);
  if (hex) return hex;

  const rgbMatch = input.match(/^rgba?\((.*)\)$/);
  if (rgbMatch) {
    const parts = rgbMatch[1].replace(/\s*\/\s*[^,]+$/, "").split(/\s*,\s*|\s+/).filter(Boolean);
    if (parts.length >= 3) {
      const values = parts.slice(0, 3).map(parseRgbComponent);
      if (values.every((part): part is number => part !== null)) return { r: values[0], g: values[1], b: values[2] };
    }
  }

  const hslMatch = input.match(/^hsla?\((.*)\)$/);
  if (hslMatch) {
    const parts = hslMatch[1].replace(/\s*\/\s*[^,]+$/, "").split(/\s*,\s*|\s+/).filter(Boolean);
    if (parts.length >= 3) {
      const hueText = parts[0].replace(/deg$/, "");
      const hue = Number(hueText);
      const saturation = Number.parseFloat(parts[1]);
      const lightness = Number.parseFloat(parts[2]);
      if (Number.isFinite(hue) && parts[1].includes("%") && parts[2].includes("%") && saturation >= 0 && saturation <= 100 && lightness >= 0 && lightness <= 100) {
        return hslToRgb({ h: ((hue % 360) + 360) % 360, s: saturation, l: lightness });
      }
    }
  }

  const namedHex = colorNames[normalizeColorName(input)] ?? NAMED_COLORS[normalizeColorName(input)];
  return namedHex ? hexToRgb(namedHex) : null;
}

function colorDistance(a: RGB, b: RGB): number {
  const redMean = (a.r + b.r) / 2;
  const red = a.r - b.r;
  const green = a.g - b.g;
  const blue = a.b - b.b;
  return Math.sqrt((2 + redMean / 256) * red * red + 4 * green * green + (2 + (255 - redMean) / 256) * blue * blue);
}

export function findClosestNamedColors(rgb: RGB, count = 3, catalog: readonly ColorCatalogEntry[] = COLOR_CATALOG) {
  if (count <= 0) return [];
  const closest: Array<ColorCatalogEntry & { distance: number }> = [];
  for (const color of catalog) {
    const match = { ...color, distance: colorDistance(rgb, color.rgb) };
    let index = 0;
    while (index < closest.length && closest[index].distance <= match.distance) index += 1;
    if (index < count) {
      closest.splice(index, 0, match);
      if (closest.length > count) closest.pop();
    }
  }
  return closest;
}

export function colorTextColor(rgb: RGB): "#193128" | "#FFFFFF" {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const backgroundLuminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const darkInkLuminance = 0.0256;
  const darkContrast = (backgroundLuminance + 0.05) / (darkInkLuminance + 0.05);
  const whiteContrast = 1.05 / (backgroundLuminance + 0.05);
  return darkContrast >= whiteContrast ? "#193128" : "#FFFFFF";
}

export function describeColor(rgb: RGB, language: "id" | "en" = "en"): string {
  const { h, s, l } = rgbToHsl(rgb);
  const lightness = l < 22 ? "Deep" : l > 78 ? "Pale" : l < 42 ? "Rich" : l > 62 ? "Soft" : "Balanced";
  const saturation = s < 16 ? "neutral" : s < 38 ? "muted" : s > 76 ? "vivid" : "clear";
  const hue = s < 10 ? (l < 18 ? "black" : l > 90 ? "white" : "gray") : h < 16 || h >= 345 ? "red" : h < 42 ? "orange" : h < 68 ? "yellow" : h < 155 ? "green" : h < 195 ? "teal" : h < 252 ? "blue" : h < 292 ? "violet" : h < 330 ? "magenta" : "rose";
  if (language === "id") {
    const lightnessId: Record<string, string> = { Deep: "pekat", Pale: "pucat", Rich: "kuat", Soft: "lembut", Balanced: "seimbang" };
    const saturationId: Record<string, string> = { neutral: "netral", muted: "redup", vivid: "cerah", clear: "jernih" };
    const hueId: Record<string, string> = { black: "hitam", white: "putih", gray: "abu-abu", red: "merah", orange: "jingga", yellow: "kuning", green: "hijau", teal: "teal", blue: "biru", violet: "ungu", magenta: "magenta", rose: "mawar" };
    return `${hueId[hue]} ${saturationId[saturation]} ${lightnessId[lightness]}`;
  }
  return `${lightness} ${saturation} ${hue}`;
}

export function catalogGroup(rgb: RGB): "Warm" | "Cool" | "Neutral" {
  const { h, s } = rgbToHsl(rgb);
  if (s < 18) return "Neutral";
  return h < 62 || h >= 330 ? "Warm" : h >= 150 && h < 280 ? "Cool" : "Warm";
}
