import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { sendExpoPushNotification } from "./notifications/expo-push";

// Initialize Firebase Admin (idempotent)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely parse a JSON-encoded string field from Firestore.
 * Returns null if the value is missing, already an object, or invalid JSON.
 */
function safeJsonParse<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "object") return value as T;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Build an enhanced notification body for instructor-bound submissions.
 * Extracts FRAT score/risk level and W&B status from JSON-encoded fields.
 */
function buildInstructorBody(
  studentName: string,
  fratResultRaw: unknown,
  wbSnapshotRaw: unknown
): string {
  const parts: string[] = [`${studentName} submitted a pre-flight dispatch for review.`];

  const fratResult = safeJsonParse<{ totalScore: number; riskLevel: string }>(fratResultRaw);
  if (fratResult) {
    const riskLabel = fratResult.riskLevel
      ? fratResult.riskLevel.charAt(0).toUpperCase() + fratResult.riskLevel.slice(1) + " Risk"
      : "Unknown";
    parts.push(`FRAT: ${fratResult.totalScore} (${riskLabel})`);
  }

  const wbSnapshot = safeJsonParse<{ withinLimits: boolean }>(wbSnapshotRaw);
  if (wbSnapshot) {
    parts.push(`W&B: ${wbSnapshot.withinLimits ? "Within Limits" : "Out of Limits"}`);
  }

  return parts.join(" | ");
}

/**
 * Fetch a user's Expo push token from Firestore.
 * Returns null if the user document or pushToken field is missing.
 */
async function fetchPushToken(uid: string): Promise<string | null> {
  try {
    const doc = await db.collection("users").doc(uid).get();
    const data = doc.data();
    return (data?.pushToken as string) ?? null;
  } catch (error) {
    logger.error(`Failed to fetch push token for ${uid}: ${error}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cloud Function
// ---------------------------------------------------------------------------

/**
 * Cloud Function triggered when a dispatch document is created or updated.
 *
 * Bi-directional notifications:
 * - "submitted"           -> push to instructor (enhanced body with FRAT + W&B)
 * - "approved"            -> push to student
 * - "rejected"            -> push to student
 * - "revision_requested"  -> push to student
 */
export const onDispatchSubmitted = onDocumentWritten(
  {
    document: "dispatches/{dispatchId}",
    memory: "256MiB",
  },
  async (event) => {
    const afterData = event.data?.after?.data();
    const beforeData = event.data?.before?.data();

    if (!afterData) {
      logger.info("Dispatch document deleted, skipping notification.");
      return;
    }

    const newStatus = afterData.status as string;
    const oldStatus = beforeData?.status as string | undefined;

    // Only fire when the status actually transitions
    if (newStatus === oldStatus) {
      logger.info(`Dispatch status unchanged (${newStatus}). No notification needed.`);
      return;
    }

    const dispatchId = event.params?.dispatchId ?? "";
    const studentUid = afterData.studentUid as string | undefined;
    const studentName = (afterData.studentName as string) || "A student";
    const instructorUid = afterData.instructorUid as string | undefined;
    const instructorName = (afterData.instructorName as string) || "Your instructor";

    // ----- Status: submitted -> notify instructor -----
    if (newStatus === "submitted") {
      if (!instructorUid || typeof instructorUid !== 'string' || instructorUid.length === 0) {
        logger.warn("No instructorUid on dispatch document, skipping notification.");
        return;
      }

      const pushToken = await fetchPushToken(instructorUid);
      if (!pushToken) {
        logger.info(`Instructor ${instructorUid} has no push token registered.`);
        return;
      }

      const body = buildInstructorBody(
        studentName,
        afterData.fratResult,
        afterData.wbSnapshot
      );

      const sent = await sendExpoPushNotification(pushToken, {
        title: "New Dispatch Submission",
        body,
        data: {
          type: "dispatch_submitted",
          dispatchId,
        },
      });

      if (sent) {
        logger.info(`Dispatch notification sent to instructor ${instructorUid}`);
      } else {
        logger.warn(`Failed to send dispatch notification to instructor ${instructorUid}`);
      }
      return;
    }

    // ----- Status: approved / rejected / revision_requested -> notify student -----
    if (
      newStatus === "approved" ||
      newStatus === "rejected" ||
      newStatus === "revision_requested"
    ) {
      if (!studentUid || typeof studentUid !== 'string' || studentUid.length === 0) {
        logger.warn("No studentUid on dispatch document, skipping notification.");
        return;
      }

      const pushToken = await fetchPushToken(studentUid);
      if (!pushToken) {
        logger.info(`Student ${studentUid} has no push token registered.`);
        return;
      }

      let title: string;
      let body: string;
      let notificationType: string;

      switch (newStatus) {
        case "approved":
          title = "Dispatch Approved";
          body = "Your pre-flight dispatch has been approved! You're cleared for flight.";
          notificationType = "dispatch_approved";
          break;
        case "rejected":
          title = "Dispatch Not Approved";
          body = "Your dispatch was not approved. Tap to see instructor feedback.";
          notificationType = "dispatch_rejected";
          break;
        case "revision_requested":
          title = "Revision Requested";
          body = "Your instructor requested changes to your dispatch.";
          notificationType = "dispatch_revision_requested";
          break;
        default:
          return;
      }

      const sent = await sendExpoPushNotification(pushToken, {
        title,
        body,
        data: {
          type: notificationType,
          dispatchId,
        },
      });

      if (sent) {
        logger.info(`Dispatch ${newStatus} notification sent to student ${studentUid}`);
      } else {
        logger.warn(`Failed to send ${newStatus} notification to student ${studentUid}`);
      }
      return;
    }

    logger.info(`Dispatch status: ${newStatus}. No notification needed.`);
  }
);
