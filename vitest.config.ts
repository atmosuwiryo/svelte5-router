import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Compile Svelte 5 runes in `.svelte`/`.svelte.ts` modules so they can be
  // imported and unit-tested (e.g. helpers/tracing.svelte.ts).
  plugins: [svelte()],
  test: {
    // `.svelte-kit` holds `svelte-package` build output (including compiled
    // `*.test.js`), so exclude it to avoid collecting duplicate tests after a
    // local `npm run build`.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.svelte-kit/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**"
    ],
    coverage: {
      include: ["src/lib/**"],
      exclude: ["src/lib/**/*.test.ts"],
      reporter: ["json-summary"],
      reportsDirectory: "tmp/coverage",
      // Floor for the library only; raise as coverage improves.
      thresholds: {
        statements: 70,
        lines: 70,
        branches: 70,
        functions: 55
      }
    }
  }
});
