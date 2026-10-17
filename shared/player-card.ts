import { siteUrl } from "./site";

/**
 * The X Player Card: when a post links a page carrying these tags, X renders
 * the player URL as a frame inside the post on desktop, and on phones shows
 * `twitter:image` with a play button that opens the page. 4:3 leaves room for
 * a transcript and a composer at the roughly 516 pixels a timeline column
 * gives the frame.
 *
 * Only X plays it. Discord, Telegram and Slack read the same `twitter:*` tags,
 * and given a player card they show the play-button image as a small
 * thumbnail with nothing to play. So the prerendered pages are large image
 * cards, and `functions/player-card.ts` swaps these tags in for Twitterbot.
 */

export const PLAYER_WIDTH = 800;
export const PLAYER_HEIGHT = 600;

export function playerUrl(src: string, path = "/embed/"): string {
  return `${siteUrl}${path}?src=${encodeURIComponent(src)}`;
}

/**
 * The image X shows for a player card: on the phone apps (and often on the
 * web) it is the only thing people see before tapping, so it carries a play
 * button. X's docs ask for the player's own shape, so it is 4:3 like the
 * 800x600 player, not the 1200x630 link card. Bump `v` when it changes.
 */
export const PLAYER_IMAGE = `${siteUrl}/og/play.jpg?v=2`;

export function playerCardTags(
  src: string,
  path = "/embed/",
): { name: string; content: string }[] {
  return [
    { name: "twitter:card", content: "player" },
    { name: "twitter:player", content: playerUrl(src, path) },
    { name: "twitter:player:width", content: String(PLAYER_WIDTH) },
    { name: "twitter:player:height", content: String(PLAYER_HEIGHT) },
    { name: "twitter:image", content: PLAYER_IMAGE },
  ];
}
