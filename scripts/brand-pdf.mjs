import { Buffer } from "node:buffer";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

/**
 * The kit's one PDF, the whole brand page on paper, printed by Chromium from
 * HTML that is built from `app/content/brand.ts`, so paper and page can never
 * say different things. In the page's order: name, logo, icons and mascot,
 * color and type, banners, copy, answers, partners, usage.
 *
 * Previews come from `public/brand/` (the page's own thumbnails and SVGs),
 * fonts from the site's own packages. Chromium stamps the time it printed
 * into the file; those two stamps are rewritten to a fixed date of the same
 * length, so the same content always makes the same bytes and the kit zip
 * stays reproducible.
 */

const FIXED_DATE = "20260101000000";

const esc = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const paragraphs = (text) =>
  text
    .split("\n\n")
    .map((part) => `<p>${esc(part)}</p>`)
    .join("");

function styles(root) {
  const font = (file) =>
    pathToFileURL(path.join(root, "node_modules/@fontsource-variable", file))
      .href;
  return `
@font-face { font-family: "Inter"; font-weight: 100 900; src: url("${font("inter/files/inter-latin-wght-normal.woff2")}") format("woff2"); }
@font-face { font-family: "Inter"; font-weight: 100 900; font-style: italic; src: url("${font("inter/files/inter-latin-wght-italic.woff2")}") format("woff2"); }
@font-face { font-family: "Geist"; font-weight: 100 900; src: url("${font("geist/files/geist-latin-wght-normal.woff2")}") format("woff2"); }
:root { --ink: #4e4646; --muted: #627c86; --subtle: #8a9aa2; --line: #e5e7eb; --canvas: #f7fbfc; --teal: #01b4c8; --night: #081225; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { font: 10.5pt/1.55 Inter, system-ui, sans-serif; color: var(--ink); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1 { font: italic 500 32pt/1.05 Geist, sans-serif; letter-spacing: -0.02em; margin: 0 0 10pt; }
h2 { font: italic 500 20pt/1.2 Geist, sans-serif; letter-spacing: -0.015em; margin: 0 0 12pt; break-after: avoid; }
h3 { font: 600 11pt/1.4 Inter, sans-serif; margin: 16pt 0 6pt; break-after: avoid; }
p { margin: 0 0 8pt; }
section { break-before: auto; margin-bottom: 22pt; }
section.cover { break-after: page; }
section.page { break-before: page; }
.lead { font-size: 12.5pt; line-height: 1.5; color: var(--muted); max-width: 120mm; }
.muted { color: var(--muted); }
.subtle { color: var(--subtle); font-size: 9pt; }
.cover { height: 240mm; display: flex; flex-direction: column; justify-content: center; }
.cover img { width: 95mm; margin-bottom: 18mm; }
.grid { display: grid; gap: 8pt; }
.cols-3 { grid-template-columns: repeat(3, 1fr); }
.cols-4 { grid-template-columns: repeat(4, 1fr); }
figure { margin: 0; break-inside: avoid; }
.plate { display: flex; align-items: center; justify-content: center; border: 1px solid var(--line); border-radius: 6pt; background: var(--canvas); padding: 12pt; height: 30mm; overflow: hidden; }
.plate.dark { background: var(--night); }
.plate.sky { background: linear-gradient(#2462ea, #081225); }
.plate.square { height: auto; aspect-ratio: 1; padding: 0; }
.plate.flush { padding: 0; }
.plate img { max-width: 100%; max-height: 100%; object-fit: contain; }
.plate.flush img { width: 100%; height: 100%; object-fit: cover; }
figcaption { margin-top: 4pt; font-size: 9pt; }
figcaption b { font-weight: 600; }
figcaption span { color: var(--subtle); }
table { width: 100%; border-collapse: collapse; font-size: 10pt; break-inside: avoid; }
th, td { padding: 6pt 8pt 6pt 0; border-bottom: 1px solid var(--line); vertical-align: top; text-align: left; }
th { font-weight: 600; font-size: 9pt; color: var(--subtle); }
.swatch { width: 26mm; height: 12mm; border-radius: 4pt; border: 1px solid rgba(0, 0, 0, 0.06); }
pre { font: 8.5pt/1.5 ui-monospace, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; background: var(--canvas); border: 1px solid var(--line); padding: 8pt; border-radius: 6pt; margin: 0 0 8pt; }
ul { margin: 0 0 8pt; padding-left: 14pt; break-inside: avoid; }
li { margin: 0 0 3pt; }
dl { margin: 0; }
dt { font-weight: 600; margin-top: 10pt; break-after: avoid; }
dd { margin: 2pt 0 0; color: var(--muted); }
.count { color: var(--subtle); font-size: 9pt; margin-left: 6pt; }
.entry { break-inside: avoid; margin-bottom: 12pt; }
.specimen { font-size: 22pt; line-height: 1.2; }
.strip { display: flex; flex-wrap: wrap; gap: 10pt; align-items: flex-start; }
`;
}

function footer(label, date, page) {
  return `<div style="font: 8pt Helvetica, Arial, sans-serif; color: #8a9aa2; width: 100%; padding: 0 18mm; display: flex; justify-content: space-between;"><span>${esc(label)}, ${esc(date)}</span><span>${esc(page)} · page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;
}

function datePrinted(iso) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** One asset as a figure: its preview on its plate, its name and files. */
function figure(brand, asset, { publicDir, plateClass = "" }) {
  const src = pathToFileURL(
    path.join(publicDir, path.basename(asset.preview)),
  ).href;
  const plate =
    asset.plate === "dark" ? "dark" : asset.plate === "sky" ? "sky" : "";
  const files = asset.files
    .map((file) => `${file.format} ${file.width}×${file.height}`)
    .join(", ");
  return `<figure><div class="plate ${plate} ${plateClass}"><img src="${src}" alt=""></div><figcaption><b>${esc(asset.name)}</b> <span>${esc(asset.id)}: ${esc(files)}</span>${asset.use ? `<br><span>${esc(asset.use)}</span>` : ""}</figcaption></figure>`;
}

function guideHtml(brand, { root, publicDir, siteUrl }) {
  const date = datePrinted(brand.BRAND_UPDATED);
  const group = (id) => brand.brandGroup(id);
  const grid = (id, cols, plateClass = "") =>
    `<div class="grid cols-${cols}">${group(id)
      .assets.map((asset) => figure(brand, asset, { publicDir, plateClass }))
      .join("")}</div>`;
  const wordmark = pathToFileURL(
    path.join(publicDir, "construct-wordmark.svg"),
  ).href;
  const listing = brand.brandDescriptions.find(
    (entry) => entry.id === "listing",
  ).text;
  const count = (entry) =>
    entry.max
      ? `${entry.text.length} of ${entry.max} characters`
      : `${entry.text.trim().split(/\s+/).length} words`;
  const block = (entry) =>
    `<div class="entry"><h3>${esc(entry.label)}<span class="count">${esc(count(entry))}</span></h3><p class="subtle">${esc(entry.fits)}</p>${paragraphs(entry.text)}</div>`;
  const badge = brand.badgeSnippet(siteUrl, "construct-badge");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(brand.brandName.full)} brand guide</title><style>${styles(root)}</style></head><body>
<section class="cover">
  <img src="${wordmark}" alt="${esc(brand.brandName.full)}">
  <h1>Brand guide</h1>
  <p class="lead">${esc(listing)}</p>
  <p class="muted">${esc(date)}. The files, as SVG and PNG, and this document as a page: ${siteUrl}/brand/</p>
</section>

<section>
  <h2>Name</h2>
  <p>${esc(brand.brandName.rule)}</p>
  <p>The website is <b>${esc(brand.brandName.domain)}</b>, all lowercase. Not ${esc(brand.brandName.wrong.join(", "))}.</p>
  <p class="muted">On its own, "${esc(brand.brandName.short)}" also means ${esc(brand.brandName.collides.join(" and "))}, which is why the full name leads.</p>
</section>

<section class="page">
  <h2>Logo</h2>
  <p>The wordmark is the logo. Use the lockup where a listing wants the logo with its icon, the logomark where space is tight, and the squares where a form asks for a square image.</p>
  <h3>Wordmark</h3>${grid("wordmark", 3)}
  <h3>Logomark</h3>${grid("logomark", 3)}
  <h3>Lockup</h3>${grid("lockup", 3)}
  <h3>Stacked</h3>${grid("stacked", 3)}
</section>

<section>
  <h2>Icon, avatar and mascot</h2>
  <h3>Icon and avatar</h3>${grid("icon", 4, "square flush")}
  <h3>Mascot</h3>${grid("mascot", 4)}
  <h3>Roles</h3>
  <div class="grid cols-4">${["plain", "construction", "developer", "support"]
    .map((roleId) => {
      const combo = brand.mascotCombo(roleId, "construct", false);
      const src = pathToFileURL(
        path.join(publicDir, "mascot", `${combo.stem}.webp`),
      ).href;
      return `<figure><div class="plate sky"><img src="${src}" alt=""></div><figcaption><b>${esc(combo.role.label)}</b> <span>${esc(combo.stem)}.png</span></figcaption></figure>`;
    })
    .join("")}</div>
  <p class="muted">Every role in ${brand.mascotTints.length} colors with open or happy eyes, ${brand.mascotCombos.length} files, at ${siteUrl}/brand/#mascot. The kit carries every role in the mascot's own color.</p>
  <h3>Keep it as it is</h3>
  <p>Leave at least one eye’s width clear around every mark. Keep the logomark at 16px or larger and the wordmark at least 96px wide.</p>
  <ul>${brand.brandUsage.dont.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
</section>

<section>
  <h2>Color and type</h2>
  <table><thead><tr><th></th><th>Name</th><th>Hex</th><th>Use</th></tr></thead><tbody>${brand.brandColors
    .map(
      (color) =>
        `<tr><td><div class="swatch" style="background:${color.hex}"></div></td><td>${esc(color.name)}</td><td>${esc(color.hex)}</td><td>${esc(color.use)}</td></tr>`,
    )
    .join("")}</tbody></table>
  <h3>Type</h3>
  <table><tbody>${brand.brandTypefaces
    .map(
      (face) =>
        `<tr><td class="specimen" style="font-family:${esc(face.family)};font-style:${face.style}">Construct Computer</td><td><b>${esc(face.name)}</b>, ${esc(face.use.toLowerCase())}${face.href ? `<br><span class="subtle">${esc(face.href)}</span>` : ""}</td></tr>`,
    )
    .join("")}</tbody></table>
</section>

<section>
  <h2>Banner and ad banners</h2>
  ${group("banner")
    .assets.map((asset) =>
      figure(brand, asset, { publicDir, plateClass: "flush" }),
    )
    .join("")}
  <h3>Ad banners</h3>
  <div class="strip">${group("banners")
    .assets.map((asset) => {
      const src = pathToFileURL(
        path.join(publicDir, path.basename(asset.preview)),
      ).href;
      const [file] = asset.files;
      const scale = file.height > file.width ? 0.5 : 0.75;
      return `<figure style="width:${Math.round(file.width * scale)}px"><img src="${src}" alt="" style="width:100%;border-radius:4pt"><figcaption><b>${esc(asset.name)}</b> <span>${file.width}×${file.height}</span></figcaption></figure>`;
    })
    .join("")}</div>
  <h3>Badge</h3>
  <div class="grid cols-3">${group("badge")
    .assets.map((asset) => figure(brand, asset, { publicDir }))
    .join("")}</div>
  <pre>${esc(badge)}</pre>
  <p class="muted">The dark badge is construct-badge-dark.svg at the same address. Affiliates point the link at their own.</p>
</section>

<section class="page">
  <h2>Copy</h2>
  <p>${esc(brand.brandName.rule)} Every description below opens with the full name.</p>
  <h3>Taglines</h3>
  <ul>${brand.brandTaglines.map((line) => `<li>${esc(line)}<span class="count">${line.length}</span></li>`).join("")}</ul>
  <h3>Descriptions</h3>
  ${brand.brandDescriptions.map(block).join("")}
  <h3>What it does</h3>
  <ul>${brand.brandFeatures.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
  <h3>Facts</h3>
  <table><tbody>${brand.brandFacts
    .map(
      (fact) =>
        `<tr><th style="width:32mm">${esc(fact.label)}</th><td>${esc(fact.value)}${fact.href && !fact.href.startsWith("mailto:") ? `<br><span class="subtle">${esc(fact.href.startsWith("/") ? `${siteUrl}${fact.href}` : fact.href)}</span>` : ""}</td></tr>`,
    )
    .join("")}</tbody></table>
</section>

<section>
  <h2>Questions and answers</h2>
  <dl>${brand.brandFaq.map((entry) => `<dt>${esc(entry.question)}</dt><dd>${esc(entry.answer)}</dd>`).join("")}</dl>
</section>

<section>
  <h2>Partners</h2>
  <p>Swap ${esc(brand.AFFILIATE_LINK)} for your own link, and point the badge at it.</p>
  ${block({ label: "Affiliate disclosure", fits: "Above or below any post or page with your link", text: brand.brandDisclosure })}
  ${brand.brandCaptions.map(block).join("")}
  ${block({ label: "Newsletter or list email", fits: "Your own list, with the disclosure already in", text: `Subject: ${brand.brandEmailTemplate.subject}\n\n${brand.brandEmailTemplate.body}` })}
</section>

<section>
  <h2>Usage</h2>
  <h3>Do</h3><ul>${brand.brandUsage.do.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
  <h3>Don’t</h3><ul>${brand.brandUsage.dont.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
  <p>${esc(brand.brandTerms)}</p>
  <p>Questions: ${esc(brand.brandEmail)}. Every file with its URL and size, as data: ${siteUrl}/brand/brand.json</p>
</section>
</body></html>`;
}

/** Chromium's two timestamps, rewritten in place so the bytes are stable. */
function stable(pdf) {
  const text = pdf.toString("latin1");
  const fixed = text.replace(
    /\/(CreationDate|ModDate) \(D:\d{14}/g,
    (match, key) => `/${key} (D:${FIXED_DATE}`,
  );
  const out = Buffer.from(fixed, "latin1");
  if (out.length !== pdf.length) throw new Error("PDF rewrite changed size");
  return out;
}

/**
 * Writes the guide into `folder` under `brand.brandDocument.filename`.
 * `brand` is the loaded brand.ts module, `publicDir` the repo's
 * `public/brand`, `root` the repo.
 */
export async function buildBrandPdf(
  folder,
  brand,
  { root, publicDir, siteUrl },
) {
  const date = datePrinted(brand.BRAND_UPDATED);
  const scratch = await mkdtemp(path.join(tmpdir(), "brand-pdf-"));
  const browser = await chromium.launch();
  try {
    const file = path.join(scratch, "guide.html");
    await writeFile(file, guideHtml(brand, { root, publicDir, siteUrl }));
    const page = await browser.newPage();
    await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
    await page.evaluate("document.fonts.ready");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: footer(
        `${brand.brandName.full} brand guide`,
        date,
        `${brand.brandName.domain}/brand`,
      ),
      margin: { top: "18mm", right: "18mm", bottom: "20mm", left: "18mm" },
    });
    await page.close();
    await writeFile(
      path.join(folder, brand.brandDocument.filename),
      stable(pdf),
    );
  } finally {
    await browser.close();
    await rm(scratch, { recursive: true, force: true });
  }
}
