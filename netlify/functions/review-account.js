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
    const action = String(body.action || "").trim().toLowerCase();
    const note = String(body.note || "").trim().slice(0, 300) || null;

    if (!id) return json(400, { error: "Missing account id." });
    if (!["approve", "deny"].includes(action)) {
      return json(400, { error: "action must be approve or deny." });
    }

    const status = action === "approve" ? "approved" : "denied";
    const supabase = db();

    const { data: existing, error: findError } = await supabase
      .from("accounts")
      .select("id, username, status")
      .eq("id", id)
      .maybeSingle();

    if (findError) throw findError;
    if (!existing) return json(404, { error: "Account not found." });
    if (existing.status !== "pending") {
      return json(400, { error: `Account is already ${existing.status}.` });
    }

    const { data, error } = await supabase
      .from("accounts")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        review_note: note
      })
      .eq("id", id)
      .eq("status", "pending")
      .select("id, username, status, reviewed_at")
      .maybeSingle();

    if (error) throw error;
    if (!data) return json(409, { error: "Account was already reviewed." });

    return json(200, { ok: true, account: data });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Server error." });
  }
};
