# Privacy

engine-dj-mcp is a program that runs on your own computer. It has no
account, no server of its own, and no telemetry. This page says what it
reads, what it writes, and what leaves your machine, so you can check each
claim against the code.

## What it reads

- **Your Engine DJ libraries.** It looks for `Engine Library/Database2/m.db`
  in `~/Music` and at the top of every drive under `/Volumes`, and opens each
  one it finds read-only at the operating-system level.
- **Your audio files' existence, not their contents.** `audit_library`'s
  `missing_files` and `path_form_mismatch` checks ask the file system whether
  each track's file is there. No audio is opened or read.

## What it sends, and to whom

- **The server itself makes no network connections.** It talks to your AI
  app only over the standard input and output of the process that app
  started, using the MCP SDK's stdio transport.
- **Your AI app sends what the server returns to its model provider.** A tool
  result — track titles, artists, keys, tempos, playlist names, and whatever
  else you ask about — goes wherever your app sends your conversation, under
  that app's privacy policy, not this one. File paths in results have your
  home folder shortened to `~` by default, so your account name does not go
  along with them.
- **Installing it downloads it.** `npx engine-dj-mcp` fetches the package
  from the npm registry, as any npm install does. That is npm, not this
  server.

## What it writes, and where

- **A search index** in `~/.engine-dj-mcp/`, one folder per library, rebuilt
  from your library when it changes. Deleting the folder is safe; it is
  rebuilt the next time it is needed.
- **Nothing else, unless you start it with `--allow-writes`.** Without that
  flag no tool that writes exists and nothing is created inside your
  `Engine Library` folder.
- **With `--allow-writes`, and only when you ask for an edit:** the playlist
  and track-tag rows that edit changes in your library's `m.db`; a copy of
  the whole database in `~/.engine-dj-mcp/backups/` before the first write of
  a session (ten kept per library); and, for the length of one transaction,
  SQLite's own `m.db-journal` next to `m.db`. The exact rows each tool may
  touch are listed in [PRINCIPLES.md](./PRINCIPLES.md) and in the README.
- **One line to your AI app's log** at startup, saying whether writes are
  enabled. Error messages go to the same log.

## How to check

The source is in this repository. Nothing in `src/` imports `node:http`,
`node:https`, `node:net` or `node:dns`, or calls `fetch`; a search for those
names finds only comments. You can also run the server under a network
monitor such as Little Snitch and watch it make no connections. Questions or a report that something here is wrong:
[open an issue](https://github.com/Venut-Technologies/engine-dj-mcp/issues).
