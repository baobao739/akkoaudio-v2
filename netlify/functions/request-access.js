const { createClient } = require("@supabase/supabase-js");
const { json } = require("./_shared/auth");

const hits = new Map();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 8;

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
    const name = String(body.name || "").trim().slice(0, 64);
    const contact = String(body.contact || "").trim().slice(0, 120) || null;
    const message = String(body.message || "").trim().slice(0, 500) || null;

    if (!name || name.length < 1) {
      return json(400, { error: "Name is required." });
    }

    const supabase = db();
    const { data, error } = await supabase
      .from("access_requests")
      .insert({ name, contact, message, status: "pending" })
      .select("id, name, status, created_at")
      .single();

    if (error) {
      console.error(error);
      return json(500, { error: "Could not submit request." });
    }

    return json(200, {
      ok: true,
      id: data.id,
      message: "Request submitted. An admin will review it."
    });
  } catch (error) {
    console.error(error);
    return json(400, { error: "Invalid request." });
  }
};
