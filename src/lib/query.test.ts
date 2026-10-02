import { describe, expect, test } from "vitest";

import { Query } from "./query.svelte";

describe("query", () => {
  test("should create a query object from a string", () => {
    expect(new Query("b=2&a=false&c=str").params).toEqual({ a: false, b: 2, c: "str" });
  });

  test("should create a query object from a string", () => {
    expect(new Query("nonarray=1&a[3]=3&a[19]=1.9&a[0]=first&a[99]=9.99&a[5]=false").params).toEqual({
      nonarray: 1,
      a: ["first", 3, false, 1.9, 9.99]
    });
  });
});

describe("Query.test", () => {
  const actual = (s: string) => new Query(s);
  const expected = (o: Record<string, any>) => new Query(o as any);

  test("matches a single required param (regression)", () => {
    expect(actual("a=1").test(expected({ a: "1" }))?.condition).toBe("exact-match");
    expect(actual("a=1").test(expected({ a: 1 }))?.condition).toBe("exact-match");
  });

  test("returns no-match for a mismatched single param", () => {
    expect(actual("a=1").test(expected({ a: "2" }))?.condition).toBe("no-match");
  });

  test("returns no-match when a required param is absent", () => {
    expect(actual("b=1").test(expected({ a: "1" }))?.condition).toBe("no-match");
  });

  test("matches multiple params", () => {
    expect(actual("a=1&b=2").test(expected({ a: "1", b: "2" }))?.condition).toBe("exact-match");
  });

  test("returns no-match when one of several params is absent", () => {
    expect(actual("a=1").test(expected({ a: "1", b: "2" }))?.condition).toBe("no-match");
  });

  test("ignores extra params not named by the route", () => {
    expect(actual("a=1&b=2").test(expected({ a: "1" }))?.condition).toBe("exact-match");
  });

  test("matches boolean and number constraints with coercion", () => {
    expect(actual("active=true").test(expected({ active: "true" }))?.condition).toBe("exact-match");
    expect(actual("active=false").test(expected({ active: "true" }))?.condition).toBe("no-match");
    expect(actual("n=42").test(expected({ n: 42 }))?.condition).toBe("exact-match");
  });

  test("matches regex constraints", () => {
    expect(actual("id=123").test(expected({ id: /^\d+$/ }))?.condition).toBe("exact-match");
    expect(actual("id=abc").test(expected({ id: /^\d+$/ }))?.condition).toBe("no-match");
  });

  test("matches array constraints", () => {
    expect(actual("tags[0]=a&tags[1]=b").test(expected({ tags: ["a", "b"] }))?.condition).toBe(
      "exact-match"
    );
    expect(actual("tags[0]=a&tags[1]=c").test(expected({ tags: ["a", "b"] }))?.condition).toBe(
      "no-match"
    );
  });
});

describe("Query utilities", () => {
  test("get returns a param value or the default", () => {
    const q = new Query("a=1&b=two");

    expect(q.get("a")).toBe(1);
    expect(q.get("b")).toBe("two");
    expect(q.get("missing", "fallback")).toBe("fallback");
  });

  test("toString serializes params", () => {
    expect(new Query("a=1&b=two").toString()).toBe("a=1&b=two");
    expect(new Query("a[0]=x&a[1]=y").toString()).toBe("a=x,y");
  });

  test("toJSON stringifies values", () => {
    expect(new Query("a=1&b=two").toJSON()).toEqual({ a: "1", b: "two" });
  });
});
