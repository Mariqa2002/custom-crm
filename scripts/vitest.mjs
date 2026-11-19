// Runs Vitest with an upper-case Windows drive letter. When the terminal's
// cwd is "c:\..." Vite loads some modules twice ("failed to find the current
// suite"). Elsewhere this is a plain passthrough.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const cwd = process.cwd().replace(/^[a-z]:/, (d) => d.toUpperCase());
const pkg = createRequire(import.meta.url).resolve("vitest/package.json", { paths: [cwd] });
const bin = path.join(path.dirname(pkg), "vitest.mjs");
const args = process.argv.slice(2);
const r = spawnSync(process.execPath, [bin, ...(args.length ? args : ["run"])], { cwd, stdio: "inherit" });
process.exit(r.status ?? 1);
