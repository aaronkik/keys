import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ListPullRequestsState } from "./generated/models";

export type PullRequestFilterValue = Extract<ListPullRequestsState, "open" | "closed">;

type PullRequestFilterProps = {
  value: PullRequestFilterValue | undefined;
  onChange: (value: PullRequestFilterValue | undefined) => void;
};

/** Sentinel select value representing "no filter" — Select always needs a
 * defined value to render as controlled, and this is also the option that
 * lets a user clear a previously-selected filter (a radiogroup has no such
 * affordance once a radio is checked). */
const ALL_VALUE = "all";

const OPTIONS: Array<{ value: typeof ALL_VALUE | PullRequestFilterValue; label: string }> = [
  { value: "closed", label: "Closed" },
  { value: "open", label: "Open" },
  { value: ALL_VALUE, label: "All" },
];

// Lets <SelectValue> resolve the trigger's displayed label from the current
// value without needing the (portalled, closed-by-default) popup mounted.
const ITEMS = Object.fromEntries(OPTIONS.map((option) => [option.value, option.label]));

export function PullRequestFilter({ value, onChange }: PullRequestFilterProps) {
  return (
    <Select
      items={ITEMS}
      value={value ?? ALL_VALUE}
      onValueChange={(next) => {
        onChange(next === "open" || next === "closed" ? next : undefined);
      }}
    >
      <SelectTrigger aria-label="Filter by state" className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
