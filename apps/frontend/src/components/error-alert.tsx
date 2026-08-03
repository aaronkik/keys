import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ErrorAlertProps = {
  title: string;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
};

/**
 * The single way this app tells a user something failed. Deliberately shows a
 * written explanation rather than the thrown error's message, which is written
 * for whoever is reading the logs, not for whoever is reading the screen.
 */
export function ErrorAlert({
  title,
  description,
  onRetry,
  retryLabel = "Try again",
}: ErrorAlertProps) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      {description !== null ? <AlertDescription>{description}</AlertDescription> : null}

      {onRetry ? (
        <div className="mt-3">
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </Alert>
  );
}
