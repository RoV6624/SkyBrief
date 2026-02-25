import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { sendBriefingEmail } from "./email/resend-client";
import { buildDispatchEmailHtml, type DispatchEmailParams } from "./email/dispatch-template";

// Initialize Firebase Admin (idempotent)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

/**
 * Cloud Function triggered when a dispatch document is written.
 * Sends an HTML email with FRAT + W&B data to the school admin.
 */
export const onDispatchCreatedEmail = onDocumentWritten(
  {
    document: "dispatches/{dispatchId}",
    memory: "256MiB",
    secrets: [RESEND_API_KEY],
  },
  async (event) => {
    const afterData = event.data?.after?.data();
    const beforeData = event.data?.before?.data();

    if (!afterData) {
      logger.info("Dispatch deleted, skipping email.");
      return;
    }

    // Only fire on status transition to "submitted"
    const wasSubmitted = beforeData?.status === "submitted";
    const isSubmitted = afterData.status === "submitted";

    if (!isSubmitted || wasSubmitted) {
      return;
    }

    const tenantId = afterData.tenantId as string | undefined;
    if (!tenantId) {
      logger.warn("No tenantId on dispatch, skipping email.");
      return;
    }

    try {
      // Fetch tenant config for admin email
      const tenantDoc = await db.collection("tenants").doc(tenantId).get();
      const tenantData = tenantDoc.data();

      if (!tenantData?.adminEmail) {
        logger.info(`Tenant ${tenantId} has no adminEmail configured. Skipping dispatch email.`);
        return;
      }

      const adminEmail = tenantData.adminEmail as string;
      const schoolName = (tenantData.schoolName as string) || "Flight School";

      // Build email params from dispatch data
      const emailParams: DispatchEmailParams = {
        schoolName,
        studentName: (afterData.studentName as string) || "Unknown Student",
        station: (afterData.station as string) || "N/A",
        flightType: (afterData.flightType as string) || "local",
        date: new Date(),
        fratScore: (afterData.fratScore as number) || 0,
        fratRiskLevel: getFratRiskLevel((afterData.fratScore as number) || 0),
        aircraft: (afterData.aircraft as string) || undefined,
        totalWeight: (afterData.totalWeight as number) || undefined,
        cg: (afterData.cg as number) || undefined,
        withinLimits: (afterData.withinLimits as boolean) ?? undefined,
        briefingSummary: (afterData.briefingSummary as string) || undefined,
      };

      const html = buildDispatchEmailHtml(emailParams);

      const riskEmoji = emailParams.fratRiskLevel === "low" ? "🟢"
        : emailParams.fratRiskLevel === "moderate" ? "🟡"
        : "🔴";

      const subject = `${riskEmoji} Dispatch: ${emailParams.studentName} — ${emailParams.station} (FRAT: ${emailParams.fratScore})`;

      const sent = await sendBriefingEmail({
        apiKey: RESEND_API_KEY.value(),
        to: adminEmail,
        subject,
        html,
      });

      if (sent) {
        logger.info(`Dispatch email sent to ${adminEmail} for dispatch ${event.params?.dispatchId}`);
      } else {
        logger.warn(`Failed to send dispatch email to ${adminEmail}`);
      }
    } catch (error) {
      logger.error(`Error sending dispatch email: ${error}`);
    }
  }
);

/**
 * Callable Cloud Function to send a test dispatch email.
 * Used by admins to verify email delivery.
 */
export const sendTestDispatchEmail = onCall(
  {
    memory: "256MiB",
    secrets: [RESEND_API_KEY],
  },
  async (request) => {
    const email = request.data?.email as string;
    if (!email || !email.includes("@")) {
      throw new HttpsError("invalid-argument", "Valid email address is required.");
    }

    const sampleParams: DispatchEmailParams = {
      schoolName: "Test Flight School",
      studentName: "Jane Doe",
      station: "KJFK",
      flightType: "local",
      date: new Date(),
      fratScore: 12,
      fratRiskLevel: "moderate",
      fratItems: [
        { label: "Pilot Experience", score: 2 },
        { label: "Weather", score: 4 },
        { label: "Aircraft Familiarity", score: 1 },
        { label: "Airport Environment", score: 3 },
        { label: "Night/IFR", score: 2 },
      ],
      aircraft: "Cessna 172S",
      totalWeight: 2320,
      cg: 40.2,
      withinLimits: true,
      briefingSummary:
        "VFR conditions at KJFK with clear skies and calm winds. No significant weather hazards. Good conditions for a local training flight.",
    };

    const html = buildDispatchEmailHtml(sampleParams);

    const sent = await sendBriefingEmail({
      apiKey: RESEND_API_KEY.value(),
      to: email,
      subject: "[TEST] SkyBrief Dispatch Report",
      html,
    });

    if (!sent) {
      throw new HttpsError("internal", "Failed to send test email. Check Resend configuration.");
    }

    return { success: true, message: `Test dispatch email sent to ${email}` };
  }
);

/**
 * Map FRAT score to risk level.
 */
function getFratRiskLevel(score: number): "low" | "moderate" | "high" | "critical" {
  if (score <= 10) return "low";
  if (score <= 20) return "moderate";
  if (score <= 30) return "high";
  return "critical";
}
