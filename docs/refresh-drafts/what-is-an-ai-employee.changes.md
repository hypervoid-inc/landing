> Oct 1, 2026: this draft was rewritten again to the Conversion Standard in `docs/editorial-strategy.md` (Construct leads, its own answers replace any self-score). Notes below describe the earlier pass.

# Refresh: what-is-an-ai-employee

Apply on or after 2026-11-30. Slug, `published: "2026-07-02"`, author, tags and kind unchanged. `updated` changed from "2026-09-29" to "2026-11-30". Kept `draft: false` (the post is live).

## What changed and why

- **Made it the hub for the topic.** Added "Every guide on AI employees in one place" at the end: links to every live related post (26 posts live today) and every scheduled post dated on or before 2026-11-30 (17 posts), grouped by intent: understand the category, choose a platform, alternatives, Construct comparisons, put one to work, trust and reliability, how we built it. Includes ai-employee.mdx and chat-assistants-vs-ai-employees.mdx (also linked in the body).
- **Definition stays first, sharper second paragraph.** The opening definition is unchanged; the second paragraph now gives the key difference from a chatbot plus a number in the first two sentences (Construct from $9 a month, 2 agents, 50 steps per task, 3 scheduled tasks).
- **Added the four properties** (a machine it controls, state that persists, work that runs without you, an identity) so the definition is testable, consistent with the ai-agent-with-its-own-computer post.
- **Question-style H2s** that match buyer searches ("How is an AI employee different from ChatGPT or Claude?", "Can you trust an AI employee to work unsupervised?", "How do you evaluate an AI employee?", "When does an AI employee make sense?").
- **Merged "Work that persists" and "Work you can supervise"** into one trust section that states the limits plainly: linear workflows, no mandatory approval gate, Activity is useful operating records and not a complete immutable audit log, and long jobs fail more often (links the half-life post). Added that a run that dies at step 30 keeps steps 1 to 29.
- **Removed** the sentence about 2, 4 or 8 concurrent temporary jobs and shared execution surfaces; plan limits now live in the linked product guide and pricing page.
- **Added channels** (web, Slack, Telegram, Discord slash commands, the agent's inbox) to the day-to-day section.
- **Added one sourced statistic:** Gartner's CIO survey, 17% deployed vs more than 60% expecting to within two years, via Digital Applied (re-fetched 2026-10-01; gartner.com returned 403).
- **Added a misconception** about automation tools, linking ai-agent-vs-zapier.
- **Evaluation section** now points to the refreshed buying guide (7 questions, 14-point scorecard).
- **Illustrative example labelled** as illustrative, not a customer case study.

## Before applying

- The content test compares each linked post's date with this post's `published` date (2026-07-02), so links to scheduled posts pass only once those posts are live. Confirm each of these is live (draft: false) on 2026-11-30, and delete the line for any that slipped: lindy-alternatives, ai-agent-gmail-access-safely, construct-vs-muse, always-on-ai-agents-compared, agent-reliability-calculator, construct-vs-claude-cowork, best-ai-employee-for-solo-founders, ai-inbox-triage, hosted-openclaw-alternatives, ai-agent-scheduled-tasks, construct-vs-genspark-claw, construct-vs-openclaw, ai-agent-activity-log, ai-company-research-spreadsheet, ai-delegation-checklist, construct-vs-gemini-spark, ai-agent-slack-briefing.
- Titles of scheduled posts are taken from schedule.json; update any that changed at publication.
- Remove the TODO comment at the end of the file once the links are checked.
