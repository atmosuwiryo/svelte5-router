import { describe, expect, test } from "vitest";

import { Route } from "./route.svelte";

describe("Route.test", () => {
  test("matches an exact string path", () => {
    expect(new Route({ path: "/a" }).test("/a").condition).toBe("exact-match");
  });

  test("matches a base path", () => {
    expect(new Route({ path: "/a" }).test("/a/b").condition).toBe("base-match");
  });

  test("returns no-match for an unrelated path", () => {
    expect(new Route({ path: "/a" }).test("/b").condition).toBe("no-match");
  });

  test("extracts named groups from a regex path", () => {
    const result = new Route({ path: /^\/x\/(?<id>.+)$/ }).test("/x/42");

    expect(result.condition).toBe("exact-match");
    // group values are strings, so leading zeros are preserved
    expect(result.params).toEqual({ id: "42" });
  });

  test("string-regex path params are strings", () => {
    const result = new Route({ path: "(?<code>.*)" }).test("/007");

    expect(result.params).toEqual({ code: "007" });
  });

  test("RegExp path params are strings (leading zeros preserved)", () => {
    const result = new Route({ path: /\/(?<code>.*)/ }).test("/007");

    expect(result.params).toEqual({ code: "007" });
  });

  test("treats a numeric path as a miss instead of throwing", () => {
    const route = new Route({ path: 1 });

    expect(() => route.test("1")).not.toThrow();
    expect(route.test("1").condition).toBe("no-match");
  });
});
