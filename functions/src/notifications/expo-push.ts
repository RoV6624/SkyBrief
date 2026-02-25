import { logger } from "firebase-functions/v2";

interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a push notification via Expo's push notification service.
 *
 * @param pushToken - The Expo push token (ExponentPushToken[...])
 * @param payload - Notification title, body, and optional data
 * @returns true if sent successfully
 */
export async function sendExpoPushNotification(
  pushToken: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  if (!pushToken || !pushToken.startsWith("ExponentPushToken")) {
    logger.warn(`Invalid Expo push token: ${pushToken}`);
    return false;
  }

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: pushToken,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Expo push failed (${response.status}): ${errorText}`);
      return false;
    }

    const result = await response.json();

    // Check for ticket-level errors
    if (result.data?.status === "error") {
      logger.error(`Expo push ticket error: ${result.data.message}`);
      return false;
    }

    logger.info(`Push notification sent to token: ${pushToken.substring(0, 30)}...`);
    return true;
  } catch (error) {
    logger.error(`Failed to send Expo push notification: ${error}`);
    return false;
  }
}
