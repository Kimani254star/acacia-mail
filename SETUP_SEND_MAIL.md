# Sending Acacia Mail to real addresses (Gmail, Outlook, ...) - one-time setup

Acacia Mail already delivers to teammates inside the app. For anyone else it now calls a Supabase Edge Function named `send-mail`, which sends through Resend (free tier is fine).

1. Create a Resend account, add and verify your sending domain (DNS records), and create an API key.
2. Run `acacia_mail_send.sql` in Supabase > SQL Editor.
3. Put `index.ts` (from the `send-mail-fn` folder) at `supabase/functions/send-mail/index.ts`, then:
   ```
   supabase login
   supabase link --project-ref xglsampckermarjpczdf
   supabase secrets set RESEND_API_KEY=re_xxx FROM_ADDRESS=mail@yourdomain.com MAIL_HOURLY_LIMIT=50
   supabase functions deploy send-mail
   ```
4. Replace the Acacia Mail files with the updated zip. Done.

How it behaves
- Messages show "Name (Acacia Mail) <mail@yourdomain.com>" to the receiver; Reply-To is the sender's own Acacia Mail email, so replies land in the inbox they registered with.
- Teammates in the same Acacia Mail are still delivered in-app; only the other addresses are sent out.
- You must be signed in to Acacia Mail itself (not just opened from Books) to send outside.
- Up to 20 recipients per message, about 5 MB of attachments, 50 messages per user per hour (change MAIL_HOURLY_LIMIT).
- Failed sends stay in the Outbox with the reason and a Retry button. Scheduled messages are now sent automatically at their time while Mail is open.
- Receiving mail from Gmail etc. directly into Acacia Mail is NOT included (it needs inbound email routing).
