import AiAgentVsVirtualAssistant, {
  frontmatter as aiAgentVsVirtualAssistantMeta,
} from "./ai-agent-vs-virtual-assistant.mdx";
import AiAgentVsZapier, {
  frontmatter as aiAgentVsZapierMeta,
} from "./ai-agent-vs-zapier.mdx";
import ChatAssistantsVsAiEmployees, {
  frontmatter as chatAssistantsVsAiEmployeesMeta,
} from "./chat-assistants-vs-ai-employees.mdx";
import WhatIsAnAiEmployee, {
  frontmatter as whatIsAnAiEmployeeMeta,
} from "./what-is-an-ai-employee.mdx";
import { blogFrontmatterSchema } from "../schema";
import { blogMetadata } from "./metadata.generated";

const posts = [
  [
    "ai-agent-vs-virtual-assistant",
    aiAgentVsVirtualAssistantMeta,
    AiAgentVsVirtualAssistant,
  ],
  ["ai-agent-vs-zapier", aiAgentVsZapierMeta, AiAgentVsZapier],
  [
    "chat-assistants-vs-ai-employees",
    chatAssistantsVsAiEmployeesMeta,
    ChatAssistantsVsAiEmployees,
  ],
  ["what-is-an-ai-employee", whatIsAnAiEmployeeMeta, WhatIsAnAiEmployee],
] as const;

export const blogPosts = posts.map(([slug, frontmatter, Content]) => ({
  slug,
  ...blogFrontmatterSchema.parse(frontmatter),
  Content,
}));

if (blogPosts.length !== blogMetadata.length) {
  throw new Error(
    "Generated blog metadata and imported MDX posts differ; update app/content/blog/index.ts",
  );
}

for (const [index, post] of blogPosts.entries()) {
  const generated = blogMetadata[index];
  if (
    !generated ||
    Object.entries(generated).some(
      ([key, value]) =>
        JSON.stringify(post[key as keyof typeof post]) !==
        JSON.stringify(value),
    )
  ) {
    throw new Error(
      "Generated blog metadata is stale; run scripts/generate-content.mjs",
    );
  }
}

export type BlogPost = (typeof blogPosts)[number];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug && !post.draft);
}
