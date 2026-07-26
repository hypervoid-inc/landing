import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["app/**/*.test.ts", "tests/**/*.test.ts"],
    restoreMocks: true,
  },
});
