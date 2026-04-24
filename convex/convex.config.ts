import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import presence from "@convex-dev/presence/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

const app = defineApp();
app.use(betterAuth);
app.use(presence);
app.use(rateLimiter);

export default app;
