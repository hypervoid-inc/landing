/**
 * Builds MCP server config for each client from one description of a server.
 *
 * Formats were checked against each client's own documentation on 2026-10-11:
 * modelcontextprotocol.io (Claude Desktop), code.claude.com/docs/en/mcp
 * (Claude Code), cursor.com/docs/context/mcp (Cursor),
 * code.visualstudio.com/docs/copilot/customization/mcp-servers (VS Code), and
 * learn.chatgpt.com/docs/extend/mcp (Codex). Re-check them when a client
 * changes its config shape.
 */

export type McpServer = {
  readonly name: string;
  readonly transport: "local" | "remote";
  readonly command: string;
  /** One argument per line. */
  readonly args: string;
  /** `KEY=value`, one per line. */
  readonly env: string;
  readonly url: string;
  /** `Header-Name: value`, one per line. */
  readonly headers: string;
};

export type ClientId =
  "claude-desktop" | "claude-code" | "cursor" | "vscode" | "codex";

export type ClientSnippet = {
  readonly label: string;
  readonly language: "json" | "bash" | "toml";
  readonly code: string;
};

export type ClientConfig = {
  readonly id: ClientId;
  readonly name: string;
  /** Where the snippet goes, one entry per location. */
  readonly where: readonly string[];
  readonly snippets: readonly ClientSnippet[];
  readonly note?: string;
};

const NAME = /^[A-Za-z0-9_-]+$/;

function lines(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function pairs(raw: string, separator: "=" | ":"): [string, string][] {
  return lines(raw).flatMap((line) => {
    const at = line.indexOf(separator);
    if (at < 1) return [];
    return [[line.slice(0, at).trim(), line.slice(at + 1).trim()]];
  });
}

/** Why this server cannot be written out yet, or an empty list. */
export function serverProblems(server: McpServer): string[] {
  const problems: string[] = [];
  if (!NAME.test(server.name)) {
    problems.push("Name the server with letters, numbers, - or _ only.");
  }
  if (server.transport === "local") {
    if (!server.command.trim()) problems.push("Enter the command to run.");
    if (lines(server.env).length !== pairs(server.env, "=").length) {
      problems.push("Write each environment variable as KEY=value.");
    }
  } else {
    if (!/^https?:\/\/\S+$/.test(server.url.trim())) {
      problems.push("Enter the server URL, starting with https://.");
    }
    if (lines(server.headers).length !== pairs(server.headers, ":").length) {
      problems.push("Write each header as Name: value.");
    }
  }
  return problems;
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/** Single-quotes a shell word only when it needs it. */
function shellWord(word: string): string {
  return /^[\w@%+=:,./-]+$/.test(word)
    ? word
    : `'${word.replaceAll("'", `'"'"'`)}'`;
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function tomlTable(entries: [string, string][]): string {
  return `{ ${entries.map(([key, value]) => `${tomlString(key)} = ${tomlString(value)}`).join(", ")} }`;
}

export function clientConfigs(server: McpServer): ClientConfig[] {
  const name = server.name;
  const command = server.command.trim();
  const args = lines(server.args);
  const env = Object.fromEntries(pairs(server.env, "="));
  const url = server.url.trim();
  const headerPairs = pairs(server.headers, ":");
  const headers = Object.fromEntries(headerPairs);
  const hasEnv = Object.keys(env).length > 0;
  const hasHeaders = headerPairs.length > 0;
  const local = server.transport === "local";

  const stdio = {
    command,
    args,
    ...(hasEnv ? { env } : {}),
  };
  const remote = { url, ...(hasHeaders ? { headers } : {}) };

  // Claude Desktop's config file only starts local processes; remote servers
  // are added as custom connectors in Settings.
  const desktop: ClientConfig = local
    ? {
        id: "claude-desktop",
        name: "Claude Desktop",
        where: [
          "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json",
          "Windows: %APPDATA%\\Claude\\claude_desktop_config.json",
        ],
        snippets: [
          {
            label: "claude_desktop_config.json",
            language: "json",
            code: json({ mcpServers: { [name]: stdio } }),
          },
        ],
        note: "Quit and reopen Claude Desktop after saving.",
      }
    : {
        id: "claude-desktop",
        name: "Claude Desktop",
        where: ["Settings > Connectors > Add > Add custom connector"],
        snippets: [{ label: "Server URL", language: "bash", code: url }],
        note: hasHeaders
          ? "Claude adds remote servers as custom connectors rather than in the config file, and they sign in with OAuth. If your server only accepts a fixed header like an API key, use one of the other clients below."
          : "Claude adds remote servers as custom connectors rather than in the config file, and they sign in with OAuth when the server asks.",
      };

  const cliEnv = Object.entries(env).map(
    ([key, value]) => `--env ${shellWord(`${key}=${value}`)}`,
  );
  const claudeCli = local
    ? // `--env` takes several pairs, so `--transport` sits between it and the
      // name or the CLI reads the name as another pair.
      [
        "claude mcp add",
        ...cliEnv,
        "--transport stdio",
        shellWord(name),
        "--",
        shellWord(command),
        ...args.map(shellWord),
      ].join(" ")
    : [
        "claude mcp add --transport http",
        shellWord(name),
        shellWord(url),
        ...headerPairs.map(
          ([key, value]) => `--header ${shellWord(`${key}: ${value}`)}`,
        ),
      ].join(" ");

  const codexLines = local
    ? [
        `[mcp_servers.${name}]`,
        `command = ${tomlString(command)}`,
        `args = [${args.map(tomlString).join(", ")}]`,
        ...(hasEnv
          ? ["", `[mcp_servers.${name}.env]`].concat(
              Object.entries(env).map(
                ([key, value]) => `${tomlString(key)} = ${tomlString(value)}`,
              ),
            )
          : []),
      ]
    : [
        `[mcp_servers.${name}]`,
        `url = ${tomlString(url)}`,
        ...(hasHeaders ? [`http_headers = ${tomlTable(headerPairs)}`] : []),
      ];

  return [
    desktop,
    {
      id: "claude-code",
      name: "Claude Code",
      where: [
        "Run the command in your project, or commit .mcp.json at the project root to share it",
      ],
      snippets: [
        { label: "Terminal", language: "bash", code: claudeCli },
        {
          label: ".mcp.json",
          language: "json",
          code: json({
            mcpServers: {
              [name]: local ? stdio : { type: "http", ...remote },
            },
          }),
        },
      ],
    },
    {
      id: "cursor",
      name: "Cursor",
      where: [
        "This project: .cursor/mcp.json",
        "Every project: ~/.cursor/mcp.json",
      ],
      snippets: [
        {
          label: "mcp.json",
          language: "json",
          code: json({
            mcpServers: {
              [name]: local ? { type: "stdio", ...stdio } : remote,
            },
          }),
        },
      ],
    },
    {
      id: "vscode",
      name: "VS Code",
      where: ["This workspace: .vscode/mcp.json"],
      snippets: [
        {
          label: ".vscode/mcp.json",
          language: "json",
          code: json({
            servers: {
              [name]: local
                ? { type: "stdio", ...stdio }
                : { type: "http", ...remote },
            },
          }),
        },
      ],
    },
    {
      id: "codex",
      name: "Codex",
      where: [
        "Every project: ~/.codex/config.toml",
        "A trusted project: .codex/config.toml",
      ],
      snippets: [
        { label: "config.toml", language: "toml", code: codexLines.join("\n") },
      ],
    },
  ];
}
