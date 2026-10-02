import { describe, expect, test } from "vitest";

import { hash } from "./hash";

/**
 * `hash.parse` extracts the fragment ("hash route") of a URL: everything after
 * the first `#`, split into `path` and parsed `query`. A URL without a `#` has
 * no fragment, so all fields are empty.
 */
describe("hash.parse", () => {
  test("parses a fragment path and array query params", () => {
    const result = hash.parse("/#/foo/bar?a[3]=3&a[19]=1.9&a[0]=first&a[99]=9.99&a[5]=false");

    expect(result.path).toBe("/foo/bar");
    expect(result.hash).toBe("/foo/bar?a[3]=3&a[19]=1.9&a[0]=first&a[99]=9.99&a[5]=false");
    expect(result.query.params).toEqual({ a: ["first", 3, false, 1.9, 9.99] });
  });

  test("parses a simple fragment with query params", () => {
    const result = hash.parse("/hash/#b?test=4");

    expect(result.path).toBe("b");
    expect(result.hash).toBe("b?test=4");
    expect(result.query.params).toEqual({ test: 4 });
  });

  test("returns an empty fragment when the URL has no hash", () => {
    const result = hash.parse("/foo/bar?negative=-123&a=1&str=string&b=true");

    expect(result.path).toBe("");
    expect(result.hash).toBe("");
    expect(result.query.params).toEqual({});
  });

  test("returns an empty fragment for empty input", () => {
    const result = hash.parse("");

    expect(result.path).toBe("");
    expect(result.hash).toBe("");
    expect(result.query.params).toEqual({});
  });
});
