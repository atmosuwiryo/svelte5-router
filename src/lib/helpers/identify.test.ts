import { describe, expect, test } from "vitest";

import { identify, Identities } from "./identify";

describe("identify", () => {
  test("identifies primitives", () => {
    expect(identify("a")).toBe(Identities.string);
    expect(identify(1)).toBe(Identities.number);
    expect(identify(true)).toBe(Identities.boolean);
    expect(identify(null)).toBe(Identities.null);
    expect(identify(undefined)).toBe(Identities.undefined);
  });

  test("identifies regexp, function, array and object", () => {
    expect(identify(/a/)).toBe(Identities.regexp);
    expect(identify(() => {})).toBe(Identities.function);
    expect(identify([1])).toBe(Identities.array);
    expect(identify({ a: 1 })).toBe(Identities.object);
  });

  test("falls back to unknown", () => {
    expect(identify(Symbol("x"))).toBe(Identities.unknown);
  });
});
