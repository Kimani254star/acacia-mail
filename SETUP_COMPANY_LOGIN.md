# Acacia Mail: company login + Support approval - one-time setup

## What changed
- Mail login now asks for **Company name + Email + Password**. Anyone created in Acacia Books signs in to Mail with the same three things.
- Mail checks the company in **Acacia Support**: if it is not approved (pending / expired / suspended / rejected) the user is told and cannot enter.
- Creating a **new company in Mail** sends it to Support as **pending** (same table Books uses), so you approve it in Support like any Books company.
- Mail users are counted in Support under Apps (Mail), the same way Books users are, also when Mail is opened from Books.

## Steps
1. Supabase > Authentication > Sign In / Providers > Email > turn **Confirm email** OFF > Save.
2. Put `books-login/index.ts` at `supabase/functions/books-login/index.ts`, then:
   ```
   supabase link --project-ref xglsampckermarjpczdf
   supabase functions deploy books-login
   ```
   (No new secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.)
3. Replace `index.html` and `script.js` in the Mail folder with the new ones (style.css is unchanged).
4. Already-stuck account (e.g. adminacaciabooks@gmail.com): Authentication > Users > delete it, or ⋯ > Confirm user.

## How login works
1. Mail tries a normal sign-in. If the email/password work and the company matches, you are in.
2. Otherwise it calls `books-login`, which checks company name + email + password against the Books account (app_accounts), checks the company is approved in Support, then creates or repairs the Mail login with the Books password. Mail then signs in normally.
3. If Support has the company as anything other than active, sign-in is refused with the reason.

## Notes
- A company already in Support cannot be re-registered from Mail: the person must log in, or be added in Books.
- If the same email belongs to two Books companies, Mail follows the company typed at login.
- If you change someone's password in Books, they just log in to Mail with the new one; the function re-syncs it.
