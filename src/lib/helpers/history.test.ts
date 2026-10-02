import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { goto } from "./goto";
import { pop } from "./pop";
import { query } from "./query";
import { replace } from "./replace";

let history: { pushState: ReturnType<typeof vi.fn>; replaceState: ReturnType<typeof vi.fn>; go: ReturnType<typeof vi.fn> };

beforeEach(() => {
  history = { pushState: vi.fn(), replaceState: vi.fn(), go: vi.fn() };
  vi.stubGlobal("window", {
    location: { origin: "http://localhost", search: "?a=1&b=two" },
    history
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("goto", () => {
  test("pushes the resolved path", () => {
    goto("/foo");

    expect(history.pushState).toHaveBeenCalledWith({}, "", "http://localhost/foo");
  });

  test("appends query params", () => {
    goto("/foo", { bar: "baz" });

    expect(history.pushState).toHaveBeenCalledWith({}, "", "http://localhost/foo?bar=baz");
  });
});

describe("replace", () => {
  test("replaces the current entry with the resolved path", () => {
    replace("/foo", { bar: "baz" });

    expect(history.replaceState).toHaveBeenCalledWith({}, "", "http://localhost/foo?bar=baz");
    expect(history.pushState).not.toHaveBeenCalled();
  });
});

describe("pop", () => {
  test("navigates back one entry by default", () => {
    pop();
    expect(history.go).toHaveBeenCalledWith(-1);
  });

  test("navigates back N entries", () => {
    pop(2);
    expect(history.go).toHaveBeenCalledWith(-2);
  });
});

describe("query", () => {
  test("reads a parameter from the current location", () => {
    expect(query("a")).toBe("1");
    expect(query("b")).toBe("two");
  });

  test("returns null for a missing key", () => {
    expect(query("missing")).toBeNull();
  });
});
