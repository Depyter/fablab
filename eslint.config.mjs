import convexPlugin from "@convex-dev/eslint-plugin";
import { tanstackConfig } from "@tanstack/eslint-config";
import queryPlugin from "@tanstack/eslint-plugin-query";
import routerPlugin from "@tanstack/eslint-plugin-router";
import { defineConfig } from "eslint/config";

const tanstackJavascriptConfig = tanstackConfig.find(
  (config) => config.name === "tanstack/javascript",
);

export default defineConfig([
  {
    ignores: [
      ".output/**",
      ".vinxi/**",
      ".wrangler/**",
      "(private)old/**",
      "dist/**",
      "node_modules/**",
      "convex/_generated/**",
      "convex/**/_generated/**",
      "**/routeTree.gen.ts",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    languageOptions: {
      ...tanstackJavascriptConfig?.languageOptions,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: tanstackJavascriptConfig?.plugins,
  },
  ...routerPlugin.configs["flat/recommended"],
  ...queryPlugin.configs["flat/recommended"],
  ...convexPlugin.configs.recommended,
  {
    files: ["convex/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["*/_generated/server"],
              importNames: ["query", "mutation"],
              message: "Use helper.ts for queries and mutations",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["convex/helper.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);
