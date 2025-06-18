import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import jest from "eslint-plugin-jest";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierPlugin from "eslint-plugin-prettier";

export default defineConfig([
  {
    name: "server-js",
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    plugins: { js },
    rules: {
      ...js.configs.recommended.rules,
      "prefer-const": "error",
      "no-else-return": "error",
      "one-var": ["error", "never"],
      "no-unused-expressions": "error",
      "no-unused-vars": "warn",
      "no-console": "off",
      eqeqeq: "error",
      curly: "error",
      "no-var": "error",
      "object-shorthand": "warn",
      "arrow-body-style": ["warn", "as-needed"],
      "no-duplicate-imports": "error",
      "no-multiple-empty-lines": ["warn", { max: 1 }],
      semi: ["error", "always"],
      quotes: ["error", "double", { avoidEscape: true }],
      "comma-dangle": ["error", "always-multiline"],
      "new-cap": ["error", { newIsCap: true, capIsNew: false }],
    },
  },
  {
    name: "server-ts",
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd(),
      },
      globals: globals.node,
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      "prefer-const": "error",
      "no-else-return": "error",
      "one-var": ["error", "never"],
      "no-unused-expressions": "error",
      "no-console": "off",
      eqeqeq: "error",
      curly: "error",
      "no-var": "error",
      "object-shorthand": "warn",
      "arrow-body-style": ["warn", "as-needed"],
      "no-duplicate-imports": "error",
      "no-multiple-empty-lines": ["warn", { max: 1 }],
      semi: ["error", "always"],
      quotes: ["error", "double", { avoidEscape: true }],
      "comma-dangle": ["error", "always-multiline"],
      "new-cap": ["error", { newIsCap: true, capIsNew: false }],

      // TS-specific best practices
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-inferrable-types": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/prefer-as-const": "error",
      "@typescript-eslint/default-param-last": "error",
      "@typescript-eslint/prefer-enum-initializers": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
  {
    name: "server-tests",
    files: ["tests/**/*.{js,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd(),
      },
      globals: { ...globals.node, ...globals.jest },
    },
    plugins: { jest, "@typescript-eslint": tseslint },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-console": "off",
      "jest/no-disabled-tests": "warn",
      "jest/no-focused-tests": "error",
      "jest/no-identical-title": "error",
      "jest/valid-expect": "error",
    },
  },
  {
    files: ["**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["**/*.{js,ts,jsx,tsx}"],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": [
        "error",
        {
          printWidth: 100,
          tabWidth: 2,
          useTabs: false,
          semi: true,
          singleQuote: false,
          bracketSpacing: true,
          arrowParens: "always",
          endOfLine: "auto",
        },
      ],
    },
  },
]);
