import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { logging } from "./logging";
import { runtime } from "./runtime";

let saved: typeof runtime.current.logging;

beforeEach(() => {
  saved = { ...runtime.current.logging };
});

afterEach(() => {
  runtime.current.logging = saved;
  vi.restoreAllMocks();
});

describe("logging", () => {
  test("drops messages above the configured level", () => {
    runtime.current.logging.level = logging.LogLevel.ERROR;
    runtime.current.logging.console = false;
    const sink = vi.fn();
    runtime.current.logging.sink = sink;

    logging.info("ignored");
    expect(sink).not.toHaveBeenCalled();

    logging.error("kept");
    expect(sink).toHaveBeenCalledWith(["kept"]);
  });

  test("writes to the console when enabled", () => {
    runtime.current.logging.level = logging.LogLevel.TRACE;
    runtime.current.logging.console = true;
    runtime.current.logging.sink = undefined;
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logging.info("hello");

    expect(spy).toHaveBeenCalled();
  });

  test("fatal logs and then throws", () => {
    runtime.current.logging.level = logging.LogLevel.TRACE;
    runtime.current.logging.console = false;
    runtime.current.logging.sink = vi.fn();

    expect(() => logging.fatal("boom")).toThrow("Fatal error");
  });
});
