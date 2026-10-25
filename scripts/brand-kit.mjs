import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { crc32, deflateRawSync } from "node:zlib";

/**
 * The brand page's one download: every file `app/content/brand.ts` lists in
 * its group's folder, the two PDFs, brand.json and a short README. Written
 * by `pnpm brand` into the CDN folder beside the files it holds.
 *
 * A minimal ZIP writer rather than a dependency: Node has deflate and CRC-32
 * built in, and the format needs nothing else for a flat list of files. Every
 * entry carries the same fixed timestamp, so the same files always make the
 * same bytes and an unchanged kit never looks changed to a cache.
 */

// 2026-01-01 00:00, DOS format.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

/** Already-compressed formats are stored; deflating them only costs time. */
const STORED = /\.(png|jpe?g|webp|zip)$/i;

export function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, "utf8");
    const stored = STORED.test(name);
    const body = stored ? data : deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(stored ? 0 : 8, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(stored ? 0 : 8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);

    offset += local.length + nameBytes.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

/** The README the kit carries, from the catalog's own words. */
export function readme(brand) {
  return [
    `Construct Computer brand kit, ${brand.BRAND_UPDATED}`,
    "",
    `Guidelines and every file: https://construct.computer${brand.BRAND_DIR}/`,
    `As data: https://construct.computer${brand.BRAND_DIR}/brand.json`,
    `Questions: ${brand.brandEmail}`,
    "",
    `${brand.brandDocument.filename}: ${brand.brandDocument.use}`,
    "",
    `mascot/: every role with both eye styles in the mascot's own color, 1024px PNG. All ${brand.mascotCombos.length} roles and colors: https://construct.computer${brand.BRAND_DIR}/#mascot`,
    "",
    `${brand.brandName.rule} The website is ${brand.brandName.domain}, all lowercase. Not ${brand.brandName.wrong.join(", ")}.`,
    "",
    brand.brandTerms,
    "",
  ].join("\n");
}

/**
 * The kit. `brand` is the loaded `app/content/brand.ts` module, `folder` the
 * local copy of the CDN's `/brand/`, where every listed file and both PDFs
 * sit by their own names, and `catalog` the brand.json text.
 */
export async function buildBrandKit(folder, brand, catalog) {
  const stem = brand.brandKit.filename.replace(/\.zip$/, "");
  const entries = [
    { name: `${stem}/README.txt`, data: Buffer.from(readme(brand), "utf8") },
  ];
  entries.push({
    name: `${stem}/${brand.brandDocument.filename}`,
    data: await readFile(path.join(folder, brand.brandDocument.filename)),
  });
  entries.push({
    name: `${stem}/brand.json`,
    data: Buffer.from(catalog, "utf8"),
  });
  for (const group of brand.brandGroups) {
    for (const asset of group.assets) {
      for (const file of asset.files) {
        const name = path.basename(file.href);
        entries.push({
          name: `${stem}/${group.id}/${name}`,
          data: await readFile(path.join(folder, name)),
        });
      }
    }
  }
  for (const combo of brand.kitMascots) {
    entries.push({
      name: `${stem}/mascot/${combo.stem}.png`,
      data: await readFile(path.join(folder, "mascot", `${combo.stem}.png`)),
    });
  }
  return zip(entries);
}
