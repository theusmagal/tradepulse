import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");

// Exercise the actual middleware without a server, database, or real sessions.
const filename = fileURLToPath(new URL("../middleware.ts", import.meta.url));
const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

function loadMiddleware(token) {
  const calls = [];
  const sandboxModule = { exports: {} };
  vm.runInNewContext(source, {
    module: sandboxModule,
    exports: sandboxModule.exports,
    URL,
    process: { env: { NEXTAUTH_SECRET: "test-only-secret" } },
    require(name) {
      if (name === "next-auth/jwt") {
        return {
          getToken: async (args) => {
            calls.push(args);
            return token;
          },
        };
      }
      return require(name);
    },
  }, { filename });
  return { middleware: sandboxModule.exports.middleware, calls };
}

const publicPaths = [
  "/", "/pricing", "/legal/terms", "/legal/privacy", "/auth/login",
  "/auth/register", "/auth/auto-checkout", "/api/register", "/api/webhook",
  "/api/ping", "/api/auth/session", "/api/auth/callback/credentials",
  "/_next/static/chunks/example.js", "/_next/image", "/static/example.png",
  "/marketing/KPI.png", "/favicon.ico", "/file.svg", "/globe.svg",
  "/grid.svg", "/logo.svg", "/next.svg", "/vercel.svg", "/window.svg",
];

for (const pathname of publicPaths) {
  test(`public route remains accessible: ${pathname}`, async () => {
    const { middleware, calls } = loadMiddleware(null);
    const response = await middleware(new NextRequest(`https://example.test${pathname}`));
    assert.equal(response.headers.get("x-middleware-next"), "1");
    assert.equal(calls.length, 0);
  });
}

const protectedPaths = [
  "/dashboard", "/journal", "/settings/profile", "/settings/integrations",
  "/api/me/summary", "/api/import/binance-futures", "/api/billing/checkout",
  "/pricing-private", "/auth/login-extra", "/api/authentication",
  "/api/register-extra", "/api/webhook/extra", "/static-private/file.png",
  "/marketing-private/file.png", "/favicon-private", "/_next-private",
];

for (const pathname of protectedPaths) {
  test(`unauthenticated route redirects: ${pathname}`, async () => {
    const { middleware, calls } = loadMiddleware(null);
    const request = new NextRequest(`https://example.test${pathname}?range=7d&ym=2026-11`);
    const response = await middleware(request);
    assert.equal(response.status, 307);
    const location = new URL(response.headers.get("location"));
    assert.equal(location.origin, "https://example.test");
    assert.equal(location.pathname, "/auth/login");
    assert.equal(location.searchParams.get("callbackUrl"), `${pathname}?range=7d&ym=2026-11`);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].req, request);
    assert.equal(calls[0].secret, "test-only-secret");
  });

  test(`authenticated route proceeds: ${pathname}`, async () => {
    const { middleware, calls } = loadMiddleware({ userId: "test-user" });
    const response = await middleware(new NextRequest(`https://example.test${pathname}`));
    assert.equal(response.headers.get("x-middleware-next"), "1");
    assert.equal(calls.length, 1);
  });
}
