import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import process from "node:process";

/**
 * `pnpm dev`: the Pages Functions and the site together. Wrangler serves
 * `functions/` on :8788 with the bindings from wrangler.jsonc and the local
 * secrets in `.dev.vars`; Vite serves the app on :5173 and proxies `/api`
 * to Wrangler (vite.config.ts), so the browser talks to one origin exactly
 * as it does in production. Ctrl-C stops both.
 */

const FUNCTIONS_PORT = 8788;
const WEB_PORT = 5173;

if (!existsSync(".dev.vars")) {
  copyFileSync(".dev.vars.example", ".dev.vars");
  console.log(
    "[dev] wrote .dev.vars from .dev.vars.example (test keys, local only)",
  );
}

const migrate = spawnSync(
  "pnpm",
  ["exec", "wrangler", "d1", "migrations", "apply", "DB", "--local"],
  { stdio: "inherit" },
);
if (migrate.status !== 0) process.exit(migrate.status ?? 1);

const children = [];

function run(name, command, args, env = {}) {
  const child = spawn(command, args, {
    env: { ...process.env, ...env, FORCE_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const prefix = (stream) => {
    let rest = "";
    stream.on("data", (chunk) => {
      rest += chunk.toString();
      const lines = rest.split("\n");
      rest = lines.pop() ?? "";
      for (const line of lines) console.log(`[${name}] ${line}`);
    });
  };
  prefix(child.stdout);
  prefix(child.stderr);
  child.on("exit", (code) => {
    console.log(`[dev] ${name} exited (${code ?? "signal"}), stopping`);
    stop(code ?? 0);
  });
  children.push(child);
  return child;
}

let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 300);
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

run("api", "pnpm", [
  "exec",
  "wrangler",
  "pages",
  "dev",
  "public",
  "--port",
  String(FUNCTIONS_PORT),
  "--ip",
  "127.0.0.1",
  // wrangler.jsonc points at the production newsletter list, so local signups
  // and claims would land there. Off unless LISTMONK_LIVE=1 asks for it.
  ...(process.env.LISTMONK_LIVE === "1"
    ? []
    : ["--binding", "LISTMONK_BASE_URL="]),
]);
run(
  "web",
  "pnpm",
  [
    "exec",
    "react-router",
    "dev",
    "--host",
    "127.0.0.1",
    "--port",
    String(WEB_PORT),
  ],
  {
    SHOW_ALL_POSTS: "1",
    FUNCTIONS_ORIGIN: `http://127.0.0.1:${FUNCTIONS_PORT}`,
  },
);

console.log(`[dev] site      http://localhost:${WEB_PORT}/`);
console.log(`[dev] live demo http://localhost:${WEB_PORT}/embed/`);
console.log(
  `[dev] functions http://127.0.0.1:${FUNCTIONS_PORT}/api/*  (proxied under the site)`,
);
console.log(
  process.env.LISTMONK_LIVE === "1"
    ? "[dev] Listmonk  LIVE: signups go to the production newsletter list"
    : "[dev] Listmonk  off: signups are not sent anywhere (LISTMONK_LIVE=1 to send)",
);
