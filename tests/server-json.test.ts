// tests/server-json.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  name: string;
  version: string;
  description: string;
  mcpName: string;
};
const server = JSON.parse(readFileSync(join(root, "server.json"), "utf8")) as {
  name: string;
  description: string;
  version: string;
  packages: { registryType: string; identifier: string; version?: string }[];
};

/**
 * server.json is what release.yml publishes to the official MCP Registry,
 * and the registry checks it against the npm package it names: mcpName in
 * the published package.json must equal `name`, and the version it lists
 * must exist on npm. A release commit that bumps package.json and forgets
 * server.json would publish an npm release and then fail at the registry, or
 * list an old version there. This is the check that stops that on every
 * push, before a tag is ever pushed.
 */
describe("server.json", () => {
  it("names the same server as package.json's mcpName", () => {
    expect(server.name).toBe(pkg.mcpName);
  });

  it("carries the package.json version, at the top and on the npm package", () => {
    expect(server.version).toBe(pkg.version);
    const npm = server.packages.filter((p) => p.registryType === "npm");
    expect(npm).toHaveLength(1);
    expect(npm[0]!.identifier).toBe(pkg.name);
    expect(npm[0]!.version).toBe(pkg.version);
  });

  it("keeps the description within the registry's 100 characters", () => {
    expect(server.description.length).toBeGreaterThan(0);
    expect(server.description.length).toBeLessThanOrEqual(100);
  });
});

/**
 * gemini-extension.json is what the Gemini CLI extensions gallery crawls and
 * what `gemini extensions install <repo url>` reads. It carries its own
 * version, so a release commit that forgot it would list a stale version in
 * the gallery; and its description is package.json's, which is the text the
 * other manifests use, so the three cannot describe three different servers.
 * The server it starts must be the same read-only command every other
 * install path uses: `npx -y engine-dj-mcp`, no `--allow-writes`.
 */
describe("gemini-extension.json", () => {
  const ext = JSON.parse(readFileSync(join(root, "gemini-extension.json"), "utf8")) as {
    name: string;
    version: string;
    description: string;
    mcpServers: Record<string, { command: string; args: string[] }>;
  };
  const plugin = JSON.parse(readFileSync(join(root, ".claude-plugin", "plugin.json"), "utf8")) as {
    mcpServers: Record<string, { command: string; args: string[] }>;
  };

  it("carries the package.json name, version and description", () => {
    expect(ext.name).toBe(pkg.name);
    expect(ext.version).toBe(pkg.version);
    expect(ext.description).toBe(pkg.description);
  });

  it("starts the same read-only server the Claude Code plugin starts", () => {
    expect(ext.mcpServers).toEqual(plugin.mcpServers);
    const [server] = Object.values(ext.mcpServers);
    expect(server!.command).toBe("npx");
    expect(server!.args).toEqual(["-y", pkg.name]);
  });
});
