> Oct 1, 2026: this draft was rewritten again to the Conversion Standard in `docs/editorial-strategy.md` (Construct leads, its own answers replace any self-score). Notes below describe the earlier pass.

# Refresh: how-to-choose-an-ai-agent-platform-for-your-team

Apply on or after 2026-11-18. Slug, `published: "2026-07-28"`, author, tags and kind unchanged. Added `updated: "2026-11-18"`. Kept `draft: false` (the post is live; setting it to true would unpublish it).

## What changed and why

- **Reframed as a buying guide for a small team.** The old post was an enterprise-flavoured framework (six criteria, then six vendor questions, then a six-row scorecard covering the same ground three times). The new structure is: answer first (7 questions, score 0 to 2, 10 of 14 to pilot, no zero on access/irreversible actions/failure), pick one real job, the 7 questions, scorecard, pilot plan.
- **Seven questions instead of six criteria.** Added "what can it touch and how do we limit that" (access/identity), "what happens before it does something we cannot undo" (split out from human-in-the-loop), "when a run fails halfway" (resumability, linked to the half-life post), and merged memory with data use and exit. Dropped the standalone MCP criterion; MCP now sits inside question 2.
- **Each question has the same parts:** why it matters, a good answer, a red flag, Construct's answer. Construct's answers state where it loses points.
- **New scorecard with defined 0/1/2 levels**, a blank three-vendor version, and Construct scored honestly against it (11 of 14: loses points on approval gates, forensic logging, and undocumented at-limit behaviour).
- **New two-week pilot plan** with four decision numbers, including review time.
- **Removed the "88% of AI agent pilots fail" figure and its 34/27/14/9/5 breakdown.** Re-fetched the Digital Applied source on 2026-10-01: it gives no underlying dataset or sample for the 88% figure. Kept only the Gartner 40% cancellation prediction (quoted via Digital Applied; gartner.com returned 403).
- **Corrected the EU AI Act timing.** The old post said high-risk obligations "become enforceable on August 2, 2026". The AI Act Explorer's Article 14 page (fetched 2026-10-01) now lists 2 December 2027 (Annex III) and 2 August 2028 (Annex I); Legal Nodes (updated 2026-04-10) still says 2 August 2026. Per the brief, the post now cites both and says they disagree. Re-check both on publish day.
- **Removed the MCP adoption statistic** (41%, Stacklok via Digital Applied). Not re-verified in this task, and not needed for a small-team guide.
- **Fixed plan facts.** Old post said plans differ "rather than gating core execution behind higher tiers" and linked the homepage for pricing. Now lists each plan's limits from `app/content/landing.ts` and links `/pricing/`. BYOK described as an optional fallback on Pro.
- **Removed `blog_inline_2` and `blog_inline_3` CTAs.** The brief allows top, `blog_inline_1` and optionally `blog_inline_2`; the old post had three inline CTAs.
- **Wrapped tables in `ArticleTable`** with unique captions.
- **New internal links** to posts dated on or before 2026-11-18: ai-inbox-triage (11-06), ai-agent-gmail-access-safely (10-22), ai-agent-activity-log (11-18), agent-reliability-calculator (10-29), ai-agent-scheduled-tasks (11-11), best-ai-employee-for-solo-founders (11-03), always-on-ai-agents-compared (10-27), plus /use-cases/team-workspaces/.

## Before applying

- The content test checks a link's target date against this post's `published` date (2026-07-28), so links to the scheduled posts above only pass once those posts are live (then they are canonical routes). Confirm each is live, or remove its link.
- Resolve the TODOs: per-app scoping of connections (Q2), customer export before cancelling (Q6), behaviour when bundled usage runs out on Lite/Starter and per-seat vs per-plan pricing for team workspaces (Q7), and the EU AI Act date re-check. Adjust Construct's self-score if any answer changes.
- The landing FAQ in `app/content/landing.ts` still calls Activity "a full audit log of every action". This refresh follows the brief (useful operating records, not a complete immutable audit log). Someone should reconcile the FAQ.
