import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListPullRequestsState } from "@/generated/models";

type PullRequestFilterProps = {
  value: ListPullRequestsState | undefined;
  onChange: (value: ListPullRequestsState | undefined) => void;
};

const OPTIONS: Array<{ value: ListPullRequestsState; label: string }> = [
  { value: "closed", label: "Closed" },
  { value: "open", label: "Open" },
  { value: "all", label: "All" },
];

// Lets <SelectValue> resolve the trigger's displayed label from the current
// value without needing the (portalled, closed-by-default) popup mounted.
const ITEMS = Object.fromEntries(OPTIONS.map((option) => [option.value, option.label]));

export function PullRequestFilter({ value, onChange }: PullRequestFilterProps) {
  return (
    <Select
      items={ITEMS}
      value={value ?? ListPullRequestsState.all}
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
