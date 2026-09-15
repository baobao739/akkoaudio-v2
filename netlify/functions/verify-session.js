const { createClient } = require("@supabase/supabase-js");
const { json, getCookie, parseToken, clearCookie } = require("./_shared/auth");

function db() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const raw = getCookie(event, "akkoflac_user");
    const parsed = await parseToken(raw, "user");
    if (!parsed.ok || !parsed.extra) {
      return json(200, { valid: false, unlocked: false, reason: "missing" });
    }

    const supabase = db();
    const { data, error } = await supabase
      .from("accounts")
      .select("id, username, status")
      .eq("id", parsed.extra)
      .maybeSingle();

    if (error) {
      console.error(error);
      return json(200, { valid: false, unlocked: false, reason: "error" });
    }

    if (!data) {
      return json(
        200,
        { valid: false, unlocked: false, reason: "invalid" },
        { "Set-Cookie": clearCookie("akkoflac_user") }
      );
    }

    if (data.status !== "approved") {
      return json(
        200,
        {
          valid: false,
          unlocked: false,
          reason: data.status,
          status: data.status
        },
        { "Set-Cookie": clearCookie("akkoflac_user") }
      );
    }

    return json(200, {
      valid: true,
      unlocked: true,
      username: data.username,
      status: "approved"
    });
  } catch (error) {
    console.error(error);
    return json(200, { valid: false, unlocked: false, reason: "error" });
  }
};
