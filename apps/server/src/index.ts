import { run } from "./bin.ts";

run().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
