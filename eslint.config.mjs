import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["*/.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node
      }
    }
  },
  {
    // Voeg hier browser globals toe voor je client-side code
    languageOptions: {
      globals: {
        ...globals.browser,
        Swiper: "readonly",
        List: "readonly",
        error: "readonly"
      }
    }
  },
  pluginJs.configs.recommended,
];