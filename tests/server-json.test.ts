// tests/server-json.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  name: string;
  version: string;
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
