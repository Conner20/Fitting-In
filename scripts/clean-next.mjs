import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const directory = process.argv[2] ?? ".next";

if (![".next", ".next-dev"].includes(directory)) {
  throw new Error(`Refusing to remove unexpected directory: ${directory}`);
}

const nextDir = join(process.cwd(), directory);
if (existsSync(nextDir)) rmSync(nextDir, { recursive: true, force: true });
