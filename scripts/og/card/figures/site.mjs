import { TOKENS as T, esc, icon, marked, mascotUri, tile } from "../kit.mjs";

/**
 * Figures for pages that collect other pages, and for people.
 */

/**
 * The published cards of the pages a topic or an index lists, as a fanned
 * stack of thumbnails. `images` is filled in by the publisher from
 * `public/og`, so the card changes whenever its posts do.
 *
 *   { kind: "mosaic", count: 12, noun: "posts", images: [{ uri, title }] }
 */
export function mosaic({ images = [], count, noun = "posts" }) {
  const shown = images.slice(0, 4);
  const spots = [
    { x: 0, y: 26, r: -4 },
    { x: 262, y: 0, r: 3 },
    { x: 18, y: 214, r: 2 },
    { x: 276, y: 196, r: -3 },
  ];
  const thumbs = shown
    .map((image, i) => {
      const s = spots[i];
      return `<div style="position:absolute;left:${s.x}px;top:${s.y}px;width:262px;transform:rotate(${s.r}deg);background:#fff;border:1px solid ${T.line};border-radius:14px;padding:6px;box-shadow:0 22px 44px -24px rgba(1,80,95,.45)">
        <img src="${image.uri}" style="display:block;width:100%;border-radius:9px">
      </div>`;
    })
    .join("");
  const placeholder = shown.length
    ? ""
    : `<div style="position:absolute;inset:60px 80px;display:flex;align-items:center;justify-content:center">${tile("Construct", 140)}</div>`;
  return {
    html: `<div style="position:relative;width:540px;height:400px">${placeholder}${thumbs}
      ${count ? `<span class="pill" style="position:absolute;right:6px;bottom:-14px;background:#fff;font-size:15px">${icon("Files01", 16, T.strong)}${esc(`${count} ${noun}`)}</span>` : ""}
    </div>`,
  };
}

/**
 * A person or the team behind the posts, with what they write about.
 *
 *   { kind: "profile", name, role, photo?: uri, handle?, topics: ["..."] }
 */
export function profile({ name, role, photo, handle, topics = [] }) {
  const face = photo
    ? `<img src="${photo}" style="width:132px;height:132px;border-radius:50%;object-fit:cover;border:4px solid #fff;box-shadow:0 18px 40px -20px rgba(1,80,95,.5)">`
    : `<span style="width:132px;height:132px;border-radius:50%;background:${T.tint};border:4px solid #fff;box-shadow:0 18px 40px -20px rgba(1,80,95,.5);display:inline-flex;align-items:center;justify-content:center"><img src="${mascotUri()}" style="width:96px"></span>`;
  return {
    html: `<div class="panel" style="width:480px;padding:30px 30px 24px;display:flex;flex-direction:column;align-items:center;text-align:center">
      ${face}
      <div style="font:700 26px Geist;letter-spacing:-.02em;margin-top:16px">${esc(name)}</div>
      <div style="font:500 16px Geist;color:${T.muted};margin-top:6px">${esc(role)}${handle ? ` &middot; ${esc(handle)}` : ""}</div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:20px">${topics.map((topic) => `<span class="pill" style="font-size:13.5px">${marked(topic)}</span>`).join("")}</div>
    </div>`,
  };
}
