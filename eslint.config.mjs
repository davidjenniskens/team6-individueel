import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  pluginJs.configs.recommended,

  // Node.js backend
  {
    files: ["server.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
  },

  // Frontend JavaScript
  {
    files: ["static/javascript/**"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.browser,
        Swiper: true,
        List: true,
      },
    },
  },
];
