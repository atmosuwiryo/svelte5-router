import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { urls } from "../helpers/urls";
import { applyActiveClass } from "./apply-classes";

const mockNode = () => {
  const add = vi.fn();
  const remove = vi.fn();
  return { classList: { add, remove }, add, remove } as any;
};

describe("applyActiveClass", () => {
  beforeEach(() => {
    (globalThis as any).location = {
      toString: () => "http://localhost/a",
      search: ""
    };
  });

  afterEach(() => {
    delete (globalThis as any).location;
  });

  test("adds the active class and removes the default when active", () => {
    const node = mockNode();
    applyActiveClass(
      urls.parse("http://localhost/a"),
      { active: { class: "on" }, default: { class: "off" } },
      node
    );

    expect(node.add).toHaveBeenCalledWith("on");
    expect(node.remove).toHaveBeenCalledWith("off");
  });

  test("does not spread a string class into individual characters", () => {
    const node = mockNode();
    applyActiveClass(
      urls.parse("http://localhost/a"),
      { active: { class: "active-name" }, default: { class: "muted" } },
      node
    );

    expect(node.add).toHaveBeenCalledTimes(1);
    expect(node.add).toHaveBeenCalledWith("active-name");
    expect(node.remove).toHaveBeenCalledWith("muted");
  });

  test("adds the default class and removes the active class when inactive", () => {
    const node = mockNode();
    applyActiveClass(
      urls.parse("http://localhost/other"),
      { active: { class: "on" }, default: { class: "off" } },
      node
    );

    expect(node.add).toHaveBeenCalledWith("off");
    expect(node.remove).toHaveBeenCalledWith("on");
  });

  test("supports array class options", () => {
    const node = mockNode();
    applyActiveClass(urls.parse("http://localhost/a"), { active: { class: ["a", "b"] } }, node);

    expect(node.add).toHaveBeenCalledWith("a", "b");
  });
});
