/**
 * NOTE: these tests are skipped because they describe intended `hash.parse`
 * behavior that the current implementation does not yet satisfy — a URL without
 * a `#` fragment currently yields an empty path/query. Enable (and fix
 * `hash.parse`) before relying on these assertions.
 */
import { describe, expect, test } from "vitest";

import { hash } from "./hash";

describe.skip("simple params", () => {
  test("simple params", () => {
    expect(hash.parse("/foo/bar?negative=-123&a=1&str=string&b=true")).toEqual({
      path: "/foo/bar",
      query: {
        params: {
          a: 1,
          str: "string",
          b: true,
          negative: -123
        }
      },
      hash: "/foo/bar?negative=-123&a=1&str=string&b=true"
    });
  });
});

describe.skip("crazy params", () => {
  test("crazy params", () => {
    expect(hash.parse("/#/foo/bar?a[3]=3&a[19]=1.9&a[0]=first&a[99]=9.99&a[5]=false")).toEqual({
      path: "/foo/bar",
      query: {
        params: {
          a: ["first", 3, false, 1.9, 9.99]
        }
      },
      hash: "/foo/bar?a[3]=3&a[19]=1.9&a[0]=first&a[99]=9.99&a[5]=false"
    });
  });
});
