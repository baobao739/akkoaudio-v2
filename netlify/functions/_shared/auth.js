const enc = new TextEncoder();

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  return secret;
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function sign(value) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

async function makeToken(type, extra = "") {
  const safeExtra = String(extra || "").replace(/\./g, "");
  const payload = safeExtra ? `${type}.${Date.now()}.${safeExtra}` : `${type}.${Date.now()}`;
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

async function parseToken(token, expectedType) {
  if (!token) return { ok: false };
  const parts = token.split(".");
  if (parts.length < 3) return { ok: false };
  if (parts[0] !== expectedType) return { ok: false };

  const signature = parts[parts.length - 1];
  const payload = parts.slice(0, -1).join(".");
  const expected = await sign(payload);
  const a = enc.encode(expected);
  const b = enc.encode(signature);
  if (a.length !== b.length) return { ok: false };
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff !== 0) return { ok: false };

  const issued = Number(parts[1]);
  if (!Number.isFinite(issued) || issued <= 0) return { ok: false };
  if (Date.now() - issued >= 1000 * 60 * 60 * 24 * 365 * 10) return { ok: false };

  const extra = parts.length >= 4 ? parts[2] : "";
  return { ok: true, type: parts[0], issued, extra };
}

async function verifyToken(token, expectedType) {
  const parsed = await parseToken(token, expectedType);
  return parsed.ok;
}

function getCookie(event, name) {
  const raw = event.headers?.cookie || event.headers?.Cookie || "";
  const found = raw.split(";").map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookie(name) {
  return `${name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    },
    body: JSON.stringify(body)
  };
}

async function hashAccessToken(raw) {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(String(raw || "")));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateAccessToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `akko_${toBase64Url(bytes)}`;
}

module.exports = {
  makeToken,
  verifyToken,
  parseToken,
  getCookie,
  cookie,
  clearCookie,
  json,
  hashAccessToken,
  generateAccessToken
};
