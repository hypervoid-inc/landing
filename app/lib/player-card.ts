import type { MetaDescriptor } from "react-router";

import { playerCardTags } from "../../shared/player-card";

/**
 * The player card tags as route meta, for pages that are a player card for
 * every crawler. Only the 404 page is: the homepage and `/embed/` get theirs
 * from `functions/player-card.ts`, for Twitterbot alone.
 */
export function playerCardMeta(src: string, path = "/embed/"): MetaDescriptor[] {
  return playerCardTags(src, path);
}
