/**
 * Inventory from Construct v2 (`apps/api` wrangler bindings, auth, billing,
 * observability, integrations, web search providers, the model fleet in
 * `domain/llm/policy/fleet.ts`, decisions in `platform/llm/jev.ts`, voice in
 * `domain/voice/config.ts`) plus the landing stack (PostHog proxy,
 * PartnerStack, Turnstile). Resend is not used, mail is Cloudflare Email.
 *
 * Cloudflare and Google each appear twice, once under Platform for hosting or
 * sign-in and once under Model providers for Workers AI and Gemini, so the
 * Model providers card names everyone who can see a prompt.
 *
 * `region` is where the vendor stores or processes the data it gets from
 * Construct, from each vendor's own DPA, trust center or docs as of October
 * 2026. "Global" means the vendor's default is to process wherever it has
 * capacity: Cloudflare with no D1/R2/Durable Object jurisdiction set, the
 * Gemini API terms, OpenAI without data residency, and Anthropic's default
 * `inference_geo`. Dodo hosts in AWS Mumbai (ap-south-1). PostHog is the EU
 * cloud (`eu.i.posthog.com` behind the x.construct.computer proxy). Bedrock
 * runs in whichever AWS region the customer's own credentials point at.
 *
 * Each `logo` is a square tile in `public/assets/sub-processors/`, cut from the
 * vendor's own published icon so every row shows the same 40px mark.
 */
export type SubProcessorGroup = "platform" | "models";

export type SubProcessor = {
  /** The brand people know, shown first in the row. */
  name: string;
  /** The contracting legal entity. */
  entity: string;
  logo: string;
  role: string;
  description: string;
  region: string;
  privacy: string;
  group: SubProcessorGroup;
};

export const SUB_PROCESSORS_UPDATED = "2026-10-15";

export const SUB_PROCESSOR_GROUPS: readonly {
  id: SubProcessorGroup;
  title: string;
  note: string;
}[] = [
  {
    id: "platform",
    title: "Platform",
    note: "Run the website, API and web app for every account.",
  },
  {
    id: "models",
    title: "Model providers",
    note: "Process prompts and context when they serve a request, on the platform fleet or with your own key (BYOK).",
  },
];

export const SUB_PROCESSORS: readonly SubProcessor[] = [
  {
    name: "Cloudflare",
    entity: "Cloudflare, Inc.",
    logo: "cloudflare",
    role: "Cloud infrastructure",
    description:
      "Hosts the website, API and web app, and stores workspace data in D1, R2, Durable Objects, Queues and Vectorize. Also runs agent sandboxes, AI Gateway for model requests, bot protection (Turnstile), rate limiting, observability logs and traces, and transactional and agent email (Email Sending and Email Routing).",
    region: "Global",
    privacy: "https://www.cloudflare.com/privacypolicy/",
    group: "platform",
  },
  {
    name: "Google",
    entity: "Google LLC",
    logo: "google",
    role: "Sign-in",
    description:
      "Handles sign-in with Google. Construct receives your email, profile ID, name and avatar.",
    region: "Global",
    privacy: "https://policies.google.com/privacy",
    group: "platform",
  },
  {
    name: "Composio",
    entity: "Composio",
    logo: "composio",
    role: "Integrations",
    description:
      "Manages OAuth connections and runs tool calls against the apps you connect, along with web search and interactive browser tasks when you use those capabilities.",
    region: "USA",
    privacy: "https://composio.dev/privacy",
    group: "platform",
  },
  {
    name: "Exa",
    entity: "Exa Labs Inc.",
    logo: "exa",
    role: "Web search",
    description:
      "Powers the agent’s web tools. Search queries and the URLs your agent reads are sent to Exa, which returns results and page content.",
    region: "USA",
    privacy: "https://exa.ai/privacy-policy",
    group: "platform",
  },
  {
    name: "Context.dev",
    entity: "Context Dev Inc.",
    logo: "context-dev",
    role: "Web search",
    description:
      "Powers the agent’s web tools. Search queries and the URLs your agent reads are sent to Context.dev, which returns results and page content.",
    region: "USA",
    privacy: "https://context.dev/privacy",
    group: "platform",
  },
  {
    name: "Dodo Payments",
    entity: "Dodo Payments",
    logo: "dodo-payments",
    role: "Payments",
    description:
      "Processes subscription billing and payment methods, and sends billing receipts. Construct receives signed lifecycle webhooks, not raw card numbers.",
    region: "India",
    privacy: "https://dodopayments.com/privacy-policy",
    group: "platform",
  },
  {
    name: "PostHog",
    entity: "PostHog, Inc.",
    logo: "posthog",
    role: "Analytics",
    description:
      "Product analytics and session replay. Website traffic reaches PostHog through Construct’s first-party proxy (x.construct.computer), and the API also sends allowlisted product events.",
    region: "EU",
    privacy: "https://posthog.com/privacy",
    group: "platform",
  },
  {
    name: "Sentry",
    entity: "Functional Software, Inc.",
    logo: "sentry",
    role: "Error monitoring",
    description:
      "Receives error reports and performance traces from the API and web app, including stack traces and related diagnostic context.",
    region: "USA",
    privacy: "https://sentry.io/privacy/",
    group: "platform",
  },
  {
    name: "PartnerStack",
    entity: "PartnerStack, Inc.",
    logo: "partnerstack",
    role: "Affiliate program",
    description:
      "Attributes referrals and reports commissions when you arrive through a partner link and later subscribe.",
    region: "USA",
    privacy: "https://partnerstack.com/privacy",
    group: "platform",
  },
  {
    name: "Cloudflare Workers AI",
    entity: "Cloudflare, Inc.",
    logo: "cloudflare",
    role: "AI models, memory, voice",
    description:
      "Serves the main agent and coding models on the platform fleet, and stands in for Gemini when it is unavailable, so prompts and conversation context for most agent turns are processed here. Workers AI also extracts memories from your conversations and indexes them for search, answers platform decision questions with Cloudflare’s Clef model, transcribes voice input, and is the backup voice for replies read aloud. Requests go through Cloudflare AI Gateway, which skips its request log for decision and voice requests.",
    region: "Global",
    privacy: "https://www.cloudflare.com/privacypolicy/",
    group: "models",
  },
  {
    name: "Google Gemini",
    entity: "Google LLC",
    logo: "gemini",
    role: "AI models, voice",
    description:
      "Runs the subagent, image and summary models on the platform fleet, and stands in when the main or coding model is unavailable, so prompts and conversation context are processed by Google AI Studio through Cloudflare AI Gateway. Gemini also reads your agent’s replies aloud when you use voice, and is the last fallback for transcribing voice input.",
    region: "Global",
    privacy: "https://policies.google.com/privacy",
    group: "models",
  },
  {
    name: "OpenRouter",
    entity: "OpenRouter, Inc.",
    logo: "openrouter",
    role: "AI models, BYOK",
    description:
      "Serves optional platform fleet models, and routes bring-your-own-key (BYOK) requests when an OpenRouter key or OpenRouter-hosted model is used. OpenRouter passes each request to the model provider serving it, which may process it outside the USA.",
    region: "USA",
    privacy: "https://openrouter.ai/privacy",
    group: "models",
  },
  {
    name: "TypeSafe",
    entity: "TypeSafe AI, Inc.",
    logo: "typesafe",
    role: "Decision models",
    description:
      "Hosts Jev, an alternative decision model that a decision can be switched to in place of the default (Cloudflare’s Clef, on Workers AI), reached through Cloudflare AI Gateway. When a decision uses Jev, Construct sends a short structured question with only the fields it needs, for example a name your agent is about to remember and the similar names already in your memory. TypeSafe does not receive your conversations.",
    region: "USA",
    privacy: "https://typesafe.ai/legal/privacy-policy",
    group: "models",
  },
  {
    name: "OpenAI",
    entity: "OpenAI, Inc.",
    logo: "openai",
    role: "AI models, BYOK",
    description:
      "Processes prompts and conversation context when you supply an OpenAI API key.",
    region: "Global",
    privacy: "https://openai.com/policies/privacy-policy/",
    group: "models",
  },
  {
    name: "Anthropic",
    entity: "Anthropic PBC",
    logo: "anthropic",
    role: "AI models, BYOK",
    description:
      "Processes prompts and conversation context when you supply an Anthropic API key.",
    region: "Global",
    privacy: "https://www.anthropic.com/privacy",
    group: "models",
  },
  {
    name: "Amazon Bedrock",
    entity: "Amazon Web Services, Inc.",
    logo: "aws",
    role: "AI models, BYOK",
    description:
      "Processes prompts and conversation context when you configure Amazon Bedrock or Bedrock Mantle credentials.",
    region: "Your AWS region",
    privacy: "https://aws.amazon.com/privacy/",
    group: "models",
  },
  {
    name: "xAI",
    entity: "xAI Corp.",
    logo: "xai",
    role: "AI models, BYOK",
    description:
      "Processes prompts and conversation context when you connect an xAI (Grok) key or sign in with xAI.",
    region: "USA",
    privacy: "https://x.ai/legal/privacy-policy",
    group: "models",
  },
];

/** Every whitespace-separated term must appear somewhere in the row. */
export function matchesQuery(processor: SubProcessor, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = [
    processor.name,
    processor.entity,
    processor.role,
    processor.description,
    processor.region,
  ]
    .join(" ")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}
