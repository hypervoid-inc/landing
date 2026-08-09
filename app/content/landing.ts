export type PricingIcon =
  "footprints" | "workflow" | "cloud" | "timer" | "mail" | "tabs" | "key";

export type BillingPeriod = "monthly" | "annual";

export const pricingPlans = [
  {
    name: "Lite",
    price: "$9",
    annualMonthlyPrice: "$7.50",
    annualSavingsLabel: "2 months free",
    cta: "Start with Lite",
    description: "Try Construct for yourself",
    badge: null,
    highlight: "7-day trial",
    image: "/assets/landing/pricing/lite-v3.webp",
    imageAlt:
      "Construct mascot completing a focused task at a personal workspace",
    features: [
      ["Entry plan - start exploring", "footprints"],
      ["1 AI agent", "workflow"],
      ["Up to 50 steps per task", "footprints"],
      ["2 parallel background jobs", "tabs"],
      ["100 MB cloud storage", "cloud"],
      ["5-minute command runtime", "timer"],
    ],
  },
  {
    name: "Starter",
    price: "$59",
    annualMonthlyPrice: "$39",
    annualSavingsLabel: "4 months free",
    cta: "Put Starter to work",
    description: "Daily agent work with email & schedules",
    badge: "Recommended",
    highlight: null,
    image: "/assets/landing/pricing/starter-v3.webp",
    imageAlt:
      "Construct mascot connecting report, schedule, and workflow surfaces",
    features: [
      ["6× the usage of Lite", "footprints"],
      ["Agent email address", "mail"],
      ["Background & scheduled tasks", "tabs"],
      ["30-minute command runtime", "timer"],
      ["1 GB cloud storage", "cloud"],
      ["Up to 5 agents - coming soon", "workflow"],
    ],
  },
  {
    name: "Pro",
    price: "$299",
    annualMonthlyPrice: "$199",
    annualSavingsLabel: "4 months free",
    cta: "Go Pro",
    description: "Full desktop power + your own model keys",
    badge: null,
    highlight: null,
    image: "/assets/landing/pricing/pro-v3.webp",
    imageAlt:
      "Construct agents orchestrating browser, terminal, files, and schedules",
    features: [
      ["32× the usage of Lite", "footprints"],
      ["Deep runs - up to 1,000 steps per task", "footprints"],
      ["Background & scheduled tasks", "tabs"],
      ["1-hour command runtime", "timer"],
      ["3 GB cloud storage", "cloud"],
      ["Bring your own model keys (BYOK)", "key"],
      ["Up to 15 agents - coming soon", "workflow"],
    ],
  },
] as const satisfies ReadonlyArray<{
  name: string;
  price: string;
  annualMonthlyPrice: string;
  annualSavingsLabel: string;
  cta: string;
  description: string;
  badge: string | null;
  highlight: string | null;
  image: string;
  imageAlt: string;
  features: ReadonlyArray<readonly [string, PricingIcon]>;
}>;

export const landingFaq = [
  {
    question: "Who is Construct for?",
    answer:
      "Solo founders, early startups, and small businesses that need ops leverage without adding headcount or a full automation stack. If growth is capped by what you personally have time to touch, Construct is built for that gap.",
  },
  {
    question: "What is an AI employee?",
    answer:
      "An AI employee is an agent that can accept an outcome, choose tools, and complete multi-step work. Construct gives that agent a persistent workspace for files, memory, and schedules. It also provides reusable workflows, a native inbox, connected apps, live browser runs, and a sandbox terminal.",
  },
  {
    question: "How is Construct different from ChatGPT or Claude?",
    answer:
      "Chat assistants are excellent for answers and drafts. Construct is built for execution that persists beyond a thread: it can create files, run scheduled jobs, reuse linear workflows, and keep inspectable memory, chat tool records, and a full Activity audit log in one web desktop.",
  },
  {
    question: "What work can Construct complete?",
    answer:
      "Construct can research and write cited reports, analyze workspace files, read and send native email, use connected Gmail actions, update supported applications, run scripts, create artifacts, and delegate bounded subtasks to temporary agents. It is most useful when a job crosses several tools or needs to run again later.",
  },
  {
    question: "Can Construct run recurring work?",
    answer:
      "Yes. Construct's native Calendar schedules one-time or recurring agent jobs and workflow runs. You or the agent can encode a repeatable process as a reusable, versioned workflow. Each workflow can contain agent steps, connected-app actions, and in-app notifications.",
  },
  {
    question: "Which apps can Construct connect to?",
    answer:
      "Construct discovers supported applications from its live integration catalog, including tools such as Gmail, Google Calendar, Notion, Linear, Jira, GitHub, HubSpot, and Airtable. You can also connect custom MCP tools. Slack and Telegram accept direct messages; Discord currently uses slash commands.",
  },
  {
    question: "Can I see and control what the agent does?",
    answer:
      "Yes. The web desktop exposes files, live browser activity, terminal transcripts, workflows, memories, notifications, and chat tool records. Activity is a full audit log: every action the agent takes, what it affected, when it ran, and why. You can inspect results, interrupt a running turn, answer questions, and correct or forget long-term memory.",
  },
  {
    question: "Is my data private and secure?",
    answer:
      "Personal and team workspaces use scoped file, memory, and sandbox resources. Team members intentionally share team resources. Construct-stored model keys and Slack or Discord bot credentials are encrypted, while Composio manages its own OAuth connections. Activity keeps an audit log of every agent action with what it affected, when it ran, and why.",
  },
  {
    question: "How is Construct priced?",
    answer:
      "Construct offers Lite ($9/month) to try Construct yourself, Starter ($59/month) for daily agent work with native email and schedules, and Pro ($299/month) for deeper runs and BYOK. Annual billing lowers the monthly equivalent, with up to 4 months free on Starter and Pro. Plans increase task steps, concurrent temporary-agent jobs, storage, and scheduled-job capacity. Native agent email starts on Starter. Check the current pricing page before purchasing.",
  },
] as const;

export const workflowDemos = [
  {
    id: "workflows",
    title: "Turn Any Process",
    accent: "Into A Workflow",
    description:
      "Encode a process once with agent steps, connected apps, and notifications. Version it, schedule it, and anyone on the team can run it again.",
    cta: "Build a Workflow",
    mutedAction: "See a Complete Run",
    video: "/assets/landing/workflows/workflow.mp4",
    poster: "/assets/landing/workflows/workflow-poster.jpg",
    ariaLabel:
      "Construct building and running a reusable workflow in the product interface",
  },
  {
    id: "internal-tools",
    title: "Build Tools",
    accent: "For Your Work",
    description:
      "Describe the tool your team needs. Construct writes, validates, and publishes a working internal app directly into your cloud desktop.",
    cta: "Build an Internal Tool",
    mutedAction: "Watch Construct Ship an App",
    video: "/assets/landing/workflows/apps.mp4",
    poster: "/assets/landing/workflows/apps-poster.jpg",
    ariaLabel:
      "Construct building and opening an internal app in the product interface",
  },
  {
    id: "scheduling",
    title: "Schedule Outcomes",
    accent: "Not Reminders",
    description:
      "Schedule an agent prompt, connected-app action, or complete workflow. Construct runs it once or repeatedly and keeps the result history.",
    cta: "Schedule a Job",
    mutedAction: "View Automation History",
    video: "/assets/landing/workflows/calendar.mp4",
    poster: "/assets/landing/workflows/calendar-poster.jpg",
    ariaLabel:
      "Construct Calendar showing scheduled agent jobs and workflow runs",
  },
  /* Temporarily hidden until the parallel-agent demo is ready.
  {
    id: "parallel-agents",
    title: "Parallelize",
    accent: "The Busywork",
    description:
      "Construct splits large jobs across temporary specialist workers, runs independent tasks in parallel, and combines their results.",
    cta: "Delegate a Project",
    mutedAction: "Watch Parallel Workers",
    placeholder: {
      label: "Parallel agent workers",
      steps: [
        "Split the project",
        "Workers run in parallel",
        "Combine the result",
      ],
      kind: "agents",
    },
    ariaLabel:
      "Placeholder for a recording of Construct delegating a project to parallel agent workers",
  },
  */
  {
    id: "team-workspaces",
    title: "One Workspace",
    accent: "For The Whole Team",
    description:
      "Bring people, your AI employee, files, apps, and shared conversations together, with invitations, roles, and precise access controls.",
    cta: "Explore Workspaces",
    mutedAction: "See Shared Work in Action",
    video: "/assets/landing/workflows/workspace.mp4",
    poster: "/assets/landing/workflows/workspace-poster.jpg",
    ariaLabel:
      "Construct workspace settings for inviting teammates and controlling access",
  },
  {
    id: "memory",
    title: "Memory",
    accent: "You Can Inspect",
    description:
      "Preferences, decisions, and project context stay with evidence and history. Review, correct, or forget anything it learns so nothing important lives only in your head.",
    cta: "Inspect Agent Memory",
    mutedAction: "See Why It Remembered",
    video: "/assets/landing/workflows/memories.mp4",
    poster: "/assets/landing/workflows/memories-poster.jpg",
    ariaLabel:
      "Construct Memories showing evidence-backed preferences and procedures",
  },
  {
    id: "channels",
    title: "Work Together",
    accent: "Across Channels",
    description:
      "Message Construct from the web, Slack, Telegram, Discord slash commands, or its native email inbox. Routing and access policies vary by channel.",
    cta: "Collaborate",
    mutedAction: "See Shared Threads",
    video: "/assets/landing/workflows/channels.mp4",
    poster: "/assets/landing/workflows/channels-poster.jpg",
    ariaLabel:
      "Construct available through Slack, Telegram, Discord slash commands, native email, and the web",
  },
  {
    id: "research",
    title: "Research About",
    accent: "Any Topic",
    description:
      "Construct gathers sources, compares details, and turns messy questions into cited research you can review or share.",
    cta: "Research a Topic",
    mutedAction: "See Report Samples Generated",
    video: "/assets/landing/workflows/research.mp4",
    poster: "/assets/landing/workflows/research-poster.jpg",
    ariaLabel: "Construct researching a topic in the product interface",
  },
] as const;

export type WorkflowDemo = (typeof workflowDemos)[number];

export const featureCards = [
  {
    src: "/assets/landing/features/schedules.webp",
    alt: "Schedules repeating agent jobs and workflow runs with calendar-based automation",
    wide: false,
  },
  {
    src: "/assets/landing/features/integrations.webp",
    alt: "Live connected-app catalog with tools such as Drive, Gmail, GitHub, and messaging channels",
    wide: true,
  },
  {
    src: "/assets/landing/features/social-manager.webp",
    alt: "Uses supported connected social applications when the required actions are available",
    wide: false,
  },
  {
    src: "/assets/landing/features/cloud-control.webp",
    alt: "Cloud workspace available through a responsive mobile web interface",
    wide: false,
  },
  {
    src: "/assets/landing/features/automations.webp",
    alt: "Runs linear workflows and delegates bounded parallel work to temporary agents",
    wide: false,
  },
] as const;

export const companyLinks = [
  ["Blog", "/blog/"],
  ["About", "/about/"],
  ["Affiliates", "/affiliates/"],
  ["Editorial Policy", "/editorial-policy/"],
  ["Careers", "/careers/"],
  ["Support", "/support/"],
  ["Privacy Policy", "/privacy/"],
  ["Sub-processors", "/sub-processors/"],
  ["Terms", "/terms/"],
] as const;

export const affiliateProgramUrl =
  "https://dash.partnerstack.com/application?company=constructcomputer";

export const comparisonLinks = [
  ["vs ChatGPT", "/blog/construct-vs-chatgpt/"],
  ["vs Copilot", "/blog/construct-vs-copilot/"],
  ["vs Zapier", "/blog/construct-vs-zapier/"],
  ["vs Coding agents", "/blog/construct-vs-coding-agents/"],
  ["vs DIY", "/blog/construct-vs-diy/"],
  ["All resources", "/blog/"],
] as const;
