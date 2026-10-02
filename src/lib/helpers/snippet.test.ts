import { describe, expect, test } from "vitest";

import { isSnippet } from "./snippet";

describe("isSnippet", () => {
  test("treats arrow functions as snippets", () => {
    expect(isSnippet((_anchor: unknown) => {})).toBe(true);
  });

  test("treats function declarations and classes as components", () => {
    expect(isSnippet(function Component() {})).toBe(false);
    expect(isSnippet(class Component {})).toBe(false);
  });

  test("ignores non-functions", () => {
    expect(isSnippet(null)).toBe(false);
    expect(isSnippet(undefined)).toBe(false);
    expect(isSnippet({})).toBe(false);
    expect(isSnippet("snippet")).toBe(false);
  });
});
