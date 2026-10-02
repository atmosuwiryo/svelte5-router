import { Identities, type Identity } from "./identify";

/**
 * A value paired with the identity that describes it.
 */
export type Marshalled<T> = {
  identity: Identity;
  value: T;
};

/**
 * Matches a number literal (integer or decimal, optional leading sign).
 */
const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)$/;

/**
 * A single parsed query-string entry, optionally carrying an array index.
 */
type Entry = {
  index?: number;
  value: unknown;
};

/**
 * Coerce a single string token into a primitive and report its identity.
 *
 * @param raw - The raw token, e.g. "1", "1.9", "true", or "first".
 *
 * @returns The coerced value together with its {@link Identity}.
 */
const coerce = (raw: string): Marshalled<unknown> => {
  if (NUMBER.test(raw)) {
    return {
      identity: Identities.number,
      value: Number(raw)
    };
  }
  if (/^true$/i.test(raw)) {
    return {
      identity: Identities.boolean,
      value: true
    };
  }
  if (/^false$/i.test(raw)) {
    return {
      identity: Identities.boolean,
      value: false
    };
  }
  return {
    identity: Identities.string,
    value: raw
  };
};

/**
 * Parse a query-string-like value into an object.
 *
 * Supports `key=value` pairs separated by `&` or `,`, array notation
 * (`key[0]=value`) ordered by numeric index, and scalar coercion.
 *
 * @param input - The raw query string, e.g. `"a[0]=first&nonarray=true"`.
 *
 * @returns The parsed parameters.
 */
const parseQueryString = (input: string): Record<string, unknown> => {
  const scalars: Record<string, unknown> = {};
  const arrays: Record<string, Entry[]> = {};

  for (const pair of input.split(/[&,]/)) {
    const separator = pair.indexOf("=");
    if (separator === -1) continue;

    const key = pair.slice(0, separator);
    const value = coerce(pair.slice(separator + 1)).value;
    const array = key.match(/^(.*)\[(\d*)\]$/);

    if (array) {
      const [, name, rawIndex] = array;
      (arrays[name] ??= []).push({
        index: rawIndex === "" ? undefined : Number(rawIndex),
        value
      });
    } else {
      scalars[key] = value;
    }
  }

  const parsed: Record<string, unknown> = { ...scalars };
  for (const [name, entries] of Object.entries(arrays)) {
    const indexed = entries
      .filter((entry) => entry.index !== undefined)
      .sort((a, b) => (a.index as number) - (b.index as number));
    const sequential = entries.filter((entry) => entry.index === undefined);
    parsed[name] = [...indexed, ...sequential].map((entry) => entry.value);
  }

  return parsed;
};

/**
 * Marshal a value to a specific type.
 *
 * @param value - The value to marshal.
 *
 * @returns The marshalled value and its {@link Identity}.
 */
export const marshal = <T>(value: unknown): Marshalled<T> => {
  // Most values will be strings, so we check for that first. A string that
  // contains "&" or "=" is treated as a query string and parsed into an object.
  if (typeof value === "string") {
    if (value.includes("&") || value.includes("=")) {
      return {
        identity: Identities.object,
        value: parseQueryString(value) as T
      };
    }
    return coerce(value) as Marshalled<T>;
  }

  if (typeof value === "number") {
    return {
      identity: Identities.number,
      value: value as T
    };
  }

  if (typeof value === "boolean") {
    return {
      identity: Identities.boolean,
      value: value as T
    };
  }

  if (value instanceof RegExp) {
    return {
      identity: Identities.regexp,
      value: value as T
    };
  }

  if (value === null) {
    return {
      identity: Identities.null,
      value: null as T
    };
  }

  if (value === undefined) {
    return {
      identity: Identities.undefined,
      value: undefined as T
    };
  }

  if (Array.isArray(value)) {
    return {
      identity: Identities.array,
      value: value as T
    };
  }

  if (value instanceof Promise) {
    return {
      identity: Identities.promise,
      value: value as T
    };
  }

  if (typeof value === "function") {
    return {
      identity: Identities.function,
      value: value as T
    };
  }

  if (typeof value === "object") {
    const marshalled = Object.entries(value as Record<string, unknown>).reduce(
      (acc, [key, val]) => {
        acc[key] = marshal(val).value;
        return acc;
      },
      {} as Record<string, unknown>
    );

    return {
      identity: Identities.object,
      value: marshalled as T
    };
  }

  throw new Error(
    `unable to marshal value: ${String(value)} (it is neither a string, number, boolean, nor a regular expression)`
  );
};
