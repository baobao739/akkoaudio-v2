# akkoaudio-v2

AkkoAudio with **username + password accounts** and admin approval.

## How access works

1. User opens the site → creates an account (username + password).
2. Account starts as **pending**.
3. You open `/admin`, log in with `ADMIN_PASSWORD`, and **Approve** or **Deny**.
4. User logs in again:
   - **pending** → message that approval is still needed
   - **denied** → denied message
   - **approved** → unlocks the player (HttpOnly session cookie, 30 days)

Passwords are stored as **PBKDF2 hashes only**. The admin panel shows usernames and status — **not** plaintext passwords.

## Setup

### 1. Supabase

Run `supabase.sql` in the Supabase SQL editor (creates `accounts` table).

### 2. Netlify env vars

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |
| `SESSION_SECRET` | Long random string for signing cookies |
| `ADMIN_PASSWORD` | Password for `/admin` |

### 3. Deploy

Connect the repo to Netlify and deploy. Admin: `https://your-site/admin`

## API (Netlify functions)

| Path | Role |
|------|------|
| `register` | Create pending account |
| `login` | Log in; returns pending/denied or sets session |
| `verify-session` | Check current user session |
| `logout` | Clear user session cookie |
| `list-accounts` | Admin: list accounts |
| `review-account` | Admin: approve / deny |
| `admin-login` | Admin password login |
