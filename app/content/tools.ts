import type { BillingInterval, PaidPlanId } from "../platform/api/schemas";
import {
  formatCents,
  formatCount,
  zapierTiers,
} from "../../shared/tools/zapier-pricing";
import type { FaqItem } from "./faqs";

/** A static table under the tool: crawlable, quotable, and in llms-full.txt. */
export type ToolReference = {
  readonly heading: string;
  readonly intro: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly note?: string;
};

/**
 * Free tools at `/tools/<slug>/`. Each one works with no signup, renders a
 * finished default result in the prerendered HTML, and carries one call to
 * action under that result. The interactive parts live in
 * `app/features/tools/`; this file is the copy that search engines and the
 * route manifest read.
 */
export type ToolEntry = {
  readonly slug: string;
  /** Short name for the footer and breadcrumb. */
  readonly name: string;
  readonly seoTitle: string;
  readonly description: string;
  /** The H1. */
  readonly title: string;
  readonly lede: string;
  /** One or two sentences above the single CTA button. */
  readonly ctaPitch: string;
  readonly ctaLabel: string;
  /** Set when the label names a price, so a new reader lands on that checkout. */
  readonly ctaPlan?: PaidPlanId;
  readonly ctaInterval?: BillingInterval;
  /** Short topic shown on the /tools/ card. */
  readonly category: string;
  /** What the person walks away with, as chips on the /tools/ card. */
  readonly outputs: readonly string[];
  readonly reference: ToolReference;
  readonly faqs: readonly FaqItem[];
  /** Live posts only, the related links render as plain text links. */
  readonly relatedSlugs: readonly string[];
  /** Bump with a substantive change, it feeds the sitemap `lastmod`. */
  readonly updated: string;
};

/** Cents per task on annual billing, the cheapest way each tier is sold. */
function perTask(cents: number, tasks: number): string {
  return `${(cents / tasks).toFixed(2)} cents`;
}

const zapierRows = zapierTiers
  .filter((tier) => tier.tasks <= 100_000)
  .map((tier) => [
    tier.plan,
    formatCount(tier.tasks),
    formatCents(tier.annualCents),
    formatCents(tier.monthlyCents),
    perTask(tier.annualCents, tier.tasks),
  ]);

export const tools: readonly ToolEntry[] = [
  {
    slug: "gmail-filter-generator",
    name: "Gmail filter generator",
    seoTitle: "Gmail Filter Generator: Free XML Import | Construct Computer",
    description:
      "Build Gmail filters for multiple senders, domains and subjects, test each one in Gmail search, then import them all with one XML file. Free, no signup.",
    title: "Gmail filter generator",
    lede: "This free Gmail filter generator turns a few plain choices into filters Gmail can import. Set who an email comes from, what it says and what Gmail should do with it. You get a search string to test each filter and one mailFilters.xml file that imports them all, built in your browser so nothing you type is sent anywhere.",
    ctaPitch:
      "Filters match words, so a client asking for a quote and a cold pitch that use the same words end up in the same place. Construct reads each new email, sorts it into labels like Reply needed and FYI, and drafts the replies for you to check and send, from $9 a month.",
    ctaLabel: "Let Construct sort your inbox",
    category: "Email",
    outputs: ["Search strings", "mailFilters.xml", "Bulk import"],
    reference: {
      heading: "Gmail filter syntax cheat sheet",
      intro:
        "The generator writes these operators for you. They also work typed straight into Gmail's search bar or the Has the words box.",
      columns: ["Operator", "What it matches", "Example"],
      rows: [
        ["from:", "The sender, a full address or a domain", "from:@acme.com"],
        ["to:", "A recipient", "to:you+receipts@gmail.com"],
        ["subject:", "Words in the subject line", "subject:invoice"],
        [
          "OR",
          "Either term, written in capitals",
          "from:(amy@acme.com OR dan@acme.com)",
        ],
        ["-", "Leaves out emails with the word", "newsletter -unsubscribe"],
        ['" "', "An exact phrase", '"order confirmation"'],
        ["( )", "Groups terms together", "subject:(receipt OR invoice)"],
        [
          "has:attachment",
          "Emails with any attachment",
          "has:attachment from:@bank.com",
        ],
        ["filename:", "An attachment name or type", "filename:pdf"],
        ["larger: / smaller:", "Email size in bytes, K or M", "larger:10M"],
        ["list:", "Mailing list emails", "list:news@acme.com"],
      ],
    },
    faqs: [
      {
        question: "How do I import a filters XML file into Gmail?",
        answer:
          "Open Gmail on a computer, click the gear icon and choose See all settings. On the Filters and Blocked Addresses tab, click Import filters at the bottom, choose the mailFilters.xml file and click Open file. Tick the filters you want, then click Create filters.",
      },
      {
        question:
          "How do I filter emails from multiple senders or a whole domain?",
        answer:
          "Type the addresses in From, separated by commas, and the generator joins them with OR, which is the form Gmail needs: from:(amy@acme.com OR dan@acme.com). For everyone at a company, enter the domain on its own, like @acme.com. Gmail has no wildcard such as *, and the domain does the same job.",
      },
      {
        question: "Will a new filter sort the emails I already have?",
        answer:
          "Not on its own, because filters act on mail as it arrives. To sort older mail, open Settings, Filters and Blocked Addresses, click edit next to the filter, click Continue, tick Also apply filter to matching conversations and click Update filter.",
      },
      {
        question: "Can I create Gmail filters on an iPhone or Android phone?",
        answer:
          "Not in the Gmail app, which can't create, edit or import filters. You can build the file on your phone with this page, then import it from Gmail in a browser on a computer.",
      },
      {
        question: "Can a Gmail filter delete emails after 30 days?",
        answer:
          "No. A filter runs once, when an email arrives, so a rule like older_than:30d never matches new mail. To clear old mail, search for older_than:30d with your other conditions, select all the results and delete them, and repeat when you need to.",
      },
      {
        question: "Should I create my labels before importing?",
        answer:
          "Yes, that's the safe order. Create any new label in Gmail first, under Settings, Labels, Create new label, and type the name here exactly the same way, capitals included. For a nested label, use a slash, like Clients/Acme.",
      },
      {
        question: "Can a filter tell an urgent email from one that can wait?",
        answer:
          "Not really. A filter only checks the sender, the subject, words in the email and a few properties like size and attachments. It can't tell a client asking for a quote from a sales pitch that uses the same words. That kind of sorting needs something that reads the email, which is what an AI assistant like Construct does.",
      },
      {
        question: "Is anything I type sent to Construct?",
        answer:
          "No. The generator builds the search strings and the XML file in your browser, and this part of the page is excluded from our analytics and session recordings. We only count that a file was copied or downloaded, never what was in it.",
      },
    ],
    relatedSlugs: ["ai-agent-email-address", "ai-employee"],
    updated: "2026-10-11",
  },
  {
    slug: "zapier-cost-calculator",
    name: "Zapier cost calculator",
    seoTitle: "Zapier Cost Calculator: Tasks and Price | Construct Computer",
    description:
      "How much will Zapier cost you? Enter your Zaps, steps and runs to see your monthly tasks, the cheapest plan and your cost per task, at current Zapier prices.",
    title: "Zapier cost calculator",
    lede: "This free Zapier cost calculator works out your monthly bill from the Zaps you run. Add each Zap's action steps and how often it runs, and it counts tasks the way Zapier bills them, then finds your cheapest plan, including when a smaller plan plus pay-per-task costs less than the next tier up.",
    ctaPitch:
      "Zapier bills every action step, so the cost climbs with every run. Construct's AI agents run on a fixed monthly plan instead of a per-task bill, and they handle the steps that need reading and judgment, not only moving data between apps.",
    ctaLabel: "Start with Construct for $9",
    ctaPlan: "lite",
    ctaInterval: "month",
    category: "Automation",
    outputs: ["Monthly tasks", "Cheapest plan", "Cost per task"],
    reference: {
      heading: "Zapier pricing tiers",
      intro:
        "Professional and Team list prices in US dollars per month, from Zapier's pricing page on 11 October 2026. Cost per task is on annual billing with every included task used.",
      columns: [
        "Plan",
        "Tasks a month",
        "Annual billing",
        "Monthly billing",
        "Cost per task",
      ],
      rows: [["Free", "100", "$0", "$0", "0 cents"], ...zapierRows],
      note: "Tiers continue to 2,000,000 tasks a month on both plans. Above that, Zapier quotes Enterprise through its sales team.",
    },
    faqs: [
      {
        question: "How much does Zapier cost per month?",
        answer:
          "Zapier Professional starts at $19.99 a month billed annually, or $29.99 billed monthly, for 750 tasks. Team starts at $69 a month billed annually, or $103.50 monthly, for 2,000 tasks. The Free plan costs nothing and includes 100 tasks a month. Prices rise with the number of tasks you choose.",
      },
      {
        question: "What counts as a task in Zapier?",
        answer:
          "Each successful action step in a Zap run is one task. Triggers don't count, and neither do Filter, Paths, Formatter or Delay steps, steps that error, or steps that never ran because a filter stopped the Zap. So a Zap with a trigger and three actions that runs 100 times uses 300 tasks.",
      },
      {
        question: "How much does Zapier cost per task?",
        answer:
          "About 2.7 cents a task on the smallest Professional plan billed annually, or 4 cents billed monthly. The price per task falls as you buy more, to about 0.17 cents at 2 million tasks a month. Tasks you pay for but don't use still count toward the bill, so the real cost per task is higher if you sit well under your tier.",
      },
      {
        question: "What happens when I go over my Zapier task limit?",
        answer:
          "If pay-per-task billing is on, your Zaps keep running and each extra task costs more than the ones in your plan, about 1.25 times as much in Zapier's current plan data. That carries on up to three times your plan's task limit, and then Zaps pause until the next period. With pay-per-task off, Zaps pause as soon as you hit the limit.",
      },
      {
        question: "Is Zapier's Free plan enough?",
        answer:
          "Only if every Zap has two steps, one trigger and one action, and you stay under 100 tasks a month. Free also checks for new data every 15 minutes, against every 2 minutes on Professional and every minute on Team.",
      },
      {
        question: "When do I need Team instead of Professional?",
        answer:
          "When more than one person builds or manages Zaps. Team adds up to 25 users, shared Zaps and folders, shared app connections and SAML single sign-on, and it starts at 2,000 tasks for $69 a month billed annually. For one person, Professional costs less at every task level.",
      },
      {
        question: "Why is Zapier so expensive, and how can I lower the bill?",
        answer:
          "Zapier charges for every action step on every run, so a five-step Zap that runs 1,000 times uses 5,000 tasks. Put Filter steps as early as you can, since steps a filter stops never run and cost nothing, use the built-in Formatter instead of extra app steps where it works, and pay annually, which costs about a third less than monthly.",
      },
      {
        question: "How accurate is this calculator?",
        answer:
          "It uses the list prices on Zapier's pricing page, checked on 11 October 2026, and counts tasks the way Zapier's help center describes. It leaves out AI by Zapier steps and taxes, which can add to a real bill. For your exact usage, open the usage page in your Zapier account.",
      },
    ],
    relatedSlugs: [
      "construct-vs-zapier",
      "ai-agent-vs-zapier",
      "ai-workflow-automation",
    ],
    updated: "2026-10-11",
  },
  {
    slug: "mcp-config-generator",
    name: "MCP config generator",
    seoTitle: "MCP Config Generator for Claude, Cursor and VS Code",
    description:
      "Generate mcp.json and MCP config for Claude Desktop, Claude Code, Cursor, VS Code and Codex from one server. Local or remote, env vars and headers. Free.",
    title: "MCP config generator",
    lede: "This free MCP config generator writes the server config each AI client expects. Describe your server once, either a command to run or a URL to call, and copy the exact JSON or TOML for Claude Desktop, Claude Code, Cursor, VS Code and Codex, along with where to paste it. Any keys you type stay in your browser.",
    ctaPitch:
      "These clients only use your tools while your computer is on and the app is open. Construct gives an AI agent its own cloud computer, connects any remote MCP server by its HTTPS URL, and runs scheduled jobs with your laptop closed.",
    ctaLabel: "Connect your server to Construct",
    category: "AI setup",
    outputs: ["Claude", "Cursor", "VS Code", "Codex"],
    reference: {
      heading: "MCP config file locations",
      intro:
        "Where each client reads its MCP servers, and the key it expects at the top of the file.",
      columns: ["Client", "Config file", "Top-level key", "Remote servers"],
      rows: [
        [
          "Claude Desktop",
          "Mac: ~/Library/Application Support/Claude/claude_desktop_config.json. Windows: %APPDATA%\\Claude\\claude_desktop_config.json",
          "mcpServers",
          "Settings, Connectors, Add custom connector",
        ],
        [
          "Claude Code",
          ".mcp.json at the project root, or claude mcp add",
          "mcpServers",
          '"type": "http" with "url"',
        ],
        [
          "Cursor",
          ".cursor/mcp.json in a project, or ~/.cursor/mcp.json for all projects",
          "mcpServers",
          '"url" with optional "headers"',
        ],
        [
          "VS Code",
          ".vscode/mcp.json in the workspace",
          "servers",
          '"type": "http" with "url"',
        ],
        [
          "Codex",
          "~/.codex/config.toml, or .codex/config.toml in a trusted project",
          "[mcp_servers.<name>]",
          "url with optional http_headers",
        ],
      ],
    },
    faqs: [
      {
        question: "Where is the Claude Desktop config file?",
        answer:
          "On a Mac it's ~/Library/Application Support/Claude/claude_desktop_config.json, and on Windows it's %APPDATA%\\Claude\\claude_desktop_config.json. The quickest way to open it is Claude's Settings, then the Developer tab, then Edit Config. If the file doesn't exist yet, Edit Config creates it. Quit and reopen Claude after you save.",
      },
      {
        question: "How do I add a remote MCP server to Claude Desktop?",
        answer:
          "Remote servers don't go in claude_desktop_config.json. Open Settings, then Connectors, click Add and choose Add custom connector, paste the server's URL and click Add. If the server needs you to sign in, Claude walks you through it.",
      },
      {
        question:
          "What's the difference between a local and a remote MCP server?",
        answer:
          "A local server is a program the client starts on your computer, usually with npx, uvx or docker, and it talks to the client directly. A remote server runs somewhere else and you reach it by URL over HTTP. Local servers can read files on your machine, while remote ones keep working when your computer is off and a whole team can share them.",
      },
      {
        question: "How do I convert mcp.json to Codex's config.toml?",
        answer:
          "Each server in the mcpServers object becomes a [mcp_servers.<name>] table in ~/.codex/config.toml, with command and args as keys and environment variables in a [mcp_servers.<name>.env] table. Remote servers use url and http_headers. Describe the server once on this page and the Codex tab gives you the TOML.",
      },
      {
        question: "Should I commit .mcp.json or add it to .gitignore?",
        answer:
          "Commit it when it holds no secrets, since that's how Claude Code shares project servers with your team. Keys sit in these files as plain text, so keep them out of anything you commit. Files in your home folder, like ~/.cursor/mcp.json or ~/.codex/config.toml, stay on your machine.",
      },
      {
        question: "My MCP server doesn't show up. What should I check?",
        answer:
          "Quit the client completely and open it again, then check the file is valid JSON or TOML. Run the same command yourself in a terminal to see any errors it prints. File paths in arguments should be absolute, not relative.",
      },
      {
        question: "Is it safe to type API keys into this page?",
        answer:
          "Nothing you type is sent anywhere. The config is built in your browser, and this part of the page is excluded from our analytics and session recordings. We only count that a snippet was copied, never what was in it.",
      },
    ],
    relatedSlugs: [
      "ai-agent-with-its-own-computer",
      "running-ai-agents-on-cloudflare-not-vms",
      "construct-vs-coding-agents",
    ],
    updated: "2026-10-11",
  },
];

export function getTool(slug: string): ToolEntry | undefined {
  return tools.find((entry) => entry.slug === slug);
}
