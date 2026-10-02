import { afterEach, expect, test, vi } from "vitest";

import { urls } from "./urls";

test("parses with no query parameters", () => {
  expect(urls.parse("http://localhost:5173/#/foo/bar")).toEqual({
    protocol: "http",
    host: "localhost",
    port: "5173",
    path: "/#/foo/bar",
    hash: {
      hash: "/foo/bar",
      path: "/foo/bar",
      query: {
        original: "",
        params: {}
      },
    },
    query: {
      original: "",
      params: {}
    }
  });
});

test("parses key-value query parameters", () => {
  let result = urls.parse("http://localhost:5173/#/foo/bar?negative=-123&a=1&str=string&b=true");
  expect(result).toEqual({
    protocol: "http",
    host: "localhost",
    port: "5173",
    path: "/#/foo/bar",
    query: {
      params: {
        negative: -123,
        a: 1,
        str: "string",
        b: true,
      },
      original: "negative=-123&a=1&str=string&b=true",
    },
    hash: {
      path: "/foo/bar",
      query: {
        params: {
          negative: -123,
          a: 1,
          str: "string",
          b: true,
        },
        original: "negative=-123&a=1&str=string&b=true",
      },
      hash: "/foo/bar?negative=-123&a=1&str=string&b=true",
    },
  });
});

test("file url without query parameters", () => {
  let result = urls.parse("file:///C:/Users/user1/projects/app1/index.html#/foo/bar");
  expect(result).toEqual({
    protocol: "file",
    host: "/C:/Users/user1/projects/app1/index.html",
    port: "",
    path: "/#/foo/bar",
    query: {
      params: {
      },
      original: undefined,
    },
    hash: {
      path: "/foo/bar",
      query: {
        params: {
        },
        original: "",
      },
      hash: "/foo/bar",
    },
  });
});

test("file url with key-value query parameters", () => {
  let result = urls.parse("file:///C:/Users/user1/projects/app1/index.html#/foo/bar?negative=-123&a=1&str=string&b=true");
  expect(result).toEqual({
    protocol: "file",
    host: "/C:/Users/user1/projects/app1/index.html",
    port: "",
    path: "/#/foo/bar?negative=-123&a=1&str=string&b=true",
    query: {
      params: {
        negative: -123,
        a: 1,
        str: "string",
        b: true,
      },
      original: "negative=-123&a=1&str=string&b=true",
    },
    hash: {
      path: "/foo/bar",
      query: {
        params: {
          negative: -123,
          a: 1,
          str: "string",
          b: true,
        },
        original: "negative=-123&a=1&str=string&b=true",
      },
      hash: "/foo/bar?negative=-123&a=1&str=string&b=true",
    },
  });
});

test("parses array query params in the hash", () => {
  const result = urls.parse(
    "http://localhost:5173/#/foo/bar?a[3]=3&a[19]=1.9&a[0]=first&a[99]=9.99&a[5]=false"
  );

  expect(result.hash.query.params).toEqual({ a: ["first", 3, false, 1.9, 9.99] });
});

test("query.toString() round-trips simple params", () => {
  expect(urls.parse("http://localhost:5173/foo/bar?a=1&b=2").query.toString()).toBe("a=1&b=2");
});

test("parses a relative URL using window.location", () => {
  vi.stubGlobal("window", {
    location: { protocol: "http:", hostname: "localhost", port: "5173" }
  });

  const result = urls.parse("/foo/bar?a=1");

  expect(result.protocol).toBe("http");
  expect(result.host).toBe("localhost");
  expect(result.port).toBe("5173");
  expect(result.path).toBe("/foo/bar");
  expect(result.query.params).toEqual({ a: 1 });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
