import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";

// Initialize Firebase Admin (idempotent)
if (!admin.apps.length) {
  admin.initializeApp();
}

const FAA_NOTAM_BASE = "https://external-api.faa.gov/notamapi/v1/notams";

/**
 * Proxies NOTAM requests to the FAA API, keeping credentials server-side.
 * Requires a valid Firebase ID token in the Authorization header.
 */
export const fetchNotams = onRequest(
  { cors: true, memory: "256MiB" },
  async (req, res) => {
    // Validate Firebase auth token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid authorization header" });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      await admin.auth().verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: "Invalid authentication token" });
      return;
    }

    // Validate ICAO parameter
    const icao = req.query.icao as string;
    if (!icao || !/^[A-Z0-9]{3,4}$/i.test(icao)) {
      res.status(400).json({ error: "Invalid or missing ICAO code" });
      return;
    }

    // Read secrets from Cloud Function environment config
    // Set via: firebase functions:secrets:set FAA_NOTAM_CLIENT_ID
    //          firebase functions:secrets:set FAA_NOTAM_CLIENT_SECRET
    const clientId = process.env.FAA_NOTAM_CLIENT_ID;
    const clientSecret = process.env.FAA_NOTAM_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error("FAA NOTAM API credentials not configured in environment");
      res.status(500).json({ error: "Server configuration error" });
      return;
    }

    try {
      const url = `${FAA_NOTAM_BASE}?icaoLocation=${encodeURIComponent(icao.toUpperCase())}&sortBy=effectiveStartDate&sortOrder=Desc&pageSize=50`;
      const response = await fetch(url, {
        headers: {
          client_id: clientId,
          client_secret: clientSecret,
        },
      });

      if (!response.ok) {
        logger.warn(`FAA API returned ${response.status} for ${icao}`);
        res.status(response.status).json({ error: `FAA API error: ${response.status}` });
        return;
      }

      const data = await response.json();
      // Cache for 5 minutes
      res.set("Cache-Control", "public, max-age=300");
      res.json(data);
    } catch (error) {
      logger.error("NOTAM proxy error:", error);
      res.status(500).json({ error: "Failed to fetch NOTAMs" });
    }
  }
);
