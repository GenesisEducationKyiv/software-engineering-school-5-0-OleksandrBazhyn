import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import process from "node:process";

export default defineConfig([
  {
    ignores: [
      "dist/",
      "node_modules/",
      "*.config.js",
      "*.config.cjs",
      "*.config.mjs",
      ".eslintrc.js",
      ".eslintrc.cjs",
      ".eslintrc.mjs",
      ".prettierrc",
      "*.d.ts",
    ],
    name: "client-ts",
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd(),
      },
      globals: globals.browser,
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      js,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/self-closing-comp": "warn",
      "react/jsx-key": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],

      "no-console": "warn",
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
    ignores: [
      "dist/",
      "node_modules/",
      "*.config.js",
      "*.config.cjs",
      "*.config.mjs",
      ".eslintrc.js",
      ".eslintrc.cjs",
      ".eslintrc.mjs",
      ".prettierrc",
      "*.d.ts",
    ],
    name: "client-js",
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      js,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/self-closing-comp": "warn",
      "react/jsx-key": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "warn",
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
    name: "prettier",
    ...prettier,
  },
]);
