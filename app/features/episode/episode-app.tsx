import { useCallback } from "react";

import { ShowHost, type ShowEnv } from "../show/show-host";
import { mountEpisode } from "./episode";

/** /embed2/: Episode 01, the night shift as a manga you turn. */
export function EpisodeApp() {
  const mount = useCallback((board: HTMLElement, env: ShowEnv) => mountEpisode(board, env), []);
  return <ShowHost show="episode" src="embed2" label="Episode 01, a playable manga from Construct" mount={mount} />;
}
