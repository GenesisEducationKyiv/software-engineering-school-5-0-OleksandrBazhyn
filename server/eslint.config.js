import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import jest from "eslint-plugin-jest";
import prettier from "eslint-config-prettier";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([
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
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "no-console": "off",
      eqeqeq: "error",
      curly: "error",
      "no-var": "error",
      "prefer-const": "error",
      "object-shorthand": "warn",
      "arrow-body-style": ["warn", "as-needed"],
      "no-duplicate-imports": "error",
      "no-multiple-empty-lines": ["warn", { max: 1 }],
      semi: ["error", "always"],
      quotes: ["error", "double", { avoidEscape: true }],
      "comma-dangle": ["error", "always-multiline"],
      "new-cap": ["error", { newIsCap: true, capIsNew: false }],
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-inferrable-types": "warn",
    },
  },
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
      "no-unused-vars": "warn",
      "no-console": "off",
      eqeqeq: "error",
      curly: "error",
      "no-var": "error",
      "prefer-const": "error",
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
    name: "prettier",
    ...prettier,
  },
]);
