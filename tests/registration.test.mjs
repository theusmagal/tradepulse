import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(
  fs.readFileSync(new URL("../app/api/register/route.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }
).outputText;

function handler(existing = null) {
  const queries = [];
  const created = [];
  const sandboxModule = { exports: {} };
  vm.runInNewContext(source, {
    module: sandboxModule, exports: sandboxModule.exports, console,
    require(name) {
      if (name === "@/lib/prisma") return { prisma: { user: {
        findUnique: async (query) => { queries.push(query); return existing; },
        create: async ({ data }) => { created.push(data); return data; },
      } } };
      return require(name);
    },
  });
  return { POST: sandboxModule.exports.POST, queries, created };
}

function request(body) {
  return new Request("https://example.test/api/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("mixed-case registration uses the same normalized email as login and hashes the unchanged password", async () => {
  const { POST, queries, created } = handler();
  const password = "Case Sensitive Password!";
  const response = await POST(request({ email: "  Trader@Example.com  ", password }));
  assert.equal(response.status, 200);
  assert.equal(queries[0].where.email, "trader@example.com");
  assert.equal(created[0].email, "trader@example.com");
  assert.notEqual(created[0].password, password);
  assert(await require("bcrypt").compare(password, created[0].password));
});

test("case variants of an existing normalized email return conflict", async () => {
  const { POST, queries, created } = handler({ id: "existing-user" });
  const response = await POST(request({ email: "Trader@Example.com", password: "test-password" }));
  assert.equal(response.status, 409);
  assert.equal(queries[0].where.email, "trader@example.com");
  assert.equal(created.length, 0);
});

test("blank or non-string credentials are rejected before accessing the database", async () => {
  for (const body of [null, { email: "  ", password: "test-password" }, { email: 123, password: "test-password" }, { email: "a@example.com", password: [] }]) {
    const { POST, queries, created } = handler();
    assert.equal((await POST(request(body))).status, 400);
    assert.equal(queries.length, 0);
    assert.equal(created.length, 0);
  }
});
