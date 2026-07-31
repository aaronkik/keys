import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoadMoreButton } from "./load-more-button";

afterEach(() => {
  cleanup();
});

describe("LoadMoreButton", () => {
  it("exposes an accessible name and invokes onClick", () => {
    const onClick = vi.fn();
    render(<LoadMoreButton loading={false} onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Load more pull requests" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is enabled and not busy when idle", () => {
    render(<LoadMoreButton loading={false} onClick={() => {}} />);

    const button = screen.getByRole("button", { name: "Load more pull requests" });
    expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(button.getAttribute("aria-busy")).toBeNull();
  });

  it("communicates a busy state via aria-busy and disabled without changing its accessible name", () => {
    render(<LoadMoreButton loading={true} onClick={() => {}} />);

    // Same query as the idle case: a locator bound to this name must still
    // find the button while busy, since callers hold onto one locator across
    // the loading transition rather than re-querying by a different name.
    const button = screen.getByRole("button", { name: "Load more pull requests" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("has no accessibility violations while idle or busy", async () => {
    const idle = render(<LoadMoreButton loading={false} onClick={() => {}} />);
    expect(await axe.run(idle.container)).toHaveNoViolations();
    idle.unmount();

    const busy = render(<LoadMoreButton loading={true} onClick={() => {}} />);
    expect(await axe.run(busy.container)).toHaveNoViolations();
  });
});
