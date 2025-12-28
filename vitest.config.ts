import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    sequence: { shuffle: false },
    testTimeout: 10_000,
    hookTimeout: 10_000,
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});