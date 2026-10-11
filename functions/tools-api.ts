import {
  agentTools,
  getAgentTool,
  inputJsonSchema,
  toolIssues,
  type AgentTool,
} from "../shared/tools/agent-tools";
import type { PagesFunction } from "./types";

/**
 * `/api/tools` and `/api/tools/<slug>`: the free tools for agents that can
 * fetch a URL but cannot run the page's script. GET with no input describes a
 * tool, GET `?input=<json>` or POST a JSON body runs it. Pure computation, no
 * storage and no secrets, so it is open to every origin. Results depend only on
 * the input, which is why GET answers may be cached.
 */
const SITE = "https://construct.computer";
const MAX_INPUT_BYTES = 16 * 1024;

const baseHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  // The tool pages are what should rank, not their JSON.
  "X-Robots-Tag": "noindex",
};

function json(data: unknown, status = 200, cache = "no-store"): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...baseHeaders, "Cache-Control": cache },
  });
}

function error(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return json(
    { error: { code, message, ...(details ? { details } : {}) } },
    status,
  );
}

function describe(tool: AgentTool) {
  const endpoint = `${SITE}/api/tools/${tool.slug}`;
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    page: `${SITE}/tools/${tool.slug}/`,
    endpoint,
    usage: `GET ${endpoint}?input=<URL-encoded JSON>, or POST the JSON as the request body.`,
    input_schema: inputJsonSchema(tool),
    example_input: tool.example,
    example_request: `${endpoint}?input=${encodeURIComponent(JSON.stringify(tool.example))}`,
  };
}

const TOO_LARGE = Symbol("too large");

async function readInput(
  request: Request,
): Promise<string | null | typeof TOO_LARGE> {
  const raw =
    request.method === "POST"
      ? await request.text()
      : new URL(request.url).searchParams.get("input");
  if (raw === null) return null;
  return raw.length > MAX_INPUT_BYTES ? TOO_LARGE : raw;
}

export const onRequest: PagesFunction<unknown> = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseHeaders });
  }
  if (request.method !== "GET" && request.method !== "POST") {
    return error(405, "method_not_allowed", "Use GET or POST.");
  }

  const slug = new URL(request.url).pathname
    .replace(/^\/api\/tools\/?/, "")
    .replace(/\/$/, "");
  if (!slug) {
    return json(
      {
        description:
          "Free tools from Construct Computer. Each runs without an account. Fetch a tool's endpoint for its input schema and an example request.",
        tools: agentTools.map(describe),
      },
      200,
      "public, max-age=3600",
    );
  }

  const tool = getAgentTool(slug);
  if (!tool)
    return error(
      404,
      "not_found",
      "No tool with that name. GET /api/tools lists them.",
    );

  const raw = await readInput(request);
  if (raw === null) return json(describe(tool), 200, "public, max-age=3600");
  if (raw === TOO_LARGE) {
    return error(413, "payload_too_large", "Input is limited to 16 KiB.");
  }

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return error(400, "invalid_request", "Input must be JSON.");
  }
  try {
    const result = tool.run(input);
    return json(
      result,
      200,
      request.method === "GET" ? "public, max-age=3600" : "no-store",
    );
  } catch (caught) {
    return error(
      400,
      "invalid_request",
      "Input failed validation. Fetch the endpoint without input for the schema.",
      toolIssues(caught),
    );
  }
};
