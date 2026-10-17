export const ERROR_CODES = [
  "library_busy",
  "library_not_found",
  // The library was found and opened, but a read against it failed for a
  // reason that has nothing to do with schema version -- corruption, a
  // permissions problem, an oversized column node:sqlite refuses to convert.
  // Distinct from unsupported_schema (below), which is specifically "this
  // version is outside the allowlist", and from library_needs_recovery,
  // which is specifically a hot journal: discovery.ts checks for that first
  // and reports it precisely, so this is only the remainder. Previously
  // every one of these landed on unsupported_schema, which sent debugging
  // toward "check the schema version" for a failure that was never about
  // the schema at all.
  "library_unreadable",
  "unsupported_schema",
  "query_timeout",
  "query_process_crashed",
  "index_stale",
  "decode_failed",
  "invalid_argument",
  "library_needs_recovery",
  // Write-path codes. There is no writes_not_enabled code: the tool is not
  // registered at all without --allow-writes, and the MCP SDK's own
  // dispatcher rejects a call to an unregistered tool name before any
  // handler in this project runs, so this project never gets the chance to
  // report that condition itself.
  "playlist_exists",
  "unknown_track",
  "duplicate_track",
  // Editing an existing playlist. playlist_chain_damaged is the one that
  // matters: a chain with a cycle or a severed link cannot be edited without
  // making it worse, and the edit would not notice.
  "playlist_chain_damaged",
  "playlist_not_found",
  "invalid_position",
  // A write cannot tell which physical library to change: no `library` was
  // passed and more than one supported library is connected, or the uuid
  // passed is shared by copies on different drives. Its own code rather than
  // invalid_argument because the useful client response is specific: ask
  // which drive, then retry with its path. Only writes raise it; see
  // library-select.ts for why reads still choose.
  "ambiguous_library",
  // update_track_metadata (spec §7.2). stale_value: an `expect` no longer
  // matches what is in the library. track_not_editable: this track, or one
  // field of it, cannot be edited without harm -- an empty origin the Track
  // trigger would rewrite, or a stored value this tool could not restore.
  // Not unknown_track: the track exists, and telling a model it does not sends
  // it back to search for a track it will find again.
  "stale_value",
  "track_not_editable",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface EngineError {
  error: ErrorCode;
  message: string;
  /**
   * Free text almost everywhere (store/index-manager.ts passes a raw
   * `e.message` through it), with one exception that is part of the tool
   * contract: on an error from the write path (store/write.ts) this is
   * always exactly `"not_committed"` -- the library is byte-for-byte what it
   * was -- or `"committed_unverified"` -- the write may have landed and could
   * not be confirmed, and `backup_path` below is then set. Those two strings
   * are reserved on that path and must stay stable, because a client reads
   * them to decide whether their library changed.
   */
  detail?: string;
  retry_after_ms?: number;
  /**
   * Path to a pre-write snapshot the caller can restore from. Only ever set
   * by the write path, and only on the errors a client cannot safely ignore:
   * `detail === "committed_unverified"`. It is a whole-database snapshot, so
   * restoring it is a recovery route for a damaged library and not an undo
   * of one playlist -- it reverts everything Engine DJ wrote since it was
   * taken.
   */
  backup_path?: string;
  /**
   * Set only on stale_value: every `expect` that no longer matched, capped at
   * 20 entries (the message carries the total). Structured so a caller can
   * tell the user precisely which tracks and fields changed instead of
   * parsing prose -- not so it can re-read and retry: the track changed
   * after `expect` was read, and overwriting that silently, without the
   * user's consent, is exactly what stale_value refuses.
   */
  mismatches?: { id: number; field: string; expected: string | number | null; actual: string | number | null }[];
}

export function err(
  error: ErrorCode,
  message: string,
  extra: Omit<EngineError, "error" | "message"> = {},
): EngineError {
  return { error, message, ...extra };
}

/**
 * The two values `detail` may hold on an error a write tool returns. Part of
 * the tool contract (see `detail` above); store/write.ts produces them, and
 * forWritePath below is what makes every other error reaching a write tool's
 * caller conform.
 */
export const NOT_COMMITTED = "not_committed";
export const COMMITTED_UNVERIFIED = "committed_unverified";

/**
 * Makes an error fit the write-path contract on `detail`.
 *
 * A write tool answers with errors from several layers that never meant to
 * speak that contract: library selection (`library_not_found` with no
 * `detail` at all when nothing is connected), the index manager (an
 * `unsupported_schema` whose `detail` listed the supported versions, a
 * `library_not_found` carrying a raw ENOENT string), playlist resolution (an
 * `invalid_argument` whose `detail` lists the candidate playlists). Each tool
 * description promises that `detail` is one of the two reserved strings on
 * any error, and a client that reads it to learn whether the library changed
 * cannot be asked to also know which layer an error came from.
 *
 * Anything the write path itself produced already carries one of the two
 * strings and passes through untouched. For the rest, `not_committed` is the
 * truth by construction: the only code that runs after a COMMIT is in
 * withWriteTransaction, and every error it can return from there is already
 * marked `committed_unverified`. Whatever prose `detail` held moves into
 * `message`, so a person still sees it.
 */
export function forWritePath(e: EngineError): EngineError {
  if (e.detail === NOT_COMMITTED || e.detail === COMMITTED_UNVERIFIED) return e;
  const prose = e.detail?.trim();
  const message =
    prose && !e.message.includes(prose) ? `${e.message.replace(/[.\s]+$/, "")}. ${prose}` : e.message;
  return { ...e, message, detail: NOT_COMMITTED };
}

/**
 * The single source for this text. It was previously written out by hand in
 * three files, and the one place that built a structured error (connections.ts)
 * threw away everything but `.message` -- forcing query-client.ts to re-stat
 * the disk to work out which condition it was looking at.
 */
export const LIBRARY_NEEDS_RECOVERY_MESSAGE =
  "The Engine library was closed uncleanly and has an unrecovered journal. " +
  "Launch Engine DJ once so it can recover the library, then retry.";

export function libraryNeedsRecovery(): EngineError {
  return err("library_needs_recovery", LIBRARY_NEEDS_RECOVERY_MESSAGE);
}

/**
 * An EngineError travelling as an exception, for the one place that has to
 * throw: openQueryConnection runs inside the forked worker, where a return
 * value has nowhere to go. The structured error rides along intact --
 * across the IPC boundary too, since the worker forwards `engineError` in
 * its startup-failure message -- so no caller has to re-derive the condition
 * by string-matching a message or by going back to the filesystem.
 */
export class EngineErrorException extends Error {
  constructor(readonly engineError: EngineError) {
    super(engineError.message);
    this.name = "EngineErrorException";
  }
}

export function isEngineError(value: unknown): value is EngineError {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.message === "string" &&
    typeof v.error === "string" &&
    (ERROR_CODES as readonly string[]).includes(v.error)
  );
}
