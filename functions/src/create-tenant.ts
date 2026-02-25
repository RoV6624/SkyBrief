import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

// Initialize Firebase Admin (idempotent)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Callable Cloud Function to create a new flight school (tenant).
 * Only admins or school_admins should call this.
 *
 * Input: { schoolName, inviteCode, adminEmail?, primaryColor?, secondaryColor?, accentColor? }
 * Returns: { tenantId, inviteCode }
 */
export const createTenant = onCall(
  { memory: "256MiB" },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in to create a school.");
    }

    const { schoolName, inviteCode, adminEmail, primaryColor, secondaryColor, accentColor } =
      request.data;

    if (!schoolName || typeof schoolName !== "string" || schoolName.trim().length === 0) {
      throw new HttpsError("invalid-argument", "schoolName is required.");
    }

    if (!inviteCode || typeof inviteCode !== "string" || inviteCode.length !== 6) {
      throw new HttpsError("invalid-argument", "inviteCode must be exactly 6 characters.");
    }

    const code = inviteCode.toUpperCase();

    // Check for duplicate invite code
    const existing = await db
      .collection("tenants")
      .where("inviteCode", "==", code)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new HttpsError("already-exists", `Invite code ${code} is already in use.`);
    }

    // Create tenant document
    const tenantData = {
      schoolName: schoolName.trim(),
      inviteCode: code,
      adminEmail: adminEmail ?? null,
      primaryColor: primaryColor ?? "#0c8ce9",
      secondaryColor: secondaryColor ?? "#083f6e",
      accentColor: accentColor ?? "#D4A853",
      briefingTemplates: true,
      cfiReview: true,
      studentProgress: true,
      schoolAnalytics: true,
      lessonPlans: true,
      dispatch: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("tenants").add(tenantData);

    logger.info(`Created tenant "${schoolName}" with ID ${docRef.id} and code ${code}`);

    return {
      tenantId: docRef.id,
      inviteCode: code,
    };
  }
);

/**
 * One-time seed function to create the Elite Aviation tenant.
 * Call via: firebase functions:shell > seedEliteAviation()
 * Or deploy and call via HTTP.
 */
export const seedEliteAviation = onCall(
  { memory: "256MiB" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    const code = "ELITE1";

    // Check if already exists
    const existing = await db
      .collection("tenants")
      .where("inviteCode", "==", code)
      .limit(1)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0];
      return {
        message: "Elite Aviation already exists",
        tenantId: doc.id,
        inviteCode: code,
      };
    }

    const tenantData = {
      schoolName: "Elite Aviation",
      inviteCode: code,
      adminEmail: null,
      primaryColor: "#0c8ce9",
      secondaryColor: "#083f6e",
      accentColor: "#D4A853",
      briefingTemplates: true,
      cfiReview: true,
      studentProgress: true,
      schoolAnalytics: true,
      lessonPlans: true,
      dispatch: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("tenants").add(tenantData);

    logger.info(`Seeded Elite Aviation with ID ${docRef.id} and code ${code}`);

    return {
      message: "Elite Aviation created successfully",
      tenantId: docRef.id,
      inviteCode: code,
    };
  }
);
