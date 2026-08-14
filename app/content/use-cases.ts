import { workflowDemos } from "./landing";
import { getResource } from "./resources";

export type UseCaseBlock = {
  readonly title: string;
  readonly body: string;
};

export type UseCase = {
  readonly slug: string;
  readonly navLabel: string;
  readonly title: string;
  readonly seoTitle: string;
  readonly description: string;
  readonly lede: string;
  readonly video: string;
  readonly poster: string;
  readonly videoLabel: string;
  readonly problems: readonly UseCaseBlock[];
  readonly features: readonly UseCaseBlock[];
  readonly why: readonly UseCaseBlock[];
  readonly relatedSlugs: readonly [string, string];
  readonly ctaLabel: string;
};

function demoMedia(id: (typeof workflowDemos)[number]["id"]) {
  const demo = workflowDemos.find((entry) => entry.id === id);
  if (!demo) throw new Error(`Missing workflow demo for use case: ${id}`);
  return {
    video: demo.video,
    poster: demo.poster,
    videoLabel: demo.ariaLabel,
  };
}

export const useCases = [
  {
    slug: "workflows",
    navLabel: "Workflows",
    title: "Stop rebuilding the same process every Monday",
    seoTitle: "AI Workflows for Recurring Business Work | Construct",
    description:
      "Encode a process once with agent steps, connected apps, and notifications. Version it, schedule it, and anyone on the team can run the same outcome again.",
    lede: "The useful work in a small company is rarely a one-off. It is the competitor digest, the invoice chase, the weekly report that only exists because one person still remembers how. When that person is in a meeting, the process does not run. Construct turns a process that already succeeded once into a versioned procedure other people can start.",
    ...demoMedia("workflows"),
    problems: [
      {
        title: "The steps live in one person's head",
        body: "A founder who has run the job twenty times can do it in twenty minutes. A teammate asked to cover it spends an hour reconstructing the order, the tools, and the definition of done. Tribal knowledge is not a process.",
      },
      {
        title: "Chat threads are not procedures",
        body: "A good run buried in last Tuesday's conversation cannot be handed to someone else. There is no version, no schedule, and no way to tell whether this week's output used the same steps as last week's.",
      },
      {
        title: "Fixed automations break on judgment",
        body: "Zapier-style recipes assume every trigger and action is known in advance. The moment the job needs research, a rewritten summary, or a page that changed its layout, the recipe stops and a person has to finish it by hand.",
      },
    ],
    features: [
      {
        title: "Encode after it works, not before",
        body: "Do the job once in conversation. Confirm the output. Then save the steps as a workflow. A procedure written after a successful run is a record, not a guess.",
      },
      {
        title: "Agent steps plus connected actions",
        body: "A workflow can mix agent work, connected-app actions, and in-app notifications. The agent handles the parts that need judgment; the connected action posts the result where the team already looks.",
      },
      {
        title: "Published versions stay put",
        body: "Editing a workflow does not silently rewrite a run that already started. Published versions are preserved so you can tell which procedure produced which result.",
      },
      {
        title: "Run now or put it on the Calendar",
        body: "Start a workflow on demand, or schedule it as a recurring job. Run history keeps step results and retries, so a week that looked wrong can be opened instead of guessed at.",
      },
    ],
    why: [
      {
        title: "The team can run it without the author",
        body: "Once the procedure is encoded, anyone with access can start it. Coverage no longer depends on the person who invented the steps being free.",
      },
      {
        title: "Inspection beats faith",
        body: "Each run leaves a trail. Agent steps link back to their sessions. When a competitor redesigns a pricing page, the run history is where the worse summary shows up.",
      },
      {
        title: "Linear on purpose",
        body: "Current workflows are linear. Branching, delays, approvals, and fan-out are not yet supported. That constraint is why a Construct workflow stays readable: it is a sequence you can walk, not a graph you have to debug.",
      },
    ],
    relatedSlugs: [
      "ai-workflow-automation",
      "how-to-choose-an-ai-agent-platform-for-your-team",
    ],
    ctaLabel: "Build a workflow",
  },
  {
    slug: "internal-tools",
    navLabel: "Internal tools",
    title: "Replace the spreadsheet that became the product",
    seoTitle: "Build Internal Tools in Your Workspace | Construct",
    description:
      "Describe the tool your team needs. Construct writes, validates, and publishes a working internal app into your cloud desktop instead of leaving you with another shared sheet.",
    lede: "Most internal tools start as a sheet, a Notion database, or a Slack thread with a pinned message. Six months later they are still the system of record, and nobody wants to own a rewrite. Construct builds the small app in the workspace you already work in, so the tool does not become a second product you have to host.",
    ...demoMedia("internal-tools"),
    problems: [
      {
        title: "The sheet is the app",
        body: "A tracker that started as five columns now has hidden formulas, a tab nobody understands, and a person who is afraid to sort it. That is an application with no interface and no owner.",
      },
      {
        title: "A custom build is a second company",
        body: "Hiring someone to write an internal CRUD app means auth, hosting, a backlog, and a tool that lives outside the place work actually happens. For a five-person team, the overhead often costs more than the job the tool was meant to save.",
      },
      {
        title: "No-code stalls at the first real exception",
        body: "When the tool needs to read a file the agent already has, call a connected app, or apply a rule that is not a dropdown, the builder ends and a founder is back in a sheet.",
      },
    ],
    features: [
      {
        title: "Describe the job, not the stack",
        body: "Tell Construct what the tool should collect, show, and do. It writes the app, validates it, and publishes it into the cloud desktop next to Chat, Files, and Workflows.",
      },
      {
        title: "The workspace is the host",
        body: "The app runs where your files, agent, and teammates already are. There is no separate login, no staging URL to lose, and no deploy pipeline to babysit.",
      },
      {
        title: "It can use what the agent already can",
        body: "Internal apps sit beside connected SaaS, files, and the sandbox. The tool can ask the agent to do work instead of pretending every action is a form submit.",
      },
      {
        title: "You can open it and correct it",
        body: "Because the app lives in the workspace, you can inspect what it did, change the prompt or the fields, and publish again without starting from a blank repo.",
      },
    ],
    why: [
      {
        title: "Small tools should not need a product team",
        body: "A status board, an intake form, a lookup over last month's runs: these are hours of work, not a six-week project. Construct is for the tools that never justified an engineer and still run the company.",
      },
      {
        title: "Ownership stays with you",
        body: "Agent-authored workspace apps are yours. You are not renting a template that disappears if a no-code vendor changes its plan.",
      },
      {
        title: "Build versus buy is the wrong frame",
        body: "The choice is rarely 'write it ourselves' versus 'buy Salesforce.' It is 'keep the sheet' versus 'have a real interface in the same place as the agent that uses it.'",
      },
    ],
    relatedSlugs: ["build-internal-tools-with-construct", "construct-vs-diy"],
    ctaLabel: "Build an internal tool",
  },
  {
    slug: "scheduling",
    navLabel: "Scheduling",
    title: "Reminders do not finish the work",
    seoTitle: "Schedule Agent Jobs and Workflows | Construct",
    description:
      "Schedule an agent prompt, connected-app action, or complete workflow. Construct runs it once or on a cadence and keeps the result history instead of another unread reminder.",
    lede: "A calendar ping that says 'write the digest' is still a task for a person. The useful version is a job that actually writes the digest at 8am, posts it, and leaves a record of whether it succeeded. Construct's Calendar schedules outcomes: prompts, actions, and workflows, not nudges.",
    ...demoMedia("scheduling"),
    problems: [
      {
        title: "The reminder assumes you will be free",
        body: "Recurring work fails the week the founder is traveling. A notification in a personal calendar does not run the job; it waits for a human who may not be there.",
      },
      {
        title: "Cron without a computer is a hope",
        body: "A GitHub Action or a Zap on a timer still needs somewhere to keep files, a browser for the awkward page, and a place to put the output. Most small-team schedules die because the runtime is a laptop that went to sleep.",
      },
      {
        title: "Missed runs vanish",
        body: "If Monday's job did not fire, Tuesday's 'did it run?' is a forensic exercise across Slack, email, and a dashboard nobody bookmarked. There is no history, only a feeling that something was late.",
      },
    ],
    features: [
      {
        title: "Schedule the job, not the nudge",
        body: "Put an agent prompt, a connected-app action, or a whole workflow on the Calendar. Construct runs it on the cloud computer, not on whoever happened to have a tab open.",
      },
      {
        title: "Once or on a cadence",
        body: "A one-shot follow-up and a weekly research sweep use the same scheduler. Recurring jobs keep going after the conversation that created them has ended.",
      },
      {
        title: "History is part of the product",
        body: "Each run keeps results. You can see what ran, what it produced, and whether a retry happened, without reconstructing the week from chat logs.",
      },
      {
        title: "Missed work gets reconciled",
        body: "The scheduler is built to deal with delay instead of depending on an always-on laptop. A job that could not start on time is still a job you can inspect, not a silent skip.",
      },
    ],
    why: [
      {
        title: "Long jobs have a half-life",
        body: "An agent that is 95% reliable per step still fails most of the way through a long run. Scheduling work on a computer that can resume matters more than adding another reminder.",
      },
      {
        title: "The calendar is next to the files",
        body: "Scheduled work writes into the same workspace as Chat, Files, and Workflows. The output is not trapped in an email you will search for later.",
      },
      {
        title: "Coverage without a night shift",
        body: "A solo founder cannot watch every job. Scheduling is how the company keeps operating when nobody is in the product.",
      },
    ],
    relatedSlugs: ["ai-employee", "agent-task-half-life"],
    ctaLabel: "Schedule a job",
  },
  {
    slug: "team-workspaces",
    navLabel: "Team workspaces",
    title: "One AI employee is not a team product until the team can share it",
    seoTitle: "Shared Workspaces for Teams and AI Employees | Construct",
    description:
      "Bring people, your AI employee, files, apps, and shared conversations into one workspace, with invitations, roles, and access controls that match how the company actually works.",
    lede: "A personal agent is a power tool. A company agent is infrastructure. The difference is not a better model: it is whether files, conversations, and permissions live in one place that more than one person can enter without forwarding a login.",
    ...demoMedia("team-workspaces"),
    problems: [
      {
        title: "The agent lives in one person's account",
        body: "When only the founder can see the threads, the rest of the company treats Construct as a private assistant. Work done there never becomes shared context. When that founder is out, the agent is out too.",
      },
      {
        title: "Files and chat diverge",
        body: "A report in Drive, a decision in Slack, a prompt in a personal chat: three places, none of them the workspace. The next person to pick up the job starts from zero.",
      },
      {
        title: "Access is all or nothing",
        body: "Either everyone shares one login, which is unsafe, or each person starts a separate agent, which cannot see the others' files. Neither is how a team actually wants to work.",
      },
    ],
    features: [
      {
        title: "Invite people into the same computer",
        body: "A workspace holds the AI employee, files, apps, and conversations together. Teammates join with roles instead of borrowing a password.",
      },
      {
        title: "Shared work, scoped access",
        body: "Team resources are shared on purpose. Personal and team workspaces stay distinct so a private experiment does not leak into the company folder.",
      },
      {
        title: "The agent is a colleague, not a tab",
        body: "Conversations, files, and runs sit where the team already looks. You do not export a chat transcript to brief the next person.",
      },
      {
        title: "Roles match the company",
        body: "Invitations and access controls decide who can start jobs, who can read memory, and who can change connected apps. Precision here is the product, not an enterprise add-on.",
      },
    ],
    why: [
      {
        title: "An AI employee has to outlive one user",
        body: "If the only way to use Construct is a personal account, it will never be how the company runs. Shared workspaces are what make the agent a teammate.",
      },
      {
        title: "Chat assistants do not become this by adding seats",
        body: "A seat on a chatbot is still a private thread. A workspace is files, roles, and an agent that can act in the same place the team acts.",
      },
      {
        title: "Handoff is the feature",
        body: "The test is simple: can someone else open the workspace on Wednesday and continue Friday's work without a briefing call? If not, you still have a personal tool.",
      },
    ],
    relatedSlugs: ["what-is-an-ai-employee", "chat-assistants-vs-ai-employees"],
    ctaLabel: "Explore workspaces",
  },
  {
    slug: "memory",
    navLabel: "Memory",
    title: "Chat history is not memory you can audit",
    seoTitle: "Inspectable AI Agent Memory | Construct",
    description:
      "Preferences, decisions, and project context stay with evidence and history. Review, correct, or forget anything Construct learns so nothing important lives only in a thread.",
    lede: "A long context window is not a memory system. It is a pile. Useful memory is a fact you can find, a decision you can correct, and a preference you can forget. Construct stores what it learns with evidence, so you are not arguing with a black box about what it 'remembers.'",
    ...demoMedia("memory"),
    problems: [
      {
        title: "The model is confident and wrong next week",
        body: "Without inspectable memory, last month's pricing exception becomes a vibe. The agent restates it, or invents a nearby version, and you only notice when a customer does.",
      },
      {
        title: "You cannot correct what you cannot see",
        body: "Fine-tuning and 'custom instructions' hide the store. If you cannot list what the agent thinks is true, you cannot delete the thing that is stale.",
      },
      {
        title: "Context windows dump everything in",
        body: "Pasting the last fifty messages into the next prompt is expensive and still misses the one decision from March. Retrieval without provenance is just a shorter pile.",
      },
    ],
    features: [
      {
        title: "Evidence on every memory",
        body: "Preferences, procedures, and project facts sit with history. You can see why something was stored instead of treating memory as a mysterious personality.",
      },
      {
        title: "Correct, forget, restore",
        body: "Wrong memories get edited. Stale ones get forgotten. If you need the previous version, restore it. The store is yours, not a hidden model weight.",
      },
      {
        title: "Temporal by default",
        body: "What was true in April may not be true in August. Memory that cannot be updated is how agents keep offering a plan you already abandoned.",
      },
      {
        title: "Scoped to the workspace",
        body: "Memory lives in a user-owned MemorySpace, not in a vendor prompt that trains on your chats. Team and personal scopes stay separate.",
      },
    ],
    why: [
      {
        title: "Trust is an inspection problem",
        body: "People will not delegate real work to an agent whose beliefs they cannot read. Inspectable memory is the difference between a demo and an employee.",
      },
      {
        title: "Forgetting is a feature",
        body: "A contractor who leaves, a price that changed, a project that died: the agent should not keep acting on those. Delete has to work.",
      },
      {
        title: "This is not a chatbot with a longer thread",
        body: "An AI employee that cannot remember your stack, your voice, and your constraints will redo the briefing every morning. Memory is how the job compounds.",
      },
    ],
    relatedSlugs: ["ai-agent-memory", "what-is-an-ai-employee"],
    ctaLabel: "Inspect agent memory",
  },
  {
    slug: "channels",
    navLabel: "Channels",
    title: "The work is not waiting in a browser tab",
    seoTitle: "AI Employee Across Slack, Email, and Chat | Construct",
    description:
      "Message Construct from the web, Slack, Telegram, Discord slash commands, or its native email inbox. Routing and access policies vary by channel so the same agent does not become a leak.",
    lede: "Founders do not live in one product. They live in Slack, email, and whatever tab is already open. An AI employee that only exists on a marketing-site 'Open OS' button will be skipped the moment the real conversation is happening somewhere else. Construct meets the thread where it started, with access that still respects the workspace.",
    ...demoMedia("channels"),
    problems: [
      {
        title: "The desktop is empty when the question arrives in Slack",
        body: "If the only way to assign work is to open a web app, the job waits until someone context-switches. Most of those jobs never get assigned.",
      },
      {
        title: "A bot with one shared secret is not access control",
        body: "Dumping an agent into a public Slack channel with the founder's credentials is how a joke prompt becomes a sent email. Channels need policy, not just a webhook.",
      },
      {
        title: "Email is still where vendors live",
        body: "Invoices, support threads, and 'quick questions' arrive in inboxes. An agent that cannot read and draft there is absent from a large share of the actual work.",
      },
    ],
    features: [
      {
        title: "Same agent, several doors",
        body: "Web, Slack, Telegram, Discord slash commands, and a native agent inbox. The computer is one; the entry points are many.",
      },
      {
        title: "Policy per channel",
        body: "Routing and access vary by channel. A Discord command should not automatically get the same reach as a logged-in workspace owner.",
      },
      {
        title: "Native email on Starter and Pro",
        body: "The agent can read threads, draft replies, and send updates from an address that belongs to the workspace instead of a personal Gmail forwarding hack.",
      },
      {
        title: "The run still lands in the workspace",
        body: "Work started from Slack is not trapped in Slack. Files, memory, and history stay on the cloud computer so the next channel can see them.",
      },
    ],
    why: [
      {
        title: "Presence is how delegation happens",
        body: "People assign work in the tool they already have open. If Construct is not there, they will do the job themselves or ping a human.",
      },
      {
        title: "A virtual assistant is still a person in those channels",
        body: "Hiring a VA to watch Slack and email is the expensive version of this page. Construct is the agent that can sit in those same places with a computer behind it.",
      },
      {
        title: "Do not confuse 'integrated' with 'unsafe'",
        body: "More channels without scoped access is a bigger blast radius. The product is the combination: reach plus policy.",
      },
    ],
    relatedSlugs: ["ai-employee", "ai-agent-vs-virtual-assistant"],
    ctaLabel: "Collaborate",
  },
  {
    slug: "research",
    navLabel: "Research",
    title: "A search dump is not a brief you can send",
    seoTitle: "AI Research With Sources You Can Review | Construct",
    description:
      "Construct gathers sources, compares details, and turns a messy question into cited research a founder can review, correct, or forward without rebuilding the argument.",
    lede: "Paste-and-summarize chat is fine for a first look and dangerous as a deliverable. The output has no trail, the numbers cannot be checked, and the next person has to search again. Construct treats research as a job on a computer: fetch, compare, cite, and leave something you would actually attach to an email.",
    ...demoMedia("research"),
    problems: [
      {
        title: "The answer evaporates when you close the tab",
        body: "A ChatGPT thread with twelve follow-ups is not a memo. There is no file, no source list, and no way for a cofounder to see what was checked.",
      },
      {
        title: "Models invent the convenient citation",
        body: "Without a live fetch and a place to keep the pages, 'according to the vendor' is often a plausible sentence. You find out when a customer asks for the link.",
      },
      {
        title: "Comparison shopping by hand does not scale",
        body: "Five pricing pages, three changelogs, and a Reddit thread: that is an afternoon. Doing it every quarter is how competitive intel becomes folklore.",
      },
    ],
    features: [
      {
        title: "Gather, then compare",
        body: "Construct searches, fetches public pages, and uses a live browser when the page needs interaction. The point is a comparison, not a paragraph that sounds informed.",
      },
      {
        title: "Citations you can open",
        body: "The brief points at sources. If a claim cannot be attached to a page the agent actually retrieved, it does not belong in the deliverable.",
      },
      {
        title: "The artifact lives in the workspace",
        body: "Research writes a file you can share, schedule, or turn into a workflow. It is not trapped in a chat you will never find in two weeks.",
      },
      {
        title: "Runs on a computer, not a context window",
        body: "Long research jobs need files, retries, and a browser. That is why Construct agents get a cloud computer instead of a longer prompt.",
      },
    ],
    why: [
      {
        title: "A founder has to be able to forward it",
        body: "If you would not send the output to an investor or a customer without rewriting it, it is still a draft. Research here is judged by that bar.",
      },
      {
        title: "Chatbots stop at the essay",
        body: "ChatGPT, Claude, and Gemini can write. They do not keep the working files, the browser session, or the next scheduled sweep unless you build that around them.",
      },
      {
        title: "Cheap compute, expensive mistakes",
        body: "Running the gathering on Cloudflare-backed agents is how the job stays affordable. Shipping a wrong number in a deck is how it gets expensive.",
      },
    ],
    relatedSlugs: [
      "construct-vs-chatgpt",
      "running-ai-agents-on-cloudflare-not-vms",
    ],
    ctaLabel: "Research a topic",
  },
] as const satisfies readonly UseCase[];

export type UseCaseSlug = (typeof useCases)[number]["slug"];

export function getUseCase(slug: string): UseCase | undefined {
  return useCases.find((entry) => entry.slug === slug);
}

export function relatedUseCasePosts(entry: UseCase) {
  return entry.relatedSlugs.map((slug) => {
    const resource = getResource(slug);
    if (!resource) {
      throw new Error(`Use case ${entry.slug} points at missing post ${slug}`);
    }
    return resource;
  });
}
