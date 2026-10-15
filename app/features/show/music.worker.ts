/// <reference lib="webworker" />
import { renderStems } from "./music";

/** Renders the show's music off the main thread and hands the stems back without copying. */
self.onmessage = () => {
  const stems = renderStems();
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(stems, Object.values(stems).map((s) => s.buffer));
};
