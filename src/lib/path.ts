/**
 * @remarks
 * Future home of more path related functionality.
 */
/**
 * @remarks
 * Future home of more path related functionality.
 */

/**
 * The types of values that can be used as a path.
 *
 * @category Router
 */
export type PathType = string | number | RegExp | Function | Promise<unknown>;

export namespace paths {
  export const base = (base: string, path: string): boolean => {
    return path.match(new RegExp(`^${base}(/|$)`)) !== null;
  };
}
