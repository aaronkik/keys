import { formatDistanceToNow } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { PullRequest } from "@/generated/models";

type PullRequestListItemProps = {
  pullRequest: PullRequest;
};

const STATE_LABEL: Record<PullRequest["state"], string> = {
  open: "Open",
  closed: "Closed",
};

const STATE_VARIANT: Record<PullRequest["state"], "default" | "secondary"> = {
  open: "default",
  closed: "secondary",
};

export function PullRequestListItem({ pullRequest }: PullRequestListItemProps) {
  const { author } = pullRequest;

  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar>
        <AvatarImage
          src={author.profileImage}
          alt={`Avatar for ${author.username}`}
          width={32}
          height={32}
        />
        <AvatarFallback aria-hidden="true">
          {author.username.slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <a href={pullRequest.url} className="font-medium hover:underline">
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
            {formatDistanceToNow(new Date(pullRequest.updatedAt), { addSuffix: true })}
          </time>
        </div>
      </div>
    </li>
  );
}
