// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import next from '@next/eslint-plugin-next';

/**
 * The project's linter.
 *
 * `next lint` is deprecated in Next 15 and drops into an interactive setup
 * prompt, so it cannot run unattended or in CI — this replaces it with a flat
 * config that actually runs.
 *
 * Type-aware rules are on. Without the TypeScript program the checks that catch
 * real bugs here — a dropped promise, a value stringified to "[object Object]"
 * — cannot see enough to fire.
 */
export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'public/**',
      'index.html',
      // Not TypeScript sources, so the type-aware parser has no program for
      // them. The config is checked by running it; the catalogue is data.
      'eslint.config.mjs',
      'prisma/_legacy-catalogue.cjs',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: {
        window: 'readonly', document: 'readonly', localStorage: 'readonly',
        navigator: 'readonly', fetch: 'readonly', console: 'readonly',
        process: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
        AbortController: 'readonly', IntersectionObserver: 'readonly',
        FormData: 'readonly', File: 'readonly', Buffer: 'readonly',
        URL: 'readonly', URLSearchParams: 'readonly', Headers: 'readonly',
        Request: 'readonly', Response: 'readonly', structuredClone: 'readonly',
        HTMLInputElement: 'readonly', HTMLElement: 'readonly', Node: 'readonly',
        Document: 'readonly', BeforeUnloadEvent: 'readonly', KeyboardEvent: 'readonly',
        React: 'readonly', crypto: 'readonly', matchMedia: 'readonly',
      },
    },
    plugins: { 'react-hooks': reactHooks, react, '@next/next': next },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,

      // The ones that catch real bugs in this codebase.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        // onClick={() => void doThing()} is the normal React idiom; flagging
        // every handler that returns a promise would be noise, not signal.
        { checksVoidReturn: false },
      ],
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Deliberate choices, not oversights. Block props and gateway responses
      // are genuinely `unknown` and are validated with zod at the boundary.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',

      // Advisory here, not ignored. Every remaining instance is the same
      // shape: a value that exists only in a browser — localStorage,
      // matchMedia, an IntersectionObserver result — read on mount and put
      // into state. It cannot be read while rendering on the server, so the
      // second render is the unavoidable cost of not guessing, and guessing is
      // what causes hydration mismatches. Warnings rather than off, so a NEW
      // one still surfaces instead of being silently allowed.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },

  {
    // An admin thumbnail shows whatever address someone typed, at a size
    // nothing knows in advance — which is precisely what next/image requires.
    files: ['src/components/admin/**/*.tsx'],
    rules: { '@next/next/no-img-element': 'off' },
  },

  {
    // Node scripts, not browser code.
    files: ['scripts/**/*.ts', 'prisma/**/*.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  {
    // Next's own type for this option is () => Promise<Header[]>, so it must
    // be async whether or not anything inside awaits.
    files: ['next.config.ts'],
    rules: { '@typescript-eslint/require-await': 'off' },
  },
);
