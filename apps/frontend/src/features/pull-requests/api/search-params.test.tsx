import { describe, expect, it } from "vitest";

import { validateSearch } from "./search-params";

describe("validateSearch", () => {
  it("keeps the two known states", () => {
    expect(validateSearch({ state: "open" }).state).toBe("open");
    expect(validateSearch({ state: "closed" }).state).toBe("closed");
  });

  // A bogus deep link is a thing a user can type; it must not reach the query
  // string or throw, it must simply mean "no filter".
  it("drops a state outside the known enum", () => {
    expect(validateSearch({ state: "bogus" }).state).toBeUndefined();
    expect(validateSearch({ state: "all" }).state).toBeUndefined();
    expect(validateSearch({ state: 42 }).state).toBeUndefined();
    expect(validateSearch({}).state).toBeUndefined();
  });

  it("keeps a non-empty query", () => {
    expect(validateSearch({ q: "refactor" }).q).toBe("refactor");
  });

  // Normalising the empty string away is what stops a bare `q=` lingering in
  // the URL after the user clears the search box.
  it("normalises an empty or non-string query away", () => {
    expect(validateSearch({ q: "" }).q).toBeUndefined();
    expect(validateSearch({ q: 42 }).q).toBeUndefined();
    expect(validateSearch({}).q).toBeUndefined();
  });

  it("reads both params together", () => {
    expect(validateSearch({ state: "open", q: "auth" })).toEqual({ state: "open", q: "auth" });
  });
});
