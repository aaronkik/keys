import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

import { ErrorAlert } from "@/components/error-alert";
import { buttonVariants } from "@/components/ui/button";

/**
 * Router-level boundary for anything that throws during render. Without it a
 * throw takes the whole document blank; with it the user keeps a way out.
 * The thrown error is logged rather than shown, since its message is written
 * for whoever reads the console.
 */
export function ErrorFallback({ error, reset }: ErrorComponentProps) {
  console.error(error);

  return (
    <main className="p-6">
      <ErrorAlert
        title="Something went wrong."
        description="This page could not be displayed."
        onRetry={reset}
        retryLabel="Reload this page"
      />
    </main>
  );
}

export function NotFound() {
  return (
    <main className="flex flex-col items-start gap-4 p-6">
      <div>
        <h1 className="text-lg font-medium">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          That page does not exist, or it has been moved.
        </p>
      </div>

      <Link to="/" className={buttonVariants({ variant: "outline" })}>
        Back to pull requests
      </Link>
    </main>
  );
}
