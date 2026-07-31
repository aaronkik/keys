import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PullRequestSearch } from "./pull-request-search";

afterEach(() => {
  cleanup();
});

describe("PullRequestSearch", () => {
  it("exposes a labelled search box carrying the given value", () => {
    render(<PullRequestSearch value="refactor" onChange={() => {}} />);

    const input = screen.getByRole("searchbox", { name: "Search pull requests" });
    expect((input as HTMLInputElement).value).toBe("refactor");
  });

  it("calls onChange with the typed value", () => {
    const onChange = vi.fn();
    render(<PullRequestSearch value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search pull requests" }), {
      target: { value: "auth" },
    });

    expect(onChange).toHaveBeenCalledWith("auth");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PullRequestSearch value="" onChange={() => {}} />);

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
