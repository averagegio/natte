#!/usr/bin/env node
/**
 * Run database migrations against Neon.
 * Usage: DATABASE_URL=postgresql://... npm run db:migrate
 * Loads .env.local automatically if present.
 */

const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

function loadEnvFile(filename) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL is not set.");
  console.error("Set it in .env.local or pass it inline:");
  console.error("  DATABASE_URL=postgresql://... npm run db:migrate");
  process.exit(1);
}

const steps = [
  {
    label: "Enable pgcrypto extension",
    sql: `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,
  },
  {
    label: "Create users table",
    sql: `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      stripe_customer_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  },
  {
    label: "Add profile_pic column to users",
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic TEXT`,
  },
  {
    label: "Create subscriptions table",
    sql: `CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stripe_subscription_id TEXT UNIQUE,
      stripe_price_id TEXT,
      tier TEXT NOT NULL,
      billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
      status TEXT NOT NULL DEFAULT 'inactive',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  },
  {
    label: "Rename interval column to billing_interval (legacy fix)",
    sql: `ALTER TABLE subscriptions RENAME COLUMN interval TO billing_interval`,
    optional: true,
  },
  {
    label: "Create widget_connections table",
    sql: `CREATE TABLE IF NOT EXISTS widget_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('x')),
      x_username TEXT NOT NULL,
      bearer_token_encrypted TEXT NOT NULL,
      refresh_token_encrypted TEXT,
      auth_type TEXT DEFAULT 'bearer' CHECK (auth_type IN ('bearer', 'oauth2')),
      status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, provider, x_username)
    )`,
  },
  {
    label: "Add refresh_token_encrypted to widget_connections",
    sql: `ALTER TABLE widget_connections ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT`,
  },
  {
    label: "Add auth_type to widget_connections",
    sql: `ALTER TABLE widget_connections ADD COLUMN IF NOT EXISTS auth_type TEXT DEFAULT 'bearer'`,
  },
  {
    label: "Create indexes",
    sql: `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  },
  {
    label: "Create subscriptions index",
    sql: `CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)`,
  },
  {
    label: "Create widget_connections index",
    sql: `CREATE INDEX IF NOT EXISTS idx_widget_connections_user_id ON widget_connections(user_id)`,
  },
  {
    label: "Create detection_usage table",
    sql: `CREATE TABLE IF NOT EXISTS detection_usage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  },
  {
    label: "Create detection_usage index",
    sql: `CREATE INDEX IF NOT EXISTS idx_detection_usage_user_month ON detection_usage(user_id, created_at)`,
  },
  {
    label: "Allow OAuth-only users (nullable password_hash)",
    sql: `ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`,
  },
  {
    label: "Create oauth_accounts table",
    sql: `CREATE TABLE IF NOT EXISTS oauth_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('x')),
      provider_user_id TEXT NOT NULL,
      email TEXT,
      username TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (provider, provider_user_id)
    )`,
  },
  {
    label: "Create oauth_accounts user index",
    sql: `CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id)`,
  },
];

async function main() {
  const sql = neon(url);
  console.log(`Running ${steps.length} migration steps...\n`);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    process.stdout.write(`  [${i + 1}/${steps.length}] ${step.label}... `);
    try {
      await sql.query(step.sql);
      console.log("OK");
    } catch (err) {
      if (step.optional) {
        console.log("SKIP (not needed)");
        continue;
      }
      console.log("FAILED");
      console.error(`\n${err.message}`);
      process.exit(1);
    }
  }

  console.log("\nMigration complete. Tables ready:");
  console.log("  - users");
  console.log("  - subscriptions");
  console.log("  - widget_connections");
  console.log("  - detection_usage");
  console.log("  - oauth_accounts");
}

main();
