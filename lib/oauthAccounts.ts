import { getDb } from "./db";
import { createSessionToken, setSessionCookie } from "./auth";

export type OAuthProvider = "x";
export type OAuthIntent = "signup" | "login";

export type OAuthProfile = {
  provider: OAuthProvider;
  providerUserId: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  username?: string | null;
};

export class OAuthAccountError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function syntheticEmail(provider: OAuthProvider, providerUserId: string) {
  return `${provider}_${providerUserId}@oauth.natte.local`;
}

export function parseOAuthIntent(value: string | null | undefined): OAuthIntent {
  return value === "login" ? "login" : "signup";
}

/**
 * Find or create a user from an OAuth identity, then establish a session cookie.
 * - signup: create a new account when needed (or sign into an existing linked account)
 * - login: require an existing oauth link or matching email account
 */
export async function signInWithOAuthProfile(
  profile: OAuthProfile,
  intent: OAuthIntent = "signup"
) {
  const sql = getDb();
  const providerUserId = String(profile.providerUserId);
  const email = profile.email?.trim().toLowerCase() || null;
  const name = profile.name?.trim() || profile.username?.trim() || null;
  const avatarUrl = profile.avatarUrl?.trim() || null;

  const existingLink = await sql`
    SELECT user_id
    FROM oauth_accounts
    WHERE provider = ${profile.provider} AND provider_user_id = ${providerUserId}
    LIMIT 1
  `;

  let userId: string;
  let isNewUser = false;

  if (existingLink.length > 0) {
    userId = String(existingLink[0].user_id);

    await sql`
      UPDATE oauth_accounts
      SET
        email = COALESCE(${email}, email),
        username = COALESCE(${profile.username ?? null}, username),
        updated_at = NOW()
      WHERE provider = ${profile.provider} AND provider_user_id = ${providerUserId}
    `;

    if (name || avatarUrl) {
      await sql`
        UPDATE users
        SET
          name = COALESCE(${name}, name),
          profile_pic = COALESCE(${avatarUrl}, profile_pic)
        WHERE id = ${userId}
      `;
    }
  } else {
    let linkedUserId: string | null = null;

    if (email) {
      const byEmail = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
      if (byEmail.length > 0) {
        linkedUserId = String(byEmail[0].id);
      }
    }

    if (intent === "login" && !linkedUserId) {
      throw new OAuthAccountError(
        "account_not_found",
        "No account found for this social login. Sign up with X first."
      );
    }

    if (linkedUserId) {
      userId = linkedUserId;
      if (name || avatarUrl) {
        await sql`
          UPDATE users
          SET
            name = COALESCE(${name}, name),
            profile_pic = COALESCE(${avatarUrl}, profile_pic)
          WHERE id = ${userId}
        `;
      }
    } else {
      const accountEmail = email || syntheticEmail(profile.provider, providerUserId);
      const created = await sql`
        INSERT INTO users (email, password_hash, name, profile_pic)
        VALUES (${accountEmail}, NULL, ${name}, ${avatarUrl})
        RETURNING id
      `;
      userId = String(created[0].id);
      isNewUser = true;
    }

    await sql`
      INSERT INTO oauth_accounts (
        user_id,
        provider,
        provider_user_id,
        email,
        username
      )
      VALUES (
        ${userId},
        ${profile.provider},
        ${providerUserId},
        ${email},
        ${profile.username ?? null}
      )
      ON CONFLICT (provider, provider_user_id) DO UPDATE
      SET
        email = COALESCE(EXCLUDED.email, oauth_accounts.email),
        username = COALESCE(EXCLUDED.username, oauth_accounts.username),
        updated_at = NOW()
    `;
  }

  const token = await createSessionToken(userId);
  await setSessionCookie(token);

  const users = await sql`
    SELECT id, email, name, profile_pic
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;

  return {
    user: users[0],
    isNewUser,
    intent,
  };
}
