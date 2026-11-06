import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  Camera,
  Check,
  ChevronRight,
  Copy,
  Crosshair,
  Download,
  ImagePlus,
  Languages,
  Palette,
  Plus,
  RotateCcw,
  ScanLine,
  Search,
  Share2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import ColorSwatch from "@/components/ColorSwatch";
import {
  catalogGroup,
  colorTextColor,
  COLOR_CATALOG,
  buildColorCatalog,
  buildColorNameLookup,
  describeColor,
  findClosestNamedColors,
  hexToRgb,
  normalizeColorName,
  parseColorInput,
  rgbToHex,
  rgbToHsl,
  type ColorCatalogEntry,
  type RGB,
} from "@/lib/color-utils";
import { getInitialLanguage, translate, translateColorName, translateHistorySource, type Language, type TranslationKey } from "@/lib/i18n";
import { createPalettePng, serializePalette, type PaletteColor } from "@/lib/palette-export";

type Page = "scan" | "catalog" | "saved";
type MediaMode = "idle" | "camera" | "image";
type SavedColor = { id: string; hex: string; createdAt: number; source: string };
type Point = { x: number; y: number };

const STORAGE_KEY = "hue-helper-color-history-v1";
const PALETTE_STORAGE_KEY = "hue-helper-palette-v1";
const MAX_PALETTE_COLORS = 24;
const INITIAL_HEX = "#A3B18A";

function readHistory(): SavedColor[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedColor =>
      typeof item?.hex === "string" && Boolean(hexToRgb(item.hex)) &&
      typeof item?.createdAt === "number" && typeof item?.id === "string",
    ).slice(0, 30);
  } catch {
    return [];
  }
}

function readPalette(): PaletteColor[] {
  try {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PaletteColor =>
      typeof item?.hex === "string" && Boolean(hexToRgb(item.hex)) && typeof item?.name === "string",
    ).slice(0, MAX_PALETTE_COLORS);
  } catch {
    return [];
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getSourceDimensions(source: HTMLImageElement | HTMLVideoElement) {
  if (source instanceof HTMLVideoElement) return { width: source.videoWidth, height: source.videoHeight };
  return { width: source.naturalWidth, height: source.naturalHeight };
}

function sampleMediaAt(source: HTMLImageElement | HTMLVideoElement, clientX: number, clientY: number): RGB | null {
  const { width, height } = getSourceDimensions(source);
  const rect = source.getBoundingClientRect();
  if (!width || !height || !rect.width || !rect.height) return null;

  // The preview uses object-fit: cover, so reverse its centered crop before sampling the source pixel.
  const scale = Math.max(rect.width / width, rect.height / height);
  const renderedWidth = width * scale;
  const renderedHeight = height * scale;
  const cropX = (renderedWidth - rect.width) / 2;
  const cropY = (renderedHeight - rect.height) / 2;
  const sourceX = clamp((clientX - rect.left + cropX) / scale, 0, width - 1);
  const sourceY = clamp((clientY - rect.top + cropY) / scale, 0, height - 1);
  const sampleWidth = Math.min(12, Math.max(1, width), Math.max(1, height));
  const left = clamp(sourceX - sampleWidth / 2, 0, width - sampleWidth);
  const top = clamp(sourceY - sampleWidth / 2, 0, height - sampleWidth);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(source, left, top, sampleWidth, sampleWidth, 0, 0, 1, 1);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return { r, g, b };
  } catch {
    return null;
  }
}

function formatTime(timestamp: number, language: Language) {
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", { hour: "numeric", minute: "2-digit" }).format(timestamp);
}

export default function Home() {
  const [page, setPage] = useState<Page>("scan");
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const t = (key: TranslationKey, values: Record<string, string | number> = {}) => translate(language, key, values);
  const colorName = (name: string) => translateColorName(name, language);
  const [catalog, setCatalog] = useState<ColorCatalogEntry[]>(COLOR_CATALOG);
  const [visibleCount, setVisibleCount] = useState(120);
  const formattedCatalogCount = catalog.length.toLocaleString(language === "id" ? "id-ID" : "en-US");
  const [mode, setMode] = useState<MediaMode>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rgb, setRgb] = useState<RGB>(() => hexToRgb(INITIAL_HEX)!);
  const [history, setHistory] = useState<SavedColor[]>(readHistory);
  const [palette, setPalette] = useState<PaletteColor[]>(readPalette);
  const [cameraError, setCameraError] = useState("");
  const [status, setStatus] = useState(() => translate(getInitialLanguage(), "statusReady"));
  const [codeInput, setCodeInput] = useState(INITIAL_HEX);
  const [entryError, setEntryError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All colors");
  const [copied, setCopied] = useState("");
  const [point, setPoint] = useState<Point>({ x: 50, y: 50 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);
  const colorNameLookup = useMemo(() => {
    const lookup = buildColorNameLookup(catalog);
    if (language === "id") {
      for (const color of catalog) {
        const localizedName = translateColorName(color.name, language);
        if (localizedName !== color.name) lookup[normalizeColorName(localizedName)] ??= color.hex;
      }
    }
    return lookup;
  }, [catalog, language]);
  const closest = useMemo(() => findClosestNamedColors(rgb, 4, catalog), [catalog, rgb]);
  const activeColor = closest[0];
  const isNamedColorMatch = Boolean(activeColor && activeColor.distance < 0.5);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      setStatus(t("statusHistorySavingFailed"));
    }
  }, [history, language]);

  useEffect(() => {
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palette));
    } catch {
      setStatus(t("paletteSavingFailed"));
    }
  }, [palette, language]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/color-names.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Color catalog could not be loaded");
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Color catalog has an invalid format");
        const additions = Object.entries(data as Record<string, unknown>).flatMap(([hex, name]) =>
          typeof name === "string" ? [{ name, hex: hex.startsWith("#") ? hex : `#${hex}` }] : [],
        );
        const expanded = buildColorCatalog(additions);
        if (expanded.length <= COLOR_CATALOG.length) throw new Error("Expanded color catalog is empty");
        setCatalog(expanded);
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus(translate(getInitialLanguage(), "statusDataFailed"));
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("hue-helper-language", language);
    } catch {
      // The current session still follows the selected language without persistent storage.
    }
    document.documentElement.lang = language;
    document.title = t("pageTitle");
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    description?.setAttribute("content", t("pageDescription"));
  }, [language]);

  useEffect(() => setVisibleCount(120), [category, query]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => setCameraError(t("cameraPreviewError")));
    }
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, [stream]);

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const rememberColor = (next: RGB, source: string) => {
    const nextHex = rgbToHex(next);
    setRgb(next);
    setCodeInput(nextHex);
    setEntryError("");
    setStatus(`${translateHistorySource(source, language)} · ${formatTime(Date.now(), language)}`);
    setHistory((items) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, hex: nextHex, createdAt: Date.now(), source },
      ...items.filter((item) => item.hex.toUpperCase() !== nextHex),
    ].slice(0, 30));
  };

  const startCamera = async (requestedFacing = facingMode) => {
    setCameraError("");
    setStatus(t("cameraConnecting"));
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t("cameraUnsupportedError"));
      setStatus(t("cameraUnavailable"));
      return;
    }
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: requestedFacing },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      });
      setStream(nextStream);
      setMode("camera");
      setFacingMode(requestedFacing);
      setImageUrl(null);
      setStatus(t("cameraReady"));
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      const message = name === "NotAllowedError" || name === "SecurityError"
        ? t("cameraPermissionError")
        : name === "NotFoundError" || name === "OverconstrainedError"
          ? t("cameraNotFoundError")
          : t("cameraStartError");
      setCameraError(message);
      setStatus(t("cameraUnavailable"));
      setMode("idle");
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    if (mode === "camera") setMode("idle");
  };

  const navigateTo = (destination: Page) => {
    if (destination !== "scan" && stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      if (mode === "camera") setMode("idle");
    }
    setPage(destination);
  };

  const switchCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setFacingMode(next);
    window.setTimeout(() => void startCamera(next), 150);
  };

  const sampleFromPreview = (source: HTMLImageElement | HTMLVideoElement, clientX: number, clientY: number, label: string) => {
    const rect = source.getBoundingClientRect();
    setPoint({
      x: clamp(((clientX - rect.left) / rect.width) * 100, 4, 96),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 5, 95),
    });
    const sampled = sampleMediaAt(source, clientX, clientY);
    if (!sampled) {
      setCameraError(t("photoSampleError"));
      return;
    }
    setCameraError("");
    rememberColor(sampled, label);
  };

  const handleKeyboardSample = (event: ReactKeyboardEvent<HTMLElement>, source: HTMLImageElement | HTMLVideoElement, label: string) => {
    const movements: Record<string, Point> = { ArrowLeft: { x: -4, y: 0 }, ArrowRight: { x: 4, y: 0 }, ArrowUp: { x: 0, y: -4 }, ArrowDown: { x: 0, y: 4 } };
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const rect = source.getBoundingClientRect();
      sampleFromPreview(source, rect.left + rect.width * point.x / 100, rect.top + rect.height * point.y / 100, label);
      return;
    }
    const movement = movements[event.key];
    if (!movement) return;
    event.preventDefault();
    const next = { x: clamp(point.x + movement.x, 4, 96), y: clamp(point.y + movement.y, 5, 95) };
    const rect = source.getBoundingClientRect();
    sampleFromPreview(source, rect.left + rect.width * next.x / 100, rect.top + rect.height * next.y / 100, label);
  };

  const sampleCenter = () => {
    if (mode === "camera" && videoRef.current) {
      const rect = videoRef.current.getBoundingClientRect();
      sampleFromPreview(videoRef.current, rect.left + rect.width / 2, rect.top + rect.height / 2, "Camera scan");
      return;
    }
    if (mode === "image" && imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      sampleFromPreview(imageRef.current, rect.left + rect.width / 2, rect.top + rect.height / 2, "Photo sample");
      return;
    }
    void startCamera();
  };

  const chooseImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCameraError(t("chooseImageError"));
      return;
    }
    setCameraError("");
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    const nextUrl = URL.createObjectURL(file);
    setImageUrl(nextUrl);
    setMode("image");
    setStatus(t("photoLoaded"));
  };

  const handleImageLoad = (image: HTMLImageElement) => {
    if (!image.naturalWidth || !image.naturalHeight) {
      setCameraError(t("photoOpenError"));
      return;
    }
    const rect = image.getBoundingClientRect();
    sampleFromPreview(image, rect.left + rect.width / 2, rect.top + rect.height / 2, "Photo center");
  };

  const applyColorInput = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseColorInput(codeInput, colorNameLookup);
    if (!parsed) {
      setEntryError(t("colorEntryError"));
      return;
    }
    setEntryError("");
    rememberColor(parsed, "Manual entry");
  };

  const copyText = async (value: string, label: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const field = document.createElement("textarea");
        field.value = value;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const success = document.execCommand("copy");
        field.remove();
        if (!success) throw new Error("Copy unavailable");
      }
      setCopied(label);
      window.setTimeout(() => setCopied((value) => value === label ? "" : value), 1500);
    } catch {
      setStatus(t("statusCopyFailed"));
    }
  };

  const shareColor = async () => {
    const title = activeColor ? translateColorName(activeColor.label, language) : t("unknownShade");
    const text = `${title} · ${hex} · rgb(${rgb.r}, ${rgb.g}, ${rgb.b}) · hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${title} — Hue Helper`, text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyText(text, "share");
    setStatus(t("statusShareCopied"));
  };

  const restoreColor = (saved: SavedColor) => {
    const parsed = hexToRgb(saved.hex);
    if (parsed) {
      setRgb(parsed);
      setCodeInput(saved.hex.toUpperCase());
      setStatus(t("statusFromHistory", { time: formatTime(saved.createdAt, language) }));
      setPage("scan");
    }
  };

  const selectCatalogColor = (selected: ColorCatalogEntry) => {
    rememberColor(selected.rgb, "Color catalog");
    setPage("scan");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredColors = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const compactNeedle = normalizeColorName(needle);
    return catalog.filter((item) => {
      const itemHsl = rgbToHsl(item.rgb);
      const hslCode = `hsl(${itemHsl.h}, ${itemHsl.s}%, ${itemHsl.l}%)`;
      const searchValues = [item.label, item.name, colorName(item.label), item.hex, `rgb(${item.rgb.r}, ${item.rgb.g}, ${item.rgb.b})`, hslCode];
      const searchMatch = !needle || searchValues.some((value) => value.toLowerCase().includes(needle) || normalizeColorName(value).includes(compactNeedle));
      const groupMatch = category === "All colors" || catalogGroup(item.rgb) === category;
      return searchMatch && groupMatch;
    });
  }, [catalog, category, language, query]);
  const visibleColors = filteredColors.slice(0, visibleCount);

  const currentFormats = [
    { label: "HEX", value: hex },
    { label: "RGB", value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
    { label: "HSL", value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
  ];

  const navigation = [
    { id: "scan" as const, label: t("navScan"), icon: ScanLine },
    { id: "catalog" as const, label: t("navCatalog"), icon: Palette },
    { id: "saved" as const, label: t("navHistory"), icon: RotateCcw },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setPage("scan")} aria-label={t("homeLabel")}>
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span className="brand-name">hue<span>helper</span><small>{t("brandTag")}</small></span>
        </button>
        <nav className="desktop-nav" aria-label={t("mainNavigation")}>
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-link ${page === id ? "is-active" : ""}`} onClick={() => navigateTo(id)} type="button" aria-current={page === id ? "page" : undefined}>
              <Icon size={17} strokeWidth={1.9} />
              <span>{label}</span>
              {id === "saved" && history.length > 0 && <span className="nav-count">{history.length}</span>}
            </button>
          ))}
        </nav>
        <div className="privacy-chip"><span /> {t("privacy")}</div>
        <label className="language-switcher">
          <Languages size={15} aria-hidden="true" />
          <span className="visually-hidden">{t("language")}</span>
          <select aria-label={t("language")} value={language} onChange={(event) => {
            const nextLanguage = event.currentTarget.value as Language;
            setLanguage(nextLanguage);
            setCameraError("");
            setEntryError("");
            setStatus(translate(nextLanguage, "statusReady"));
          }}>
            <option value="id">ID</option>
            <option value="en">EN</option>
          </select>
        </label>
      </header>

      <main className="main-content">
        {page === "scan" && (
          <>
            <section className="page-intro">
              <div>
                <p className="eyebrow"><Sparkles size={14} /> {t("scanEyebrow")}</p>
                <h1>{t("scanTitle")}</h1>
                <p className="intro-copy">{t("scanDescription")}</p>
              </div>
              <div className="intro-stamp" aria-label={`${formattedCatalogCount} ${t("scanNamedColors")}`}>
                <span className="stamp-number">{formattedCatalogCount}</span>
                <span>{t("scanNamedColors")}</span>
                <span className="stamp-sun" aria-hidden="true">✳</span>
              </div>
            </section>

            <section className="scan-layout" aria-label={t("scannerLabel")}>
              <article className="panel scanner-panel">
                <div className="panel-heading scanner-heading">
                  <div className="heading-label"><span className="heading-icon"><Crosshair size={17} /></span><div><h2>{t("colorFinder")}</h2><p>{t("chooseSamplingMethod")}</p></div></div>
                  <span className={`live-indicator ${mode === "camera" && stream ? "is-live" : ""}`}><i />{mode === "camera" && stream ? t("cameraOn") : t("ready")}</span>
                </div>

                <div className={`viewfinder ${mode === "idle" ? "is-empty" : ""}`}>
                  {mode === "camera" && (
                    <video
                      ref={videoRef}
                      className="media-preview"
                      autoPlay
                      muted
                      playsInline
                      role="button"
                      tabIndex={0}
                      onClick={(event) => sampleFromPreview(event.currentTarget, event.clientX, event.clientY, "Camera scan")}
                      onKeyDown={(event) => handleKeyboardSample(event, event.currentTarget, "Camera scan")}
                      aria-label={t("cameraPreviewLabel")}
                    />
                  )}
                  {mode === "image" && imageUrl && (
                    <img
                      key={imageUrl}
                      ref={imageRef}
                      src={imageUrl}
                      className="media-preview"
                      alt={t("photoPreviewLabel")}
                      role="button"
                      tabIndex={0}
                      onLoad={(event) => handleImageLoad(event.currentTarget)}
                      onError={() => setCameraError(t("photoOpenManualError"))}
                      onClick={(event) => sampleFromPreview(event.currentTarget, event.clientX, event.clientY, "Photo sample")}
                      onKeyDown={(event) => handleKeyboardSample(event, event.currentTarget, "Photo sample")}
                    />
                  )}
                  {mode === "idle" && (
                    <div className="finder-placeholder">
                      <div className="placeholder-art" aria-hidden="true">
                        <div className="art-disc art-disc--one" /><div className="art-disc art-disc--two" /><div className="art-disc art-disc--three" />
                        <span className="art-center"><Crosshair size={25} /></span>
                      </div>
                      <span className="placeholder-kicker">{t("placeholderKicker")}</span>
                      <span className="placeholder-title">{t("placeholderTitle")}</span>
                      <span className="placeholder-help">{t("placeholderHelp")}</span>
                    </div>
                  )}
                  {mode !== "idle" && <span className="viewfinder-badge"><i /> {t("sampleAnywhere")}</span>}
                  {mode !== "idle" && <span className="viewfinder-coordinates" aria-hidden="true">{point.x.toFixed(0)}° · {point.y.toFixed(0)}°</span>}
                  {mode !== "idle" && <div className="target-marker" style={{ left: `${point.x}%`, top: `${point.y}%` }} aria-hidden="true"><span /><i /><b /></div>}
                </div>

                <div className="scanner-controls">
                  <button className="button button--primary" type="button" onClick={stream || mode === "image" ? sampleCenter : () => void startCamera()}>
                    <Camera size={17} />{stream || mode === "image" ? t("sampleCenter") : t("openCamera")}
                  </button>
                  {stream && <button className="button button--secondary camera-switch" type="button" onClick={switchCamera} aria-label={t("switchCamera")}><RotateCcw size={16} /><span>{t("flipCamera")}</span></button>}
                  {stream && <button className="button icon-button" type="button" onClick={stopCamera} aria-label={t("closeCamera")}><span>{t("closeCamera")}</span></button>}
                  <button className="button button--secondary upload-button" type="button" onClick={() => uploadRef.current?.click()}><ImagePlus size={17} />{t("uploadPhoto")}</button>
                  <input ref={uploadRef} className="visually-hidden" type="file" accept="image/*" capture="environment" aria-label={t("choosePhoto")} onChange={(event) => { chooseImage(event.target.files?.[0]); event.target.value = ""; }} />
                </div>
                <p className="status-line" aria-live="polite"><span className="status-dot" />{status}</p>
                {cameraError && <p className="camera-error" role="alert">{cameraError}</p>}
              </article>

              <article className="panel result-panel" aria-live="polite">
                <div className="panel-heading result-heading">
                  <div className="heading-label"><span className="heading-icon"><Palette size={17} /></span><div><h2>{t("yourColor")}</h2><p>{isNamedColorMatch ? t("namedColorMatch") : t("closestNamedColor")}</p></div></div>
                  <button className="share-button" type="button" onClick={() => void shareColor()} aria-label={t("shareThisColor")}><Share2 size={17} /><span>{t("share")}</span></button>
                </div>
                <div className="hero-swatch" style={{ backgroundColor: hex, color: colorTextColor(rgb) }}>
                  <span className="swatch-overline">{mode === "camera" ? t("cameraSample") : mode === "image" ? t("photoSample") : t("currentSample")}</span>
                  <div className="hero-swatch__bottom"><div><h3>{activeColor ? colorName(activeColor.label) : t("unknownShade")}</h3><p>{describeColor(rgb, language)}</p></div><span className="sample-index">01</span></div>
                  <span className="swatch-orbit swatch-orbit--one" aria-hidden="true" /><span className="swatch-orbit swatch-orbit--two" aria-hidden="true" />
                </div>

                <div className="format-list" aria-label={t("colorValues")}>
                  {currentFormats.map(({ label, value }) => (
                    <div className="format-row" key={label}>
                      <span className="format-label">{label}</span>
                      <span className="format-value">{value}</span>
                      <button className="copy-button" type="button" onClick={() => { setStatus(t("statusCopySuccess", { format: label })); void copyText(value, label); }} aria-label={t("copyFormat", { format: label })}>
                        {copied === label ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                    </div>
                  ))}
                </div>

                <form className="manual-entry" onSubmit={applyColorInput}>
                  <label htmlFor="color-code">{t("enterAnyColor")}</label>
                  <div className="entry-row">
                    <input id="color-code" className="code-input" value={codeInput} onChange={(event) => { setCodeInput(event.target.value); setEntryError(""); }} placeholder={t("colorCodePlaceholder")} autoComplete="off" spellCheck={false} />
                    <label className="native-picker" title={t("chooseColorVisually")}>
                      <input type="color" value={hex} onChange={(event) => { const picked = hexToRgb(event.target.value); if (picked) rememberColor(picked, "Color picker"); }} aria-label={t("chooseColorVisually")} />
                      <span style={{ backgroundColor: hex }} />
                      <Palette size={14} />
                    </label>
                    <button className="entry-submit" type="submit" aria-label={t("identifyEnteredColor")}><ChevronRight size={19} /></button>
                  </div>
                  {entryError ? <p className="entry-hint entry-hint--error" role="alert">{entryError}</p> : <p className="entry-hint">{t("colorEntryHint")}</p>}
                </form>

                <div className="similar-colors">
                  <div className="similar-heading"><span>{t("neighborhood")}</span><span>{isNamedColorMatch ? t("exactCatalogColor") : t("closestColorNames")}</span></div>
                  <div className="similar-list">
                    {closest.slice(0, 3).map((item, index) => (
                      <button key={item.name} type="button" className={`similar-item ${index === 0 ? "is-first" : ""}`} onClick={() => selectCatalogColor(item)} title={t("useColor", { color: colorName(item.label) })}>
                        <span className="similar-dot" style={{ backgroundColor: item.hex }} />
                        <span>{colorName(item.label)}</span>
                        <span className="similar-code">{item.hex}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            </section>

            <section className="quick-colors" aria-label={t("quickColorLabel")}>
              <div className="quick-title"><span>{t("tryAColor")}</span><span>{t("tapSwatchToExplore")}</span></div>
              <div className="quick-list">
                {COLOR_CATALOG.filter((item) => ["tomato", "gold", "mediumseagreen", "cornflowerblue", "orchid", "rebeccapurple"].includes(item.name)).map((item) => (
                  <button type="button" key={item.name} className="quick-swatch" onClick={() => selectCatalogColor(item)} style={{ backgroundColor: item.hex }} aria-label={t("tryColor", { color: colorName(item.label) })} title={colorName(item.label)} />
                ))}
                <button type="button" className="quick-link" onClick={() => navigateTo("catalog")}>{t("browseAllColors", { count: formattedCatalogCount })} <ChevronRight size={15} /></button>
              </div>
            </section>
          </>
        )}

        {page === "catalog" && (
          <section className="library-page">
            <div className="page-intro library-intro">
              <div><p className="eyebrow"><Palette size={14} /> {t("catalogEyebrow")}</p><h1>{t("catalogTitle")}</h1><p className="intro-copy">{t("catalogDescription")}</p></div>
              <div className="intro-stamp"><span className="stamp-number">{formattedCatalogCount}</span><span>{t("catalogNamedColors")}</span><span className="stamp-sun" aria-hidden="true">✳</span></div>
            </div>
            <div className="library-toolbar">
              <label className="search-field"><Search size={18} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} aria-label={t("searchColors")} /><span className="search-shortcut">⌕</span></label>
              <div className="filter-pills" aria-label={t("filterColors")}>
                {["All colors", "Warm", "Cool", "Neutral"].map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`filter-pill ${category === item ? "is-selected" : ""}`}>{item === "All colors" ? t("allColors") : item === "Warm" ? t("warm") : item === "Cool" ? t("cool") : t("neutral")}</button>)}
              </div>
            </div>
            <p className="library-count">{t("showingColors", { shown: visibleColors.length.toLocaleString(language === "id" ? "id-ID" : "en-US"), total: filteredColors.length.toLocaleString(language === "id" ? "id-ID" : "en-US") })}<span>·</span> {t("tapColorValues")}</p>
            {filteredColors.length ? (
              <div className="catalog-grid">
                {visibleColors.map((item) => <ColorSwatch key={item.name} {...item} label={colorName(item.label)} actionLabel={t("useColor", { color: colorName(item.label) })} onSelect={() => selectCatalogColor(item)} />)}
              </div>
            ) : (
              <div className="empty-state"><span className="empty-state__icon"><Search size={22} /></span><h2>{t("noShadeFound")}</h2><p>{t("tryAnotherName")}</p><button type="button" className="button button--secondary" onClick={() => { setQuery(""); setCategory("All colors"); }}>{t("clearSearch")}</button></div>
            )}
            {visibleColors.length < filteredColors.length && <div className="load-more-wrap"><button type="button" className="button button--secondary load-more-button" onClick={() => setVisibleCount((current) => Math.min(current + 120, filteredColors.length))}>{t("loadMoreColors")} · {(filteredColors.length - visibleColors.length).toLocaleString(language === "id" ? "id-ID" : "en-US")}</button></div>}
            <p className="catalog-attribution">{t("datasetCredit")} <a href="https://github.com/meodai/color-names" target="_blank" rel="noreferrer">meodai/color-names</a> · <a href="/color-names-LICENSE.txt" target="_blank" rel="noreferrer">{t("licenseNote")}</a></p>
          </section>
        )}

        {page === "saved" && (
          <section className="history-page">
            <div className="page-intro library-intro">
              <div><p className="eyebrow"><RotateCcw size={14} /> {t("historyEyebrow")}</p><h1>{t("historyTitle")}</h1><p className="intro-copy">{t("historyDescription")}</p></div>
              <div className="intro-stamp"><span className="stamp-number">{history.length.toString().padStart(2, "0")}</span><span>{t("colorsSavedHere")}</span><span className="stamp-sun" aria-hidden="true">✳</span></div>
            </div>
            {history.length > 0 ? (
              <>
                <div className="history-toolbar"><p className="library-count">{history.length === 1 ? t("mostRecentSingular") : t("mostRecent", { count: history.length })}</p><button type="button" className="clear-history" onClick={() => setHistory([])}><Trash2 size={15} /> {t("clearHistory")}</button></div>
                <div className="history-list">
                  {history.map((item, index) => {
                    const savedRgb = hexToRgb(item.hex)!;
                    const name = findClosestNamedColors(savedRgb, 1, catalog)[0];
                    return <article key={item.id} className="history-card">
                      <button type="button" className="history-color" style={{ backgroundColor: item.hex }} onClick={() => restoreColor(item)} aria-label={t("openColor", { color: item.hex })}><span>{String(index + 1).padStart(2, "0")}</span></button>
                      <div className="history-details"><span className="history-name">{colorName(name.label)}</span><span className="history-subline">{translateHistorySource(item.source, language)} <i /> {formatTime(item.createdAt, language)}</span></div>
                      <code className="history-hex">{item.hex.toUpperCase()}</code>
                      <button type="button" className="history-open" onClick={() => restoreColor(item)}><span>{t("view")}</span><ChevronRight size={16} /></button>
                    </article>;
                  })}
                </div>
              </>
            ) : (
              <div className="empty-state history-empty"><span className="empty-state__icon"><ScanLine size={22} /></span><h2>{t("historyEmptyTitle")}</h2><p>{t("historyEmptyDescription")}</p><button type="button" className="button button--primary" onClick={() => setPage("scan")}><Camera size={16} />{t("findColor")}</button></div>
            )}
          </section>
        )}

        <footer className="page-footer"><span className="footer-mark">h.</span><span>{t("footerBrand")}</span><span className="footer-private"><span />{t("cameraPrivacy")}</span></footer>
      </main>

      <nav className="mobile-nav" aria-label={t("mainNavigation")}>
        {navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={page === id ? "is-active" : ""} onClick={() => { navigateTo(id); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-current={page === id ? "page" : undefined}><Icon size={19} /><span>{id === "scan" ? t("navScanShort") : id === "catalog" ? t("navCatalogShort") : t("navHistoryShort")}</span>{id === "saved" && history.length > 0 && <i className="mobile-nav-count">{history.length}</i>}</button>)}
      </nav>
    </div>
  );
}
