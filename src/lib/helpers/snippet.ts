import type { Snippet } from "svelte";

/**
 * Determine whether a resolved route value is a Svelte snippet or a component.
 *
 * Svelte 5 exposes no public "is snippet" predicate. However, the compiler
 * always emits `{#snippet}` (and `createRawSnippet`) as arrow functions, while
 * components are function declarations or classes — both of which carry a
 * `prototype`. That distinction is what this relies on.
 *
 * @param value - The resolved `component` value from a route.
 *
 * @returns True when the value should be rendered with `{@render ...}`.
 */
export const isSnippet = (value: unknown): value is Snippet =>
  typeof value === "function" && (value as { prototype?: unknown }).prototype === undefined;
