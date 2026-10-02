import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { active } from "./active.svelte";
import { RouteOptions } from "./options";
import { route as routeAction } from "./route.svelte";

let windowStub: any;

const makeNode = (href: string) => {
  const add = vi.fn();
  const remove = vi.fn();
  return {
    href,
    classList: { add, remove },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    add,
    remove
  } as any;
};

beforeEach(() => {
  windowStub = {
    location: { origin: "http://localhost" },
    history: { pushState: vi.fn(), replaceState: vi.fn() },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
  vi.stubGlobal("window", windowStub);
  vi.stubGlobal("location", { toString: () => "http://localhost/a", search: "" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("route action", () => {
  test("wires click and pushState listeners and applies the active class", () => {
    const node = makeNode("http://localhost/a");
    const result = routeAction(node, { active: { class: "on" } });

    expect(node.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
    expect(windowStub.addEventListener).toHaveBeenCalledWith("pushState", expect.any(Function));
    expect(node.add).toHaveBeenCalledWith("on");

    result.destroy();
    expect(node.removeEventListener).toHaveBeenCalledWith("click", expect.any(Function));
    expect(windowStub.removeEventListener).toHaveBeenCalledWith("pushState", expect.any(Function));
  });

  test("a click prevents default and pushes the node href", () => {
    const node = makeNode("http://localhost/a");
    routeAction(node);

    const handler = node.addEventListener.mock.calls[0][1] as (event: Event) => void;
    const event = { preventDefault: vi.fn() } as unknown as Event;
    handler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(windowStub.history.pushState).toHaveBeenCalledWith({}, "", "http://localhost/a");
  });
});

describe("active action", () => {
  test("applies the active class and cleans up on destroy", () => {
    const node = makeNode("http://localhost/a");
    const result = active(node, { active: { class: "on" } });

    expect(node.add).toHaveBeenCalledWith("on");
    expect(windowStub.addEventListener).toHaveBeenCalledWith("pushState", expect.any(Function));

    result.destroy();
    expect(windowStub.removeEventListener).toHaveBeenCalledWith("pushState", expect.any(Function));
  });
});

describe("RouteOptions", () => {
  test("assigns provided options and leaves the rest undefined", () => {
    const options = new RouteOptions({ active: { class: "on" } });

    expect(options.active?.class).toBe("on");
    expect(options.default).toBeUndefined();
    expect(options.loading).toBeUndefined();
    expect(options.disabled).toBeUndefined();
  });

  test("supports construction with no arguments", () => {
    const options = new RouteOptions();
    expect(options.active).toBeUndefined();
  });
});
