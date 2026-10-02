import { evaluators, type Condition } from "./helpers/evaluators";
import { goto } from "./helpers/goto";
import { identify, Identities } from "./helpers/identify";
import { marshal } from "./helpers/marshal";
import type { ReturnParam } from "./helpers/urls";

/**
 * The types of values that can be used as a query.
 *
 * @category Router
 */
export type QueryType<T = unknown> = Record<string, string | number | RegExp | Function | Promise<T>>;

/**
 * The types of values that the {Query} test method can return.
 *
 * @category Router
 */
export type QueryEvaluationResult = {
  condition: Condition;
  matches?: Record<string, ReturnParam>;
};

/**
 * Query string operations.
 *
 * @category Helpers
 */
export class Query {
  params: Record<string, ReturnParam> = {};
  original?: string;

  constructor(query?: Record<string, string> | string | Query | Record<string, ReturnParam>) {
    if (typeof query === "string") {
      this.original = query;
    }

    if (query) {
      const marshalled = marshal(query);
      if (marshalled.value) {
        this.params = marshalled.value as Record<string, ReturnParam>;
      }
    }
  }

  /**
   * Get a value from the query string parameters and optionally provide
   * a default value if the key is not found.
   *
   * @param key - The key to get the value from.
   * @param defaultValue - The default value to return if the key is not found.
   */
  get<T>(key: string, defaultValue?: T): T | undefined {
    return (this.params[key] as T) || defaultValue;
  }

  /**
   * Delete a value from the query string parameters.
   */
  delete(key: string) {
    delete this.params[key];
  }

  /**
   * Clear the query string parameters.
   */
  clear() {
    this.params = {};
  }

  goto(path: string) {
    goto(path, this.params);
  }

  /**
   * Evaluate this query (the actual, inbound query string) against a route's
   * query constraints.
   *
   * A constraint key must be present in the actual params and its value must
   * match; extra actual parameters are ignored. Returns `exact-match` when every
   * constraint is satisfied, otherwise `no-match`.
   *
   * @param inbound - The route's query constraints.
   */
  test(inbound: Query): QueryEvaluationResult | undefined {
    if (!inbound || typeof inbound !== "object") {
      return undefined;
    }

    const matches: Record<string, ReturnParam> = {};

    for (const [key, want] of Object.entries(inbound.params)) {
      if (!(key in this.params)) {
        return { condition: "no-match" };
      }

      const actual = this.params[key];

      if (want instanceof RegExp) {
        const result = evaluators.any[Identities.regexp](want, actual);
        if (!result) {
          return { condition: "no-match" };
        }
        matches[key] = result as ReturnParam;
        continue;
      }

      const expected = marshal(want).value;
      const resolved = marshal(actual).value;
      if (!evaluators.any[identify(expected)](resolved, expected)) {
        return { condition: "no-match" };
      }
      matches[key] = actual;
    }

    return { condition: "exact-match", matches };
  }

  /**
   * Convert the query string parameters to a string.
   */
  toString() {
    const stringifyValue = (value: any): string => {
      if (Array.isArray(value)) {
        return value.map((v) => stringifyValue(v)).join(",");
      }
      if (typeof value === "object" && value !== null) {
        return Object.entries(value)
          .map(([k, v]) => `${k}:${stringifyValue(v)}`)
          .join(",");
      }
      // console.log("stringifyValue", value, typeof value);
      return encodeURIComponent(value);
    };

    return Object.entries(this.params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${stringifyValue(value)}`)
      .join("&");
    // return preserveOriginal ? this._original : "";
  }

  /**
   * Convert the query string parameters to a JSON object given
   * we may have parameter values that are not json serializable
   * out of the box.
   */
  toJSON(preserveOriginal?: boolean) {
    return Object.fromEntries(Object.entries(this.params).map(([key, value]) => [key, value.toString()]));
  }
}
