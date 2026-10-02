import { describe, expect, test } from "vitest";

import { createSpan, Span, Trace, traceEvent } from "./tracing.svelte";

describe("tracing", () => {
  test("createSpan returns a Span", () => {
    expect(createSpan("span-a")).toBeInstanceOf(Span);
  });

  test("Span.trace records a Trace on the span", () => {
    const span = createSpan("span-b")!;
    const trace = span.trace({ prefix: "✅", name: "unit", description: "desc" });

    expect(trace).toBeInstanceOf(Trace);
    expect([...span.get()].map((t) => t.name)).toContain("unit");
  });

  test("traceEvent is a no-op when the span is undefined", () => {
    expect(() => traceEvent(undefined, { name: "x", description: "y" })).not.toThrow();
  });

  test("traceEvent records location, router and extra metadata", () => {
    const span = createSpan("span-c")!;
    traceEvent(span, {
      prefix: "✅",
      name: "unit",
      description: "desc",
      location: "/x.ts:f()",
      router: { id: "r1", basePath: "/r" },
      metadata: { extra: 1 }
    });

    const last = [...span.get()].at(-1)!;
    expect(last.metadata).toEqual({
      location: "/x.ts:f()",
      router: { id: "r1", basePath: "/r" },
      extra: 1
    });
  });
});
