const { makeToken, cookie, json } = require("./_shared/auth");

const attempts = new Map();
const challenges = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
const FAIL_DELAY_MS = 700;
const CHALLENGE_TTL_MS = 2 * 60 * 1000;
const ADMIN_SESSION_SECONDS = 60 * 60 * 2;

function clientKey(event) {
  const h = event.headers || {};
  return (
    h["x-nf-client-connection-ip"] ||
    h["x-forwarded-for"]?.split(",")[0]?.trim() ||
    h["client-ip"] ||
    h["x-real-ip"] ||
    "unknown"
  );
}

function getBucket(key) {
  const now = Date.now();
  let b = attempts.get(key);
  if (!b || now - b.start > WINDOW_MS) {
    b = { start: now, fails: 0 };
    attempts.set(key, b);
  }
  return b;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeEqual(a, b) {
  const aa = String(a || "");
  const bb = String(b || "");
  const len = Math.max(aa.length, bb.length);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    const ca = i < aa.length ? aa.charCodeAt(i) : 0;
    const cb = i < bb.length ? bb.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(str) {
  const data = new TextEncoder().encode(String(str));
  const dig = await crypto.subtle.digest("SHA-256", data);
  return toHex(dig);
}

function randomId() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return toHex(b);
}

function purgeChallenges() {
  const now = Date.now();
  for (const [id, c] of challenges) {
    if (c.exp <= now) challenges.delete(id);
  }
}

exports.handler = async (event) => {
  const method = event.httpMethod;

  if (method === "GET") {
    purgeChallenges();
    const id = randomId();
    const nonce = randomId() + randomId();
    challenges.set(id, { nonce, exp: Date.now() + CHALLENGE_TTL_MS });
    return json(200, {
      challengeId: id,
      nonce,
      alg: "sha256-nonce-password"
    });
  }

  if (method !== "POST") return json(405, { error: "Method not allowed" });

  const key = clientKey(event);
  const bucket = getBucket(key);

  if (bucket.fails >= MAX_FAILS) {
    return json(429, {
      ok: false,
      error: "Too many attempts. Try again in a few minutes."
    });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const challengeId = String(body.challengeId || "").trim();
    const proof = String(body.proof || "").trim().toLowerCase();
    const expectedPw = String(process.env.ADMIN_PASSWORD || "");

    if (body.password != null && !proof) {
      bucket.fails += 1;
      attempts.set(key, bucket);
      await sleep(FAIL_DELAY_MS);
      return json(400, {
        ok: false,
        error: "Outdated login form. Refresh the page."
      });
    }

    purgeChallenges();
    const ch = challenges.get(challengeId);
    if (ch) challenges.delete(challengeId);

    if (!ch || !challengeId || !proof || proof.length !== 64) {
      bucket.fails += 1;
      attempts.set(key, bucket);
      await sleep(FAIL_DELAY_MS + Math.floor(Math.random() * 200));
      return json(401, { ok: false, error: "Invalid or expired challenge." });
    }

    if (expectedPw.length === 0) {
      await sleep(FAIL_DELAY_MS);
      return json(500, { ok: false, error: "Admin is not configured." });
    }

    const expectedProof = await sha256Hex(`${ch.nonce}:${expectedPw}`);
    const ok = safeEqual(proof, expectedProof);

    if (!ok) {
      bucket.fails += 1;
      attempts.set(key, bucket);
      await sleep(FAIL_DELAY_MS + Math.floor(Math.random() * 200));
      return json(401, { ok: false, error: "Incorrect password." });
    }

    attempts.delete(key);
    const token = await makeToken("admin");
    return json(
      200,
      { ok: true },
      {
        "Set-Cookie": cookie("akkoflac_admin", token, ADMIN_SESSION_SECONDS),
        "Cache-Control": "no-store"
      }
    );
  } catch (error) {
    await sleep(FAIL_DELAY_MS);
    return json(400, { ok: false, error: "Invalid request." });
  }
};
