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
  "jev-ai-agents": [
    {
      question: "What is Jev?",
      answer:
        "Jev is a System One model, or decision model, from TypeSafe AI, released in early access on September 15, 2026. You send it a state and typed questions (Choice, Score, or Noul for yes or no), and it returns a probability for each possible answer instead of generating text, in well under a second, for $0.042 per million input tokens with output free.",
    },
    {
      question: "How is Jev different from an LLM?",
      answer:
        "A language model generates text and can plan, write, and call tools. Jev cannot write at all: it answers bounded questions about a state with typed answers and probabilities, so its answer can never fall outside the options you define. It is much faster and cheaper per decision, and in independent tests it lands a few accuracy points behind the strongest language models on classification.",
    },
    {
      question: "How do you use Jev in an AI agent?",
      answer:
        "Use it for the small, frequent decisions around the language model, not instead of it: is this person one the agent already knows, is the task done, does this email need the agent, which tool fits. Code builds a small state and enforces thresholds, Jev makes the bounded call, and a person takes irreversible or ambiguous cases. Construct uses Jev in production to resolve people and projects in its agent's memory.",
    },
    {
      question: "Can a System One model and an LLM work together in an agent?",
      answer:
        "Yes, and that is the pattern that works. The language model is the slow System 2 that plans, writes, and uses tools, and Jev is the fast System 1 for the bounded judgments around it. If you escalate Jev's low-confidence answers, escalate to something better at the hard cases: OpenRouter sent them to Claude Opus 5 and came within 0.4 points of Opus alone, while a cascade to a weaker model introduced more mistakes than it fixed.",
    },
    {
      question: "Can high confidence let Jev approve risky actions on its own?",
      answer:
        "No. Keep Jev off auth boundaries and never make it the only check before an irreversible action such as sending mail or moving money. Text inside the state can steer its answer: in Primeline's test, injected instructions misclassified 22.5% of test pairs. Use deterministic permission checks first and send ambiguous or irreversible cases to a person.",
    },
    {
      question: "Does Jev hallucinate?",
      answer:
        "Jev cannot return a value outside the options you define, but it can pick the wrong valid option, which TypeSafe's own FAQ acknowledges. Always offer an explicit none option: in one reported test, Jev placed messages that fit no category into a listed category at 0.99 confidence or more when none was not available.",
    },
    {
      question: "Is Jev's confidence score calibrated?",
      answer:
        "Partly. Independent tests found its probabilities rank answers well but can overstate accuracy in the middle of the range, and Primeline measured calibration error of 0.012 for Noul, 0.086 for Choice, and 0.254 for Score. Treat the scores as a ranking, set thresholds from a gap in your own data, and pin the model version once you have tuned them. Where your route cannot pin one, as with Cloudflare's typesafe/jev, record the version each response names and measure again when it changes.",
    },
    {
      question: "How fast is Jev in production?",
      answer:
        "Construct measured 358 to 611 ms for one question on about 400 tokens, and 377 to 544 ms for seven questions on about 711 tokens, against jev-1.13.0 through Cloudflare AI Gateway, with p95 around 0.6 seconds. Because Jev answers every question in one parallel pass, batching questions about the same state adds little time.",
    },
    {
      question: "How much does Jev cost compared with an LLM?",
      answer:
        "At list prices, 1,000 decisions of about 400 input tokens cost about $0.017 on Jev, $0.50 on Claude Haiku 4.5, and $1.00 on Claude Sonnet 5.5, assuming a 20-token answer from the language models. Independent tests put Jev at roughly 8 to 20 times cheaper per call than Haiku 4.5. For a single agent the difference is cents a month, and the bigger saving is the full agent turns a quick decision lets you skip.",
    },
    {
      question: "Does Construct use Jev?",
      answer:
        "Yes, in one place. Construct shipped Jev into its memory on September 20, 2026, to decide whether a newly mentioned person or project matches one the agent already knows. It merges only above a 0.7 probability and falls back to a generative judge if Jev does not answer within two seconds. Planning and writing still run on general-purpose language models.",
    },
  ],
  "zen-mode": [
    {
      question: "What is Zen Mode in Construct?",
      answer:
        "Zen Mode is a chat-first way into Construct Computer, the AI agent with its own cloud computer. You ask in one box, your agents work in the background, and a Home screen shows what needs you, what is running, and what is coming up. It uses the same agents, files, mail, memory, and schedules as the Construct desktop.",
    },
    {
      question: "Is Zen Mode a lite version of Construct?",
      answer:
        "No. Zen Mode and the desktop are two views of the same computer on the same account, so there is nothing to migrate. Open OS switches to the full desktop mid-task, and the Zen Mode button in the desktop's menu bar switches back. Plan limits are the same in both.",
    },
    {
      question: "Can I still watch my AI agent work in Zen Mode?",
      answer:
        "Yes. Every chat has a computer panel with Progress, Browser, Terminal, and Files tabs that follow what the agent is using, and you can take control of the live browser and hand it back. Open OS shows the same task on the full desktop.",
    },
    {
      question: "Does Zen Mode work on a phone?",
      answer:
        "Yes. Open app.construct.computer in your phone's browser and sign in with the same account. The sidebar becomes a drawer and the ask box docks to the bottom of Home. It is a mobile web app rather than an App Store app, and the desktop hands phones off to Zen Mode.",
    },
    {
      question: "Does Zen Mode cost extra?",
      answer:
        "No. Zen Mode is included in every Construct plan: Lite at $9/month, Starter at $59/month, and Pro at $299/month, billed monthly. Limits such as agents, scheduled tasks, and steps per task are the same whichever view you use.",
    },
    {
      question:
        "How is Zen Mode different from Claude, ChatGPT Work, Grok Bot, or Manus?",
      answer:
        "As of September 29, 2026, all of them let an agent work in the background and check in when needed. Construct pairs a calm chat view with a full desktop of the same persistent computer, keeps files, an agent inbox, correctable memory, and schedules in one workspace, and starts at $9/month against $20/month entry plans for the others. Construct works on its own cloud computer, not yours, so jobs that need files on your own machine suit a product that can operate it.",
    },
  ],
  "best-ai-employee-platforms": [
    {
      question: "What is the best AI employee platform for a small business?",
      answer:
        "It depends on the first job you hand over. If it matches a named role such as social media or answering the phone, a role-based roster like Sintra or Marblism is quickest to start. If the work crosses apps or changes week to week, a general-purpose AI employee with its own computer, such as Construct, CellCog, Manus, or Grok Bot, fits better. Lindy suits teams that live in Slack, and OpenClaw suits technical owners who want to self-host.",
    },
    {
      question: "How much does an AI employee cost?",
      answer:
        "Entry prices checked on September 29, 2026 run from $0 for self-hosted OpenClaw, plus hosting and model costs, and $8 to $9 a month for CellCog and Construct, to $29.99 per user for Lindy and $280 a month for Artisan's sales agent. Most platforms meter work with credits, hours, or plan limits, so the working cost depends on how much you assign. CellCog's own labels put a full-time AI employee at $500 a month.",
    },
    {
      question: "Is AI staff the same as an AI employee?",
      answer:
        "Mostly, yes. Vendors use AI employee, AI staff, AI worker, and AI teammate for software agents given a job rather than a single prompt. The differences that matter are whether the agent has a fixed role or takes any task, whether it has its own computer, and how its work is metered.",
    },
    {
      question: "What is the cheapest AI employee?",
      answer:
        "OpenClaw is free, open-source software, but you host it yourself and pay for the server and model usage. Among hosted platforms checked on September 29, 2026, CellCog starts at $8 a month in credits, Construct at $9 a month, and Grok Bot is included with Cursor Pro at $20 a month. Entry plans cover light use, so price a busy month before you commit.",
    },
    {
      question: "Can an AI employee answer phone calls?",
      answer:
        "Some can. Marblism's Rachel answers calls around the clock, transfers them, and texts you summaries, and Relevance AI offers outbound phone agents on its higher tiers. Artisan says its AI sales rep cannot legally make calls, so its dialer is for human reps. Construct has no built-in phone agent.",
    },
    {
      question: "Which AI employee works in Slack?",
      answer:
        "Lindy is built around Slack: each person gets a private assistant in direct messages and the team shares one in channels. Construct and Manus also take requests from Slack, alongside other channels such as email and Telegram.",
    },
    {
      question: "What happens when an AI employee runs out of credits?",
      answer:
        "It depends on the vendor. Lindy pauses work until you top up, Sintra's AI employees stop working, Marblism cancels scheduled tasks and pauses its phone receptionist, Manus cannot start new tasks, and Artisan pauses new enrollments. Construct applies plan limits, and on Pro it can switch to your own model keys after the bundled limits.",
    },
  ],
  "grokbot-alternative": [
    {
      question: "Is Construct a cheaper Grok Bot alternative?",
      answer:
        "Construct Lite starts at $9/month, below the $20 Cursor Pro and $30 SuperGrok entry subscriptions that include Grok Bot as of September 10, 2026. That compares starting subscription prices, not equal usage. Lite includes 3 scheduled tasks and a native agent email address; Starter at $59/month raises that to 10, and BYOK requires Pro at $299/month. Existing eligible Grok or Cursor subscribers already have Bot access included.",
    },
    {
      question: "How can I extend Construct beyond its built-in tools?",
      answer:
        "Connect supported apps, add custom MCP tools, or ask Construct to build a private workspace app for a repeated process. Those apps have their own permissions and runtime limits. Grok Bot also has a public marketplace, so customization is not exclusive to Construct.",
    },
    {
      question: "Can I use xAI model keys with Construct?",
      answer:
        "Yes. Construct Pro supports BYOK for xAI, OpenRouter, OpenAI, Anthropic, and Amazon Bedrock. You can configure fallback or exclusive use of your credentials. Provider charges are additional to the Construct subscription, and supported models depend on the provider connection.",
    },
    {
      question: "How should I move a Grok Bot workflow to Construct?",
      answer:
        "Start with one procedure: bring its instructions and source files, reconnect the necessary accounts, and review an on-demand run before setting a schedule. Do not assume a one-click transfer of bots, credentials, or memory. Construct's current saved workflows are linear.",
    },
  ],
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
        "An AI employee is AI software you assign outcomes to, not just questions. It plans a multi-step job, uses tools such as a browser, email, and connected apps to finish it, and keeps the files and context behind the work so the next job starts from there.",
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
  "agent-verification-gap": [
    {
      question:
        "Why does an AI agent save less time than it looks like it should?",
      answer:
        "Because producing the work got cheap and checking it did not. Delegation only pays when the cost of checking the output, plus the chance it is wrong times what a wrong one costs you, comes in under the cost of doing the job yourself. Reading nine agent-written client emails closely enough to be responsible for them can approach the time it would have taken to write them, at which point the agent is a net loss even when every draft is correct.",
    },
    {
      question: "What is the verification bottleneck in agent work?",
      answer:
        "The point where output volume outruns a human's capacity to approve it. Faros AI's 2026 telemetry across 22,000 developers found tasks completed per developer up 33.7% while median review time rose 441.5%. LinearB's 2026 benchmarks, drawn from 8.1 million pull requests, found AI-assisted changes wait more than five times longer for a reviewer to start, then review slightly faster than human work once someone does. The expensive part is the decision to sign off, not the reading.",
    },
    {
      question:
        "Why do agents work better for code than for other business work?",
      answer:
        "Code carries verification tools that other work does not have. A diff shows exactly what changed, tests and CI let a machine check it, staging lets you try it without consequences, a pull request records who approved, and revert undoes it. An email, a CRM update, or an invoice has none of those, so the entire cost of checking lands on one person with no instruments, per unit of output.",
    },
    {
      question: "How do you make AI agent output easier to check?",
      answer:
        "Five properties do most of the work, and none need a better model: finished work as artifacts you can open rather than transcripts you must read; a draft state before anything irreversible, so an email or a bulk update becomes reviewable before it happens; provenance on anything the agent believes, so a claim can be traced to its source; a bounded record of what it touched, when, and why, which is a receipt rather than a stack trace; and reversibility where it exists, with a human confirming where it does not.",
    },
    {
      question:
        "Does Construct ask for approval before an agent sends an email?",
      answer:
        "Not as a mandatory gate on every external side effect. Construct gives you work as files in a persistent workspace, an Activity audit log recording what each action affected, when it ran, and why, inspectable and correctable memory, and the ability to interrupt a running turn. Steps with irreversible effects such as a customer email or a payment still need supervision before you let them run unattended.",
    },
  ],
  "agent-task-half-life": [
    {
      question: "Why does my AI agent keep failing partway through a task?",
      answer:
        "Usually because the run is too long, not because the task is too hard. Agent failure behaves like a constant rate per minute of work rather than something that only strikes on difficult steps, so a job's success probability falls off as it gets longer. An agent that gets 95% of its steps right finishes a ten-step job about 60% of the time and a 48-step job about 8.5% of the time, with no step having regressed.",
    },
    {
      question:
        "Why do multi-step agent workflows fail more than single tasks?",
      answer:
        "Because the per-step success rates multiply. Ten steps at 95% each is 0.95 to the tenth power, or roughly 60%. The same agent on a 48-step job lands near 8.5%. Reliability that reads as excellent per step is unreliable per job, and the gap widens with every step you add.",
    },
    {
      question: "Will a more capable model fix agent reliability?",
      answer:
        "Only partly. METR finds the task length agents handle at 50% reliability has been doubling roughly every seven months, so models are genuinely improving at long work. But 50% reliability is a coin flip, and a model one tier better moves your per-step rate a few points while leaving the number of steps untouched. Restructuring a 48-step run into eight 6-step runs changes the exponent, which is where the larger gain is.",
    },
    {
      question: "How do I stop an agent from redoing work when it retries?",
      answer:
        'Make every iteration leave a durable artifact, then scope the instruction to the work that remains. "Write the reports" is not resumable; "write the report for any client that does not already have one dated this month" is. In Construct the artifact is a file in the persistent workspace, so a rerun reads the directory, sees what already exists, and works only on the rest.',
    },
    {
      question: "How does Construct handle a job that fails halfway?",
      answer:
        "Finished work lands in the workspace filesystem as it is produced, so a run that dies at step thirty leaves the first twenty-nine steps' output behind. The next scheduled or on-demand run picks up from what exists rather than starting over, and the Activity feed's bounded action summaries let you trace the failure to a step. Construct does not currently insert a mandatory approval gate before every external side effect, so steps with irreversible effects still need supervision before running unattended.",
    },
    {
      question: "When is this pattern the wrong fit?",
      answer:
        "When the steps are order-dependent all the way through with no natural loop, there is no seam to cut. When a step has an irreversible external effect such as a payment or a message to a customer, retries are not free and idempotency has to be designed in. And when the work is fully deterministic, a rule-based automation platform will run it more cheaply and predictably than any agent.",
    },
  ],
  "chatgpt-dots-alternatives": [
    {
      question: "Do I need ChatGPT Pro to use ChatGPT Dots?",
      answer:
        "Yes. Your first dot is included with ChatGPT Pro or Business Premium, and Free and Plus users do not get one. Reports disagree on whether the $100 Pro tier counts, so budget $200 a month for one person until OpenAI's pricing page settles it.",
    },
    {
      question: "What is the cheapest ChatGPT Dots alternative?",
      answer:
        "Meta Muse and Manus both have free plans, and OpenClaw is free software if you host it yourself. If you already pay $20 for Claude, Google AI Pro, or Cursor, Claude Cowork, Gemini Spark, or Grok Bot come with that plan, and Construct starts at $9 a month on its own plan.",
    },
    {
      question: "Which AI agent keeps working while my laptop is closed?",
      answer:
        "ChatGPT Dots, Gemini Spark, Grok Bot, Meta Muse, Viktor, and Construct all work from cloud environments the vendor runs, and Claude Cowork's scheduled tasks run even when your computer is asleep. Manus offers an always-on Cloud Computer as an add-on from $30 a month, and OpenClaw needs a machine or a hosted instance that stays on.",
    },
    {
      question: "Can I use ChatGPT Dots in the UK or EU?",
      answer:
        "Not on a Pro plan for now. Pro subscribers in the European Economic Area, Switzerland, and the UK are excluded at launch, while Business Premium users get dots in every supported ChatGPT region. Gemini Spark is also excluded in the EEA, the UK, and Switzerland.",
    },
    {
      question: "Which ChatGPT Dots alternative is best for a small team?",
      answer:
        "For a small team that wants one agent with shared files and a schedule, look at Construct from $9 a month or Viktor from $50 per workspace. Teams that live in Slack should also look at Lindy, which costs $29.99 per user.",
    },
    {
      question: "Does Construct have approval rules like ChatGPT Dots?",
      answer:
        "No. Construct has no equivalent of Custom Rules and no mandatory approval gate before external actions, and its workflows are linear. Supervision comes from asking for drafts and reviewing early runs before you schedule them.",
    },
  ],
  "construct-vs-openai-dots": [
    {
      question: "How much does ChatGPT Dots cost?",
      answer:
        "There is no standalone Dots price. Your first dot is included with an eligible ChatGPT Pro or Business Premium subscription, and launch reports disagree on whether the $100 Pro 100 tier qualifies or whether you need Pro 200 at $200 a month. OpenAI has not announced prices for extra dots or the usage terms that apply after the first month.",
    },
    {
      question: "Is there a free version of ChatGPT Dots?",
      answer:
        "No. Launch coverage says Dots are not available on Free, Go, or Plus plans, and Pro subscribers in the European Economic Area, Switzerland, and the UK are excluded for now.",
    },
    {
      question: "What is a cheaper alternative to ChatGPT Dots?",
      answer:
        "Construct starts at $9 a month on Lite, with up to 2 agents, 50 steps per task, 3 scheduled tasks, and an agent email address. That is a lower entry cost than the $100 or $200 ChatGPT Pro route into Dots, not proof of equal usage or a lower cost per finished task.",
    },
    {
      question: "Can I choose the AI model in ChatGPT Dots or Construct?",
      answer:
        "Launch coverage describes Dots as powered by GPT-6 Astra, and we found no documented option to use another provider. Construct Pro supports your own keys for OpenRouter, OpenAI, Anthropic, Amazon Bedrock, and xAI.",
    },
    {
      question: "Where is ChatGPT Dots better than Construct?",
      answer:
        "Dots connects to more than 4,000 apps, checks sensitive actions for approval by default with Custom Rules you can set, works in Microsoft Teams, and is included if you already pay for ChatGPT Pro. Construct's workflows have no approval gates today, so irreversible steps need your supervision.",
    },
    {
      question: "Can I import my dot into Construct?",
      answer:
        "No. There is no tool that moves a dot's learned preferences, rules, or connected accounts into Construct. Start with one procedure, move its instructions and files into the workspace, reconnect the needed apps, and test it by hand before scheduling it.",
    },
  ],
  "ai-agent-with-its-own-computer": [
    {
      question: "What is an AI agent with its own computer?",
      answer:
        "It is an AI agent that gets a persistent machine in the cloud, with a browser, a terminal, files, connected apps, and often its own email address. Because the work runs on that machine instead of your laptop, it keeps going when you close the lid and can run jobs on a schedule.",
    },
    {
      question: "Which AI agents have their own cloud computer?",
      answer:
        "As of October 1, 2026, they include OpenAI dots, Meta Muse, Grok Bot, Claude Cowork, Gemini Spark, Perplexity Computer, Manus, Genspark Claw, Simular Sai, Viktor, and Construct. Most of the big-platform versions launched between July and September 2026.",
    },
    {
      question: "How much does an always-on AI agent cost?",
      answer:
        "Entry prices checked on October 1, 2026 run from free with limits (Meta Muse) and $9 a month (Construct Lite) to $200 a month for Perplexity Max or Simular's always-on machine. Many are bundled into subscriptions such as Cursor Pro or Claude Pro at $20, or ChatGPT Pro from $100.",
    },
    {
      question: "Can an AI agent keep working while my laptop is closed?",
      answer:
        "Yes, if its work runs on a cloud machine rather than your device. Anthropic, for example, says scheduled Claude tasks run in the cloud and do not need your computer to be awake. Test it by scheduling a job, closing everything, and checking the result in the morning.",
    },
    {
      question: "What are the risks of giving an AI agent its own computer?",
      answer:
        "The main risks are credential access, prompt injection, and runaway cost. An agent with your logins can act wrongly as you, it reads untrusted content from the web and your inbox, and it can spend while you sleep, so look for approval rules and spending caps.",
    },
    {
      question: "Is Construct's agent computer always on?",
      answer:
        "No. Construct keeps each agent's files and workspace permanently, but the Linux sandbox starts when the agent needs it and sleeps after about ten minutes idle, with commands capped at 300 seconds. If you need a continuously running process, an always-on machine such as Manus Cloud Computer or Simular Premium fits better.",
    },
  ],
  "muse-for-small-business-alternatives": [
    {
      question: "How much does Meta's Muse for Small Business cost?",
      answer:
        "Muse for Small Business uses the same pricing as the Muse app: free with a usage limit, then the Power plan at $20 a month or the Maximum plan at $100 a month. Paid plans are metered in Muse tokens per week.",
    },
    {
      question:
        "What is the best alternative to Muse for Small Business for running a business?",
      answer:
        "It depends on the job. Construct, from $9 a month, fits recurring work across several apps with files, schedules, and memory in one workspace; Lindy or Viktor fit teams in Slack; and Sintra or Marblism fit fixed roles such as social media or answering the phone.",
    },
    {
      question: "Why do some small businesses look for an alternative to Muse?",
      answer:
        "The common reasons are reluctance to give Meta access to business data, websites that block AI agents, Muse being tied to Meta's apps and available only in the US and Canada, and token-based plans that are hard to budget. None of these make Muse a poor product, and it remains a strong fit for businesses that sell and advertise on Instagram and Facebook.",
    },
    {
      question:
        "Will switching away from Muse stop websites from blocking my AI agent?",
      answer:
        "No. Amazon blocked Muse from Amazon.com, and any agent that clicks through websites can be refused by a site. Using official integrations and APIs where they exist reduces that risk.",
    },
    {
      question:
        "Can I use Gemini Spark with a Google Workspace business account?",
      answer:
        "Not for now. Google says Gemini Spark is not available if you sign in with a work or school Google Account, and it requires a Google AI Pro or Ultra subscription on a personal account.",
    },
    {
      question: "Does Construct connect to Meta ad accounts like Muse does?",
      answer:
        "Not in the same way. Construct does not have Meta's first-party access to its own ad accounts and Instagram analytics, so unless Meta ads are available as a connected app you would supply an export for ad spend. Muse's direct Meta access is its biggest advantage for that kind of job.",
    },
  ],
  "construct-vs-lindy": [
    {
      question: "Is Construct cheaper than Lindy?",
      answer:
        "At the entry level, yes. Construct Lite is $9 a month, while Lindy Plus is $29.99 a month per user with 3,000 credits. The two products meter work differently, so compare what each costs for your own workload rather than starting prices alone.",
    },
    {
      question: "Can Construct work in Slack like Lindy?",
      answer:
        "Partly. You can message Construct directly from Slack, and a workflow can post results to a Slack channel. Lindy is built more deeply around Slack, with a shared teammate in channels and a private assistant in each person's DMs.",
    },
    {
      question: "Which is better for a solo founder, Construct or Lindy?",
      answer:
        "It depends on where your work arrives. If it is mostly your own inbox and calendar, a Lindy Plus seat handles that directly. If it is research, reports, and recurring jobs across several apps, Construct Lite at $9 is the cheaper place to start.",
    },
    {
      question: "How does Lindy pricing work?",
      answer:
        "Lindy charges per user: Plus is $29.99, Pro is $99.99, and Max is $199.99 a month, with 3,000, 15,000, and 35,000 credits per user. Anyone who uses Lindy takes a seat, credits pool across the workspace, and work pauses when the pool runs out unless you buy top-ups.",
    },
    {
      question: "Can I import my Lindy setup into Construct?",
      answer:
        "There is no one-click import. You can copy your instructions, Routine prompts, and memory file contents, reconnect your integrations, and rebuild time-based Routines as Construct workflows, testing each job manually before scheduling it.",
    },
  ],
  "ai-agent-email-address": [
    {
      question: "How can I give an AI agent its own email inbox?",
      answer:
        "There are three ways: use a product with a native agent inbox, build on a developer email API such as AgentMail, or give the agent delegated access to your own Gmail. For a small team, a product with a native inbox is the least work, and Construct includes an agent email address on every plan from $9 a month.",
    },
    {
      question: "Is it safe to give an AI agent access to my own Gmail?",
      answer:
        "It is the riskiest option because the agent acts as you. Google says a delegate can read, send, and delete emails in your account, so every message carries your name and every deletion hits your real archive.",
    },
    {
      question: "Can I hand tasks to an AI agent by email?",
      answer:
        "Yes. In Construct, email is one of the channels you can reach the agent from, so you can forward a thread to the agent's address with the job written at the top. A good first test is a low-stakes task that ends with a draft rather than a sent reply.",
    },
    {
      question: "Should the agent send from its own address or from my Gmail?",
      answer:
        "Send from the agent's own address when it is fine for the recipient to know an agent wrote it, such as internal updates, vendor questions, and weekly reports. Use your connected Gmail only when the message has to come from you, and name the sending address in the prompt.",
    },
    {
      question:
        "Does Construct ask for approval before the agent sends an email?",
      answer:
        "Construct does not insert a mandatory approval gate before every external action. Ask the agent for drafts, review them, and only then tell it to send, especially for anything going to a customer.",
    },
    {
      question: "What does a developer email API like AgentMail cost?",
      answer:
        "On October 1, 2026, AgentMail listed a free plan with 3 inboxes and 3,000 emails a month, a Developer plan at $20 a month with 10 inboxes, and a Startup plan at $200 a month with 150 inboxes. You still need to build the agent, its memory, tools, and supervision yourself.",
    },
  ],
  "gemini-spark-alternatives": [
    {
      question: "Can I use Gemini Spark with a Google Workspace work account?",
      answer:
        "Not today for most people. Google's help page says you must sign in to the Gemini app with a personal Google Account, and work or school accounts are not currently supported. Google announced in May 2026 that a Workspace preview for business customers is coming soon, but we found no general availability date.",
    },
    {
      question: "Is Gemini Spark available in the UK or EU?",
      answer:
        "No. Google lists Spark as available wherever Gemini Apps are supported except the European Economic Area, Nigeria, Switzerland, and the United Kingdom. As of October 1, 2026, those regions were still excluded.",
    },
    {
      question: "How much does Gemini Spark cost?",
      answer:
        "Spark has no separate price and comes with a Google AI Pro or Ultra subscription. It launched for US Ultra subscribers, reported at $100 a month, and reached the Pro tier, about $20 a month in the US, in late July 2026.",
    },
    {
      question:
        "What is the best Gemini Spark alternative for a Google Workspace account in the UK or EU?",
      answer:
        "Claude is the closest fit: its Gmail, Calendar, and Drive connectors work with the Google account you connect, Cowork scheduled tasks run remotely, and Anthropic lists the UK and EU countries as supported. Claude Pro starts at $20 a month, and a Workspace admin may need to mark Claude as trusted.",
    },
    {
      question: "Can I get ChatGPT dots in the UK or EU?",
      answer:
        "Yes, on a Business Premium seat, which gets dots across supported ChatGPT regions. The personal Pro rollout currently excludes the European Economic Area, Switzerland, and the UK.",
    },
    {
      question: "Where does Construct fit among Gemini Spark alternatives?",
      answer:
        "Construct suits founders and small teams whose recurring work crosses Gmail, Google Calendar, and non-Google apps, with files, schedules, and memory kept in one workspace. Plans start at $9 a month for 2 agents and 3 scheduled tasks.",
    },
  ],
};

export function getResourceFaqs(slug: string): readonly FaqItem[] {
  return resourceFaqs[slug] ?? [];
}
