import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

for (const directory of [".next", ".next-dev"]) {
  const nextDir = join(process.cwd(), directory);
  if (existsSync(nextDir)) rmSync(nextDir, { recursive: true, force: true });
}
