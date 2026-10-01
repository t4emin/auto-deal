import assert from "node:assert/strict";
import { access,readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeAffiliateUrl } from "../app/url-utils.ts";
import { hashPassword,normalizeUsername,validatePassword,validateUsername,verifyPassword } from "../app/auth-crypto.ts";

test("ships the AutoDealer landing page and admin console",async()=>{
  const [page,admin,layout,login,auth]=await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/admin/AdminConsole.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/layout.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/login/LoginPanel.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/auth.ts",import.meta.url),"utf8")
  ]);
  assert.match(layout,/appConfig\.name/);
  assert.match(page,/GET \/api\/v1\/vehicles/);
  assert.match(admin,/Add Vehicle/);
  assert.match(admin,/VehicleTable/);
  assert.match(admin,/Add Attribute/);
  assert.match(admin,/Public endpoints return only available, reserved and sold vehicles/);
  assert.doesNotMatch(admin,/Compatibility engine/);
  assert.match(login,/appConfig\.name/);
  assert.equal(auth.includes("manat"+"dev"),false);
  assert.match(auth,/BOOTSTRAP_ADMIN_USERNAME/);
});

test("ships vehicle API routes and removes public PC routes",async()=>{
  const routes=[
    "../app/api/v1/vehicles/route.ts",
    "../app/api/v1/vehicles/[slug]/route.ts",
    "../app/api/v1/schema/route.ts",
    "../app/api/admin/vehicles/route.ts",
    "../app/api/admin/uploads/route.ts",
    "../app/api/admin/attributes/route.ts",
    "../app/api/auth/login/route.ts",
    "../app/api/auth/register/route.ts",
    "../app/api/auth/logout/route.ts",
    "../app/api/admin/users/route.ts"
  ];
  await Promise.all(routes.map(path=>access(new URL(path,import.meta.url))));
  await assert.rejects(access(new URL("../app/api/v1/com"+"patibility/check/route.ts",import.meta.url)));
  await assert.rejects(access(new URL("../app/api/v1/pro"+"ducts/route.ts",import.meta.url)));
  const list=await readFile(new URL(routes[0],import.meta.url),"utf8");
  const detail=await readFile(new URL(routes[1],import.meta.url),"utf8");
  assert.match(list,/publicVehicleStatuses/);
  assert.match(list,/minPriceParam/);
  assert.match(list,/maxPriceParam/);
  assert.doesNotMatch(list,/Number\(url\.searchParams\.get\("maxPrice"\) \|\| ""\)/);
  assert.match(list,/minPrice/);
  assert.match(list,/bodyType/);
  assert.match(detail,/status IN \('available','reserved','sold'\)/);
});

test("defines vehicle schema and demo seed data",async()=>{
  const [schema,runtime]=await Promise.all([
    readFile(new URL("../db/schema.ts",import.meta.url),"utf8"),
    readFile(new URL("../db/runtime.ts",import.meta.url),"utf8")
  ]);
  assert.match(schema,/sqliteTable\("vehicles"/);
  assert.match(schema,/body_type/);
  assert.match(schema,/dealer_name/);
  assert.match(runtime,/Toyota GR86/);
  assert.match(runtime,/battery_capacity/);
  assert.match(runtime,/status/);
  assert.doesNotMatch(runtime,/seedProducts/);
});

test("hashes passwords and validates account credentials",async()=>{
  assert.equal(normalizeUsername("  Manat.Dev  "),"manat.dev");
  assert.equal(validateUsername("valid_user"),"");
  assert.notEqual(validateUsername("invalid user"),"");
  assert.equal(validatePassword("0123456789"),"");
  assert.notEqual(validatePassword("short"),"");
  const secured=await hashPassword("correct horse battery staple",undefined,1_000);
  assert.equal(await verifyPassword("correct horse battery staple",secured.hash,secured.salt,secured.iterations),true);
  assert.equal(await verifyPassword("wrong password",secured.hash,secured.salt,secured.iterations),false);
});

test("normalizes pasted contact URLs",()=>{
  assert.equal(normalizeAffiliateUrl("  https://example.com/contact/gr86  "),"https://example.com/contact/gr86");
  assert.equal(normalizeAffiliateUrl("[Dealer](https://example.com/contact/gr86)"),"https://example.com/contact/gr86");
  assert.equal(normalizeAffiliateUrl("example.com/contact/gr86"),"https://example.com/contact/gr86");
});
