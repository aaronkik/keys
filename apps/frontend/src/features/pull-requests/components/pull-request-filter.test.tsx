import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PullRequestFilter } from "./pull-request-filter";

afterEach(() => {
  cleanup();
});

describe("PullRequestFilter", () => {
  it("exposes a labelled combobox", () => {
    render(<PullRequestFilter value={undefined} onChange={() => {}} />);

    expect(screen.getByRole("combobox", { name: "Filter by state" })).toBeDefined();
  });

  // Scoped to the value span specifically, not the whole trigger: the
  // trigger also contains a decorative, aria-hidden chevron icon whose
  // fallback glyph leaks into textContent (harmless — aria-hidden content is
  // excluded from the accessible name — but not what these assertions mean
  // to check).
  function valueText(container: HTMLElement) {
    return container.querySelector('[data-slot="select-value"]')?.textContent;
  }

  it("displays 'All' when no filter is selected", () => {
    const { container } = render(<PullRequestFilter value={undefined} onChange={() => {}} />);

    expect(valueText(container)).toBe("All");
  });

  it("displays the current value's label", () => {
    const { container } = render(<PullRequestFilter value="open" onChange={() => {}} />);

    expect(valueText(container)).toBe("Open");
  });

  it("lists Closed, Open, and All as options", () => {
    render(<PullRequestFilter value={undefined} onChange={() => {}} />);

    fireEvent.click(screen.getByRole("combobox", { name: "Filter by state" }));

    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Closed", "Open", "All"]);
  });

  // Base UI's select item only commits a plain `click` event as a selection
  // if a `pointerdown` preceded it on the same item (its guard against a
  // click left over from opening the popup under the cursor); a real mouse
  // interaction always produces both, but fireEvent.click alone only
  // dispatches the click.
  function selectOption(name: string) {
    const option = screen.getByRole("option", { name });
    fireEvent.pointerDown(option);
    fireEvent.click(option);
  }

  it("calls onChange with the selected option's value", () => {
    const onChange = vi.fn();
    render(<PullRequestFilter value={undefined} onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox", { name: "Filter by state" }));
    selectOption("Open");

    expect(onChange).toHaveBeenCalledWith("open");
  });

  it("calls onChange with undefined when 'All' is selected, clearing a prior filter", () => {
    const onChange = vi.fn();
    render(<PullRequestFilter value="closed" onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox", { name: "Filter by state" }));
    selectOption("All");

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PullRequestFilter value={undefined} onChange={() => {}} />);

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
