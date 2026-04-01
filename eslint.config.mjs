import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import convexPlugin from "@convex-dev/eslint-plugin";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  ...convexPlugin.configs.recommended,
  {
    rules: {
      "react/no-children-prop": "off",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["*/_generated/server"],
              importNames: ["query", "mutation", "action"],
              message: "Use helper.ts for query, mutation, or action",
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
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      "convex/_generated/**",
    ],
  },
]);
