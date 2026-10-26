# Editorial Strategy

## Goal

Show what Construct can do, where each capability fits, and what its current boundaries are. Comparison pages remain useful for purchase decisions, but they should not define the publication mix.

## Publishing Mix

- 50% feature and capability stories
- 25% practical workflow guides
- 15% category education
- 10% direct comparisons

For each new comparison, publish several first-party pieces that explain a Construct capability or a real operating pattern.

## Content Pillars

1. **Build with Construct:** workspace apps, internal tools, custom MCP, and reusable workflows.
2. **Execute real work:** browser, terminal, files, native email, connected apps, and scheduled jobs.
3. **Control and trust:** inspectable memory, permissions, Activity summaries, supervision, and failure boundaries.
4. **Operate across time:** recurring work, durable artifacts, team workspaces, and channels.
5. **Choose Construct:** comparisons and alternatives pages that make the case for Construct with sourced facts, and a clear path for readers already using another agent.

## Post Standard

Every post sells Construct by showing it do the job, in a page a buyer or an AI answer engine would cite because it says something specific and true the top results do not. Google's spam and reviews policies and the 2026 traffic losses at sites built on templated, self-ranking pages are why. The full reasoning and sources are in [blog-plan-2026-q4.md](blog-plan-2026-q4.md).

- One query per post, checked against every live slug. If a live post already targets it, update that post instead.
- Answer first: the opening sentences answer the query. Construct appears where it is part of the answer.
- First-hand substance: product behaviour verified in the product source, our own data, real screenshots of the job described. An illustrative example is labelled and never stands in for a result. No promises of tests not yet run.
- A short note on how the post was checked, with dates. Comparisons call it `## Methodology` and start with "We make Construct".
- Every outside fact sourced inline to its primary source, with the date checked on prices and policies.
- At most two calls to action in the body (`blog_top`, optionally `blog_inline_1`); the page adds its closing one.
- Comparisons are neutral: one page per competitor, a section on when the other product is the better pick, no list ranked by us with Construct first by default.
- No template reuse: structure follows the job. No stock closers, repeated product caveats or the same pitch in every post.
- FAQs only when they add questions the body does not answer. FAQ rich results ended in May 2026.
- Honest dates: `published` is the real go-live day, `updated` only on a substantive change, no year in a title unless the post is about that year.
- Every claim stays true: no invented numbers, customers or testimonials.

## Article Standard

Every feature article should include:

- A concrete job or repeated process
- What Construct does from request to result
- The durable output or state left behind
- Supervision, permissions, or diagnostics
- Current limitations that would otherwise mislead, with the workaround
- Canonical links to related capability pages

Avoid generic AI trend posts, unsupported superlatives, and feature lists without an operating example.

Wrap every prompt a reader can paste into Construct in `<Prompt>...</Prompt>` (Markdown inside, `label="..."` for a note such as where to send it). It renders with Copy and "Try it in Construct" buttons, and feeds and `llms-full.txt` turn it back into a Markdown quote. Quotes that are not prompts, such as an example email or a customer's words, stay ordinary `>` quotes.

## Feature Backlog

1. Building internal tools with workspace apps (published: `build-internal-tools-with-construct`)
2. Browser and terminal work in one supervised task (drafted: `ai-agent-browser-and-terminal`)
3. Native agent email and connected Gmail actions (`ai-agent-email-address`, scheduled; `ai-agent-gmail-access-safely`, drafted)
4. Turning a successful task into a scheduled workflow (drafted: `ai-agent-scheduled-tasks`)
5. Inspectable memory with corrections and provenance (published: `ai-agent-memory`)
6. Files and artifacts as durable agent output (drafted: `ai-agent-files-and-artifacts`)
7. Activity summaries versus a forensic audit log (drafted: `ai-agent-activity-log`)
8. Connected apps, custom MCP, and permission boundaries (drafted: `ai-agent-custom-mcp`)

## Cadence

Three or four posts a week on varied days and times (`time` in the frontmatter, see [scheduled-publishing.md](scheduled-publishing.md)), never two on one day, and no batch scheduling. A slot stays empty rather than take a post that misses the Post Standard above. The October 2026 calendar ran 47% comparisons at one a day; from November 2026 comparisons are at most one post in four.

Publish the feature or workflow article first. Add a comparison only when readers need a genuine decision framework that the existing capability content cannot answer.
