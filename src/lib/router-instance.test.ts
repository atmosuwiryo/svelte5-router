import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import { Query } from "./query.svelte";
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
let RegistryCtor: any;
let windowStub: any;
let listenersStub: Map<string, Set<Function>>;

beforeAll(async () => {
  const listeners = new Map<string, Set<Function>>();
  listenersStub = listeners;
  const location = {
    href: "http://localhost/a",
    protocol: "http:",
    hostname: "localhost",
    port: "",
    pathname: "/a",
    search: "",
    toString: () => "http://localhost/a"
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
  ({ registry, Registry: RegistryCtor } = await import("./registry.svelte"));
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

  test("the patched history.replaceState dispatches a replaceState event", () => {
    windowStub.dispatchEvent.mockClear();
    window.history.replaceState({}, "", "/y");

    expect(windowStub.dispatchEvent).toHaveBeenCalled();
  });

  test("get returns a registered instance and undefined otherwise", () => {
    const config = new RouterInstanceConfigCtor({ id: "get-id", routes: [] });
    const instance = registry.register(config, vi.fn());

    expect(registry.get("get-id")).toBe(instance);
    expect(registry.get("nope")).toBeUndefined();

    registry.deregister("get-id");
  });

  test("constructing Registry again returns the existing singleton (HMR guard)", () => {
    expect(new RegistryCtor()).toBe(registry);
  });
});

describe("RouterInstance.deregister and window listeners", () => {
  test("deregister removes listeners and unregisters the instance", () => {
    const config = new RouterInstanceConfigCtor({ id: "dereg-id", routes: [] });
    const instance = registry.register(config, vi.fn());
    const removeSpy = vi.spyOn(windowStub, "removeEventListener");

    instance.deregister();

    expect(removeSpy).toHaveBeenCalled();
    expect(registry.get("dereg-id")).toBeUndefined();
    removeSpy.mockRestore();
  });

  test("window history listeners trigger a state change", async () => {
    const apply = vi.fn();
    makeInstance({}, apply);

    for (const type of ["pushState", "replaceState", "popstate", "hashchange"]) {
      const handler = [...(listenersStub.get(type) ?? [])].at(-1) as Function | undefined;
      handler?.();
    }

    await vi.waitFor(() => expect(apply).toHaveBeenCalled());
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

  test("matches a route with a querystring constraint", async () => {
    const instance = makeInstance({ routes: [{ path: "/a", component: A, querystring: { q: "1" } }] });

    const hit = await instance.get("/a", new Query("q=1"));
    const miss = await instance.get("/a", new Query("q=2"));

    expect(hit?.result.path.condition).toBe("exact-match");
    expect(miss).toBeUndefined();
  });

  test("returns the default route when the path equals the base path", async () => {
    const instance = makeInstance({
      basePath: "/app",
      routes: [
        { path: "", component: A },
        { path: "/x", component: B }
      ]
    });

    const result = await instance.get("/app");

    expect(result?.result.path.condition).toBe("default-match");
  });

  test("runs a route-level post hook after applying", async () => {
    const post = vi.fn(() => true);
    const apply = vi.fn();
    const instance = makeInstance(
      { routes: [{ path: "/a", component: A, hooks: { post } }] },
      apply
    );

    await instance.handleStateChange("http://localhost/a");

    expect(apply).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalled();
  });

  test("applies on first navigation even when renavigation is disabled", async () => {
    const apply = vi.fn();
    const instance = makeInstance({ renavigation: false }, apply);

    await instance.handleStateChange("http://localhost/a");

    expect(apply).toHaveBeenCalledTimes(1);
  });

  test("skips re-applying the same route when renavigation is disabled", async () => {
    const apply = vi.fn();
    const instance = makeInstance({ renavigation: false }, apply);

    await instance.handleStateChange("http://localhost/a");
    await instance.handleStateChange("http://localhost/a");

    expect(apply).toHaveBeenCalledTimes(1);
  });

  test("re-applies the same route when renavigation is enabled", async () => {
    const apply = vi.fn();
    const instance = makeInstance({}, apply);

    await instance.handleStateChange("http://localhost/a");
    await instance.handleStateChange("http://localhost/a");

    expect(apply).toHaveBeenCalledTimes(2);
  });
});
