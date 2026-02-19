import { Resend } from "resend";
import { logger } from "firebase-functions/v2";

interface SendBriefingParams {
  apiKey: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * Send a briefing email via the Resend API.
 *
 * @returns true if the email was sent successfully, false otherwise.
 */
export async function sendBriefingEmail(params: SendBriefingParams): Promise<boolean> {
  const { apiKey, to, subject, html } = params;

  if (!apiKey) {
    logger.error("Resend API key is not configured");
    return false;
  }

  if (!to || !isValidEmail(to)) {
    logger.warn(`Invalid recipient email address: "${to}"`);
    return false;
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: "SkyBrief <briefing@skybrief.app>",
      to: [to],
      subject,
      html,
      tags: [
        { name: "category", value: "daily-briefing" },
      ],
    });

    if (error) {
      logger.error(`Resend API error for ${to}: ${error.message}`);
      return false;
    }

    logger.info(`Email sent successfully to ${to}, id: ${data?.id}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error}`);
    return false;
  }
}

/**
 * Basic email validation.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
