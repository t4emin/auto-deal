import { mkdir, rm, cp, writeFile, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageJson = JSON.parse(await (await import("node:fs/promises")).readFile(path.join(root, "package.json"), "utf8"));
const name = packageJson.name ?? "autodealer-cms";
const version = packageJson.version ?? "0.1.0";
const outDir = path.join(root, "outputs");
const stageRoot = path.join(outDir, `${name}-v${version}`);
const archivePath = path.join(outDir, `${name}-v${version}.tar.gz`);

const excludedNames = new Set([
  ".git", "node_modules", ".next", "dist", ".vinext", ".wrangler",
  "coverage", "outputs", "work", ".env", ".dev.vars", ".DS_Store",
]);

function filter(source) {
  const base = path.basename(source);
  if (excludedNames.has(base)) return false;
  if (base.endsWith(".tsbuildinfo")) return false;
  if (/^(npm|yarn|pnpm)-debug\.log/.test(base)) return false;
  return true;
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await mkdir(stageRoot, { recursive: true });
for (const entry of await readdir(root)) {
  const source = path.join(root, entry);
  if (!filter(source)) continue;
  await cp(source, path.join(stageRoot, entry), { recursive: true, filter });
}
await writeFile(path.join(stageRoot, "PACKAGE_CONTENTS.txt"), [
  `${name} v${version}`,
  "Commercial source distribution package.",
  "Generated without .git, node_modules, build output, runtime state, or real environment files.",
  "",
].join("\n"));

await new Promise((resolve, reject) => {
  const tar = spawn("tar", ["-czf", archivePath, "-C", outDir, `${name}-v${version}`], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  tar.on("error", reject);
  tar.on("close", (code) => code === 0 ? resolve() : reject(new Error(`tar exited with ${code}`)));
});

const relative = path.relative(root, archivePath);
console.log(`Created ${relative}`);
