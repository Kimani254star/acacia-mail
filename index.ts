// Supabase Edge Function: send-mail
// Sends an Acacia Mail message to real outside addresses (Gmail, Outlook, Yahoo, company domains...) through Resend.
// - Only signed-in Acacia Mail users can call it (their Supabase login is verified here).
// - The sender line is "<Your name> (Acacia Mail) <FROM_ADDRESS>" and Reply-To is the user's own email,
//   so replies go to the address they registered with.
// - Rate limited per user per hour (table mail_send_log, created by acacia_mail_send.sql).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]{2,}$/;
const list = (v: unknown): string[] =>
  String(v ?? "").split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter((x) => EMAIL.test(x));
const stripTags = (h: string) =>
  h.replace(/<(br|\/p|\/div|\/li)\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const authz = req.headers.get("Authorization") ?? "";
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authz } } });
    const { data: ud } = await asUser.auth.getUser();
    const user = ud?.user;
    if (!user) return json({ error: "Sign in to Acacia Mail to send to outside addresses." }, 401);

    const b = await req.json();
    const to = list(b.to), cc = list(b.cc), bcc = list(b.bcc);
    const all = [...new Set([...to, ...cc, ...bcc])];
    if (!all.length) return json({ error: "No valid recipient address." }, 400);
    if (all.length > 20) return json({ error: "Too many recipients (max 20 per message)." }, 400);
    const subject = String(b.subject ?? "").slice(0, 300) || "(no subject)";
    const html = String(b.html ?? "");
    if (html.length > 1_500_000) return json({ error: "Message is too large." }, 413);

    const atts = (Array.isArray(b.attachments) ? b.attachments : []).slice(0, 10).map((a: any) => ({
      filename: String(a.name ?? "file").slice(0, 150), content: String(a.data ?? ""),
    })).filter((a: any) => a.content);
    if (atts.reduce((n: number, a: any) => n + a.content.length, 0) > 7_000_000) {
      return json({ error: "Attachments are too large (max about 5 MB in total)." }, 413);
    }

    // per-user hourly limit
    const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const limit = Number(Deno.env.get("MAIL_HOURLY_LIMIT") ?? "50");
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await svc.from("mail_send_log").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).gte("created_at", since);
    if ((count ?? 0) >= limit) return json({ error: `Hourly sending limit reached (${limit}). Try again later.` }, 429);

    const name = String(user.user_metadata?.name ?? user.email ?? "Acacia Mail user").replace(/[<>",]/g, "").slice(0, 60);
    const fromAddr = Deno.env.get("FROM_ADDRESS");
    if (!fromAddr || !Deno.env.get("RESEND_API_KEY")) return json({ error: "Outgoing mail is not configured on the server yet (RESEND_API_KEY / FROM_ADDRESS)." }, 500);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `mail-${user.id}-${String(b.message_id ?? crypto.randomUUID()).slice(0, 80)}`,
      },
      body: JSON.stringify({
        from: `${name} (Acacia Mail) <${fromAddr}>`,
        to: to.length ? to : [all[0]],
        ...(cc.length ? { cc } : {}),
        ...(bcc.length ? { bcc } : {}),
        reply_to: user.email,
        subject,
        html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5">${html}</div>`,
        text: stripTags(html),
        ...(atts.length ? { attachments: atts } : {}),
      }),
    });
    if (!res.ok) return json({ error: "Email provider error: " + (await res.text()) }, 502);
    const out = await res.json().catch(() => ({}));
    await svc.from("mail_send_log").insert({ user_id: user.id, recipients: all.length });
    return json({ ok: true, id: out.id ?? null, sent: all });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
