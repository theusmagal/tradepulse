import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readdir } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const suffix = randomBytes(8).toString("hex");
const container = `tradepulse-integration-${suffix}`;
const database = `tradepulse_integration_${suffix}`;
const password = randomBytes(32).toString("hex");
const secret = randomBytes(32).toString("hex");
const testPassword = randomBytes(24).toString("hex");
let server;
let containerStarted = false;
let serverLog = "";
let databaseUrl = "";
const sensitive = [password, secret, testPassword];
const redact = (value) => sensitive.reduce((text, item) => text.replaceAll(item, "[redacted]"), String(value));

// Do not inherit application credentials, auth-bypass switches, or production URLs.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  ["PATH", "HOME", "USERPROFILE", "SystemRoot", "TMPDIR", "TMP", "TEMP", "CI", "GITHUB_ACTIONS", "PNPM_HOME", "NODE_EXTRA_CA_CERTS"].includes(key)
));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"], ...options });
    let output = "";
    for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { output += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) reject(new Error(`${command} ${args.slice(0, 2).join(" ")} failed (exit ${code}):\n${redact(output)}`));
      else resolve(output.trim());
    });
  });
}

async function freePort() {
  const socket = net.createServer();
  await new Promise((resolve, reject) => { socket.once("error", reject); socket.listen(0, "127.0.0.1", resolve); });
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

async function cleanup() {
  if (server && server.exitCode === null && server.signalCode === null) {
    const stopped = new Promise((resolve) => server.once("close", resolve));
    server.kill("SIGTERM");
    const timer = setTimeout(() => server.kill("SIGKILL"), 5000);
    await stopped;
    clearTimeout(timer);
  }
  if (containerStarted) {
    await run("docker", ["rm", "--force", container]);
    containerStarted = false;
    console.log("Removed disposable PostgreSQL container.");
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => {
  cleanup().finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
});

try {
  const envFiles = (await readdir(root)).filter((name) => /^\.env($|\.)/.test(name) && name !== ".env.example");
  if (envFiles.length) throw new Error("Use a clean checkout without .env files. This suite supplies test-only configuration and refuses local application credentials.");
  try { await run("docker", ["info", "--format", "{{.ServerVersion}}"]); }
  catch { throw new Error("Disposable conventional PostgreSQL requires Docker with a running daemon. Start Docker, or run the PostgreSQL integration GitHub Actions workflow. No external DATABASE_URL is accepted."); }

  if (process.env.GITHUB_ACTIONS === "true") {
    for (const value of sensitive) console.log(`::add-mask::${value}`);
  }
  console.log("Starting a fresh PostgreSQL 16 container on loopback with generated credentials.");
  await run("docker", ["run", "--detach", "--rm", "--name", container,
    "--env", "POSTGRES_PASSWORD", "--env", "POSTGRES_USER=tradepulse_test",
    "--env", `POSTGRES_DB=${database}`, "--publish", "127.0.0.1::5432", "postgres:16"],
  { env: { ...env, POSTGRES_PASSWORD: password } });
  containerStarted = true;
  const binding = await run("docker", ["port", container, "5432/tcp"]);
  const match = /^127\.0\.0\.1:(\d+)$/.exec(binding);
  if (!match) throw new Error("Docker did not bind PostgreSQL exclusively to loopback.");
  databaseUrl = `postgresql://tradepulse_test:${password}@127.0.0.1:${match[1]}/${database}?connection_limit=2`;
  sensitive.push(databaseUrl);
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { await run("docker", ["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "tradepulse_test", "-d", database]); ready = true; break; }
    catch { await new Promise((resolve) => setTimeout(resolve, 500)); }
  }
  if (!ready) throw new Error("Disposable PostgreSQL did not become ready within 30 seconds.");

  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  Object.assign(env, {
    NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
    DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl,
    NEXTAUTH_URL: origin, NEXTAUTH_SECRET: secret, NEXT_PUBLIC_APP_URL: origin,
    STRIPE_SECRET_KEY: "sk_test_placeholder_no_stripe_requests",
    INTEGRATION_TEST_RUN: "1", INTEGRATION_DATABASE_NAME: database,
    INTEGRATION_ORIGIN: origin, INTEGRATION_PASSWORD: testPassword,
  });
  for (const [label, args] of [
    ["Generate Prisma client", ["exec", "prisma", "generate"]],
    ["Apply committed Prisma migrations", ["exec", "prisma", "migrate", "deploy"]],
    ["Verify migration status", ["exec", "prisma", "migrate", "status"]],
    ["Build application", ["run", "build"]],
  ]) {
    console.log(`${label}…`);
    console.log(redact(await run(pnpm, args)));
  }
  server = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: root, env, stdio: ["ignore", "pipe", "pipe"],
  });
  server.on("error", (error) => { serverLog += error.message; });
  for (const stream of [server.stdout, server.stderr]) stream.on("data", (chunk) => { serverLog = (serverLog + chunk).slice(-16000); });
  let listening = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error("Built application exited before becoming ready.");
    try { if ((await fetch(`${origin}/api/ping`, { signal: AbortSignal.timeout(1000) })).ok) { listening = true; break; } } catch { /* still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!listening) throw new Error("Built application did not become ready within 10 seconds.");
  console.log("Run real HTTP authentication and two-user isolation checks…");
  console.log(redact(await run(process.execPath, ["--test", "tests/integration/auth.test.mjs"])));
} catch (error) {
  console.error(redact(error.message));
  if (serverLog) console.error(redact(serverLog));
  process.exitCode = 1;
} finally {
  try { await cleanup(); } catch (error) { console.error(redact(error.message)); process.exitCode = 1; }
}
