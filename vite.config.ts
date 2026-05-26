// vite.config.ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import babelPlugin from "@rolldown/plugin-babel";

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    // Enables Vite to resolve imports using path aliases.
    tsconfigPaths: true,
  },
  ssr: {
    noExternal: ["@convex-dev/better-auth"],
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src", // This is the default
      router: {
        // Specifies the directory TanStack Router uses for your routes.
        routesDirectory: "app", // Defaults to "routes", relative to srcDirectory
      },
    }),
    babelPlugin({
      presets: [reactCompilerPreset()],
    }),
    viteReact(),
    nitro(),
  ],
});
