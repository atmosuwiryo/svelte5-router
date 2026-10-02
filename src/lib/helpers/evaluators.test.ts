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

describe("evaluators.any", () => {
  test("compares primitives", () => {
    expect(evaluators.any[Identities.string]("a", "a")).toBe(true);
    expect(evaluators.any[Identities.string]("a", "b")).toBe(false);
    expect(evaluators.any[Identities.number](1, 1)).toBe(true);
    expect(evaluators.any[Identities.boolean](true, true)).toBe(true);
    expect(evaluators.any[Identities.null](null, null)).toBe(true);
    expect(evaluators.any[Identities.undefined](undefined, undefined)).toBe(true);
    expect(evaluators.any[Identities.regexp] as unknown).toBeTypeOf("function");
  });

  test("compares arrays element-wise", () => {
    expect(evaluators.any[Identities.array]([1, 2], [1, 2])).toBe(true);
    expect(evaluators.any[Identities.array]([1], [1, 2])).toBe(false);
    expect(evaluators.any[Identities.array]([1], [2])).toBe(false);
  });

  test("compares objects by keys", () => {
    expect(evaluators.any[Identities.object]({ a: 1, b: "x" }, { a: 1, b: "x" })).toBe(true);
    expect(evaluators.any[Identities.object]({ a: 1 }, { a: 2 })).toBe(false);
    expect(evaluators.any[Identities.object]({ a: 1 }, { b: 1 })).toBe(false);
    expect(evaluators.any[Identities.object](1, { a: 1 })).toBe(false);
  });

  test("extracts regex matches", () => {
    expect(evaluators.any[Identities.regexp](/^a$/, "a")).toBe(true);
    expect(evaluators.any[Identities.regexp](/^(?<x>a)$/, "a")).toEqual({ x: "a" });
    expect(evaluators.any[Identities.regexp](/^b$/, "a")).toBe(false);
  });
});

describe("evaluators.valid", () => {
  test("validates non-empty strings and numbers", () => {
    expect(evaluators.valid[Identities.string]("x")).toBe(true);
    expect(evaluators.valid[Identities.string]("")).toBe(false);
    expect(evaluators.valid[Identities.number](1)).toBe(true);
    expect(evaluators.valid[Identities.number](NaN)).toBe(false);
  });

  test("validates arrays, regexps and functions", () => {
    expect(evaluators.valid[Identities.array]([1])).toBe(true);
    expect(evaluators.valid[Identities.array]([])).toBe(false);
    expect(evaluators.valid[Identities.regexp](/a/)).toBe(true);
    expect(evaluators.valid[Identities.regexp]("a")).toBe(false);
    expect(evaluators.valid[Identities.function](() => {})).toBe(true);
  });

  test("treats null and undefined as invalid", () => {
    expect(evaluators.valid[Identities.null](null)).toBe(false);
    expect(evaluators.valid[Identities.undefined](undefined)).toBe(false);
  });

  test("validates booleans and objects", () => {
    expect(evaluators.valid[Identities.boolean](false)).toBe(true);
    expect(evaluators.valid[Identities.boolean](true)).toBe(false);
    expect(evaluators.valid[Identities.object]({})).toBe(true);
    expect(evaluators.valid[Identities.object](1 as unknown)).toBe(true);
  });
});

describe("evaluators reference and regexp edges", () => {
  test("compares promises, functions and unknowns by identity", () => {
    const promise = Promise.resolve(1);
    const fn = () => {};

    expect(evaluators.any[Identities.promise](promise, promise)).toBe(true);
    expect(evaluators.any[Identities.function](fn, fn)).toBe(true);
    expect(evaluators.any[Identities.unknown](1, 1)).toBe(true);
  });

  test("returns the first unnamed regex capture", () => {
    expect(evaluators.any[Identities.regexp](/(a)/, "xax")).toBe("a");
  });
});
