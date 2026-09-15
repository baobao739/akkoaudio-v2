const { createClient } = require("@supabase/supabase-js");
const {
  json,
  cookie,
  makeToken,
  verifyPassword,
  normalizeUsername,
  isValidUsername,
  isValidPassword,
  USER_SESSION_SECONDS
} = require("./_shared/auth");

const hits = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 12;
const FAIL_DELAY_MS = 500;

function clientKey(event) {
  const h = event.headers || {};
  return (
    h["x-nf-client-connection-ip"] ||
    h["x-forwarded-for"]?.split(",")[0]?.trim() ||
    h["client-ip"] ||
    h["x-real-ip"] ||
    "unknown"
  );
}

function getBucket(key) {
  const now = Date.now();
  let b = hits.get(key);
  if (!b || now - b.start > WINDOW_MS) {
    b = { start: now, fails: 0 };
    hits.set(key, b);
  }
  return b;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function attemptsSet(key, bucket) {
  hits.set(key, bucket);
}

function db() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const key = clientKey(event);
  const bucket = getBucket(key);
  if (bucket.fails >= MAX_FAILS) {
    return json(429, { error: "Too many attempts. Try again later." });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const username = normalizeUsername(body.username);
    const password = String(body.password || "");

    if (!isValidUsername(username) || !isValidPassword(password)) {
      bucket.fails += 1;
      attemptsSet(key, bucket);
      await sleep(FAIL_DELAY_MS);
      return json(401, { ok: false, error: "Invalid username or password." });
    }

    const supabase = db();
    const { data: account, error } = await supabase
      .from("accounts")
      .select("id, username, password_hash, status")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      console.error(error);
      return json(500, { error: "Server error." });
    }

    if (!account || !(await verifyPassword(password, account.password_hash))) {
      bucket.fails += 1;
      attemptsSet(key, bucket);
      await sleep(FAIL_DELAY_MS + Math.floor(Math.random() * 200));
      return json(401, { ok: false, error: "Invalid username or password." });
    }

    if (account.status === "pending") {
      return json(200, {
        ok: false,
        status: "pending",
        message: "Your account is pending admin approval."
      });
    }

    if (account.status === "denied") {
      return json(200, {
        ok: false,
        status: "denied",
        message: "Your account was denied. Contact the admin if you think this is a mistake."
      });
    }

    if (account.status === "revoked") {
      return json(200, {
        ok: false,
        status: "revoked",
        message: "Your access was revoked by the admin."
      });
    }

    if (account.status !== "approved") {
      return json(200, {
        ok: false,
        status: account.status,
        message: "Account is not allowed to log in."
      });
    }

    hits.delete(key);
    supabase
      .from("accounts")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", account.id)
      .then(() => {})
      .catch(() => {});

    const session = await makeToken("user", account.id);
    return json(
      200,
      {
        ok: true,
        status: "approved",
        username: account.username
      },
      {
        "Set-Cookie": cookie("akkoflac_user", session, USER_SESSION_SECONDS)
      }
    );
  } catch (error) {
    console.error(error);
    await sleep(FAIL_DELAY_MS);
    return json(400, { error: "Invalid request." });
  }
};
