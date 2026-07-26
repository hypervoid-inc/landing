import { copyFile, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const output = path.join(process.cwd(), "build/client");

// Cloudflare serves this file with a real 404 instead of its SPA fallback.
await copyFile(
  path.join(output, "404/index.html"),
  path.join(output, "404.html"),
);
await rm(path.join(output, "404"), { force: true, recursive: true });
await rm(path.join(output, "__spa-fallback.html"), { force: true });
