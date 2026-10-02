import { describe, expect, test } from "vitest";

import { runtime } from "./runtime";

describe("runtime.config", () => {
  test("returns defaults when nothing is provided", () => {
    const config = runtime.config();

    expect(config.tracing).toEqual({ enabled: false });
    expect(config.logging.level).toBe(4);
  });

  test("applies explicit overrides", () => {
    const config = runtime.config({
      tracing: { enabled: true },
      logging: { level: 1, console: true }
    });

    expect(config.tracing.enabled).toBe(true);
    expect(config.logging.level).toBe(1);
    expect(config.logging.console).toBe(true);
  });
});
