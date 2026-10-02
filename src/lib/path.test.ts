import { describe, expect, test } from "vitest";

import { paths } from "./path";

describe("paths.base", () => {
  test("matches the base itself and its descendants", () => {
    expect(paths.base("/a", "/a")).toBe(true);
    expect(paths.base("/a", "/a/b")).toBe(true);
  });

  test("does not match prefix-similar or unrelated paths", () => {
    expect(paths.base("/a", "/ab")).toBe(false);
    expect(paths.base("/a", "/x")).toBe(false);
  });
});
