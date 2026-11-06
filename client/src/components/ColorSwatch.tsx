import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import type { RGB } from "@/lib/color-utils";
import { colorTextColor } from "@/lib/color-utils";

type ColorSwatchProps = {
  name: string;
  label: string;
  actionLabel: string;
  hex: string;
  rgb: RGB;
  onSelect: () => void;
};

export default function ColorSwatch({ name, label, actionLabel, hex, rgb, onSelect }: ColorSwatchProps) {
  const style = { "--swatch-color": hex, "--swatch-ink": colorTextColor(rgb) } as CSSProperties;

  return (
    <button className="catalog-swatch" onClick={onSelect} style={style} type="button" aria-label={`${actionLabel}, ${hex}`}>
      <span className="catalog-swatch__paint">
        <span className="catalog-swatch__name">{label}</span>
        <ArrowUpRight aria-hidden="true" size={16} />
      </span>
      <span className="catalog-swatch__meta">
        <span>{name}</span>
        <span>{hex}</span>
      </span>
    </button>
  );
}
