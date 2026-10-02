import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'core',
          environment: 'node',
          include: ['test/core/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          environment: 'happy-dom',
          include: ['test/{dom,vue,compat}/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'types',
          include: [],
          typecheck: {
            enabled: true,
            only: true,
            include: ['test/types/**/*.test-d.ts'],
            tsconfig: './tsconfig.test.json',
          },
        },
      },
    ],
  },
})
