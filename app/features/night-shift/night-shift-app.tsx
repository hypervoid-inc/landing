import { useCallback } from "react";

import { ShowHost, type ShowEnv } from "../show/show-host";
import { mountNightShift } from "./night-shift";

/** /embed1/: Night Shift Live, the launch film you play inside a post. */
export function NightShiftApp() {
  const mount = useCallback((board: HTMLElement, env: ShowEnv) => mountNightShift(board, env), []);
  return <ShowHost show="night" src="embed1" label="Night Shift, a playable short from Construct" mount={mount} />;
}
