import { readdirSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const convexDir = resolve(currentDir, "../convex");
const supportedExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);

function normalizeModuleKey(filePath: string) {
  return filePath.split(sep).join("/");
}

function collectConvexModulePaths(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      return collectConvexModulePaths(fullPath);
    }

    const extension = extname(entry.name);
    if (
      !supportedExtensions.has(extension) ||
      entry.name.endsWith(".d.ts") ||
      entry.name.endsWith(".config.ts")
    ) {
      return [];
    }

    return [fullPath];
  });
}

export const convexTestModules = Object.fromEntries(
  collectConvexModulePaths(convexDir).map((filePath) => [
    normalizeModuleKey(filePath),
    () => import(pathToFileURL(filePath).href),
  ]),
);
