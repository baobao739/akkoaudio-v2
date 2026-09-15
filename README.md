# akkoaudio-v2

Username + password accounts with admin approval / revoke.

## Setup (required)

### 1. Supabase

SQL Editor → run `supabase.sql` (or the accounts table from that file).

### 2. Netlify env vars

| Variable | Notes |
|----------|--------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** key only (never expose client-side) |
| `SESSION_SECRET` | Long random string (≥16 chars) |
| `ADMIN_PASSWORD` | Password for `/admin` |

Deploy from GitHub → set env vars → **redeploy** after changing env.

### 3. Use

- Site: `https://your-site.netlify.app`
- Admin: `https://your-site.netlify.app/admin` → password required
- Approve users → they log in forever until you **Revoke**

## Security notes

- Admin UI **fails closed**: only opens after a real `200` + valid session.
- Passwords stored as PBKDF2 hashes (admin never sees plaintext).
- Admin session ~2 hours; user session permanent until revoke.
- Admin APIs require signed HttpOnly cookie.
