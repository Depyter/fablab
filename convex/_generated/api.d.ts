/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as chat_helper from "../chat/helper.js";
import type * as chat_mutate from "../chat/mutate.js";
import type * as chat_query from "../chat/query.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as files from "../files.js";
import type * as helper from "../helper.js";
import type * as http from "../http.js";
import type * as materials_mutate from "../materials/mutate.js";
import type * as materials_query from "../materials/query.js";
import type * as presence from "../presence.js";
import type * as projects_helper from "../projects/helper.js";
import type * as projects_mutate from "../projects/mutate.js";
import type * as projects_query from "../projects/query.js";
import type * as resource_helper from "../resource/helper.js";
import type * as resource_mutate from "../resource/mutate.js";
import type * as resource_query from "../resource/query.js";
import type * as services_mutate from "../services/mutate.js";
import type * as services_query from "../services/query.js";
import type * as test_helper from "../test/helper.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "chat/helper": typeof chat_helper;
  "chat/mutate": typeof chat_mutate;
  "chat/query": typeof chat_query;
  constants: typeof constants;
  crons: typeof crons;
  files: typeof files;
  helper: typeof helper;
  http: typeof http;
  "materials/mutate": typeof materials_mutate;
  "materials/query": typeof materials_query;
  presence: typeof presence;
  "projects/helper": typeof projects_helper;
  "projects/mutate": typeof projects_mutate;
  "projects/query": typeof projects_query;
  "resource/helper": typeof resource_helper;
  "resource/mutate": typeof resource_mutate;
  "resource/query": typeof resource_query;
  "services/mutate": typeof services_mutate;
  "services/query": typeof services_query;
  "test/helper": typeof test_helper;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  presence: import("@convex-dev/presence/_generated/component.js").ComponentApi<"presence">;
};
