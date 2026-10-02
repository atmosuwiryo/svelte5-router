import { describe, expect, test } from "vitest";

import { Route, RouteResult } from "./route.svelte";

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

  test("normalizes a plain string path", () => {
    expect(new Route({ path: "home" }).test("/home").condition).toBe("exact-match");
  });

  test("preserves an anchored string-regex path instead of prefixing it", () => {
    expect(new Route({ path: "^/home$" }).test("/home").condition).toBe("exact-match");
    expect(new Route({ path: "^/home$" }).test("/home/extra").condition).toBe("no-match");
  });

  test("extracts groups from an anchored string-regex path (documented example)", () => {
    const result = new Route({ path: "^/posts/(?<slug>.+)$" }).test("/posts/my-article");

    expect(result.condition).toBe("exact-match");
    expect(result.params).toEqual({ slug: "my-article" });
  });

  test("still normalizes a non-anchored string-regex path", () => {
    const result = new Route({ path: "(?<child>.*)" }).test("/foo");

    expect(result.condition).toBe("exact-match");
    expect(result.params).toEqual({ child: "foo" });
  });

  test("absolute() prefixes the base path when present", () => {
    expect(new Route({ path: "/a", basePath: "/base" }).absolute()).toBe("/base/a");
    expect(new Route({ path: "/a" }).absolute()).toBe("/a");
  });
});

describe("RouteResult.toString", () => {
  const build = (original: unknown, condition: string = "exact-match") =>
    new RouteResult({
      result: {
        path: { condition, original: "/a" },
        querystring: { condition: "permitted-no-conditions", original },
        status: 200
      }
    } as any);

  test("appends the querystring when present", () => {
    expect(build({ a: 1, b: "x" }).toString()).toBe("/a?a=1&b=x");
  });

  test("omits an empty querystring", () => {
    expect(build("").toString()).toBe("/a");
  });
});
