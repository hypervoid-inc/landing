import { CTA_SOURCES, REFERRAL_SOURCES } from "../../shared/beta-signup-schema";
import { siteUrl } from "./route-manifest";

/**
 * Machine-readable description of the API this site actually serves: the Pages
 * Functions under `/api/`. The platform API on `api.construct.computer` is a
 * separate deployment and is deliberately absent until it publishes its own
 * spec, because a catalog entry pointing at a spec that does not exist is worse
 * than no entry at all.
 *
 * Three artifacts are generated from this module and written into `public/` by
 * `scripts/generate-content.mjs`:
 *
 * - `/openapi.json`, the `service-desc` target
 * - `/docs/api/`, the `service-doc` target
 * - `/.well-known/api-catalog`, the RFC 9727 linkset that points at both
 */

export const apiBase = `${siteUrl}/api/`;
export const openApiUrl = `${siteUrl}/openapi.json`;
export const apiDocsUrl = `${siteUrl}/docs/api/`;
export const apiStatusUrl = `${siteUrl}/api/health`;
export const apiCatalogUrl = `${siteUrl}/.well-known/api-catalog`;

/** The service identifier the health endpoint reports. Shared so the function, the spec, and the docs cannot disagree. */
export const serviceId = "construct-computer-site-api";
export const serviceTitle = "Construct Computer site API";

/** Every `error.code` the site API can return, with the status it comes back on. */
export const errorCodes = [
  {
    code: "invalid_request",
    status: 400,
    meaning: "The body was not JSON, or it failed validation.",
  },
  {
    code: "origin_rejected",
    status: 403,
    meaning: "An Origin header was sent and it was not construct.computer.",
  },
  {
    code: "verification_failed",
    status: 403,
    meaning: "The Turnstile token was missing, stale, or issued elsewhere.",
  },
  {
    code: "method_not_allowed",
    status: 405,
    meaning: "The endpoint was called with the wrong HTTP method.",
  },
  {
    code: "payload_too_large",
    status: 413,
    meaning: "The request body was larger than 8 KiB.",
  },
  {
    code: "unsupported_media_type",
    status: 415,
    meaning: "Content-Type was not application/json.",
  },
  {
    code: "internal_error",
    status: 500,
    meaning: "Verification or storage failed. The request was not recorded.",
  },
] as const;

const errorResponse = (description: string, ...codes: string[]) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
      example: { error: { code: codes[0], message: "Request rejected" } },
    },
  },
});

export const openApiDocument = {
  openapi: "3.1.1",
  info: {
    title: serviceTitle,
    summary: "Public endpoints served from construct.computer.",
    description:
      "The endpoints behind the construct.computer marketing site. Beta signup is a browser-facing form endpoint protected by Cloudflare Turnstile, so it is only callable from a real page load on this origin. The health endpoint is open and unauthenticated.",
    version: "1.0.0",
    termsOfService: `${siteUrl}/terms/`,
    contact: {
      name: "Construct Computer support",
      email: "support@construct.computer",
      url: `${siteUrl}/support/`,
    },
  },
  servers: [{ url: siteUrl, description: "Production" }],
  paths: {
    "/api/health": {
      get: {
        operationId: "getHealth",
        summary: "Report site API health",
        description:
          "Liveness check for the site API. Takes no parameters, reads no storage, and is safe to poll.",
        security: [],
        responses: {
          "200": {
            description: "The site API is serving requests.",
            content: {
              "application/health+json": {
                schema: { $ref: "#/components/schemas/Health" },
                example: {
                  status: "pass",
                  serviceId,
                  description: serviceTitle,
                },
              },
            },
          },
          "405": errorResponse(
            "The endpoint was called with a method other than GET or HEAD.",
            "method_not_allowed",
          ),
        },
      },
    },
    "/api/beta-signup": {
      post: {
        operationId: "createBetaSignup",
        summary: "Subscribe to the newsletter",
        description:
          "Records an email in D1 and subscribes it to the Construct Listmonk newsletter. Every call needs a Cloudflare Turnstile token minted on construct.computer for the `beta_signup` action. Repeat submissions of the same address succeed without creating a duplicate D1 row.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BetaSignup" },
              example: {
                email: "founder@example.com",
                name: "Ada",
                ctaSource: "footer",
                turnstileToken: "0.abc123",
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "The address was recorded in D1 (or was already on the list). `listmonk` is true when Listmonk sync succeeded or was intentionally skipped (disabled / unsubscribe / blocklist respected); false means D1 saved but Listmonk failed — callers may retry.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BetaSignupOk" },
                example: { ok: true, listmonk: true },
              },
            },
          },
          "400": errorResponse(
            "The body was not JSON, or it failed validation.",
            "invalid_request",
          ),
          "403": errorResponse(
            "The Origin header was rejected, or Turnstile verification failed.",
            "verification_failed",
          ),
          "405": errorResponse(
            "The endpoint was called with a method other than POST.",
            "method_not_allowed",
          ),
          "413": errorResponse(
            "The request body was larger than 8 KiB.",
            "payload_too_large",
          ),
          "415": errorResponse(
            "Content-Type was not application/json.",
            "unsupported_media_type",
          ),
          "500": errorResponse(
            "Verification or storage failed. Nothing was recorded.",
            "internal_error",
          ),
        },
      },
    },
  },
  components: {
    schemas: {
      Health: {
        type: "object",
        description:
          "Health response in the format of draft-inadarei-api-health-check.",
        properties: {
          status: { type: "string", enum: ["pass", "fail"] },
          serviceId: { type: "string" },
          description: { type: "string" },
        },
        required: ["status"],
      },
      Ok: {
        type: "object",
        properties: { ok: { type: "boolean", const: true } },
        required: ["ok"],
      },
      BetaSignupOk: {
        type: "object",
        properties: {
          ok: { type: "boolean", const: true },
          listmonk: {
            type: "boolean",
            description:
              "True when Listmonk dual-write succeeded or was intentionally not required (Listmonk disabled, or existing subscriber unsubscribed/blocklisted without re-add).",
          },
        },
        required: ["ok", "listmonk"],
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: {
                type: "string",
                enum: errorCodes.map(({ code }) => code),
              },
              message: {
                type: "string",
                description:
                  "Human-readable and deliberately non-specific. Do not branch on it, branch on `code`.",
              },
            },
            required: ["code", "message"],
          },
        },
        required: ["error"],
      },
      BetaSignup: {
        type: "object",
        additionalProperties: false,
        required: ["email", "ctaSource"],
        properties: {
          email: {
            type: "string",
            format: "email",
            maxLength: 254,
            description: "Trimmed and lowercased before storage.",
          },
          name: {
            type: "string",
            maxLength: 200,
            description:
              "Optional display name. Forwarded to Listmonk only — not stored in D1.",
          },
          ctaSource: {
            type: "string",
            minLength: 1,
            description:
              "Which call to action produced the signup. Any non-empty string is accepted; these are the values the site sends.",
            examples: [...CTA_SOURCES],
          },
          referral: {
            type: "string",
            enum: [...REFERRAL_SOURCES],
            description:
              "Optional. Where the visitor heard about Construct. Omitted footer newsletter signups are stored as other/newsletter.",
          },
          referralOther: {
            type: "string",
            minLength: 2,
            maxLength: 120,
            description:
              'Required when `referral` is "other", ignored otherwise.',
          },
          turnstileToken: {
            type: "string",
            minLength: 1,
            maxLength: 2048,
            description:
              "Cloudflare Turnstile token for browser posts. Omitted when the Construct API calls with SIGNUP_INGEST_SECRET.",
          },
          honeypot: {
            type: "string",
            maxLength: 200,
            description:
              "Bot trap. A filled value returns 200 without recording anything.",
          },
          meta: {
            type: "object",
            additionalProperties: false,
            description:
              "Allowlisted attribution fields written to Listmonk subscriber attribs (when API credentials are configured).",
            properties: {
              subscribedVia: {
                type: "string",
                maxLength: 64,
                examples: ["landing_footer", "construct_auth"],
              },
              authProvider: { type: "string", maxLength: 32 },
              constructUserId: { type: "string", maxLength: 64 },
              campaignRef: { type: "string", maxLength: 64 },
              campaignId: { type: "string", maxLength: 64 },
              campaignSubscriberId: { type: "string", maxLength: 64 },
              utmSource: { type: "string", maxLength: 64 },
              utmMedium: { type: "string", maxLength: 64 },
              utmCampaign: { type: "string", maxLength: 64 },
              promoCode: { type: "string", maxLength: 16 },
              landingPath: { type: "string", maxLength: 128 },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * RFC 9727 catalog. One entry per API: an `anchor` naming the API, plus the
 * link relations a client needs to go from discovery to a working call.
 */
export const apiCatalog = {
  linkset: [
    {
      anchor: apiBase,
      "service-desc": [
        {
          href: openApiUrl,
          type: "application/json",
          title: `${serviceTitle} (OpenAPI 3.1)`,
        },
      ],
      "service-doc": [
        {
          href: apiDocsUrl,
          type: "text/html",
          title: `${serviceTitle} reference`,
        },
      ],
      status: [
        {
          href: apiStatusUrl,
          type: "application/health+json",
          title: `${serviceTitle} health`,
        },
      ],
    },
  ],
} as const;

function html(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function row(cells: readonly string[], tag: "td" | "th" = "td"): string {
  return `<tr>${cells.map((cell) => `<${tag}>${cell}</${tag}>`).join("")}</tr>`;
}

function code(value: string): string {
  return `<code>${html(value)}</code>`;
}

const fields = [
  ["email", "string", "yes", "Max 254 characters. Trimmed and lowercased."],
  [
    "name",
    "string",
    "no",
    "Optional. Forwarded to Listmonk only (not stored in D1).",
  ],
  [
    "ctaSource",
    "string",
    "yes",
    `Which call to action produced the signup, for example ${CTA_SOURCES[0]} or ${CTA_SOURCES[1]}.`,
  ],
  [
    "referral",
    "enum",
    "no",
    `One of ${REFERRAL_SOURCES.join(", ")}. Defaults to other/newsletter when omitted.`,
  ],
  [
    "referralOther",
    "string",
    "conditional",
    'Required when referral is "other". 2 to 120 characters.',
  ],
  [
    "turnstileToken",
    "string",
    "browser",
    "Turnstile token for browser posts. Server ingest uses SIGNUP_INGEST_SECRET instead.",
  ],
  [
    "honeypot",
    "string",
    "no",
    "Bot trap. A filled value is accepted and dropped.",
  ],
  [
    "meta",
    "object",
    "no",
    "Allowlisted attribution (subscribedVia, authProvider, constructUserId, campaign/utm fields) → Listmonk attribs when API credentials are set.",
  ],
] as const;

/**
 * The `service-doc` target. A standalone page rather than a React route: it is
 * developer reference, not marketing, so it stays out of the sitemap and out of
 * the app bundle. Styles are inline because the site's CSS is hashed per build.
 */
export function apiDocsHtml(): string {
  const fieldRows = fields
    .map(([name, type, required, notes]) =>
      row([code(name), html(type), html(required), html(notes)]),
    )
    .join("");
  const errorRows = errorCodes
    .map(({ code: value, status, meaning }) =>
      row([String(status), code(value), html(meaning)]),
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${html(serviceTitle)} reference</title>
    <meta
      name="description"
      content="Reference for the public endpoints on construct.computer: beta signup and health."
    />
    <link rel="canonical" href="${apiDocsUrl}" />
    <link rel="service-desc" href="${openApiUrl}" type="application/json" />
    <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
    <style>
      :root {
        --brand: #01b4c8;
        --ink: #4e4646;
        --muted: #627c86;
        --line: #dcecef;
        --canvas: #f7fbfc;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0 auto;
        max-width: 46rem;
        padding: 3rem 1.25rem 5rem;
        background: #fff;
        color: var(--ink);
        font: 400 16px/1.65 Inter, "Segoe UI", system-ui, sans-serif;
        -webkit-text-size-adjust: 100%;
      }
      h1 { font-size: 1.9rem; line-height: 1.2; margin: 0 0 0.5rem; }
      h2 { font-size: 1.15rem; margin: 3rem 0 0.75rem; }
      h3 { font-size: 0.95rem; margin: 2rem 0 0.5rem; }
      a { color: var(--brand); text-decoration-thickness: 1px; text-underline-offset: 2px; }
      p, li { color: var(--ink); }
      .lede { color: var(--muted); font-size: 1.05rem; margin: 0 0 2rem; }
      code, pre {
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
        font-size: 0.875em;
      }
      code { background: var(--canvas); border: 1px solid var(--line); border-radius: 4px; padding: 0.1em 0.35em; }
      pre {
        background: var(--canvas);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 1rem;
        overflow-x: auto;
      }
      pre code { background: none; border: 0; padding: 0; }
      table { border-collapse: collapse; width: 100%; margin: 0.5rem 0 1rem; display: block; overflow-x: auto; }
      th, td { border-bottom: 1px solid var(--line); padding: 0.55rem 0.75rem 0.55rem 0; text-align: left; vertical-align: top; font-size: 0.9rem; }
      th { color: var(--muted); font-weight: 500; white-space: nowrap; }
      .method { font-weight: 600; color: var(--brand); }
      footer { margin-top: 4rem; padding-top: 1.5rem; border-top: 1px solid var(--line); color: var(--muted); font-size: 0.875rem; }
      @media (prefers-color-scheme: dark) {
        :root { --ink: #e6edef; --muted: #9fb3bb; --line: #24343a; --canvas: #101a1e; }
        body { background: #0b1316; }
      }
    </style>
  </head>
  <body>
    <h1>${html(serviceTitle)}</h1>
    <p class="lede">
      Two public endpoints, served from <code>${html(siteUrl)}</code>. The
      machine-readable version of this page is the
      <a href="${openApiUrl}">OpenAPI 3.1 document</a>, discoverable through the
      <a href="${apiCatalogUrl}">RFC 9727 API catalog</a>.
    </p>

    <h2>Conventions</h2>
    <ul>
      <li>Base URL: <code>${html(siteUrl)}</code>. All paths are absolute from there.</li>
      <li>Requests and responses are JSON. Send <code>Content-Type: application/json</code> on writes.</li>
      <li>Errors carry <code>{ "error": { "code", "message" } }</code>. Branch on <code>code</code>, never on <code>message</code>.</li>
      <li>Request bodies are capped at 8 KiB.</li>
    </ul>

    <h2><span class="method">GET</span> /api/health</h2>
    <p>
      Liveness check. No parameters, no storage reads, safe to poll. Responds
      <code>200</code> with <code>application/health+json</code>.
    </p>
    <pre><code>curl ${html(apiStatusUrl)}

{
  "status": "pass",
  "serviceId": "${html(serviceId)}",
  "description": "${html(serviceTitle)}"
}</code></pre>

    <h2><span class="method">POST</span> /api/beta-signup</h2>
    <p>
      Records an email address against the call to action that produced it.
      Every call needs a Cloudflare Turnstile token minted on
      construct.computer for the <code>beta_signup</code> action, so this
      endpoint is only usable from the site itself. It is listed here for
      completeness and for automated discovery, not as an integration point.
      Submitting an address that is already on the list returns the same
      <code>200</code> and creates no duplicate.
    </p>

    <h3>Request body</h3>
    <table>
      <thead>${row(["Field", "Type", "Required", "Notes"], "th")}</thead>
      <tbody>${fieldRows}</tbody>
    </table>

    <h3>Response</h3>
    <pre><code>{ "ok": true, "listmonk": true }</code></pre>
    <p>
      <code>listmonk</code> is <code>false</code> when D1 saved the signup but
      Listmonk sync failed (retry-safe for authenticated ingest). Browser UX
      still treats HTTP 200 as success.
    </p>

    <h2>Errors</h2>
    <table>
      <thead>${row(["Status", "Code", "Meaning"], "th")}</thead>
      <tbody>${errorRows}</tbody>
    </table>

    <h2>Discovery</h2>
    <ul>
      <li><a href="${apiCatalogUrl}">/.well-known/api-catalog</a>, an RFC 9727 linkset</li>
      <li><a href="${openApiUrl}">/openapi.json</a>, the OpenAPI 3.1 description</li>
      <li><a href="${siteUrl}/llms.txt">/llms.txt</a> and <a href="${siteUrl}/llms-full.txt">/llms-full.txt</a>, product context for models</li>
      <li><a href="${siteUrl}/.well-known/security.txt">/.well-known/security.txt</a>, how to report a vulnerability</li>
    </ul>

    <footer>
      Questions: <a href="${siteUrl}/support/">support</a>. Vulnerabilities:
      <a href="mailto:security@construct.computer">security@construct.computer</a>.
    </footer>
  </body>
</html>
`;
}
