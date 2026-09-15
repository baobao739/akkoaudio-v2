const { json, clearCookie } = require("./_shared/auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST" && event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }
  return json(
    200,
    { ok: true },
    { "Set-Cookie": clearCookie("akkoflac_user") }
  );
};
