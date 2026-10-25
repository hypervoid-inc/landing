import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import * as brand from "../app/content/brand";
import {
  BRAND_CDN,
  BRAND_DIR,
  BRAND_UPDATED,
  brandCaptions,
  brandDescriptions,
  brandFiles,
  brandGroups,
  brandKit,
  brandTaglines,
  brandVideos,
  brandDocument,
  LOCKUP,
  LOCKUP_PNG,
  LOCKUP_SVG,
  mascotCombo,
  mascotCombos,
  mascotHref,
  mascotPreview,
  kitMascots,
  mascotLook,
  mascotRoles,
  mascotTints,
  STACKED,
  STACKED_PNG,
  STACKED_SVG,
  TAGLINE_MAX,
  WORDMARK_BOX,
} from "../app/content/brand";
import { brandCatalog, brandMarkdown } from "../app/lib/generated-content";
import { siteUrl } from "../app/lib/route-manifest";
import { readme, zip } from "../scripts/brand-kit.mjs";

const publicDir = path.join(process.cwd(), "public");
const brandDir = path.join(publicDir, BRAND_DIR);
const assets = brandGroups.flatMap((group) => group.assets);
const stem = (href: string) => path.basename(href, path.extname(href));

/** What `pnpm brand` writes into the repo; brand.json and brand.md are build output. */
function repoFiles() {
  return readdirSync(brandDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== ".DS_Store")
    .map((entry) => path.join(entry.parentPath, entry.name))
    .filter(
      (file) => !["brand.json", "brand.md"].includes(path.basename(file)),
    );
}

/**
 * Full-size files live on the CDN and the repo keeps only what the page
 * shows, under the same name, so `pnpm brand` and the upload stay in step.
 */
describe("brand files", () => {
  it("serves every full-size file and zip from the CDN, named for its asset", () => {
    const wrong = assets.flatMap((asset) =>
      asset.files
        .filter(
          (file) =>
            file.href !==
            `${BRAND_CDN}/${asset.id}.${file.format.toLowerCase()}`,
        )
        .map((file) => file.href),
    );
    expect(wrong).toEqual([]);
    for (const entry of [brandKit, brandDocument]) {
      expect(entry.href).toBe(`${BRAND_CDN}/${entry.filename}`);
    }
  });

  it("lists every asset id once", () => {
    const ids = assets.map((asset) => asset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never puts an ad size in a file name, which ad blockers strip", () => {
    // EasyList's generic rules such as "-728x90." and "-160x600." hide any
    // URL that carries them, and partners browse with blockers on.
    const names = [
      ...brandFiles.map((file) => path.basename(file.href)),
      brandKit.filename,
      brandDocument.filename,
    ];
    expect(names.filter((name) => /\d{2,4}x\d{2,4}/.test(name))).toEqual([]);
  });

  it("previews each asset from the repo under the same stem", () => {
    const wrong = assets
      .filter(
        (asset) =>
          !asset.preview.startsWith(`${BRAND_DIR}/`) ||
          stem(asset.preview) !== asset.id,
      )
      .map((asset) => asset.preview);
    expect(wrong).toEqual([]);
  });

  it("keeps exactly the previews in public/brand", () => {
    const expected = [
      ...assets.map((asset) => asset.preview),
      ...brandVideos.map((video) => video.preview),
      ...mascotCombos.map((combo) => mascotPreview(combo)),
    ].sort();
    const actual = repoFiles()
      .map((file) => `/${path.relative(publicDir, file)}`)
      .sort();
    expect(actual, "run `pnpm brand <cdn folder>`").toEqual(expected);
  });

  it("keeps large files out of git", () => {
    const sizes = repoFiles().map((file) => ({
      file: path.relative(publicDir, file),
      kb: Math.round(statSync(file).size / 1024),
    }));
    expect(sizes.filter((entry) => entry.kb > 100)).toEqual([]);
    const total = sizes.reduce((sum, entry) => sum + entry.kb, 0);
    // Every assembled mascot has a 15KB preview here; the PNGs stay on the CDN.
    expect(total).toBeLessThan(8192);
  });

  it("states each SVG's real size, since the repo copy is the CDN file", () => {
    const wrong = assets.flatMap((asset) =>
      asset.files
        .filter((file) => file.format === "SVG")
        .filter((file) => {
          const tag = readFileSync(
            path.join(publicDir, asset.preview),
            "utf8",
          ).match(/<svg[^>]*>/)![0];
          const attr = (name: string) =>
            Math.round(
              Number(tag.match(new RegExp(`\\s${name}="([\\d.]+)"`))![1]),
            );
          return attr("width") !== file.width || attr("height") !== file.height;
        })
        .map((file) => file.href),
    );
    expect(wrong).toEqual([]);
  });

  it("draws the lockups at the geometry it states", () => {
    expect(Math.ceil(LOCKUP.markWidth + LOCKUP.gap + WORDMARK_BOX.width)).toBe(
      LOCKUP.width,
    );
    expect(LOCKUP_SVG).toEqual([LOCKUP.width, LOCKUP.height]);
    expect(LOCKUP_PNG[1]).toBe(
      Math.round((LOCKUP_PNG[0] * LOCKUP.height) / LOCKUP.width),
    );
    expect(
      Math.ceil(STACKED.markHeight + STACKED.gap + WORDMARK_BOX.height),
    ).toBe(STACKED.height);
    expect(STACKED_SVG).toEqual([STACKED.width, STACKED.height]);
    expect(STACKED_PNG[1]).toBe(
      Math.round((STACKED_PNG[0] * STACKED.height) / STACKED.width),
    );
  });
});

describe("mascot maker", () => {
  it("assembles every role, color and mood once, under one name each", () => {
    expect(mascotCombos.length).toBe(
      mascotRoles.length * mascotTints.length * 2,
    );
    const stems = mascotCombos.map((combo) => combo.stem);
    expect(new Set(stems).size).toBe(stems.length);
    expect(
      stems.filter((stem) => !/^construct-mascot-[a-z-]+$/.test(stem)),
    ).toEqual([]);
    expect(mascotHref(mascotCombo("support", "construct", true))).toBe(
      `${BRAND_CDN}/mascot/construct-mascot-support-construct-happy.png`,
    );
    expect(kitMascots.length).toBe(mascotRoles.length * 2);
  });

  it("draws the outfit under the eyes and accessories over them", () => {
    const support = mascotRoles.find((role) => role.id === "support")!;
    expect(mascotLook("construct", support, true)).toEqual([
      "body-construct",
      "gloss",
      "sockets-happy",
      "jacket-black",
      "eyes-happy",
      "headset-mic",
      "cap-black",
    ]);
  });
});

describe("brand copy", () => {
  it("keeps every tagline inside Product Hunt's field", () => {
    expect(brandTaglines.filter((line) => line.length > TAGLINE_MAX)).toEqual(
      [],
    );
  });

  it("keeps each description and post inside the field it is for", () => {
    const over = [...brandDescriptions, ...brandCaptions]
      .filter((entry) => entry.max && entry.text.length > entry.max)
      .map((entry) => `${entry.id}: ${entry.text.length}`);
    expect(over).toEqual([]);
  });

  it("names the day the files last changed", () => {
    expect(BRAND_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(BRAND_UPDATED).toISOString().slice(0, 10)).toBe(
      BRAND_UPDATED,
    );
  });

  it("writes no em or en dashes", () => {
    const dashes = new RegExp("[\\u2013\\u2014]");
    const text = JSON.stringify(brandCatalog());
    expect(text).not.toMatch(dashes);
    expect(brandMarkdown()).not.toMatch(dashes);
  });
});

/** What an agent handed the page reads instead of it. */
describe("brand.md", () => {
  const markdown = brandMarkdown();

  it("links every file, the kit, the PDF and brand.json", () => {
    const missing = [
      ...brandFiles.map((file) => file.href),
      brandKit.href,
      brandDocument.href,
      `${siteUrl}${BRAND_DIR}/brand.json`,
    ].filter((href) => !markdown.includes(href));
    expect(missing).toEqual([]);
  });

  it("carries the copy word for word", () => {
    const missing = [...brandDescriptions, ...brandCaptions, ...brandTaglines]
      .map((entry) => (typeof entry === "string" ? entry : entry.text))
      .filter((text) => !markdown.includes(text));
    expect(missing).toEqual([]);
  });

  it("names every mascot role and color for the URL pattern", () => {
    const missing = [
      ...mascotRoles.map((role) => `\`${role.id}\``),
      ...mascotTints.map((tint) => `\`${tint.id}\``),
    ].filter((name) => !markdown.includes(name));
    expect(missing).toEqual([]);
    expect(markdown).toContain(
      mascotHref(mascotCombo("developer", "mint", true)),
    );
  });

  it("only links absolute URLs", () => {
    const relative = [...markdown.matchAll(/\]\(([^)]+)\)/g)]
      .map((match) => match[1]!)
      .filter((href) => !href.startsWith("https://"));
    expect(relative).toEqual([]);
  });
});

describe("brand.json", () => {
  it("lists every file once, with its preview on this site", () => {
    const catalog = brandCatalog();
    const urls = catalog.assets.flatMap((asset) =>
      asset.files.map((file) => file.url),
    );
    expect(urls).toEqual(brandFiles.map((file) => file.href));
    expect(new Set(urls).size).toBe(urls.length);
    expect(
      catalog.assets.every((asset) => asset.preview.startsWith(`${siteUrl}/`)),
    ).toBe(true);
    expect(catalog.kit).toBe(brandKit.href);
    expect(catalog.document.url).toBe(brandDocument.href);
    expect(catalog.updated).toBe(BRAND_UPDATED);
  });
});

/** Reads a ZIP back far enough to prove an unzip tool would get the bytes out. */
function readZip(archive: Buffer) {
  const end = archive.length - 22;
  expect(archive.readUInt32LE(end)).toBe(0x06054b50);
  const count = archive.readUInt16LE(end + 10);
  let offset = 0;
  const entries: { name: string; data: Buffer }[] = [];
  for (let index = 0; index < count; index += 1) {
    expect(archive.readUInt32LE(offset)).toBe(0x04034b50);
    const method = archive.readUInt16LE(offset + 8);
    const size = archive.readUInt32LE(offset + 18);
    const nameLength = archive.readUInt16LE(offset + 26);
    const name = archive.toString(
      "utf8",
      offset + 30,
      offset + 30 + nameLength,
    );
    const body = archive.subarray(
      offset + 30 + nameLength,
      offset + 30 + nameLength + size,
    );
    entries.push({
      name,
      data: method === 8 ? inflateRawSync(body) : Buffer.from(body),
    });
    offset += 30 + nameLength + size;
  }
  return entries;
}

describe("brand kit zip", () => {
  it("round-trips stored and deflated entries", () => {
    const svg = Buffer.from("<svg>".repeat(200));
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
    const entries = readZip(
      zip([
        { name: "kit/a.svg", data: svg },
        { name: "kit/b.png", data: png },
      ]),
    );
    expect(entries.map((entry) => entry.name)).toEqual([
      "kit/a.svg",
      "kit/b.png",
    ]);
    expect(entries[0]!.data.equals(svg)).toBe(true);
    expect(entries[1]!.data.equals(png)).toBe(true);
  });

  it("makes the same bytes from the same files", () => {
    const entries = [{ name: "kit/a.txt", data: Buffer.from("same") }];
    expect(zip(entries).equals(zip(entries))).toBe(true);
  });

  it("opens its README with the date, the naming rule and the terms", () => {
    const text = readme(brand);
    expect(text).toContain(BRAND_UPDATED);
    expect(text).toContain(brand.brandName.rule);
    expect(text).toContain(brand.brandTerms);
    expect(text).toContain(`${siteUrl}${BRAND_DIR}/brand.json`);
  });
});
