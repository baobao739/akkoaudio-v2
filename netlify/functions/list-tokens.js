const { createClient } = require("@supabase/supabase-js");
const { getCookie, verifyToken, json } = require("./_shared/auth");

function db() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  if (!(await verifyToken(getCookie(event, "akkoflac_admin"), "admin"))) {
    return json(401, { error: "Unauthorized" });
  }

  try {
    const supabase = db();
    const { data, error } = await supabase
      .from("access_tokens")
      .select("id, request_id, label, token_prefix, revoked, created_at, last_used_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const active = [];
    const revoked = [];
    for (const row of data || []) {
      if (row.revoked) revoked.push(row);
      else active.push(row);
    }

    return json(200, { active, revoked });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Server error." });
  }
};
