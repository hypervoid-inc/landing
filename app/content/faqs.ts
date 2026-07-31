export type FaqItem = {
  readonly question: string;
  readonly answer: string;
};

/**
 * Per-resource FAQs. Rendered as visible page content by `ResourcePage` and
 * emitted as `FAQPage` JSON-LD, so this stays the single source for both.
 * Answers must restate what the post itself argues; do not add claims here
 * that the body does not support.
 */
export const resourceFaqs: Record<string, readonly FaqItem[]> = {
  "running-ai-agents-on-cloudflare-not-vms": [
    {
      question: "Does Construct still run containers?",
      answer:
        "Yes. The terminal tool runs real bash inside a Cloudflare Container through the Sandbox SDK. The difference is that the container is summoned by a tool call and sleeps after ten minutes of inactivity, so it is a bounded line item rather than the substrate the product sits on.",
    },
    {
      question: "What is running between tool calls?",
      answer:
        "The agent loop, which lives in a Durable Object with its transcript in SQLite. WebSocket hibernation means an open browser tab is a held socket rather than a running process, and keepalive pings are answered by the runtime without waking the object. Workspace files live in R2, so they persist with no machine attached.",
    },
    {
      question: "When is an always-on VM the better choice?",
      answer:
        "When the workload is one long-lived process per user that genuinely never idles. This architecture trades a warm machine for cheap idling, and that trade only pays off if the machine would otherwise sit unused most of the time.",
    },
  ],
  "construct-vs-zapier": [
    {
      question: "Is Construct a replacement for Zapier?",
      answer:
        "Not usually. Zapier, Make, and n8n remain strong for high-volume automation where every trigger and action is known upfront. Construct is a better fit when the outcome is clear but the steps are not, because it can plan the browser, app, and file work at runtime.",
    },
    {
      question: "Can Construct run scheduled workflows like Zapier does?",
      answer:
        "Yes. Construct workflows run on demand or from its native Calendar. Workflows are intentionally linear today; branching, delays, approval steps, fan-out, and subworkflows are not yet supported.",
    },
    {
      question: "What happens when inputs change unexpectedly?",
      answer:
        "A fixed trigger-action mapping can become brittle when inputs vary. Construct can use an agent step to interpret the situation, then continue through connected-app actions, live browser work, files, or in-app notifications.",
    },
    {
      question: "Can I use Construct and Zapier together?",
      answer:
        "Yes. Deterministic, high-volume paths are well served by a traditional automation platform, while Construct handles the judgment-heavy work around them. The two address different halves of the same operation.",
    },
  ],
  "construct-vs-chatgpt": [
    {
      question: "How is Construct different from ChatGPT or Claude?",
      answer:
        "Chat assistants center on conversation, with tools and actions that vary by product and plan. Construct centers on assigned outcomes in a persistent work OS with files, controlled memory, schedules, workflows, a sandbox terminal, live browser runs, and connected apps.",
    },
    {
      question: "Can ChatGPT already schedule tasks?",
      answer:
        "Some chat products do offer scheduling and automation, depending on plan. The difference is where the work lives afterward: Construct keeps resulting files, run history, and a full Activity audit log in a workspace that outlives the conversation.",
    },
    {
      question: "When should I still use a chat assistant?",
      answer:
        "Choose a chat assistant for drafting, brainstorming, one-shot questions, and any job its available tools already cover. Choose Construct when the request needs several execution surfaces, recurring operation, or a visible record of completed work.",
    },
    {
      question: "Can I see what the agent actually did?",
      answer:
        "Construct keeps an Activity audit log recording every action, what it affected, when it ran, and why, plus chat tool records, workspace files, and sent messages. Its long-term memory is inspectable and correctable rather than opaque.",
    },
  ],
  "construct-vs-copilot": [
    {
      question:
        "Should I use Construct instead of Microsoft 365 or Google Workspace AI?",
      answer:
        "If nearly all work happens inside one suite and the main need is inline drafting, summarization, or spreadsheet help, the native copilot is usually the shortest path. Construct becomes more useful when execution crosses vendors.",
    },
    {
      question: "Which applications can Construct connect to?",
      answer:
        "Construct links supported tools such as Gmail, Linear, GitHub, Notion, and HubSpot through its live integration catalog. Slack is also available as a messaging channel.",
    },
    {
      question: "What can Construct do that a suite copilot cannot?",
      answer:
        "Construct provides a sandbox terminal, live browser runs, persistent files, a native inbox, schedules, and workflows in one purpose-built web desktop. Workspace files persist, while live browser runs and shell state are bounded execution surfaces.",
    },
    {
      question: "How does Construct handle context across different tools?",
      answer:
        "It is designed to carry context across a whole job: a customer message, a workspace file, a CRM update, a browser research step, and a scheduled follow-up. Useful context can be stored in inspectable memory and repeatable work saved as a versioned workflow.",
    },
  ],
  "construct-vs-diy": [
    {
      question: "Why not build my own agent on an open-source framework?",
      answer:
        "Frameworks provide many useful primitives, but a production stack may also need compute isolation, credential storage, channel integrations, schedules, memory, and a UI people trust. Construct packages those operating layers as one hosted product.",
    },
    {
      question: "Do I lose control by using a hosted product?",
      answer:
        "Less than you might expect. You can bring your own model key on Pro, connect supported applications, add a custom MCP server, and have the agent build a constrained workspace application for a recurring internal process.",
    },
    {
      question: "When is building your own stack the right call?",
      answer:
        "When full control over every layer is mandatory, when deployment must be air-gapped or on-premises, or when you have a platform team available to run it. A DIY stack can match a precise security model or internal platform.",
    },
    {
      question: "What is the ongoing maintenance difference?",
      answer:
        "A DIY stack makes your team responsible for every model change, connector failure, browser timeout, queue, migration, and support surface. Construct is the shorter path when the goal is to operate an AI employee rather than build infrastructure around one.",
    },
  ],
  "construct-vs-coding-agents": [
    {
      question: "Can Construct write code like a coding agent?",
      answer:
        "It can use a terminal and repository, but code is one step in a broader business workflow. A dedicated coding agent may provide deeper repository-specific planning and development ergonomics when success means a tested pull request.",
    },
    {
      question: "What does Construct do that a coding agent does not?",
      answer:
        "Construct can read and reply from its native inbox, update spreadsheets, schedule jobs, create Google Calendar events when that app is connected, and post in Slack, alongside repository work rather than instead of the rest of the business stack.",
    },
    {
      question: "Can non-engineers supervise Construct?",
      answer:
        "Yes. Live browser work, a read-only terminal transcript, files, inbox, Calendar, workflows, memories, connected apps, notifications, and Activity summaries appear in one web desktop, so outputs can be inspected and a running turn interrupted without a repository-centric interface.",
    },
    {
      question: "Can Construct run several tasks at once?",
      answer:
        "Construct can delegate bounded subtasks to temporary agents and synthesize their results. Plans allow 2, 4, or 8 temporary jobs concurrently; additional jobs queue, and browser or terminal work can still contend for shared execution surfaces.",
    },
  ],
  "ai-agent-vs-zapier": [
    {
      question: "What is the difference between an AI agent and a Zap?",
      answer:
        "A Zap runs a fixed trigger-action recipe that you define in advance. An AI agent is given a goal and plans its own steps at runtime, which matters when the inputs vary but the desired outcome stays the same.",
    },
    {
      question: "Which is more reliable?",
      answer:
        "For deterministic, high-volume work with known inputs, a configured automation is more predictable. An agent trades some of that predictability for the ability to handle ambiguity and recover from situations no one mapped ahead of time.",
    },
    {
      question: "Do AI agents cost more to run than automation platforms?",
      answer:
        "Pricing models differ: automation platforms typically meter task or operation counts, while agent products meter steps, jobs, and capacity. Compare against the work each one can actually complete rather than on unit price alone.",
    },
  ],
  "ai-agent-vs-virtual-assistant": [
    {
      question: "Can an AI agent fully replace a virtual assistant?",
      answer:
        "Not for everything. An AI agent suits well-scoped, repeatable, tool-driven work that runs at any hour. Relationship-heavy, judgment-heavy, and physical-world tasks remain a better fit for a human VA.",
    },
    {
      question: "How does the monthly cost compare?",
      answer:
        "A virtual assistant is billed for hours worked, while an AI agent is billed on a subscription with capacity limits. The useful comparison is cost per completed task on the specific work you would delegate, not the headline monthly figure.",
    },
    {
      question: "How do I verify the work was done correctly?",
      answer:
        "Construct keeps inspectable work records: an Activity audit log of every action with what it affected, when it ran, and why, plus chat tool records, workspace files, and sent messages. That record is what makes delegated agent work auditable in a way an unstructured task list is not.",
    },
  ],
  "ai-agent-memory": [
    {
      question: "How is agent memory different from chat history?",
      answer:
        "Chat history preserves messages. Memory stores durable facts with provenance and temporal context, so the agent knows what it learned, where it came from, and whether it is still current.",
    },
    {
      question: "Can I correct something the agent remembers incorrectly?",
      answer:
        "Yes. Corrections are recorded rather than silently overwriting the previous value, so the history of what changed stays visible and a mistaken update can be reasoned about later.",
    },
    {
      question: "Can I make the agent forget something?",
      answer:
        "Memory controls let you inspect, update, forget, or restore what the agent knows. Forgetting is an explicit operation rather than a side effect of the conversation ending.",
    },
  ],
  "what-is-an-ai-employee": [
    {
      question: "What is an AI employee?",
      answer:
        "An AI employee is an agent given a persistent workspace and the tools to complete assigned work end to end, researching, operating tools, creating files, and running recurring jobs, rather than only answering questions in a chat window.",
    },
    {
      question: "How is an AI employee different from a chatbot?",
      answer:
        "A chatbot responds. An AI employee executes: it acts across email, Slack, a live browser, and connected apps, keeps the resulting files and history, and can pick work back up on a schedule.",
    },
    {
      question: "Does an AI employee work without supervision?",
      answer:
        "It runs autonomously but stays supervised. You can inspect outputs, review the Activity audit log covering what it did, when, and why, and interrupt a running turn, so autonomy does not mean losing visibility into what happened.",
    },
  ],
  "ai-workflow-automation": [
    {
      question: "What is an AI workflow in Construct?",
      answer:
        "A reusable procedure combining agent steps, connected-app tools, and notifications. Once saved it can be run on demand by anyone, or scheduled to run again from the native Calendar.",
    },
    {
      question: "Can workflows include branching or approval steps?",
      answer:
        "Not yet. Current workflows are intentionally linear and versioned. Branching, delays, approval steps, fan-out, and subworkflows are not supported today.",
    },
    {
      question: "What can a workflow act on?",
      answer:
        "Workflows can operate across workspace files, live browser runs, native email, and connected business apps, so a single procedure can span the tools a process actually touches.",
    },
  ],
  "chat-assistants-vs-ai-employees": [
    {
      question: "Are chat assistants bad at autonomous work?",
      answer:
        "They are excellent at drafting, research, and one-shot questions. Autonomous operations additionally need execution surfaces, persistence between sessions, and an inspectable record of what was completed.",
    },
    {
      question: "What should I look for when comparing the two?",
      answer:
        "Ask where the work lives after the conversation ends, which surfaces the tool can actually act on, whether it can run again on a schedule, and what evidence it leaves of the work it did.",
    },
  ],
  "ai-employee": [
    {
      question: "What work can an AI employee complete?",
      answer:
        "Research, tool operation, file creation, and recurring work run from a persistent, supervised workspace, the kinds of tasks that span several apps rather than fitting in a single chat response.",
    },
    {
      question: "How is the work kept accountable?",
      answer:
        "The workspace retains files, run history, and a full Activity audit log, and long-term memory stays inspectable and correctable, so delegated work can be reviewed after the fact.",
    },
  ],
  "build-internal-tools-with-construct": [
    {
      question: "What kind of internal tools can Construct build?",
      answer:
        "Constrained workspace applications for a repeated process, the kind of small private app a team would otherwise maintain by hand. Construct writes, validates, and publishes it into your cloud desktop.",
    },
    {
      question: "What happens if a build breaks?",
      answer:
        "Construct preserves the last successful build, so a failed update does not take the working tool offline while it debugs and retries.",
    },
    {
      question: "Do I need to be a developer to use it?",
      answer:
        "No. You describe the tool your team needs in plain language; Construct handles writing, validating, and publishing the app, and can update it later as the process changes.",
    },
  ],
};

export function getResourceFaqs(slug: string): readonly FaqItem[] {
  return resourceFaqs[slug] ?? [];
}
