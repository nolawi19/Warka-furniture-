// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
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
      // Data, not code.
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
    plugins: { 'react-hooks': reactHooks, '@next/next': next },
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

      // No exceptions left: browser-only values are read with
      // useSyncExternalStore, results remember the query they answer, and
      // state that follows a prop is adjusted while rendering. A new case
      // fails the lint instead of joining a pile of tolerated warnings.
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/refs': 'error',
    },
  },

  {
    // An admin thumbnail shows whatever address someone typed, at a size
    // nothing knows in advance — which is precisely what next/image requires.
    files: ['src/components/admin/**/*.tsx'],
    rules: { '@next/next/no-img-element': 'off' },
  },

  {
    // This file is linted too, without type information (it is not part of
    // the TypeScript program). It also has to be lintable for `next build` to
    // find the Next.js plugin: Next asks ESLint which config applies to this
    // very file, and an ignored file has none.
    files: ['eslint.config.mjs'],
    ...tseslint.configs.disableTypeChecked,
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
