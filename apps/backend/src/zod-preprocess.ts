/**
 * Query strings are always strings, but the contract declares `limit` as an
 * int32. Orval's `coerce` option cannot express this: it only coerces zod's
 * built-in coercible types, and zod 4 has no `z.coerce.int` for `int32` to
 * map onto. So the numeric query parameters are converted before validation.
 *
 * The allow-list is deliberate. Coercing every numeric-looking string would
 * also convert opaque values such as `cursor`, which the contract types as a
 * string, and validation would then reject them.
 */
const NUMERIC_QUERY_PARAMS = new Set(["limit"]);

export const coerceNumericQuery = (value: unknown): unknown => {
  if (typeof value !== "object" || value === null) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (!NUMERIC_QUERY_PARAMS.has(key) || typeof entry !== "string") {
        return [key, entry];
      }
      const asNumber = Number(entry);
      return [key, Number.isFinite(asNumber) ? asNumber : entry];
    }),
  );
};
