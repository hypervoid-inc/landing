# Growth Attribution

Every paying customer should be traceable to the channel that first brought them in. This doc covers how we tag links, the PostHog funnel we report from, the Friday numbers we review, which bottom-of-funnel posts go out next, and the follow-up the API still owes us.

## UTM conventions

Any link that leaves our hands carries a source. Use lowercase values with hyphens, and keep each value under 64 characters made of letters, digits, `.`, `_`, `~` and `-`, because the landing site drops anything else.

| Channel              | `utm_source`                                          | `utm_medium` | `utm_campaign`                                                                                    |
| -------------------- | ----------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------- |
| X replies and posts  | `x`                                                   | `social`     | `reply`, `post` or `thread`                                                                       |
| Micro-batch outreach | `coldemail`                                           | `email`      | the batch name, e.g. `2026-10-w3-agencies`                                                        |
| Warm intro blurbs    | `intro`                                               | `referral`   | the introducer's first name, or the batch name                                                    |
| Community answers    | `reddit`, `indiehackers` or the Discord server's name | `community`  | optional, the thread or subreddit                                                                 |
| ankush.one           | `ankush.one`                                          | `referral`   | `about_cta`, `about_now`, `experience`, `project`, `blog_bio`, `crosspost`, `resume` or `contact` |

Use `utm_content` for link placement when one message has several links (`cta-body-1`), and `utm_term` when you want to separate variants inside a campaign, such as the angle of a cold email. The landing site now reads `utm_term` too.

Example: `https://construct.computer/?utm_source=x&utm_medium=social&utm_campaign=reply`

### What the landing site stores

On the first visit that carries campaign parameters or comes from an external site, the site writes the `construct_attr` cookie on `.construct.computer` for 90 days. First touch wins: a later visit with different UTMs does not overwrite it (only a promo code and the signup answer can move). The one exception is a cookie that holds only a referring domain, such as a first visit from a Google search. The next tagged link still adds its campaign fields, and the original referring domain and landing path stay as they were. The short cookie keys are documented on the `CampaignAttribution` type in `app/features/analytics/campaign-attribution.ts`, and the API reads the same cookie at signup.

The same values go to PostHog as super properties (`utm_source`, `utm_campaign` and so on) and as `$set_once` person properties prefixed with `initial_` (`initial_utm_source`, `initial_utm_medium`, `initial_utm_campaign`, `initial_utm_term`). The site also records the first-touch referring domain on every first touch from an external site, with or without UTMs, so organic and untagged social visits are not lost. Its cookie key is `rd`, the super property is `referring_domain_first_touch` and the person property is `initial_referring_domain_first_touch`. IP addresses are never stored as a referring domain.

### Links that go through listmonk

Newsletter and outreach links sent through listmonk are rewritten to `/redirect`. The UTMs must be on the final destination URL in the mail-campaign repo, not on the redirect, or they are lost in the hop. Links that carry the listmonk `s` subscriber id get `utm_source=newsletter` and `utm_medium=email` filled in automatically, so cold email batches must set `utm_source=coldemail` explicitly.

## The paid funnel in PostHog

Build one funnel insight, ordered, with a 30 day conversion window:

1. `$pageview` on `construct.computer` (the landing pageview)
2. `auth.signup_completed` (sent by the API)
3. `billing.checkout_created` (sent by the API)
4. `billing.subscription_activated` (sent by the API)

Break it down by person properties, one at a time:

- `initial_utm_source`
- `initial_referring_domain_first_touch` (use `referring_domain_first_touch` for event-level breakdowns)
- `heard_about`, the answer from the signup question

Exclude test accounts with the project's internal and test user filter (our own emails, `@construct.computer`, and any staging accounts). Check the filter is on before reading any number off the chart.

Report paying customers, which is the last step. `checkout_started` and `billing.checkout_created` only tell us someone opened Stripe, and many of those never pay.

### Why accounts.google.com shows up as a source

Google sign-in sends the visitor to `accounts.google.com` and back, so the next pageview has that as its referrer. Gmail on Android does the same thing with `com.google.android.gm`. Event-level referrer and `$referring_domain` describe the last hop, not where the person came from, which is why Google looks like our biggest channel in the default web analytics view.

Reports must use the first-touch person properties above (`initial_utm_source` and `initial_referring_domain_first_touch`), never the event's referrer. When you do look at a referrer insight, filter out `accounts.google.com` and `com.google.android.gm`.

## Friday metrics

Every Friday, fill this in and compare it against the week-8 targets.

| Channel              | Weekly metric                                                               | Week-8 target                              | Where to get it                                                                                           |
| -------------------- | --------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| X                    | Replies posted, DMs sent, calls booked, paid customers first-touched from X | 50 replies, 10 DMs, 2 calls, 1 paid        | X activity, calendar, paid funnel filtered to `initial_utm_source = x`                                    |
| Warm intros          | Asks sent, intros received, calls held                                      | 20 asks, 6 intros, 4 calls                 | Warm list, calendar                                                                                       |
| Micro-batch outreach | Reply rate, positive reply rate, calls per batch                            | 8% reply, 1 call per 25 to 40 emails       | listmonk and inbox, per `utm_campaign` batch                                                              |
| SEO                  | Clicks on bottom-of-funnel pages, checkouts and payments from them          | 3 pages live, 1 paid customer from organic | Search Console, paid funnel by `initial_campaign_landing_path` and `initial_referring_domain_first_touch` |
| Communities          | Questions answered, names added to the warm list                            | 15 answers, 5 names                        | Our own log, warm list                                                                                    |
| Overall              | Paying customers by first-touch source, checkout-to-paid rate by source     | n/a                                        | Paid funnel broken down by `initial_utm_source`                                                           |

The rule is simple. If a channel misses its target two weeks running, change one variable (the angle, the audience or the offer) and leave the rest alone. If it misses for four weeks, cut it and put the time somewhere that is working.

## Bottom-of-funnel publishing queue

These comparison, alternatives, best-of and cost posts in `app/content/blog/` are still `draft: true`:

- `cheapest-ai-employee`
- `ai-employee-cost-calculator`
- `construct-computer-alternatives`
- `construct-vs-manus`
- `construct-vs-perplexity-computer`
- `construct-vs-simular-sai`
- `construct-vs-cellcog`
- `manus-alternatives`
- `perplexity-computer-alternatives`
- `perplexity-computer-vs-cowork-vs-manus`
- `sintra-alternatives`
- `sintra-vs-marblism-vs-lindy`
- `hermes-vs-openclaw-vs-managed`
- `ai-coworker-vs-ai-employee`

We publish one a week, following [scheduled-publishing.md](scheduled-publishing.md). The order comes from buying-intent queries in Search Console: open Performance, set the range to the last 3 months, and filter queries containing `vs`, `alternative`, `alternatives`, `best`, `pricing`, `cheapest`, `tool` or `software`. Whichever draft matches the queries with the most impressions goes next, and we recheck the list each week.

The role pages (`ai-employee-for-agencies`, `ai-employee-for-consultants`) wait until we have actually sold to that kind of customer, so they can describe a real deployment. New top-of-funnel posts are parked until the bottom-of-funnel queue is shipping and converting.

## Follow-ups in other repos

The API parser in the v2 repo (`apps/api/src/domain/auth/attribution.ts`) now accepts `rd`, `ut` and `h`, and counts `rd` and `lp` as attribution on their own, so an organic signup is no longer dropped (v2 branch `feat/first-use`, not deployed yet). Only `rd` is stored on the user row, as `attribution_referring_domain`; the API also sends it as `referring_domain` on `auth.signup_completed` and `initial_referring_domain` on the person. `ut` (`utm_term`) and `h` (where they heard about us) are parsed but not stored, so reports that need them still come from PostHog rather than D1.
