import { useEffect } from "react";

type RegisterTool = (
  tool: {
    name: string;
    title: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations: { readOnlyHint: boolean };
    execute: (input: unknown) => Promise<unknown>;
  },
  options?: { signal?: AbortSignal },
) => Promise<void> | void;

type ModelContextHost = { modelContext?: { registerTool: RegisterTool } };

/**
 * Registers the free tools with WebMCP so an agent working in the browser
 * (Chrome or Edge in the origin trial, ChatGPT Desktop, Brave Leo) can call
 * them on any page of the site. The spec moved the API from `navigator` to
 * `document`; both are checked. The tool code is only fetched when the
 * browser exposes the API, so other visitors download nothing.
 */
export function WebMcpTools() {
  useEffect(() => {
    const context =
      (document as ModelContextHost).modelContext ??
      (navigator as ModelContextHost).modelContext;
    if (!context) return;
    const controller = new AbortController();
    void import("../../../shared/tools/agent-tools").then(
      ({ agentTools, inputJsonSchema, toolIssues }) => {
        if (controller.signal.aborted) return;
        for (const tool of agentTools) {
          const registered = context.registerTool(
            {
              name: tool.name,
              title: tool.title,
              description: tool.description,
              inputSchema: inputJsonSchema(tool),
              annotations: { readOnlyHint: true },
              async execute(input) {
                try {
                  return tool.run(input);
                } catch (caught) {
                  // A bad call gets the same short issues the HTTP API
                  // returns, so the agent can fix its input and retry.
                  return {
                    error: "Input failed validation.",
                    issues: toolIssues(caught),
                  };
                }
              },
            },
            { signal: controller.signal },
          );
          void Promise.resolve(registered).catch(() => undefined);
        }
      },
    );
    return () => controller.abort();
  }, []);
  return null;
}
