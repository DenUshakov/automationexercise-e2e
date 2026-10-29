import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import playwright from 'eslint-plugin-playwright';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['node_modules/', 'playwright-report/', 'test-results/', 'reports/', 'recon/'] },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    // Type-aware rules catch a missing await on a Playwright call (no-floating-promises).
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['tests/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
  },
  prettier,
);
