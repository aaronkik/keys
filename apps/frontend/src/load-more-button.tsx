import { Button } from "@/components/ui/button";

type LoadMoreButtonProps = {
  loading: boolean;
  onClick: () => void;
};

export function LoadMoreButton({ loading, onClick }: LoadMoreButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={loading}
      aria-busy={loading || undefined}
      onClick={onClick}
    >
      Load more pull requests
    </Button>
  );
}
