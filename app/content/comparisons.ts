export type ComparisonRow = {
  readonly feature: string;
  readonly construct: string;
  readonly competitor: string;
};

export type ComparisonPage = {
  readonly slug: string;
  readonly title: string;
  readonly competitor: string;
  readonly description: string;
  readonly summary: string;
  readonly updated: string;
  readonly methodology: string;
  readonly sources: readonly { readonly label: string; readonly url: string }[];
  readonly relatedResources: readonly {
    readonly label: string;
    readonly path: string;
  }[];
  readonly sections: readonly {
    readonly title: string;
    readonly body: string;
  }[];
  readonly comparisonTable: readonly ComparisonRow[];
  readonly whenToChoose: {
    readonly construct: readonly string[];
    readonly competitor: readonly string[];
  };
};

const methodology =
  "Editorial capability comparison based on public vendor documentation and product scope as of the updated date; it is not a hands-on benchmark or performance test.";

export const comparisonPages: readonly ComparisonPage[] = [
  {
    slug: "chatgpt",
    title: "Construct vs chat assistants",
    competitor: "Chat assistants (ChatGPT, Claude, and Gemini)",
    description:
      "Compare Construct with chat assistants such as ChatGPT, Claude, and Gemini across workspace, tools, memory, schedules, and workflows.",
    summary:
      "Chat assistants combine conversation with product- and plan-dependent tools. Construct centers those capabilities in a persistent work OS for files, memory, schedules, workflows, terminal commands, live browser runs, and connected apps.",
    updated: "2026-07-20",
    methodology,
    sources: [
      {
        label: "OpenAI: ChatGPT capabilities overview",
        url: "https://help.openai.com/en/articles/9260256-chatgpt-capabilities-overview",
      },
      {
        label: "OpenAI: Scheduled Tasks in ChatGPT",
        url: "https://help.openai.com/en/articles/10291617-tasks-in-chatgpt",
      },
      {
        label: "Anthropic: Get started with Claude",
        url: "https://support.claude.com/en/articles/8114491-getting-started-with-claude",
      },
      {
        label: "Google: Connect Workspace to Gemini Apps",
        url: "https://support.google.com/gemini/answer/15229592",
      },
    ],
    relatedResources: [
      {
        label: "Chat assistants vs AI employees",
        path: "/blog/chat-assistants-vs-ai-employees/",
      },
      {
        label: "AI employee product guide",
        path: "/blog/ai-employee/",
      },
      { label: "AI agent memory guide", path: "/blog/ai-agent-memory/" },
    ],
    sections: [
      {
        title: "Conversation vs execution",
        body: "Chat assistants are centered on conversation, while their tools and actions vary by product and plan. Construct is centered on assigned outcomes — research a market and email a PDF, review its native inbox, or update Linear from Slack — using a persistent work OS, including scheduled work while you are offline.",
      },
      {
        title: "Persistence and inspection",
        body: "A conversation can preserve messages, but business work also depends on files, procedures, schedules, and facts that change over time. Construct keeps those parts in one workspace. Its long-term memory is inspectable and correctable, while the Activity feed keeps bounded action summaries and best-effort reasons. Bounded tool details remain in chat.",
      },
      {
        title: "Recurring and cross-app work",
        body: "Chat is often the right interface for starting a job, but it should not be the only place the work can live. You or the agent can encode a repeatable process as a versioned linear workflow, schedule it through Construct's Calendar, and act through connected applications. The resulting files and run history remain available after the conversation ends.",
      },
      {
        title: "The practical boundary",
        body: "Choose a chat assistant when conversation, drafting, research, or its available tools fit the job. Choose Construct when the request needs a persistent work OS, several execution surfaces, recurring operation, or a visible record of what was completed.",
      },
    ],
    comparisonTable: [
      {
        feature: "Category",
        construct: "AI employee in a persistent work OS",
        competitor: "Conversational AI products with expanding tools",
      },
      {
        feature: "Execution",
        construct: "Browser, terminal, and connected-app actions",
        competitor: "Tool and app actions vary by product and plan",
      },
      {
        feature: "Continuity",
        construct: "Workspace files and controlled memory",
        competitor:
          "Chat history, projects, and memory vary by product and plan",
      },
      {
        feature: "Integrations",
        construct: "Live integration catalog; agent can act directly",
        competitor:
          "Connected apps and actions vary by product, plan, and settings",
      },
      {
        feature: "Proof",
        construct:
          "Activity summaries, chat tool records, files, and sent messages",
        competitor:
          "Responses, citations, and activity controls vary by product",
      },
      {
        feature: "Recurring work",
        construct: "Native schedules and reusable workflows",
        competitor:
          "Scheduling and automation are available in some products and plans",
      },
      {
        feature: "Reach",
        construct: "Web, Slack, Telegram, Discord slash commands, and email",
        competitor: "Web, desktop, and mobile; other channels vary by product",
      },
    ],
    whenToChoose: {
      construct: [
        "Recurring autonomous tasks",
        "Cross-app workflows",
        "Scheduled background work",
        "Proof of what the agent did",
      ],
      competitor: [
        "Drafting and brainstorming",
        "One-shot Q&A",
        "No tool execution needed",
      ],
    },
  },
  {
    slug: "copilot",
    title: "Construct vs Microsoft Copilot",
    competitor: "Microsoft Copilot and Google Workspace AI",
    description:
      "Compare Construct with Microsoft Copilot and Google Workspace AI. See how one vendor-neutral AI employee works across apps from a persistent workspace.",
    summary:
      "Microsoft Copilot and Google Workspace AI are strongest inside their own suites. Construct provides a vendor-neutral workspace for jobs that cross applications, live browser runs, files, and scripts.",
    updated: "2026-07-20",
    methodology,
    sources: [
      {
        label: "Microsoft: Microsoft 365 Copilot overview",
        url: "https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-overview",
      },
      {
        label: "Google: AI tools for Google Workspace",
        url: "https://workspace.google.com/solutions/ai/",
      },
    ],
    relatedResources: [
      {
        label: "AI employee product guide",
        path: "/blog/ai-employee/",
      },
      {
        label: "AI workflow automation guide",
        path: "/blog/ai-workflow-automation/",
      },
      {
        label: "What is an AI employee?",
        path: "/blog/what-is-an-ai-employee/",
      },
    ],
    sections: [
      {
        title: "Vendor-neutral by design",
        body: "Suite copilots optimize for Microsoft 365 or Google Workspace. Construct can link supported tools such as Gmail, Linear, GitHub, Notion, and HubSpot through its live integration catalog, while Slack is also available as a messaging channel.",
      },
      {
        title: "Execution beyond suite suggestions",
        body: "Construct gives the agent a sandbox terminal, live browser runs, persistent files, a native inbox, schedules, and workflows. The user sees these surfaces together in a purpose-built web desktop. Workspace files persist, while live browser runs and shell state are bounded execution surfaces.",
      },
      {
        title: "Memory and procedures across tools",
        body: "Suite copilots can use the context available in their ecosystem. Construct is designed to carry context across the wider job: a customer message, a workspace file, a CRM update, a browser research step, and a scheduled follow-up. Useful context can be stored in inspectable memory, while repeatable work can become a versioned workflow.",
      },
      {
        title: "Where suite copilots still win",
        body: "If nearly all work happens inside Microsoft 365 or Google Workspace and the main need is inline drafting, summarization, or spreadsheet help, the native copilot may be the shortest path. Construct becomes more useful when execution crosses vendors or needs live browser work, a sandbox terminal, scheduling, and an inspectable work record.",
      },
    ],
    comparisonTable: [
      {
        feature: "Best fit",
        construct: "Cross-vendor jobs and recurring operations",
        competitor: "Work inside its native suite",
      },
      {
        feature: "Workspace",
        construct: "Files, browser, terminal, inbox, memory, workflows",
        competitor: "Suite documents and applications",
      },
      {
        feature: "Execution",
        construct: "Connected apps plus browser and sandbox tools",
        competitor: "Native suite actions",
      },
      {
        feature: "Memory",
        construct: "Inspectable, correctable long-term memory",
        competitor: "Product-specific context",
      },
      {
        feature: "Scheduling",
        construct: "Agent jobs and workflow runs",
        competitor: "Suite-dependent automation",
      },
      {
        feature: "Supervision",
        construct: "Web-desktop outputs and bounded Activity summaries",
        competitor: "Copilot interaction history",
      },
    ],
    whenToChoose: {
      construct: [
        "Work spans multiple SaaS vendors",
        "Need scripts, terminal, or custom browser flows",
        "Want one agent across Slack, email, and issue trackers",
      ],
      competitor: [
        "Entire workflow lives inside Microsoft 365 or Google Workspace",
        "Inline drafting inside Office or Docs is enough",
      ],
    },
  },
  {
    slug: "zapier",
    title: "Construct vs Zapier",
    competitor: "Zapier, Make, and n8n",
    description:
      "Automation builders need predefined flows. Construct handles ambiguous, multi-step goals where the path is not known upfront — an AI employee, not a flowchart.",
    summary:
      "Zapier, Make, and n8n excel when you know every trigger and action upfront. Construct plans and executes when the goal is clear but the steps are not.",
    updated: "2026-07-20",
    methodology,
    sources: [
      {
        label: "Zapier: Zap limits",
        url: "https://help.zapier.com/hc/en-us/articles/8496181445261-Zap-limits",
      },
      {
        label: "Make: Product overview",
        url: "https://www.make.com/en/product",
      },
      {
        label: "n8n: Build your first workflow",
        url: "https://docs.n8n.io/build-your-first-workflow.md",
      },
    ],
    relatedResources: [
      {
        label: "AI agent vs Zapier automation",
        path: "/blog/ai-agent-vs-zapier/",
      },
      {
        label: "AI workflow automation guide",
        path: "/blog/ai-workflow-automation/",
      },
      {
        label: "AI employee product guide",
        path: "/blog/ai-employee/",
      },
    ],
    sections: [
      {
        title: "Flows vs goals",
        body: "Automation tools require you to wire triggers to actions. Construct takes an outcome — 'every Monday, summarize competitor pricing and post to Slack' — and figures out the browser, API, and file steps.",
      },
      {
        title: "Handles ambiguity",
        body: "When inbox review needs judgment or research spans multiple sites, a fixed mapping can become brittle. Construct can use an agent step to interpret the situation, then continue through connected-app actions, live browser work, files, or in-app notifications. That flexibility is useful when inputs vary but the desired outcome stays consistent.",
      },
      {
        title: "Reusable workflows without pretending everything is fixed",
        body: "Construct also supports durable workflows. A workflow can combine agent reasoning, connected-app tools, and in-app notifications, then run on demand or from the native Calendar. Current workflows are intentionally linear; branching, delays, approval steps, fan-out, and subworkflows are not yet supported.",
      },
      {
        title: "When deterministic automation is better",
        body: "A traditional automation platform is usually better for high-volume trigger-action flows where every input and transformation is known, predictable, and easy to test. Construct is better when the task requires reading, judgment, research, file creation, or recovery through a browser or terminal before the next step can be chosen.",
      },
    ],
    comparisonTable: [
      {
        feature: "Starting point",
        construct: "An outcome or reusable procedure",
        competitor: "A predefined trigger",
      },
      {
        feature: "Ambiguity",
        construct: "Agent can interpret changing inputs",
        competitor: "Best with deterministic mappings",
      },
      {
        feature: "Execution",
        construct: "Apps, live browser, terminal, files, in-app notifications",
        competitor: "Configured connectors and code steps",
      },
      {
        feature: "Scheduling",
        construct: "Native Calendar for agent jobs and workflows",
        competitor: "Triggers and platform schedules",
      },
      {
        feature: "Workflow shape",
        construct: "Linear, versioned runs",
        competitor: "Rich branching and visual flow control",
      },
      {
        feature: "Best use",
        construct: "Knowledge work with judgment",
        competitor: "Reliable high-volume automation",
      },
    ],
    whenToChoose: {
      construct: [
        "Goals are clear but steps are not",
        "Tasks need judgment or research",
        "You want one agent instead of dozens of zaps",
      ],
      competitor: [
        "Trigger-action pairs are fixed and repeatable",
        "No AI planning needed",
        "You prefer visual flow builders",
      ],
    },
  },
  {
    slug: "coding-agents",
    title: "Construct vs coding agents",
    competitor: "Coding-only AI agents",
    description:
      "Compare Construct with coding agents. See when a generalist AI employee for email, research, calendar, CRM, and code is the better fit.",
    summary:
      "Tools like Devin-style coding agents focus on repositories and terminals. Construct is a generalist AI employee for the whole business stack.",
    updated: "2026-07-20",
    methodology,
    sources: [
      {
        label: "Cognition: Introducing Devin",
        url: "https://docs.devin.ai/get-started/devin-intro",
      },
      {
        label: "GitHub: About Copilot cloud agent",
        url: "https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent",
      },
      {
        label: "Anthropic: Claude Code overview",
        url: "https://docs.anthropic.com/en/docs/claude-code/overview",
      },
    ],
    relatedResources: [
      {
        label: "AI employee product guide",
        path: "/blog/ai-employee/",
      },
      {
        label: "What is an AI employee?",
        path: "/blog/what-is-an-ai-employee/",
      },
      {
        label: "AI workflow automation guide",
        path: "/blog/ai-workflow-automation/",
      },
    ],
    sections: [
      {
        title: "Beyond the repo",
        body: "Coding agents shine in pull requests and refactors. Construct can read and reply from its native inbox, update spreadsheets, schedule Construct jobs, create Google Calendar events when that app is connected, and post in Slack.",
      },
      {
        title: "A shared work desktop",
        body: "Construct exposes live browser work, a read-only terminal transcript, files, inbox, Calendar, workflows, memories, connected apps, notifications, and Activity summaries in one web desktop. Non-engineers can inspect outputs and interrupt a running turn without learning a repository-centric interface.",
      },
      {
        title: "Where the boundary matters",
        body: "A coding agent is the specialist when success means a tested pull request. Construct is the generalist when the same job also requires reading customer email, researching the market, updating a CRM, scheduling a follow-up, and sharing the result. It can still use a terminal and repository, but code is one step in a broader business workflow.",
      },
      {
        title: "Parallel work beyond software delivery",
        body: "Construct can delegate bounded subtasks to temporary agents and synthesize their results. Plans allow 2, 4, or 8 temporary jobs to run concurrently; additional jobs queue, and browser or terminal work can still contend for shared execution surfaces. A dedicated coding agent may provide deeper repository-specific planning and development ergonomics.",
      },
    ],
    comparisonTable: [
      {
        feature: "Primary job",
        construct: "Cross-app business work",
        competitor: "Software engineering",
      },
      {
        feature: "Tools",
        construct: "Browser, terminal, files, inbox, apps, workflows",
        competitor: "Repository, terminal, CI, pull requests",
      },
      {
        feature: "Audience",
        construct: "Operators and technical teams",
        competitor: "Software teams",
      },
      {
        feature: "Scheduling",
        construct: "Recurring agent jobs and workflows",
        competitor: "Product-dependent",
      },
      {
        feature: "Memory",
        construct: "User-controlled long-term memory",
        competitor: "Repository and task context",
      },
      {
        feature: "Output",
        construct: "Files, messages, app updates, and code",
        competitor: "Tested code changes",
      },
    ],
    whenToChoose: {
      construct: [
        "Ops, research, email, and docs matter as much as code",
        "Non-engineers need to supervise the agent",
        "Cross-app business workflows",
      ],
      competitor: [
        "Primary job is software engineering in a repo",
        "Team is all developers",
      ],
    },
  },
  {
    slug: "diy",
    title: "Construct vs building your own agent",
    competitor: "DIY agent stacks",
    description:
      "Building your own agent means wiring sandbox, apps, channels, memory, schedules, and user-facing activity summaries yourself. Construct provides those pieces as a hosted product.",
    summary:
      "Agent frameworks are flexible but operationally heavy. Construct ships the web desktop, integration plane, messaging channels, sandbox, memory, scheduling, and Activity feed as one hosted product.",
    updated: "2026-07-20",
    methodology,
    sources: [
      {
        label: "OpenAI: Agents SDK",
        url: "https://openai.github.io/openai-agents-python/",
      },
      {
        label: "LangChain: LangGraph overview",
        url: "https://docs.langchain.com/oss/python/langgraph/overview",
      },
      {
        label: "Model Context Protocol: Introduction",
        url: "https://modelcontextprotocol.io/docs/getting-started/intro",
      },
    ],
    relatedResources: [
      {
        label: "AI employee product guide",
        path: "/blog/ai-employee/",
      },
      {
        label: "AI workflow automation guide",
        path: "/blog/ai-workflow-automation/",
      },
      { label: "AI agent memory guide", path: "/blog/ai-agent-memory/" },
    ],
    sections: [
      {
        title: "Hosted and integrated",
        body: "A DIY stack needs compute isolation, credential storage, channel bots, and a UI humans can trust. Construct bundles these so you assign tasks instead of maintaining infrastructure.",
      },
      {
        title: "Still flexible",
        body: "Bring your own model key on Pro, connect supported applications, or add a custom MCP server. The agent can use browser and sandbox tools when a structured integration is not enough. It can also build a constrained workspace application and add it to the desktop for a recurring internal process.",
      },
      {
        title: "What you would otherwise operate",
        body: "A production agent needs more than a prompt and model API. You must isolate compute, manage live browser tasks, connect business apps, schedule background jobs, retain memory, handle interruptions, and record activity. Construct provides those operating layers while leaving live browser, terminal, supported model-key, and extension options available when you need control.",
      },
      {
        title: "The maintenance tradeoff",
        body: "A DIY stack can match a precise security model, deployment environment, or internal platform. It also makes your team responsible for every model change, connector failure, browser timeout, queue, migration, and support surface. Construct is the shorter path when the goal is to operate an AI employee rather than build the infrastructure around one.",
      },
    ],
    comparisonTable: [
      {
        feature: "Time to start",
        construct: "Hosted product",
        competitor: "Build and integrate components",
      },
      {
        feature: "Execution",
        construct: "Browser, sandbox, files, apps",
        competitor: "Your chosen runtimes",
      },
      {
        feature: "Memory",
        construct: "Built-in, inspectable, correctable",
        competitor: "Design and operate it yourself",
      },
      {
        feature: "Channels",
        construct: "Web, Slack, Telegram, Discord slash commands, email",
        competitor: "Build each ingress",
      },
      {
        feature: "Operations",
        construct: "Managed scheduling and bounded Activity summaries",
        competitor: "Own queues, retries, logs, and upgrades",
      },
      {
        feature: "Control",
        construct: "Custom MCP, workspace apps, and model BYOK on Pro",
        competitor: "Complete architectural control",
      },
    ],
    whenToChoose: {
      construct: [
        "Want production-ready agent infrastructure now",
        "Need integrations and channels without building them",
        "Prefer metered SaaS over ops burden",
      ],
      competitor: [
        "Full control over every layer is mandatory",
        "Air-gapped or on-prem only",
        "You have a platform team to run it",
      ],
    },
  },
];

export function getComparison(slug: string): ComparisonPage | undefined {
  return comparisonPages.find((page) => page.slug === slug);
}
