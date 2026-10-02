import { describe, expect, test } from "vitest";

import { getStatusByValue, StatusCode } from "./statuses";

describe("getStatusByValue", () => {
  test("maps numeric status codes to their names", () => {
    expect(getStatusByValue(200)).toBe("OK");
    expect(getStatusByValue(404)).toBe("NotFound");
    expect(getStatusByValue(500)).toBe("InternalServerError");
  });

  test("returns undefined for an unknown code", () => {
    expect(getStatusByValue(418)).toBeUndefined();
  });

  test("StatusCode enum values are stable", () => {
    expect(StatusCode.NotFound).toBe(404);
    expect(StatusCode.OK).toBe(200);
  });
});
