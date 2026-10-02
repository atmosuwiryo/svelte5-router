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
    // regexp group values pass through `marshal`, so "42" is coerced to 42
    expect(result.params).toEqual({ id: 42 });
  });

  test("treats a numeric path as a miss instead of throwing", () => {
    const route = new Route({ path: 1 });

    expect(() => route.test("1")).not.toThrow();
    expect(route.test("1").condition).toBe("no-match");
  });
});
