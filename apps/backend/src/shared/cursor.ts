/**
 * Cursors are base64url-encoded JSON so callers can treat them as opaque
 * strings: what a page is addressed by stays a server-side concern, and it can
 * change without the client noticing.
 */
type CursorPayload = { page: number };

export const encodeCursor = (page: number): string =>
  Buffer.from(JSON.stringify({ page } satisfies CursorPayload)).toString("base64url");

/** Returns the page a cursor points at, or `null` when it cannot be read. */
export const decodeCursor = (cursor: string): number | null => {
  try {
    const { page } = JSON.parse(Buffer.from(cursor, "base64url").toString()) as CursorPayload;
    return Number.isInteger(page) && page >= 1 ? page : null;
  } catch {
    return null;
  }
};
