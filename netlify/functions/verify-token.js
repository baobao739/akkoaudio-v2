const { createClient } = require("@supabase/supabase-js");
const { json, hashAccessToken } = require("./_shared/auth");

function db() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

function extractToken(event) {
  const h = event.headers || {};
  const auth = h.authorization || h.Authorization || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  try {
    const body = JSON.parse(event.body || "{}");
    if (body.token) return String(body.token).trim();
  } catch {}
  return "";
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST" && event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const raw = extractToken(event);
    if (!raw || !raw.startsWith("akko_")) {
      return json(200, { valid: false, unlocked: false, reason: "missing" });
    }

    const tokenHash = await hashAccessToken(raw);
    const supabase = db();

    const { data, error } = await supabase
      .from("access_tokens")
      .select("id, label, revoked")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error) {
      console.error(error);
      return json(200, { valid: false, unlocked: false, reason: "error" });
    }

    if (!data) {
      return json(200, { valid: false, unlocked: false, reason: "invalid" });
    }

    if (data.revoked) {
      return json(200, { valid: false, unlocked: false, reason: "revoked" });
    }

    supabase
      .from("access_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id)
      .then(() => {})
      .catch(() => {});

    return json(200, {
      valid: true,
      unlocked: true,
      label: data.label || null
    });
  } catch (error) {
    console.error(error);
    return json(200, { valid: false, unlocked: false, reason: "error" });
  }
};
