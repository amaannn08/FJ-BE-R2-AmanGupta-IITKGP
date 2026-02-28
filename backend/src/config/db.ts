import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function connectDB() {
  try {
    const client = await pool.connect();

    console.log("Connected to Database");

    client.release();
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}