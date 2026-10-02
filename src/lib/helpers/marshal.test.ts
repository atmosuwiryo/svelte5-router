import { describe, expect, test } from "vitest";

import { Identities } from "./identify";
import { marshal } from "./marshal";

describe("marshal", () => {
  test("should marshal an array from a string", () => {
    expect(marshal("a[0]=1")).toEqual({
      identity: Identities.object,
      value: {
        a: [1]
      }
    });
  });

  test("should marshal an array from a string with multiple values", () => {
    expect(marshal("a[0]=first&nonarray=true,a[999]=true&a[1]=second&a[2]=3&a[3]=fourth")).toEqual({
      identity: Identities.object,
      value: {
        nonarray: true,
        a: ["first", "second", 3, "fourth", true]
      }
    });
  });

  test("should marshal an array from a string with an empty value", () => {
    expect(marshal("a[0]=1&a[1]=b&a[2]=false&a[3]=true&a[4]=")).toEqual({
      identity: Identities.object,
      value: {
        a: [1, "b", false, true, ""]
      }
    });
  });

  test("throws for an unsupported value type", () => {
    expect(() => marshal(Symbol("unsupported"))).toThrow();
  });

  test("tags non-string values with their identity", () => {
    const fn = () => {};
    const promise = Promise.resolve(1);

    expect(marshal(null)).toEqual({ identity: Identities.null, value: null });
    expect(marshal(undefined)).toEqual({ identity: Identities.undefined, value: undefined });
    expect(marshal([1, 2])).toEqual({ identity: Identities.array, value: [1, 2] });
    expect(marshal(fn)).toEqual({ identity: Identities.function, value: fn });
    expect(marshal(promise)).toEqual({ identity: Identities.promise, value: promise });
    expect(marshal(5)).toEqual({ identity: Identities.number, value: 5 });
    expect(marshal(true)).toEqual({ identity: Identities.boolean, value: true });
    expect(marshal({ a: "1" })).toEqual({ identity: Identities.object, value: { a: 1 } });
  });
});
