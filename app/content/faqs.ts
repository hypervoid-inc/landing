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
        "No. Zen Mode is included in every Construct plan: Lite at $9/month, Starter at $59/month, and Pro at $299/month, billed monthly. Limits such as agents and scheduled tasks are the same whichever view you use.",
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
        "Grok Bot has no standalone price. Since October 12, 2026, new buyers get it with The X Subscription from Premium at $30 a month; Plus at $8 and Free do not include it, and older Cursor and SuperGrok plans keep it as legacy access. Construct Lite costs $9 a month and includes 2 agents (Construct and one more), 3 scheduled tasks, and an agent email address. Starter is $59 with 10 scheduled tasks, and Pro is $299 with 50 scheduled tasks and your own model keys.",
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
        "When you already pay for The X Subscription, or a legacy Cursor or SuperGrok plan, and only want to try the included Bot allowance, when you prefer teaching a routine by demonstrating it, or when you want several named bots coordinating in shared threads. For recurring team work with files, schedules, your own model keys, and correctable memory, Construct fits better.",
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
        "Construct Lite is $9 a month with 2 agents (Construct and one more) and 3 scheduled tasks; Starter is $59 and Pro is $299, priced per plan rather than per seat. Zapier's Professional plan started at $29.99 a month for 750 tasks and Team at $103.50 for 2,000 tasks when this post was published.",
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
        "Yes. Construct works from a web desktop with files, memory you can correct, a Calendar, workflows, a live browser, a sandbox terminal, connected apps, and its own email address. Lite costs $9 a month for 2 agents (Construct and one more) and 3 scheduled tasks, and Pro has a 7-day free trial.",
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
        "Lite is $9 a month with 2 agents (Construct and one more), 3 scheduled tasks, and an agent email address. Starter is $59 with 5 agents and 10 scheduled tasks. Pro is $299 with 15 agents, 50 scheduled tasks, bring-your-own-key support, and a 7-day free trial.",
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
      question: "Can I build internal tools with AI without a developer?",
      answer:
        "Yes. In Construct you describe the tool in plain English, and its agent writes a React app in your workspace, checks that it builds, and opens it beside the chat. When you want a change you ask in the same chat, and if an edit fails the last working version keeps running while the agent fixes it. Apps come with every plan, from $9 a month.",
    },
    {
      question:
        "Can Construct build a dashboard from PostHog and Google Analytics?",
      answer:
        "Yes. An app reads from connected apps through read-only queries, such as PostHog's query and trend tools and Google Analytics reports. Results refresh every 5 to 60 minutes, 15 by default, and a Live badge shows when every source is current. The agent checks the dashboard's headline numbers against the source's own reports before it finishes.",
    },
    {
      question: "How do I share an internal tool with my team?",
      answer:
        "Every app starts private. Its creator, or a workspace owner or admin, can share it with the workspace so teammates use it and add data, or turn on a public link that anyone can open read only. A public link unfurls as a preview card in Slack, is kept out of search engines and AI crawlers, and stops working the moment you turn it off.",
    },
    {
      question: "Is Construct an alternative to Retool for small teams?",
      answer:
        "For small teams without a spare engineer, yes. Construct's agent builds and maintains the tool from a plain-English request, starting at $9 a month with no per-seat fee, while Retool's Team plan was $10 per builder and $5 per internal user a month, billed annually, on October 26, 2026. Retool is the better fit when engineers build tools on your own production database for a large internal user base.",
    },
    {
      question: "When is a Construct app the wrong choice?",
      answer:
        "When the app is a product for your customers, when it needs npm packages, or when it has to query thousands of rows the way a database does, since app data is saved as JSON records. Keep those on their own hosting and let Construct build the internal tools around them.",
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
        "Construct starts at $9 a month with no other subscription needed. Most big-platform agents are bundled into subscriptions such as Claude Pro at $20, Grok Bot with The X Subscription Premium at $30, ChatGPT Pro from $100, or Perplexity Max at $200, and Simular's plan with an always-on machine is $500, checked on October 1, 2026.",
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
        "Muse for Small Business uses the same pricing as the Muse app: free with a usage limit, then the Power plan at $20 a month or the Max plan at $100 a month. Paid plans are metered in Muse tokens per week, and DataCamp reports that Muse asks for a payment card even on the free tier.",
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
        "Yes at the entry level. Construct Lite is $9 a month, while Lindy Team is from $29.99 per active user a month with 3,000 credits. For a team of three, Lindy Team is $89.97 a month before top-ups, while Construct Starter at $59 covers up to 5 agents for the whole workspace with no member limit.",
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
        "Lindy has a Free plan with $50 in credits that last 7 days, a Team plan billed per active user, and custom Enterprise. Team is from $29.99 per active user a month for 3,000 credits, and Lindy's pricing page also shows $49.99 for 5,000 credits to some visitors. Anyone who uses Lindy counts, including an @mention in Slack, credits pool across the team, and top-ups are $10 per 1,000 credits.",
    },
    {
      question: "When does Lindy still make sense?",
      answer:
        "When your whole team works inside Slack and each person wants a private assistant in their DMs, when you need per-action approval before every write or HIPAA with a signed BAA on Enterprise, or when you want to text your agent over iMessage or SMS.",
    },
  ],
  "ai-agent-discord-bot": [
    {
      question: "How do I add an AI agent to my Discord server?",
      answer:
        "In Construct, open Settings, then Messaging, and click Add to Discord. Pick your server, authorize the permissions, and mention @Construct in any channel. You need the Manage Server permission on the server, and in a team workspace the owner or an admin does the install. Discord is included in every Construct plan, from $9 a month.",
    },
    {
      question:
        "Does the Construct Discord bot read every message in my server?",
      answer:
        "No. By default it reads only messages addressed to it: mentions, replies to it, threads it started, slash commands and DMs. Listening is opt-in per channel. An owner or admin turns it on, the agent posts a notice in the channel, it reads only from that moment on, and messages are kept for 14 days by default, adjustable from 1 to 30.",
    },
    {
      question: "What are Construct's Listening modes?",
      answer:
        "Off reads nothing beyond mentions. Context keeps recent messages so replies understand the conversation and learns nothing. Learn also keeps a channel brief, open loops and memories. Assist also sends private suggestions to the person who asked and posts nothing unprompted until you raise the ceiling. Listening needs a paid plan.",
    },
    {
      question: "How does Construct work in Discord threads?",
      answer:
        "A mention, or a reply to one of its messages, opens a public thread named after your request. Everyone allowed to use the agent can keep talking to it in that thread without mentioning it again. It shows a progress line while it works, replaces it with the answer, attaches any files it made, and saves the thread to your Construct workspace.",
    },
    {
      question: "Who can use Construct in my Discord server?",
      answer:
        "Each server starts on Only people I allow, so only the installer gets replies. You can add members or roles to Full access, block anyone, or switch to Everyone, where unlisted members get a read-only guest agent limited to web search and workspace context, at 12 messages every 10 minutes. Requests run under the installer's plan, with no per-seat fees.",
    },
    {
      question:
        "How do members opt out of an AI bot reading their Discord messages?",
      answer:
        "In a channel where Construct is listening, /optout stops it reading and learning from your messages, /optin undoes that, and /forget_me deletes what it holds from your messages. /brief and /status show what the agent keeps in the channel and for how long.",
    },
    {
      question: "Is Construct a verified Discord app?",
      answer:
        "Yes. Construct is a verified app listed in Discord's App Directory. To link a server to your Construct workspace, add it from Settings, then Messaging, in Construct. If you add it from the App Directory first, your first mention shows a Connect this server card that sends you to the same settings screen.",
    },
    {
      question: "Do I need to create a Discord bot token to use Construct?",
      answer:
        "No. Construct is hosted, so there is no bot to create, no token to store and no gateway to run. Self-hosted agents such as OpenClaw and Hermes Agent ask you to create your own bot in the Discord Developer Portal and run a gateway process yourself.",
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
        "Google renamed Gemini Spark to Tasks in Gemini in October 2026. It has no separate price and comes with a Google AI Pro or Ultra subscription. It launched for US Ultra subscribers, reported at $100 a month, and reached the Pro tier, about $20 a month in the US, in late July 2026. Construct starts at $9 a month on its own plan.",
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
      question: "What is the best Lindy alternative for a small team?",
      answer:
        "Construct is the best Lindy alternative for founders and small teams. It starts at $9 a month, priced by plan rather than by person, while Lindy bills every user from $29.99. Team workspaces have no member limit, finished work is saved as files in a shared workspace, memory can be read and corrected, and Calendar schedules run with your laptop closed. You can reach it from Slack, Telegram, Discord, email, or the web.",
    },
    {
      question: "How much does Lindy AI cost per month?",
      answer:
        "On October 11, 2026, Lindy's paid Team plan started at $29.99 per active user a month for 3,000 credits, and its pricing page also showed $49.99 for 5,000 credits to some visitors. Anyone who uses Lindy takes a seat, including someone who only @mentions it in Slack. Credits pool across the workspace, do not roll over, and top-ups cost $10 per 1,000.",
    },
    {
      question: "Is Lindy AI free?",
      answer:
        "Not beyond a trial. Lindy offers $50 in free credits with no credit card, and those credits last 7 days. After that, every person who uses Lindy needs a paid seat, from $29.99 a month on its pricing page. When the shared credit pool runs out, Lindy pauses credit-using actions until the next billing cycle unless an admin buys a top-up.",
    },
    {
      question: "Is there a free Lindy AI alternative?",
      answer:
        "Partly. Manus has a free plan with 300 credits refreshed daily and 2 scheduled tasks, Zapier Agents has a free tier of 400 activities a month, and n8n can be self-hosted with no license fee. Viktor and CellCog give free starting credits. None is a free AI employee with a persistent workspace. Construct has no free plan, but new accounts get free credits with no time limit, Lite costs $9, and Pro has a 7-day trial.",
    },
    {
      question: "Is there an open-source alternative to Lindy?",
      answer:
        "The closest option in this comparison is n8n, which you can self-host. n8n describes itself as fair-code and is distributed under its royalty-free Sustainable Use License, so there is no license fee for self-hosting, but you run and maintain the server and design every workflow yourself. If you would rather describe the job and let an agent work out the steps, Construct starts at $9 a month.",
    },
    {
      question: "Lindy vs Viktor: which costs less for a team?",
      answer:
        "Viktor bills per workspace, from $50 a month for 20,000 credits, which it estimates at roughly 40 to 200 tasks. Lindy bills per user, so five people at $29.99 each cost $149.95 a month. Construct Starter is $59 a month for the whole workspace with no member limit, and it works in Slack plus Telegram, Discord, email, and the web, while Viktor works in Slack and Microsoft Teams.",
    },
    {
      question:
        "What does a five-person team pay for Construct compared with Lindy?",
      answer:
        "Construct Starter is $59 a month for the whole workspace, with up to 5 agents, 10 scheduled tasks, and no member limit. Five Lindy seats cost $149.95 a month at $29.99 per active user, or $249.95 at the $49.99 price Lindy's pricing page shows some visitors. Allowances differ, so model a busy month for your own jobs before you choose.",
    },
    {
      question: "Can I use Construct alongside Lindy?",
      answer:
        "Yes. Start on Construct Lite for $9 or the 7-day Pro trial, copy your Lindy instructions into a Construct chat, connect the apps the job needs, run it once, check the result in Files, and put it on the Calendar. There is no import, so write your rules into the first instruction. Construct workflows do not pause for approval yet, so ask for drafts on customer-facing work and send them yourself.",
    },
  ],
  "ai-agent-gmail-access-safely": [
    {
      question: "Is it safe to give an AI agent access to Gmail?",
      answer:
        "It is safe enough when you limit three things: which account the agent can reach, which agents can reach it, and whether anything is final before you see it. In Construct that means a role account rather than your personal inbox, Gmail blocked for every agent except your mail agent under App access, drafts instead of sends, and a regular look at Activity, Sent, and Trash.",
    },
    {
      question: "How do I give an AI agent access to Gmail safely?",
      answer:
        "Give it the least it needs. In Construct, start with the agent's own email address, included on every plan from $9 a month, for mail that does not need to come from you. Connect Gmail only when a job needs your identity, use a role account, block Gmail for agents that do not need it, ask for drafts, and know how to revoke access before you start.",
    },
    {
      question: "What does connecting Gmail to an AI agent actually grant?",
      answer:
        "It depends on the scopes listed on Google's consent screen. Google lists 14 Gmail API scopes and classes 8 as restricted, including gmail.readonly, gmail.compose, gmail.modify, and mail.google.com, which can read, compose, send, and permanently delete all your email. Drafting and sending share the gmail.compose scope, so a drafts-only setup is a rule you give the agent, not a permission Google grants.",
    },
    {
      question: "Can I give Construct read-only access to Gmail?",
      answer:
        "Not yet. The connected Gmail app can read, search, label, draft, send, move to Trash, and delete, with no read-only mode or per-action switch. Set it up so that does not matter: connect a role account instead of your personal inbox, allow Gmail only for your mail agent under App access, store a never-send rule in memory, and ask for drafts that you send yourself.",
    },
    {
      question: "How do I see what an AI agent did in my Gmail?",
      answer:
        "In Construct, open the Activity app, filter to Actions, and search for Gmail. Each row shows the reason the agent gave and an Open chat link to the full conversation, and you can export Activity as CSV or JSON. Activity keeps short summaries without email bodies for up to 30 days. Then check Gmail's Sent folder and Trash to confirm nothing went out or disappeared.",
    },
    {
      question: "How do I revoke an AI agent's Gmail access?",
      answer:
        "In Construct, open Settings, then Connections, and choose Disconnect next to Gmail. Then, on your Google Account's linked apps page, choose the Access to your Google Account filter, pick the app, select See details, then Remove access and Confirm. Disconnecting does not change your Calendar, so pause any scheduled jobs that use Gmail at the same time.",
    },
    {
      question:
        "What if my Google Workspace admin blocks the Gmail connection?",
      answer:
        "Google Workspace admins can restrict which third-party apps reach Gmail, including blocking a list of high-risk Gmail scopes, so a blocked connection is usually an organization policy. Ask your admin to allow the app, or keep the work in the agent's own Construct inbox, which needs no Google permission at all and is included on every plan from $9 a month.",
    },
    {
      question: "Can an AI agent be tricked by an email it reads?",
      answer:
        "Yes, which is why email content should be treated as information, never as orders. Any message a stranger sends can contain instructions aimed at the agent. In Construct, mail from anyone but you never starts a run in the agent's own inbox, and for Gmail you store a rule telling the agent to ignore instructions in other people's email and keep unattended jobs from both reading outside mail and sending.",
    },
  ],
  "construct-vs-muse": [
    {
      question: "Is Construct a good Muse for Small Business alternative?",
      answer:
        "Yes, for most founders and small teams. Construct starts at $9 a month and gives your business an AI employee with its own workspace, files, schedules, and email address that the whole team can use. Meta's Muse for Small Business is a personal agent tied to one Meta account, offered only to adults in the US and Canada, with no team plan in Meta's pages.",
    },
    {
      question: "Is Meta Muse free?",
      answer:
        "Muse is free up to a usage limit that Meta does not publish in numbers. When you reach it, you upgrade or wait for it to refresh. Paid plans are Power at $20 a month for 500M Muse tokens per week and Max at $100 for 3B tokens per week, and Muse for Small Business uses the same plans. DataCamp reports Muse asks for a payment card even on the free tier.",
    },
    {
      question:
        "How much does Muse for Small Business cost compared with Construct?",
      answer:
        "Muse has a free tier with an unpublished usage limit, then Power at $20 and Max at $100 a month, metered in tokens per week. Construct Lite is $9 a month for 2 agents (Construct and one more) and 3 scheduled tasks, Starter is $59, and Pro is $299 with a 7-day trial. Construct is priced per plan rather than per person, so a team shares one plan.",
    },
    {
      question: "Is Muse for Small Business available in the UK, EU, or India?",
      answer:
        "No. Meta says Muse for Small Business is available to people in the US and Canada who are 18 and over, and it has not given dates for other countries. Its help center adds that Muse subscriptions are in limited testing and not available in all locations. Construct needs no Meta account, so you sign up directly with Google or email and confirm your country at sign-up.",
    },
    {
      question: "Can my team share Muse or Construct?",
      answer:
        "Meta's Muse pages describe a personal agent on one Meta account and document no team plan or way to invite staff. Construct's team workspaces hold the agent, files, apps, and conversations together, with Owner, Admin, and Member roles, no member limit, and usage drawn from the owner's plan, so teammates join with their own login instead of sharing one.",
    },
    {
      question: "Can Muse run tasks on a schedule like Construct?",
      answer:
        "Meta says Muse keeps working across the apps you connect after you close it, but its pages do not document a tool for setting a job to run at a fixed time. In Construct, you save a task that worked as a workflow and put it on the Calendar, where it runs on Construct's servers with your laptop closed: 3 schedules on Lite, 10 on Starter, and 50 on Pro.",
    },
    {
      question: "Can I use Construct alongside Muse?",
      answer:
        "Yes. Keep Muse for your Instagram and Facebook ads and give Construct the reports, follow-ups, and trackers that live in Gmail, a CRM, and the web. Start on Lite for $9, copy your instructions, connect the apps, run the job once, and put it on the Calendar. There is no import, and Construct's workflows do not pause for approval yet, so ask for drafts of anything customer-facing.",
    },
  ],
  "always-on-ai-agents-compared": [
    {
      question: "Which always-on AI agent is cheapest for a three-person team?",
      answer:
        "Muse for Small Business is $0 on its free tier, but that buys three separate personal agents. Construct Starter is $59 a month for one shared team workspace with up to 5 agents and no per-seat fee. Claude Team Standard is $75 at $25 per seat, Grok Bot on The X Subscription Premium is $90 at $30 per person, and ChatGPT Business Premium with Dots is $375 at $125 per seat. These are subscription prices, not the cost of a finished job.",
    },
    {
      question: "Is Grok Bot free, and how much does it cost?",
      answer:
        "No. Since October 12, 2026, Grok Bot comes with The X Subscription from Premium at $30 a month, then Super at $100 and Ultra at $200; Plus at $8 and the free tier do not include it. Existing Cursor and SuperGrok plans keep it as legacy access, and usage resets weekly.",
    },
    {
      question: "Is Meta Muse free for a small business?",
      answer:
        "Yes, with a usage limit Meta does not publish in numbers. Power costs $20 a month for 500M Muse tokens per week and Max costs $100 for 3B tokens per week. DataCamp reports a payment card is required even on the free tier. Muse is a personal agent on one Meta account, available only to people 18 and over in the US and Canada, and the pages we read mention no way to add staff.",
    },
    {
      question:
        "Grok Bot vs Claude Cowork: which suits a small business better?",
      answer:
        "It depends on the account you already have. Grok Bot comes with Cursor or eligible xAI plans, and all your Bots share one computer, files, and logins, which xAI says are not security boundaries. Claude Cowork comes with any paid Claude plan, with Team seats at $25, runs scheduled tasks hourly to weekly, and waits for approval before sending, posting, or paying by default. Both bill per person; Construct covers a whole team workspace from $59.",
    },
    {
      question: "Which always-on AI agents work in the UK or EU?",
      answer:
        "Anthropic lists the UK, all EU countries, and Switzerland as supported for Claude. Dots on ChatGPT Pro exclude the EEA, Switzerland, and the UK, but Business Premium works in every supported ChatGPT region. Muse for Small Business is US and Canada only. The Grok Bot documentation lists no regions, beyond saying that tagging @bot on X is not available in every region yet. Construct needs only its own sign-up.",
    },
    {
      question: "Do these always-on agents ask before acting?",
      answer:
        "Muse says nothing publishes, sends, or spends without your approval. Dots use Custom Rules to allow, block, or require approval. Grok Bot uses Auto Review rules an admin can enforce, and Claude for Small Business waits for approval before anything sends, posts, or pays by default. Construct's workflows do not pause for approval yet, so for anything customer-facing, ask it for drafts and send them yourself once you have checked them.",
    },
    {
      question:
        "Is Construct a good alternative to Dots, Muse, Grok Bot, and Claude Cowork?",
      answer:
        "Yes, for founders and small teams. Construct starts at $9 a month, needs no Meta, ChatGPT, Claude, or Cursor account, and a team workspace covers everyone with no per-seat fee. Finished work lands in files the team shares, Calendar schedules run with your laptop closed, and you can read and correct what the agent remembers. Keep an existing agent for personal work and give Construct the recurring team jobs.",
    },
    {
      question:
        "Can I use Construct alongside ChatGPT Dots, Muse, Grok Bot, or Claude?",
      answer:
        "Yes. Start on Lite for $9 or the 7-day Pro trial, copy your current agent's instructions into a Construct chat, move the source files into the workspace, connect the apps the job needs, run it once, and put it on the Calendar. There is no import from Dots, Muse, Grok Bot, or Claude, so write your rules into the first instruction and Construct saves them as memory you can read and correct.",
    },
  ],
  "agent-reliability-calculator": [
    {
      question: "How reliable are AI agents on long tasks?",
      answer:
        "Less reliable than intuition suggests, because per-step errors multiply. An agent that gets 95% of its steps right finishes a 48-step job in one uninterrupted run only 8.5% of the time, since 0.95 to the power 48 is about 0.085. If every failure starts the job over, it needs about 11.7 runs on average. METR reported in 2025 that the task length agents complete at 50% reliability was doubling about every 7 months.",
    },
    {
      question: "Why do AI agents fail on long tasks?",
      answer:
        "Mostly because small per-step error rates compound. If each step succeeds with probability p, a job of n steps succeeds in one go with probability p to the power n. At 95% per step, ten steps finish about 60% of the time and 48 steps 8.5%. Real agents also fail in correlated ways, such as an expired login, and silently, such as a wrong number written confidently into a report.",
    },
    {
      question: "Do checkpoints make an AI agent more reliable?",
      answer:
        "They do not change the chance that one run finishes everything, which stays at p to the power n. They change what a failure costs. Cutting a 48-step job at 95% per step into eight saved six-step pieces cuts the steps executed from about 215 to about 58, and if the pieces are independent the job takes about 2.5 runs and is done within three runs 86.1% of the time instead of 23.5%.",
    },
    {
      question: "What is an AI agent's half-life in steps?",
      answer:
        "It is the number of steps at which the chance of finishing in one run falls to 50%, calculated as ln 2 divided by minus ln p, where p is the per-step success rate. That is about 13.5 steps at 95% per step, about 69 steps at 99%, and about 6.6 steps at 90%. If one uninterrupted piece of a job is much longer than the half-life, cut it shorter.",
    },
    {
      question: "How do I measure my AI agent's success rate?",
      answer:
        "Run the job on demand five to ten times while you watch, count the total steps and the steps that failed without the agent recovering, and divide. Ten runs with 400 steps and 16 unrecovered failures gives about 96% per step. If the same step fails every time, that is a systematic failure to fix, not a rate to plug into the calculator. Re-measure when a job starts needing extra runs.",
    },
    {
      question:
        "How does Construct handle a long agent task that fails partway?",
      answer:
        "Construct saves finished work to workspace files as it is produced, so a run that stops at step 30 keeps steps 1 to 29. An instruction scoped to the missing work, such as writing a report only for clients without one, makes the next run a retry of the gaps rather than a duplicate, and a Calendar schedule on Construct's servers turns those retries into a cadence with your laptop closed.",
    },
    {
      question: "How many steps can a Construct task take?",
      answer:
        "A step is one cycle in which the agent decides what to do next and usually calls a tool. What limits a long task in practice is reliability: at 95% per step, a 50-step task finishes in one go about 7.7% of the time, so long jobs work best split into shorter tasks that each save their work to a file.",
    },
  ],
  "construct-vs-claude-cowork": [
    {
      question: "What is the best Claude Cowork alternative for a small team?",
      answer:
        "Construct, for most founders and small teams. It starts at $9 a month instead of $20, keeps every finished file in a workspace the whole team opens without buying seats, gives the agent its own email address, and runs on the model you choose, including Claude through your own Anthropic key on Pro. Already paying for Claude? Keep Cowork for personal drafting and give Construct the recurring team work.",
    },
    {
      question: "Is Claude Cowork free?",
      answer:
        "No. Anthropic's help center says Cowork is available on paid Claude plans only: Pro, Max, Team, and Enterprise. The free Claude plan covers chat, files, memory, connectors, and artifacts, but not handing off or scheduling tasks. Claude Pro, the cheapest way in, is $20 billed monthly or $17 a month billed annually, while Construct Lite is $9 a month.",
    },
    {
      question: "How much does Claude Cowork cost compared with Construct?",
      answer:
        "Cowork comes with paid Claude plans: Pro is $20 a month, Max starts at $100, and Team Standard is $25 per seat billed monthly for teams of 2 to 150, with Claude Tag channel work billed by usage. All Claude activity draws from one usage pool. Construct Lite is $9 a month, and Starter at $59 covers up to 5 agents for a whole team workspace, as of October 11, 2026.",
    },
    {
      question: "Can Claude Cowork be used by a team?",
      answer:
        "Not on its own. Anthropic lists Cowork's work as seen by just you, and points team work to Claude Tag, a Slack agent in public beta on Team and Enterprise plans that draws on a usage balance an Owner funds. Construct gives the whole team one workspace with Owner, Admin, and Member roles, shared files, and no per-seat fee.",
    },
    {
      question: "Can Claude Cowork send emails?",
      answer:
        "Cowork sends through the accounts you connect, so its email comes from your own mailbox; an email address of its own is not documented in the sources we reviewed. Claude Tag asks your admin to create an email user for Claude. Every Construct agent has its own email address on every plan, so replies can come from the agent instead of your personal Gmail.",
    },
    {
      question: "Can I use Claude models in Construct?",
      answer:
        "Yes, on Pro. Construct Pro runs on your own keys for OpenRouter, OpenAI, Anthropic, Amazon Bedrock, or xAI, either as a fallback after bundled limits or for every run. You can keep using Claude through your own Anthropic key and switch providers later without moving your work. Your keys bill you directly when they are used, and Pro has a 7-day free trial.",
    },
    {
      question: "Can I move my Cowork tasks to Construct?",
      answer:
        "There is no import, so Cowork sessions, Claude memory, and Claude Tag channel notes do not transfer. Copy the instructions from your Cowork scheduled task into a Construct chat, move its files into the workspace, connect the apps, run it once, and put it on the Calendar. Construct's workflows do not pause for approval yet, so keep customer emails as drafts you send yourself.",
    },
    {
      question: "When does Claude Cowork still make sense?",
      answer:
        "Cowork fits if your work is mostly personal research and documents and you already pay for Claude, if a job needs your local files or desktop apps through the Claude Desktop app, or if you want Manual or Auto approval on each action or Claude for Small Business workflows. For recurring team work with shared files and no per-seat pricing, Construct is the better fit.",
    },
  ],
  "best-ai-employee-for-solo-founders": [
    {
      question: "What is the best AI employee for a solo founder?",
      answer:
        "Construct ranks first for a one-person company. For $9 a month on Lite it gives you an AI employee with its own cloud workspace, files, an agent email address, and 3 scheduled jobs that run with your laptop closed. Claude with Cowork ranks second at $20, Lindy third from $29.99 per user, and Marblism fourth at $44 if you need the phone answered.",
    },
    {
      question: "How much does an AI employee cost?",
      answer:
        "For a solo founder, about $9 to $60 a month on Construct: Lite at $9 covers two or three recurring jobs, and Starter at $59 covers 10 scheduled jobs. Single-purpose tools cost $20 to $45, such as Claude Pro at $20, Lindy from $29.99 per user, and Marblism at $44. Shift-based AI employees cost more, with CellCog's part-time tier at $160 a month.",
    },
    {
      question: "Are AI employees worth it for a solo founder?",
      answer:
        "Yes, when one recurring job leaves your week. At $9 a month, an AI employee only has to take over one weekly task, such as a pipeline update or competitor price check, to cost less than the time it frees. It is not worth it for work you would check line by line, so start with jobs whose output is quick to verify.",
    },
    {
      question: "Is there a free AI employee?",
      answer:
        "Not one that runs your recurring work for free. Manus has a free plan with daily credits and 2 scheduled tasks, CellCog gives 200 credits with no card, Lindy gives $50 of credits that last 7 days, and OpenClaw's software is free if you host and maintain it yourself. Construct gives new accounts free credits with no time limit, then starts at $9 a month on Lite, and Pro has a 7-day free trial.",
    },
    {
      question: "Why does Construct rank first?",
      answer:
        "We build Construct, so it leads this list, and here is why it fits a solo founder: it is the cheapest paid plan on the list, its Calendar schedules run server-side, every result is saved as a workspace file that next week's run can build on, and you can read and correct what it remembers. When you hire, teammates join the workspace with no per-seat fee.",
    },
    {
      question: "How much work can one founder supervise?",
      answer:
        "Review time is the real limit. A workable rule is about 30 minutes of review a day: ask Construct for drafts for anything a customer sees and send them yourself, run a job by hand three times before you schedule it, ask for outputs with a source link on every line, and start with three scheduled jobs, which is what Lite includes.",
    },
    {
      question:
        "Can I use Construct alongside Claude, Lindy, or another agent?",
      answer:
        "Yes. Keep your current tool and move the one recurring job it handles least reliably. Start on Lite for $9 or the 7-day Pro trial, copy your instructions into a Construct chat, move the source files into the workspace, connect the apps, run it once, and put it on the Calendar. There is no import, so Construct saves your rules as memory you can correct.",
    },
    {
      question: "When does another AI employee still make sense?",
      answer:
        "Marblism fits if missed phone calls cost you customers and you want a receptionist on a phone number. Manus's free plan fits occasional one-off research, and self-hosted OpenClaw fits technical founders who want to run every part themselves. For recurring weekly work that should run on a schedule and leave files behind, Construct is the better fit.",
    },
  ],
  "ai-inbox-triage": [
    {
      question: "Can AI triage my email?",
      answer:
        "Yes. A Construct agent sorts new Gmail into Reply needed, FYI, and Later each weekday morning and leaves a draft reply on each thread that needs one. It works on Lite at $9 a month with Gmail connected and one of Lite's 3 scheduled tasks, and the schedule runs in the cloud with your laptop closed. The agent never sends, archives, or deletes.",
    },
    {
      question: "What is email triage?",
      answer:
        "Email triage means sorting each new message by what it needs from you, so you answer the people waiting on you first and batch the rest. The usual method is three buckets: messages that need your reply, messages you only need to read, and messages that can wait. AI email triage hands that sorting, and the first draft of each reply, to an agent.",
    },
    {
      question: "Why should an AI agent draft replies instead of sending them?",
      answer:
        "A sent email is almost impossible to take back, since the longest Undo Send window Gmail offers is 30 seconds, while a wrong draft costs nothing. Keeping the agent to labels and drafts also limits the damage if it misreads an instruction on a large inbox, which is what happened in a widely reported OpenClaw inbox incident in February 2026.",
    },
    {
      question: "Can AI sort my emails better than Gmail filters?",
      answer:
        "They do different jobs. Gmail filters sort by exact sender, subject, or words, which is right for fixed rules such as sending every invoice from one address to a label. Filters cannot tell a client's question from a client's newsletter or write a reply. Give that judgment to an agent, and keep filters for the fixed rules.",
    },
    {
      question:
        "How do I keep the agent from sending, archiving, or deleting email?",
      answer:
        "Tell it never to send, archive, trash, or delete, store that in memory, and repeat it in every scheduled prompt. The Gmail connection has no read-only mode yet, so your drafts are the review step and nothing goes out until you send it yourself. Check Sent and Trash after early runs, and use Activity to see each action the agent took.",
    },
    {
      question: "How many emails should the agent triage per run?",
      answer:
        "Small batches work best, such as the last 24 hours. A run that labels and drafts dozens of emails is a long run, and long runs fail more often. If a run stops partway, the labels and drafts already written stay in place, so narrow the window to 12 hours or ask the agent to finish the emails it did not reach.",
    },
    {
      question: "How do I schedule inbox triage?",
      answer:
        "After two runs in a row need no corrections, ask the agent to run the same triage every weekday at a set time. It creates a Calendar event that runs in the cloud, with your laptop closed. An agent job can repeat at most every 15 minutes, and each extra time of day uses another scheduled task, so twice a day uses two of Lite's three.",
    },
    {
      question: "How do I teach the agent my triage rules?",
      answer:
        "Write the rules once, the way you would brief an assistant on day one, and ask Construct to remember them. You can read and correct them in the Memories app. When the agent files something wrong, tell it the correction, such as a sender that is always Reply needed, and it updates the rules it remembered. Most of the value comes from the first week.",
    },
  ],
  "hosted-openclaw-alternatives": [
    {
      question: "What is the best hosted OpenClaw alternative?",
      answer:
        "For founders and small teams who want the work done rather than an agent to operate, Construct. It costs $9 a month with model usage included within published plan limits, has no server or gateway to secure, runs Calendar schedules server-side with your laptop closed, and saves finished files in a workspace your team shares. It is a hosted AI employee, not an OpenClaw host, so OpenClaw skills do not run in it.",
    },
    {
      question: "Is there an official hosted version of OpenClaw?",
      answer:
        "No. The OpenClaw Foundation says OpenClaw has no subscription and no hosted tier, and OpenClaw Enterprise, announced September 29, 2026, is built to run on your own infrastructure and is free. Every hosted OpenClaw is run by a third party, such as Hostinger, MyClaw, or Cloudways. Kilo's KiloClaw, once a managed OpenClaw, has been shut down.",
    },
    {
      question: "Is OpenClaw free?",
      answer:
        "The software is free and MIT licensed, but running it is not. You pay for the machine it runs on and for the model it calls, through your own API keys or a host's AI credits, and a managed host adds its own fee. The model bill is the part people underestimate, because OpenClaw's heartbeat runs a full agent turn every 30 minutes by default.",
    },
    {
      question: "How much does hosted OpenClaw cost per month?",
      answer:
        "As of October 11, 2026, Hostinger's 1-Click OpenClaw starts at $5.99 a month paid upfront and renews at $11.99, with AI credits topped up separately, and MyClaw starts at $29 a month, or $199 a year, without AI token usage. Construct Lite is a fixed $9 a month with model usage within published plan limits, no per-message billing, and 3 scheduled tasks.",
    },
    {
      question: "What is the best managed OpenClaw hosting?",
      answer:
        "For the lowest price, Hostinger, at $5.99 a month paid upfront with a renewal at $11.99. For a private instance with daily backups and Hermes Agent support, MyClaw, from $29 a month. Cloudways also runs OpenClaw and Hermes, but we found no published prices. With every host you still configure the agent's security settings and pay for the model.",
    },
    {
      question: "Why do OpenClaw token bills get high?",
      answer:
        "OpenClaw's heartbeat runs a full agent turn every 30 minutes by default, or hourly with Anthropic OAuth or token auth, and its docs say shorter intervals burn more tokens. Isolating heartbeat sessions cuts a run from about 100,000 tokens to 2,000 to 5,000, according to the same docs. In Construct, recurring work runs only when you put a job on its Calendar.",
    },
    {
      question: "Can I use Construct alongside OpenClaw?",
      answer:
        "Yes. Move the recurring job that costs the most tokens or babysitting: start on Lite for $9 or the 7-day Pro trial, copy the instructions, move reference files into the workspace, connect the apps, run it once, and put it on the Calendar. There is no import, so OpenClaw skills, memory files, and channel pairings do not transfer.",
    },
    {
      question: "When does a hosted OpenClaw still make sense?",
      answer:
        "When you need the agent on WhatsApp, Signal, iMessage, or Microsoft Teams, want to run a local model or modify the agent's source, or need a process that runs continuously. Each Construct terminal command can run for up to 5 minutes, so split longer jobs into steps. For recurring business work with shared files, Construct is the better fit.",
    },
  ],
  "ai-agent-scheduled-tasks": [
    {
      question: "Can an AI agent run scheduled tasks with my laptop closed?",
      answer:
        "Yes, if the scheduler and everything the job needs live in the cloud. Construct's Calendar runs schedules on its servers, and the agent's files, connected apps, browser, and terminal are part of its cloud workspace, so a run never reaches back to your machine. Lite at $9 a month includes 3 scheduled tasks, Starter at $59 includes 10, and Pro at $299 includes 50.",
    },
    {
      question: "How often can a scheduled AI agent job run in Construct?",
      answer:
        "A schedule that runs an agent, or a workflow with an agent step, can repeat at most every 15 minutes. Schedules that only send a notification or run an app tool can repeat every minute. For something that must react the moment it happens, forward it to the agent's own email address, since mail from your own account address starts a run without waiting for a schedule.",
    },
    {
      question: "Do Claude's scheduled tasks run when my computer is off?",
      answer:
        "Claude's Cowork scheduled tasks run remotely, so they keep their cadence while your computer is asleep, but a task that needs local files or apps only runs locally. Claude Code routines run on Anthropic's cloud with a one-hour minimum interval and are in research preview. In Construct, the files and apps a job needs already live in the hosted workspace, so nothing depends on your laptop.",
    },
    {
      question: "Why do OpenClaw cron jobs stop running?",
      answer:
        "OpenClaw runs automations inside its gateway process, and its docs say the gateway must be running for schedules to fire. If the gateway is on a laptop, expect pauses when the machine sleeps or updates; OpenClaw's own FAQ points to a VPS for 24/7 reliability. Construct runs schedules on its own servers, so there is no machine of yours to keep awake.",
    },
    {
      question: "Is an AI agent schedule the same as a cron job?",
      answer:
        "Not quite. A cron job runs the same fixed command every time, while a scheduled agent job runs a prompt and the agent decides the steps on each run. That lets it cope with a changed page or an extra email, but the prompt has to carry the rules a script would hard-code: what to read, where to save, and what never to do.",
    },
    {
      question:
        "What happens if a scheduled run is late or the last one is still running?",
      answer:
        "In the event's Delivery behavior settings you choose Skip overlap or Queue next for a run still in progress, and Run once, Skip, or Catch up safely for a late one. Catch up safely replays missed runs oldest first, in small batches. For a daily list, skipping overlaps and running a late occurrence once is a sensible default.",
    },
    {
      question: "Can a scheduled agent run fire twice?",
      answer:
        "Occasionally. Construct delivers scheduled runs at least once, not exactly once, so write jobs that check before they act. For a daily report, add a line telling the agent to stop if today's file already exists. That one sentence makes a duplicate delivery harmless.",
    },
  ],
  "construct-vs-genspark-claw": [
    {
      question: "What is Genspark Claw?",
      answer:
        "Genspark Claw is a personal AI assistant that Genspark calls your first AI employee. It runs on a dedicated cloud computer with a remote desktop, terminal, and files, or on your own Mac or Windows PC through a desktop app, and answers in WhatsApp, Slack, Teams, Telegram, and other chat apps. It launched on March 12, 2026, and every message and scheduled run spends Genspark credits.",
    },
    {
      question: "How much does Genspark Claw cost?",
      answer:
        "Genspark's pricing data, checked October 11, 2026, lists the Claw cloud computer at $9.99 a month for Lite, $19.99 for Standard, and $39.99 for Powerful, shown against higher original prices. That pays for the machine only. Its work spends Genspark credits, and more credits mean a membership such as Plus at $24.99 a month. Construct Lite is a fixed $9 with model usage included.",
    },
    {
      question: "Is Construct a good Genspark Claw alternative?",
      answer:
        "Yes, for most founders and small teams. Construct Lite is a fixed $9 a month with model usage included, while Claw Lite is $9.99 for the machine alone plus credits for every message, scheduled run, and Heartbeat. Construct also keeps files, memory, and schedules in a workspace the whole team can open, while Genspark says each Claw belongs to one person.",
    },
    {
      question: "Is Genspark Claw built on OpenClaw?",
      answer:
        "Sliq's explainer reports that Claw takes the OpenClaw agent framework and wraps it in a managed cloud service. Genspark's Claw help page does not mention OpenClaw, though its GenTeam help article lists a Genspark Claw computer and your own OpenClaw side by side as agent types. Either way, Claw is sold as Genspark's own managed product with its own credit billing.",
    },
    {
      question: "Can a team share one Genspark Claw?",
      answer:
        "No. Genspark's help center says Claw is never shared and that Team plans buy Claw seats, each with its own isolated cloud computer. Construct's team workspaces put people, the agent, files, and apps in one place with Owner, Admin, and Member roles, no member limit, and usage drawn from the owner's plan.",
    },
    {
      question:
        "Does the Genspark Claw desktop app work when my computer is off?",
      answer:
        "No. The macOS and Windows desktop app needs no Claw subscription, only credits, but Genspark says Claw only runs while your computer is on and the app is open. For schedules that run with every device off, you need Claw's cloud computer or a hosted workspace such as Construct, whose Calendar runs jobs on its own servers.",
    },
    {
      question: "Can I move my Genspark Claw setup to Construct?",
      answer:
        "There is no import, and Genspark has no built-in way to export Claw chat history. Ask Claw to save a summary of your instructions as a document, download its files before cancelling, since cancelled cloud computers are permanently erased, then add them to Construct, connect your apps, run each job once, and put it on the Calendar.",
    },
  ],
  "construct-vs-openclaw": [
    {
      question: "Is Construct a good OpenClaw alternative?",
      answer:
        "Yes, for most founders and small teams. Construct is a hosted AI employee for a fixed $9 a month with no per-message billing and nothing to install, while OpenClaw is free software you run yourself on a machine that stays on, paying for every model token. Construct also runs schedules with your laptop closed and keeps files in a workspace your team shares.",
    },
    {
      question: "Is OpenClaw free?",
      answer:
        "The software is free and MIT licensed, and the OpenClaw Foundation says there is no subscription and no hosted tier. Running it is not free: you need a machine that is always on, such as a VPS, and access to a model through a paid API key, a subscription sign-in such as ChatGPT, or a local model on capable hardware.",
    },
    {
      question: "How much does OpenClaw cost to run?",
      answer:
        "It depends on the machine and the model. Managed hosts start at $5.99 a month on Hostinger, paid upfront and renewing at $11.99, or $29 a month on MyClaw Lite without model tokens. On defaults, the heartbeat runs a full agent turn every 30 minutes, which on a paid API key can cost more than Construct's fixed $9 Lite plan.",
    },
    {
      question: "Is OpenClaw safe to use for a business?",
      answer:
        "It can be hardened, but that is your job. OpenClaw's docs say sandboxing and exec approvals are off by default and that hardening is deliberate configuration, with a recommended setup of a sandbox backend, Tailscale or an identity-aware proxy, secret references, message auditing, and scheduled security audits. Construct is hosted, so there is no gateway for you to expose and shell commands run sandboxed as a non-root user.",
    },
    {
      question: "Do I need a Mac mini to run OpenClaw 24/7?",
      answer:
        "No, but you need a machine that never sleeps. OpenClaw's FAQ says to expect pauses when the machine sleeps or updates and recommends a VPS for 24/7 reliability, with at least 1 vCPU and 1 GB of RAM and 2 GB recommended. Construct's Calendar runs scheduled jobs on Construct's servers, so no machine of yours has to stay on.",
    },
    {
      question: "Why does OpenClaw use so many tokens?",
      answer:
        "Its heartbeat wakes the agent every 30 minutes by default, or hourly with Anthropic sign-in, and the docs say heartbeats run full agent turns, so shorter intervals burn more tokens. Isolated heartbeat sessions cut each run from about 100,000 tokens to 2,000 to 5,000, according to OpenClaw's documentation.",
    },
    {
      question: "Can a small team share one OpenClaw?",
      answer:
        "Only if everyone trusts each other. OpenClaw's docs treat a gateway as one trust domain and say mutually adversarial users need separate gateways. OpenClaw Enterprise, announced September 29, 2026, adds multi-tenancy and governance, but it is self-hosted on Docker Compose or Kubernetes and in preview. Construct's team workspaces offer Owner, Admin, and Member roles today with nothing to deploy.",
    },
    {
      question: "Can I use Construct alongside OpenClaw?",
      answer:
        "Yes. Keep OpenClaw for the channels and experiments you built it for and give Construct the recurring work your team depends on. Copy your instructions and skill text into a Construct chat, move the files, connect the apps, run the job once, and put it on the Calendar. Webhook or Gmail triggers become a scheduled check or a forwarded email.",
    },
  ],
  "ai-agent-activity-log": [
    {
      question:
        "What is the difference between an activity log and an audit log?",
      answer:
        "An activity log is a short, readable record for the person who delegated the work: what the agent did, whether it worked, and roughly why. An audit log is a complete chronological record that lets a reviewer reconstruct events from start to finish, usually kept for years and protected against changes. A small team needs the first every day and the second only where policy demands it.",
    },
    {
      question: "How do I see what my AI agent did in Construct?",
      answer:
        "Open the Activity app. It shows one row for each action an agent takes, with its kind, a headline naming the target, a reason of up to 160 characters when the agent gives one, a status, the agent, and a link back to the chat it came from. You can search it, filter it by kind, status, and date, and export it as CSV or JSON on every plan.",
    },
    {
      question: "Is Construct's Activity a complete audit log?",
      answer:
        "No. Activity is an operating record: it does not store tool inputs or outputs, rows are written on a best-effort basis, and it keeps the last 30 days or about 10 MB of rows per person. The detail behind each row lives in the linked chat, Terminal, Browser steps, workflow and Calendar history, sent email, and Files.",
    },
    {
      question: "How long does Construct keep Activity history?",
      answer:
        "Activity keeps a rolling 30 days per person and deletes the oldest rows first once a feed passes about 10 MB. Chats stay until you delete them, workflow and calendar history stay with their item, and files stay until you delete them or close your account, so the evidence behind an old row often outlasts the row itself.",
    },
    {
      question: "What should an AI agent audit trail record?",
      answer:
        "For a small team, five records answer almost every question after the fact: one line per action with a reason, the conversation the agent was following, the artifacts it produced or sent, the history of each scheduled job, and the beliefs it acted on with where they came from. Construct keeps all five across Activity, chats, Files, Calendar, and Memories.",
    },
    {
      question: "How do I audit an AI agent product before buying it?",
      answer:
        "Test it on a trial account. Check that you can find yesterday's actions in under a minute, that each action says why, that you can jump from an action to its conversation, how many days inputs and outputs are kept, whether you can export the record, who can see it, whether it is pruned, and whether it survives a failed run.",
    },
    {
      question:
        "How can a small team keep longer records of agent work in Construct?",
      answer:
        "Export the Activity CSV each week and store it yourself, have the agent append a line to a run log file in Files at the end of important jobs, and rely on the change history in connected systems such as your CRM or sent mail for actions that matter. For a tamper-evident record, keep those actions in a system of record that provides one.",
    },
  ],
  "viktor-alternatives": [
    {
      question: "What is the best Viktor AI alternative?",
      answer:
        "For founders and small teams, Construct. It starts at $9 a month instead of Viktor's $50, saves every finished report and spreadsheet as a file in a shared workspace, runs recurring jobs from a Calendar with nobody online, keeps memory you can read and correct, and answers in Slack, Telegram, Discord, its own email inbox, and the web. Runbear, Lindy, Claude Tag, ChatGPT Dots, Manus, and Perplexity Computer suit narrower cases.",
    },
    {
      question: "How much does Viktor AI cost?",
      answer:
        "Viktor's Team plans start at $50 a month for 20,000 credits, then $75 for 30,000, $100 for 40,000, and $200 for 80,000, with larger tiers and custom Enterprise pricing above that. Billing is per workspace, so the whole team shares the credits. Unused monthly plan credits roll over for one month. Viktor estimates that 20,000 credits cover roughly 40 to 200 tasks, as checked on October 11, 2026.",
    },
    {
      question: "Is Viktor AI free?",
      answer:
        "Not beyond a trial. New Viktor workspaces get $100 in credits with no card required, and those trial credits do not expire. After that, paid Team plans start at $50 a month for 20,000 credits. Construct has no free plan, but new accounts get free credits with no time limit, Lite costs $9 a month for 2 agents (Construct and one more), 3 scheduled tasks, and an agent email address, and Pro has a 7-day free trial.",
    },
    {
      question: "Can Construct work in Slack channels like Viktor?",
      answer:
        "Yes. You can @mention Construct in a channel, reply in the thread it starts, or send it a direct message. By default only the installer and people on the Full access list get its full tools; if you open it to everyone, other members get a read-only tier with no memory, files, email, or connected apps. Construct does not read channel history, and scheduled runs report in the web app rather than posting into Slack.",
    },
    {
      question: "Is Slackbot a Viktor alternative?",
      answer:
        "Partly. Slackbot is Slack's own AI agent, included with Business+ under a weekly message limit and unlimited on Enterprise+, while Free and Pro workspaces get only a limited trial. It can act in connected tools through MCP and build repeatable workflows. Tagging it into a channel for shared work was still in early pilot in September 2026, so today it works more as a personal assistant than a shared coworker.",
    },
    {
      question:
        "How do Viktor alternatives compare on price for a six-person team?",
      answer:
        "From list prices at monthly billing, Construct costs $9 to $59 for the whole team, Viktor $50 or more for shared credits, Runbear $99 for 20,000 credits, and Lindy about $180 for six people at $29.99 per active user. Claude Tag adds channel usage from a balance you fund on top of $25 Team seats. Allowances differ, so a lower total does not mean equal work.",
    },
    {
      question: "Can I use Construct alongside Viktor?",
      answer:
        "Yes. Keep Viktor in the channels where it works and give Construct the recurring job whose output your team keeps hunting for. Start on Lite for $9 or the 7-day Pro trial, add Construct to Slack from Settings then Messaging, @mention it with your instructions, connect the apps, run it once, and put it on the Calendar. There is no import from Viktor.",
    },
    {
      question: "When does Viktor still make sense?",
      answer:
        "Viktor can still fit if your company works in Microsoft Teams, if you want the agent to read the channels it belongs to for context without being handed the source, or if you need a confirmation step before high-stakes actions built into every job. For recurring team work that should land in files, run on a schedule, and reach people beyond Slack, Construct is the better fit.",
    },
  ],
  "construct-vs-viktor": [
    {
      question: "What is the best Viktor AI alternative?",
      answer:
        "For founders and small teams, Construct. It starts at $9 a month instead of Viktor's $50, saves finished work as files in a workspace your team can reopen, takes requests from Slack, email, Telegram, Discord, and the web, gives teammates Owner, Admin, and Member roles without seat fees, lets you read and correct what it remembers, and accepts your own model keys on Pro.",
    },
    {
      question: "How much does Viktor AI cost?",
      answer:
        "Viktor's Team plan starts at $50 a month for 20,000 credits shared by the workspace, then $75 for 30,000, $100 for 40,000, and $200 for 80,000, with larger tiers up to $50,000 a month. There is no per-seat charge. Viktor's own examples put complex workflows at 500 to 1,500 credits, and unused plan credits roll over for one month. Enterprise pricing is custom.",
    },
    {
      question: "Is Viktor AI free?",
      answer:
        "Not permanently. Viktor fronts new workspaces $100 in credits with no card and no sales call, and those trial credits never expire, according to its pricing page checked on October 11, 2026. After that, the Team plan starts at $50 a month. Construct has no free plan either, though new accounts get free credits with no time limit. After that, Lite is $9 a month, and Pro has a 7-day free trial.",
    },
    {
      question: "Is Construct cheaper than Viktor?",
      answer:
        "Yes, at the entry level. Construct Lite is $9 a month with 2 agents (Construct and one more), 3 scheduled tasks, and an agent email address, which is $41 a month less than Viktor's first Team plan at $50 for 20,000 shared credits. Construct plans are a fixed monthly price with published limits rather than a credit pool.",
    },
    {
      question: "Can Construct work in Slack like Viktor?",
      answer:
        "Yes, for assigning work. You can @mention Construct in a channel, reply in the thread that mention started, or DM it, and each install has an access policy with an allow list and an optional read-only tier for everyone else. Construct does not read channel history, so put the messages a job needs in a file or paste them in.",
    },
    {
      question: "What does Viktor AI do?",
      answer:
        "Viktor is an AI employee that lives in Slack and Microsoft Teams. It responds when @mentioned in channels and to every one-to-one DM, runs code on its own cloud computer, connects to more than 3,200 tools, schedules recurring tasks, and starts sensitive actions such as sending an email as drafts you approve in the thread. Accel led its $75 million Series A in May 2026.",
    },
    {
      question: "Can I use Construct alongside Viktor?",
      answer:
        "Yes. Keep Viktor for quick asks inside Slack and give Construct the recurring jobs whose files and schedules you need to keep. Start on Lite for $9 or the 7-day Pro trial, copy the job's instructions, connect the apps, install Construct in Slack, run the job once, and put it on the Calendar. There is no import from Viktor.",
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
        "Construct Lite is $9 a month with 2 agents (Construct and one more) and 3 scheduled tasks. Starter is $59 a month with up to 5 agents and 10 scheduled tasks, which suits an agency running separate report jobs for several groups of clients. A team workspace has no member limit, and usage draws on the owner's plan.",
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
        "There is no fixed client count, but long runs fail more often, so if you have more than a handful of clients, split them into two scheduled report jobs. Finished reports are saved as they are produced, so a run that stops partway keeps the ones it finished.",
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
  "where-ai-agents-fail": [
    {
      question: "What counts as a failed AI agent run in this study?",
      answer:
        "A run counts as failed if it hit a plan limit in place at the time, stopped on an error it could not recover from, or ended without a final answer. A run that stopped to ask a person a question is reported separately as handed back, and runs a person interrupted are excluded from failure rates.",
    },
    {
      question: "What is a step in an AI agent run?",
      answer:
        "A step is one cycle in which the model decides what to do next and usually calls one or more tools, such as the browser, the terminal, a file, a connected app, or email.",
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
        "When we checked on October 1, 2026, Sintra X listed at $97 a month and was on sale at $48.50 for a one-month term, or $15.60 a month on a 12-month sale term, each with 250 credits a month. Construct Lite is $9 a month for 2 agents (Construct and one more), 3 scheduled tasks, and an agent email address, Starter is $59, and Pro is $299 with a 7-day trial.",
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
        "When we checked on October 1, 2026, Sintra X listed at $97 a month with sale prices from $48.50, and Marblism was $44 a month or $24 billed yearly for 50 hours of work. On October 11, Lindy Team was from $29.99 per active user a month for 3,000 credits. Construct Lite is $9 a month, or $7.50 a month billed annually.",
    },
    {
      question: "Which is cheapest for a team of three?",
      answer:
        "Sintra and Marblism cost the same for three people as for one, because team members are included. Construct Starter is $59 a month for one team workspace with no per-seat fee or member limit. Lindy charges per active user, so three people on Team cost $89.97 a month at $29.99 each, with 9,000 pooled credits.",
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
        "Any plan works. The scheduled job uses one of the 3 scheduled tasks included with Lite at $9 a month. If a busy week makes the run long, narrow the scope or split it into smaller runs that each save a file.",
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
        "Construct Lite is $9 a month with up to 2 agents (Construct and one more), 3 scheduled tasks, and an agent email address, which covers the Friday updates and a weekday follow-up list on a schedule, with research and proposals on demand. Starter at $59 raises that to 10 scheduled tasks, and Pro has a 7-day free trial.",
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
  "construct-vs-claude-duet": [
    {
      question: "What is the best Claude Duet alternative for a small team?",
      answer:
        "Construct, for most founders and small teams. It is open today with no waitlist and no country limit, starts at $9 a month, gives your team up to 2, 5 or 15 agents with their own roles in one shared workspace, and runs on the model you choose, including Claude through your own Anthropic key on Pro.",
    },
    {
      question: "Is Claude Duet out yet?",
      answer:
        "Claude Duet was released on October 21, 2026 as a research preview. Only US Claude Pro and Max subscribers can join the waitlist, and Anthropic has not said when it opens to everyone. Construct has no waitlist.",
    },
    {
      question: "Can I use Claude Duet in India or outside the US?",
      answer:
        "Not yet. The research preview is open to US Claude Pro and Max subscribers only, by waitlist, and Anthropic has not published dates for other countries. Construct is available outside the US today.",
    },
    {
      question: "Is Claude Duet free?",
      answer:
        "No. Duet comes with Claude Pro at $20 a month or Max from $100 during the preview, and its background checks draw on the same usage limits as the rest of Claude. Construct Lite is $9 a month on its own.",
    },
    {
      question: "Can Claude Duet be used by a team?",
      answer:
        "Not today. Anthropic lists Team and Enterprise plans as not included yet, and each Duet belongs to one subscriber. Construct gives the whole team one workspace with Owner, Admin and Member roles, shared files and schedules, and no per-seat fee.",
    },
    {
      question: "When does Claude Duet still make sense?",
      answer:
        "When you work alone in the US and already pay for Claude Max, when you want an agent that asks before every send, payment or signature, or when you want it to buy things through Stripe Link or Shop Pay. For shared team work with several agents, a browser you can watch, and access from any country, Construct is the better fit.",
    },
  ],
  "ai-agents-for-content-creation": [
    {
      question: "What are the best AI agents for content creation?",
      answer:
        "A small team of narrow agents works better than one agent doing everything: a lead that sends a daily brief, a researcher that finds outlier posts in your niche, a writer that drafts in your voice, a fact checker, and an analyst that reports your numbers. Construct runs that five-agent team on Starter at $59 a month, in one shared workspace with schedules.",
    },
    {
      question: "Should AI agents publish content for you?",
      answer:
        "No. Keep the agents at the draft stage: they research, write and check, and you edit and post. Construct's workflows do not pause for approval yet, so ask for drafts and publish them yourself.",
    },
    {
      question: "How many AI agents do I need for content creation?",
      answer:
        "Start with five: a lead, a researcher, a writer, a fact checker and an analyst. Construct Starter includes up to 5 agents and 10 scheduled tasks. Pro allows up to 15 agents and 50 scheduled tasks if you add a competitor watcher, a bookmarks agent, a reply scout, an ideas sparring agent, a visuals agent and an ideas tracker.",
    },
    {
      question: "How do I keep AI-written content in my voice?",
      answer:
        "Have the lead agent build a voice file from your last 50 posts, point the writer at it, and correct the file every time a draft does not sound like you, saying why. Construct also keeps what you tell an agent in memory you can open, fix or delete.",
    },
  ],
  "claude-api-key-ai-agent": [
    {
      question: "How do I get a Claude API key?",
      answer:
        "Create a Claude Console account, generate an API key in the Console, store it in a password manager, and add credits or a payment method in billing, because API usage is billed as you go.",
    },
    {
      question: "Is a Claude API key free?",
      answer:
        "Creating a key is free, but every request is billed by the tokens it reads and writes. Claude Max plans include $100 to $200 a month in API credits and Team plans up to $500 a month in pooled credits, according to Anthropic's pricing page.",
    },
    {
      question:
        "Can I use my Claude Pro or Max subscription in another app instead of an API key?",
      answer:
        "No. Anthropic says using OAuth tokens from Claude Free, Pro or Max accounts in any other product, tool or service is not permitted under its Consumer Terms. An API key is the supported way to use Claude outside Anthropic's own apps, and it is what Construct asks for.",
    },
    {
      question: "How do I use my Claude API key in Construct?",
      answer:
        "Bring-your-own-key is on Construct Pro, which has a 7-day free trial. Add your Anthropic key, choose whether it is used for every run or as a fallback once bundled usage runs out, pick a Claude model such as Opus 5.5 or Sonnet 5.5, and give an agent its first job. The key bills you directly at Anthropic's prices.",
    },
  ],
  "ai-agent-team-structure": [
    {
      question: "What is an AI agent team?",
      answer:
        "A set of agents that each own one job, hand work to each other, and leave the results somewhere people can check. One agent leads and the others report to it, and people stay in charge of anything that leaves the building.",
    },
    {
      question:
        "What is the best AI agent team structure for a small business?",
      answer:
        "A lead agent with two or three specialists under it, each limited to the apps its job needs. Construct Starter fits that structure with up to 5 agents and 10 scheduled tasks for $59 a month, in one shared team workspace.",
    },
    {
      question: "How do AI agents hand off work to each other?",
      answer:
        "Through files. Have each agent save its output to a shared folder with a date in the name, and point the next agent at it. In Construct every agent's output lands in the team workspace, so the next agent and your team can both open it.",
    },
    {
      question: "How many agents can I run in Construct?",
      answer:
        "Up to 2 on Lite at $9 a month, 5 on Starter at $59, and 15 on Pro at $299, each including the built-in Construct agent.",
    },
  ],
  "ai-agent-browser-and-terminal": [
    {
      question: "Can Construct's browser log in to my accounts?",
      answer:
        "Not by itself. Construct sends the browser only a goal and a start URL, with no saved profile, cookies or passwords, so each run starts signed out. For tools you are signed into, connect the app from the App Store and the agent uses a structured action instead.",
    },
    {
      question: "How long can a Construct terminal command run?",
      answer:
        "Two minutes by default and up to five minutes, on every plan as of October 26, 2026. A longer job has to be split into smaller commands that save a file after each step.",
    },
    {
      question: "Can I run two browser tasks at once in Construct?",
      answer:
        "Not with one agent. Each agent has one live browser run at a time, and a second request is refused until the first is stopped. Give the second site to another agent.",
    },
    {
      question: "Do packages the agent installs stay installed?",
      answer:
        "Only until the container sleeps, 10 minutes after the last command. Files in /private and /workspace persist; anything else on the container disk, including /tmp and pip installs, does not.",
    },
  ],
  "ai-agent-custom-mcp": [
    {
      question:
        "Does Construct support MCP servers that need the initialize handshake?",
      answer:
        "Not as of October 26, 2026. Construct sends tools/list and tools/call as plain JSON-RPC POSTs with no initialize, session ID or protocol version header, and reads a single JSON reply. Servers that require a handshake, enforce the 2026-07-28 header rules or stream SSE replies will refuse or fail.",
    },
    {
      question: "Can I give Construct an API key for my MCP server?",
      answer:
        "Not yet. There is no field for your own key or custom headers. Construct sends a 120-second token signed with its own secret, which your server cannot verify locally, so use a long random MCP path as the shared secret and keep the tools narrow.",
    },
    {
      question:
        "Why doesn't a new tool on my MCP server show up for the agent?",
      answer:
        "Construct caches the first 80 tools when you add the server, and agents search that cache. A tool added to the server later appears after you remove the server and add it again.",
    },
    {
      question: "Can every member of a team workspace add an MCP server?",
      answer:
        "No. Installing apps is an owner and admin permission by default, and an owner can grant it to members.",
    },
  ],
  "ai-agent-files-and-artifacts": [
    {
      question: "Does Construct have a trash or file version history?",
      answer:
        "Not as of October 26, 2026. Deleting a file in Files is permanent and an overwrite replaces the old contents. Workspace apps are the exception: their last 10 successful builds are kept and can be restored.",
    },
    {
      question: "Can teammates see what my agent made?",
      answer:
        "Files in My files are yours and your agents'. Move a file to Team, or share it with specific people, and they can open it; files shared with them appear read-only under Shared.",
    },
    {
      question: "How long does Construct keep the record of what an agent did?",
      answer:
        "Activity keeps rows for 30 days, or until a person's rows pass 10 MB, and can export them as CSV or JSON. The files themselves stay until someone deletes them.",
    },
    {
      question: "What happens when workspace storage is full?",
      answer:
        "New writes are refused with a message saying storage is full, and nothing is deleted to make room. Storage counts against the workspace owner's plan: 100 MB on Lite, 1 GB on Starter, 3 GB on Pro.",
    },
  ],
  "ai-agent-prompt-injection": [
    {
      question: "Can an AI agent be hacked through an email?",
      answer:
        "Yes, if it reads the email and can act. In October 2026 Salt Labs showed a single email with an encoded payload taking over a Manus session that held the user's Gmail token. The protection is limiting what the reading agent can reach and keeping a person in front of sends.",
    },
    {
      question: "Does Construct filter prompt injection?",
      answer:
        "No. Construct does not scan content for injected instructions. It labels third-party results as external data, refuses to let strangers' email start tasks, gives unlisted chat users a read-only agent, and lets you keep sends as drafts you approve.",
    },
    {
      question: "Can I tell my agent to ignore instructions in emails?",
      answer:
        "You can, and it helps, but it is not a control to rely on alone because a well-written injection can still persuade the model. Pair the instruction with an agent that has no connected apps and with drafts that a person sends.",
    },
  ],
  "ai-agent-slack-briefing": [
    {
      question: "Is Slack AI recap available on the Pro plan?",
      answer:
        "No. As of October 26, 2026, Slack lists daily recaps on Business+ and Enterprise+ only. Pro includes on-click AI conversation summaries but not the morning recap.",
    },
    {
      question:
        "Can an AI agent post a scheduled message to a Slack channel without a Slack bot token?",
      answer:
        "Yes, on a paid Slack plan. Every channel can have an email address, and anything emailed to it is posted in the channel. Construct's scheduled briefing uses this route, since a scheduled run has no Slack conversation to reply in.",
    },
    {
      question: "Can I get a daily Slack briefing on Slack's free plan?",
      answer:
        "Channel email addresses need a paid Slack plan, but the Slackbot forwarding address works on every plan and delivers to your own DM with Slackbot. You can also mention Construct in Slack and ask for the briefing on demand.",
    },
  ],
  "ai-company-research-spreadsheet": [
    {
      question: "Why does AI research get SaaS prices wrong?",
      answer:
        "Pricing pages usually lead with the annual-billing price and keep the monthly price behind a toggle. A plain page fetch reads the default. In our check of Linear, Calendly and Airtable on October 26, 2026, all three led with the annual figure.",
    },
    {
      question: "How much does Clay cost?",
      answer:
        "As of October 26, 2026, Clay's Launch plan is $185 a month billed monthly or $167 a month billed annually, made of 15,000 actions plus 2,500 data credits. The free plan includes 500 actions and 100 data credits a month.",
    },
    {
      question: "How many companies can an AI agent research in one run?",
      answer:
        "There is no fixed company count, but long runs fail more often, so research in batches of about ten companies and save a file after each batch. That works on any plan.",
    },
  ],
  "ai-delegation-checklist": [
    {
      question: "Should an AI employee send emails on its own?",
      answer:
        "Not at first. Keep anything that leaves the company as a draft until the job has several clean runs behind it, and keep it a draft for good if one bad message would be costly. In Construct, workflows have no step that pauses for a person's approval, so the draft-only rule in your brief is what keeps a person in the loop. Email from the agent's own address also has a daily sending limit, lower on Lite than on Starter and Pro.",
    },
    {
      question: "How long does it take to onboard an AI employee?",
      answer:
        "Plan on about 30 days: read-only work you can check in week one, one scheduled job in week two, writes to systems you own in week three, and outward drafts in week four. Expand when a job has run four or more times with only small corrections.",
    },
    {
      question: "What should you never delegate to an AI employee?",
      answer:
        "Decisions about people, pricing, money and relationships, anything you cannot undo, and any job where you could not say in advance what a good result looks like. Those stay with a person, with the agent preparing drafts or research at most.",
    },
  ],
  "ai-employee-team-workspace": [
    {
      question: "Do teammates need their own Construct subscription?",
      answer:
        "No. Everything done in a team workspace runs on the owner's plan, including usage, agent and schedule limits. Creating a team workspace needs a paid plan or a new account's unused free allowance, and receiving ownership of one needs a paid plan.",
    },
    {
      question: "Can a workspace admin read my private chats with an agent?",
      answer:
        "No. One-to-one chats belong to the person who had them, and each person's private files are in an area nobody else can browse. An admin can see that a members-only group exists, but joining it to read posts a notice in the group.",
    },
    {
      question: "Does Construct support SSO or SCIM for teams?",
      answer:
        "Not as of October 2026. People sign in with Google, an emailed link or a password, and there is no SAML single sign-on or SCIM provisioning.",
    },
  ],
  "ai-lead-sourcing-hubspot": [
    {
      question: "Does HubSpot deduplicate companies added through the API?",
      answer:
        "No. HubSpot's knowledge base says companies created through the API, including third-party sync apps, are not deduplicated by the company domain. Contacts are matched on email. An agent has to search by domain before it creates a company.",
    },
    {
      question: "How much does HubSpot's Prospecting Agent cost?",
      answer:
        "HubSpot charges $1 for each lead the agent recommends for outreach, paid as 100 HubSpot Credits per lead, as of October 26, 2026. Its product page lists Starter, Professional and Enterprise; its April 2026 announcement lists Pro and Enterprise.",
    },
    {
      question: "Can I stop an AI agent from deleting HubSpot records?",
      answer:
        "In Construct, app access is per agent and covers every action the HubSpot connection offers. Give the lead job its own agent, turn HubSpot off for the others, and once saved as a workflow, limit the agent step to the search, create, associate and note actions.",
    },
  ],
  "how-much-does-an-ai-agent-cost": [
    {
      question: "Do AI agent credits roll over to the next month?",
      answer:
        "Mostly not. Lindy's and Manus's monthly credits expire at the end of each cycle, and Manus clears them on the renewal date even if you upgraded mid-cycle. Viktor's roll over for one month, and CellCog's stay valid for 60 days after the billing period. Construct has no credits: its monthly usage allowance resets on the first of the month (UTC), and unused usage does not carry over either.",
    },
    {
      question: "Can I use my own API key to make an AI agent cheaper?",
      answer:
        "Sometimes. Construct Pro has a Model source setting that can switch to your own OpenRouter, OpenAI, Anthropic, Amazon Bedrock or xAI key once included usage runs out, or use only your key, with a monthly spend limit you set. Manus Flex accepts keys through OpenRouter, Fireworks or Modal, but other infrastructure still uses Manus credits. A self-hosted agent such as OpenClaw always runs on your own key or an existing ChatGPT or Claude subscription.",
    },
    {
      question:
        "What happens when an AI agent runs out of credits or usage mid-month?",
      answer:
        'It depends on the product. Manus will not start a new task at or below zero credits. Perplexity skips a scheduled task when credits run out and pauses it after repeated skips. Construct shows "Session usage limit reached" or "Monthly usage limit reached" with the reset time; a scheduled run that lands in a spent window fails and is recorded, and the schedule stays on for the next run.',
    },
  ],
  "is-construct-computer-safe": [
    {
      question: "Does Construct Computer sell my data?",
      answer:
        "No. The privacy policy says Construct does not sell personal information. Your content is shared only with the sub-processors that run the service, such as Cloudflare for hosting and the model provider serving a request, and with apps you connect yourself.",
    },
    {
      question: "Where does Construct Computer store my data?",
      answer:
        "Workspace data lives on Cloudflare (R2 for files, Durable Objects and D1 for chats and records), which processes it wherever it has capacity. Construct offers no choice of data region today. Analytics run on PostHog's EU cloud and billing on Dodo Payments in India.",
    },
    {
      question: "Can I use Construct Computer without connecting my Gmail?",
      answer:
        "Yes. Every paid plan gives the agent its own address at construct-agent.xyz, and only mail from your own verified address can start a task there. Connecting Gmail is optional and gives the agent whatever that connection's Google scopes allow.",
    },
  ],
  "manus-alternatives": [
    {
      question: "Is Manus still owned by Meta?",
      answer:
        "No. Manus says Meta acquired it on December 29, 2025. As part of the separation it deleted some users' data from August 23, 2026, and a Manus post dated September 1, 2026 says it has formally resumed independent operations.",
    },
    {
      question: "Can you use your own API key with Manus?",
      answer:
        "Yes. Manus Flex, launched September 29, 2026, lets you power Manus with your own key through OpenRouter, Fireworks or Modal. Other services and infrastructure used in a task still consume Manus credits.",
    },
    {
      question: "Do Manus credits roll over?",
      answer:
        "Monthly plan credits do not. They are cleared on the renewal date, even if you upgraded mid-cycle. Add-on credits carry over as long as you keep an active paid subscription.",
    },
    {
      question: "What happens to a Manus Cloud Computer if you stop paying?",
      answer:
        "Manus shuts the virtual machine down and deletes its working files, installed tools and databases. Outputs that were delivered in chat stay in your chat history, so download anything else before you cancel.",
    },
  ],
  "what-can-your-ai-agent-delete": [
    {
      question: "Why did an AI agent delete a production database?",
      answer:
        "In the cases on record (Replit in July 2025, DataTalks.Club and PocketOS in 2026) the agent held credentials that could delete production data and nothing stood between its decision and the command. Separate production from what the agent touches and keep backups it cannot reach.",
    },
    {
      question: "Can I give an AI agent read-only access?",
      answer:
        "Only where the app itself offers it. Construct has no read-only switch on a connection, so connect a user or account with a view-only role in the app, and switch the app off in App access for every agent that does not need it.",
    },
    {
      question: "Can a Construct agent delete my files?",
      answer:
        "Yes. An agent can delete workspace files and the delete is permanent, with no trash, and its terminal has the same files mounted with write access. Keep copies of anything you cannot lose outside Construct.",
    },
  ],
  "make-your-website-readable-by-ai-agents": [
    {
      question:
        "Should the Markdown version of a page be indexed by search engines?",
      answer:
        "No. We serve each Markdown twin with X-Robots-Tag: noindex and a canonical Link header pointing back to the HTML page, so search engines keep indexing the page itself. The one exception is when the homepage answers in Markdown at its own URL: there the middleware removes noindex, because that URL is the page.",
    },
    {
      question: "Do AI crawlers run JavaScript?",
      answer:
        "Mostly not. Vercel's December 2024 study found that none of the major AI crawlers, GPTBot, ClaudeBot and PerplexityBot included, render JavaScript, so anything your page only shows after JavaScript runs is invisible to them. Our homepage FAQ answers were missing for exactly that reason until we rendered them on the server.",
    },
    {
      question: "Which Cloudflare plans include Markdown for Agents?",
      answer:
        "Cloudflare's documentation, updated October 9, 2026, lists Markdown for Agents for Pro, Business and Enterprise plans and for SSL for SaaS customers at no extra cost. It converts HTML to Markdown for clients that send Accept: text/markdown, and it strips header, nav and footer elements, including a header inside main.",
    },
  ],
  "cheap-llm-for-ai-agents": [
    {
      question: "Is DeepSeek V4.1 Flash good for AI agents?",
      answer:
        "In our October 23, 2026 benchmark it passed 18 of 22 runs at $0.0086 per passed task, with a writing score of 4.3 of 5, and in a larger follow-up it passed 38 of 42 against GLM-5.3-Flash's 33. Its weak spot was the long meeting-planning task, which it failed both times. Construct now runs it right after Claude Haiku 5.5 for main agent turns.",
    },
    {
      question: "Is Gemini 3.8 Flash worth the price for an AI agent?",
      answer:
        "It tied for the top pass rate (19 of 22), was the fastest of the leaders at 24 seconds of model time per task and wrote best, but cost about nine times GLM-5.3-Flash per passed task in our run. Google's pricing page lists it at double the current rates from January 1, 2027, so check that before building on it.",
    },
    {
      question: "Can a Flash-Lite model run an AI agent?",
      answer:
        "Not well in our tests. Gemini 3.1 and 3.5 Flash-Lite were the fastest models but passed 14 of 22 tasks and scored 1.8 of 5 on writing, and both left Construct's fleet on October 24, 2026. They are better suited to quick side jobs such as titles and short summaries.",
    },
  ],
  "ai-search-recommends-ai-employees": [
    {
      question: "Which AI employee does ChatGPT recommend?",
      answer:
        "In our September 30, 2026 audit, ChatGPT named Zapier (22%), Lindy (21%) and Manus (19%) most often in answers to 50 buyer questions that did not mention them. It was also the engine most likely to cite news, with Reuters in 18% of its answers. One run per question, so treat these as a snapshot.",
    },
    {
      question:
        "Which sources does Google AI Mode cite for software recommendations?",
      answer:
        "In our audit Google AI Mode cited YouTube in 66% of its answers, Reddit in 28% and LinkedIn in 26%, far more than any other engine, alongside vendor sites such as lindy.ai and manus.im. It cited about 6.6 different sites per answer.",
    },
    {
      question: "Do G2 and Capterra show up in AI answers about AI agents?",
      answer:
        "Rarely, in our data. Across 224 answers from six engines on September 30, 2026, G2 was cited once and Capterra and Trustpilot never. The review sites that were cited were mostly newer AI-tool directories. An audit of citations cannot show indirect influence, such as a model having read those reviews in training.",
    },
  ],
};

export function getResourceFaqs(slug: string): readonly FaqItem[] {
  return resourceFaqs[slug] ?? [];
}
