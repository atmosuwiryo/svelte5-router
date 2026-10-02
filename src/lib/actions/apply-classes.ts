import { urls, type URL } from "../helpers/urls";

import { RouteOptions } from "./options";

/**
 * Normalize a class option into an array of class names.
 *
 * Guards against the classic footgun of spreading a `string`, which would add
 * one class per character (`"foo"` → `add("f", "o", "o")`).
 *
 * @param value - A single class name, a list of class names, or undefined.
 */
const toClasses = (value?: string | string[]): string[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

/**
 * Determine whether `href` should be considered active relative to `url`.
 *
 * @param href - The parsed href of the link.
 * @param url - The parsed current location.
 * @param search - The current `location.search` (including the leading `?`).
 * @param options - The options the link was configured with.
 */
const isActive = (href: URL, url: URL, search: string, options: RouteOptions): boolean => {
  return (
    (href.path === url.path ||
      href.path === url.hash.path ||
      href.hash.path === url.path ||
      (!options.active?.absolute && url.path.startsWith(href.path))) &&
    (options.active?.querystring || options.active?.querystring === undefined) &&
    (href.query.original == "" ||
      href.query.original === search.replace("?", "") ||
      href.query.original === url.hash.query.original)
  );
};

/**
 * Applies the active class to the node if the href is the same as the current location.
 *
 * @param href - The href to check if it is the same as the current location.
 * @param options - The options to apply to the node.
 * @param node - The node to apply the active class to.
 *
 * @category Actions
 */
export const applyActiveClass = (href: URL, options: RouteOptions, node: HTMLAnchorElement) => {
  const url = urls.parse(location.toString());
  const active = isActive(href, url, location.search, options);

  const add = toClasses(active ? options.active?.class : options.default?.class);
  const remove = toClasses(active ? options.default?.class : options.active?.class);

  if (add.length > 0) node.classList.add(...add);
  if (remove.length > 0) node.classList.remove(...remove);
};
