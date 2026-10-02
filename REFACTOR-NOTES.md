# Refactor notes — `refactor/simplify-core`

Date: 2026-10-02
Branch: `refactor/simplify-core` (off `main`)
Status: **complete, verified, not merged** (per the agreed constraint: no merge without your approval).

This document records *why* the changes on this branch exist, what behaviour is
affected, and what still needs a human decision. It is written to be read cold —
no prior conversation required.

---

## 1. Why this branch exists

A complexity review of the library concluded that the implementation carried
roughly **2–3× the structural machinery the problem needs**, and — importantly —
that the defects found during review clustered around that accidental complexity:

- the repo's own test suite was **red** (`marshal` array test failed; a second
  file failed to collect because its tests were entirely commented out);
- a querystring matcher bug silently 404'd legitimate routes;
- route config was **silently discarded** in some cases (`children` dropped,
  route `basePath`/`hooks` clobbered).

The objective was therefore: **reduce accidental complexity while preserving
behaviour**, establish a green baseline first, verify at each step, and do not
merge without explicit approval. That objective is now met; the four workstreams
below.

Guardrails applied throughout:
- behaviour-preserving changes only, except where a listed change is an
  intentional fix;
- every step re-verified with `svelte-check`, `vitest`, and (at the end) the
  package build;
- no public API was removed without being called out in §5.

---

## 2. Workstream 1 — one route representation

**Files:** `src/lib/route.svelte.ts`, `src/lib/router-instance-config.ts`,
`src/lib/router-instance.svelte.ts`

**Why.** A route's data was copied through four parallel shapes:
`RouterInstanceConfigOptions → RouterInstanceConfig → RouteConfig → Route`. Each
step re-assigned a hand-picked subset of fields, and the copying itself was the
bug surface:

- `RouteConfig`'s constructor never copied `children`, so nested `children`
  configs were silently dropped;
- `RouterInstanceConfig` built each route with `{ ...route, ...config }` (router
  options spread **last**), so route-level `basePath` and `hooks` were
  overwritten by router-level ones.

**What changed.**
- `RouteConfig` is now a plain `type` (was a class). It is the single input shape
  consumers and internals both use.
- `Route` remains the single resolved representation; `RouterInstanceConfig`
  stores the route configs as-is instead of re-wrapping them.
- `RouterInstance` resolves the router-basePath fallback with `??` instead of
  `||`.

**Result.** Route-level `basePath` and `hooks` survive. `Route.children` was
subsequently **removed entirely** (see §8, item 3) — it was unused and
redundant with nested `<Router/>` composition.

---

## 3. Workstream 2 — query parser rewrite

**File:** `src/lib/helpers/marshal.ts`

**Why.** The old parser was 192 lines with **27 conditional branches** and
several overlapping branches that shadowed each other. That is why the array
case failed whenever the string contained a comma: the comma path fell through
to a naive `split("&")` branch before the array logic could run.

**What changed.** Replaced with:
- `coerce(raw)` — one scalar coercion (number / boolean / string);
- `parseQueryString(input)` — one parser handling `&`/`,` separators,
  `key[n]=value` array notation, and numeric-index ordering.

`marshal()` keeps its public signature and identity-tagging for non-string
values; the string branch now delegates to the two helpers above.

**Behaviour changes** (both intentional, both are fixes):
1. a comma is now treated as a query separator (the repo's own failing test
   demanded this);
2. `key=a=b` keeps the full remainder `"a=b"` instead of truncating to `"a"`.

---

## 4. Workstream 3 — tracing out of the logic bodies

**Files:** `src/lib/helpers/tracing.svelte.ts` and 11 call sites across
`registry.svelte.ts`, `router-instance.svelte.ts`, `router.svelte`.

**Why.** Every meaningful function opened a ~20-line `span?.trace({ ... })` block
before doing its actual work. Instrumentation and control flow were entangled:
`RouterInstance.get()` read as ~30 lines of routing logic buried in ~200 lines of
telemetry.

**What changed.**
- Added `SpanInit` / `TraceInit` types so spans/traces are constructed from plain
  literal shapes (they previously required a full instance, which is why making
  the methods non-optional surfaced type errors).
- Added `traceEvent(span, context)`, which owns the `prefix` / `location` /
  `router` scaffolding and is a no-op when `span` is undefined.
- Replaced all 12 inline `span?.trace({ ... })` blocks with `traceEvent(...)`.

**Behaviour note:** trace `metadata` key order changed slightly (`location` now
precedes `router`). This is debug-output ordering only; `traceEvent`'s contract
documents it as non-load-bearing. Resolved in §8, item 5.

---

## 5. Workstream 4 — dead surface and type holes

**Files:** `route.svelte.ts`, `query.svelte.ts`, `helpers/index.ts`,
`helpers/objects.ts` (deleted), `tsconfig.json`, plus the files touched by
enabling `strictNullChecks`.

**Removed (each verified unused before deletion):**
- `ApplyFn2` — duplicate of `ApplyFn`, never referenced.
- `Testing<T>` — identity alias, only used in its own doc example.
- `Query.set(key, value)` — an empty no-op method.
- `helpers/objects.ts` (`toPrimitive`) — only self-referenced; file deleted and
  its `export *` removed from `helpers/index.ts`.

**Type holes closed.** `tsconfig.json` had `"strict": true` **and**
`"strictNullChecks": false`, which silently hid undefined-return paths. Setting
`strictNullChecks: true` surfaced **46 errors across 11 files**; all 46 are
resolved. This caught and fixed a genuine crash: `registry.deregister()` read
`instance.config` before its own "not found" guard, so deregistering an unknown
id with tracing enabled threw a `TypeError` instead of the intended error.

`any` usage dropped from 33 to 30 (the rest are deliberate — `Component<any>`,
`props: Record<string, any>` — and removing them would change the library's
flexible public types).

---

## 6. Public API / type surface changes

These are type-level or signature widenings; none change runtime behaviour for
valid input:

- `RouteConfig` changed from a class to a type (it was only ever exported as a
  type, so `RouteConfig[]` usage is unaffected).
- `RouterInstanceConfig.id` is now required internally (it was always assigned).
- `Route.test`, `Route.absolute`, `Span.trace`, `Span.get`, `Trace.toConsole`
  are no longer optional members.
- Widened to include `undefined`: `RouteResult.result.querystring.original`,
  `RouterInstanceConfig.get`, `Query.test`, `Query.get`.
- Removed exports: `ToPrimitive` (`toPrimitive`), `ApplyFn2`, `Testing`.
- `handleStateChange` / `get` now honestly return `Promise<... | undefined>`.
- Removed `RouteConfig.children` and `Route.children` (unused; see §8 item 3).
- `Query.test` semantics clarified: `exact-match` iff every route constraint is
  present in the actual params and matches; otherwise `no-match` (see §8 item 2).

---

## 7. Verification evidence (all observed)

- `npx svelte-check` → **0 errors, 0 warnings** (with `strictNullChecks: true`).
- `npx vitest run` → **54 passed, 0 skipped, 0 failed** (8 files).
- `npm run test:ci` (vitest + v8 coverage) → green.
- `npm run build` (`svelte-package`) → **success** (`src/lib -> dist`).

Behaviour probes run during the work (temporary test, removed after):
route `basePath` survives with router basePath set ✅; route `hooks` survive
router hooks ✅. New tests cover the `Query.test` fix (9 cases) and `hash.parse`
(4 cases).

---

## 8. Checklist resolutions (after review)

1. **Merge — still open.** Branch is complete and green but **not merged**; that
   needs your explicit go-ahead.
2. **`Query.test()` — FIXED.** The exact-match check compared against
   `Object.keys(inbound)` (the `Query` instance's own keys) instead of
   `Object.keys(inbound.params)`, so a single required param never matched. It
   also recorded failures as matches (storing `false`), which the old `valid`
   check accepted. `Query.test` now returns `exact-match` iff every route
   constraint is present and matches, else `no-match`. Added **9 tests**
   (single/multi/triple, missing, extra-ignored, boolean/number coercion,
   regex, array).
3. **`Route.children` — DROPPED.** It had no consumers and no docs, and nesting
   in this project is done by composing nested `<Router/>` components (see
   `demo/src/routes/nested/nested.svelte`). Removed from `RouteConfig` and
   `Route` rather than building outlet machinery that contradicts the design.
4. **`hash.parse` — KEPT and tested.** The hash path is real, used
   functionality (hash-link active states; demoed at `/hash`). Its contract is
   "the fragment": everything after `#`, split into `path` + parsed `query`; a
   URL with no `#` yields an empty fragment. Replaced the skipped suite with
   **4 active tests**. (The old first assertion expected a no-`#` URL to parse as
   a path, which contradicts the "hash" contract — discarded.)
5. **Trace metadata key order — KEEP.** Nothing reads metadata keys
   positionally; only console/sink debug output is affected, and the helper now
   emits a *consistent* order (`location`, `router`, extras) rather than the
   previously mixed per-call-site order. Contract documented on `traceEvent`.
6. **Formatting — keep as-is** (your call).

---

## 9. Out of scope / known issues not addressed here

- `dist` publishes `*.test.js` / `*.test.d.ts` (package `files: ["./**/*"]` +
  `svelte-package` includes tests). Related: because `svelte-package` writes
  compiled tests to `.svelte-kit/__package__` (and `dist`), running
  `npm run build` locally makes `vitest` collect duplicate test files until
  those artifact dirs are removed. Both are gitignored; cleaning them restores
  the 54/0 test count.
- `Regexp.can()` treats any path containing `.`/`,`/space/`#` as a regex, so
  plain paths like `/docs/intro.html` compile as regex. Pre-existing.
- `Route.test()` throws (rather than returning `no-match`) for a numeric `path`.
- `applyActiveClass` spreads a string class into individual characters.
- Autofixer suggestions: use `SvelteSet` for `routes`; `SvelteDate` in tracing;
  two `state_referenced_locally` warnings for `rest` in `router.svelte`.
- The vitest config has no Svelte plugin, so `.svelte.ts` modules that evaluate
  runes at import time (e.g. `tracing.svelte.ts`) **cannot be unit-tested** under
  the current harness. `traceEvent` is covered by `svelte-check` + the package
  build only.
