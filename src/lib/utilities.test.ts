import { describe, expect, test } from "vitest";

import { ReactiveMap } from "./utilities.svelte";

describe("ReactiveMap", () => {
  test("stores values and reports size", () => {
    const map = new ReactiveMap<string, number>();
    map.set("a", 1);
    map.set("b", 2);

    expect(map.get("a")).toBe(1);
    expect(map.has("b")).toBe(true);
    expect(map.size).toBe(2);
  });

  test("add throws when the key already exists", () => {
    const map = new ReactiveMap<string, number>();
    map.add("a", 1);

    expect(() => map.add("a", 2)).toThrow();
  });

  test("delete and clear update the map", () => {
    const map = new ReactiveMap<string, number>();
    map.set("a", 1);
    map.set("b", 2);

    expect(map.delete("a")).toBe(true);
    expect(map.delete("missing")).toBe(false);
    expect(map.size).toBe(1);

    map.clear();
    expect(map.size).toBe(0);
  });

  test("iterates keys, values and entries", () => {
    const map = new ReactiveMap<string, number>();
    map.set("a", 1);
    map.set("b", 2);

    expect([...map.keys()]).toEqual(["a", "b"]);
    expect([...map.values()]).toEqual([1, 2]);
    expect([...map.entries()]).toEqual([
      ["a", 1],
      ["b", 2]
    ]);
    expect([...map]).toEqual([
      ["a", 1],
      ["b", 2]
    ]);
  });
});
