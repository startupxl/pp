// Verifies Firebase Authentication ID tokens without needing firebase-admin
// or a service account key: Firebase ID tokens are standard JWTs signed by
// Google, so we fetch Google's public JWKS and verify the signature +
// standard claims (issuer/audience/expiry) directly. This keeps the backend
// dependency-light and avoids managing a service account secret on Hostinger.
import { createRemoteJWKSet, jwtVerify } from "jose";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "principlepitch";
const ISSUER = `https://securetoken.google.com/${PROJECT_ID}`;
const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const jwks = createRemoteJWKSet(new URL(JWKS_URL));

/**
 * Verifies a Firebase ID token (the JWT the client SDK produces via
 * `user.getIdToken()`). Returns the decoded payload on success — notably
 * `sub` (the stable Firebase UID to use as our internal user id), `email`,
 * and `name`. Throws if the token is missing, expired, or invalid.
 */
export async function verifyFirebaseToken(idToken) {
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: ISSUER,
    audience: PROJECT_ID,
  });
  return payload;
}

/**
 * Express middleware: requires a valid `Authorization: Bearer <idToken>`
 * header, attaches `req.user = { uid, email, name }` on success.
 */
export function requireAuth() {
  return async (req, res, next) => {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    try {
      const payload = await verifyFirebaseToken(token);
      req.user = {
        uid: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
      };
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid or expired session, please sign in again" });
    }
  };
}
