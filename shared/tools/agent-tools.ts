import { ZodError, z } from "zod";

import {
  CATEGORIES,
  emptyFilter,
  filterProblems,
  filtersXml,
  searchQuery,
  type GmailFilter,
} from "./gmail-filter";
import { clientConfigs, serverProblems } from "./mcp-config";
import {
  ZAPIER_PRICES_CHECKED,
  ZAPIER_PRICING_URL,
  estimateZapier,
  type Quote,
} from "./zapier-pricing";

/**
 * The free tools as agent tools: one definition each, used by WebMCP in the
 * browser (`document.modelContext.registerTool`) and by the GET/POST endpoints
 * at `/api/tools/<slug>`. Inputs are structured rather than the form's free
 * text, so an agent never has to guess at comma rules, and every input is
 * validated here before it reaches the same pure functions the pages use.
 */

// The client bundle tree-shakes Zod's default locale away, leaving every
// issue as "Invalid input". Agents need the specific message to fix a call.
z.config(z.locales.en());

const SITE = "https://construct.computer";
const terms = z.array(z.string().trim().min(1).max(200)).max(20).optional();

const gmailInput = z
  .object({
    filters: z
      .array(
        z
          .object({
            name: z
              .string()
              .trim()
              .max(80)
              .optional()
              .describe(
                "A name to tell filters apart. Gmail stores no names, so it is written as a comment in the XML.",
              ),
            from: terms.describe(
              "Sender addresses or @domain.com. Any one matches.",
            ),
            to: terms.describe("Recipient addresses. Any one matches."),
            subject: terms.describe(
              "Words or phrases in the subject. Any one matches.",
            ),
            has_words: terms.describe(
              "Words anywhere in the email. Gmail search operators allowed.",
            ),
            does_not_have: terms.describe("Words that keep an email out."),
            has_attachment: z.boolean().optional(),
            larger_than_mb: z.number().positive().max(50).optional(),
            smaller_than_mb: z.number().positive().max(50).optional(),
            label: z
              .string()
              .trim()
              .max(200)
              .optional()
              .describe(
                "Label to apply, nested with a slash like Clients/Acme.",
              ),
            skip_inbox: z.boolean().optional(),
            mark_read: z.boolean().optional(),
            star: z.boolean().optional(),
            never_spam: z.boolean().optional(),
            importance: z.enum(["always", "never"]).optional(),
            delete: z.boolean().optional(),
            category: z
              .enum(
                CATEGORIES.map((entry) => entry.value) as [string, ...string[]],
              )
              .optional()
              .describe(
                "personal is Primary, promo is Promotions, notification is Updates, group is Forums.",
              ),
            forward_to: z.email().optional(),
          })
          .strict()
          .refine(
            (filter) => !(filter.larger_than_mb && filter.smaller_than_mb),
            "Use larger_than_mb or smaller_than_mb, not both.",
          ),
      )
      .min(1)
      .max(20),
  })
  .strict();

const zapierInput = z
  .object({
    zaps: z
      .array(
        z
          .object({
            name: z.string().max(200).optional(),
            action_steps: z
              .number()
              .int()
              .min(1)
              .max(100)
              .describe(
                "Action steps per run. Triggers, Filter, Paths, Formatter and Delay are free.",
              ),
            runs_per_month: z.number().int().min(0).max(10_000_000),
          })
          .strict(),
      )
      .min(1)
      .max(25),
    billing: z.enum(["annual", "monthly"]).default("annual"),
    team: z
      .boolean()
      .default(false)
      .describe(
        "True when several people share Zaps, which needs the Team plan.",
      ),
  })
  .strict();

const value = z
  .string()
  .regex(/^[^\r\n]*$/, "No line breaks.")
  .max(2000);
const envRecord = z.record(
  z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,99}$/),
  value,
);
const headerRecord = z.record(z.string().regex(/^[A-Za-z0-9-]{1,100}$/), value);

const mcpInput = z
  .object({
    name: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,64}$/)
      .describe("Server name: letters, numbers, - and _."),
    command: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .optional()
      .describe("For a local server, the command to run, like npx."),
    args: z.array(z.string().max(1000)).max(50).optional(),
    env: envRecord
      .optional()
      .describe("Environment variables for a local server."),
    url: z
      .url()
      .optional()
      .describe("For a remote server, its HTTP URL. Leave command empty."),
    headers: headerRecord
      .optional()
      .describe("HTTP headers for a remote server."),
  })
  .strict()
  .refine(
    (input) => Boolean(input.command) !== Boolean(input.url),
    "Give exactly one of command (local server) or url (remote server).",
  );

function toFilter(
  input: z.infer<typeof gmailInput>["filters"][number],
): GmailFilter {
  const join = (list?: string[]) => (list ?? []).join(", ");
  return {
    ...emptyFilter,
    name: input.name ?? "",
    from: join(input.from),
    to: join(input.to),
    subject: join(input.subject),
    hasWords: join(input.has_words),
    doesNotHave: join(input.does_not_have),
    hasAttachment: input.has_attachment ?? false,
    sizeOperator: input.larger_than_mb
      ? "larger"
      : input.smaller_than_mb
        ? "smaller"
        : "",
    sizeMb: String(input.larger_than_mb ?? input.smaller_than_mb ?? ""),
    label: input.label ?? "",
    skipInbox: input.skip_inbox ?? false,
    markRead: input.mark_read ?? false,
    star: input.star ?? false,
    neverSpam: input.never_spam ?? false,
    important: input.importance ?? "",
    trash: input.delete ?? false,
    category: (input.category ?? "") as GmailFilter["category"],
    forwardTo: input.forward_to ?? "",
  };
}

function dollars(cents: number) {
  return Math.round(cents) / 100;
}

function quoteJson(quote: Quote | null) {
  if (!quote) return null;
  return {
    plan: quote.plan,
    included_tasks: quote.tierTasks,
    plan_usd_per_month: dollars(quote.baseCents),
    pay_per_task_tasks: quote.overageTasks,
    pay_per_task_usd: dollars(quote.overageCents),
    total_usd_per_month: dollars(quote.totalCents),
    total_usd_per_year: dollars(quote.totalCents * 12),
  };
}

export type AgentTool = {
  /** WebMCP and URL name. */
  readonly name: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly schema: z.ZodType;
  readonly example: unknown;
  readonly run: (input: unknown) => unknown;
};

export const agentTools: readonly AgentTool[] = [
  {
    name: "gmail_filter_generator",
    slug: "gmail-filter-generator",
    title: "Gmail filter generator",
    description:
      "Builds Gmail filters. Returns a Gmail search string per filter, to preview matches in Gmail's search bar, and a mailFilters.xml file the user imports in Gmail under Settings, Filters and Blocked Addresses, Import filters. Each filter needs at least one condition and one action.",
    schema: gmailInput,
    example: {
      filters: [
        {
          name: "Receipts",
          from: ["billing@stripe.com", "@paddle.com"],
          subject: ["receipt", "invoice"],
          label: "Receipts",
          skip_inbox: true,
        },
      ],
    },
    run(raw) {
      const filters = gmailInput.parse(raw).filters.map(toFilter);
      return {
        filters: filters.map((filter) => ({
          ...(filter.name ? { name: filter.name } : {}),
          search_query: searchQuery(filter),
          problems: filterProblems(filter),
        })),
        mail_filters_xml: filtersXml(filters),
        import_steps:
          "Gmail on a computer: gear icon, See all settings, Filters and Blocked Addresses, Import filters, choose mailFilters.xml, Open file, Create filters. Create new labels first.",
        made_with: `${SITE}/tools/gmail-filter-generator/`,
      };
    },
  },
  {
    name: "zapier_cost_calculator",
    slug: "zapier-cost-calculator",
    title: "Zapier cost calculator",
    description: `Estimates a monthly Zapier bill from a list of Zaps (action steps and runs per month). Returns monthly tasks, the cheapest plan including any pay-per-task overage, and the smallest plan that covers the tasks outright. Uses Zapier list prices checked on ${ZAPIER_PRICES_CHECKED}.`,
    schema: zapierInput,
    example: {
      zaps: [
        {
          name: "New lead to CRM and Slack",
          action_steps: 2,
          runs_per_month: 300,
        },
        { name: "Paid invoice to sheet", action_steps: 3, runs_per_month: 120 },
      ],
      billing: "annual",
      team: false,
    },
    run(raw) {
      const input = zapierInput.parse(raw);
      const estimate = estimateZapier({
        zaps: input.zaps.map((zap) => ({
          steps: zap.action_steps,
          runs: zap.runs_per_month,
        })),
        billing: input.billing,
        team: input.team,
      });
      return {
        monthly_tasks: estimate.tasks,
        billing: input.billing,
        cheapest: quoteJson(estimate.cheapest),
        covering_plan: quoteJson(estimate.covering),
        notes: [
          "A task is one successful action step. Triggers, Filter, Paths, Formatter and Delay steps are free.",
          "Pay-per-task overage only applies if it is switched on in Zapier, and stops at 3x the plan's tasks.",
          ...(estimate.cheapest
            ? []
            : [
                "Above Zapier's largest self-serve plan: Enterprise pricing via Zapier sales.",
              ]),
        ],
        prices_checked: ZAPIER_PRICES_CHECKED,
        source: ZAPIER_PRICING_URL,
        made_with: `${SITE}/tools/zapier-cost-calculator/`,
      };
    },
  },
  {
    name: "mcp_config_generator",
    slug: "mcp-config-generator",
    title: "MCP config generator",
    description:
      "Writes MCP server configuration for Claude Desktop, Claude Code, Cursor, VS Code and Codex from one description of the server. Give command (and args, env) for a local server, or url (and headers) for a remote one. Returns each client's file location and paste-ready snippet.",
    schema: mcpInput,
    example: {
      name: "filesystem",
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/you/Documents",
      ],
    },
    run(raw) {
      const input = mcpInput.parse(raw);
      const lines = (
        entries: Record<string, string> | undefined,
        separator: string,
      ) =>
        Object.entries(entries ?? {})
          .map(([key, value]) => `${key}${separator}${value}`)
          .join("\n");
      const server = {
        name: input.name,
        transport: input.url ? ("remote" as const) : ("local" as const),
        command: input.command ?? "",
        args: (input.args ?? []).join("\n"),
        env: lines(input.env, "="),
        url: input.url ?? "",
        headers: lines(input.headers, ": "),
      };
      const problems = serverProblems(server);
      if (problems.length) return { problems };
      return {
        clients: clientConfigs(server).map((client) => ({
          client: client.name,
          where: client.where,
          snippets: client.snippets,
          ...(client.note ? { note: client.note } : {}),
        })),
        made_with: `${SITE}/tools/mcp-config-generator/`,
      };
    },
  },
];

export function getAgentTool(slug: string): AgentTool | undefined {
  return agentTools.find((tool) => tool.slug === slug);
}

/** JSON Schema for an agent tool's input, generated from its Zod schema. */
export function inputJsonSchema(tool: AgentTool): Record<string, unknown> {
  const schema = z.toJSONSchema(tool.schema, {
    io: "input",
    unrepresentable: "any",
  }) as Record<string, unknown>;
  // The draft URL means nothing to an agent and WebMCP does not want it.
  delete schema.$schema;
  return schema;
}

export type ToolIssue = { readonly path: string; readonly message: string };

/**
 * Validation failures as short `{ path, message }` pairs an agent can act on,
 * shared by the HTTP endpoint and WebMCP so both answer a bad call the same
 * way. Anything else is a real fault and is rethrown.
 */
export function toolIssues(caught: unknown): ToolIssue[] {
  if (!(caught instanceof ZodError)) throw caught;
  return caught.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
