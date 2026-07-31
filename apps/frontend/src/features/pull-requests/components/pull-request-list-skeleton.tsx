/**
 * One entry per placeholder row: widths only, so the titles read as text of
 * varying length instead of five identical bars. `wrapped` is the second line,
 * rendered only at narrow widths where real titles run onto one.
 */
const PLACEHOLDER_ROWS: Array<{ title: string; wrapped: string }> = [
  { title: "w-full", wrapped: "w-1/3" },
  { title: "w-5/6", wrapped: "w-1/2" },
  { title: "w-full", wrapped: "w-2/5" },
  { title: "w-11/12", wrapped: "w-1/4" },
  { title: "w-full", wrapped: "w-3/5" },
];

/**
 * Mirrors the resolved layout of `PullRequestsPanel`: same toolbar row, same
 * list rows (avatar, title, state badge, timestamp) at the same sizes and
 * breakpoints, so nothing shifts when the data arrives.
 */
export function PullRequestListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">Loading pull requests...</span>

      <div aria-hidden="true" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="h-9 w-28 animate-pulse rounded-3xl bg-muted" />
          <div className="h-9 w-full max-w-xs animate-pulse rounded-3xl bg-muted" />
        </div>

        <div className="flex flex-col divide-y divide-border">
          {PLACEHOLDER_ROWS.map((row) => (
            <div key={row.title + row.wrapped} className="flex items-center gap-3 py-3">
              <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {/* Each h-6 box is one line box of the title text; the bar
                    inside is its cap height. The lines are grouped so only the
                    gap the real item has — title to badge — sits between them. */}
                <div className="flex flex-col">
                  <div className="flex h-6 items-center">
                    <div className={`h-4 animate-pulse rounded bg-muted ${row.title}`} />
                  </div>
                  <div className="flex h-6 items-center md:hidden">
                    <div className={`h-4 animate-pulse rounded bg-muted ${row.wrapped}`} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-5 w-12 animate-pulse rounded-3xl bg-muted" />
                  <div className="hidden h-4 w-24 animate-pulse rounded bg-muted md:block" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
