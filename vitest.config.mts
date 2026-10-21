import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['backend/test/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    fileParallelism: false,
  },
})
