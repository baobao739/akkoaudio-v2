const { createClient } = require("@supabase/supabase-js");
const { getCookie, verifyToken, json } = require("./_shared/auth");

function db() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  if (!(await verifyToken(getCookie(event, "akkoflac_admin"), "admin"))) {
    return json(401, { error: "Unauthorized" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const id = String(body.id || "").trim();
    if (!id) return json(400, { error: "Missing token id." });

    const supabase = db();
    const { data, error } = await supabase
      .from("access_tokens")
      .update({ revoked: true })
      .eq("id", id)
      .select("id, label, token_prefix, revoked")
      .maybeSingle();

    if (error) throw error;
    if (!data) return json(404, { error: "Token not found." });

    return json(200, { ok: true, token: data });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Server error." });
  }
};
