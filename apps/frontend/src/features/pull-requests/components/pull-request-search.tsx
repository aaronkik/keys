import { Input } from "@/components/ui/input";

type PullRequestSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

/** Client-side text search over already-loaded pull requests. */
export function PullRequestSearch({ value, onChange }: PullRequestSearchProps) {
  return (
    <Input
      type="search"
      aria-label="Search pull requests"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="max-w-xs"
    />
  );
}
