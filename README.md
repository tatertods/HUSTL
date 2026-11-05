# Hustl.

Verified campus task marketplace for IU students. Vite + React front end, Supabase backend (auth, database, realtime), deployed free on Vercel.

Everything below is free. Do the parts in order.

## Part 1: Run it on your computer

1. Install Node.js (LTS) from https://nodejs.org
2. Unzip this folder, open a terminal inside it, and run:

```
npm install
cp .env.example .env
```

(On Windows PowerShell use `copy .env.example .env`.)

## Part 2: Supabase (database and login)

1. Go to https://supabase.com, sign in, click New project. Name it hustl, pick a database password and save it, choose the closest region, click Create. Wait about 2 minutes.
2. Left sidebar, SQL Editor, New query. Open `supabase/schema.sql` from this folder, paste the whole file, click Run. It should say Success. This creates the tables, the @iu.edu rule, security rules and realtime.
3. Left sidebar, Project Settings (gear), API Keys (or API). Copy two values:
   - Project URL
   - The `anon` / publishable key (NOT the service_role or secret key)
4. Open `.env` in this folder and fill in:

```
VITE_SUPABASE_URL=paste the Project URL here
VITE_SUPABASE_ANON_KEY=paste the anon key here
```

## Part 3: Login emails (6-digit code)

1. Supabase, Authentication, Sign In / Providers. Make sure Email is enabled. Turn OFF "Confirm email" only if you see it; the code flow works either way.
2. Authentication, Emails (Templates). Open "Magic Link" and replace the body with:

```
<h2>Your Hustl. code</h2>
<p>Enter this 6-digit code to sign in:</p>
<h1>{{ .Token }}</h1>
<p>It expires in one hour. If you did not ask for it, ignore this email.</p>
```

   Do the same for "Confirm sign up". Click Save on each. The `{{ .Token }}` part is what makes it a code instead of a link.
3. Supabase's built-in sender only allows 2 emails per hour, so set up your own sender (Brevo, free):
   - Create a Brevo account, go to SMTP & API, SMTP tab, generate an SMTP key.
   - Supabase, Authentication, Emails, SMTP Settings, turn on Custom SMTP:
     - Host: smtp-relay.brevo.com
     - Port: 587
     - Username: the SMTP login shown on the Brevo SMTP page
     - Password: the SMTP key (not your Brevo account password)
     - Sender email: the address you verified in Brevo
     - Sender name: Hustl.
   - Save.
   - Note: codes from a Gmail sender sometimes land in spam at iu.edu. Tell testers to check spam. A sender on your own domain fixes this later.
4. If you pasted an SMTP key into any chat or message, delete it in Brevo and generate a new one.

## Part 4: Try it locally

```
npm run dev
```

Open the link it prints (http://localhost:5173). Sign in with your @iu.edu email, type the code from your inbox, confirm your name.

Then add sample jobs: sign in once first, then in Supabase SQL Editor run `supabase/seed.sql`. It fills the feed with 20 sample tasks. Sample tasks can be requested by anyone, so you can test the whole flow alone. Real tasks cannot be requested by their poster, so test those with a second account.

## Part 5: GitHub

Easiest (no terminal):
1. https://github.com, New repository, name hustl, Create.
2. Click "uploading an existing file", drag in everything from this folder EXCEPT `node_modules` and `.env`, click Commit.

Or with terminal:

```
git init
git add .
git commit -m "Hustl."
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hustl.git
git push -u origin main
```

`.gitignore` already keeps `.env` and `node_modules` out.

## Part 6: Vercel

1. https://vercel.com, sign up with GitHub, Add New, Project, import the hustl repo.
2. Framework should show Vite. Open Environment Variables and add:
   - `VITE_SUPABASE_URL` with the same value as in `.env`
   - `VITE_SUPABASE_ANON_KEY` with the same value as in `.env`
3. Click Deploy. You get a link like https://hustl-xxxx.vercel.app
4. Back in Supabase, Authentication, URL Configuration: set Site URL to your Vercel link and add it under Redirect URLs. Save.

Every time you push to GitHub, Vercel redeploys automatically.

## How it works

- Only emails ending in iu.edu can create an account (enforced by a database trigger, not just the page).
- Row Level Security means each person can only see and change what they should. The anon key is safe to expose. Never put the service_role key in this project.
- Task status can only move forward in the allowed order, enforced in the database.
- Chat and task updates use Supabase Realtime.
- No real money moves. The fee and "escrow" are record keeping for the pilot. Real payments would need Stripe Connect and legal setup.

## Troubleshooting

- "Connect Supabase" notice on the site: `.env` is missing or wrong. Restart `npm run dev` after editing it. On Vercel, add the variables and redeploy.
- "Database error saving new user": you used a non iu.edu email, or schema.sql did not run fully. Re-run it (it is safe to run again).
- No code email: check spam, check Brevo's logs, confirm the sender address is verified.
- Feed empty: run `supabase/seed.sql` after your first sign in.
- Site stops working after a quiet week: free Supabase projects pause after 7 days of inactivity. Open the dashboard and click Restore.
