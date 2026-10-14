import { mascotMarkup, type Face } from "./mascot";
import { quadTransform, type Quad } from "./kit";

/**
 * The brand's beige CRT (the plate from the launch film, with the baked-in
 * mascot painted out) and a live mascot sitting where the printed one sat.
 * Everything inside is laid out in plate pixels, 637 by 698, and scaled as
 * one piece, so the screen mapping and the mascot's seat never drift.
 */
export const PLATE_W = 637;
export const PLATE_H = 698;
/** The tube's corners on the plate: top left, top right, bottom right, bottom left. */
const SCREEN_QUAD: Quad = [
  [287, 322],
  [586, 235],
  [589, 489],
  [304, 602],
];
export const SCREEN_CENTER = { x: 441, y: 412 } as const;
/** Screen content is authored in a 320 by 240 box and projected onto the tube. */
export const SCREEN_W = 320;
export const SCREEN_H = 240;
/** Where the printed mascot sat: a 390.6 px avatar square, its body on the lid. */
const SEAT = { x: 166.7, y: -112, size: 390.6 };

export type CrtPlacement = { x: number; y: number; scale: number };

export function crtMarkup(face: Face = "open"): string {
  return `<div class="crt" aria-hidden="true">
    <div class="crt-plate">
      <img class="crt-img" alt="" draggable="false" src="/assets/show/crt.webp">
      <div class="crt-bloom-clip"><div class="crt-bloom" style="width:${SCREEN_W}px;height:${SCREEN_H}px;transform:${quadTransform(SCREEN_W, SCREEN_H, SCREEN_QUAD)}"></div></div>
      <div class="crt-screen" style="width:${SCREEN_W}px;height:${SCREEN_H}px;transform:${quadTransform(SCREEN_W, SCREEN_H, SCREEN_QUAD)}"><div class="crt-content"></div><div class="crt-glass"></div></div>
      <div class="crt-spill"></div>
      <div class="crt-seat" style="left:${SEAT.x}px;top:${SEAT.y}px;width:${SEAT.size}px;height:${SEAT.size}px">${mascotMarkup(face)}</div>
    </div>
  </div>`;
}

export function placeCrt(crt: HTMLElement, { x, y, scale }: CrtPlacement): void {
  crt.style.left = `${x}px`;
  crt.style.top = `${y}px`;
  crt.style.width = `${PLATE_W * scale}px`;
  crt.style.height = `${PLATE_H * scale}px`;
  const plate = crt.querySelector<HTMLElement>(".crt-plate");
  if (plate) plate.style.transform = `scale(${scale})`;
}

/** Board coordinates of a point given in plate pixels. */
export function crtPoint(p: CrtPlacement, px: number, py: number) {
  return { x: p.x + px * p.scale, y: p.y + py * p.scale };
}

/** Where the mascot's face is, for pointing bubbles at it. */
export function mascotFace(p: CrtPlacement) {
  return crtPoint(p, SEAT.x + SEAT.size * 0.5, SEAT.y + SEAT.size * 0.56);
}
/** The left edge of the mascot's body at eye height, where a bubble's tail lands. */
export function mascotLeftCheek(p: CrtPlacement) {
  return crtPoint(p, SEAT.x + SEAT.size * 0.215, SEAT.y + SEAT.size * 0.5);
}
export function screenCenter(p: CrtPlacement) {
  return crtPoint(p, SCREEN_CENTER.x, SCREEN_CENTER.y);
}
