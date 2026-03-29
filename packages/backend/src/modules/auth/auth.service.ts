import { eq, lt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { sessions, users } from "../../db/schema.js";

export interface GoogleProfile {
  sub: string;   // Google's unique user ID
  email: string;
  name: string;
  picture: string;
}

export interface SessionUser {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: "FREE" | "PRO" | "ADVANCED";
}

/**
 * Find or create a user from a Google OAuth profile.
 * Lookup order: googleId → email → create new.
 */
export async function upsertUser(profile: GoogleProfile): Promise<SessionUser> {
  // 1. Try by googleId (returning visitor)
  const byGoogleId = await db
    .select()
    .from(users)
    .where(eq(users.googleId, profile.sub))
    .limit(1);

  if (byGoogleId[0]) {
    const u = byGoogleId[0];
    // Keep name/avatar in sync
    await db
      .update(users)
      .set({ name: profile.name, avatarUrl: profile.picture })
      .where(eq(users.id, u.id));
    return { id: u.id, email: u.email, name: profile.name, avatarUrl: profile.picture, plan: u.plan };
  }

  // 2. Try by email (pre-existing account without googleId)
  const byEmail = await db
    .select()
    .from(users)
    .where(eq(users.email, profile.email))
    .limit(1);

  if (byEmail[0]) {
    const u = byEmail[0];
    await db
      .update(users)
      .set({ googleId: profile.sub, name: profile.name, avatarUrl: profile.picture })
      .where(eq(users.id, u.id));
    return { id: u.id, email: u.email, name: profile.name, avatarUrl: profile.picture, plan: u.plan };
  }

  // 3. New user
  const result = await db
    .insert(users)
    .values({
      email: profile.email,
      googleId: profile.sub,
      name: profile.name,
      avatarUrl: profile.picture,
    })
    .returning({ id: users.id, plan: users.plan });

  const inserted = result[0]!;
  return { id: inserted.id, email: profile.email, name: profile.name, avatarUrl: profile.picture, plan: inserted.plan };
}

/** Create a session valid for 30 days. Returns the session ID. */
export async function createSession(userId: number): Promise<string> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.insert(sessions).values({ id, userId, expiresAt });
  return id;
}

/** Validate session and return the associated user, or null if invalid/expired. */
export async function getSessionUser(sessionId: string): Promise<SessionUser | null> {
  const now = new Date().toISOString();

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      plan: users.plan,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const row = rows[0];
  if (!row || row.expiresAt <= now) return null;

  return { id: row.id, email: row.email, name: row.name, avatarUrl: row.avatarUrl, plan: row.plan };
}

/** Delete a session (logout). */
export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/** Purge expired sessions (call periodically). */
export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date().toISOString()));
}
