import type { Config } from "@vtp/config";

import { createApp } from "./app.ts";

export { createApp } from "./app.ts";

export function startServer(config: Config) {
  const { app } = createApp(config);

  return app.listen(config.SERVER_PORT, () => {
    console.log(
      `Auth server listening on http://localhost:${config.SERVER_PORT}`,
    );
  });
}
