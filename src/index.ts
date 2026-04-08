import { app } from "./router.js";
import { PORT } from "./config/config.js";
import { ensureDatabaseConnection } from "./drizzle/src/health.js";

export const main = async () => {
  await ensureDatabaseConnection()

  app.listen(PORT, () => {
    console.log(`server listening on port ${PORT}`);
  });
}
