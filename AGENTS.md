# Project Rules

- Use pnpm only and commit the single `pnpm-lock.yaml`.
- Keep all editorial resources under `/blog/<slug>/`.
- Update `app/content/resources.ts` and the route-manifest tests when adding a resource type.
- Internal links must use canonical trailing-slash URLs.
- Do not add a runtime server for content that can be prerendered.
- Do not store email, tokens, IP addresses, or user-agent strings in analytics or logs.
- Validate untrusted input in the Pages Function before D1 access.
- Run `pnpm check && pnpm test:e2e` before shipping.
