import { describe, expect, test, vi } from "vitest";

import { runtime } from "./runtime";
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

describe("Trace.toConsole", () => {
  const run = (trace: Trace, level: number) => {
    const saved = runtime.current.tracing.level;
    runtime.current.tracing.level = level;
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    trace.toConsole();
    const called = spy.mock.calls.length > 0;
    runtime.current.tracing.level = saved;
    spy.mockRestore();
    return called;
  };

  test("formats a console line", () => {
    const span = createSpan("console-a")!;
    const trace = span.trace({
      prefix: "✅",
      name: "n",
      description: "d",
      metadata: { router: { id: "r" } }
    });

    expect(run(trace, 0)).toBe(true);
  });

  test("includes metadata JSON at TRACE level", () => {
    const span = createSpan("console-b")!;
    const trace = span.trace({ name: "n", description: "d", metadata: { a: 1 } });

    expect(run(trace, 4)).toBe(true);
  });

  test("pushes metadata objects at DEBUG level", () => {
    const span = createSpan("console-c")!;
    const trace = span.trace({ name: "n", description: "d", metadata: { a: 1 } });

    expect(run(trace, 3)).toBe(true);
  });
});
