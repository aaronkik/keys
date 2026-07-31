import type { PullRequest } from "@/generated/models";

import { PullRequestListItem } from "./pull-request-list-item";

type PullRequestListProps = {
  items: PullRequest[];
};

export function PullRequestList({ items }: PullRequestListProps) {
  return (
    <ul aria-label="Pull requests" className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <PullRequestListItem key={item.id} pullRequest={item} />
      ))}
    </ul>
  );
}
