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
      .from("accounts")
      .select("id, username, status, created_at, reviewed_at, review_note, last_login_at")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) throw error;

    const pending = [];
    const approved = [];
    const denied = [];
    const revoked = [];
    for (const row of data || []) {
      if (row.status === "pending") pending.push(row);
      else if (row.status === "approved") approved.push(row);
      else if (row.status === "revoked") revoked.push(row);
      else denied.push(row);
    }

    return json(200, { pending, approved, denied, revoked });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Server error." });
  }
};
