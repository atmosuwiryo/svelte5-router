import { describe, expect, test } from "vitest";

import { evaluators } from "./evaluators";
import { Identities } from "./identify";
import { regexp } from "./regexp";

describe("regexp", () => {
  test("should convert ^home$ to a RegExp", () => {
    expect(regexp.from("^home$")).toBeInstanceOf(RegExp);
  });

  test("should convert /^home$/ to a RegExp", () => {
    expect(regexp.from("/^home$/")).toBeInstanceOf(RegExp);
  });

  test("should convert a RegExp to a RegExp", () => {
    expect(regexp.from(/^home$/)).toBeInstanceOf(RegExp);
  });

  test("should convert ^/($|home)$ to a RegExp", () => {
    expect(regexp.from("^/($|home)$")).toBeInstanceOf(RegExp);
  });

  test("should convert /(^home$/ to a RegExp", () => {
    expect(() => regexp.from("/(^home$/")).toThrowError();
  });

  describe("can", () => {
    test("treats plain paths (dots, commas, spaces, #) as non-regex", () => {
      expect(regexp.can("/docs/intro.html")).toBe(false);
      expect(regexp.can("/a,b")).toBe(false);
      expect(regexp.can("/a b")).toBe(false);
      expect(regexp.can("/a#b")).toBe(false);
      expect(regexp.can("home")).toBe(false);
    });

    test("detects regex-only constructs", () => {
      expect(regexp.can("^/home$")).toBe(true);
      expect(regexp.can("(?<child>.*)")).toBe(true);
      expect(regexp.can("foo(bar)")).toBe(true);
      expect(regexp.can("a|b")).toBe(true);
      expect(regexp.can("a+b")).toBe(true);
      expect(regexp.can("^\\/parameter-extraction\\/(?<child>.*)$")).toBe(true);
    });
  });
});

describe("evaluators", () => {
  test("should return true for a non-empty object", () => {
    expect(evaluators.valid[Identities.object]({ a: 1 })).toBe(true);
  });

  test("should return false for an empty-ish object", () => {
    expect(evaluators.valid[Identities.object]({ a: undefined })).toBe(false);
  });

  test("should return false for an empty-ish nested object", () => {
    expect(evaluators.valid[Identities.object]({ a: undefined, b: true })).toBe(false);
  });

  test("should return false for an empty-ish nested nested object", () => {
    expect(evaluators.valid[Identities.object]({ a: 0, b: { c: null } })).toBe(false);
  });
});
