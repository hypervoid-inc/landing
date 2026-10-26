# Blog Plan, Oct to Dec 2026

Status: in effect from 2026-10-26. The daily calendar and the October to November comparison exception are retired; [scheduled-publishing.md](scheduled-publishing.md) and [editorial-strategy.md](editorial-strategy.md) carry the rules below.

## Where we are

- 47 posts are live, 32 of them published in October, about one a day. 21 of the 47 are comparisons or alternatives pages, and every one ranks Construct first.
- 39 more are queued: 9 scheduled from Oct 27 to Nov 5, and 30 held drafts dated through Dec 4. 52 were drafted in one commit (`1a17ae7`).
- The audit of all 39 found them honest (no invented customers, every example marked illustrative) but almost empty of first-hand evidence. None has a screenshot of the job it describes, 14 say in the page that the test has not been run yet, and the 20 held drafts in part two alone carry 103 TODOs. One template runs through the whole blog: "Give Construct its first..." is in 75 of 86 posts, the "steps 1 to 29" caveat in 56, and "There is no import" in 51, with three or four CTAs per post and 6 to 8 FAQs repeating the body.
- 12 live posts carry a `published` date earlier than the day their file entered this repo. The repo starts on 2026-07-26 while Search Console and Bing saw the site months earlier at older URLs (`/ai-employee`, `/vs/coding-agents`), so those dates most likely record first publication on the earlier site. They stay as they are.
- Competitor facts went stale within weeks: Gemini Spark is now Tasks in Gemini, Grok Bot moved to the X Subscription, Cowork merged into Claude, Manus split from Meta and shipped 2.0, Relevance AI went enterprise only.
- Construct appeared in none of the top results for 20 target queries, including ones it has posts for. Crawler access is not the problem: every search and AI crawler gets a 200, every page has a Markdown twin, and robots.txt welcomes them all.

Search Console and Bing, last three months to 2026-10-24:

- Google impressions grew from about 40 a day in August to 1,000 to 1,400 a day in October, at an average position near 8, with a click-through rate around 1%. The United States brings 14,813 impressions at 0.47%; India brings the most clicks (81).
- Two pages carry the site: `grokbot-alternative` (10,380 impressions, 125 clicks) and the homepage. The original benchmark post `clef-vs-jev-benchmark` earns clicks on its own name, the clearest sign that first-hand data works.
- High impressions with almost no clicks: `construct-vs-diy` (3,660 at position 6, from "turnkey ai system vs building your own"), `what-is-an-ai-employee` and `ai-employee` (both competing for "ai employee", 1,005 impressions at position 19), `construct-vs-openai-dots` ("chatgpt dots cost"). Their titles and descriptions were rewritten to match those queries on 2026-10-26.
- Brand: "construct computer" ranks at 2.6 with a 37.5% click-through rate, while "construct" alone (1,352 impressions) and "construct ai" sit near position 8 with almost no clicks.
- Indexing: on 2026-10-19 Google listed 76 pages indexed and 70 not indexed (redirects, noindexed Markdown twins, 404s from old URLs, and 16 crawled or discovered but not indexed).
- Bing: 15 impressions and no clicks in three months, 3 Copilot citations (all on 2026-08-04), and Site Explorer lists only 14 top-level URLs. IndexNow submissions return HTTP 200 on every deploy, so the gap is Bing's choice to index and rank, which matters because ChatGPT search and Copilot lean on Bing.

The volume is not what puts us at risk. Google says frequency alone is not spam. The risk is the pattern Google's policies and the 2026 casualties share: batches of templated, self-ranking comparison pages with little first-hand evidence. Fewer posts that each carry something only we can show is both the safe plan and the one most likely to be cited.

## What the research says

Labels follow the research notes: policy is written Google rule, data is correlation from studies, opinion is practitioner reading.

- **Scaled content abuse** (policy, updated 2026-08-28): "many pages are generated for the primary purpose of manipulating search rankings", however they were made. Raters judge it site-wide after several pages. The doorway policy covers substantially similar pages built for similar queries, which is what name-swapped alternatives pages look like. There were four spam updates in 2026 so far, against one in all of 2025.
- **AI content** (policy, 2026-10-01): AI use is allowed, but Google asks publishers to "manually factcheck and review all AI-generated content" before publishing, including titles, descriptions, structured data and alt text. Fake creator profiles are now named as deception.
- **Who got hit** (opinion and data, Lily Ray 2026-05-13 and 2026-10-04): of 220+ sites tied to AI content platforms, 54% lost 30% or more of peak traffic. The shared signals were bursts after quiet periods, recurring templates ("self-promotional listicles, competitor-vs-alternatives pages, and FAQ farms"), and topics outside the company's expertise. Seven SaaS sites heavy in self-ranking listicles lost 29% to 49% from January 2026. Google's AI Overviews cited vendors' own "best" lists but left the vendor out of the recommendation 69% of the time in June and 83% in September.
- **Comparisons** (policy, reviews guidance): show evidence of your own experience, quantitative measurements, who each option is best for, and back any "best" claim with first-hand support. The FTC fake reviews rule bans implying a site you control reviews a category independently when your product is in it.
- **Dates** (policy): dates "must describe the publication or update date of the page"; changing dates without substantial change is a named warning sign; `lastmod` is used only if consistently accurate.
- **Cadence** (Google statements, no study): frequency is not a ranking factor and no credible study sets an optimal cadence. Recovery from a quality demotion takes "several months".
- **AI search** (policy and data): Google says AI Overviews and AI Mode need nothing beyond normal SEO, and 76% of their citations rank in the organic top 10, so ranking is the way in. ChatGPT, Copilot and others lean on the Bing index. Third-party brand mentions correlate 0.66 to 0.71 with AI visibility, far more than domain rating. Comparison answers lean on third parties: official sites got 63% of ChatGPT citations on factual queries but 46% on comparisons. Reddit and YouTube are the most cited domains in Google AI Mode. llms.txt has no measured effect, and Google does not read it.
- **Formats** (data, correlation): pages ChatGPT cites more often have many sourced statistics, expert quotes, 120 to 180 word sections, updates within three months, and a brand listed on G2 or Capterra. Google says "There's no ideal page length". The GEO paper's gains from quotations and statistics held in lab tests, and C-SEO Bench found most rewrite tricks ineffective. Original data and answer-first structure are the consistent winners.
- **Structured data** (policy): FAQ rich results ended 2026-05-07. Article, Breadcrumb, Organization, ProfilePage, Software app and Video remain. FAQPage markup adds nothing in Google.

Full notes with every URL: the research files from this session (see Sources at the end for the load-bearing ones).

## Rules from now on

### Cadence and timing

- Three or four posts a week on varied days and times, never two on one day, no batch scheduling. A slot stays empty rather than take a post that misses the standard.
- Each post carries a `time` (UTC) beside its `published` date, drawn at random between 12:00 and 21:00 UTC (US morning to afternoon, Europe afternoon, India evening). A CI check every quarter hour deploys once a post is due and missing from the live sitemap ([scheduled-publishing.md](scheduled-publishing.md)).
- Distribution goes out within a few hours of go-live: founders' X and LinkedIn, the listmonk list weekly, Hacker News only for original data and engineering posts, Reddit only as a disclosed answer to a thread that asked.
- No posts Thanksgiving Thursday (Nov 26) to Cyber Monday (Nov 30), or Dec 21 to Jan 4.
- Every post goes through a pull request with a named human reviewer, which is what `/editorial-policy/` already promises.

### What every post needs

1. **One query it owns**, checked against every live and planned slug. If a live post already targets it, update that post instead.
2. **First-hand evidence**: a real run in Construct with screenshots or a recording of the job the post describes, real numbers we measured, or original data. Illustrative examples only beside real ones, never instead of them.
3. **Answer first**: the first two or three sentences answer the query. Construct appears where it is part of the answer, not as a mandated price in sentence one.
4. **A "How we checked this" section** with the date and what was verified against what. Comparisons call it `## Methodology`.
5. **Sources inline** on every outside fact, with the date checked on prices and policies, since vendors change pages within weeks.
6. **A real byline** and one line of disclosure: "Drafted with AI assistance, tested and edited by <name>."
7. **Two CTAs at most**: one after the answer, one at the end. No stock closer, and product caveats only where they matter to this job.
8. **FAQs only when they add** questions the body does not answer. They stop being required by convention.
9. **Honest dates**: `published` is the real go-live day, `updated` only on substantive change, and no year in a title unless the post is refreshed for that year.
10. **No template reuse across posts**: structure follows the job, so two posts never share the same H2 skeleton.

### Comparisons

- Neutral head-to-heads with "We make Construct" at the top, a dated methodology, screenshots from both products where we can get access, and a section on where the other product is the better pick.
- One page per competitor. "X alternatives" and "Construct vs X" for the same X merge into one.
- No new "best X" lists that rank Construct first. The existing ones get the honest treatment above or are merged.

This changes the Conversion Standard: "Construct leads" in the first sentence, "no where X wins", and three CTAs all go. Every post still sells Construct, by showing it doing the job.

## The schedule

Sixteen posts from Oct 28 to Nov 25, three or four a week. Each was rewritten on 2026-10-26 to the standard above, with product behaviour checked against the production source and competitor facts against their own pages. One is a comparison.

| Date | Time (UTC) | Post | Owns the query |
| --- | --- | --- | --- |
| Wed Oct 28 | 13:51 | `is-construct-computer-safe` | "is construct computer safe" |
| Fri Oct 30 | 15:43 | `make-your-website-readable-by-ai-agents` (new) | "make website readable by ai agents", "llms.txt" |
| Mon Nov 2 | 14:52 | `ai-agent-prompt-injection` | "ai agent prompt injection" |
| Wed Nov 4 | 19:25 | `how-much-does-an-ai-agent-cost` (new) | "how much does an ai agent cost per month" |
| Thu Nov 5 | 20:05 | `ai-agent-browser-and-terminal` | "ai agent with browser and terminal" |
| Sat Nov 7 | 12:53 | `manus-alternatives` | "manus alternatives" |
| Tue Nov 10 | 18:37 | `cheap-llm-for-ai-agents` (new, bake-off data) | "best cheap llm for ai agents" |
| Wed Nov 11 | 17:21 | `ai-agent-custom-mcp` | "connect mcp server to ai agent" |
| Fri Nov 13 | 17:12 | `ai-agent-slack-briefing` | "ai slack daily summary" |
| Mon Nov 16 | 16:31 | `what-can-your-ai-agent-delete` (new) | "ai agent deleted database" |
| Tue Nov 17 | 17:44 | `ai-search-recommends-ai-employees` (audit data) | AI engine recommendations |
| Thu Nov 19 | 17:03 | `ai-lead-sourcing-hubspot` | "hubspot ai lead generation" |
| Fri Nov 20 | 15:23 | `ai-agent-files-and-artifacts` | "ai agent persistent files" |
| Mon Nov 23 | 19:39 | `ai-delegation-checklist` | "what to delegate to an ai employee" |
| Tue Nov 24 | 15:31 | `ai-employee-team-workspace` | "shared ai workspace for teams" |
| Wed Nov 25 | 14:49 | `ai-company-research-spreadsheet` | "ai company research spreadsheet" |

Real screenshots of each job would make every one of these stronger; each post's notes list the shots worth taking, and a post can be updated with them after it ships.

Held as drafts from Dec 1, each until it has its evidence: `where-ai-agents-fail` (needs aggregated production data), `hermes-vs-openclaw-vs-managed` (needs the hands-on test), `perplexity-computer-alternatives` with `construct-vs-perplexity-computer`, `viktor-alternatives` with `construct-vs-viktor`, `ai-competitor-pricing-report`, `ai-investor-update`, `sintra-alternatives` with `sintra-vs-marblism-vs-lindy` (only if Search Console shows Sintra demand), `customer-story-1`, `ai-employee-for-agencies` and `ai-employee-for-consultants` (all three need a real customer). Still to write: always-on agents in the UK and EU, and a year-end post from our own 2026 numbers.

Removed on 2026-10-26, never live so no redirects: `construct-computer-alternatives`, `construct-vs-simular-sai`, `construct-vs-cellcog`, `perplexity-computer-vs-cowork-vs-manus`, `ai-agent-linear-from-slack`, `ai-follow-ups-crm-without-zapier`, `construct-vs-gemini-spark`, `claude-cowork-alternatives`, `ai-coworker-vs-ai-employee`, `ai-agent-telegram-slack-discord`, and the four drafts merged into scheduled posts (`ai-employee-cost-calculator`, `cheapest-ai-employee`, `construct-vs-manus`, `hire-an-ai-employee`).

## Fixing what is live

Live posts change as little as possible. Done on 2026-10-26:

1. Stale competitor facts corrected in 11 posts with `updated` set: Grok Bot on The X Subscription, Gemini Spark renamed Tasks in Gemini, Cowork merged into Claude, Dots tiers, and two Zapier questions answered in `ai-agent-vs-zapier`.
2. Titles and descriptions rewritten on the nine pages with many impressions and few clicks, to match what searchers type.
3. Every page title ends in "Construct Computer", never "Construct" alone, and the pricing page leads with "Construct Computer Pricing".

Still open:

- Apply the refresh drafts in `docs/refresh-drafts/` only where they are corrections, not rewrites; `ai-agent-vs-zapier`'s would unpublish the live post.
- After the Nov 2 audit, use Search Console to decide which overlapping comparison pages merge with 301s.
- Strip boilerplate from a live post only when it is next updated for another reason.

## Discovery by search and AI engines

Already in place: robots.txt welcoming every search and AI crawler with content signals, Markdown twins of every page with negotiation, `llms.txt` and `llms-full.txt`, IndexNow on every deploy, BlogPosting and ProfilePage markup, real author pages.

Still to do on the site:

- **Brand name in titles.** 30 live page titles end in "| Construct" (pricing, use cases, tools, tag hubs). Change the suffix to "| Construct Computer" and add a test, so every snippet pairs the full name with the category. Lead comparison titles with "Construct Computer" on first mention.
- **Entity markup.** `legalName` "Hypervoid Inc.", a `disambiguatingDescription`, `WebSite` `alternateName` "Construct", and the hypervoid-inc GitHub org and SaaSHub in `sameAs`; G2 and Capterra once they exist.
- **A quotable disambiguation line** at the top of `/about/` and `llms.txt`: Construct Computer is not Construct 3, The Construct or a construction tool.
- **Agent-readable media.** Markdown twins drop video and inline SVG, so every number in a chart or video also appears in text or a table, and videos get their transcript on the page.
- **Accurate `lastmod`**, tied to real `updated` dates, so Google and Bing keep trusting it.

Off the site, where most AI visibility comes from:

- Consistent profiles: GitHub org name "Construct Computer", LinkedIn About rewritten without "cloud OS" or "Constructs", one tagline everywhere, no "Construct AI".
- Listings: G2, Capterra, AlternativeTo, There's An AI For That, Futurepedia, Toolify, Crunchbase, then real reviews on G2 and Product Hunt.
- Corrections: Stork prints yearly prices as monthly and says "no API"; Toolradar shows a G2 rating with no G2 listing behind it.
- Inclusion in the neutral tables answer engines already cite (AIMultiple, Every) and the page-one lists that leave us out (Rework, Leland, DataCamp, Fast.io, Simular's cloud computers list, Storyflow, AIToolTier, ToolJunction, PeerPush).
- Disclosed founder answers on Reddit threads asking for Manus, Lindy or OpenClaw alternatives, and two or three YouTube walkthroughs titled "Construct Computer ...".
- A Wikidata item only after one or two independent articles exist to cite.
- Bing Webmaster Tools verification and its AI Performance report, since ChatGPT and Copilot draw on Bing.

On "construct" alone: Construct 3 owns that query with years of links, and we should not expect to pass it soon. The winnable queries are "construct computer", "construct ai agent", "construct pricing", "construct review", "construct vs manus" and "is construct computer safe", where today the answer engines find nothing of ours or only directory pages. The title change, post 1, post 6 and the listings target exactly those.

## Measuring it

- **Weekly**: Search Console clicks and impressions per post, the share of `/blog/` URLs indexed vs "crawled, currently not indexed", Bing AI Performance citations, PostHog signups by first landing page.
- **Monthly**: a `construct-ai-audit` run across the six engines, reporting mentions and citations separately.
- **Per post at day 28**: impressions and clicks, citations, signups. A post with no impressions by then gets reviewed, not replaced with three more.

## Sources

- Google spam policies: https://developers.google.com/search/docs/essentials/spam-policies
- Creating helpful content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google AI optimization guide: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- AI features and your website: https://developers.google.com/search/docs/appearance/ai-features
- Publication dates: https://developers.google.com/search/docs/appearance/publication-dates
- Reviews system: https://developers.google.com/search/docs/appearance/reviews-system
- Site names: https://developers.google.com/search/docs/appearance/site-names
- Structured data gallery: https://developers.google.com/search/docs/appearance/structured-data/search-gallery
- Search quality rater guidelines: https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf
- Lily Ray, AI content risks: https://lilyraynyc.substack.com/p/it-works-until-it-doesnt-ai-content-risks
- Lily Ray, self-promotional listicles: https://lilyraynyc.substack.com/p/why-calling-yourself-the-best-could
- Lily Ray, update prediction: https://lilyraynyc.substack.com/p/prediction-the-next-massive-google
- Bing on duplicate content and AI search: https://blogs.bing.com/webmaster/2025/12/Does-Duplicate-Content-Hurt-SEO-and-AI-Search-Visibility/
- Bing AI Performance: https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/
- Ahrefs, AI brand visibility correlations: https://ahrefs.com/blog/ai-brand-visibility-correlations/
- Ahrefs, rankings and AI citations: https://ahrefs.com/blog/search-rankings-ai-citations/
- FTC fake reviews rule: https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials
- GEO paper: https://arxiv.org/abs/2311.09735
- C-SEO Bench: https://arxiv.org/abs/2506.11097
