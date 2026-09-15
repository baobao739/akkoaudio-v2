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
    if (!["approve", "deny", "revoke"].includes(action)) {
      return json(400, { error: "action must be approve, deny, or revoke." });
    }

    const supabase = db();

    const { data: existing, error: findError } = await supabase
      .from("accounts")
      .select("id, username, status")
      .eq("id", id)
      .maybeSingle();

    if (findError) throw findError;
    if (!existing) return json(404, { error: "Account not found." });

    if (action === "approve") {
      if (!["pending", "denied", "revoked"].includes(existing.status)) {
        return json(400, { error: `Cannot approve account that is ${existing.status}.` });
      }
      const { data, error } = await supabase
        .from("accounts")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          review_note: note
        })
        .eq("id", id)
        .select("id, username, status, reviewed_at")
        .maybeSingle();
      if (error) throw error;
      if (!data) return json(409, { error: "Could not update account." });
      return json(200, { ok: true, account: data });
    }

    if (action === "deny") {
      if (existing.status !== "pending") {
        return json(400, { error: `Only pending accounts can be denied (current: ${existing.status}).` });
      }
      const { data, error } = await supabase
        .from("accounts")
        .update({
          status: "denied",
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
    }

    // revoke — kick approved users; next verify-session fails and cookie is cleared
    if (existing.status !== "approved") {
      return json(400, { error: `Only approved accounts can be revoked (current: ${existing.status}).` });
    }

    const { data, error } = await supabase
      .from("accounts")
      .update({
        status: "revoked",
        reviewed_at: new Date().toISOString(),
        review_note: note || "Revoked by admin"
      })
      .eq("id", id)
      .eq("status", "approved")
      .select("id, username, status, reviewed_at")
      .maybeSingle();

    if (error) throw error;
    if (!data) return json(409, { error: "Account was already changed." });
    return json(200, { ok: true, account: data });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Server error." });
  }
};
