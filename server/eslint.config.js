import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import jest from "eslint-plugin-jest";
import prettier from "eslint-config-prettier";

export default defineConfig([
  {
    name: "server",
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    plugins: { js },
    extends: ["js/recommended", prettier],
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off", // Allow console for backend logging
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
    },
  },
  {
    name: "server-tests",
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node, ...globals.jest },
    },
    plugins: { js, jest },
    extends: ["js/recommended", prettier],
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "jest/no-disabled-tests": "warn",
      "jest/no-focused-tests": "error",
      "jest/no-identical-title": "error",
      "jest/valid-expect": "error",
    },
  },
]);
