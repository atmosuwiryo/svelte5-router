import { defineConfig } from "vitest/config";

export default defineConfig({
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
      reporter: ["json-summary"],
      reportsDirectory: "tmp/coverage"
    }
  }
});
