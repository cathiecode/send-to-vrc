import eslintConfigPrettierFlat from "eslint-config-prettier/flat";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import ts from "typescript-eslint";
import js from "@eslint/js";

export default defineConfig([
  {
    ignores: ["./src/bindings.gen.ts"],
  },
  js.configs.recommended,
  ts.configs.recommended,
  eslintConfigPrettierFlat,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat.recommended,
  {
    files: ["./src/**/*.{js,jsx,ts,tsx}"],
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/no-unknown-property": ["error", { ignore: ["css"] }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
]);
