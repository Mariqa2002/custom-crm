// RLS test (spec section 9): a second user must not be able to read or write
// any of the first user's rows, in any table. Runs against LOCAL Supabase
// using the two test users created by supabase/seed.sql.
//
//   npm run db:reset   (once, to create the test users)
//   npm run test:rls
//
// Uses only the publishable key, exactly like the browser does.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnv() {
  const env = { ...process.env };
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* fall back to process.env */
  }
  return env;
}

const env = loadEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!URL || !KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local");
  process.exit(2);
}
if (!/127\.0\.0\.1|localhost/.test(URL)) {
  console.error(`Refusing to run against a non-local database (${URL}). This test uses seeded test users.`);
  process.exit(2);
}

const PASSWORD = "local-dev-only-123";
const TABLES = ["profiles", "phases", "projects", "tasks", "updates", "events", "responsibilities", "reports"];
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

async function signIn(email) {
  const sb = createClient(URL, KEY, opts);
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}. Did you run "npm run db:reset"?`);
  return { sb, user: data.user };
}

const results = [];
const record = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const { sb: a, user: userA } = await signIn("mariqa@local.test");
const { sb: b, user: userB } = await signIn("intruder@local.test");
const anon = createClient(URL, KEY, opts);

// Make sure A has at least one row in every table.
const created = [];
const { data: aProject } = await a.from("projects").select("id").limit(1).single();
const { data: aPhase } = await a.from("phases").select("id").limit(1).single();
const { data: aTask } = await a.from("tasks").select("id").limit(1).single();
for (const [table, row] of [
  ["updates", { body: "RLS test update", project_id: aProject.id }],
  ["events", { title: "RLS test event", on_date: "2026-11-20" }],
  ["reports", { period_start: "2030-01-07", period_end: "2030-01-11", title: "RLS test", content: {} }],
]) {
  const { data, error } = await a.from(table).insert(row).select("id").single();
  if (error) throw new Error(`Setup insert into ${table} failed: ${error.message}`);
  created.push([table, data.id]);
}

for (const table of TABLES) {
  const idCol = table === "profiles" ? "id" : "id";
  const ownerCol = table === "profiles" ? "id" : "user_id";
  const { data: aRows, error: aErr } = await a.from(table).select(idCol);
  if (aErr || !aRows?.length) {
    record(`${table}: owner can read own rows`, false, aErr?.message ?? "no rows");
    continue;
  }
  record(`${table}: owner can read own rows`, true, `${aRows.length} rows`);
  const ids = aRows.map((r) => r[idCol]);

  // Read
  const { data: bRead } = await b.from(table).select(idCol).in(idCol, ids);
  record(`${table}: other user cannot read`, (bRead ?? []).length === 0, `${(bRead ?? []).length} visible`);

  const { data: anonRead, error: anonErr } = await anon.from(table).select(idCol).in(idCol, ids);
  record(`${table}: signed-out cannot read`, !!anonErr || (anonRead ?? []).length === 0, anonErr ? "denied" : `${(anonRead ?? []).length} visible`);

  // Update
  const patch = table === "profiles" ? { full_name: "hacked" } : { updated_at: new Date().toISOString() };
  const { data: bUpd } = await b.from(table).update(patch).in(idCol, ids).select(idCol);
  record(`${table}: other user cannot update`, (bUpd ?? []).length === 0, `${(bUpd ?? []).length} changed`);

  // Delete
  const { data: bDel } = await b.from(table).delete().in(idCol, ids).select(idCol);
  record(`${table}: other user cannot delete`, (bDel ?? []).length === 0, `${(bDel ?? []).length} deleted`);

  // Insert a row owned by A
  if (table !== "profiles") {
    const base = {
      phases: { number: 99, name: "x", start_date: "2026-01-01", end_date: "2026-01-02", deliverable: "x", color: "accent" },
      projects: { name: "x" },
      tasks: { title: "x" },
      updates: { body: "x" },
      events: { title: "x", on_date: "2026-01-01" },
      responsibilities: { body: "x" },
      reports: { period_start: "2031-01-06", period_end: "2031-01-10", title: "x", content: {} },
    }[table];
    const { error } = await b.from(table).insert({ ...base, [ownerCol]: userA.id });
    record(`${table}: other user cannot insert as owner`, !!error, error ? "rejected" : "INSERTED");
  }
}

// Cross-user links: B must not attach its own rows to A's phase/project/task.
{
  const { error } = await b.from("tasks").insert({ title: "link test", phase_id: aPhase.id });
  record("tasks: cannot link to another user's phase", !!error, error ? "rejected" : "LINKED");
}
{
  const { error } = await b.from("updates").insert({ body: "link test", task_id: aTask.id });
  record("updates: cannot link to another user's task", !!error, error ? "rejected" : "LINKED");
}
{
  const { error } = await b.from("events").insert({ title: "link test", on_date: "2026-11-20", project_id: aProject.id });
  record("events: cannot link to another user's project", !!error, error ? "rejected" : "LINKED");
}

// The seed function must not be callable from the API.
{
  const { error } = await b.rpc("seed_transition", { uid: userB.id });
  record("seed_transition is not callable by users", !!error, error ? "denied" : "CALLABLE");
}

// Clean up
for (const [table, id] of created) await a.from(table).delete().eq("id", id);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
