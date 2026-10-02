import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import type { ApplyFn } from "./route.svelte";
import type { RouterInstance } from "./router-instance.svelte";
import type { RouterInstanceConfig } from "./router-instance-config";

/**
 * The router touches `window` / `location` / `history` at module-import time
 * (the registry singleton patches the history API), so browser globals are
 * stubbed before the modules are imported dynamically.
 */
let RouterInstanceCtor: typeof RouterInstance;
let RouterInstanceConfigCtor: typeof RouterInstanceConfig;
let registry: any;
let windowStub: any;

beforeAll(async () => {
  const listeners = new Map<string, Set<Function>>();
  const location = {
    href: "http://localhost/",
    protocol: "http:",
    hostname: "localhost",
    port: "",
    pathname: "/",
    search: "",
    toString: () => "http://localhost/"
  };
  const history = { pushState: vi.fn(), replaceState: vi.fn(), go: vi.fn() };

  windowStub = {
    location,
    history,
    addEventListener: (type: string, fn: Function) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: Function) => listeners.get(type)?.delete(fn),
    dispatchEvent: vi.fn(() => true)
  };

  vi.stubGlobal("window", windowStub);
  vi.stubGlobal("location", location);
  vi.stubGlobal("history", history);

  ({ RouterInstance: RouterInstanceCtor } = await import("./router-instance.svelte"));
  ({ RouterInstanceConfig: RouterInstanceConfigCtor } = await import("./router-instance-config"));
  ({ registry } = await import("./registry.svelte"));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const A = () => {};
const B = () => {};

let counter = 0;
const makeConfig = (over: Record<string, any> = {}) =>
  new RouterInstanceConfigCtor({
    id: `instance-${counter++}`,
    routes: [
      { path: "/a", component: A },
      { path: "/b", component: B }
    ],
    ...over
  });

const makeInstance = (over: Record<string, any> = {}, apply: ApplyFn = vi.fn()) =>
  new RouterInstanceCtor(makeConfig(over), apply);

describe("RouterInstance construction", () => {
  test("registers the configured routes", () => {
    const instance = makeInstance();

    expect(instance.routes.size).toBe(2);
    expect(instance.handlers).toHaveProperty("popStateHandler");
  });
});

describe("RouterInstance.get", () => {
  test("resolves an exact path", async () => {
    const result = await makeInstance().get("/a");

    expect(result?.result.path.condition).toBe("exact-match");
    expect(result?.result.component).toBe(A);
  });

  test("resolves a base path", async () => {
    const result = await makeInstance().get("/a/deeper");

    expect(result?.result.path.condition).toBe("base-match");
  });

  test("a pathless catch-all route matches arbitrary paths", async () => {
    const instance = makeInstance({ routes: [{ path: "", component: A }] });
    const result = await instance.get("/anything");

    expect(result?.result.component).toBe(A);
  });

  test("falls back to a default route at the root", async () => {
    const instance = makeInstance({
      routes: [
        { path: "", component: A },
        { path: "/a", component: B }
      ]
    });
    const result = await instance.get("/");

    expect(result?.result.path.condition).toBe("default-match");
    expect(result?.result.component).toBe(A);
  });

  test("returns undefined when nothing matches and there is no 404 handler", async () => {
    expect(await makeInstance().get("/zzz")).toBeUndefined();
  });

  test("uses an object 404 status handler", async () => {
    const instance = makeInstance({ statuses: { 404: { component: B } } });
    const result = await instance.get("/zzz");

    expect(result?.result.status).toBe(404);
    expect(result?.result.component).toBe(B);
  });

  test("uses a function 404 status handler", async () => {
    const instance = makeInstance({ statuses: { 404: () => ({ component: B }) } });
    const result = await instance.get("/zzz");

    expect(result?.result.status).toBe(404);
    expect(result?.result.component).toBe(B);
  });
});

describe("RouterInstance.handleStateChange", () => {
  test("applies a matching route via the apply function", async () => {
    const apply = vi.fn();
    const instance = makeInstance({}, apply);

    await instance.handleStateChange("http://localhost/a");

    expect(apply).toHaveBeenCalledTimes(1);
    expect(instance.current?.result.component).toBe(A);
    expect(instance.navigating).toBe(false);
  });

  test("a global pre hook can cancel navigation", async () => {
    const apply = vi.fn();
    const instance = makeInstance({ hooks: { pre: () => false } }, apply);

    await instance.handleStateChange("http://localhost/a");

    expect(apply).not.toHaveBeenCalled();
    expect(instance.navigating).toBe(false);
  });

  test("a passing global pre hook allows navigation", async () => {
    const apply = vi.fn();
    const instance = makeInstance({ hooks: { pre: () => true } }, apply);

    await instance.handleStateChange("http://localhost/a");

    expect(apply).toHaveBeenCalledTimes(1);
  });

  test("a route-level pre hook can cancel navigation", async () => {
    const apply = vi.fn();
    const instance = makeInstance(
      { routes: [{ path: "/a", component: A, hooks: { pre: () => false } }] },
      apply
    );

    await instance.handleStateChange("http://localhost/a");

    expect(apply).not.toHaveBeenCalled();
  });
});

describe("registry", () => {
  test("registering a duplicate id throws", () => {
    const config = new RouterInstanceConfigCtor({ id: "dup-id", routes: [] });
    registry.register(config, vi.fn());

    expect(() => registry.register(new RouterInstanceConfigCtor({ id: "dup-id", routes: [] }), vi.fn())).toThrow();

    registry.deregister("dup-id");
  });

  test("deregistering an unknown id throws", () => {
    expect(() => registry.deregister("does-not-exist")).toThrow();
  });

  test("the patched history.pushState dispatches a pushState event", () => {
    windowStub.dispatchEvent.mockClear();
    window.history.pushState({}, "", "/x");

    expect(windowStub.dispatchEvent).toHaveBeenCalled();
  });
});

describe("RouterInstance hooks and base path", () => {
  test("runs a global post hook after applying", async () => {
    const post = vi.fn(() => true);
    const apply = vi.fn();
    const instance = makeInstance({ hooks: { post } }, apply);

    await instance.handleStateChange("http://localhost/a");

    expect(apply).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalled();
  });

  test("strips the router base path before matching", async () => {
    const apply = vi.fn();
    const instance = makeInstance(
      { basePath: "/app", routes: [{ path: "/users", component: B }] },
      apply
    );

    await instance.handleStateChange("http://localhost/app/users");

    expect(apply).toHaveBeenCalledTimes(1);
    expect(instance.current?.result.component).toBe(B);
  });
});
