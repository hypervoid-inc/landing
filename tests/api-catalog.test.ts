import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  apiCatalog,
  apiDocsHtml,
  errorCodes,
  openApiDocument,
  serviceId,
} from "../app/lib/api-catalog";
import { onRequest as health } from "../functions/api/health";
import { crawlerFiles } from "../app/lib/generated-content";
import { siteUrl } from "../app/lib/route-manifest";
import { betaSignupSchema } from "../shared/beta-signup-schema";

const headers = readFileSync(
  new URL("../public/_headers", import.meta.url),
  "utf8",
);

/** What each catalog `href` has to resolve to for the entry to be honest. */
const publishedTargets = new Map<string, () => boolean>([
  [`${siteUrl}/openapi.json`, () => "openapi.json" in crawlerFiles],
  [`${siteUrl}/docs/api/`, () => "docs/api/index.html" in crawlerFiles],
  [`${siteUrl}/api/health`, () => typeof health === "function"],
]);

describe("RFC 9727 API catalog", () => {
  const [entry, ...rest] = apiCatalog.linkset;

  it("is a linkset of anchored entries", () => {
    expect(Array.isArray(apiCatalog.linkset)).toBe(true);
    expect(apiCatalog.linkset.length).toBeGreaterThan(0);
    for (const item of apiCatalog.linkset) {
      expect(new URL(item.anchor).origin).toBe(siteUrl);
    }
    // One API is published from this repo. The platform API on
    // api.construct.computer joins the catalog when it ships its own spec.
    expect(rest).toEqual([]);
    expect(entry!.anchor).toBe(`${siteUrl}/api/`);
  });

  it("carries service-desc, service-doc, and status links with media types", () => {
    for (const relation of ["service-desc", "service-doc", "status"] as const) {
      const links = entry![relation];
      expect(links.length, relation).toBeGreaterThan(0);
      for (const link of links) {
        expect(link.href, relation).toMatch(/^https:\/\//);
        expect(link.type, relation).toMatch(/^[\w.+-]+\/[\w.+-]+$/);
        expect(link.title, relation).toBeTruthy();
      }
    }
    expect(entry!["service-desc"][0].href).toBe(`${siteUrl}/openapi.json`);
    expect(entry!["service-doc"][0].type).toBe("text/html");
  });

  it("points only at things this site actually publishes", () => {
    for (const links of [
      entry!["service-desc"],
      entry!["service-doc"],
      entry!.status,
    ]) {
      for (const { href } of links) {
        const exists = publishedTargets.get(href);
        expect(exists, `unresolvable catalog href: ${href}`).toBeDefined();
        expect(exists!(), href).toBe(true);
      }
    }
  });

  it("is generated as valid JSON at the well-known location", () => {
    const document = crawlerFiles[".well-known/api-catalog"];

    expect(JSON.parse(document)).toEqual(apiCatalog);
    expect(document.endsWith("\n")).toBe(true);
  });

  /** The RFC mandates the media type, and the file is extensionless. */
  it("is served as application/linkset+json", () => {
    expect(headers).toMatch(
      /^\/\.well-known\/api-catalog\n(?:\s{2}.+\n)*\s{2}Content-Type: application\/linkset\+json$/m,
    );
  });
});

describe("OpenAPI description", () => {
  it("describes every endpoint the site serves", () => {
    expect(openApiDocument.openapi).toMatch(/^3\.1\./);
    expect(openApiDocument.servers[0].url).toBe(siteUrl);
    expect(Object.keys(openApiDocument.paths).sort()).toEqual([
      "/api/beta-signup",
      "/api/health",
    ]);
    expect(JSON.parse(crawlerFiles["openapi.json"])).toEqual(openApiDocument);
  });

  it("declares a signup body the running validator accepts", () => {
    const schema = openApiDocument.components.schemas.BetaSignup;
    const body: Record<string, unknown> = {
      email: "founder@example.com",
      ctaSource: "hero",
      referral: "other",
      referralOther: "a friend",
      turnstileToken: "0.abc123",
      honeypot: "",
    };

    // The documented shape is exactly the accepted shape, in both directions.
    expect(Object.keys(schema.properties).sort()).toEqual(
      Object.keys(body).sort(),
    );
    expect(betaSignupSchema.safeParse(body).success).toBe(true);
    for (const field of schema.required) {
      const withoutField = { ...body };
      delete withoutField[field];
      expect(betaSignupSchema.safeParse(withoutField).success, field).toBe(
        false,
      );
    }
  });

  it("documents every error code the endpoints can return", () => {
    const documented = new Set<string>(
      openApiDocument.components.schemas.Error.properties.error.properties.code
        .enum,
    );
    const source = readFileSync(
      new URL("../functions/api/beta-signup.ts", import.meta.url),
      "utf8",
    );

    for (const [, code] of source.matchAll(/error\(\d{3},\s*"([a-z_]+)"/g)) {
      expect(documented.has(code!), code).toBe(true);
    }
    expect([...documented].sort()).toEqual(
      errorCodes.map(({ code }) => code).sort(),
    );
  });
});

describe("human API reference", () => {
  const page = apiDocsHtml();

  it("covers every documented path and error code", () => {
    for (const path of Object.keys(openApiDocument.paths)) {
      expect(page, path).toContain(path);
    }
    for (const { code, status } of errorCodes) {
      expect(page, code).toContain(code);
      expect(page, code).toContain(String(status));
    }
  });

  it("links back to the spec and the catalog", () => {
    expect(page).toContain(`${siteUrl}/openapi.json`);
    expect(page).toContain(`${siteUrl}/.well-known/api-catalog`);
    expect(page).toContain(`<link rel="canonical" href="${siteUrl}/docs/api/"`);
  });

  /** House style: no em or en dashes in anything a reader sees. */
  it("uses no em or en dashes", () => {
    expect(page).not.toMatch(/[–—]/);
  });
});

describe("health endpoint", () => {
  const call = (method: string) =>
    health({
      request: new Request(`${siteUrl}/api/health`, { method }),
      env: {},
    });

  it("reports pass as application/health+json", async () => {
    const response = await call("GET");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain(
      "application/health+json",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await response.json()).toEqual({
      status: "pass",
      serviceId,
      description: "Construct Computer site API",
    });
  });

  it("answers HEAD without a body", async () => {
    const response = await call("HEAD");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  it("rejects writes", async () => {
    const response = await call("POST");

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, HEAD");
    expect(await response.json()).toEqual({
      error: { code: "method_not_allowed", message: "Request rejected" },
    });
  });
});
