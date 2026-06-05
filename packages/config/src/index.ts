import { envSchema, type Env } from "@vtp/validators";

export type Config = Env;

export function loadConfig(
  source: Record<string, string | undefined> = process.env,
): Config {
  return envSchema.parse(source);
}
