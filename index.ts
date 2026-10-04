// Supabase Edge Function: books-login
// Lets someone sign in to Acacia Mail with COMPANY NAME + EMAIL + the SAME PASSWORD they use in Acacia Books.
//  1. Looks the person up in app_accounts (the table Books syncs its users into) and checks the company name.
//  2. Verifies the password exactly like Books does (SHA-256 of "salt:password").
//  3. Checks the company is approved in Acacia Support (acacia_company_status.status = 'active').
//  4. Creates the Mail login (already confirmed, no email needed) or repairs it so the password matches Books.
// The browser then does a normal signInWithPassword. Deploy: supabase functions deploy books-login
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const low = (v: unknown) => String(v ?? "").trim().toLowerCase();
const slug = (v: unknown) => low(v).replace(/[^a-z0-9]/g, "");
async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const NOT_FOUND = "We could not find that company, email and password. Check the company name, or ask your administrator to add you in Acacia Books.";
const BLOCKED: Record<string, string> = {
  pending: "Your company is waiting for approval by Acacia Support. You will be able to sign in as soon as it is approved.",
  expired: "This company's subscription has expired. Renew it to get access again.",
  suspended: "This company has been deactivated. Please contact Acacia Support.",
  rejected: "This registration was not approved. Please contact Acacia Support.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const b = await req.json().catch(() => ({}));
    const company = low(b.company), email = low(b.email), password = String(b.password ?? "");
    if (!company || !email || !password) return json({ error: "Enter your company name, email and password." }, 400);
    if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]{2,}$/.test(email)) return json({ error: NOT_FOUND }, 401);

    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. find the Books account(s) for this login
    let rows: any[] = [];
    const q1 = await svc.from("app_accounts").select("login_id,username,company_id,data").eq("login_id", email);
    rows = q1.data ?? [];
    if (!rows.length) {
      const q2 = await svc.from("app_accounts").select("login_id,username,company_id,data").eq("username", email);
      rows = q2.data ?? [];
    }
    if (!rows.length) return json({ error: NOT_FOUND }, 401);

    // 2. company name (or id) must match, and the password must match
    let hit: any = null, statusRow: any = null;
    for (const r of rows) {
      const d = r.data ?? {};
      const st = (await svc.from("acacia_company_status").select("company_id,company_name,status,paid_until")
        .eq("company_id", r.company_id).maybeSingle()).data;
      const names = [d.companyName, d.companyId, r.company_id, st?.company_name, ...(Array.isArray(d.previousCompanyNames) ? d.previousCompanyNames : [])];
      if (!names.some((n) => low(n) === company || slug(n) === slug(company))) continue;
      let ok = false;
      if (d.passwordHash && d.passwordSalt) ok = (await sha256(`${d.passwordSalt}:${password}`)) === d.passwordHash;
      else if (typeof d.password === "string") ok = d.password === password;
      if (ok) { hit = r; statusRow = st; break; }
    }
    if (!hit) return json({ error: NOT_FOUND }, 401);

    // 3. approval status from Acacia Support
    if (statusRow) {
      let st = statusRow.status;
      if (st === "active" && statusRow.paid_until && new Date(statusRow.paid_until) < new Date()) st = "expired";
      if (st !== "active") return json({ error: BLOCKED[st] ?? BLOCKED.suspended, status: st }, 403);
    }

    // 4. create / repair the Mail login
    const d = hit.data ?? {};
    const companyName = String(statusRow?.company_name || d.companyName || "").trim();
    const name = String(d.fullName || d.username || email.split("@")[0]);
    const booksId = String(hit.company_id);

    // look through existing Mail logins: find this one, and a join code already used by the same company
    let existing: any = null, joinCode = "";
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data?.users?.length) break;
      for (const u of data.users) {
        if (low(u.email) === email) existing = u;
        const m: any = u.user_metadata ?? {};
        if (!joinCode && String(m.books_company_id ?? "") === booksId && m.join_code) joinCode = String(m.join_code);
      }
      if (data.users.length < 1000) break;
    }

    if (existing) {
      const m: any = existing.user_metadata ?? {};
      const { error } = await svc.auth.admin.updateUserById(existing.id, {
        password, email_confirm: true,
        user_metadata: { ...m, name: m.name || name, company: companyName || m.company, books_company_id: booksId, join_code: m.join_code || joinCode },
      });
      if (error) return json({ error: "Could not update the Mail login: " + error.message }, 500);
    } else {
      const { error } = await svc.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { name, company: companyName, join_code: joinCode, source: "books", books_company_id: booksId },
      });
      if (error) return json({ error: "Could not create the Mail login: " + error.message }, 500);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
