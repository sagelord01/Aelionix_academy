/**
 * Lets plain Node scripts import app modules that use the Next.js "@/" alias
 * and extensionless specifiers. Must be called before the aliased import.
 *
 *   registerAlias();
 *   const { buildTutorContext } = await import("@/lib/ai/context.js");
 */
import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

function resolveFile(url) {
  let filePath;
  try {
    filePath = fileURLToPath(url);
  } catch {
    return url;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return url;

  for (const suffix of [".js", ".mjs", ".jsx", "/index.js"]) {
    if (fs.existsSync(filePath + suffix)) {
      return pathToFileURL(filePath + suffix).href;
    }
  }

  return url;
}

export function registerAlias(rootDir = process.cwd()) {
  const root = pathToFileURL(path.resolve(rootDir) + "/").href;

  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith("@/")) {
        return nextResolve(resolveFile(root + specifier.slice(2)), context);
      }
      return nextResolve(specifier, context);
    },
  });
}
