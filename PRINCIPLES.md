# Principles

The first section is how Venut Technologies builds software; it is shared by every project. The second is what this project guarantees to its users and what it refuses to do.

<!-- venut-common-principles:start -->
## How Venut Technologies builds software

These principles apply to every Venut Technologies repository and to everyone who works in one, human or agent. They describe how we build and maintain software; what each product guarantees to its users is stated separately below them.

1. **Documentation tells the truth.** The README states what the project does, for whom, how mature it is, what is supported, and where it stops. Status, compatibility, and limitations are written from what was verified, never from what is planned. No invented adoption, metrics, or endorsements.
2. **Evidence over assumptions.** A claim that something works is backed by running it: the real command, the real environment, the real data or a faithful copy of it. A passing unit test, a mock, a simulator, or "it should work" is not evidence of production behavior. Say what was verified, how, and what was not.
3. **Boundaries are explicit.** What is supported, what is not, and what happens on the unsupported path are written down and tested. Unsupported input, platform, or state fails closed with a clear message; it never guesses, silently degrades, or pretends to succeed.
4. **Small changes with a stated intent.** One task, one branch, focused commits whose messages say why, not just what. No drive-by refactors, no unrelated fixes bundled in, no rewriting what was not asked for. When the task turns out to need more, say so before expanding it.
5. **Secrets and personal data never enter the repository.** No tokens, keys, passwords, signed URLs, or `.env` contents in code, configuration, fixtures, tests, documentation, commit messages, or agent output. No real user data, real library contents, personal file paths, or private email addresses in fixtures and examples: test data is synthetic. If something slips in, it is rotated and removed from reachable history, not just deleted in a later commit.
6. **Respect the ecosystems we touch.** Third-party software, services, formats, and trademarks are named accurately, with an explicit "not affiliated" where the name could imply otherwise. Their data is read and written only through documented or carefully verified paths, never in a way that can corrupt it or violate their terms. Their licences and attribution requirements are followed.
7. **Security issues are visible.** Every public repository has a `SECURITY.md` pointing to `security@venut.tech` for anyone who prefers to report privately. Once a problem is confirmed, it is made public promptly as an issue or advisory with its impact and status, even before a fix exists, so that users can decide for themselves. Small and experimental projects do not promise response times, and say so honestly.
8. **A person decides the irreversible.** An agent or a script does not push to a shared branch, publish a package, make a repository public, rewrite history, delete data, or deploy to a live environment on its own initiative. Each of these happens only on an explicit instruction from the owner for that specific action, and the instruction is recorded where the action is recorded.
<!-- venut-common-principles:end -->

## engine-dj-mcp principles

What this server guarantees about your Engine DJ library. Each one is enforced in
code and covered by tests; where a guarantee rests on a measurement rather than on
code, the README says what was measured and when.

1. **The library is opened read-only at the operating-system level.** Every
   connection this server opens for reading passes SQLite's `readOnly` flag and a
   `?mode=ro` URI, so a write is refused by SQLite itself, not by a convention or
   by a `PRAGMA` that a query could turn back off.
2. **Without `--allow-writes` the server has no tool that can write.** The write
   tools are not registered at all, so there is nothing for a model to call and
   nothing to talk it out of: the server offers 9 tools instead of 14. No file is
   created inside your `Engine Library` folder in that mode.
3. **A write changes only the rows the tool documents.** The five write tools
   touch `Playlist`, `PlaylistEntity` and `Track` rows and nothing else: no cue,
   beatgrid, play count, title, artist, album, file path, or audio file is ever
   written, and `update_track_metadata` writes only genre, comment, label, year
   and rating on the tracks it was given.
4. **Every write is reversible, and says so when it is not.** Each result carries
   `undo` — the exact tool call that reverses that edit — and `undo_complete`. The
   one edit that cannot be reversed, removing a playlist entry whose track is
   missing from the library, returns `undo_complete: false` and names the
   positions rather than reporting a clean undo it cannot deliver.
5. **The whole database is snapshotted before the first write of a session.**
   Snapshots live in `~/.engine-dj-mcp/backups/`, outside your `Engine Library`
   folder, ten per library file, and every write of that session returns the path.
6. **The only file ever created inside `Engine Library` is SQLite's own rollback
   journal**, for the length of one transaction, and it is what makes a write
   all-or-nothing. If a journal is left behind, the server refuses to touch that
   library at all — including for reads — with `library_needs_recovery`, rather
   than working around a database that Engine DJ has not finished recovering.
7. **A write never guesses which disk to change.** With more than one supported
   library connected, or when the `library` given is a uuid that copies on two
   drives share, the write is refused with `ambiguous_library`, lists the
   candidates and changes nothing — because one of those drives may be the one
   you perform from.
8. **The `run_sql` escape hatch cannot escape read-only.** It runs on the same
   kernel-level read-only connection, accepts a single statement (chained
   statements, `VACUUM`, `ATTACH` and `DETACH` are refused), and bounds its own
   result set whatever the query asks for.
