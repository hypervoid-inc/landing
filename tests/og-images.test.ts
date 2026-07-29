import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ogArtSubjects } from "../app/content/og-art";
import {
  canonicalRoutes,
  ogName,
  ogStem,
  routeDisplayTitle,
  type CanonicalRoute,
} from "../app/lib/route-manifest";
import {
  manifestPath,
  outputDirectory,
  readManifest,
  readSources,
  signature,
  sourceDirectory,
} from "../scripts/og/manifest.mjs";

/** The published filename, always `<stem>.jpg`. */
function imageFile(route: CanonicalRoute) {
  return path.basename(new URL(route.image).pathname);
}

function publishedPath(route: CanonicalRoute) {
  return path.join(outputDirectory, imageFile(route));
}

const names = canonicalRoutes.map((route) => ogName(route.path));
const renamed = canonicalRoutes.filter(
  (route) => imageFile(route) !== `${ogName(route.path)}.jpg`,
);

describe("OG artwork subjects", () => {
  it("describes a subject for every route without a hand-made image", () => {
    const missing = canonicalRoutes
      .filter(
        (route) =>
          !existsSync(path.join(sourceDirectory, `${ogStem(route.path)}.png`)),
      )
      .map((route) => ogName(route.path))
      .filter((name) => !ogArtSubjects[name]);
    expect(missing).toEqual([]);
  });

  it("carries no subjects for routes that no longer exist", () => {
    expect(
      Object.keys(ogArtSubjects).filter((name) => !names.includes(name)),
    ).toEqual([]);
  });

  it("keeps every subject unique, so no two images share a scene", () => {
    const subjects = Object.values(ogArtSubjects);
    expect(new Set(subjects).size).toBe(subjects.length);
  });

  /**
   * Style lives in the prompt's style contract, not in the subject lines. A
   * subject that restates the palette is how a set drifts: the contract and the
   * subject start disagreeing and the model splits the difference.
   */
  it("leaves palette and medium to the style contract", () => {
    for (const [name, subject] of Object.entries(ogArtSubjects)) {
      expect(subject, name).not.toMatch(/#[0-9a-f]{6}|photoreal|3d render/i);
      expect(subject.length, name).toBeGreaterThan(60);
    }
  });
});

/**
 * What every social crawler and the blog index rely on. These are cheap
 * structural checks on the bytes — nothing here judges how the art looks.
 */
describe("OG image health", () => {
  it("publishes an image for every canonical route", () => {
    const missing = canonicalRoutes
      .filter((route) => !existsSync(publishedPath(route)))
      .map((route) => imageFile(route));
    expect(missing, "run `pnpm og`").toEqual([]);
  });

  /** 1200x630 is the 1.91:1 ratio Facebook, X, LinkedIn, and Slack all crop to. */
  it("is exactly 1200x630", () => {
    const wrong: string[] = [];
    for (const route of canonicalRoutes) {
      const header = readFileSync(publishedPath(route)).subarray(0, 2048);
      const { width, height } = jpegSize(header);
      if (width !== 1200 || height !== 630) {
        wrong.push(`${imageFile(route)} ${width}x${height}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  /**
   * JPEG, and therefore opaque. Clients composite OG images onto backgrounds we
   * do not control, and a transparent region can come out black.
   */
  it("is JPEG, so it can carry no alpha channel", () => {
    const wrong: string[] = [];
    for (const route of canonicalRoutes) {
      const file = publishedPath(route);
      const magic = readFileSync(file).subarray(0, 3);
      if (magic[0] !== 0xff || magic[1] !== 0xd8 || magic[2] !== 0xff) {
        wrong.push(imageFile(route));
      }
      if (!imageFile(route).endsWith(".jpg")) wrong.push(imageFile(route));
    }
    expect(wrong).toEqual([]);
  });

  /**
   * These double as blog-index thumbnails, where fourteen load on one page, so
   * the ceiling is well below what social platforms would tolerate on their own.
   */
  it("stays under 300KB per image and 4MB in total", () => {
    const sizes = canonicalRoutes.map((route) => ({
      file: imageFile(route),
      kb: Math.round(statSync(publishedPath(route)).size / 1024),
    }));
    expect(sizes.filter((entry) => entry.kb > 300)).toEqual([]);
    expect(sizes.reduce((total, entry) => total + entry.kb, 0)).toBeLessThan(
      4096,
    );
  });
});

describe("committed OG images", () => {
  /**
   * Nothing generates a renamed image, so a frontmatter typo would otherwise
   * ship a social card pointing at a 404.
   */
  it("backs every frontmatter image with a source file in assets/og/", () => {
    const missing = renamed.filter((route) => {
      const stem = path.basename(imageFile(route), ".jpg");
      return ![".png", ".jpg", ".jpeg", ".webp"].some((extension) =>
        existsSync(path.join(sourceDirectory, `${stem}${extension}`)),
      );
    });
    expect(missing.map((route) => route.path)).toEqual([]);
  });

  /**
   * The images are committed artifacts rather than build output, so nothing
   * else notices when a title is edited and the image is not re-rendered.
   */
  it("matches the committed manifest, or `pnpm og` needs rerunning", async () => {
    const manifest = await readManifest();
    const stale: string[] = [];

    for (const route of canonicalRoutes) {
      const name = ogName(route.path);
      const stem = path.basename(imageFile(route), ".jpg");
      const { custom, full } = await readSources(name, stem);
      const expected = signature({
        title: routeDisplayTitle(route),
        kind: route.kind,
        stem,
        custom,
        full,
      });
      if (manifest[name] !== expected) stale.push(name);
    }

    expect(stale, `stale OG images — run \`pnpm og\` (${manifestPath})`).toEqual(
      [],
    );
  });

  it("tracks no manifest entries for removed routes", async () => {
    const manifest = await readManifest();
    expect(
      Object.keys(manifest).filter((name) => !names.includes(name)),
    ).toEqual([]);
  });
});

/**
 * Reads dimensions from a JPEG's SOF marker. Cheaper than decoding the image,
 * and avoids making the assertion depend on the encoder that produced it.
 */
function jpegSize(buffer: Buffer): { width: number; height: number } {
  let offset = 2;
  while (offset < buffer.length - 9) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1]!;
    // SOF0-SOF15, excluding the non-frame markers DHT, JPG, and DAC.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  return { width: 0, height: 0 };
}
