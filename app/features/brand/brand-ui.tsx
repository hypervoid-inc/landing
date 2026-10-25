import type { CSSProperties, ReactNode } from "react";

import {
  LOGOMARK_PATH,
  LOGOMARK_VIEWBOX,
  type BrandAsset,
  type BrandFile,
  type BrandPlate,
} from "../../content/brand";
import { captureAnalytics } from "../analytics/analytics.client";
import { CheckIcon, SwapLabel, useConfirm } from "../tools/tool-motion";

export function trackBrand(asset: string, action: "download" | "copy") {
  captureAnalytics("brand_asset_used", { asset, action });
}

/**
 * Saves a full-size file from the CDN under its own name. A cross-origin link
 * ignores `download`, so the file is fetched and saved from a blob; if the
 * CDN refuses (no CORS, offline), it opens in a new tab instead.
 */
export async function saveFile(href: string) {
  try {
    const response = await fetch(href, { mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = href.slice(href.lastIndexOf("/") + 1);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    window.open(href, "_blank", "noopener");
  }
}

export const plateClass: Record<BrandPlate, string> = {
  light: "bg-[#f7fbfc]",
  dark: "bg-[#081225]",
  sky: "bg-[linear-gradient(180deg,#2462ea,#081225)]",
  photo: "bg-[#f7fbfc]",
};

/** The page's one filled button. */
export const primaryButton =
  "tool-press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#01b4c8] px-5 text-[15px] font-semibold text-white hover:bg-[#019fb1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#01b4c8]";

/** Every other action: a text link that underlines in teal. */
export const textAction =
  "inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-[#4e4646] underline decoration-[#dcecef] underline-offset-[5px] transition-colors hover:text-[#017b89] hover:decoration-[#01b4c8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#01b4c8]";

export const inlineLink =
  "text-[#017b89] underline decoration-[#b6ecfb] underline-offset-4 hover:decoration-[#01b4c8]";

/**
 * The logomark drawn inline, in any color, for the usage examples. `as="g"`
 * gives just the path, in the mark's own units, to place inside another SVG.
 */
export function Logomark({
  fill,
  className = "",
  style,
  as = "svg",
}: {
  fill: string;
  className?: string;
  style?: CSSProperties;
  as?: "svg" | "g";
}) {
  if (as === "g") {
    return <path fill={fill} fillRule="evenodd" d={LOGOMARK_PATH} />;
  }
  return (
    <svg
      viewBox={LOGOMARK_VIEWBOX}
      aria-hidden
      className={className}
      style={style}
    >
      <path fill={fill} fillRule="evenodd" d={LOGOMARK_PATH} />
    </svg>
  );
}

/**
 * Text that has to be fetched first goes through a `ClipboardItem` holding
 * the pending promise: Safari only allows a clipboard write inside the click,
 * and the fetch would otherwise finish after it.
 */
export function copy(text: string | (() => Promise<string>)) {
  if (typeof text === "string") return navigator.clipboard.writeText(text);
  if (typeof ClipboardItem === "undefined") {
    return text().then((value) => navigator.clipboard.writeText(value));
  }
  const blob = text().then(
    (value) => new Blob([value], { type: "text/plain" }),
  );
  return navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
}

/** Copies `text`, then says so for two seconds without changing width. */
export function CopyButton({
  text,
  asset,
  label = "Copy",
  className = textAction,
  children,
}: {
  text: string | (() => Promise<string>);
  asset: string;
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  const [copied, confirm] = useConfirm();
  return (
    <>
      <button
        type="button"
        aria-label={children ? label : undefined}
        onClick={() => {
          void copy(text).then(() => {
            confirm();
            trackBrand(asset, "copy");
          });
        }}
        className={className}
      >
        <SwapLabel
          done={copied}
          idle={children ?? label}
          confirmed={
            <>
              <CheckIcon />
              Copied
            </>
          }
        />
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </>
  );
}

/** The arrow into a tray, drawn small so it reads at 13px. */
export function DownloadIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 shrink-0">
      <path
        d="M8 2.5v7.5m0 0L5 7m3 3l3-3M3 12.5h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A download arrow, "PNG", then the size in a quieter grey. */
export function FileLink({
  file,
  asset,
  group,
}: {
  file: BrandFile;
  asset: BrandAsset;
  group: string;
}) {
  return (
    <a
      href={file.href}
      target="_blank"
      rel="noopener"
      aria-label={`Download ${group} ${asset.name}, ${file.format}, ${file.width} by ${file.height}`}
      onClick={(event) => {
        event.preventDefault();
        void saveFile(file.href);
        trackBrand(asset.id, "download");
      }}
      className={textAction}
    >
      <DownloadIcon />
      {file.format}
      <span className="font-normal text-[#8a9aa2]">
        {file.width}×{file.height}
      </span>
    </a>
  );
}

/** A link per file, and Copy SVG for vectors, which pastes into Figma. */
export function FileLinks({
  asset,
  group,
}: {
  asset: BrandAsset;
  group: string;
}) {
  // A vector's preview is the SVG itself, served from this origin.
  const svg = asset.preview.endsWith(".svg") ? asset.preview : null;
  return (
    <span className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
      {asset.files.map((file) => (
        <FileLink key={file.href} file={file} asset={asset} group={group} />
      ))}
      {svg && (
        <CopyButton
          asset={asset.id}
          label={`Copy ${group} ${asset.name} SVG`}
          text={() => fetch(svg).then((response) => response.text())}
        >
          Copy SVG
        </CopyButton>
      )}
    </span>
  );
}

export type Ratio = "5/2" | "3/2" | "1/1" | "16/9" | "5/3" | "natural";

const ratioClass: Record<Exclude<Ratio, "natural">, string> = {
  "5/2": "aspect-[5/2]",
  "3/2": "aspect-[3/2]",
  "1/1": "aspect-square",
  "16/9": "aspect-video",
  "5/3": "aspect-[5/3]",
};

/** How much of the plate the mark may fill. */
export type Pad = "none" | "tight" | "roomy";

const padClass: Record<Pad, string> = {
  none: "",
  tight: "p-6 sm:p-7",
  roomy: "p-9 sm:p-11",
};

/** One downloadable asset, previewed on the background it is made for. */
export function AssetCard({
  asset,
  group,
  ratio = "3/2",
  pad = "tight",
  fit = "contain",
  trueSize = false,
}: {
  asset: BrandAsset;
  group: string;
  ratio?: Ratio;
  pad?: Pad;
  /** `cover` lets a set of near ratios share one plate without side bars. */
  fit?: "contain" | "cover";
  /** Show the file at its own pixel size, for banners that are small. */
  trueSize?: boolean;
}) {
  const first = asset.files[0]!;
  // "natural" sizes the plate to the file, for sets that differ on purpose.
  // A tall or square file is held to a width that keeps it beside the rest.
  const natural = ratio === "natural";
  const portrait = first.height > first.width;
  const held =
    natural && portrait
      ? "max-w-[240px]"
      : natural && first.height === first.width
        ? "max-w-[360px]"
        : "";
  return (
    <figure
      className="flex min-w-0 flex-col"
      // At its own size the figure is as wide as the file, a tall one at
      // half, and never wider than the page. A max keeps the width out of
      // the grid's intrinsic sizing, so a phone never scrolls sideways.
      style={
        trueSize
          ? {
              width: "100%",
              maxWidth: `${portrait ? first.width / 2 : first.width}px`,
            }
          : undefined
      }
    >
      {/* The image is positioned, not in flow: an aspect-ratio box grows to
          fit its content, and a 1200px preview would stretch the plate. */}
      <div
        className={`relative overflow-hidden rounded-xl border border-[#e5e7eb] ${plateClass[asset.plate]} ${natural ? held : ratioClass[ratio]}`}
        style={
          natural
            ? { aspectRatio: `${first.width} / ${first.height}` }
            : undefined
        }
      >
        <img
          src={asset.preview}
          alt={`${group}, ${asset.name.toLowerCase()}`}
          width={first.width}
          height={first.height}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"} ${padClass[pad]}`}
        />
      </div>
      <figcaption className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-0.5">
        <span className="text-[14px] font-medium text-[#4e4646]">
          {asset.name}
        </span>
        <FileLinks asset={asset} group={group} />
        {asset.use && (
          <span className="basis-full text-[13px] leading-5 text-[#8a9aa2]">
            {asset.use}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

/** A usage example: the thing on its plate, and a tick or a cross. */
export function Rule({
  ok,
  caption,
  plate = "light",
  children,
}: {
  ok: boolean;
  caption: string;
  plate?: BrandPlate;
  children: ReactNode;
}) {
  return (
    <figure>
      <div
        className={`grid aspect-[3/2] place-items-center overflow-hidden rounded-xl border border-[#e5e7eb] ${plateClass[plate]}`}
      >
        {children}
      </div>
      <figcaption className="mt-2.5 flex items-start gap-2 px-0.5 text-[13px] leading-5 text-[#4e4646]">
        <span
          aria-hidden
          className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-white ${ok ? "bg-[#067647]" : "bg-[#b42318]"}`}
        >
          {/* Drawn, not typed: a glyph's metrics never sit centred in a circle. */}
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5">
            <path
              d={ok ? "M2.5 6.5l2.5 2.5 4.5-5" : "M3 3l6 6M9 3l-6 6"}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span>
          <span className="sr-only">{ok ? "Do: " : "Don't: "}</span>
          {caption}
        </span>
      </figcaption>
    </figure>
  );
}
