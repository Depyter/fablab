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
              importNames: ["query", "mutation"],
              message: "Use helper.ts for queries and mutations",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/components/booking/**/*.{ts,tsx}",
      "src/components/calendar/**/*.{ts,tsx}",
      "convex/projects/helper.ts",
      "convex/resource/mutate.ts",
      "convex/services/query.ts",
      "convex/services/mutate.ts",
    ],
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
            {
              group: ["date-fns"],
              message:
                "Use src/lib/lab-time.ts helpers instead of direct date-fns usage in booking and calendar flows.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date']",
          message:
            "Use src/lib/lab-time.ts helpers instead of constructing Date directly in booking and calendar flows.",
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message:
            "Use getCurrentTimestamp from src/lib/lab-time.ts instead of Date.now().",
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='parse']",
          message:
            "Use src/lib/lab-time.ts helpers instead of Date.parse() in booking and calendar flows.",
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='UTC']",
          message:
            "Use src/lib/lab-time.ts helpers instead of Date.UTC() in booking and calendar flows.",
        },
        {
          selector:
            "CallExpression[callee.property.name=/^(toLocaleDateString|toLocaleTimeString|toLocaleString|toISOString)$/]",
          message:
            "Use src/lib/lab-time.ts formatting helpers instead of direct locale date formatting in booking and calendar flows.",
        },
        {
          selector:
            "CallExpression[callee.property.name=/^(getFullYear|getMonth|getDate|getDay|getHours|getMinutes|setHours|setMinutes)$/]",
          message:
            "Use src/lib/lab-time.ts helpers instead of direct Date field access in booking and calendar flows.",
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
