import { Badge } from "@/components/ui/badge";

import { formatRelativeTime } from "./format-relative-time";
import type { PullRequest } from "./generated/models";

type PullRequestListItemProps = {
  pullRequest: PullRequest;
  now: Date;
};

const STATE_LABEL: Record<PullRequest["state"], string> = {
  open: "Open",
  closed: "Closed",
};

const STATE_VARIANT: Record<PullRequest["state"], "default" | "secondary"> = {
  open: "default",
  closed: "secondary",
};

export function PullRequestListItem({ pullRequest, now }: PullRequestListItemProps) {
  return (
    <li className="flex items-center gap-3 py-3">
      <img
        src={pullRequest.author.profileImage}
        alt={`Avatar for ${pullRequest.author.username}`}
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-full"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <a href={pullRequest.url} className="truncate font-medium hover:underline">
          {pullRequest.title}
        </a>

        <div className="flex items-center gap-2">
          <Badge data-testid="pr-state" variant={STATE_VARIANT[pullRequest.state]}>
            {STATE_LABEL[pullRequest.state]}
          </Badge>

          <time
            data-testid="pr-updated"
            dateTime={pullRequest.updatedAt}
            className="hidden text-sm text-muted-foreground md:inline"
          >
            {formatRelativeTime(pullRequest.updatedAt, now)}
          </time>
        </div>
      </div>
    </li>
  );
}
