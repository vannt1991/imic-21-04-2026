import { assertBuildDatabaseReady } from "./build-prerequisites.mjs";

try {
  await assertBuildDatabaseReady();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
