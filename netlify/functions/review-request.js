const { createClient } = require("@supabase/supabase-js");
const {
  getCookie,
  verifyToken,
  json,
  hashAccessToken,
  generateAccessToken
} = require("./_shared/auth");

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

    if (!id) return json(400, { error: "Missing request id." });
    if (action !== "approve" && action !== "deny") {
      return json(400, { error: "action must be approve or deny." });
    }

    const supabase = db();

    const { data: existing, error: findError } = await supabase
      .from("access_requests")
      .select("id, name, status")
      .eq("id", id)
      .maybeSingle();

    if (findError) throw findError;
    if (!existing) return json(404, { error: "Request not found." });
    if (existing.status !== "pending") {
      return json(400, { error: `Request is already ${existing.status}.` });
    }

    if (action === "deny") {
      const { data, error } = await supabase
        .from("access_requests")
        .update({
          status: "denied",
          reviewed_at: new Date().toISOString(),
          review_note: note
        })
        .eq("id", id)
        .eq("status", "pending")
        .select("id, name, status, reviewed_at")
        .maybeSingle();

      if (error) throw error;
      if (!data) return json(409, { error: "Request was already reviewed." });
      return json(200, { ok: true, request: data });
    }

    const rawToken = generateAccessToken();
    const tokenHash = await hashAccessToken(rawToken);
    const tokenPrefix = rawToken.slice(0, 12);

    const { data: tokenRow, error: tokenError } = await supabase
      .from("access_tokens")
      .insert({
        request_id: id,
        label: existing.name,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        revoked: false
      })
      .select("id, label, token_prefix, created_at")
      .single();

    if (tokenError) throw tokenError;

    const { data: reqRow, error: reqError } = await supabase
      .from("access_requests")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        review_note: note
      })
      .eq("id", id)
      .eq("status", "pending")
      .select("id, name, status, reviewed_at")
      .maybeSingle();

    if (reqError) throw reqError;
    if (!reqRow) {
      await supabase.from("access_tokens").update({ revoked: true }).eq("id", tokenRow.id);
      return json(409, { error: "Request was already reviewed." });
    }

    return json(200, {
      ok: true,
      request: reqRow,
      token: rawToken,
      tokenMeta: tokenRow,
      warning: "Copy this token now. It will not be shown again."
    });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Server error." });
  }
};
