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
      .from("access_requests")
      .select("id, name, contact, message, status, created_at, reviewed_at, review_note")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const pending = [];
    const approved = [];
    const denied = [];
    for (const row of data || []) {
      if (row.status === "pending") pending.push(row);
      else if (row.status === "approved") approved.push(row);
      else denied.push(row);
    }

    return json(200, { pending, approved, denied });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Server error." });
  }
};
