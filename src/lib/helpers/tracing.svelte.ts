import { SvelteDate } from "svelte/reactivity";

import { ReactiveMap } from "../utilities.svelte";

import { logging } from "./logging";
import { runtime } from "./runtime";

/**
 * The fields a caller may provide when creating a {@link Span}.
 */
export type SpanInit = Pick<Span, "prefix" | "id" | "date" | "name" | "description" | "metadata">;

/**
 * The fields a caller may provide when recording a {@link Trace}.
 */
export type TraceInit = Pick<Trace, "prefix" | "id" | "date" | "name" | "description" | "metadata">;

/**
 * A span is a single trace in a trace collection.
 *
 * @category Helpers
 */
export class Span {
  prefix?: string;
  id?: string;
  date?: Date;
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
  traces: ReactiveMap<string, Trace> = $state(new ReactiveMap());

  constructor(span: SpanInit, prefix?: string) {
    this.prefix = prefix;
    this.name = span.name;
    this.id = span.id || Math.random().toString(36).substring(2, 25);
    this.description = span.description;
    this.metadata = span.metadata;
    this.date = span.date || new SvelteDate();
  }

  trace(input: TraceInit, prefix?: string): Trace {
    const id = input.id || Math.random().toString(36).substring(2, 25);
    const trace = new Trace(input, this.traces.size + 1, this, prefix);
    this.traces.set(id, trace);

    logging.trace(prefix, trace);

    return trace;
  }

  get(): MapIterator<Trace> {
    return this.traces.values();
  }
}

/**
 * A trace is a collection of spans.
 *
 * @category Helpers
 */
export class Trace {
  prefix?: string;
  id?: string;
  index?: number;
  date?: Date;
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
  span?: Span;

  constructor(trace: TraceInit, index?: number, span?: Span, prefix?: string) {
    this.id = trace.id || Math.random().toString(36).substring(2, 25);
    this.index = index;
    this.date = trace.date || new SvelteDate();
    this.name = trace.name;
    this.description = trace.description;
    this.metadata = trace.metadata;
    this.span = span;
    this.prefix = trace.prefix;
  }

  /**
   * Wrapper method for logging a trace to the browser console.
   *
   * @category Helpers
   */
  toConsole(level?: logging.LogLevel): void {
    const out = [
      "%c%s %cspan:%c%s:%ctrace:%c%s%c:%c%s %c%s",
      "color: #505050",
      this.date?.toISOString(),
      "color: #7A7A7A",
      "color: #915CF2; font-weight: bold",
      this.span?.name || this.id,
      "color: #7A7A7A; font-weight: bold",
      "color: #C3F53B; font-weight: bold",
      this.index,
      "color: #7A7A7A; font-weight: bold",
      "color: #3BAEF5; font-weight: bold",
      `${this.metadata?.router ? `[${this.metadata.router.id}] ` : ""}${this.name}`,
      "color: #06E96C",
      this.description
    ];

    if (this.prefix) {
      out[0] = `${this.prefix} %c%s %cspan:%c%s:%ctrace:%c%s%c:%c%s %c%s`;
    }

    if ((runtime.current.tracing.level ?? 0) >= logging.LogLevel.TRACE) {
      out[0] += "\n%c%s";
      out.push(
        "color: #6B757F",
        `attached trace metadata:\n\n${JSON.stringify(
          {
            span: this.span?.metadata,
            trace: this.metadata
          },
          null,
          2
        )}`
      );
    } else if ((runtime.current.tracing.level ?? 0) >= logging.LogLevel.DEBUG) {
      if (this.span) {
        // @ts-ignore
        out.push(this.span.metadata);
      }
      if (this.metadata) {
        // @ts-ignore
        out.push(this.metadata);
      }
    }

    console.log(...out);
  }
}

/**
 * A reactive map of spans.
 *
 * @category Helpers
 */
export const spans = new ReactiveMap<string, Span>();

/**
 * Helper method for creating a new span.
 *
 * @category Helpers
 */
export const createSpan = (name: string, metadata?: Record<string, any>) => {
  if (runtime.current.tracing) {
    const span = new Span({ name, metadata });
    spans.set(name, span);
    return span;
  }
};

/**
 * The context for a {@link trace} event.
 */
export type TraceContext = {
  prefix?: string;
  name: string;
  description: string;
  /** Recorded under `metadata.location`. */
  location?: string;
  /** Recorded under `metadata.router`. */
  router?: Record<string, any>;
  /** Any additional metadata to record. */
  metadata?: Record<string, any>;
};

/**
 * Record a trace event on a span, collapsing the `prefix`/`location`/`router`
 * scaffolding so call sites stay close to the logic they annotate.
 *
 * Metadata is emitted in insertion order (`location`, then `router`, then any
 * extra fields). That order is an implementation detail of the debug output —
 * no behaviour depends on it. A `span` of `undefined` makes this a no-op.
 *
 * @param span - The span to record on (no-op when undefined).
 * @param context - What to record.
 */
export const traceEvent = (span: Span | undefined, context: TraceContext): void => {
  span?.trace({
    prefix: context.prefix,
    name: context.name,
    description: context.description,
    metadata: {
      ...(context.location ? { location: context.location } : {}),
      ...(context.router ? { router: context.router } : {}),
      ...context.metadata
    }
  });
};
