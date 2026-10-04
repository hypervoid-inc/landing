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
  "clef-vs-jev-benchmark": [
    {
      question: "What is Clef?",
      answer:
        "Clef is an open-weight decision model from Cloudflare, released on October 1, 2026 with a smaller sibling, Clef-flash. You send a state and typed questions, and it returns a probability for each allowed answer instead of generating text. Clef has 27 billion parameters, Clef-flash has 9 billion, both are Apache 2.0, both run on Workers AI, and both accept the same request format as TypeSafe's Jev.",
    },
    {
      question: "Is Clef better than Jev?",
      answer:
        "On Construct's benchmark of 117 labelled cases across five production AI agent decisions, Clef reached the right outcome on 92.3% of calls using thresholds set for Jev, against 88.6% for Jev and 82.1% for Clef-flash. With each model's own thresholds, chosen on held-out cases, the scores were 93.2%, 90.9% and 90.6%. Clef's lead over Jev is 3.7 points on a small synthetic set and is not statistically significant, so it is not a general verdict. Jev won email triage and made no wrong merges.",
    },
    {
      question: "Is Clef compatible with the Jev API?",
      answer:
        "Yes, in Construct's test. The same requests written for Jev, with Choice, Score and Noul questions and JSON state, ran on Clef and Clef-flash after changing only the model ID to @cf/cloudflare/clef or @cf/cloudflare/clef-flash. All 702 Clef calls returned valid answers. One difference: Clef's confidence field is not the winning label's probability, so read the probabilities map.",
    },
    {
      question: "Is Clef deterministic?",
      answer:
        "In Construct's test, yes. Each of 117 cases was sent three times, and Clef and Clef-flash returned the identical probability on every repeat. The probability Jev's decisions act on moved by up to 0.10 between identical calls, and two cases changed verdict. Cloudflare attributes this to a non-autoregressive decision step that samples no text.",
    },
    {
      question: "How much does Clef cost compared with Jev?",
      answer:
        "List prices per million input tokens are $0.24 for Clef, $0.09 for Clef-flash and $0.042 for Jev, with output free on all three. Clef counted 28% fewer tokens than Jev for the same requests in Construct's test, so a million decisions cost about $93 on Clef, $35 on Clef-flash and $23 on Jev.",
    },
    {
      question: "Do Jev thresholds work on Clef?",
      answer:
        "Not reliably. In Construct's test the most accurate threshold for a tool-call risk decision was 0.49 on Jev, 0.22 on Clef and 0.31 on Clef-flash, against 0.80 in production. Clef-flash scored 82.1% on Jev's thresholds and 90.6% with thresholds chosen for it on held-out cases. Swap the model in shadow, log probabilities, and set each threshold again.",
    },
    {
      question: "How fast is Clef?",
      answer:
        "Cloudflare reports a median of 209 ms for Clef and 38.8 ms for Clef-flash, against 524 ms for Jev. Construct's benchmark could not confirm or dispute that, because it called the models through Cloudflare's REST API from a laptop, a path with a floor of about 340 ms for every model. On that path the medians were 654 ms for Clef, 449 ms for Clef-flash and 454 ms for Jev.",
    },
    {
      question: "When should you use Clef-flash instead of Clef?",
      answer:
        "Use Clef-flash for high-volume gates that only skip or lower something, with thresholds measured for it. In Construct's test it reached 90.6% with its own thresholds, level with Jev, at about a third of Clef's price. Use Clef, at a high threshold, for anything that merges, deletes or sends, because Clef-flash was too eager on lookalike names.",
    },
  ],
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
        "Construct, for most founders and small teams. It starts at $9 a month with no per-seat fee, takes any job rather than one fixed role, saves finished work in a workspace your team shares, runs Calendar schedules with your laptop closed, and lets you inspect and correct what it remembers. We build Construct, which is why it leads our list, and we checked the other nine against their own pages on September 29, 2026.",
    },
    {
      question: "How much does an AI employee cost?",
      answer:
        "Entry prices checked on September 29, 2026 run from $0 for self-hosted OpenClaw, plus hosting and model costs, and $8 to $9 a month for CellCog and Construct, to $29.99 per user for Lindy and $280 a month for Artisan's sales agent. Most platforms meter work with credits, hours, or seats, so price a busy month. Construct Lite is $9, Starter is $59 for up to 5 agents across the whole workspace, and Pro is $299 with a 7-day trial.",
    },
    {
      question: "Is AI staff the same as an AI employee?",
      answer:
        "Mostly, yes. Vendors use AI employee, AI staff, AI worker, and AI teammate for software agents given a job rather than a single prompt. The differences that matter are whether the agent has a fixed role or takes any task, whether it has its own computer, and how its work is metered.",
    },
    {
      question: "What happens when an AI employee runs out of credits?",
      answer:
        "It depends on the vendor. Lindy pauses work until you top up, Sintra's AI employees stop working, Marblism cancels scheduled tasks and pauses its phone receptionist, Manus cannot start new tasks, and Artisan pauses new enrollments. Construct publishes its plan limits up front; you can move up a plan, and on Pro continue on your own model keys.",
    },
    {
      question: "Can I use Construct alongside another AI employee?",
      answer:
        "Yes. Keep a role-based tool for its narrow job and give Construct the recurring work around it. There is no import, so copy your current agent's instructions into Construct, move the source files into the workspace, connect the apps, run the job once, and put it on the Calendar.",
    },
    {
      question: "Can an AI employee answer phone calls?",
      answer:
        "Some can. Marblism's Rachel answers calls, transfers them, and texts you summaries, and Relevance AI offers outbound phone calls on its higher tiers. Artisan says its AI sales rep cannot legally make calls. Construct has no built-in phone agent, so a phone-first job is one of the few cases where another platform still fits.",
    },
  ],
  "grokbot-alternative": [
    {
      question: "Is Construct a good Grok Bot alternative?",
      answer:
        "Yes, for most founders and small teams. Construct starts at $9 a month with no other subscription needed, runs on your own keys for OpenRouter, OpenAI, Anthropic, Amazon Bedrock, or xAI on Pro, lets you inspect and correct what it remembers, and keeps finished work, schedules, and private apps in one team workspace.",
    },
    {
      question: "How much does Grok Bot cost compared with Construct?",
      answer:
        "Grok Bot has no standalone price. As of September 10, 2026, access comes with Cursor Pro at $20 a month or SuperGrok at $30 a month. Construct Lite costs $9 a month and includes 2 agents, 3 scheduled tasks, and an agent email address. Starter is $59 with 10 scheduled tasks, and Pro is $299 with 50 scheduled tasks and your own model keys.",
    },
    {
      question: "Can I use xAI model keys with Construct?",
      answer:
        "Yes. Construct Pro supports your own keys for xAI, OpenRouter, OpenAI, Anthropic, and Amazon Bedrock, either as a fallback after bundled limits or for every run. Your keys bill you directly when they are used. Grok Bot's settings documentation says Cursor manages model selection and there is no model picker.",
    },
    {
      question: "Can I use Construct alongside Grok Bot?",
      answer:
        "Yes. Keep Grok Bot through Cursor or SuperGrok for your own tasks and give Construct the recurring jobs your team needs to see. There is no import, so copy the bot's instructions into Construct, move the source files into the workspace, connect the apps, run the job once, and then put it on the Calendar.",
    },
    {
      question: "When does Grok Bot still make sense?",
      answer:
        "When you already pay for Cursor Pro or SuperGrok and only want to try the included Bot allowance, when you prefer teaching a routine by demonstrating it, or when you want several named bots coordinating in shared threads. For recurring team work with files, schedules, your own model keys, and correctable memory, Construct fits better.",
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
      question: "Is Construct a good Zapier alternative?",
      answer:
        "For work that needs judgment, yes. Construct starts at $9 a month and takes an outcome, such as a weekly competitor pricing summary, then works out the browser, app, and file steps at run time. Zapier, Make, and n8n run the triggers and actions configured in advance, so every unusual input needs a filter or router built ahead of time.",
    },
    {
      question: "Can I use Construct and Zapier together?",
      answer:
        "Yes. Keep high-volume record syncing, fixed-template notifications, and webhook plumbing on your automation platform, and move the flow that has grown the most branches or still ends with a person cleaning up to Construct. There is no import of Zaps or scenarios; describe the outcome, run it once, and put it on the Calendar.",
    },
    {
      question: "Can Construct run scheduled workflows like Zapier does?",
      answer:
        "Yes. Construct saves a job as a versioned workflow that runs on demand or from its Calendar, on Construct's servers with your laptop closed. Lite includes 3 scheduled tasks, Starter 10, and Pro 50. Workflows run in a straight line, with conditional logic inside an agent step, and they do not pause for approval yet, so ask for drafts of anything customer-facing.",
    },
    {
      question: "What happens when inputs change unexpectedly?",
      answer:
        "A fixed trigger-action flow handles the cases its builder anticipated. Construct interprets the unusual case with an agent step, then continues through connected-app actions, live browser work, files, or in-app notifications, and leaves the files and an Activity summary in the workspace.",
    },
    {
      question: "When do Zapier, Make, or n8n still make sense?",
      answer:
        "For high-volume record syncing or notifications with fixed templates, for webhook plumbing that needs sub-minute reaction time, or for a procedure that depends on drawn branches, delays, or approval steps today.",
    },
  ],
  "construct-vs-chatgpt": [
    {
      question:
        "Is Construct a good alternative to ChatGPT, Claude, or Gemini for recurring work?",
      answer:
        "Yes. Construct starts at $9 a month and gives you an AI employee with its own workspace, files, Calendar schedules, and email address. It runs jobs on a schedule with your laptop closed, starts next week's run from this week's files, and lets you inspect and correct what it remembers. Chat assistants organize work around a conversation, with tools and scheduling that vary by product and plan.",
    },
    {
      question: "Can ChatGPT already schedule tasks?",
      answer:
        "Some chat products offer scheduling and automation, depending on plan. The difference is where the work lives afterward: Construct saves files to the workspace as the run goes and keeps run history and Activity records after the conversation ends, so the next scheduled run starts from what the last one left.",
    },
    {
      question: "Can I use Construct alongside ChatGPT, Claude, or Gemini?",
      answer:
        "Yes. Keep your chat assistant for brainstorming and drafting, and move the job you repeat every week to Construct. There is no import, so copy your weekly prompt into Construct, move the source files into the workspace, connect the apps, run it once, and put it on the Calendar.",
    },
    {
      question: "Can I see what the agent actually did?",
      answer:
        "Yes. Construct's Activity records each action with a short reason, alongside chat tool records, workspace files, and sent messages. Its long-term memory can be inspected, corrected, or forgotten rather than staying opaque.",
    },
    {
      question: "When does a chat assistant still make sense?",
      answer:
        "When you want to brainstorm or draft with nothing to run afterward, when you have a one-shot question, or when you are exploring a problem before any work begins. For work that repeats, crosses apps, and has to leave files and a record behind, Construct is the better fit.",
    },
  ],
  "construct-vs-copilot": [
    {
      question:
        "Is Construct a good alternative to Microsoft Copilot or Google Workspace AI?",
      answer:
        "For work that crosses vendors, yes. Construct starts at $9 a month and works across Gmail, Drive, Linear, GitHub, Notion, HubSpot, and more through its live integration catalog, drives a live browser for systems with no integration, and runs recurring jobs on the Calendar with your laptop closed. Suite copilots are built to work inside their own suites.",
    },
    {
      question: "Can I use Construct alongside Copilot or Gemini?",
      answer:
        "Yes. Keep your suite copilot for drafting inside documents and give Construct the job that pulls from several systems, such as a monthly board pack. There is no import, so write the job down with where each input lives, connect those apps, run it once, and put it on the Calendar.",
    },
    {
      question: "Which applications can Construct connect to?",
      answer:
        "Construct connects supported tools such as Gmail, Drive, Linear, GitHub, Notion, and HubSpot through its live integration catalog, and you can add custom MCP tools for internal systems. You can also hand it work from the web, Slack, Telegram, Discord, or its own email inbox.",
    },
    {
      question: "What can Construct do that a suite copilot does not?",
      answer:
        "Construct gives the agent a sandbox terminal, live browser runs, persistent files, its own inbox, schedules, and workflows in one web desktop. That covers work that falls between products, such as driving a vendor portal, running a script over an exported file, or assembling a report from four systems, and every run saves its output to workspace files as it goes.",
    },
    {
      question: "When does a suite copilot still make sense?",
      answer:
        "When your entire workflow lives inside Microsoft 365 or Google Workspace, when inline drafting inside Office or Docs is all you need, or when adding any new vendor is a significant procurement hurdle for your organization.",
    },
  ],
  "construct-vs-diy": [
    {
      question: "Should I use Construct instead of building my own AI agent?",
      answer:
        "For most founders and small teams, yes. Construct is working today from $9 a month, with the sandbox, app connections, channels, memory, schedules, and activity records already built and hosted. Building your own on a framework means designing and operating each of those layers yourself and keeping up with model, connector, and browser changes.",
    },
    {
      question: "Do I lose control by using a hosted product?",
      answer:
        "Less than you might expect. You can add custom MCP servers for internal systems, bring your own keys for OpenRouter, OpenAI, Anthropic, Amazon Bedrock, or xAI on Pro, connect supported applications, and have the agent build a private workspace app for a recurring internal process.",
    },
    {
      question: "Can I use Construct alongside the agent I am building?",
      answer:
        "Yes. Expose the internal tools you built as an MCP server and let Construct run the general operating work, while you keep building only where it differentiates your product. There is no import, so copy your agent's system prompt and procedures into Construct, run the job once, and put it on the Calendar.",
    },
    {
      question: "What does building your own agent really cost?",
      answer:
        "Not just the model bill. A DIY stack costs engineering time, the infrastructure it runs on, and ongoing maintenance as models, connector APIs, and websites change. Construct's plans are $9, $59, and $299 a month at a fixed monthly price with published plan limits.",
    },
    {
      question: "When does building your own agent still make sense?",
      answer:
        "When your deployment must be air-gapped or on-premises, when the agent's behavior is itself the product you sell, or when full control over every layer is mandatory and you have a platform team to run it.",
    },
  ],
  "construct-vs-coding-agents": [
    {
      question:
        "Is Construct a good alternative to a coding agent for a small team?",
      answer:
        "For work wider than the repository, yes. Construct starts at $9 a month and handles the email, research, CRM updates, schedules, and code around a job in one workspace that non-engineers can supervise. Coding agents are documented around repositories, terminals, and pull requests, so their definition of done is a reviewable code change.",
    },
    {
      question: "Can Construct write code like a coding agent?",
      answer:
        "Construct has a sandbox terminal and can work with repositories, but code is one step in a broader business job. Each sandbox command runs for up to five minutes, so keep long builds and test suites in your CI, and keep a dedicated coding agent if a tested pull request is the whole job.",
    },
    {
      question: "What does Construct do that a coding agent does not?",
      answer:
        "Construct reads and replies from its own inbox, updates spreadsheets, schedules its own jobs on the Calendar, creates Google Calendar events when that app is connected, and replies in Slack when you @mention it. Results land in workspace files that anyone on the team can open.",
    },
    {
      question: "Can I use Construct alongside a coding agent?",
      answer:
        "Yes. Keep the coding agent on the repository and give Construct the intake and follow-up: triage the support inbox, log bug reports in your tracker, draft customer replies, and schedule a follow-up for when the fix ships. There is no import, so write your conventions into the first instruction.",
    },
    {
      question: "Can non-engineers supervise Construct?",
      answer:
        "Yes. Live browser work, a read-only terminal transcript, files, inbox, Calendar, workflows, memories, connected apps, notifications, and Activity summaries appear in one web desktop, so anyone can review outputs and interrupt a running turn without reading a diff.",
    },
    {
      question: "When does a coding agent still make sense?",
      answer:
        "When the whole job is software engineering inside a repository, when everyone who reviews the work is a developer, or when success is defined only by a tested, reviewable pull request.",
    },
  ],
  "ai-agent-vs-zapier": [
    {
      question: "Is Construct a good Zapier alternative?",
      answer:
        "For recurring work that needs reading, judgment, or research, yes. Construct plans its own steps across your apps, a live browser, workspace files, and its own email address from $9 a month, with 3 scheduled tasks on Lite. You describe the outcome once instead of building a tree of Paths, and it handles the cases your rules did not anticipate.",
    },
    {
      question: "What is the difference between an AI agent and a Zap?",
      answer:
        "A Zap runs a fixed trigger-action recipe that you wire in advance, capped at 100 steps and running in one direction. An AI agent such as Construct is given a goal and plans its own steps at run time, which matters when the inputs vary but the desired outcome stays the same.",
    },
    {
      question: "Can I use Construct alongside Zapier?",
      answer:
        "Yes. Keep the Zaps that do the same simple mapping every time, and give Construct the workflow that keeps needing a person to finish it. There is no import: describe the outcome and your rules in a Construct chat, connect the apps, run it once, then put it on the Calendar.",
    },
    {
      question: "How do the prices compare?",
      answer:
        "Construct Lite is $9 a month with 2 agents, 50 steps per task, and 3 scheduled tasks; Starter is $59 and Pro is $299, priced per plan rather than per seat. Zapier's Professional plan started at $29.99 a month for 750 tasks and Team at $103.50 for 2,000 tasks when this post was published.",
    },
    {
      question: "When does Zapier still make sense?",
      answer:
        "For a high-volume, fully deterministic mapping with no judgment in between, a workflow that must fire within seconds of an event, or a flow that needs built-in branching, delays, or approval steps today. For recurring work where inputs vary or a step needs research, Construct is the better fit.",
    },
  ],
  "ai-agent-vs-virtual-assistant": [
    {
      question:
        "Is Construct a good alternative to hiring a virtual assistant?",
      answer:
        "For recurring, cross-app work such as inbox review, CRM updates, scheduled research, and status reports, yes. Construct starts at $9 a month with its own email address and 3 scheduled tasks, runs with your laptop closed, and keeps a record of each action, while a part-time VA typically costs $1,000 to $3,000 a month.",
    },
    {
      question: "Can I use Construct alongside my VA?",
      answer:
        "Yes. Move the most repetitive item on your VA's task list to Construct: copy their written instructions into a chat, connect the apps, run it once, and put it on the Calendar. Your VA's hours then go to client relationships and judgment calls.",
    },
    {
      question: "How does the monthly cost compare?",
      answer:
        "Construct Lite is $9 a month, Starter $59, and Pro $299. The cited sources put a part-time VA at $1,000 to $3,000 a month, a full-time offshore agency hire at $640 to $2,400, and a US-based in-house assistant at $4,700 to $8,300 once benefits and recruiting are included.",
    },
    {
      question: "How do I verify the work was done correctly?",
      answer:
        "Construct's Activity feed records each action with a short reason, chat keeps the tool records, and the resulting files and sent messages stay in the workspace. Activity covers a limited window and is an operating record rather than a complete audit log, so save anything you need long term as a file.",
    },
    {
      question: "When does a human VA still make sense?",
      answer:
        "For customer-facing conversations that turn on tone or empathy, relationship work such as high-stakes client calls or negotiations, and anything in the physical world. For the recurring execution around that work, Construct is faster and cheaper.",
    },
  ],
  "ai-agent-memory": [
    {
      question: "Does Construct have memory you can see and edit?",
      answer:
        "Yes. Construct's Memories app lets you search everything the agent remembers, see the evidence behind each item, correct it, forget it, or restore it. Memory is included on every plan, starting with Lite at $9 a month.",
    },
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
      question: "What does Construct learn automatically?",
      answer:
        "Conversation episodes and successful public web search or fetch evidence. Facts from uploaded files, connected-app results, terminal output, and live browser runs are added when you or the agent save them explicitly, which keeps credentials and half-finished work out of memory.",
    },
    {
      question: "Can I move my context from ChatGPT memory or another agent?",
      answer:
        "There is no import, but it takes minutes: write down the standing facts your current assistant relies on, paste them into a Construct chat, ask it to remember them, and check each one in the Memories app.",
    },
  ],
  "what-is-an-ai-employee": [
    {
      question: "What is an AI employee?",
      answer:
        "An AI employee is AI software you assign outcomes to, not just questions. It plans a multi-step job, uses tools such as a browser, email, and connected apps to finish it, and keeps the files and context behind the work so the next job starts from there. Construct gives you one from $9 a month.",
    },
    {
      question: "Is Construct an AI employee?",
      answer:
        "Yes. Construct works from a web desktop with files, memory you can correct, a Calendar, workflows, a live browser, a sandbox terminal, connected apps, and its own email address. Lite costs $9 a month for 2 agents, 50 steps per task, and 3 scheduled tasks, and Pro has a 7-day free trial.",
    },
    {
      question: "How is an AI employee different from a chatbot?",
      answer:
        "A chatbot responds. An AI employee executes: it acts across email, a live browser, a terminal, and connected apps, keeps the resulting files and history, and picks work back up on a schedule, so next week's run starts from this week's result.",
    },
    {
      question:
        "Can I use Construct alongside ChatGPT or another chat assistant?",
      answer:
        "Yes. Keep the chat assistant for brainstorming and move the recurring job you keep re-explaining to Construct: paste the prompt, upload the files, connect the apps, run it once, and put it on the Calendar. There is no import of chat history.",
    },
    {
      question: "Does an AI employee work without supervision?",
      answer:
        "It runs on its own but stays supervised. In Construct you can inspect outputs, review Activity records of each action with a short reason, and interrupt a running turn. Start with on-demand runs, schedule a job once its output is reliably right, and ask for drafts on anything customer-facing.",
    },
  ],
  "ai-workflow-automation": [
    {
      question: "What is an AI workflow in Construct?",
      answer:
        "A reusable procedure combining agent steps, connected-app actions, and notifications, saved from a run that already worked. Anyone on the team can run it on demand, or it can run from the native Calendar, server-side with your laptop closed. Lite includes 3 scheduled tasks for $9 a month.",
    },
    {
      question:
        "Is Construct a good alternative to Zapier or Make for recurring work?",
      answer:
        "For recurring work that needs research, judgment, or a site with no integration, yes. An agent step handles the parts a fixed mapping cannot, and every run leaves files and history. Keep your existing automations for deterministic, high-volume mappings and add Construct alongside.",
    },
    {
      question: "Can workflows include branching or approval steps?",
      answer:
        "Not yet. Workflows run as a straight sequence, so put conditional work inside an agent step, split multi-stage procedures into separate scheduled workflows, and have customer-facing workflows save drafts for a person to send.",
    },
    {
      question: "What can a workflow act on?",
      answer:
        "Connected business apps, web search and fetch, live browser runs, the sandbox terminal, workspace files, the agent's own email, and in-app notifications, so a single procedure can span the tools a process actually touches.",
    },
    {
      question: "When does a trigger-action tool still make sense?",
      answer:
        "For purely deterministic, high-volume mappings with no judgment step, work that must react within seconds of an event, or a flow that needs built-in branching, delays, or fan-out today.",
    },
  ],
  "chat-assistants-vs-ai-employees": [
    {
      question:
        "Is Construct a good alternative to ChatGPT or Claude for recurring work?",
      answer:
        "Yes. From $9 a month, Construct reads your apps, drafts and sends from its own inbox, saves the finished files, and runs the same job again from its Calendar. A chat assistant hands the result back to you, so you gather the data, do the sending, and start over next month.",
    },
    {
      question: "Can I use Construct alongside a chat assistant?",
      answer:
        "Yes. Keep your chat assistant for brainstorming and quick drafts, and move the job you re-explain every week to Construct. Paste the prompt you reuse into a Construct chat, upload the files, connect the apps, run it once, and put it on the Calendar. There is no import of chat history.",
    },
    {
      question: "What does Construct do that a chat assistant does not?",
      answer:
        "It executes across a live browser, a sandbox terminal, workspace files, connected apps, and its own email address in one task. It keeps files, procedures, schedules, and memory you can correct in one workspace, and Activity records each action with a short reason.",
    },
    {
      question: "What should I look for when comparing the two?",
      answer:
        "Ask where the work lives after the conversation ends, which surfaces the tool can actually act on, whether it can run again on a schedule with your laptop closed, and what record it leaves of the work it did.",
    },
    {
      question: "When does a chat assistant still make sense?",
      answer:
        "For thinking through a problem before any work begins, one-shot drafting such as rewriting a paragraph, and questions with no side effects. For work that has to execute, recur, and leave a record, Construct is the better fit.",
    },
  ],
  "ai-employee": [
    {
      question: "What does Construct's AI employee cost?",
      answer:
        "Lite is $9 a month with 2 agents, 50 steps per task, 3 scheduled tasks, and an agent email address. Starter is $59 with 5 agents, 150 steps, and 10 scheduled tasks. Pro is $299 with 15 agents, up to 1,000 steps per task, 50 scheduled tasks, bring-your-own-key support, and a 7-day free trial.",
    },
    {
      question: "What work can an AI employee complete?",
      answer:
        "Research, tool operation, file creation, and recurring work run from a persistent workspace: a cited market brief, a cleaned spreadsheet, inbox replies, CRM updates, or a weekly operating report that runs from the Calendar with your laptop closed.",
    },
    {
      question: "How is the work kept accountable?",
      answer:
        "The workspace keeps files, run history, and Activity records of each action with a short reason, and long-term memory stays inspectable and correctable. Activity is a readable operating record for a limited window, not a complete immutable audit log, so regulated teams should keep their own records alongside.",
    },
    {
      question: "Can I use Construct alongside the tools I already have?",
      answer:
        "Yes. Copy the instructions you use today into a Construct chat, upload last week's output, connect the apps, run it once, and put it on the Calendar. There is no import, so write your rules into the first instruction and Construct saves them as memory you can read.",
    },
    {
      question: "When does another tool still make sense?",
      answer:
        "High-volume deterministic mappings can stay on a trigger-action platform, work that lives entirely inside one office suite may be covered by that suite's assistant, and repository-centric engineering suits coding agents. For jobs that cross tools and recur, Construct is the better fit.",
    },
  ],
  "build-internal-tools-with-construct": [
    {
      question: "Can Construct build internal tools for my team?",
      answer:
        "Yes. From $9 a month, Construct builds private workspace apps such as request trackers, intake forms, review queues, and dashboards. You describe the process in plain language, and the agent writes the React and TypeScript, validates it, and opens it in your web desktop.",
    },
    {
      question: "What happens if a build breaks?",
      answer:
        "Construct keeps the last successful build running, so a failed update does not take the working tool offline while it reads the app's diagnostics, repairs the source, and validates again.",
    },
    {
      question: "Do I need to be a developer to use it?",
      answer:
        "No. You describe the records the app manages, the actions an operator takes, and the files it may access. Construct writes, validates, and publishes the app, and updates it later as the process changes. The source stays in your Files if anyone wants to read it.",
    },
    {
      question: "What can a workspace app access?",
      answer:
        "Only what it declares. Each app lists the native capabilities, connected apps, and exact HTTPS origins it needs, and calls outside those allowlists are denied at runtime. File operations stay subject to the user's workspace access.",
    },
    {
      question: "When is a workspace app the wrong choice?",
      answer:
        "A workspace app is a private internal interface for one workspace. For a public customer-facing site, a product that needs the wider npm ecosystem, or a system with its own infrastructure, keep a dedicated hosting stack and let Construct build the internal tools around it.",
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
        "Not as a mandatory gate on every external side effect. Construct gives you work as files in a persistent workspace, Activity records of what each action affected, when it ran, and why, inspectable and correctable memory, and the ability to interrupt a running turn. Steps with irreversible effects such as a customer email or a payment still need supervision before you let them run unattended.",
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
      question: "What is the best ChatGPT Dots alternative for a small team?",
      answer:
        "Construct. It starts at $9 a month with no ChatGPT subscription, runs scheduled jobs from the cloud with your laptop closed, keeps finished work in a workspace the whole team can open, and lets you inspect and correct what it remembers. Team workspaces have no per-seat fee.",
    },
    {
      question: "Do I need ChatGPT Pro to use ChatGPT Dots?",
      answer:
        "Yes. Your first dot is included with ChatGPT Pro or Business Premium, and Free and Plus users do not get one. Reports disagree on whether the $100 Pro tier counts, so budget $200 a month for one person until OpenAI's pricing page settles it.",
    },
    {
      question: "Can I use Construct alongside ChatGPT Dots?",
      answer:
        "Yes. Keep your dot for personal follow-ups inside ChatGPT and give Construct the recurring team work. Start on Lite for $9 or the 7-day Pro trial, copy your dot's instructions into Construct, move the files, connect the apps, run the job once, and put it on the Calendar. There is no import of a dot's learned preferences.",
    },
    {
      question: "Which AI agents keep working while my laptop is closed?",
      answer:
        "Construct runs Calendar schedules on its servers, and ChatGPT Dots, Gemini Spark, Grok Bot, Meta Muse, and Viktor also work from cloud environments the vendor runs. Claude Cowork's scheduled tasks run while your computer is asleep, Manus offers an always-on Cloud Computer add-on from $30 a month, and OpenClaw needs a machine or hosted instance that stays on.",
    },
    {
      question: "Can I use ChatGPT Dots in the UK or EU?",
      answer:
        "Not on a Pro plan for now. Pro subscribers in the European Economic Area, Switzerland, and the UK are excluded, while Business Premium users get dots in every supported ChatGPT region. Gemini Spark is also excluded in those regions. Confirm your country at sign-up for any alternative.",
    },
    {
      question: "When does ChatGPT Dots still make sense?",
      answer:
        "When you already pay for ChatGPT Pro 200 and only want a personal assistant inside ChatGPT, when your company runs on Microsoft Teams or you want to call your agent by voice, or when you need built-in approval rules on every account action today. For recurring team work with shared files and schedules, Construct is the better fit.",
    },
  ],
  "construct-vs-openai-dots": [
    {
      question: "Is Construct a good ChatGPT Dots alternative?",
      answer:
        "Yes, for most founders and small teams. Construct starts at $9 a month instead of a $100 to $200 ChatGPT Pro plan, runs on the model you choose, lets you inspect and correct what it remembers, and keeps finished work in a shared workspace with no per-seat fee.",
    },
    {
      question: "How much does ChatGPT Dots cost?",
      answer:
        "There is no standalone Dots price. Your first dot is included with an eligible ChatGPT Pro or Business Premium subscription, and launch reports disagree on whether the $100 Pro 100 tier qualifies or whether you need Pro 200 at $200 a month. OpenAI has not announced prices for extra dots or the usage terms that apply after the first month.",
    },
    {
      question: "Is there a free version of ChatGPT Dots?",
      answer:
        "No. Launch coverage says Dots are not available on Free, Go, or Plus plans, and personal Pro subscribers in the European Economic Area, Switzerland, and the UK are excluded for now. Construct starts at $9 a month, with a 7-day Pro trial.",
    },
    {
      question: "Can I choose the AI model in ChatGPT Dots or Construct?",
      answer:
        "Launch coverage describes Dots as powered by GPT-6 Astra, and we found no documented option to use another provider. Construct runs on bundled models, and Construct Pro supports your own keys for OpenRouter, OpenAI, Anthropic, Amazon Bedrock, and xAI.",
    },
    {
      question: "Can I use Construct alongside ChatGPT Dots?",
      answer:
        "Yes. Keep your dot for personal follow-ups inside ChatGPT and move recurring team jobs to Construct, where files, schedules, and memory are shared. There is no import, so copy the dot's instructions into Construct, run the job once, and then put it on the Calendar.",
    },
    {
      question: "When does ChatGPT Dots still make sense?",
      answer:
        "When you already pay for ChatGPT Pro 200 and only want a personal assistant inside ChatGPT, when your company runs on Microsoft Teams or you want voice calls, or when you need built-in approval rules on every account action today.",
    },
  ],
  "ai-agent-with-its-own-computer": [
    {
      question: "What is an AI agent with its own computer?",
      answer:
        "It is an AI agent that gets a persistent machine in the cloud, with a browser, a terminal, files, connected apps, and often its own email address. Because the work runs on that machine instead of your laptop, it keeps going when you close the lid and can run jobs on a schedule.",
    },
    {
      question:
        "Which AI agent with its own computer is best for a small team?",
      answer:
        "We recommend Construct, which we build. From $9 a month it gives each agent a workspace with files, a browser, a terminal, and its own email inbox, runs Calendar schedules with every device off, saves finished work as it goes, and lets you inspect and correct its memory.",
    },
    {
      question: "Which AI agents have their own cloud computer?",
      answer:
        "As of October 1, 2026, they include Construct, OpenAI dots, Meta Muse, Grok Bot, Claude Cowork, Gemini Spark, Perplexity Computer, Manus, Genspark Claw, Simular Sai, and Viktor. Most of the big-platform versions launched between July and September 2026.",
    },
    {
      question: "How much does an always-on AI agent cost?",
      answer:
        "Construct starts at $9 a month with no other subscription needed. Most big-platform agents are bundled into subscriptions such as Claude Pro or Cursor Pro at $20, ChatGPT Pro from $100, or Perplexity Max at $200, and Simular's plan with an always-on machine is $500, checked on October 1, 2026.",
    },
    {
      question: "What are the risks of giving an AI agent its own computer?",
      answer:
        "The main risks are credential access, prompt injection, and runaway cost. In Construct, the agent works from its own email address, only mail from your own account address starts a run, memory is open to inspection, and each plan has a fixed monthly price with published plan limits.",
    },
    {
      question: "Can I use Construct alongside the agent I already pay for?",
      answer:
        "Yes. Keep your ChatGPT, Claude, or Gemini agent for personal follow-ups and move one recurring team job to Construct. There is no import, so copy the instructions, move the files, connect the apps, run it once, and put it on the Calendar.",
    },
  ],
  "muse-for-small-business-alternatives": [
    {
      question: "Is Construct a good Muse for Small Business alternative?",
      answer:
        "Yes, for founders and small teams whose work crosses several apps. Construct starts at $9 a month, connects to tools such as Gmail, Notion, HubSpot, and Airtable through its integration catalog, saves finished work to workspace files your team can open, lets you inspect and correct its memory, and runs scheduled jobs with your laptop closed.",
    },
    {
      question: "How much does Meta's Muse for Small Business cost?",
      answer:
        "Muse for Small Business uses the same pricing as the Muse app: free with a usage limit, then the Power plan at $20 a month or the Maximum plan at $100 a month. Paid plans are metered in Muse tokens per week, and DataCamp reports that Muse asks for a payment card even on the free tier.",
    },
    {
      question: "Can I use Construct alongside Muse?",
      answer:
        "Yes. Keep Muse for Instagram and Facebook work and give Construct the jobs that cross the rest of your stack. Start on Lite for $9 or the 7-day Pro trial, copy your instructions into Construct, move the files, connect the apps, run the job once, and put it on the Calendar. There is no import from Muse.",
    },
    {
      question: "Does Construct connect to Meta ad accounts like Muse does?",
      answer:
        "Construct does not have Meta's first-party access to ad accounts and Instagram analytics. For ad spend, export the numbers from Ads Manager and drop the file in the workspace, and Construct includes them in the report alongside your other connected apps.",
    },
    {
      question:
        "Will switching away from Muse stop websites from blocking my AI agent?",
      answer:
        "No. Amazon blocked Muse from Amazon.com, and any agent that clicks through websites can be refused by a site, Construct included. Using a connected app or API where one exists reduces that risk, and Construct's integration catalog and custom MCP tools give you that route.",
    },
    {
      question: "When does Muse for Small Business still make sense?",
      answer:
        "When most of your selling and advertising happens on Instagram and Facebook and you want the agent reading Meta ad accounts directly, when you are in the US or Canada and want to start for nothing, or when you want the agent inside WhatsApp and Meta's apps. For recurring work across your inbox, CRM, store, and shared files, Construct is the better fit.",
    },
  ],
  "construct-vs-lindy": [
    {
      question: "Is Construct a good Lindy alternative?",
      answer:
        "Yes, for founders and small teams with recurring work. Construct starts at $9 a month instead of $29.99 per user, covers the whole team without seats, keeps finished work in workspace files, saves progress when a run stops partway, and runs on your own model keys on Pro.",
    },
    {
      question: "Is Construct cheaper than Lindy?",
      answer:
        "Yes at the entry level. Construct Lite is $9 a month, while Lindy Plus is $29.99 a month per user with 3,000 credits. For a team of three, Lindy Plus is $89.97 a month before top-ups, while Construct Starter at $59 covers up to 5 agents for the whole workspace with no member limit.",
    },
    {
      question: "Can I use Construct alongside Lindy?",
      answer:
        "Yes. Keep Lindy for inbox and meeting help in Slack and give Construct the recurring reports and research. There is no import, so copy the instructions and Routine prompt into Construct, connect the apps, run the job once, and then put it on the Calendar.",
    },
    {
      question: "Can Construct work in Slack like Lindy?",
      answer:
        "Yes, for the requests your team sends it. Construct answers @mentions in Slack channels, keeps working in that thread, and takes direct messages. It does not read the rest of a channel, and scheduled runs report in the Construct web app with a notification. It also answers on the web, Telegram, Discord, and its own email inbox.",
    },
    {
      question: "How does Lindy pricing work?",
      answer:
        "Lindy charges per user: Plus is $29.99, Pro is $99.99, and Max is $199.99 a month, with 3,000, 15,000, and 35,000 credits per user. Anyone who uses Lindy takes a seat, credits pool across the workspace, and work pauses when the pool runs out unless you buy top-ups.",
    },
    {
      question: "When does Lindy still make sense?",
      answer:
        "When your whole team works inside Slack and each person wants a private assistant in their DMs, when you need per-action approval before every write or HIPAA with a signed BAA on Enterprise, or when you want to text your agent over iMessage or SMS.",
    },
  ],
  "ai-agent-email-address": [
    {
      question: "How can I give an AI agent its own email address?",
      answer:
        "The simplest way is a product with a native agent inbox. Construct includes an agent email address on every plan from $9 a month, with no code. The other routes are a developer email API such as AgentMail, where you build the agent yourself, or delegated access to your own Gmail, where the agent acts as you.",
    },
    {
      question: "Why use Construct for an agent email address?",
      answer:
        "The address is included on every plan, only mail from your own account address starts a run, the agent sends as itself instead of as you, and the inbox comes with files, memory you can inspect and correct, and Calendar schedules that run with your laptop closed.",
    },
    {
      question: "Can I hand tasks to an AI agent by email?",
      answer:
        "Yes. In Construct, forward a thread to the agent's address from your own account address with the job written at the top. Mail from other senders is kept in the inbox but never starts work on its own. A good first test is a low-stakes task that ends with a draft rather than a sent reply.",
    },
    {
      question: "Should the agent send from its own address or from my Gmail?",
      answer:
        "Send from the agent's own address when it is fine for the recipient to know an agent wrote it, such as internal updates, vendor questions, and weekly reports. Use your connected Gmail only when the message has to come from you, and name the sending address in the prompt.",
    },
    {
      question:
        "How do I review the agent's emails before they reach a customer?",
      answer:
        "Construct's workflows do not pause for approval yet, so ask the agent for drafts, read them, and only then tell it to send. The agent can also stop to ask when something is ambiguous, and you can interrupt a running task.",
    },
    {
      question: "When do AgentMail or Gmail delegation still make sense?",
      answer:
        "AgentMail suits a developer building their own agent from scratch who wants many inboxes on their own domain; it lists a free plan with 3 inboxes and a Developer plan at $20 a month. Gmail delegation fits only the few threads that genuinely need your identity, since a delegate can read, send, and delete email in your account.",
    },
  ],
  "gemini-spark-alternatives": [
    {
      question: "Is Construct a good Gemini Spark alternative?",
      answer:
        "Yes, for founders and small teams. Construct starts at $9 a month with no Google AI subscription, connects Gmail and Google Calendar alongside apps such as Notion, HubSpot, and Linear through its integration catalog, saves finished work to files your team can open, and runs scheduled jobs from the cloud with your laptop closed.",
    },
    {
      question: "Can I use Gemini Spark with a Google Workspace work account?",
      answer:
        "Not today for most people. Google's help page says you must sign in to the Gemini app with a personal Google Account, and work or school accounts are not currently supported. Google announced in May 2026 that a Workspace preview for business customers is coming soon, but we found no general availability date.",
    },
    {
      question: "Is Gemini Spark available in the UK or EU?",
      answer:
        "No. Google lists Spark as available wherever Gemini Apps are supported except the European Economic Area, Nigeria, Switzerland, and the United Kingdom, and those regions were still excluded on October 1, 2026. Claude lists the UK, EU countries, and Switzerland as supported, and ChatGPT dots are available there on a Business Premium seat. Confirm availability for your country at sign-up for any alternative.",
    },
    {
      question: "How much does Gemini Spark cost?",
      answer:
        "Spark has no separate price and comes with a Google AI Pro or Ultra subscription. It launched for US Ultra subscribers, reported at $100 a month, and reached the Pro tier, about $20 a month in the US, in late July 2026. Construct starts at $9 a month on its own plan.",
    },
    {
      question: "Can I use Construct alongside Gemini Spark?",
      answer:
        "Yes. Keep Spark for personal errands in your Google account and give Construct the work your team shares. Start on Lite for $9 or the 7-day Pro trial, copy your task instructions into Construct, connect the apps, run the job once, and put it on the Calendar. There is no import from Spark.",
    },
    {
      question: "When does Gemini Spark still make sense?",
      answer:
        "When you use a personal Google account outside the excluded regions and already pay for Google AI Pro, or when your work happens almost entirely inside Docs, Sheets, Slides, and Maps. For recurring team work across Gmail, a CRM, a tracker, and the web, Construct is the better fit.",
    },
  ],
  "lindy-alternatives": [
    {
      question: "Is Construct a good Lindy alternative?",
      answer:
        "Yes, for founders and small teams. Construct starts at $9 a month, priced by plan rather than by person, while Lindy Plus is $29.99 per user. Team workspaces have no member limit, finished work is saved as files in a shared workspace, memory can be inspected and corrected, and Calendar schedules run with your laptop closed.",
    },
    {
      question: "Why do people look for a Lindy alternative?",
      answer:
        "Mostly billing. Lindy charges $29.99 per user a month on Plus, anyone who uses it takes a seat, including someone who only mentions it in Slack, and credit-using actions pause when the shared pool runs out. Some people also want the agent builder Lindy used to emphasize, or an agent that works outside Slack.",
    },
    {
      question:
        "What does a five-person team pay for Construct compared with Lindy?",
      answer:
        "Construct Starter is $59 a month for the whole workspace, with up to 5 agents, 10 scheduled tasks, and no member limit. Five Lindy Plus seats cost $149.95 a month at list prices. Allowances differ, so model a busy month before you choose.",
    },
    {
      question: "Can I use Construct alongside Lindy?",
      answer:
        "Yes. Start on Construct Lite for $9 or the 7-day Pro trial, copy your instructions into a Construct chat, connect the apps the job needs, run it once, and put it on the Calendar. There is no import, so write your rules into the first instruction. For customer-facing work, ask for drafts and send them yourself, because Construct workflows do not pause for approval yet.",
    },
    {
      question: "When does Lindy still make sense?",
      answer:
        "Lindy can still fit if you want iMessage or SMS or a built-in meeting recorder, if you need approval in Slack before each write action, or if your whole team already has Lindy seats and the credit pool covers your month.",
    },
    {
      question: "Which Lindy alternative is cheapest for one person?",
      answer:
        "Construct Lite at $9 a month includes 2 agents, 3 scheduled tasks, and an agent email address. CellCog Starter is $8 for 800 credits, and Manus and Zapier Agents have free tiers. Entry prices are not working budgets, so price a busy month.",
    },
  ],
  "ai-agent-gmail-access-safely": [
    {
      question:
        "Is Construct a good way to give an AI agent email access safely?",
      answer:
        "Yes. Every Construct plan from $9 a month includes an agent email address, so most agent email never touches your Gmail. Only mail you send from your own address starts a run. When a job needs your Gmail, you connect it as a separate step, block it for agents that do not need it, and review every action in Activity.",
    },
    {
      question: "How do I let an AI agent use my Gmail safely?",
      answer:
        "Give it the least it needs: its own inbox for most email, your Gmail only for jobs that must come from you, drafts instead of sends, and a regular look at what it did. Know how to revoke access in Construct and in your Google Account before you start.",
    },
    {
      question: "What does connecting Gmail to an AI agent actually grant?",
      answer:
        "It depends on the scopes on Google's consent screen. Google classes 8 Gmail scopes as restricted, including one that can read, compose, send, and permanently delete all email, so read the consent screen before you click Allow.",
    },
    {
      question: "Can I give Construct read-only access to Gmail?",
      answer:
        "Not yet. The connected Gmail app can read, search, label, draft, send, move to trash, and delete. Set it up so that does not matter: connect a role account, allow Gmail only for your mail agent under App access, and ask for drafts that you send yourself.",
    },
    {
      question: "How do I see what the agent did in my Gmail?",
      answer:
        "Open the Activity app in Construct, filter to Actions, and search for Gmail. Each row has the reason the agent gave and a link to the chat, and you can export Activity as CSV or JSON. Then check Gmail's Sent folder and Trash.",
    },
    {
      question: "How do I revoke an AI agent's Gmail access?",
      answer:
        "In Construct, open Settings, then Connections, and choose Disconnect next to Gmail; agents lose access straight away. Then remove access in your Google Account's third-party connections page with See details, Remove access, and Confirm. Pause any scheduled jobs that use Gmail too.",
    },
  ],
  "construct-vs-muse": [
    {
      question: "Is Construct a good Muse for Small Business alternative?",
      answer:
        "Yes, for most founders and small teams. Construct starts at $9 a month and gives your business an AI employee with its own workspace, files, schedules, and email address that the whole team can use. Muse is a personal agent tied to one Meta account and offered only in the US and Canada.",
    },
    {
      question: "Can I use Construct alongside Muse?",
      answer:
        "Yes. Keep Muse for your Instagram and Facebook ads and give Construct the reports, follow-ups, and trackers that live in Gmail, a CRM, and the web. Start on Lite for $9, copy your instructions, connect the apps, run the job once, and put it on the Calendar.",
    },
    {
      question:
        "How much does Muse for Small Business cost compared with Construct?",
      answer:
        "Muse has a free tier with usage limits Meta does not publish in numbers, plus Power at $20 and Maximum at $100 a month, metered in tokens per week. Construct Lite is $9 a month for 2 agents, 50 steps per task, and 3 scheduled tasks, and plans are priced per plan rather than per person.",
    },
    {
      question: "Can my team share Muse or Construct?",
      answer:
        "The Muse pages we read describe a personal agent on one Meta account and mention no team plan. Construct's team workspaces hold the agent, files, apps, and conversations together, with Owner, Admin, and Member roles, no member limit, and usage drawn from the owner's plan.",
    },
    {
      question: "When does Muse for Small Business still make sense?",
      answer:
        "Muse fits if your selling and advertising happen almost entirely on Instagram and Facebook and you want first-party access to Meta ad accounts, if you want approval on every send and spend built in today, or if you run the business alone from your phone and WhatsApp.",
    },
    {
      question: "Can I move from Muse to Construct?",
      answer:
        "There is no import. Copy your instructions, download the memory and files you want to keep, connect the apps the job needs, and run the job once before scheduling it. Construct's workflows do not pause for approval yet, so ask for drafts of anything customer-facing and send them yourself.",
    },
  ],
  "always-on-ai-agents-compared": [
    {
      question:
        "Is Construct a good alternative to Dots, Muse, Grok Bot, and Claude Cowork for a small business?",
      answer:
        "Yes, for founders and small teams. Construct starts at $9 a month, needs no Meta, ChatGPT, Claude, or Cursor account, and a team workspace on any plan covers everyone with no per-seat fee. Finished work lands in files the team shares, Calendar schedules run with your laptop closed, and you can read and correct what the agent remembers.",
    },
    {
      question: "Which always-on AI agent is cheapest for a three-person team?",
      answer:
        "Muse for Small Business is $0 on its free tier, with three separate personal agents. Construct Starter is $59 for one shared team workspace with up to 5 agents. Claude Team Standard is $75 at $25 per seat, Cursor Teams with Grok Bot is $120 at $40 per user, and ChatGPT Business Premium with Dots is $375 at $125 per seat. These are subscription prices, not the cost of a finished job.",
    },
    {
      question:
        "Can I use Construct alongside ChatGPT Dots, Muse, Grok Bot, or Claude?",
      answer:
        "Yes. Keep your current agent for personal work and give Construct the recurring team jobs. Start on Lite for $9 or the 7-day Pro trial, copy your instructions, move the source files, connect the apps, run the job once, and put it on the Calendar. There is no import, so write your rules into the first instruction and Construct saves them as memory you can read.",
    },
    {
      question: "Which of these agents work in the UK or EU?",
      answer:
        "Anthropic lists the UK, EU countries, and Switzerland as supported for Claude. Dots on ChatGPT Pro excludes the EEA, Switzerland, and the UK, but Business Premium works in every supported ChatGPT region. Muse for Small Business is US and Canada only, and the Grok Bot documentation we read does not mention regions.",
    },
    {
      question: "Do these agents ask before acting?",
      answer:
        "Muse says nothing publishes, sends, or spends without approval. Dots use Custom Rules to allow, block, or require approval. Grok Bot uses Auto Review rules, and Cowork offers Manual, Auto, and Skip modes. Construct's workflows do not pause for approval yet, so for anything customer-facing, ask it for drafts and send them yourself once you have checked them.",
    },
    {
      question: "When does one of the four still make sense?",
      answer:
        "Muse fits a US or Canadian business that wants an agent reading its Meta ad accounts directly. Dots fit a company already paying for ChatGPT Business Premium that needs custom approval rules today. Cowork or Grok Bot fit one person who already pays for Claude Pro or Cursor and only wants a personal assistant. For a team's recurring work, Construct is the better fit.",
    },
  ],
  "agent-reliability-calculator": [
    {
      question:
        "How does Construct handle a long agent task that fails partway?",
      answer:
        "Construct saves finished work to workspace files as it is produced, so a run that stops at step 30 keeps steps 1 to 29. An instruction scoped to the missing work, such as writing a report only for clients without one, makes the next run a retry of the gaps rather than a duplicate, and a Calendar schedule turns those retries into a cadence.",
    },
    {
      question: "How often does a 95% reliable AI agent finish a 48-step job?",
      answer:
        "In one uninterrupted run, 8.5% of the time, because 0.95 to the power 48 is about 0.085. If every failure starts the job over, it needs about 11.7 runs on average to get through once.",
    },
    {
      question: "Do checkpoints make an AI agent more reliable?",
      answer:
        "They do not change the chance that one run finishes everything, which stays at p to the power n. They change what a failure costs. Cutting a 48-step job at 95% per step into eight saved six-step pieces cuts the steps executed from about 215 to about 58, and if the pieces are independent the job takes about 2.5 runs and is done within three runs 86.1% of the time.",
    },
    {
      question: "How many steps can a Construct task take?",
      answer:
        "Up to 50 steps per task on Lite at $9 a month, 150 on Starter at $59, and up to 1,000 on Pro at $299. The cap is a ceiling on length, not a success rate: at 95% per step, a task that uses all 50 steps finishes in one go about 7.7% of the time, so shorter tasks that each leave a file behind are the more reliable design.",
    },
    {
      question: "What is an AI agent's half-life in steps?",
      answer:
        "It is the number of steps at which the chance of finishing in one run falls to 50%, calculated as ln 2 divided by minus ln p. That is about 13.5 steps at 95% per step, about 69 steps at 99%, and about 6.6 steps at 90%.",
    },
    {
      question: "How do I estimate my agent's per-step success rate?",
      answer:
        "Run the job on demand five to ten times while you watch, count the total steps and the steps that failed without recovery, and divide. Ten runs with 400 steps and 16 unrecovered failures gives about 96%. If the same step fails every time, fix that cause instead of plugging in a rate.",
    },
  ],
  "construct-vs-claude-cowork": [
    {
      question: "Is Construct a good Claude Cowork alternative?",
      answer:
        "Yes, for most founders and small teams. Construct starts at $9 a month instead of $20, keeps every finished file in a workspace the whole team opens without buying seats, gives the agent its own email address, and runs on the model you choose, including Claude through your own Anthropic key on Pro.",
    },
    {
      question: "Can I use Construct alongside Claude Cowork?",
      answer:
        "Yes. Keep Cowork for personal drafting and research and give Construct the recurring team work. Copy the instructions from a Cowork scheduled task, move its files into the workspace, connect the apps, run it once, and put it on the Calendar.",
    },
    {
      question: "How much does Claude Cowork cost compared with Construct?",
      answer:
        "Cowork comes with paid Claude plans: Pro is $20 a month, Max starts at $100, and Team Standard is $25 per seat with a two-seat minimum, with Claude Tag channel work billed by usage. Construct Lite is $9 a month, and Starter at $59 covers up to 5 agents for a whole team workspace.",
    },
    {
      question: "Can I use Claude models in Construct?",
      answer:
        "Yes, on Pro. Construct Pro runs on your own keys for OpenRouter, OpenAI, Anthropic, Amazon Bedrock, or xAI, so you can keep using Claude through your own Anthropic key and switch providers later without moving your work. Your keys bill you directly when they are used.",
    },
    {
      question: "When does Claude Cowork still make sense?",
      answer:
        "Cowork fits if your work is mostly personal research and documents and you already pay for Claude, if the job needs your local files or desktop apps through Claude Desktop, or if you want Manual, Auto, or Skip approval modes or Claude for Small Business workflows.",
    },
    {
      question: "Can I move my Cowork tasks to Construct?",
      answer:
        "There is no import. Copy the instructions from your Cowork scheduled task, move its files into the Construct workspace, connect the apps, run it once, and then schedule it. Construct's workflows do not pause for approval yet, so keep customer emails as drafts you send yourself.",
    },
  ],
  "best-ai-employee-for-solo-founders": [
    {
      question: "What is the best AI employee for a solo founder?",
      answer:
        "Construct ranks first for a one-person company. For $9 a month on Lite it gives you an AI employee with its own cloud workspace, files, an agent email address, and 3 scheduled jobs that run with your laptop closed. Claude with Cowork ranks second at $20, Lindy third at $29.99, and Marblism fourth at $44 if you need the phone answered.",
    },
    {
      question: "Why does Construct rank first?",
      answer:
        "We build Construct, so it leads this list, and here is why it fits a solo founder: it is the cheapest paid plan on the list, its Calendar schedules run server-side, every result is saved as a workspace file that next week's run can build on, and you can read and correct what it remembers. When you hire, teammates join the workspace with no per-seat fee.",
    },
    {
      question: "How much should a solo founder spend on an AI employee?",
      answer:
        "Start at about $10 a month on Construct Lite for two or three recurring jobs, and move to Starter at $59 when you want up to 10 scheduled jobs. Claude Pro, Lindy Plus, and Marblism cost $20 to $44 and each center on one kind of work. Shift-based AI employees cost more: CellCog's own plan labels put a part-time employee at $160 a month.",
    },
    {
      question:
        "Can I use Construct alongside Claude, Lindy, or another agent?",
      answer:
        "Yes. Keep your current tool and move the one recurring job it handles least reliably. Start on Lite for $9 or the 7-day Pro trial, copy your instructions into a Construct chat, move the source files into the workspace, connect the apps, run it once, and put it on the Calendar. There is no import, so write your rules into the first instruction and Construct saves them as memory you can correct.",
    },
    {
      question: "How much work can one founder supervise?",
      answer:
        "Review time is the real limit. A workable rule is about 30 minutes of review a day: ask Construct for drafts for anything a customer sees and send them yourself, run a job by hand three times before you schedule it, ask for outputs with a source link on every line, and start with three scheduled jobs.",
    },
    {
      question: "When does another AI employee still make sense?",
      answer:
        "Marblism fits if missed phone calls cost you customers and you want a receptionist on a phone number. Manus's free plan fits occasional one-off research, and self-hosted OpenClaw fits technical founders who want to run every part themselves. For recurring weekly work that should run on a schedule and leave files behind, Construct is the better fit.",
    },
  ],
  "ai-inbox-triage": [
    {
      question: "Can Construct triage my inbox?",
      answer:
        "Yes. A Construct agent sorts new Gmail into Reply needed, FYI, and Later each weekday morning and leaves a draft reply on each thread that needs one. It works on Lite at $9 a month with Gmail connected and one of Lite's 3 scheduled tasks, and the schedule runs in the cloud with your laptop closed.",
    },
    {
      question: "Why should an AI agent draft replies instead of sending them?",
      answer:
        "A sent email is almost impossible to take back, since Gmail's Undo Send window is at most 30 seconds, while a wrong draft costs nothing. Keeping the agent to labels and drafts also limits the damage if it misreads an instruction on a large inbox.",
    },
    {
      question: "How do I teach the agent my triage rules?",
      answer:
        "Write the rules once and ask Construct to remember them. You can read and correct them in the Memories app, and when the agent files something wrong, tell it the correction and it updates the rules it remembered.",
    },
    {
      question: "How many emails should the agent triage per run?",
      answer:
        "Small batches work best, such as the last 24 hours. A run that labels and drafts dozens of emails can need more than Lite's 50 steps per task; Starter allows 150. If a run stops partway, the labels and drafts already written stay in place.",
    },
    {
      question:
        "How do I keep the agent from sending, archiving, or deleting email?",
      answer:
        "Tell it never to send, archive, trash, or delete, store that in memory, and repeat it in every scheduled prompt. The Gmail connection has no read-only mode yet, so your drafts are the review step and nothing goes out until you send it yourself.",
    },
    {
      question: "How do I schedule inbox triage?",
      answer:
        "After two runs in a row need no corrections, ask the agent to run the same triage every weekday at a set time. It creates a Calendar event that runs in the cloud, and each extra time of day uses another scheduled task.",
    },
  ],
  "hosted-openclaw-alternatives": [
    {
      question: "Is Construct a good alternative to hosted OpenClaw?",
      answer:
        "Yes, for founders and small teams who want the work done rather than an agent to operate. Construct starts at $9 a month at a fixed monthly price with published plan limits and no per-message billing, has no server or gateway to secure, runs Calendar schedules server-side with your laptop closed, and saves finished files in a workspace your team shares. It is a hosted AI employee, not an OpenClaw host, so OpenClaw skills do not run in it.",
    },
    {
      question: "Is there an official hosted version of OpenClaw?",
      answer:
        "No. The OpenClaw Foundation says OpenClaw has no subscription and no hosted tier, and OpenClaw Enterprise is also built to run on your own infrastructure. Any hosted OpenClaw is run by a third party such as Hostinger or MyClaw.",
    },
    {
      question: "What does a hosted OpenClaw cost compared with Construct?",
      answer:
        "As of October 1, 2026, Hostinger's 1-Click OpenClaw starts at $5.99 a month paid upfront and renews at $11.99, with AI credits bought separately, and MyClaw starts at $29 a month without AI token usage. Construct Lite is a fixed $9 a month with model usage within published plan limits, no per-message billing, and 3 scheduled tasks.",
    },
    {
      question: "Why do OpenClaw token bills get high?",
      answer:
        "OpenClaw's heartbeat runs a full agent turn every 30 minutes by default, and its docs say shorter intervals burn more tokens. Isolating heartbeat sessions cuts a run from about 100,000 tokens to 2,000 to 5,000, according to the same docs. In Construct, recurring work runs when you put a job on its Calendar, so you choose how often the agent wakes up.",
    },
    {
      question: "Can I use Construct alongside OpenClaw?",
      answer:
        "Yes. Move the recurring job that costs the most tokens or babysitting: start on Lite for $9 or the 7-day Pro trial, copy the instructions, move reference files into the workspace, connect the apps, run it once, and put it on the Calendar. There is no import, so OpenClaw skills, memory files, and channel pairings do not transfer.",
    },
    {
      question: "When does a hosted OpenClaw still make sense?",
      answer:
        "When you need the agent on WhatsApp, Signal, iMessage, or Microsoft Teams, want to run a local model or modify the agent's source, or need a process that runs continuously, since each Construct sandbox command has a five-minute runtime cap on every plan.",
    },
  ],
  "ai-agent-scheduled-tasks": [
    {
      question:
        "Can Construct run an AI agent on a schedule with my laptop closed?",
      answer:
        "Yes. Construct's Calendar schedules run server-side, and the agent's files, connected apps, browser, and terminal live in its cloud workspace, so a scheduled job never needs your laptop. Lite at $9 a month includes 3 scheduled tasks.",
    },
    {
      question: "How many scheduled tasks does each Construct plan include?",
      answer:
        "Lite at $9 a month includes 3, Starter at $59 includes 10, and Pro at $299 includes 50. Only active schedules count; paused ones do not.",
    },
    {
      question: "How often can a scheduled agent job run?",
      answer:
        "A schedule that runs an agent can repeat at most every 15 minutes. Schedules that only send a notification or run an app tool can repeat every minute. For something that must react as it happens, forward it to the agent's own email address, since mail from your own address starts a run.",
    },
    {
      question:
        "What happens if a scheduled run is late or the last one is still running?",
      answer:
        "In the event's Delivery behavior settings you choose Skip overlap or Queue next for a run still in progress, and Run once, Skip, or Catch up safely for a late one. For a daily list, skipping overlaps and running a late run once is a sensible default.",
    },
    {
      question: "Can a scheduled run fire twice?",
      answer:
        "Occasionally. Construct delivers scheduled runs at least once, not exactly once, so write jobs that check before they act, such as stopping if today's file already exists.",
    },
    {
      question: "How do I check a scheduled job from my phone?",
      answer:
        "Each Calendar event keeps a history of its runs with the outcome and, for agent prompts, a link to the chat the run used. You can read it, and the files the run saved, from the web desktop on your phone.",
    },
  ],
  "construct-vs-genspark-claw": [
    {
      question: "Is Construct a good Genspark Claw alternative?",
      answer:
        "Yes, for most founders and small teams. Construct starts at a fixed $9 a month with no per-message billing, while Claw Standard is a reported $39.99 a month plus credits. Construct also keeps files, memory, and schedules in a workspace the whole team can open, while Genspark says each Claw belongs to one person.",
    },
    {
      question: "Can I use Construct alongside Genspark Claw?",
      answer:
        "Yes. Keep Claw for the chat apps only it reaches, such as WhatsApp, Teams, LINE, or Signal, and give Construct the recurring team work. Ask Claw to save a summary of your instructions, move its files into the workspace, connect the apps, run the job once, and put it on the Calendar.",
    },
    {
      question: "How much does Genspark Claw cost compared with Construct?",
      answer:
        "Claw needs a cloud computer subscription, reported by Sliq at $39.99 a month for Standard and $79.99 for Powerful, plus Genspark credits that every message, scheduled run, and Heartbeat check draws on. Construct Lite is a fixed $9 a month for 2 agents, 50 steps per task, and 3 scheduled tasks.",
    },
    {
      question: "Can a team share one Genspark Claw?",
      answer:
        "No. Genspark's help center says Claw is never shared and Team plans buy seats, each with its own cloud computer. Construct's team workspaces have Owner, Admin, and Member roles, no member limit, and usage drawn from the owner's plan.",
    },
    {
      question: "When does Genspark Claw still make sense?",
      answer:
        "Claw fits if your assistant has to live in WhatsApp, Microsoft Teams, LINE, or Signal, if you want a full always-on machine with a remote desktop or a local mode, or if you want ready-made templates and built-in media skills.",
    },
    {
      question: "Can I move my Genspark Claw setup to Construct?",
      answer:
        "There is no import, and Genspark has no built-in chat history export. Ask Claw to save summaries as documents, download your files before cancelling, then add them to Construct, connect your apps, and run each job once before putting it on the Calendar.",
    },
  ],
  "construct-vs-openclaw": [
    {
      question: "Is Construct a good OpenClaw alternative?",
      answer:
        "Yes, for most founders and small teams. Construct is a hosted AI employee from a fixed $9 a month with no per-message billing and nothing to install, while OpenClaw is free software you run yourself on a machine that stays on, paying for every model token.",
    },
    {
      question: "Can I use Construct alongside OpenClaw?",
      answer:
        "Yes. Keep OpenClaw for the channels and experiments you built it for and give Construct the recurring work your team depends on. Copy your instructions and skill text, move the files, connect the apps, run the job once, and put it on the Calendar.",
    },
    {
      question: "Why does OpenClaw use so many tokens?",
      answer:
        "Its heartbeat runs a full agent turn every 30 minutes by default, and the docs say shorter intervals burn more tokens. Isolated heartbeat sessions cut each run from about 100,000 tokens to 2,000 to 5,000, according to OpenClaw's documentation.",
    },
    {
      question: "Do I need to secure a server to use Construct?",
      answer:
        "No. Construct is hosted, so there is no gateway for you to expose and no server to patch. Shell commands run in a sandbox as a non-root user, and stored model keys and bot credentials are encrypted. OpenClaw's own docs say sandboxing and exec approvals are off by default.",
    },
    {
      question: "When does OpenClaw still make sense?",
      answer:
        "OpenClaw fits if you want to own the code, the machine, and every policy and are comfortable hardening a server, if you run many agents on a subscription sign-in, local models, or free-tier hosts, or if your agent has to live in WhatsApp, Signal, iMessage, or Matrix.",
    },
    {
      question: "Can I import my OpenClaw setup into Construct?",
      answer:
        "No. Move one job at a time: copy your instructions and skill text, move the files the job needs, connect the apps, and rebuild time-based cron jobs as Construct workflows on the Calendar after running each one once.",
    },
  ],
  "ai-agent-activity-log": [
    {
      question: "How do I see what my AI agent did in Construct?",
      answer:
        "Open the Activity app. It shows one row for each action an agent takes, with its kind, a headline naming the target, a reason of up to 160 characters when the agent gives one, a status, the agent, and a link back to the chat it came from. You can search it, filter it by kind, status, and date, and export it as CSV or JSON on every plan.",
    },
    {
      question:
        "What is the difference between an AI agent activity log and an audit log?",
      answer:
        "An activity log is a short, readable record for the person who delegated the work: what the agent did, whether it worked, and roughly why. An audit log is a complete chronological record that lets a reviewer reconstruct events from start to finish, usually kept for a long time and protected against changes.",
    },
    {
      question: "Is Construct's Activity a complete audit log?",
      answer:
        "No. Activity is an operating record: it does not store tool inputs or outputs, rows are written on a best-effort basis, and it keeps the last 30 days or about 10 MB of rows per person. The detail behind each row lives in the linked chat, Terminal, Browser steps, workflow and Calendar history, sent email, and Files.",
    },
    {
      question: "How long does Construct keep Activity history?",
      answer:
        "Activity keeps a rolling 30 days per person and deletes the oldest rows first once the feed passes about 10 MB. Chats, workflow run history, calendar history, sent email, and files are kept separately and usually last longer.",
    },
    {
      question:
        "How can a small team keep longer records of agent work in Construct?",
      answer:
        "Export the Activity CSV each week and store it yourself, have the agent append a line to a run log file in Files at the end of important jobs, and rely on the change history in connected systems such as your CRM or sent mail for actions that matter.",
    },
  ],
  "ai-company-research-spreadsheet": [
    {
      question:
        "Can Construct research a list of companies into a spreadsheet?",
      answer:
        "Yes. Give Construct the list and a column spec, and it searches and fetches each company's public pages, fills one row per company, and saves a CSV in Files with a source link beside every fact. It runs on any plan from $9 a month.",
    },
    {
      question: "How do I stop the agent from making up facts or citations?",
      answer:
        "Require a source URL for every fact, tell it to write not found when it cannot find something, and to write conflicting with both links when sources disagree. Then ask for a gap report that lists any fact without a source and send those rows back for another pass.",
    },
    {
      question: "How many companies can it research in one run?",
      answer:
        "It depends on the plan's step limit, because every search, fetch, and file write is a step. Lite allows up to 50 steps per task, Starter 150, and Pro up to 1,000, so longer lists run in batches that are saved to Files as each one finishes. On Starter and Pro, Construct can also split a list across temporary helper agents.",
    },
    {
      question: "What happens if the run stops partway through the list?",
      answer:
        "Finished batches are already saved in Files, so the rows that were done are kept. Ask the agent to continue from the next company instead of starting over.",
    },
    {
      question: "Can the results go into my CRM or a spreadsheet app?",
      answer:
        "Yes. The CSV in Files is the source of truth. You can download it, ask Construct for an Excel copy with clickable source links, or have it push rows into a connected app such as Airtable or HubSpot after you have checked the sheet.",
    },
    {
      question: "Can I combine Construct with a company data provider?",
      answer:
        "Yes. Construct reads what companies publish. If you need verified headcounts, funding data, or contact details at scale, upload your data provider's export and the agent works from it and fills the rest.",
    },
  ],
  "ai-delegation-checklist": [
    {
      question: "Is Construct a good tool for delegating work to an AI agent?",
      answer:
        "Yes. From $9 a month, Construct gives you a workspace where every part of the checklist is visible: inputs in Files, standing rules in memory you can read and correct, results saved as they are produced, a record of each action in Activity, and a Calendar for jobs that have earned a schedule.",
    },
    {
      question: "What should I check before delegating a job to an AI agent?",
      answer:
        "Answer 24 questions in five groups: the job you are handing over, the inputs the agent needs, what done looks like, who reviews the result, and which steps cannot be undone. The last group covers anything that sends, pays, deletes, publishes, or changes a record other people rely on.",
    },
    {
      question: "How big a job should I give an AI agent?",
      answer:
        "Keep it to something a person could do in under an hour, and split anything larger. METR's March 2025 study found models succeed almost every time on tasks that take a person under 4 minutes and less than 10% of the time on tasks that take more than about 4 hours.",
    },
    {
      question:
        "How many times should I review a delegated job before scheduling it?",
      answer:
        "Start the first three runs by hand and read them in full against your done criteria. Once the output is consistently right, schedule it and switch to spot checks, and put corrections back into the agent's standing rules rather than only fixing that week's output.",
    },
    {
      question: "How do I run the checklist in Construct?",
      answer:
        "Save the standing rules to memory, paste the brief into chat, and check the saved result in Files. After a good run Construct can offer to save the steps as a workflow draft, which you run on demand for a few weeks before putting it on the Calendar. Lite includes 3 scheduled tasks.",
    },
    {
      question: "How do I keep irreversible steps under control in Construct?",
      answer:
        "Construct's workflows do not include approval steps yet, so ask for drafts of anything that leaves the company and send them yourself, use the agent's own email address for internal updates, and keep each job within your plan's step budget.",
    },
  ],
  "construct-vs-gemini-spark": [
    {
      question: "Is Construct a good Gemini Spark alternative?",
      answer:
        "Yes, for most founders and small teams. Construct starts at $9 a month with no Google subscription needed, connects to Gmail and Google Calendar on the account you authorize, keeps finished work in a workspace the whole team can open, and reaches business tools outside Google.",
    },
    {
      question: "Can I use Construct alongside Gemini Spark?",
      answer:
        "Yes. Keep Spark for personal errands and give Construct the recurring team work. Copy your Spark instructions, save the Docs or Sheets it uses into the workspace, connect Gmail and Google Calendar, run the job once, and put it on the Calendar.",
    },
    {
      question: "How much does Gemini Spark cost compared with Construct?",
      answer:
        "Spark comes with Google AI Pro at $19.99 a month in the US, per Google's help page, or Ultra from $99.99, though the US plan page lists Spark only under Ultra. Construct Lite is $9 a month for 2 agents, 50 steps per task, and 3 scheduled tasks.",
    },
    {
      question: "Does Gemini Spark work with a Google Workspace account?",
      answer:
        "Not today. Google's help page says Spark needs a personal Google Account and does not support work or school accounts, and Google has announced a Workspace preview for business customers without a general availability date. Construct connects Gmail and Google Calendar through its integration catalog with the account you authorize.",
    },
    {
      question: "When does Gemini Spark still make sense?",
      answer:
        "Spark fits if you run a one-person business from a personal Gmail account and already pay for Google AI Pro, if your work lives almost entirely in Docs, Sheets, Slides, and Maps, or if you want confirmations before every send built in or need the agent to use your local Chrome or Mac.",
    },
    {
      question: "Can I move from Gemini Spark to Construct?",
      answer:
        "There is no import. Spark's skills, schedules, and remote browser data do not transfer, and turning Spark off deletes its remote browser data, so save what you need first. Then copy your instructions into Construct, connect your apps, and run the job once before scheduling it.",
    },
  ],
  "ai-agent-slack-briefing": [
    {
      question: "Can Construct send me a morning briefing in Slack?",
      answer:
        "Yes. A Construct agent prepares the briefing on a weekday schedule from your Google Calendar, Gmail, and workspace files, then emails it from its own address to a Slack channel's email address. You can also mention or message the agent in Slack and it replies with the briefing in the thread. It works on Lite at $9 a month.",
    },
    {
      question:
        "Can a scheduled Construct job post directly into a Slack channel?",
      answer:
        "Not yet. A scheduled run's output lands in its chat in Construct with a notification, so the briefing reaches Slack through the channel's email address. Slack channel email addresses need a paid Slack plan; on the free plan, ask the agent for the briefing in Slack.",
    },
    {
      question: "What should a morning briefing include?",
      answer:
        "Today's meetings with attendees, email that needs a reply from you, what changed overnight in the files the team watches, and one decision waiting on you. Keep it short enough to read on a phone, and let the agent save a longer version to Files.",
    },
    {
      question: "Can I look up an old briefing later?",
      answer:
        "Yes. Each briefing is saved to Files/briefings/ by date, so you can ask the agent in Slack what Monday's briefing said about a client later in the week.",
    },
    {
      question: "Who can ask the agent for the briefing in Slack?",
      answer:
        "The installer always has full access, and you can add teammates to the Full access list. With Everyone in the server, people not on the list get a read-only guest agent that cannot use your connected apps.",
    },
    {
      question: "What does the briefing cost to run?",
      answer:
        "It works on Lite at $9 a month, which includes 3 scheduled tasks and an agent email address. Starter at $59 includes 10 scheduled tasks if you want a briefing per team.",
    },
  ],
  "viktor-alternatives": [
    {
      question: "Is Construct a good Viktor alternative?",
      answer:
        "Yes, for founders and small teams. Construct starts at $9 a month instead of Viktor's $50, saves every finished report and spreadsheet as a file in a shared workspace, runs recurring jobs from a Calendar with nobody online, keeps memory you can correct, and answers in Slack, Telegram, Discord, its own email inbox, and the web.",
    },
    {
      question: "How much does Viktor cost?",
      answer:
        "Viktor's Team plans start at $50 a month for 20,000 credits, with $75, $100, and $200 tiers above it. Pricing is per workspace rather than per seat, unused monthly credits roll over for one month, and new workspaces get $100 in free credits without a card.",
    },
    {
      question: "Can Construct work in Slack channels like Viktor?",
      answer:
        "Yes. You can @mention Construct in a channel, reply in the thread it starts, or send it a direct message. Each install has an access policy: allow-listed people get full tools, and if you open it to everyone, other members get a read-only tier. Construct acts on messages addressed to it and cannot read channel history, so give it the source directly, and scheduled runs report in the web app with a notification rather than posting into Slack.",
    },
    {
      question: "Can I use Construct alongside Viktor?",
      answer:
        "Yes. Keep Viktor in the channels where it works and give Construct the recurring job whose output your team keeps hunting for. Start on Lite for $9 or the 7-day Pro trial, add Construct to Slack, copy your instructions, connect the apps, run it once, and put it on the Calendar. There is no import from Viktor.",
    },
    {
      question: "When does Viktor still make sense?",
      answer:
        "Viktor can still fit if your company works in Microsoft Teams, if you want the agent to read the channels it belongs to for context, or if you need a confirmation step before high-stakes actions built into every job.",
    },
    {
      question: "What are the other Viktor alternatives for Slack?",
      answer:
        "Runbear ($99 per workspace) for named agents per team, Lindy ($29.99 per user) for per-person inbox help, Claude Tag for companies already on Claude Team or Enterprise, and ChatGPT Dots, Manus, or Perplexity Computer if your company already pays for one of those.",
    },
  ],
  "construct-vs-viktor": [
    {
      question: "Is Construct a good Viktor alternative?",
      answer:
        "Yes, for founders and small teams. Construct starts at $9 a month instead of Viktor's $50, saves finished work as files in a workspace your team can reopen, takes requests from Slack, email, Telegram, Discord, and the web, lets you read and correct what it remembers, and accepts your own model keys on Pro.",
    },
    {
      question: "Is Construct cheaper than Viktor?",
      answer:
        "Yes, at the entry level. Construct Lite is $9 a month with 2 agents, 3 scheduled tasks, and an agent email address. Viktor's first Team plan is $50 a month for 20,000 credits shared by the workspace, and its own examples put complex workflows at 500 to 1,500 credits each.",
    },
    {
      question: "Can Construct work in Slack like Viktor?",
      answer:
        "Yes, for assigning work. You can @mention Construct in a channel, reply in the thread that mention started, or DM it, and each install has an access policy with an allow list and an optional read-only tier for everyone else. Construct does not read channel history, so put the messages a job needs in a file or paste them in.",
    },
    {
      question: "Can I use Construct alongside Viktor?",
      answer:
        "Yes. Keep Viktor for quick asks inside Slack and give Construct the recurring jobs whose files and schedules you need to keep. Start on Lite for $9 or the 7-day Pro trial, copy the job's instructions, connect the apps, run it once, and put it on the Calendar. There is no import.",
    },
    {
      question: "When does Viktor still make sense?",
      answer:
        "When your company runs on Microsoft Teams, when you want an agent that reads the Slack channels it sits in and drafts every outgoing action for approval in the thread, or when you need SOC 2 paperwork today, since Viktor lists SOC 2 Type 1.",
    },
  ],
  "ai-agent-browser-and-terminal": [
    {
      question: "Can Construct use a browser and a terminal in the same task?",
      answer:
        "Yes. Construct's agent can open a live cloud browser for pages that need clicking and typing, save what it reads to a file, then run Python or shell commands in a Linux terminal on that file, all in one task you can watch and stop. It is available from the $9 Lite plan.",
    },
    {
      question: "Can I watch and stop the agent's browser?",
      answer:
        "Yes. The Browser app shows the live page and a step list with notes, URLs, and screenshots, and Stop ends the run. You can also interrupt the whole task from chat, and the Terminal app shows a read-only transcript of every command.",
    },
    {
      question: "Does Construct's browser use my logins?",
      answer:
        "No. The browser runs in the cloud, not on your machine, and it does not carry your accounts. For tools you are signed into, connect them from the integration catalog, which is usually the more reliable path.",
    },
    {
      question:
        "How long can a terminal command or browser run take in Construct?",
      answer:
        "Each terminal command currently has a five-minute ceiling on every plan, with a two-minute default, and a browser run that has not finished within five minutes ends as timed out. Long jobs work best as many short steps that save files as they go, so a run that stops keeps its finished steps.",
    },
    {
      question: "Can a browser and terminal job run on a schedule?",
      answer:
        "Yes. Once a few runs have produced results you trust, ask the agent to put the same prompt on the Calendar. Scheduled jobs run in Construct's cloud with your laptop closed, and Lite includes 3 scheduled tasks.",
    },
  ],
  "claude-cowork-alternatives": [
    {
      question: "Is Construct a good Claude Cowork alternative?",
      answer:
        "Yes, for founders and small teams. Construct starts at $9 a month, gives the whole team one shared workspace with Owner, Admin, and Member roles and no per-seat fee, saves finished work as files teammates can open, and runs Calendar schedules server-side. Anthropic describes Cowork work as seen by just you, and sharing means Claude Team seats at $25 each.",
    },
    {
      question: "Can I keep using Claude models if I switch to Construct?",
      answer:
        "Yes, on Construct Pro. It supports your own keys for OpenRouter, OpenAI, Anthropic, Amazon Bedrock, and xAI, so you can use Claude through your own Anthropic key, as a fallback after bundled limits or for every run. Your keys bill you directly when they are used, and Pro has a 7-day trial.",
    },
    {
      question: "Can I use Construct alongside Claude Cowork?",
      answer:
        "Yes. Keep Cowork for your own one-off tasks and give Construct the recurring job your team needs to see. Start on Lite for $9 or the 7-day Pro trial, copy the prompt from your Cowork task, upload the files it uses, connect the apps, run it once, and put it on the Calendar. There is no import from Cowork.",
    },
    {
      question: "Does Claude Cowork still need my computer to stay on?",
      answer:
        "Not for most work. Cowork moved to cloud sessions on web and mobile in July 2026, scheduled tasks run even when your computer is asleep, and Anthropic's help center says new Cowork tasks run only in the cloud from October 6, 2026. Tasks that need local files still reach them through the Claude Desktop app.",
    },
    {
      question: "When does Claude Cowork still make sense?",
      answer:
        "Cowork can still fit if you work alone, already pay for Claude, and your tasks are one-off, if your tasks depend on folders on your own computer, or if your whole team is already on Claude Team and works in Slack with Claude Tag.",
    },
    {
      question: "What is the Microsoft equivalent of Claude Cowork?",
      answer:
        "Microsoft Copilot Cowork, generally available worldwide since June 16, 2026. It needs a Microsoft 365 Copilot license and bills usage in Copilot Credits from $0.01 each. Microsoft 365 Copilot Business is $25.20 per user on a monthly subscription.",
    },
  ],
  "ai-lead-sourcing-hubspot": [
    {
      question: "Can Construct find leads and add them to HubSpot?",
      answer:
        "Yes. A Construct agent researches companies that match your profile on a weekday schedule, checks HubSpot for duplicates, creates only the new companies and contacts with a note on where each was found, saves a dated list with sources to Files, and sends a summary to your Slack channel.",
    },
    {
      question:
        "How do I stop the agent creating duplicate companies in HubSpot?",
      answer:
        "Tell it to search HubSpot by website domain and by email before creating anything, and to mark matches as existing. HubSpot does not deduplicate companies created through its API by domain, so the search first rule is what prevents duplicates.",
    },
    {
      question: "How does the daily summary get into Slack?",
      answer:
        "A scheduled run cannot post into Slack directly yet, so the agent emails the summary from its own address to the Slack channel's email address, which needs a paid Slack plan. Anyone on the allow list can then mention the agent in the thread to ask about a lead.",
    },
    {
      question: "Which Construct plan do I need for lead sourcing?",
      answer:
        "Starter at $59 a month is the better fit, with 150 steps per task and 10 scheduled tasks, because researching each company takes several searches. Lite at $9 can run a smaller daily batch.",
    },
    {
      question:
        "Should I let the agent write to HubSpot on a schedule right away?",
      answer:
        "Run the research and the HubSpot step by hand for a week first, because scheduled runs create records without stopping for review. Keep never change or delete existing records in the prompt, and block HubSpot under App access for agents that do not need it.",
    },
    {
      question: "Will the agent guess email addresses for leads?",
      answer:
        "No. The prompts in this guide tell it to record a person's business email only when it is published on the company's own site. Finding a lead is not consent to email them, so check the rules that apply to the people you contact.",
    },
  ],
  "hermes-vs-openclaw-vs-managed": [
    {
      question:
        "Is Construct a good alternative to Hermes Agent or OpenClaw for a non-technical founder?",
      answer:
        "Yes. Construct is a managed AI employee from $9 a month with model usage included, so there is nothing to install, host, update, or harden. It keeps finished work in workspace files, runs Calendar schedules with your laptop closed, gives each agent its own email address, and shows memory you can read, correct, or forget.",
    },
    {
      question: "What is the difference between Hermes Agent and OpenClaw?",
      answer:
        "Both are free, MIT-licensed agents you can run yourself. Hermes Agent, from Nous Research, writes and improves its own skills from experience and has an official hosted option on Nous Portal. OpenClaw, run by a non-profit foundation, reaches more chat apps, including iMessage and Teams, and has no official hosted version.",
    },
    {
      question: "How much do Hermes Agent and OpenClaw really cost?",
      answer:
        "The software is free, but you pay for a machine and model usage. Nous Portal plans for Hermes run from $20 a month with $22 of credits to $200 with $220, shared by models, tools, and hosting. OpenClaw relies on third-party hosts such as Hostinger from $5.99 a month paid upfront or MyClaw at $29, with model costs on top. Construct is a fixed monthly price of $9, $59, or $299 with published plan limits.",
    },
    {
      question: "Are Hermes Agent and OpenClaw safe by default?",
      answer:
        "They make different choices. Hermes turns on smart command approval by default, but its security policy says the only real boundary against an adversarial model is the operating system. OpenClaw's docs say sandboxing and exec approvals are off by default and hardening is your configuration. Construct has no server for you to expose, and Activity records each action and why.",
    },
    {
      question: "Can I use Construct alongside Hermes or OpenClaw?",
      answer:
        "Yes. Keep your open-source agent for the chat apps and experiments it handles and move one recurring business job to Construct: start on Lite for $9 or the 7-day Pro trial, copy the instructions, move the files, connect the apps, run it once, and put it on the Calendar. Skills and memory do not import, so write your rules into the first instruction.",
    },
    {
      question: "When do Hermes or OpenClaw still make sense?",
      answer:
        "When customers write on WhatsApp, Signal, iMessage, or Teams and the agent must answer there, when you want local models or your own infrastructure, or when you want to read and change the agent's code. For recurring business work with a fixed price and nobody to maintain an agent, Construct is the better fit.",
    },
  ],
  "ai-employee-for-agencies": [
    {
      question: "Is Construct a good AI employee for a small marketing agency?",
      answer:
        "Yes. From $9 a month, Construct drafts a Friday report for every client, turns kickoff notes into creative briefs, and builds a private review queue where account leads approve work. The whole team works in one workspace with no per-seat fee, and a person still checks the numbers and sends anything to a client.",
    },
    {
      question: "How much does an AI employee for an agency cost on Construct?",
      answer:
        "Construct Lite is $9 a month with 2 agents and 3 scheduled tasks. Starter is $59 a month with up to 5 agents and 10 scheduled tasks, which suits an agency running separate report jobs for several groups of clients. A team workspace has no member limit, and usage draws on the owner's plan.",
    },
    {
      question: "How do approvals work in Construct?",
      answer:
        "Construct builds a small private review queue app inside the workspace that stores items in a workspace file. The agent adds drafts to the queue, account leads mark them approved or return them, and a Monday job emails the leads anything stuck in review.",
    },
    {
      question: "Can the agent send client reports by itself?",
      answer:
        "Keep that step with a person. Construct's workflows do not pause for approval yet, so keep do not send in every report prompt, put drafts in the review queue, and have an account lead send approved work from their own email.",
    },
    {
      question: "What happens when a client emails the agent?",
      answer:
        "Only mail you send from your own account address, which passes standard sender checks, starts work. Email from clients or anyone else is stored in the agent's inbox but does not trigger a task by itself, and you ask the agent to act on it.",
    },
    {
      question: "How many clients can one report job handle?",
      answer:
        "Lite allows up to 50 steps per task and Starter 150, so if you have more than a handful of clients, split them into two scheduled report jobs. Finished reports are saved as they are produced, so a run that stops partway keeps the ones it finished.",
    },
  ],
  "ai-agent-linear-from-slack": [
    {
      question: "Can Construct update Linear issues from Slack?",
      answer:
        "Yes. Mention your Construct agent in Slack and it finds the right issues, changes status, assignee, or priority, adds comments, and replies in the thread with a link for each. It works on every plan from $9 a month once Linear is connected and Construct is added to Slack.",
    },
    {
      question: "Why use Construct instead of Linear's own Slack integration?",
      answer:
        "Linear's integration files issues from a message, the /linear command, or an @Linear mention, and only Linear users in your Slack workspace can create issues with it. Construct handles a message that touches several issues, finds an issue from a description without its key, takes requests from teammates without Linear seats, and can update workspace files in the same request.",
    },
    {
      question: "Can I use Construct alongside Linear's Slack integration?",
      answer:
        "Yes. Keep Linear's integration for filing a single issue from a single message, and mention Construct for standup notes, bulk updates, and requests that need judgment.",
    },
    {
      question: "Can the agent read Slack channels to find updates on its own?",
      answer:
        "No. It sees messages that mention it, replies in threads those mentions start, and direct messages. Paste or write the update into the message you send it.",
    },
    {
      question: "How do I stop the agent from changing the wrong issues?",
      answer:
        "Use issue keys when you have them, keep a conventions file in the workspace, and for bulk changes ask it to list the changes and wait for you to reply go. Construct's workflows do not pause for approval yet, so that step is an instruction; check the issues it reports. Keep never delete or archive in memory.",
    },
    {
      question: "Whose name appears on Linear changes made by the agent?",
      answer:
        "Changes appear under the Linear account that connected Linear in Construct, not the Slack user who asked. Ask the agent to name the requester in its comments.",
    },
  ],
  "ai-employee-cost-calculator": [
    {
      question: "Is Construct cheaper than a virtual assistant?",
      answer:
        "For the recurring, checkable share of a VA's work it can be. In the illustrative example, a 20 hour a week VA at $15 an hour costs about $1,300 a month; moving 30% of tasks to Construct leaves $910 of VA time, so adding Lite at $9 saves $381 and Starter at $59 saves $331 a month before about 3.9 hours of review.",
    },
    {
      question: "Which Construct plan should I start on?",
      answer:
        "Start on the smallest plan that fits your longest task and your number of recurring jobs. Lite at $9 fits up to three recurring jobs of up to 50 steps each; Starter at $59 fits more recurring jobs, tasks of up to 150 steps, or separate agents; Pro at $299 is for runs of up to 1,000 steps, many scheduled jobs, or your own model keys, and has a 7-day free trial.",
    },
    {
      question: "How much does a virtual assistant cost per month?",
      answer:
        "A VA working 20 hours a week at $15 an hour costs about $1,300 a month, the top of Cherry Assistant's published $350 to $1,300 range for part-time offshore work. Cherry Assistant lists offshore agency rates of $4 to $15 an hour and US or UK freelance rates of $18 to $40 an hour.",
    },
    {
      question: "Can I use Construct alongside my virtual assistant?",
      answer:
        "Yes. Construct takes the recurring, checkable work and your VA keeps the relationship work and reviews what the agent produces. A team workspace has no member limit, so your VA can join as a member. If your VA does the review, enter their hourly rate as the reviewer's value.",
    },
    {
      question: "How does review time change the comparison?",
      answer:
        "It is the input most likely to flip the answer. In the illustrative example, pricing review at $50 an hour turns Starter's $331 saving into $136, and at 10 minutes of review per task every Construct plan costs more than keeping the VA alone. Measure your review time on a few real runs before you rely on the result.",
    },
    {
      question: "What does the calculator leave out?",
      answer:
        "It does not include setup time, whether your VA engagement can actually be reduced, whether your workload fits a plan's usage, quality differences such as a VA catching an awkward email, or hiring and turnover costs. Treat the result as a first-pass estimate.",
    },
  ],
  "perplexity-computer-alternatives": [
    {
      question: "Is Construct a good Perplexity Computer alternative?",
      answer:
        "Yes, for founders and small teams with recurring work. Construct starts at $9 a month instead of about $200 for Perplexity Max, publishes its plan limits up front, saves finished reports as workspace files, runs scheduled jobs on its Calendar with your laptop closed, and serves the whole team from one plan with no per-seat fee.",
    },
    {
      question: "Can I use Construct alongside Perplexity Computer?",
      answer:
        "Yes. Keep Perplexity for ad hoc questions and move the recurring job that uses the most credits to Construct. Start on Lite for $9 or the 7-day Pro trial, copy your task instructions, save your sources in the workspace, connect the apps, run it once, and put it on the Calendar. There is no import, so write your rules into the first instruction.",
    },
    {
      question: "How much does Perplexity Computer cost per task?",
      answer:
        "Perplexity says 100 credits cost $1. Its typical ranges are 100 to 350 credits for light tasks, 350 to 950 for multi-step reports, 875 to 2,275 for heavy documents, and 2,400 to 9,800 for large projects, and it says those are examples, not guarantees. Scheduled runs use credits each time and are skipped if you are out of credits.",
    },
    {
      question: "Do I need Perplexity Max to use Perplexity Computer?",
      answer:
        "Perplexity's help center now says Computer credits are available to Pro and Max subscribers. Pro has no monthly credit allocation beyond a one-time 4,000-credit bonus, so you buy credits at $1 per 100, while Max includes 10,000 credits a month. Older third-party guides say Computer is Max only, so check your account.",
    },
    {
      question: "Which Perplexity Computer alternative is best for a team?",
      answer:
        "Perplexity credits are personal to each account. A Construct team workspace has Owner, Admin, and Member roles, no member limit, and usage that draws on the owner's plan, from $9 a month. Viktor bills per workspace from $50 a month, and Lindy bills $29.99 per user.",
    },
    {
      question: "When does Perplexity Computer still make sense?",
      answer:
        "When research across many models in one run is the main thing you pay for, when you run Computer only occasionally and already pay for Perplexity Pro, or when your team works in Microsoft Teams. For recurring work that needs files, schedules, and a predictable price, Construct is the better fit.",
    },
  ],
  "customer-story-1": [
    {
      question: "What did [customer] hand to Construct?",
      answer:
        "[Customer] delegated [job], which used to take [who] about [time] every [period]. TODO: restate from the approved story.",
    },
    {
      question: "How did [customer] set it up?",
      answer:
        "They connected the apps the job needed, saved the inputs to the workspace, wrote the instruction, ran it on demand and checked each result, and then [scheduled it / saved it as a workflow]. TODO: restate from the approved story.",
    },
    {
      question: "What changed for [customer]?",
      answer:
        "[Headline result with its period, exactly as approved by the customer.] TODO: restate from the approved story.",
    },
    {
      question: "What still needs a person?",
      answer:
        "[What the customer still does themselves.] Construct's workflows do not pause for approval yet, so for customer-facing work the agent drafts and a person checks and sends. For a job that needs tracing later, the agent appends a line to a run log file at the end of each run. TODO: keep only what the story says.",
    },
    {
      question: "How can I set up a job like [customer]'s in Construct?",
      answer:
        "Give Construct the same inputs you would give a person, run it once, and read the saved result. When the output is right twice in a row, put it on the Calendar, where it runs on Construct's servers with your laptop closed. Start on Lite at $9 a month or try Pro free for seven days.",
    },
  ],
  "perplexity-computer-vs-cowork-vs-manus": [
    {
      question:
        "Is Construct a good alternative to Perplexity Computer, Claude Cowork, or Manus for background work?",
      answer:
        "Yes, for founders and small teams. Construct starts at $9 a month with 3 scheduled tasks, its Calendar runs jobs on Construct's servers with your laptop closed, and every result is saved to a workspace file that next week's run builds on. On any plan, a team workspace lets colleagues open the same files with no per-seat fee, and Pro lets you bring your own model keys.",
    },
    {
      question: "Which is cheapest for background work?",
      answer:
        "Construct Lite is $9 a month, a fixed monthly price with published plan limits. Manus is free to start, with Pro from $20 a month and an optional Cloud Computer from $30 a month. Claude Cowork comes with Claude Pro at $20 a month. Perplexity Computer's cloud agent was reported by TechCrunch as a Perplexity Max feature at $200 a month, with credits on top.",
    },
    {
      question: "Do they keep working when my laptop is closed?",
      answer:
        "Yes. Construct's Calendar schedules run on its servers, Perplexity Computer runs entirely in the cloud, Claude Cowork's scheduled tasks run even when your computer is asleep, and Manus runs tasks in a cloud sandbox with an optional Cloud Computer that stays on.",
    },
    {
      question: "Is Perplexity Computer available on the $20 Pro plan?",
      answer:
        "Reports differ, and Perplexity's own pages refused our requests. TechCrunch reported the cloud Computer as a Max feature at $200 a month, and a third-party cost guide says it is not available on Pro. Personal Computer, the Mac version, is available to Pro and Max subscribers, according to TechCrunch.",
    },
    {
      question: "Can I use Construct alongside Cowork, Manus, or Perplexity?",
      answer:
        "Yes. Keep your current agent for one-off research and move a weekly job to Construct: start on Lite for $9 or the 7-day Pro trial, copy the prompt, move the files, connect the apps, run it once, and put it on the Calendar. There is no import. Construct's schedules are time-based, so for work that arrives as it happens, forward it from your own address to the agent's inbox, which starts a run.",
    },
    {
      question:
        "When does Manus, Perplexity Computer, or Cowork still make sense?",
      answer:
        "Manus fits when runs must start from Slack messages, ad performance, or Notion updates, or when you need a server that stays on. Perplexity Computer fits a single research task that should draw on many models, if you can budget $200 a month plus credits. Cowork fits a personal job for someone who already pays for Claude Pro. For a team's recurring jobs, Construct is the better fit.",
    },
  ],
  "ai-agent-files-and-artifacts": [
    {
      question: "Where does an AI agent's work go in Construct?",
      answer:
        "It lands as files in a persistent workspace as the agent produces it: reports, spreadsheets, documents, designed PDFs, charts, and small internal apps. Lite includes 100 MB of storage for $9 a month, Starter 1 GB, and Pro 3 GB, and the next run can read what the last one saved.",
    },
    {
      question: "Can Construct create PDF, Excel, Word, and PowerPoint files?",
      answer:
        "Yes. The agent can export a Markdown report to a designed PDF with page numbers and bookmarks, and it writes Excel, Word, and PowerPoint files with the document libraries installed in its terminal. You can preview those formats in the Files app.",
    },
    {
      question: "Will the agent overwrite a file I edited?",
      answer:
        "No. The agent tracks which version of a file it last read, and if you change the file after that, its next write is refused as a conflict instead of replacing your edit.",
    },
    {
      question: "Can my team see the files the agent creates?",
      answer:
        "Yes, in a team workspace. Files in the Team area are shared with members who have file access, each member keeps a private area, and individual files can be shared with the whole team or with specific people. Storage counts against the owner's plan.",
    },
    {
      question: "What should I set up before relying on Construct Files?",
      answer:
        "Use dated filenames, since Files has no trash or version history, and add a standing instruction not to delete files. Connect Google Drive or Dropbox if you want final copies there, edit Office files by asking the agent for a new version, and pick a plan with enough storage for your archive.",
    },
  ],
  "ai-agent-telegram-slack-discord": [
    {
      question:
        "Can I message my Construct agent from Telegram, Slack, Discord, or email?",
      answer:
        "Yes. You connect Slack, Discord, and Telegram from Settings, then Messaging, and every plan from $9 a month includes the agent's own email address. The same agent, workspace, and memory answer on every channel, so a job started from your phone lands in the files you open on your laptop.",
    },
    {
      question: "Who can talk to the agent once it is in Slack or Discord?",
      answer:
        "Each install starts at Only people I allow, so only the installer gets replies. You can add people to Full access, block people, or switch to Everyone in the server, where unlisted members get a read-only guest agent.",
    },
    {
      question: "Can I send different channels to different agents?",
      answer:
        "Yes. Under Default agent you pick which agent answers on each platform, and Route specific channels sends one Slack or Discord channel to a different agent. Lite includes up to 2 agents, Starter 5, and Pro 15.",
    },
    {
      question: "Can other people assign work to the agent by email?",
      answer:
        "A job starts by email when the message comes from the address you use for your Construct account and passes sender authentication. Mail from anyone else is stored and shown in the inbox, and you can ask the agent to deal with it.",
    },
    {
      question: "Do scheduled jobs post into Slack or Telegram?",
      answer:
        "Scheduled jobs deliver their results to the Construct web app with a notification. Use Slack, Telegram, and Discord to start work and get replies to what you asked, and ask the agent to save tables as files and reply with the link.",
    },
    {
      question: "How do I stop a job I started from Slack?",
      answer:
        "Type @Construct /stop as plain text in the thread, or react with the cross mark emoji to a message in the thread. Typing @Construct /new starts a fresh session in that thread.",
    },
  ],
  "manus-alternatives": [
    {
      question: "Is Construct a good Manus alternative for recurring work?",
      answer:
        "Yes. Construct runs recurring business work from a persistent cloud workspace starting at $9 a month on Lite, with 3 scheduled tasks, 2 agents, and an agent email address. Finished files stay in the workspace between runs, so this week's report can compare against last week's, and Calendar schedules run server-side with your laptop closed.",
    },
    {
      question: "How does Construct's pricing compare with Manus credits?",
      answer:
        "Construct is a monthly plan with published limits: Lite $9, Starter $59 with 10 scheduled tasks, and Pro $299 with 50 scheduled tasks and your own model keys. Manus spends credits on every run, unused monthly credits do not roll over, you cannot start a new task at zero credits, and a persistent Cloud Computer costs $30 or $50 a month extra.",
    },
    {
      question: "Can I use Construct alongside Manus?",
      answer:
        "Yes. Keep Manus for one-off research and builds and move the one recurring job where credits or lost files hurt most. Start on Lite or the 7-day Pro trial, copy the task prompt, upload the files the job needs, connect the apps, run it once, and put it on the Calendar. There is no import from Manus.",
    },
    {
      question: "Does Construct support event triggers like Manus?",
      answer:
        "Construct starts runs from the Calendar, by hand, or from an agent, not from events in other apps. For an event-driven job such as new CRM records, schedule a regular run that picks up everything new since the last file. Workflows do not pause for approval yet, so ask for drafts of anything customer-facing and send them yourself.",
    },
    {
      question: "When does Manus still make sense?",
      answer:
        "Manus can still fit if a job must start the moment an event happens in a connected service, if you need a process such as a bot or server running 24/7 on a machine you rent, or if you mostly hand over one-off research and build tasks. For weekly work that should leave files your team can open, Construct is the better fit.",
    },
  ],
  "where-ai-agents-fail": [
    {
      question: "What counts as a failed AI agent run in this study?",
      answer:
        "A run counts as failed if it used its whole step budget without finishing, stopped on an error it could not recover from, or ended without a final answer. A run that stopped to ask a person a question is reported separately as handed back, and runs a person interrupted are excluded from failure rates.",
    },
    {
      question: "What is a step in an AI agent run?",
      answer:
        "A step is one cycle in which the model decides what to do next and usually calls one or more tools, such as the browser, the terminal, a file, a connected app, or email. It is the same unit Construct plans meter as steps per task: up to 50 on Lite, 150 on Starter, and 1,000 on Pro.",
    },
    {
      question: "Does the study read customer prompts or files?",
      answer:
        "No. The analysis uses only counts, step numbers, outcome labels, tool categories, plan tier, and what started each run. Prompts, messages, files, email content, URLs, and names are never touched, identifiers are hashed and dropped, and small cells are suppressed.",
    },
    {
      question: "Does a completed run mean the output was correct?",
      answer:
        "No. Completed means the agent said it was done. Checking correctness would require reading the work, which the study does not do, so it measures where runs stop, not whether finished runs were right.",
    },
    {
      question: "How does Construct limit the cost of a failed run?",
      answer:
        "Construct saves finished work to workspace files as it is produced, so a run that stops at step 30 still leaves steps 1 to 29 behind and the next run can start from them. You can also correct the memory a run relied on, and Calendar schedules run on Construct's servers with your laptop closed.",
    },
    {
      question: "What should I do if my agent keeps failing on a long job?",
      answer:
        "Count the job's steps and run it on demand a few times to see where it stops. If it fails early, fix the setup, such as a missing connection or input. If it fails late, cut it into pieces that each save a file, then schedule it.",
    },
  ],
  "ai-competitor-pricing-report": [
    {
      question: "Can Construct produce a weekly competitor pricing report?",
      answer:
        "Yes. The agent reads each pricing page, saves a dated snapshot to Files, compares it with last week's snapshot, and writes a short report of what changed. Lite at $9 a month includes 3 scheduled tasks, so the report can run every Monday on the cheapest plan, with your laptop closed.",
    },
    {
      question: "How does the agent know what changed since last week?",
      answer:
        "Each run saves a structured snapshot with the date in the file name. The comparison prompt opens the newest snapshot and the one before it and lists price changes, plans added or removed, limit changes, and trial changes, each with the old value, new value, and source URL.",
    },
    {
      question: "Why use Construct instead of a page monitoring tool?",
      answer:
        "A page monitor such as Visualping charges by the number of pages watched and alerts you that a page changed. Construct gives you a plan by plan table across every competitor, a dated history you can query later, and the exact price text as evidence for every number, starting at $9 a month.",
    },
    {
      question: "Can I use Construct alongside a page monitor?",
      answer:
        "Yes. Keep a monitor for instant alerts on one or two critical pages and let Construct run the weekly comparison of plans, prices, limits, and trials.",
    },
    {
      question: "Where does the weekly report arrive?",
      answer:
        "Scheduled runs deliver to the Construct web app with a notification, and the report is saved in Files. Share the file in your team channel after you have read it.",
    },
    {
      question:
        "Why might the agent record a different price than my customers see?",
      answer:
        "Some pricing pages vary by region, currency, billing toggle, or login. The agent records what its fetch or browser run saw, so note the region or currency you care about in competitors.csv, and use the exact price text column to check whether it captured monthly or annual pricing.",
    },
  ],
  "ai-agent-prompt-injection": [
    {
      question: "Is Construct safe to use for reading email?",
      answer:
        "Construct limits what a fooled agent can do. Only mail from the owner's own authenticated address starts a task, automated mail is screened, daily sending is capped on the server, chat channels default to only people you allow, connected apps can be switched off per agent, and Activity records actions. It does not detect or filter injected text and its workflows have no approval step yet, so keep sends as drafts that a person sends.",
    },
    {
      question: "What is prompt injection?",
      answer:
        "Prompt injection is when text an AI agent reads, such as an email, a web page, or a document, contains instructions that the agent then follows as if you had given them. The version that matters for agents is indirect prompt injection, where the attacker plants instructions somewhere the agent will read later.",
    },
    {
      question: "Can prompt injection be fully prevented?",
      answer:
        "Not today. The UK's NCSC says prompt injection attacks may never be totally mitigated the way SQL injection can be, OWASP says it is unclear if there are fool proof methods of prevention, and Anthropic reported in August 2025 that its browser agent still fell for 11.2% of red-team attacks in autonomous mode with new defenses.",
    },
    {
      question: "What is the lethal trifecta?",
      answer:
        "Simon Willison's name for an agent that combines access to your private data, exposure to untrusted content, and the ability to externally communicate. With all three, an attacker can trick the agent into sending your private data to them, so the safest design is to avoid that combination in a single job.",
    },
    {
      question:
        "How do I set up an email agent in Construct that a hostile email cannot steer?",
      answer:
        "Have vendors email the agent's own address, where their mail starts nothing. Run a scheduled job that summarizes new mail to a file, flags requests for bank details or invoice lists, and is told not to send. Use an agent with connected apps switched off, ask for drafts when you want a reply, send them yourself, and check Activity and memory afterward.",
    },
    {
      question: "Is it safe to let an AI agent read my email?",
      answer:
        "Reading and summarizing is useful and relatively low risk if the job cannot also send, delete, or pay without a person checking. Start with summaries, add drafts, and keep a person on anything you could not undo.",
    },
  ],
  "sintra-alternatives": [
    {
      question: "Is Construct a good Sintra alternative?",
      answer:
        "Yes, for most founders and small businesses. Construct starts at $9 a month instead of Sintra X's $97 list or $48.50 sale price, runs jobs on a Calendar schedule without you in the chat, saves finished work to workspace files as it goes, and keeps memory you can read, correct, or forget.",
    },
    {
      question: "Why do people look for a Sintra alternative?",
      answer:
        "Sintra X includes 250 credits a month, and its help center says AI employees stop working when a workspace runs out. Sintra's own FAQ says every AI worker runs as a chatbot, so you direct most of the work in chat. And Sintra's pages disagree on its integration count, single helper plans, and annual price.",
    },
    {
      question: "How much does Sintra cost compared with Construct?",
      answer:
        "When we checked on October 1, 2026, Sintra X listed at $97 a month and was on sale at $48.50 for a one-month term, or $15.60 a month on a 12-month sale term, each with 250 credits a month. Construct Lite is $9 a month for 2 agents, 3 scheduled tasks, and an agent email address, Starter is $59, and Pro is $299 with a 7-day trial.",
    },
    {
      question: "Can I use Construct alongside Sintra?",
      answer:
        "Yes. Keep Sintra for its named marketing helpers and give Construct the recurring work that needs files and a schedule. There is no import, so paste the brand voice and business details you gave Brain AI into Construct's first instruction, move your files into the workspace, run the job once, and put it on the Calendar.",
    },
    {
      question: "When does Sintra still make sense?",
      answer:
        "Sintra can still fit if you want 12 named marketing helpers and its ready-made automations without describing the jobs yourself, if you have already prepaid a 12-month term, or if you mainly work from its iOS or Android app. For recurring work that should leave files behind, Construct is the better fit.",
    },
    {
      question: "Which other Sintra alternatives are worth a look?",
      answer:
        "For narrower jobs: Marblism at $44 a month if you need a receptionist to answer your phone, Muse for Small Business if you sell on Instagram and Facebook in the US or Canada, and Manus's free plan for one-off research. CellCog, Lindy, Claude with Cowork, and Zapier Agents are also compared in the post.",
    },
  ],
  "sintra-vs-marblism-vs-lindy": [
    {
      question:
        "Is Construct a good alternative to Sintra, Marblism, or Lindy?",
      answer:
        "Yes, for founders and small teams whose work is recurring reports and cross-app jobs. Construct starts at $9 a month, is one general-purpose AI employee rather than a roster of roles, saves finished work to workspace files, runs scheduled jobs from its Calendar, and covers a team workspace on any plan with no per-seat fee.",
    },
    {
      question: "How much do Sintra, Marblism, Lindy, and Construct cost?",
      answer:
        "When we checked on October 1, 2026, Sintra X listed at $97 a month with sale prices from $48.50, Marblism was $44 a month or $24 billed yearly for 50 hours of work, and Lindy Plus was $29.99 per user a month for 3,000 credits. Construct Lite is $9 a month, or $7.50 a month billed annually.",
    },
    {
      question: "Which is cheapest for a team of three?",
      answer:
        "Sintra and Marblism cost the same for three people as for one, because team members are included. Construct Starter is $59 a month for one team workspace with no per-seat fee or member limit. Lindy charges per user, so three people on Plus cost $89.97 a month, with 9,000 pooled credits.",
    },
    {
      question: "Do they send emails without asking?",
      answer:
        "Marblism's Eva only drafts replies. Lindy can send, and you can require approval in Slack before each write action. Sintra's scheduled tasks can send emails when the integration is connected. Construct's workflows do not pause for approval yet, so for anything customer-facing, ask it for drafts and send them yourself.",
    },
    {
      question: "Can I use Construct alongside Sintra, Marblism, or Lindy?",
      answer:
        "Yes. Keep your current tool for the role it covers and move one recurring job to Construct: start on Lite for $9 or the 7-day Pro trial, copy the instructions, move the files, connect the apps, run it once, and put it on the Calendar. There is no import, so write your rules into the first instruction.",
    },
    {
      question: "When does Sintra, Marblism, or Lindy still make sense?",
      answer:
        "Marblism fits when you need your phone answered on a business number. Sintra fits when you want ready-made marketing roles with Facebook comment replies. Lindy fits when you want per-action approvals in Slack or texting over iMessage and SMS. For recurring reports and cross-app jobs at one price for the team, Construct is the better fit.",
    },
  ],
  "ai-agent-custom-mcp": [
    {
      question: "Can I connect my own MCP server to an AI agent in Construct?",
      answer:
        "Yes. Add the server's public HTTPS address in Apps with Add MCP, and the agent can discover and call up to 200 of its tools alongside the live integration catalog. You then choose which agents may use it, and the results land in workspace files your team can open.",
    },
    {
      question:
        "Why use Construct for custom MCP tools instead of wiring up an agent myself?",
      answer:
        "Construct validates every call against your tool's own schema before sending it, limits each server to the agents you pick, saves results to workspace files, and can run the job on the Calendar, re-checking access on every run. You do not have to host an agent or build tool discovery yourself.",
    },
    {
      question: "What are the limits on custom MCP tools in Construct?",
      answer:
        "Each call has 15 seconds to answer and up to 512 KB of response, Construct reads up to 200 tools per server, redirects must stay on the same origin, and private or local network addresses are refused. For long jobs, return a job ID quickly and offer a second tool that checks status.",
    },
    {
      question: "How do I stop an agent from using a custom MCP server?",
      answer:
        "Turn the server off in that agent's settings, or uninstall it from the workspace. Scheduled jobs and workflows re-check the install and the agent's access on every run, so the change applies from the next run.",
    },
    {
      question: "Does Construct ask for approval before calling an MCP tool?",
      answer:
        "No. Construct does not ask before every tool call. You control access by choosing which servers are installed and which agents may use them, by building narrow, read-only tools where possible, and by telling the agent which write tools not to call until you say so.",
    },
    {
      question:
        "Can I add an API key or custom headers to a custom MCP connection?",
      answer:
        "Not yet. Construct sends a short-lived, Construct-signed bearer token with each call, and there is no field for your own API key or headers, so build servers that are safe to expose to a known caller: narrow, read-only where possible, and rate limited.",
    },
  ],
  "hire-an-ai-employee": [
    {
      question: "How do I hire my first AI employee with Construct?",
      answer:
        "Start on Construct Lite at $9 a month or the 7-day Pro trial and stage it over 30 days: read-only research in week 1, one scheduled recurring job in week 2, jobs that write to your own systems in week 3, and outward-facing drafts in week 4, then decide on day 30.",
    },
    {
      question: "Is an AI employee cheaper than a virtual assistant?",
      answer:
        "Construct starts at $9 a month, while a part-time offshore virtual assistant working 20 hours a week costs $350 to $1,300 a month by Cherry Assistant's published rates. The 30-day plan shows you which of your recurring jobs the agent can take.",
    },
    {
      question: "Which jobs should an AI employee do first?",
      answer:
        "Pick jobs by reviewability. The best first job is one where a wrong answer is obvious and costs nothing, such as company research, summaries, or file analysis, with a source URL for every fact.",
    },
    {
      question: "How do I supervise an AI employee day to day?",
      answer:
        "Check what ran, what it produced, whether it changed anything outside Files, whether it asked you anything, and whether anything is stuck. Construct's workflows do not pause for approval yet, so keep outward work as drafts you send yourself, read the Memories app weekly to remove stale rules, and stop a running job whenever something looks wrong.",
    },
    {
      question: "When should I move from Lite to Starter or Pro?",
      answer:
        "Change plans when the limits stop you, not the agent. Lite has 50 steps per task, 3 scheduled tasks, and 2 agents; Starter has 150 steps, 10 scheduled tasks, and 5 agents; Pro has up to 1,000 steps, 50 scheduled tasks, 15 agents, and bring your own model keys.",
    },
    {
      question: "What if a job still needs heavy corrections by week 3?",
      answer:
        "Rescope it: move it back to on demand, tighten the instructions, and save the corrections to memory. Jobs that must react within seconds of an event belong in a trigger based automation tool; give Construct the recurring work that needs reading, judgment, and a saved result.",
    },
  ],
  "construct-vs-manus": [
    {
      question: "Is Construct a good Manus alternative?",
      answer:
        "Yes, for recurring work. Construct gives every agent a persistent workspace with files, a browser, a terminal, and Calendar schedules from $9 a month, at a fixed price with published plan limits. Your team shares one workspace without seat fees, and you can read and correct what the agent remembers.",
    },
    {
      question: "Is Construct cheaper than Manus?",
      answer:
        "For recurring work with files that persist, yes. Construct Lite is $9. Manus has a free plan and Pro from $20 in credits that do not roll over, and keeping working files on a machine between tasks means adding a Cloud Computer for $30 or $50 more. Manus Team starts at $20 per seat.",
    },
    {
      question: "What is the main difference between Construct and Manus?",
      answer:
        "Manus runs each task in a sandbox that closes when the task completes, with a persistent Cloud Computer sold as an add-on. Construct keeps a persistent workspace on every plan, so this Monday's report can open last Monday's file.",
    },
    {
      question: "Can I use Construct alongside Manus?",
      answer:
        "Yes. Keep Manus for one-off builds and give Construct the jobs that repeat. Copy an Automation prompt into Construct, move its files, connect the apps, run it once, and put it on the Calendar. There is no import, and an event-triggered Automation becomes a frequent schedule or an email you forward from your own address.",
    },
    {
      question: "When does Manus still make sense?",
      answer:
        "When you want a free plan for occasional one-off research, decks, or sites, when a job must start the moment an event happens in a connected service, or when you need a bot or server running 24/7 or a public website with a custom domain.",
    },
  ],
  "construct-vs-perplexity-computer": [
    {
      question: "Is Construct a good Perplexity Computer alternative?",
      answer:
        "Yes, for recurring work. Construct starts at a fixed $9 a month with published plan limits, saves every result as a file your whole team can open, builds each week's report on the last one, and lets you read and correct its memory on every plan.",
    },
    {
      question: "Is Construct cheaper than Perplexity Computer?",
      answer:
        "At the entry level, yes. Construct Lite is $9 a month. Perplexity Max includes 10,000 Computer credits a month for about $200, and Pro includes none, so you buy credits at $1 per 100. A multi-step report is 350 to 950 credits, or $3.50 to $9.50, each time it runs.",
    },
    {
      question:
        "Can my team share Construct the way it cannot share Perplexity credits?",
      answer:
        "Yes. Perplexity says credits are personal to one account outside limited Enterprise cases. A Construct team workspace has Owner, Admin, and Member roles, no member limit, and everyone's work draws on the owner's plan, so every member with access can open the files the agent saves.",
    },
    {
      question: "Can I use Construct alongside Perplexity Computer?",
      answer:
        "Yes. Keep Perplexity for deep one-off questions and give Construct the jobs that repeat. Copy a scheduled task's instructions, move the files, connect the apps, run it once, and put it on the Calendar. There is no import, and purchased Perplexity credits stay valid for a year.",
    },
    {
      question: "When does Perplexity Computer still make sense?",
      answer:
        "When the job is one deep research question where you want many models and premium data, when you want the agent on your own Mac or PC through Personal Computer, or when your company runs on Microsoft Teams.",
    },
  ],
  "ai-coworker-vs-ai-employee": [
    {
      question: "Is Construct an AI employee or an AI coworker?",
      answer:
        "Construct is built as an AI employee: each agent has a persistent cloud workspace, its own email address, a Calendar of scheduled jobs that run with your laptop closed, and a team workspace. It also takes one off tasks in chat the way a coworker does, and can save a task that works as a workflow.",
    },
    {
      question:
        "What is the difference between an AI assistant, an AI coworker, and an AI employee?",
      answer:
        "An AI assistant answers when you ask, inside a conversation. An AI coworker takes tasks you hand it and works in your apps while you stay in the loop. An AI employee owns a recurring job that runs from a schedule, an email, or a message, in its own workspace, and leaves files and a history behind.",
    },
    {
      question: "Which one do I need?",
      answer:
        "Keep the chat assistant you already have for quick answers, and hire an AI employee for the first job that recurs, needs its own identity, or is shared by a team. Because Construct also handles one off tasks, most small teams do not need a separate coworker product on top.",
    },
    {
      question: "How much do they cost?",
      answer:
        "On October 1, 2026, assistants and coworkers bundled into chat plans started around $20 a month, such as Claude Pro with Cowork at $20 and Google AI Pro at $19.99. Products sold as AI employees started at $9 a month for Construct Lite, $29.99 per user for Lindy Plus, and $50 per workspace for Viktor.",
    },
    {
      question: "When does an assistant or coworker still make sense?",
      answer:
        "When you only need quick answers and writing help you already pay for, when the work must happen in desktop apps or local files on your own computer, which Construct does not operate, or when your company wants the agent inside Microsoft 365.",
    },
    {
      question: "How can I tell what a product really is?",
      answer:
        "Test whether it can start without you, where its output goes, whose identity it uses, what it remembers and whether you can correct it, who else can use it, what needs approval, and what happens when a run fails halfway.",
    },
  ],
  "cheapest-ai-employee": [
    {
      question: "What is the cheapest AI employee?",
      answer:
        "Construct Lite at $9 a month, or $7.50 a month billed annually. It is the cheapest paid plan we found that gives an agent its own cloud workspace and runs scheduled work there with your laptop closed: up to 2 agents, 50 steps per task, 3 scheduled tasks, an agent email address, and workspace files where every result is saved.",
    },
    {
      question: "Is Construct Lite better value than a $20 agent subscription?",
      answer:
        "For recurring business work, yes. The $20 options, such as Claude Pro, Google AI Pro, Cursor Pro with Grok Bot, Manus Pro, Muse Power, and ChatGPT Plus, bundle an agent into a chat or coding subscription bought per person. Construct Lite costs less, needs no other subscription, keeps jobs on a Calendar, and leaves files the next run can build on. Starter at $59 adds a team workspace with no per-seat fee.",
    },
    {
      question:
        "Can I use Construct alongside the AI subscription I already pay for?",
      answer:
        "Yes. Keep your chat subscription for conversations and move one recurring job to Construct: start on Lite for $9 or the 7-day Pro trial, copy your prompt, move the files, connect the apps, run it once, and put it on the Calendar. There is no import, so write your rules into the first instruction.",
    },
    {
      question: "Does ChatGPT Plus include always-on agents?",
      answer:
        "No. ChatGPT Plus at $20 includes agent mode, which draws on the same rolling message cap as regular chat, but OpenAI's always-on dots need ChatGPT Pro or Business Premium, according to the third-party guides and launch coverage we could fetch.",
    },
    {
      question: "What does a cheap AI agent plan leave out?",
      answer:
        "Usage caps, in units such as steps, credits, tokens, or weekly grants, and often team use, since most $20 agents are bought per person. Self-hosted agents add hosting and model costs, and some agents leave output in a chat thread rather than files the next run can build on. Construct publishes its limits per plan, and Starter at $59 gives 6x Lite's usage.",
    },
    {
      question: "When does a free tier or automation tool still make sense?",
      answer:
        "Manus Free, or Meta Muse in the US, fits if you want to spend nothing while you experiment. Make or Zapier fit fixed data mapping between apps. A $20 bundle fits if you already pay for Claude, Google AI Pro, or Cursor and only want a personal assistant. For recurring work that should run on a schedule and leave files, Construct Lite is the cheapest fit.",
    },
  ],
  "construct-vs-cellcog": [
    {
      question: "Is Construct a good CellCog alternative?",
      answer:
        "Yes, for recurring jobs. Construct runs them on a fixed $9 plan with 3 scheduled tasks, or 10 on Starter at $59, saves every result as a file in your workspace, takes work from Slack, Telegram, Discord, and email, lets you correct its memory, and accepts your own model keys on Pro.",
    },
    {
      question: "Is Construct cheaper than CellCog?",
      answer:
        "For recurring work, yes. CellCog starts at $8 for 800 credits, but its own plan labels put a part-time AI employee at $160 a month and a full-time one at $500. Construct Lite is $9 with 3 scheduled tasks, at a fixed monthly price with published plan limits.",
    },
    {
      question: "Does CellCog offer refunds?",
      answer:
        "No. CellCog's pricing page says all payments are final and non-refundable, including subscription fees, automatic renewals, and credit top-ups, so time any downgrade to the end of a billing period and use remaining credits first.",
    },
    {
      question: "Can I use Construct alongside CellCog?",
      answer:
        "Yes. Keep a CellCog employee for phone calls or meetings and give Construct the recurring jobs. Copy the role brief for one job, move its documents into the workspace, connect the apps, run it once, and put it on the Calendar. There is no import.",
    },
    {
      question: "When does CellCog still make sense?",
      answer:
        "When you need an AI employee that answers its own phone line or joins Google Meet and Zoom calls, when you need video, images, audio, or podcasts as output, or when you want one worker to plan its own shifts in your logged-in Chrome with approval cards.",
    },
  ],
  "ai-follow-ups-crm-without-zapier": [
    {
      question:
        "Can Construct handle customer follow-ups and CRM updates without Zapier?",
      answer:
        "Yes. Construct finds deals that have gone quiet, reads each one's last email thread, drafts a follow-up that answers what the customer said, and logs a note in your CRM from one prompt, starting at $9 a month. The emails stay drafts until you approve them.",
    },
    {
      question: "Why use Construct instead of Zapier for follow-ups?",
      answer:
        "The hard part of a follow-up is judgment: which deals need a nudge and what to say. Construct reads each deal and thread and decides, writes drafts from the real conversation, and keeps a dated changes file of every CRM write. It starts at $9 a month, while Zapier Professional is $29.99 a month billed monthly.",
    },
    {
      question: "Can I use Construct alongside my existing Zaps?",
      answer:
        "Yes. Keep the Zaps that create records on events, such as a new contact from a form, and give Construct the follow-ups that need reading. Give each one its own fields so they do not overwrite each other. There is no import; you describe the job to Construct in plain language.",
    },
    {
      question: "When does Zapier still make sense?",
      answer:
        "For fixed, event-triggered jobs that must run the moment something happens, such as creating a contact when a form is submitted. Construct runs on demand or from the Calendar, as often as every 15 minutes, which suits a weekday morning follow-up pass.",
    },
    {
      question: "Does Construct send follow-up emails automatically?",
      answer:
        "Only if you tell it to. Construct's workflows do not pause for approval yet, so the guide uses a standing rule that the agent never sends a customer email until you reply send for that draft, and the scheduled job is draft only.",
    },
    {
      question: "How do I know what the agent changed in my CRM?",
      answer:
        "Ask it to save a dated changes file listing every CRM write it made, and use Activity, which records each action with a short reason for a limited window. Activity is a useful operating record, not a complete audit log.",
    },
  ],
  "ai-search-recommends-ai-employees": [
    {
      question: "How was the AI search study run?",
      answer:
        "The same 60 buyer questions were asked on ChatGPT, Perplexity, Gemini, Google AI Mode, Claude, and Grok, each in its private or temporary mode and a fresh chat, on audit dates between September 30 and December 14, 2026. Every product named and every site cited was recorded.",
    },
    {
      question: "What counts as a recommendation?",
      answer:
        "A product counts as recommended when the answer presents it as an option to use, such as in a list of suggestions or as the direct answer. Products only mentioned as a contrast, products named in the prompt itself, and answers to brand prompts do not count toward the rankings.",
    },
    {
      question: "Is the study biased toward Construct?",
      answer:
        "Construct is in the category, so the post discloses that, publishes every prompt, marks the prompts that reflect how Construct describes the category, and reports Construct's results with and without them in the same tables as every other product.",
    },
    {
      question: "Do AI engines test the products they recommend?",
      answer:
        "No. An AI engine summarises what has been written about products, weighted by what its search step found. A recommendation shows which products have the most findable writing behind them, so check the sources, the date, and the vendor's own pricing page before you buy.",
    },
    {
      question:
        "How can I check Construct for myself instead of relying on an AI answer?",
      answer:
        "Give it one job you repeat every week with the same inputs you would give a person, and read the saved file. Lite costs $9 a month with 2 agents, 50 steps per task, and 3 scheduled tasks, and there is a seven day Pro trial. Finished work lands in workspace files and you can read and correct what it remembers.",
    },
  ],
  "ai-investor-update": [
    {
      question: "Can Construct draft my weekly investor update?",
      answer:
        "Yes. Construct drafts it every Friday from shipped work in GitHub and Linear, deal movement in your CRM, and a metrics file you maintain, with a link behind every claim, starting at $9 a month. You check the numbers, edit the voice, and send it yourself.",
    },
    {
      question: "Why use Construct instead of writing the update by hand?",
      answer:
        "Construct does the Friday gathering across GitHub, Linear, and your CRM, turns ticket titles into outcomes investors read, marks any missing number instead of guessing, and keeps every week's draft as a file you can search later. You spend your time on the summary, lowlights, and asks.",
    },
    {
      question:
        "How do I stop the agent from inventing revenue or runway numbers?",
      answer:
        "Keep KPIs and financials in a metrics file you fill in, and give the agent a standing rule never to estimate a number. If a value is missing, it writes NEEDS NUMBER in its place so the gap is visible.",
    },
    {
      question: "Should the agent send the update to investors?",
      answer:
        "No. The guide keeps the job draft only, with a rule that the agent never emails or shares the update with anyone but you. Construct's workflows do not pause for approval yet, so you copy the final text into your own email, and the agent never needs your investor list.",
    },
    {
      question: "Which tools can the agent pull from?",
      answer:
        "GitHub, Linear, and HubSpot are in Construct's live integration catalog, and the agent asks you to connect an account when it first needs one. Name the repository, Linear team, and pipeline you want included so side projects stay out.",
    },
    {
      question: "What plan do I need for a weekly draft?",
      answer:
        "Any plan works. The scheduled job uses one of the 3 scheduled tasks included with Lite at $9 a month. If a busy week runs past Lite's 50 steps per task, narrow the scope or move to Starter with 150 steps.",
    },
  ],
  "construct-computer-alternatives": [
    {
      question: "Should I switch from Construct to another AI agent?",
      answer:
        "For most founders and small teams, no. Construct gives a team an AI employee with its own cloud workspace, files, Calendar schedules, and email address from $9 a month with no per-seat fee. Switching means giving up a shared workspace with no member limit, files the next run builds on, memory you can inspect and correct, and on Pro, your own model keys.",
    },
    {
      question: "What do I give up by choosing a Construct alternative?",
      answer:
        "It depends on the tool. Lindy is $29.99 per user and pauses credit-using actions when credits run out, ChatGPT dots need a Pro plan reported at $100 or $200 a month, Microsoft Copilot Cowork needs a $25.20 per-user license plus metered credits, Manus bills credits per task with a persistent server as a $30 or $50 add-on, and Gemini Spark needs a personal Google account. Construct starts at $9 for the whole workspace.",
    },
    {
      question: "Can Construct ask for approval before it sends something?",
      answer:
        "Construct's workflows do not pause for approval yet. For anything customer-facing, ask for drafts in the instructions and send them yourself once you have checked them, and run a new job by hand a few times before you put it on the Calendar.",
    },
    {
      question: "What should I try before switching away from Construct?",
      answer:
        "Move to Starter at $59 for 10 scheduled tasks and 150 steps per task, or try Pro free for 7 days for 50 schedules, up to 1,000 steps per task, and your own keys for OpenRouter, OpenAI, Anthropic, Amazon Bedrock, or xAI. Reach the agent from Slack, Telegram, Discord, or its own email address, and ask it to build a private workspace app when several people review the same output.",
    },
    {
      question: "Can I use Construct alongside another agent?",
      answer:
        "Yes. Keep the tool you already pay for, such as Claude, ChatGPT, or Gemini, for your own desk work, and move one recurring team job to Construct: start on Lite for $9, copy your instructions, move the files, connect the apps, run it once, and put it on the Calendar. There is no import, so write your rules into the first instruction.",
    },
    {
      question: "When does a Construct alternative still make sense?",
      answer:
        "When your company runs on Microsoft Teams or Microsoft 365 (Viktor or Copilot Cowork), when the work lives on your own computer or in desktop apps with no API (Claude with Cowork or Simular Sai), or when you need a phone answered or high-volume branching triggers (Marblism, or Zapier, Make, and n8n). For recurring team work that should leave files behind, Construct is the better fit.",
    },
  ],
  "construct-vs-simular-sai": [
    {
      question: "Is Construct a good Simular Sai alternative?",
      answer:
        "Yes, when your tools connect through integrations. Construct starts at $9 a month, reaches apps through its live integration catalog and your own MCP tools before using a browser or terminal, gives your team one workspace with shared files and correctable memory, and takes work from Slack, Telegram, Discord, and email.",
    },
    {
      question: "How much does Simular Sai cost compared with Construct?",
      answer:
        "As of October 1, 2026, Sai lists a free Explore plan, Pay as you go at $50 a month of credits covering AI and computer time, Unlimited at $500 with an always-on cloud computer, and custom Enterprise pricing. Construct Lite is $9, Starter $59, and Pro $299 with up to 15 agents and 50 scheduled tasks.",
    },
    {
      question: "Can Construct control desktop apps like Sai?",
      answer:
        "No. Construct works through its integration catalog, your own MCP tools, a live browser, and a sandbox terminal, but it cannot operate Windows or Mac desktop apps. Keep jobs that depend on desktop software on Sai and give Construct the rest.",
    },
    {
      question: "Can I use Construct alongside Sai?",
      answer:
        "Yes. Start with a job that touches apps Construct connects to directly, such as Gmail, HubSpot, Notion, or Google Sheets. Write the steps you taught Sai as plain instructions, connect the apps, run it once, and put it on the Calendar. There is no import.",
    },
    {
      question: "When does Simular Sai still make sense?",
      answer:
        "When the work happens inside desktop software, legacy tools, or portals with no API, when you want an always-on machine or an agent on your own Mac or PC, or when you want to approve every critical step from your phone.",
    },
  ],
  "ai-employee-for-consultants": [
    {
      question: "What can Construct do for a one-person consulting business?",
      answer:
        "It prepares pre-call research briefs with sources, drafts proposals from your discovery notes and templates, drafts a Friday status update for each client, and produces a morning list of emails that need a reply with drafted answers. You keep the advice, the pricing decisions, and the send button.",
    },
    {
      question: "How much does it cost?",
      answer:
        "Construct Lite is $9 a month with up to 2 agents, 50 steps per task, 3 scheduled tasks, and an agent email address, which covers the Friday updates and a weekday follow-up list on a schedule, with research and proposals on demand. Starter at $59 raises that to 10 scheduled tasks, and Pro has a 7-day free trial.",
    },
    {
      question:
        "Is Construct cheaper than a virtual assistant for a consultant?",
      answer:
        "Construct starts at $9 a month, while a US or UK freelance virtual assistant costs $18 to $40 an hour by Cherry Assistant's published rates. Construct also keeps a folder per client and remembers your rates and each client's preferences.",
    },
    {
      question: "Will the agent send emails to my clients?",
      answer:
        "Not in this setup. Construct's workflows do not pause for approval yet, so every client-facing prompt says do not send, and drafts are saved to Files or emailed to you from the agent's own address for review.",
    },
    {
      question: "How do I stop it inventing prices in proposals?",
      answer:
        "Keep your rates and terms in one file, tell the agent to remember never to quote a price that is not in that file, and ask it to leave a bracketed question wherever your notes do not give an answer.",
    },
    {
      question: "Is it safe to put client documents into an AI employee?",
      answer:
        "Check your client contracts and NDAs first. Construct says it does not train on your data and that you own the files, memories, and apps your agent produces. Connect only the tools each job needs, and treat incoming email as information rather than instructions.",
    },
  ],
  "ai-employee-team-workspace": [
    {
      question: "Can a whole team share one AI employee in Construct?",
      answer:
        "Yes. A Construct team workspace puts people, agents, a shared Team files area, and group chats in one place, with owner, admin, and member roles and permissions you can adjust per person. There is no per-seat charge or member limit on any plan, and Starter at $59 a month is sized for team volume.",
    },
    {
      question: "How many people can share one Construct plan?",
      answer:
        "There is no per-seat charge and no member limit. Everyone's agent work in a team workspace draws on the workspace owner's plan, and members do not need their own subscription, so the question is how much work the team gives it, not how many seats it needs.",
    },
    {
      question: "What stays private in a Construct team workspace?",
      answer:
        "Each person's own chats with an agent and their private files stay private. The Team files area, workspace memory, and group chats are shared, and in group chats the agent only uses shared resources, never one member's personal memory, private files, or personal connections.",
    },
    {
      question: "Who can connect apps and invite people in a team workspace?",
      answer:
        "By default, owners and admins can install apps, connect accounts, create agents and group chats, and invite or manage members. Members can read and write team files, use installed apps, and chat with the workspace's agents. Billing, deletion, and ownership transfer stay with the owner.",
    },
    {
      question: "Can an admin see everything every member's agent did?",
      answer:
        "Activity is per person, so each member sees the work they started, and there is no combined admin feed today. Run work the whole team should review in a group chat, where the agent answers in front of everyone.",
    },
    {
      question: "When does a different setup still make sense?",
      answer:
        "If you work alone, Construct's personal workspace is enough. A large company with strict identity and audit requirements should evaluate tools built for that, and a team that only needs answers rather than shared output may only need a chat assistant per person.",
    },
  ],
  "is-construct-computer-safe": [
    {
      question: "Is Construct Computer safe to use?",
      answer:
        "Yes, for a small team's everyday work with a scoped setup. Construct does not train on your data, encrypts the model keys and chat-bot credentials it stores, deletes workspace data when you close your account, and publishes its sub-processors. The agent still acts through the accounts you connect, and there is no mandatory approval before every external action, so connect only what a job needs and ask for drafts of anything that leaves the workspace.",
    },
    {
      question: "Does Construct train AI models on my data?",
      answer:
        "No. You own the files, memories, and apps your agent produces, and the licence you grant Construct covers storing, processing, and displaying that content only to run the service for you.",
    },
    {
      question: "What can Construct's agent access?",
      answer:
        "Your workspace files, a Linux terminal sandbox, a cloud browser that does not carry your logins, its own email inbox, the apps and custom tools you connect, and the chat channels you install it in. Each surface has limits, such as per-agent app access, channel allow lists that fail closed, and email that only you can command.",
    },
    {
      question: "Can Construct's agent be tricked by prompt injection?",
      answer:
        "The risk remains, as it does for any agent that reads outside content. Construct labels web pages, browser results, email, and tool results as external data whose instructions should not be followed, which reduces the risk without removing it. Keep agents that read untrusted content away from sending and updating records, and approve drafts yourself.",
    },
    {
      question: "What is a safe way to start with Construct?",
      answer:
        "Start in a personal workspace with no connected apps and give it research and file work. Use the agent's own email address rather than your Gmail, connect one app when a real job needs it and turn it off for agents that do not, ask for drafts of anything that leaves the workspace, and schedule only what has worked on demand a few times.",
    },
    {
      question: "What happens to my data if I close my Construct account?",
      answer:
        "Closing your account deletes your workspace files, memory, chat history, Activity, Calendar, and agent email. Export anything you want to keep first.",
    },
  ],
  "how-to-choose-an-ai-agent-platform-for-your-team": [
    {
      question: "Which AI agent platform should a small team pilot first?",
      answer:
        "We recommend Construct. It answers each of the six criteria concretely: a live browser, sandbox terminal, workspace files, connected apps, and its own email in one task, memory you can correct, custom MCP for internal systems, and published plan limits from $9 a month. We build Construct, so run the same scorecard on anything else you shortlist.",
    },
    {
      question: "What criteria should I use to evaluate an AI agent platform?",
      answer:
        "Six: which execution surfaces it can act on, what human-in-the-loop controls it has, whether its audit trail is a forensic log or a readable summary, whether it supports custom MCP beyond a fixed catalog, whether memory can be inspected and corrected, and what is metered beyond the sticker price.",
    },
    {
      question: "Why do so many AI agent pilots fail?",
      answer:
        "Gartner forecasts that more than 40% of agentic AI projects will be canceled by the end of 2027 due to escalating costs, unclear business value, or inadequate risk controls. Scope creep and data quality are the two causes to check first.",
    },
    {
      question: "Can I run Construct alongside the agent I already use?",
      answer:
        "Yes. Start on Lite for $9 or the 7-day Pro trial, copy your current agent's instructions into a Construct chat, upload the source files, connect the apps, run the job once, score it against the six rows, and put it on the Calendar. There is no import from other platforms.",
    },
    {
      question: "Is Construct's Activity feed an audit log?",
      answer:
        "No, and Construct says so plainly. Activity records each action with a short reason for a limited window, and files, transcripts, workflows, memories, and chat tool records stay visible in the workspace. A regulated team that needs a complete, immutable audit log should keep its own records alongside.",
    },
    {
      question: "How does Construct handle actions that need approval?",
      answer:
        "You can interrupt a running task and answer when the agent asks for a decision. Construct's workflows do not pause for approval yet, so for anything customer-facing, ask for drafts and send them yourself, and run a new job on demand a few times before scheduling it.",
    },
  ],
};

export function getResourceFaqs(slug: string): readonly FaqItem[] {
  return resourceFaqs[slug] ?? [];
}
