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

/**
 * Six questions a buyer actually has to answer before paying, in the order
 * they tend to ask them. Deliberately excludes anything the page already
 * answers: pricing sits directly above this section, and the walkthrough
 * covers scheduling and workflows.
 */
export const landingFaq = [
  {
    question: "How is Construct different from ChatGPT or Claude?",
    answer:
      "Chat assistants are built for answers and drafts inside a thread. Construct is built for work that outlives the thread: it keeps a persistent workspace with files, memory, and schedules, runs jobs on its own, and records every action in an Activity audit log you can read afterwards.",
  },
  {
    question: "What work can it actually complete?",
    answer:
      "Research and cited reports, analysis of files in your workspace, reading and sending native email, updating connected apps, running scripts, building internal tools, and delegating bounded subtasks to temporary agents. It earns its keep when a job crosses several tools or has to run again next week.",
  },
  {
    question: "Which apps can it connect to?",
    answer:
      "Construct reads supported applications from its live integration catalog, including Gmail, Google Calendar, Notion, Linear, Jira, GitHub, HubSpot, and Airtable, and you can add your own MCP tools. You can message it from Slack and Telegram directly, and from Discord using slash commands.",
  },
  {
    question: "Can I see and control what it does?",
    answer:
      "Yes. The desktop shows files, live browser activity, terminal transcripts, workflows, memories, and tool records. Activity is a full audit log of every action, what it touched, when it ran, and why. You can interrupt a run mid turn, answer its questions, and correct or delete anything it remembers.",
  },
  {
    question: "Do you train on my data?",
    answer:
      "No. You own the files, memories, and apps your agent produces, and the licence you grant Construct covers storing, processing, and displaying that content solely to run the service for you. Workspaces use scoped file, memory, and sandbox resources, stored model keys and bot credentials are encrypted, and closing your account deletes the workspace data.",
  },
  {
    question: "What happens when a job fails partway through?",
    answer:
      "Finished work lands in the workspace as it is produced, so a run that dies at step thirty keeps the first twenty-nine steps. The next run picks up from what already exists instead of starting over, and Activity lets you trace the failure to a step. Steps with irreversible external effects, such as a payment or a customer email, still need supervision before you let them run unattended.",
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
] as const;

export type WorkflowDemo = (typeof workflowDemos)[number];

export const featureCards = [
  {
    video: "/assets/landing/features/schedules.mp4",
    webm: "/assets/landing/features/schedules.webm",
    poster: "/assets/landing/features/schedules-poster.webp",
    alt: "Schedules repeating agent jobs and workflow runs with calendar-based automation",
    wide: false,
  },
  {
    src: "/assets/landing/features/integrations.webp",
    alt: "Live connected-app catalog with tools such as Drive, Gmail, GitHub, and messaging channels",
    wide: true,
  },
  {
    video: "/assets/landing/features/social-manager.mp4",
    webm: "/assets/landing/features/social-manager.webm",
    poster: "/assets/landing/features/social-manager-poster.webp",
    alt: "Uses supported connected social applications when the required actions are available",
    wide: false,
  },
  {
    video: "/assets/landing/features/cloud-control.mp4",
    webm: "/assets/landing/features/cloud-control.webm",
    poster: "/assets/landing/features/cloud-control-poster.webp",
    alt: "Cloud workspace available through a responsive mobile web interface",
    wide: false,
  },
  {
    video: "/assets/landing/features/automations.mp4",
    webm: "/assets/landing/features/automations.webm",
    poster: "/assets/landing/features/automations-poster.webp",
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
