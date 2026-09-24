// tests/tool-annotations.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { makeLibrary } from "./fixtures/gen-library.js";
import { createServer } from "../src/server.js";

// Same per-file connectedClient pattern as server.test.ts and
// write-tool.test.ts; there is no shared helper in this repo.
const openServers: { dispose(): void }[] = [];
const dirs: string[] = [];
async function toolsList(allowWrites: boolean) {
  const dir = mkdtempSync(join(tmpdir(), "ann-"));
  dirs.push(dir);
  makeLibrary(dir, { tracks: 4 });
  const server = await createServer({
    roots: [dir],
    sidecarBaseDir: join(dir, "sc"),
    backupBaseDir: join(dir, "b"),
    allowWrites,
  });
  openServers.push(server);
  const client = new Client({ name: "test-client", version: "0" });
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const { tools } = await client.listTools();
  await client.close();
  return tools;
}
afterEach(() => {
  for (const s of openServers.splice(0)) s.dispose();
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

type Hints = { readOnlyHint: boolean; destructiveHint: boolean; idempotentHint: boolean; openWorldHint: boolean };
const READ: Hints = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

/**
 * What every tool claims about itself, in full. Clients act on these: a
 * readOnlyHint lets a call through without asking, destructiveHint: false
 * says "additive only", and catalogs (the Claude Desktop directory among
 * them) reject a tool without a title or without these hints. Listing the
 * whole table rather than spot-checking means a new tool fails here until
 * someone has decided what it is.
 */
const EXPECTED: Record<string, Hints> = {
  search_tracks: READ,
  get_tracks: READ,
  get_playlists: READ,
  get_playlist_tracks: READ,
  get_track_performance: READ,
  audit_library: READ,
  run_sql: READ,
  list_libraries: READ,
  refresh_index: READ,
  create_playlist: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  add_tracks_to_playlist: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  remove_tracks_from_playlist: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  reorder_playlist: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  update_track_metadata: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
};

describe("tool annotations in tools/list", () => {
  for (const allowWrites of [false, true]) {
    it(`gives every tool a title and all four hints${allowWrites ? " with --allow-writes" : ""}`, async () => {
      const tools = await toolsList(allowWrites);
      const expectedNames = Object.entries(EXPECTED)
        .filter(([, h]) => allowWrites || h.readOnlyHint)
        .map(([n]) => n)
        .sort();
      expect(tools.map((t) => t.name).sort()).toEqual(expectedNames);
      for (const tool of tools) {
        expect(tool.title?.trim(), `${tool.name} needs a title`).toBeTruthy();
        const a = tool.annotations ?? {};
        expect(
          {
            readOnlyHint: a.readOnlyHint,
            destructiveHint: a.destructiveHint,
            idempotentHint: a.idempotentHint,
            openWorldHint: a.openWorldHint,
          },
          tool.name,
        ).toEqual(EXPECTED[tool.name]);
      }
    });
  }
});
