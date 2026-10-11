import { describe, expect, it } from "vitest";

import {
  commentName,
  emptyFilter,
  filterProblems,
  filtersXml,
  searchQuery,
  type GmailFilter,
} from "../../../shared/tools/gmail-filter";
import {
  clientConfigs,
  serverProblems,
  type McpServer,
} from "../../../shared/tools/mcp-config";
import {
  estimateZapier,
  formatCents,
  monthlyTasks,
} from "../../../shared/tools/zapier-pricing";

describe("zapier cost", () => {
  it("counts action steps times runs", () => {
    expect(
      monthlyTasks([
        { steps: 2, runs: 300 },
        { steps: 3, runs: 120 },
      ]),
    ).toBe(960);
  });

  it("keeps a two-step Zap under 100 tasks on Free", () => {
    const estimate = estimateZapier({
      zaps: [{ steps: 1, runs: 90 }],
      billing: "monthly",
      team: false,
    });
    expect(estimate.cheapest?.plan).toBe("Free");
  });

  it("never offers Free to a multi-step Zap", () => {
    const estimate = estimateZapier({
      zaps: [{ steps: 2, runs: 10 }],
      billing: "annual",
      team: false,
    });
    expect(estimate.cheapest).toMatchObject({
      plan: "Professional",
      tierTasks: 750,
      totalCents: 1999,
    });
  });

  it("finds the covering tier and a cheaper pay-per-task option", () => {
    // 1,600 tasks: the 2,000 tier covers it at $73.50, but 1,500 plus 100
    // pay-per-task tasks at 4.88 cents is $58.50 + $4.88.
    const estimate = estimateZapier({
      zaps: [{ steps: 2, runs: 800 }],
      billing: "monthly",
      team: false,
    });
    expect(estimate.covering).toMatchObject({
      tierTasks: 2000,
      totalCents: 7350,
    });
    expect(estimate.cheapest).toMatchObject({
      tierTasks: 1500,
      overageTasks: 100,
      totalCents: 5850 + 488,
    });
  });

  it("prices Team on its own tiers and stops at the 3x ceiling", () => {
    const team = estimateZapier({
      zaps: [{ steps: 1, runs: 100 }],
      billing: "annual",
      team: true,
    });
    expect(team.cheapest).toMatchObject({ plan: "Team", totalCents: 6900 });

    const huge = estimateZapier({
      zaps: [{ steps: 1, runs: 7_000_000 }],
      billing: "annual",
      team: false,
    });
    expect(huge.covering).toBeNull();
    expect(huge.cheapest).toBeNull();
  });

  it("formats whole and fractional dollars", () => {
    expect(formatCents(1999)).toBe("$19.99");
    expect(formatCents(114900)).toBe("$1,149");
  });
});

describe("gmail filter", () => {
  const receipts: GmailFilter = {
    ...emptyFilter,
    from: "billing@stripe.com, receipts@paddle.com",
    subject: "receipt, order confirmation",
    doesNotHave: "unsubscribe",
    hasAttachment: true,
    label: "Receipts & Invoices",
    skipInbox: true,
  };

  it("builds a Gmail search string", () => {
    expect(searchQuery(receipts)).toBe(
      'from:(billing@stripe.com OR receipts@paddle.com) subject:(receipt OR "order confirmation") -unsubscribe has:attachment',
    );
  });

  it("writes escaped import XML with Gmail's property names", () => {
    const xml = filtersXml([receipts]);
    expect(xml).toContain(
      '<apps:property name="from" value="billing@stripe.com OR receipts@paddle.com"></apps:property>',
    );
    expect(xml).toContain(
      '<apps:property name="subject" value="(receipt OR &quot;order confirmation&quot;)"></apps:property>',
    );
    expect(xml).toContain(
      '<apps:property name="hasTheWord" value="-unsubscribe has:attachment"></apps:property>',
    );
    expect(xml).toContain('name="label" value="Receipts &amp; Invoices"');
    expect(xml).toContain('name="shouldArchive" value="true"');
    expect(xml.match(/<entry>/g)).toHaveLength(1);
  });

  it("leaves out filters with no condition or no action", () => {
    expect(filterProblems({ ...emptyFilter, label: "X" })).toEqual([
      "Add at least one condition.",
    ]);
    expect(filterProblems({ ...emptyFilter, from: "a@b.co" })).toEqual([
      "Pick at least one action.",
    ]);
    expect(filtersXml([{ ...emptyFilter, from: "a@b.co" }])).not.toContain(
      "<entry>",
    );
  });

  it("writes each filter's name as a comment above its entry", () => {
    const xml = filtersXml([{ ...receipts, name: "Receipts" }]);
    expect(xml).toContain("  <!-- Receipts -->\n  <entry>");
    // Gmail reads entries, not comments, so the entry itself is unchanged.
    expect(xml).toContain("<title>Mail Filter</title>");
  });

  it("keeps names that would break an XML comment safe", () => {
    expect(commentName("a -- b --> c-")).toBe("a - b -> c");
    expect(commentName("line\nbreak")).toBe("line break");
    expect(commentName("x".repeat(100))).toHaveLength(80);
    expect(filtersXml([{ ...receipts, name: "  " }])).not.toContain("<!--");
  });

  it("adds size and category", () => {
    const big: GmailFilter = {
      ...emptyFilter,
      sizeOperator: "larger",
      sizeMb: "10",
      category: "promo",
    };
    expect(searchQuery(big)).toBe("larger:10M");
    expect(filtersXml([big])).toContain(
      'name="smartLabelToApply" value="^smartlabel_promo"',
    );
  });
});

describe("mcp config", () => {
  const local: McpServer = {
    name: "filesystem",
    transport: "local",
    command: "npx",
    args: "-y\n@modelcontextprotocol/server-filesystem\n/Users/me/My Docs",
    env: "API_KEY=abc 123",
    url: "",
    headers: "",
  };

  it("writes Claude Desktop JSON and a quoted Claude Code command", () => {
    const [desktop, code] = clientConfigs(local);
    expect(JSON.parse(desktop!.snippets[0]!.code)).toEqual({
      mcpServers: {
        filesystem: {
          command: "npx",
          args: [
            "-y",
            "@modelcontextprotocol/server-filesystem",
            "/Users/me/My Docs",
          ],
          env: { API_KEY: "abc 123" },
        },
      },
    });
    expect(code!.snippets[0]!.code).toBe(
      "claude mcp add --env 'API_KEY=abc 123' --transport stdio filesystem -- npx -y @modelcontextprotocol/server-filesystem '/Users/me/My Docs'",
    );
  });

  it("uses each client's key for remote servers", () => {
    const remote: McpServer = {
      ...local,
      name: "github",
      transport: "remote",
      url: "https://api.githubcopilot.com/mcp/",
      headers: "Authorization: Bearer TOKEN",
    };
    const byId = Object.fromEntries(
      clientConfigs(remote).map((client) => [client.id, client]),
    );
    expect(JSON.parse(byId.vscode!.snippets[0]!.code)).toEqual({
      servers: {
        github: {
          type: "http",
          url: "https://api.githubcopilot.com/mcp/",
          headers: { Authorization: "Bearer TOKEN" },
        },
      },
    });
    expect(
      JSON.parse(byId.cursor!.snippets[0]!.code).mcpServers.github,
    ).toEqual({
      url: "https://api.githubcopilot.com/mcp/",
      headers: { Authorization: "Bearer TOKEN" },
    });
    expect(byId.codex!.snippets[0]!.code).toBe(
      '[mcp_servers.github]\nurl = "https://api.githubcopilot.com/mcp/"\nhttp_headers = { "Authorization" = "Bearer TOKEN" }',
    );
    expect(byId["claude-code"]!.snippets[0]!.code).toBe(
      "claude mcp add --transport http github https://api.githubcopilot.com/mcp/ --header 'Authorization: Bearer TOKEN'",
    );
  });

  it("rejects names and env lines the clients would choke on", () => {
    expect(
      serverProblems({ ...local, name: "my server", env: "NOPE" }),
    ).toEqual([
      "Name the server with letters, numbers, - or _ only.",
      "Write each environment variable as KEY=value.",
    ]);
  });
});
