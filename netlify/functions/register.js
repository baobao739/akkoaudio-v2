const { createClient } = require("@supabase/supabase-js");
const {
  json,
  hashPassword,
  normalizeUsername,
  isValidUsername,
  isValidPassword
} = require("./_shared/auth");

const hits = new Map();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 6;

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

function rateLimited(key) {
  const now = Date.now();
  let b = hits.get(key);
  if (!b || now - b.start > WINDOW_MS) {
    b = { start: now, count: 0 };
  }
  b.count += 1;
  hits.set(key, b);
  return b.count > MAX_PER_WINDOW;
}

function db() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  if (rateLimited(clientKey(event))) {
    return json(429, { error: "Too many requests. Try again later." });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const username = normalizeUsername(body.username);
    const password = String(body.password || "");

    if (!isValidUsername(username)) {
      return json(400, {
        error: "Username must be 3–32 characters: letters, numbers, underscore only."
      });
    }
    if (!isValidPassword(password)) {
      return json(400, { error: "Password must be 6–128 characters." });
    }

    const password_hash = await hashPassword(password);
    const supabase = db();

    const { data, error } = await supabase
      .from("accounts")
      .insert({
        username,
        password_hash,
        status: "pending"
      })
      .select("id, username, status, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return json(409, { error: "That username is already taken." });
      }
      console.error(error);
      return json(500, { error: "Could not create account." });
    }

    return json(200, {
      ok: true,
      username: data.username,
      status: data.status,
      message: "Account created. Wait for admin approval, then log in."
    });
  } catch (error) {
    console.error(error);
    return json(400, { error: "Invalid request." });
  }
};
