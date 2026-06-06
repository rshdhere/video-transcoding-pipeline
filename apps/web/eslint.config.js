import { nextJsConfig } from "@vtp/eslint-config/next-js";
import globals from "globals";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    files: ["next.config.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
];
