# Refresh drafts

Rewrites of live posts, kept here so they are not built. Each `.mdx` replaces `app/content/blog/<slug>.mdx` whole; the `.changes.md` next to it lists what changed and why, and the links to check before applying.

Before applying one:

1. Read the `.changes.md`, then diff the draft against the live file.
2. Remove any link to a post that is not live yet. The content test checks links against the post's original `published` date, so a link to a scheduled post fails until that post is live.
3. Copy it over the live file, update its FAQs in `app/content/faqs.ts` if the answers changed, and run `pnpm generate:content && pnpm check`.
