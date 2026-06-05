import type { Config } from "@vtp/config";
import type { Auth } from "@vtp/handlers";

export type RouteDeps = {
  auth: Auth;
  config: Config;
};
