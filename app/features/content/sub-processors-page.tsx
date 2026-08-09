import {
  ContentShell,
  Emph,
  InlineLink,
  List,
  Section,
} from "../../components/content/content-shell";

/**
 * Inventory from Construct v2 (`apps/api` wrangler bindings, auth, billing,
 * observability, integrations) plus the landing stack (PostHog proxy,
 * PartnerStack, Turnstile). Resend is not used — mail is Cloudflare Email.
 */
const processors = [
  {
    name: "Cloudflare, Inc.",
    purpose:
      "Application hosting and edge delivery (Workers, Pages), databases and objects (D1, R2, Durable Objects, Queues, Vectorize), sandbox execution, Workers AI and AI Gateway, bot protection (Turnstile), rate limiting, observability logs/traces, and transactional plus agent email (Email Sending and Email Routing)",
    site: "https://www.cloudflare.com/privacypolicy/",
  },
  {
    name: "Google LLC",
    purpose:
      "Account sign-in via Google OAuth (email, profile ID, name, avatar) and platform model inference via Google AI Studio / Gemini when selected for your plan (routed through Cloudflare AI Gateway)",
    site: "https://policies.google.com/privacy",
  },
  {
    name: "Composio",
    purpose:
      "OAuth connection management and tool execution against apps you connect, web search, and interactive browser tasks when you use those capabilities",
    site: "https://composio.dev/privacy",
  },
  {
    name: "Dodo Payments",
    purpose:
      "Subscription billing and payment-method processing; Construct receives signed lifecycle webhooks, not raw card numbers. Billing receipts are sent by Dodo",
    site: "https://dodopayments.com/privacy-policy",
  },
  {
    name: "PostHog, Inc.",
    purpose:
      "Product analytics and session replay. Website traffic is sent through Construct’s first-party proxy (x.construct.computer) to PostHog’s EU cloud; the API also emits allowlisted product events",
    site: "https://posthog.com/privacy",
  },
  {
    name: "Functional Software, Inc. (Sentry)",
    purpose:
      "Application error monitoring and performance traces for the API and web app (stack traces and related diagnostic context)",
    site: "https://sentry.io/privacy/",
  },
  {
    name: "PartnerStack, Inc.",
    purpose:
      "Affiliate referral attribution and commission reporting when you arrive through a partner link and later subscribe",
    site: "https://partnerstack.com/privacy",
  },
] as const;

const modelProcessors = [
  {
    name: "OpenRouter, Inc.",
    purpose:
      "Optional platform fleet models and bring-your-own-key (BYOK) routing when an OpenRouter key or OpenRouter-hosted model is used",
    site: "https://openrouter.ai/privacy",
  },
  {
    name: "OpenAI, Inc.",
    purpose: "BYOK model inference when you supply an OpenAI API key",
    site: "https://openai.com/policies/privacy-policy/",
  },
  {
    name: "Anthropic PBC",
    purpose: "BYOK model inference when you supply an Anthropic API key",
    site: "https://www.anthropic.com/privacy",
  },
  {
    name: "Amazon Web Services, Inc. (Bedrock)",
    purpose:
      "BYOK model inference when you configure Amazon Bedrock / Bedrock Mantle credentials",
    site: "https://aws.amazon.com/privacy/",
  },
  {
    name: "xAI Corp.",
    purpose: "BYOK model inference when you connect an xAI / Grok key or OAuth",
    site: "https://x.ai/legal/privacy-policy",
  },
] as const;

export function SubProcessorsPage() {
  return (
    <ContentShell
      title="Sub-processors"
      metadata={
        <>
          Last updated: <time dateTime="2026-08-09">August 9, 2026</time>
        </>
      }
    >
      <Section title="Who processes data for Construct">
        <p>
          Construct Computer engages the vendors below to help operate
          construct.computer and the Construct platform (API and web app). Each
          processes personal data only as needed for the stated purpose, under
          Construct’s instructions and the agreements we have with them. This
          list supplements our{" "}
          <InlineLink href="/privacy/">Privacy Policy</InlineLink>.
        </p>
        <p>
          Apps you choose to connect (for example Google Workspace tools, Slack,
          Telegram, Discord, or a custom MCP server) exchange data with those
          services at your direction. Those connections are described in Privacy
          Policy section 4.1 and are not repeated here as Construct
          infrastructure sub-processors.
        </p>
      </Section>

      <Section title="Platform sub-processors">
        <List>
          {processors.map((processor) => (
            <li key={processor.name}>
              <Emph>{processor.name}</Emph> — {processor.purpose}.{" "}
              <InlineLink href={processor.site}>Privacy policy</InlineLink>
            </li>
          ))}
        </List>
      </Section>

      <Section title="Model providers">
        <p>
          Prompts and conversation context required to run your agent are sent
          to the model provider serving the request. Google Gemini on the
          platform fleet is listed above. The providers below process data when
          the corresponding platform or BYOK path is used:
        </p>
        <List>
          {modelProcessors.map((processor) => (
            <li key={processor.name}>
              <Emph>{processor.name}</Emph> — {processor.purpose}.{" "}
              <InlineLink href={processor.site}>Privacy policy</InlineLink>
            </li>
          ))}
        </List>
      </Section>

      <Section title="Changes">
        <p>
          We may update this list when we add or replace a vendor. Material
          changes will be reflected here with a revised “Last updated” date. For
          questions, see{" "}
          <InlineLink href="/support/">Support</InlineLink>.
        </p>
      </Section>
    </ContentShell>
  );
}
