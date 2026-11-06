export type PaletteColor = { hex: string; name: string };

export function serializePalette(colors: PaletteColor[], translateName: (name: string) => string): string {
  return colors.map(({ hex, name }) => `${translateName(name)} — ${hex.toUpperCase()}`).join("\n");
}

export async function createPalettePng(colors: PaletteColor[], title: string, subtitle: string, translateName: (name: string) => string): Promise<Blob> {
  if (!colors.length) throw new Error("Cannot export an empty palette");

  const columns = 4;
  const margin = 48;
  const gap = 18;
  const cardWidth = 264;
  const cardHeight = 112;
  const rows = Math.ceil(colors.length / columns);
  const canvas = document.createElement("canvas");
  canvas.width = margin * 2 + columns * cardWidth + (columns - 1) * gap;
  canvas.height = 170 + rows * (cardHeight + gap) + margin;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  context.fillStyle = "#f5f4ed";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#284638";
  context.font = "700 18px 'DM Sans', sans-serif";
  context.fillText("HUE HELPER", margin, 48);
  context.fillStyle = "#203b30";
  context.font = "600 42px Fraunces, Georgia, serif";
  context.fillText(title, margin, 102);
  context.fillStyle = "#788178";
  context.font = "14px 'DM Sans', sans-serif";
  context.fillText(subtitle, margin, 132);

  colors.forEach((color, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + column * (cardWidth + gap);
    const y = 170 + row * (cardHeight + gap);
    context.fillStyle = "#fffefa";
    context.fillRect(x, y, cardWidth, cardHeight);
    context.fillStyle = color.hex;
    context.fillRect(x + 10, y + 10, cardWidth - 20, 58);
    context.fillStyle = "#203b30";
    context.font = "600 16px 'DM Sans', sans-serif";
    context.fillText(translateName(color.name), x + 12, y + 91, cardWidth - 24);
    context.fillStyle = "#66745f";
    context.font = "13px 'DM Mono', Consolas, monospace";
    context.textAlign = "right";
    context.fillText(color.hex.toUpperCase(), x + cardWidth - 12, y + 91);
    context.textAlign = "left";
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not render palette image")), "image/png");
  });
}
