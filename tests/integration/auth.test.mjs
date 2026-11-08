import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { encode } from "next-auth/jwt";

// This file is run only by the container-owning runner, never against supplied DB URLs.
const url = new URL(process.env.DATABASE_URL || "postgresql://invalid/invalid");
const origin = new URL(process.env.INTEGRATION_ORIGIN || "http://invalid");
if (process.env.INTEGRATION_TEST_RUN !== "1" || url.hostname !== "127.0.0.1" ||
  url.username !== "tradepulse_test" || !/^tradepulse_integration_[a-f0-9]{16}$/.test(url.pathname.slice(1)) ||
  url.pathname.slice(1) !== process.env.INTEGRATION_DATABASE_NAME || origin.hostname !== "127.0.0.1") {
  throw new Error("Run pnpm test:integration. An isolated generated test database and loopback server are required.");
}
const prisma = new PrismaClient();
const password = process.env.INTEGRATION_PASSWORD;
const json = (body, method = "POST") => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

function client() {
  const cookies = new Map();
  return async (pathname, options = {}) => {
    const response = await fetch(new URL(pathname, origin), {
      ...options, redirect: "manual", signal: AbortSignal.timeout(10000),
      headers: { ...options.headers, Cookie: Array.from(cookies, ([key, value]) => `${key}=${value}`).join("; ") },
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      const separator = pair.indexOf("=");
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return response;
  };
}

async function login(browser, email, suppliedPassword = password, validCsrf = true) {
  const { csrfToken } = await (await browser("/api/auth/csrf")).json();
  return browser("/api/auth/callback/credentials", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken: validCsrf ? csrfToken : "invalid-csrf", email, password: suppliedPassword, callbackUrl: `${origin.origin}/dashboard`, json: "true" }),
  });
}

before(async () => {
  const [identity] = await prisma.$queryRaw`SELECT current_database() AS name, current_user AS role, version() AS version`;
  assert.equal(identity.name, process.env.INTEGRATION_DATABASE_NAME);
  assert.equal(identity.role, "tradepulse_test");
  assert.match(identity.version, /^PostgreSQL 16\./);
  assert.doesNotMatch(identity.version, /PGlite/i);
  const migrations = await prisma.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`;
  const expected = (await readdir(new URL("../../prisma/migrations/", import.meta.url), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  assert.deepEqual(migrations.map((migration) => migration.migration_name).sort(), expected);
  assert(migrations.every((migration) => migration.finished_at && !migration.rolled_back_at));
});
after(async () => { await prisma.$disconnect(); });

test("real registration, session security, membership and journal ownership", async (t) => {
  const a = client(), b = client();
  const emailA = "TraderA@integration.test", emailB = "traderb@integration.test";
  let userA, userB, entryA, entryB;

  await t.test("registers persisted users, normalizes email, hashes passwords and rejects case-variant duplicates", async () => {
    assert.equal((await a("/api/register", json({ email: `  ${emailA}  `, password }))).status, 200);
    assert.equal((await b("/api/register", json({ email: emailB, password }))).status, 200);
    userA = await prisma.user.findUniqueOrThrow({ where: { email: emailA.toLowerCase() } });
    userB = await prisma.user.findUniqueOrThrow({ where: { email: emailB } });
    assert.notEqual(userA.password, password);
    assert(await bcrypt.compare(password, userA.password));
    assert.equal((await client()("/api/register", json({ email: emailA.toUpperCase(), password }))).status, 409);
  });

  await t.test("rejects invalid CSRF and wrong passwords without creating an authenticated session", async () => {
    const badCsrf = client();
    const response = await login(badCsrf, emailA, password, false);
    assert(response.status < 500);
    const destination = response.headers.get("location") || (await response.json()).url;
    assert.equal(new URL(destination, origin).searchParams.get("csrf"), "true");
    assert.equal((await (await badCsrf("/api/auth/session")).json()).user, undefined);
    const wrongPassword = client();
    assert.equal((await login(wrongPassword, emailA, "incorrect-password")).status, 401);
    assert.equal((await (await wrongPassword("/api/auth/session")).json()).user, undefined);
  });

  await t.test("logs both users in through the CSRF-protected credential flow and returns distinct sessions", async () => {
    for (const [browser, email, user] of [[a, emailA, userA], [b, emailB, userB]]) {
      assert.equal((await login(browser, email)).status, 200);
      const session = await (await browser("/api/auth/session")).json();
      assert.equal(session.user.id, user.id);
      assert.equal(session.user.email, email.toLowerCase());
      assert(Number.isFinite(Date.parse(session.expires)));
    }
    assert.notEqual(userA.id, userB.id);
  });

  await t.test("rejects anonymous, expired and tampered sessions", async () => {
    assert.equal((await client()("/api/me/settings")).status, 307);
    const expired = await encode({ token: { userId: userA.id }, secret: process.env.NEXTAUTH_SECRET, maxAge: -120 });
    for (const token of [expired, "tampered-token"]) {
      const response = await fetch(`${origin.origin}/api/me/settings`, { redirect: "manual", headers: { Cookie: `next-auth.session-token=${token}` } });
      assert.equal(response.status, 307);
      assert.equal(new URL(response.headers.get("location")).pathname, "/auth/login");
    }
  });

  await t.test("denies membership-only pages and journal APIs to authenticated nonmembers", async () => {
    const response = await a("/dashboard");
    assert.equal(response.status, 307);
    const redirect = new URL(response.headers.get("location"), origin);
    assert.equal(redirect.pathname, "/settings/billing");
    assert.equal(redirect.searchParams.get("reason"), "subscribe");
    assert.equal((await a("/api/me/journal")).status, 401);
    assert.equal((await a("/api/me/journal", json({ content: "Must not be saved" }))).status, 401);
    assert.equal(await prisma.diaryEntry.count(), 0);
  });

  await t.test("allows actual member sessions while retaining each user's profile identity", async () => {
    // Fixture provisioning only: change these two disposable users, never auth code.
    await prisma.user.update({ where: { id: userA.id }, data: { subscriptionStatus: "trialing", trialEndsAt: new Date(Date.now() + 86400000) } });
    await prisma.user.update({ where: { id: userB.id }, data: { subscriptionStatus: "active" } });
    for (const [browser, email] of [[a, emailA], [b, emailB]]) {
      assert.equal((await browser("/dashboard")).status, 200);
      assert.equal((await browser("/api/me/summary")).status, 200);
      assert.equal((await (await browser("/api/me/settings")).json()).email, email.toLowerCase());
    }
  });

  await t.test("creates and lists journals only for the session user, ignoring a spoofed owner", async () => {
    const createdA = await a("/api/me/journal", json({ userId: userB.id, title: "A private", content: "User A private content" }));
    assert.equal(createdA.status, 200);
    entryA = (await createdA.json()).entry;
    const createdB = await b("/api/me/journal", json({ title: "B private", content: "User B private content" }));
    assert.equal(createdB.status, 200);
    entryB = (await createdB.json()).entry;
    assert.equal((await prisma.diaryEntry.findUniqueOrThrow({ where: { id: entryA.id } })).userId, userA.id);
    for (const [browser, own, foreign] of [[a, entryA, entryB], [b, entryB, entryA]]) {
      const { entries } = await (await browser("/api/me/journal")).json();
      assert(entries.some((entry) => entry.id === own.id));
      assert(!entries.some((entry) => entry.id === foreign.id));
    }
  });

  await t.test("rejects cross-user journal reads, updates and deletes in both directions", async () => {
    for (const [browser, foreign] of [[a, entryB], [b, entryA]]) {
      for (const method of ["GET", "PUT", "DELETE"]) {
        const response = await browser(`/api/me/journal/${foreign.id}`, method === "PUT" ? json({ content: "Unauthorized overwrite" }, method) : { method });
        assert.equal(response.status, 404);
      }
    }
    assert.equal((await prisma.diaryEntry.findUniqueOrThrow({ where: { id: entryA.id } })).content, "User A private content");
    assert.equal((await prisma.diaryEntry.findUniqueOrThrow({ where: { id: entryB.id } })).content, "User B private content");
  });

  await t.test("permits owner updates/deletes and denies nonexistent IDs", async () => {
    assert.equal((await a(`/api/me/journal/${entryA.id}`, json({ title: "Updated", content: "Owner update" }, "PUT"))).status, 200);
    assert.equal((await (await a(`/api/me/journal/${entryA.id}`)).json()).entry.content, "Owner update");
    assert.equal((await a(`/api/me/journal/${entryA.id}`, { method: "DELETE" })).status, 200);
    assert.equal((await a(`/api/me/journal/${entryA.id}`)).status, 404);
    assert.equal((await a(`/api/me/journal/${randomUUID()}`)).status, 404);
  });

  await t.test("membership revocation is enforced even while the session remains valid", async () => {
    await prisma.user.update({ where: { id: userB.id }, data: { subscriptionStatus: "canceled", trialEndsAt: new Date(Date.now() - 86400000) } });
    assert.equal((await (await b("/api/auth/session")).json()).user.id, userB.id);
    assert.equal((await b("/dashboard")).status, 307);
    assert.equal((await b("/api/me/journal")).status, 401);
  });

  await t.test("signout clears the real session and protected access", async () => {
    const { csrfToken } = await (await b("/api/auth/csrf")).json();
    assert.equal((await b("/api/auth/signout", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken, json: "true" }) })).status, 200);
    assert.equal((await (await b("/api/auth/session")).json()).user, undefined);
    assert.equal((await b("/api/me/settings")).status, 307);
  });
});
