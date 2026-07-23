import { neon } from "@neondatabase/serverless";

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(url);
}

export type User = {
  id: string;
  email: string;
  name: string | null;
  profile_pic: string | null;
  created_at: string;
};

export type WidgetConnection = {
  id: string;
  user_id: string;
  provider: "x";
  x_username: string;
  status: "connected" | "disconnected" | "error";
  created_at: string;
  updated_at: string;
};

export type UserWithPassword = User & {
  password_hash: string | null;
};
