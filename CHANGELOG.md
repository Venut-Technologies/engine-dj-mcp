# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Before 1.0 a MINOR
may change behaviour; a PATCH never does.

Entries describe what changed for someone using the server. Versions up to
0.17.1 were written from the release tags and the commits between them, after
the fact; from 0.17.2 onward every user-visible change is recorded here in the
commit that makes it.

## [Unreleased]

### Added

- `PRINCIPLES.md`: the guarantees this server makes about an Engine DJ library —
  read-only at the operating-system level, what a write may touch, what an undo
  covers — linked from the README.
- This changelog, and a tag-driven release workflow: pushing a `vX.Y.Z` tag runs
  the full suite on the tagged commit, creates the GitHub Release from the
  changelog entry, and publishes to npm with provenance.
- `server.json`, the entry for the official MCP Registry: the npm package, run
  over stdio, and the optional `--allow-writes` flag described as it works. A
  test keeps its version and name in step with `package.json`.
- Each release is also published to the official MCP Registry, from the
  release workflow and with GitHub's OIDC token, once npm has the version.
- `PRIVACY.md`: what the server reads, what it writes and where, and that it
  makes no network connections and has no telemetry.

### Changed

- The README states the project's status and the minimum Node and Engine DJ
  versions it has been checked against.
- Every tool now also declares `openWorldHint: false`: none of them reaches a
  network service. Together with the title and the read-only, destructive and
  idempotent hints each tool already carried, a client or catalog can see what
  every tool does before it is called; a test now checks the full set.
- The npm description and keywords now say what a DJ can do with the server,
  and `package.json` carries `mcpName`
  (`io.github.Venut-Technologies/engine-dj-mcp`), the name under which the
  official MCP Registry will list it.

## [0.17.1] - 2026-09-16

### Fixed

- A write naming a library by a uuid that two connected libraries share is now
  refused with `ambiguous_library`, listing each path, instead of landing on
  whichever drive was found first. Copying an `Engine Library` folder onto a
  second drive copies its uuid, so a spare stick and the original are one uuid
  with two disks behind it, and one of them may be the drive you perform from.
  Pass the path to choose between them ([#14]).
- The drives are scanned again before every write, not only when `library` is
  omitted. A copy plugged in mid-session is now counted, and a library swapped
  out at a path the server had cached is refused rather than written through the
  uuid of the library that used to be there ([#14]).
- A write that names a library which is not connected reports
  `detail: "not_committed"`, as the write contract promises, instead of prose.

### Changed

- Both write refusals now tell the caller to re-read ids, positions and current
  values from the library they chose: an earlier read may have come from the
  other copy.
- Repository links point at `Venut-Technologies/engine-dj-mcp` after the
  organisation was renamed. The package name is unchanged.

## [0.17.0] - 2026-09-15

### Added

- `update_track_metadata`, behind `--allow-writes`: edit genre, comment, label,
  year and rating on up to 200 tracks in one all-or-nothing call, with a
  complete `undo` and optional `expect` guards that refuse the write if a track
  changed since you read it. It writes to the library database only, never to
  the audio files' own tags ([#12]).
- Edited tracks are marked for sync the same way Engine DJ marks its own tag
  edits (`isMetadataOfPackedTrackChanged`), measured 2026-09-15. Whether an
  explicit sync to a drive then carries the edit has not been measured, and the
  README says so.

## [0.16.0] - 2026-09-14

### Fixed

- `search_tracks` filters ratings in stars (0–5), which is what the README
  always described; it had been comparing against Engine's raw 0–100 scale.
- Each `undo` step names the library it must be replayed into, so replaying a
  step verbatim goes back to the library the edit was made in rather than to
  whatever the default is at replay time.

### Changed

- A write refuses with `ambiguous_library` whenever more than one supported
  library is connected, whatever their track counts. It previously refused only
  an exact tie, so importing one track on one side was enough for a write to
  pick a disk on its own.

## [0.15.0] - 2026-09-11

### Added

- `audit_library` check `path_form_mismatch`: files whose names are stored in a
  different Unicode form than the filesystem holds. macOS opens them; a player
  on a case-insensitive but form-sensitive filesystem would not.

## [0.14.0] - 2026-09-11

### Added

- Streaming columns (`streaming_source`, `streaming_flags`, `uri`) as opt-in
  fields on `search_tracks` and `get_tracks`, with `uri` redacted.

### Fixed

- A pre-write snapshot is written under a temporary name and renamed into place,
  so an interrupted copy can never be mistaken for a usable snapshot, and the
  journal left beside a dead copy is reclaimed.
- The duplicates check finds names that differ only in case outside ASCII.

## [0.13.0] - 2026-09-01

### Added

- Every write result carries a `library` field naming the uuid and path of the
  library the write landed in.

### Changed

- A write refuses with `ambiguous_library` when two connected libraries tie for
  the default, and asks you to choose rather than choosing for you. The drives
  are re-scanned first, so a drive that has been unplugged no longer counts.
- The README documents what an `undo` covers: it reverses the edit in one
  library, and Engine DJ may have copied that edit to another connected library
  where no undo can reach it (measured 2026-09-01).

## [0.12.0] - 2026-08-24

### Added

- `add_tracks_to_playlist`, `remove_tracks_from_playlist` and `reorder_playlist`
  behind `--allow-writes`. Each returns the exact call that reverses it, and
  refuses outright if the playlist's entry chain is already damaged rather than
  repairing it.
- `remove_tracks_from_playlist` and `reorder_playlist` are advertised to clients
  as destructive, so a client can ask before calling them.

### Fixed

- `undo` is no longer offered for a removal that cannot be replayed: removing an
  entry whose track is missing from the library returns `undo_complete: false`
  and names the positions.
- A playlist whose tracks carry a NULL `databaseUuid` no longer collides in the
  duplicate check.

## [0.11.3] - 2026-08-24

### Fixed

- Test-suite failures that only appeared off the author's laptop, found by the
  first CI run. No change to server behaviour.

## [0.11.2] - 2026-08-24

### Changed

- The README describes what the project is now, rather than what it started as.

## [0.11.1] - 2026-08-24

### Fixed

- Follow-ups from the write path's review, including coverage of the commit flag
  that reports whether a failed write had already been committed.

## [0.11.0] - 2026-08-23

### Added

- `create_playlist`, the first write tool, behind `--allow-writes`.
- Before the first write of a session the whole database is snapshotted, and
  every write of that session returns `backup_path`. Ten snapshots are kept per
  library file.
- A library with an unrecovered SQLite journal is refused with
  `library_needs_recovery` — including for reads — until Engine DJ has been
  launched once to roll it back.

### Fixed

- A write that failed at or after `COMMIT` now says so: `detail` distinguishes
  "nothing was written" from "this may have landed and could not be verified".

## [0.10.0] - 2026-08-22

### Added

- `get_playlists` and `get_playlist_tracks`, and a playlist filter on
  `search_tracks`.

### Fixed

- Playlist entries are resolved by the track's origin identity rather than by
  row id, so entries still resolve after Engine DJ renumbers them.
- Saved loops are decoded against a layout verified on a real library.

## [0.9.2] - 2026-08-21

### Added

- `library_unreadable`, no longer conflated with `unsupported_schema`: a library
  that cannot be read right now is told apart from one this server cannot
  support at all.

### Changed

- `list_libraries` no longer forces an index build, so listing libraries is
  cheap and works while another library is busy.

## [0.9.1] - 2026-08-21

### Fixed

- The server reported a version in its MCP server info that had drifted from the
  package. Name and version now come from `package.json`, so a client always
  sees the version it installed.

## [0.9.0] - 2026-08-21

### Added

- Every tool takes an optional `library` argument, so a machine with more than
  one Engine DJ library can be asked for a specific one.
- Cues, beatgrids and loops are decoded from Engine's performance data, using
  layouts measured on a real library.

### Fixed

- Library discovery dropped every real library by reading `Information` without
  BigInt support.
- The `no_cues` audit check means "this track has a cue set", as its name says.

[#12]: https://github.com/Venut-Technologies/engine-dj-mcp/issues/12
[#14]: https://github.com/Venut-Technologies/engine-dj-mcp/issues/14
[Unreleased]: https://github.com/Venut-Technologies/engine-dj-mcp/compare/v0.17.1...HEAD
[0.17.1]: https://github.com/Venut-Technologies/engine-dj-mcp/compare/v0.17.0...v0.17.1
[0.17.0]: https://github.com/Venut-Technologies/engine-dj-mcp/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/Venut-Technologies/engine-dj-mcp/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/Venut-Technologies/engine-dj-mcp/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/Venut-Technologies/engine-dj-mcp/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/Venut-Technologies/engine-dj-mcp/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/Venut-Technologies/engine-dj-mcp/compare/v0.11.3...v0.12.0
[0.11.3]: https://github.com/Venut-Technologies/engine-dj-mcp/compare/v0.11.2...v0.11.3
[0.11.2]: https://github.com/Venut-Technologies/engine-dj-mcp/compare/v0.11.1...v0.11.2
[0.11.1]: https://github.com/Venut-Technologies/engine-dj-mcp/compare/v0.11.0...v0.11.1
[0.11.0]: https://github.com/Venut-Technologies/engine-dj-mcp/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/Venut-Technologies/engine-dj-mcp/compare/v0.9.2...v0.10.0
[0.9.2]: https://github.com/Venut-Technologies/engine-dj-mcp/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/Venut-Technologies/engine-dj-mcp/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/Venut-Technologies/engine-dj-mcp/releases/tag/v0.9.0
