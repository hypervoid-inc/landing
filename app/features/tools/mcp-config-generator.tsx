import { useState } from "react";

import { ChoiceField } from "../../components/content/calculators/calculator-ui";
import {
  clientConfigs,
  serverProblems,
  type McpServer,
} from "../../../shared/tools/mcp-config";
import type { ToolProps } from "./tool-page";
import { useChangeCount } from "./tool-motion";
import {
  CodeBlock,
  LiveResult,
  TextField,
  ToolFrame,
  toolStyles,
} from "./tool-ui";

const TOOL = "mcp-config-generator";

const blank: McpServer = {
  name: "",
  transport: "local",
  command: "",
  args: "",
  env: "",
  url: "",
  headers: "",
};

/** Real, published servers, so a preset pasted as-is actually starts. */
const PRESETS: readonly { label: string; server: McpServer }[] = [
  {
    label: "Filesystem",
    server: {
      ...blank,
      name: "filesystem",
      command: "npx",
      args: "-y\n@modelcontextprotocol/server-filesystem\n/Users/you/Documents",
    },
  },
  {
    label: "Playwright browser",
    server: {
      ...blank,
      name: "playwright",
      command: "npx",
      args: "@playwright/mcp@latest",
    },
  },
  {
    label: "GitHub (remote)",
    server: {
      ...blank,
      name: "github",
      transport: "remote",
      url: "https://api.githubcopilot.com/mcp/",
      headers: "Authorization: Bearer YOUR_GITHUB_TOKEN",
    },
  },
];

export function McpConfigGenerator({ cta }: ToolProps) {
  const [server, setServer] = useState<McpServer>(PRESETS[0]!.server);
  const set =
    <K extends keyof McpServer>(key: K) =>
    (value: McpServer[K]) =>
      setServer((current) => ({ ...current, [key]: value }));
  const problems = serverProblems(server);
  const clients = problems.length ? [] : clientConfigs(server);
  // The local and remote fields swap in, but only on a switch, not on load.
  const transportSwitches = useChangeCount(server.transport);
  const summary = problems.length
    ? problems.join(" ")
    : `Config for ${server.name} is ready for ${clients.length} clients. Open the one you use, copy it and paste it where it says.`;

  return (
    <ToolFrame title="MCP config generator">
      <p className={toolStyles.labelClass}>Start from a known server</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            aria-pressed={server.name === preset.server.name}
            onClick={() => setServer(preset.server)}
            className="tool-press min-h-9 rounded-full border border-[#d7dee2] bg-white px-3 text-[13px] text-[#4e4646] hover:border-[#01b4c8] aria-pressed:border-[#01b4c8] aria-pressed:bg-[#effbfc] aria-pressed:text-[#017b89]"
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setServer({ ...blank, name: "my-server" })}
          className="tool-press min-h-9 rounded-full border border-dashed border-[#01b4c8] bg-white px-3 text-[13px] font-medium text-[#017b89] hover:bg-[#effbfc]"
        >
          Start blank
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4">
        <TextField
          label="Server name"
          value={server.name}
          onChange={set("name")}
          placeholder="my-server"
          hint="Letters, numbers, - and _. This is the name the client shows."
          invalid={!/^[A-Za-z0-9_-]+$/.test(server.name)}
        />
      </div>
      <ChoiceField
        legend="How does the client reach it?"
        value={server.transport}
        onChange={set("transport")}
        options={[
          {
            value: "local",
            label: "Run a command",
            hint: "Local server, started with npx, uvx, docker or a path.",
          },
          {
            value: "remote",
            label: "Call a URL",
            hint: "Remote server over HTTP, hosted somewhere else.",
          },
        ]}
      />

      <div
        key={server.transport}
        className={`${transportSwitches ? "tool-enter " : ""}mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2`}
      >
        {server.transport === "local" ? (
          <>
            <TextField
              label="Command"
              value={server.command}
              onChange={set("command")}
              placeholder="npx"
            />
            <TextField
              label="Arguments, one per line"
              multiline
              value={server.args}
              onChange={set("args")}
              placeholder={"-y\n@scope/server-name"}
            />
            <div className="sm:col-span-2">
              <TextField
                label="Environment variables, one per line"
                multiline
                value={server.env}
                onChange={set("env")}
                placeholder="API_KEY=your-key"
                hint="KEY=value. Stays in your browser."
              />
            </div>
          </>
        ) : (
          <>
            <div className="sm:col-span-2">
              <TextField
                label="Server URL"
                type="url"
                value={server.url}
                onChange={set("url")}
                placeholder="https://example.com/mcp"
              />
            </div>
            <div className="sm:col-span-2">
              <TextField
                label="Headers, one per line"
                multiline
                value={server.headers}
                onChange={set("headers")}
                placeholder="Authorization: Bearer your-token"
                hint="Name: value. Stays in your browser."
              />
            </div>
          </>
        )}
      </div>

      <LiveResult changeKey={summary}>{summary}</LiveResult>
      {problems.length === 0 && (
        <>
          <div className="mt-4 space-y-3">
            {clients.map((client, index) => (
              <details
                key={client.id}
                open={index === 0}
                className="tool-details group rounded-xl border border-[#dcecef] bg-white p-3 transition-colors open:border-[#b6ecfb] sm:p-4"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  <h3 className="text-[16px] font-semibold text-[#4e4646]">
                    {client.name}
                  </h3>
                  <span
                    aria-hidden
                    className="text-[#01b4c8] transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <ul className="mt-2 space-y-0.5 text-[13px] leading-5 text-[#526b75]">
                  {client.where.map((place) => (
                    <li key={place} className="break-words font-mono">
                      {place}
                    </li>
                  ))}
                </ul>
                {client.snippets.map((snippet) => (
                  <CodeBlock
                    key={snippet.label}
                    label={snippet.label}
                    code={snippet.code}
                    tool={TOOL}
                  />
                ))}
                {client.note && (
                  <p className="mt-2 text-[13px] leading-5 text-[#526b75]">
                    {client.note}
                  </p>
                )}
              </details>
            ))}
          </div>
        </>
      )}

      {cta}
    </ToolFrame>
  );
}
