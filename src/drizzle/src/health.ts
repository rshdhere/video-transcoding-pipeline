import { Client } from "pg";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const MAX_RETRIES = 10;

export const ensureDatabaseConnection = async () => {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      await client.connect();
      console.log("database connection established");
      await client.end();

      return;
    } catch (error) {
      retries++;

      const delay = Math.min(1000 * 2 ** retries, 30000); // max 30s

      console.error(
        `database connection failed (attempt ${retries}/${MAX_RETRIES}) → retrying in ${delay}ms`
      );

      if (retries >= MAX_RETRIES) {
        console.error("max retries reached for db, ciao!");
        process.exit(1);
      }

      await sleep(delay);
    }
  }
};
