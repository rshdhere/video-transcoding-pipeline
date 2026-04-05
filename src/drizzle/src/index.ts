import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

export const dbClient = drizzle(process.env.DATABASE_URL!);

