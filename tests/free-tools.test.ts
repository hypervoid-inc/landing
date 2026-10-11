import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { tools } from "../app/content/tools";
import { GmailFilterGenerator } from "../app/features/tools/gmail-filter-generator";
import { McpConfigGenerator } from "../app/features/tools/mcp-config-generator";
import { ZapierCostCalculator } from "../app/features/tools/zapier-cost-calculator";
import { crawlerFiles } from "../app/lib/generated-content";
import { canonicalRoutes, siteUrl } from "../app/lib/route-manifest";
import { routeJsonLd } from "../app/lib/seo";
import { onRequest } from "../functions/tools-api";
import {
  agentTools,
  inputJsonSchema,
  toolIssues,
} from "../shared/tools/agent-tools";

const DASHES = new RegExp("[\\u2013\\u2014]");
const cta = createElement("a", { "data-cta": "" }, "CTA");

/**
 * The tools must work the moment the page opens and read correctly with no
 * script, so the prerendered HTML has to carry a finished default result,
 * exactly one CTA under it, and the frame that keeps typed values out of
 * analytics.
 */
describe("free tool pages", () => {
  const renders = {
    "gmail-filter-generator": [GmailFilterGenerator, "&lt;!-- Receipts --&gt;"],
    "zapier-cost-calculator": [ZapierCostCalculator, "1,360"],
    "mcp-config-generator": [McpConfigGenerator, "claude_desktop_config.json"],
  } as const;

  for (const tool of tools) {
    it(`prerenders ${tool.slug} with a default result and one CTA`, () => {
      const [Component, expected] = renders[tool.slug as keyof typeof renders];
      const html = renderToString(createElement(Component, { cta }));
      expect(html).toContain(expected);
      expect(html.match(/data-cta/g)).toHaveLength(1);
      expect(html).toContain("ph-no-capture");
      expect(html).toContain('aria-live="polite"');
      expect(html).not.toMatch(DASHES);
      // Motion answers actions only: nothing in the first paint animates.
      expect(html).not.toMatch(/tool-(tick|pop|change|enter|drop)\b/);
    });

    it(`registers ${tool.slug} as an indexable route with FAQ markup`, () => {
      const route = canonicalRoutes.find(
        ({ path }) => path === `/tools/${tool.slug}`,
      )!;
      expect(route.kind).toBe("tool");
      expect(route.title.length).toBeLessThanOrEqual(65);
      expect(route.description.length).toBeLessThanOrEqual(160);
      expect(crawlerFiles["sitemap.xml"]).toContain(route.canonical);
      const types = routeJsonLd(route).map((node) => node["@type"]);
      expect(types).toEqual(
        expect.arrayContaining(["WebApplication", "FAQPage", "BreadcrumbList"]),
      );
      expect(JSON.stringify(tool)).not.toMatch(DASHES);
    });
  }

  it("lists every tool on an indexable /tools/ hub", () => {
    const hub = canonicalRoutes.find(({ path }) => path === "/tools")!;
    expect(hub.kind).toBe("tool-index");
    expect(hub.title.length).toBeLessThanOrEqual(65);
    expect(hub.description.length).toBeLessThanOrEqual(160);
    expect(crawlerFiles["sitemap.xml"]).toContain(hub.canonical);
    const collection = routeJsonLd(hub).find(
      (node) => node["@type"] === "CollectionPage",
    )!;
    expect(JSON.stringify(collection)).toContain(
      "/tools/mcp-config-generator/",
    );

    // Tool pages sit under the hub in their breadcrumb trail.
    const tool = canonicalRoutes.find(({ kind }) => kind === "tool")!;
    expect(JSON.stringify(routeJsonLd(tool))).toContain('"name":"Free tools"');
  });

  it("tells answer engines and agents about the tools", () => {
    expect(crawlerFiles["llms.txt"]).toContain(
      "/api/tools/zapier-cost-calculator",
    );
    expect(crawlerFiles["llms-full.txt"]).toContain("| Professional | 750 |");
    expect(crawlerFiles["openapi.json"]).toContain(
      "/api/tools/mcp-config-generator",
    );
  });
});

describe("agent tools", () => {
  it("runs every example and publishes an object schema", () => {
    for (const tool of agentTools) {
      expect(inputJsonSchema(tool)).toMatchObject({ type: "object" });
      expect(tool.run(tool.example)).toBeTruthy();
    }
  });

  // 960 tasks: 750 included plus 210 pay-per-task at 3.34 cents beats the
  // 1,500 tier ($39), which is the saving the calculator exists to show.
  it("carries Gmail filter names into the result and the file", () => {
    const gmail = agentTools.find(
      ({ slug }) => slug === "gmail-filter-generator",
    )!;
    const result = gmail.run(gmail.example) as {
      filters: { name?: string }[];
      mail_filters_xml: string;
    };
    expect(result.filters[0]!.name).toBe("Receipts");
    expect(result.mail_filters_xml).toContain("<!-- Receipts -->");
  });

  it("explains a bad call as short path and message pairs", () => {
    const zapier = agentTools.find(
      ({ slug }) => slug === "zapier-cost-calculator",
    )!;
    let caught: unknown;
    try {
      zapier.run({ zaps: [{ action_steps: 0, runs_per_month: 10 }] });
    } catch (error) {
      caught = error;
    }
    expect(toolIssues(caught)).toEqual([
      {
        path: "zaps.0.action_steps",
        message: "Too small: expected number to be >=1",
      },
    ]);
    expect(() => toolIssues(new Error("boom"))).toThrow("boom");
  });

  it("prices the Zapier example", () => {
    const zapier = agentTools.find(
      ({ slug }) => slug === "zapier-cost-calculator",
    )!;
    expect(zapier.run(zapier.example)).toMatchObject({
      monthly_tasks: 960,
      cheapest: {
        plan: "Professional",
        included_tasks: 750,
        total_usd_per_month: 27,
      },
      covering_plan: { included_tasks: 1500, total_usd_per_month: 39 },
    });
  });
});

describe("/api/tools", () => {
  const call = (path: string, init?: RequestInit) =>
    onRequest({
      request: new Request(`https://construct.computer${path}`, init),
      env: {},
    });

  it("lists and describes tools", async () => {
    const index = await (await call("/api/tools")).json();
    expect(index.tools).toHaveLength(3);
    const one = await call("/api/tools/gmail-filter-generator");
    expect(one.headers.get("access-control-allow-origin")).toBe("*");
    expect((await one.json()).example_request).toContain("?input=");
  });

  it("runs from a GET query and from a POST body", async () => {
    const input = { name: "docs", url: "https://example.com/mcp" };
    const get = await call(
      `/api/tools/mcp-config-generator?input=${encodeURIComponent(JSON.stringify(input))}`,
    );
    expect((await get.json()).clients).toHaveLength(5);
    const post = await call("/api/tools/zapier-cost-calculator", {
      method: "POST",
      body: JSON.stringify({ zaps: [{ action_steps: 1, runs_per_month: 50 }] }),
    });
    expect((await post.json()).cheapest.plan).toBe("Free");
  });

  it("rejects bad input with the documented codes", async () => {
    const bad = await call("/api/tools/zapier-cost-calculator?input=%7B%7D");
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe("invalid_request");
    expect((await call("/api/tools/nope")).status).toBe(404);
    expect((await call("/api/tools", { method: "PUT" })).status).toBe(405);
  });
});

describe("WebMCP origin trial", () => {
  /**
   * Chrome only exposes WebMCP to visitors when the page carries a token for
   * this exact origin and feature. A token for another origin fails silently,
   * so check the signed payload. Expiry is deliberately not asserted: a test
   * that starts failing on 30 March 2027 would block unrelated deploys.
   */
  it("sends a token for this site and feature on every page", () => {
    const headers = readFileSync(
      new URL("../public/_headers", import.meta.url),
      "utf8",
    );
    const siteBlock = headers
      .split(/\n(?=\S)/)
      .find((block) => block.startsWith("/*\n"))!;
    const token = /^ {2}Origin-Trial: (\S+)$/m.exec(siteBlock)?.[1];
    expect(token).toBeDefined();
    const bytes = Buffer.from(token!, "base64");
    const payload = JSON.parse(bytes.subarray(69).toString("utf8"));
    expect(payload).toMatchObject({
      origin: `${siteUrl}:443`,
      feature: "WebMCP",
    });
  });
});
